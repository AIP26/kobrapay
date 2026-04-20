import express from "express";
import Stripe from "stripe";
import {
  getPaymentLinkByToken,
  getTransactionsByUser,
  getTransactionByPaymentIntent,
  getTransactionByChargeId,
  updatePaymentLinkStatus,
  updateTransactionStatus,
  createChargeback,
  getChargebackByDisputeId,
  updateChargebackStatus,
  getSubscriptionByStripeId,
  getSubscriptionByCustomerId,
  updateSubscription,
  getUserById,
  getAssociateCommissionForClient,
  recordAssociateEarning,
  linkConsentToTransaction,
  addPayerToBlacklist,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { createNotification } from "./db";
import { sendRecurringPaymentEmail, sendPaymentReceipt, sendVendorPaymentEmail, sendPaymentFailedVendorEmail, sendChargebackAlertEmail } from "./_core/email";
import { getVendorSettings } from "./db";
import { dispatchWebhookEvent } from "./webhookDispatcher";
import { contentAIEvents } from "./contentAIWebhook";
import {
  persistirEvento,
  marcarProcesando,
  marcarProcesado,
  marcarFallido,
  alertarWebhookDuplicado,
} from "./webhookStore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

function getErrorMessageEs(code: string, message: string): string {
  const c = (code + " " + message).toLowerCase();
  if (c.includes("insufficient_funds") || c.includes("insufficient funds")) return "Fondos insuficientes en la tarjeta";
  if (c.includes("do_not_honor") || c.includes("do not honor")) return "Banco no autorizó el pago";
  if (c.includes("fraud") || c.includes("radar") || c.includes("suspicious")) return "Pago bloqueado por seguridad";
  if (c.includes("expired_card") || c.includes("expired card")) return "Tarjeta vencida";
  if (c.includes("incorrect_cvc") || c.includes("cvc") || c.includes("cvv")) return "CVV incorrecto";
  if (c.includes("card_declined") || c.includes("declined")) return "Tarjeta rechazada por el banco";
  if (c.includes("lost_card") || c.includes("stolen_card")) return "Tarjeta reportada como robada o perdida";
  if (c.includes("blocked")) return "Tarjeta bloqueada";
  if (c.includes("authentication_required")) return "Se requiere autenticación adicional del banco";
  if (c.includes("currency_not_supported")) return "Moneda no soportada por la tarjeta";
  if (c.includes("limit") || c.includes("withdrawal")) return "Límite de la tarjeta excedido";
  return message || "Pago no completado";
}

export function registerStripeWebhook(app: express.Application) {
  // IMPORTANT: Must use raw body BEFORE json middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Stripe Webhook] Signature verification failed:", message);
        return res.status(400).json({ error: `Webhook Error: ${message}` });
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

      // ─── Sistema 1: Persistir evento ANTES de procesarlo ─────────────────────
      // Garantiza que ningún evento se pierda aunque la BD falle durante el procesamiento.
      let webhookEventDbId: number | null = null;
      try {
        const piObj = event.data.object as unknown as Record<string, unknown>;
        const piMeta = (piObj?.metadata ?? {}) as Record<string, string>;
        const persistResult = await persistirEvento({
          stripeEventId: event.id,
          eventType: event.type,
          payload: JSON.stringify(event),
          paymentLinkToken: piMeta?.paymentLinkToken,
          stripePaymentIntentId: (piObj?.id as string) || undefined,
          relatedUserId: piMeta?.userId ? parseInt(piMeta.userId) : undefined,
        });
        if (!persistResult.saved) {
          // Evento duplicado — ya fue procesado antes. Responder 200 a Stripe.
          alertarWebhookDuplicado(event.id, event.type);
          return res.json({ received: true, duplicate: true });
        }
        webhookEventDbId = persistResult.id;
        await marcarProcesando(webhookEventDbId);
      } catch (persistErr) {
        // Si falla la persistencia, procesamos igual (degraded mode) para no perder pagos.
        console.error("[Stripe Webhook] Fallo al persistir evento (degraded mode):", persistErr);
      }
      // ─────────────────────────────────────────────────────────────────────────

      try {
        switch (event.type) {
          case "payment_intent.succeeded": {
            const pi = event.data.object as Stripe.PaymentIntent;
            const token = pi.metadata?.paymentLinkToken;
            const userId = pi.metadata?.userId ? parseInt(pi.metadata.userId) : null;

            if (token && userId) {
              // ─── Bug #3 fix: Guard de idempotencia ────────────────────────────────────────────────────────────────────
              // Si ya existe una transacción con este paymentIntentId en estado succeeded,
              // el webhook fue reenviado por Stripe. No procesar de nuevo para evitar
              // duplicar emails, comisiones y notificaciones.
              const existingTx = await getTransactionByPaymentIntent(pi.id);
              if (existingTx && existingTx.status === "succeeded") {
                console.log(`[Webhook] Idempotencia: PI ${pi.id} ya procesado (TX id=${existingTx.id}). Ignorando reenvío.`);
                break;
              }
              // ──────────────────────────────────────────────────────────────────────────────────────
              const link = await getPaymentLinkByToken(token);
              // Bug #4 fix: Aceptar pagos de links en estado 'pending' O 'expired'.
              // OXXO y SPEI son métodos asíncronos: el cliente puede pagar en tienda
              // horas después de que el link expiró. Stripe confirma el pago igual.
              // Si el link está expirado pero Stripe lo confirmó, lo procesamos y
              // dejamos traza de que fue un pago tardío.
              if (link && (link.status === "pending" || link.status === "expired")) {
                const wasExpired = link.status === "expired";
                await updatePaymentLinkStatus(link.id, "paid", new Date());
                if (wasExpired) {
                  console.log(`[Webhook] OXXO/SPEI tardío: link ${token} estaba expirado pero PI ${pi.id} fue confirmado por Stripe. Procesando pago tardío.`);
                }

                // Get card info from charge
                let cardLast4: string | undefined;
                let cardBrand: string | undefined;
                let stripeChargeId: string | undefined;

                if (pi.latest_charge) {
                  try {
                    const charge = await stripe.charges.retrieve(String(pi.latest_charge));
                    cardLast4 = charge.payment_method_details?.card?.last4 || undefined;
                    cardBrand = charge.payment_method_details?.card?.brand || undefined;
                    stripeChargeId = charge.id;
                  } catch (_) {}
                }

                // Update transaction
                const txs = await getTransactionsByUser(userId);
                const tx = txs.find((t) => t.stripePaymentIntentId === pi.id);
                if (tx) {
                  await updateTransactionStatus(tx.id, "succeeded", {
                    stripeChargeId: stripeChargeId || "",
                    cardLast4,
                    cardBrand,
                    // Sistema 3: Trazabilidad OXXO/SPEI tardío
                    paidAfterExpiry: wasExpired,
                  });
                  if (wasExpired) {
                    console.log(`[Webhook][Sistema3] TX id=${tx.id} marcada con paidAfterExpiry=true (pago tardío de link expirado)`);
                  }
                }

                // Notify vendor via Manus push
                try {
                  await notifyOwner({
                    title: `✅ Pago recibido: $${link.amount} ${link.currency}`,
                    content: `El cliente ${pi.metadata.payerName || "desconocido"} (${pi.metadata.payerEmail || ""}) pagó $${link.amount} ${link.currency} por "${link.description}".`,
                  });
                } catch (_) {}
                // Notificación en el panel (campana) al vendedor
                try {
                  await createNotification({
                    userId,
                    type: "payment_received",
                    title: `💰 Pago recibido: $${link.amount} ${link.currency}`,
                    message: `${pi.metadata?.payerName || "Cliente"} pagó $${link.amount} ${link.currency} por "${link.description || "enlace de pago"}".`,
                    actionUrl: "/dashboard/sales",
                  });
                } catch (_) {}
                // ─── Comisión automática del asociado ─────────────────────
                // Si este cliente fue referido por un asociado, calcular y registrar su comisión
                try {
                  const assocComm = await getAssociateCommissionForClient(userId);
                  if (assocComm && assocComm.status === 'active') {
                    const paymentAmountNum = parseFloat(String(link.amount));
                    const commRate = parseFloat(String(assocComm.commissionRate));
                    await recordAssociateEarning({
                      associateCommissionId: assocComm.id,
                      associateUserId: assocComm.associateUserId,
                      clientUserId: userId,
                      transactionId: tx?.id,
                      paymentAmount: paymentAmountNum,
                      commissionRate: commRate,
                      currency: link.currency || 'MXN',
                    });
                    const commAmount = Math.round(paymentAmountNum * (commRate / 100) * 100) / 100;
                    console.log(`[Webhook] Comisión asociado ID=${assocComm.associateUserId}: +$${commAmount} (${commRate}% de $${paymentAmountNum})`);
                    // Notificar al asociado de su ganancia
                    await createNotification({
                      userId: assocComm.associateUserId,
                      type: 'payment_received',
                      title: `💰 Nueva comisión: $${commAmount.toFixed(2)} ${link.currency || 'MXN'}`,
                      message: `Tu cliente procesó un pago de $${paymentAmountNum} ${link.currency || 'MXN'}. Ganaste $${commAmount.toFixed(2)} de comisión (${commRate}%).`,
                      actionUrl: '/dashboard/associate',
                    });
                  }
                } catch (assocErr) {
                  console.error('[Webhook] Error calculando comisión de asociado:', assocErr);
                }
                // Enviar comprobante de pago al pagador
                try {
                  const payerEmail = pi.metadata?.payerEmail;
                  if (payerEmail) {
                    const vendorCfg = await getVendorSettings(userId);
                    await sendPaymentReceipt({
                      payerEmail,
                      payerName: pi.metadata?.payerName || "Cliente",
                      businessName: vendorCfg?.businessName || "KobraPay",
                      businessEmail: vendorCfg?.businessEmail,
                      amount: link.amount,
                      currency: link.currency || "MXN",
                      description: link.description || "Pago",
                      transactionId: pi.id,
                      cardBrand,
                      cardLast4,
                      paidAt: new Date(),
                    });
                    console.log(`[Webhook] Comprobante enviado a ${payerEmail}`);
                  }
                } catch (emailErr) {
                  console.error("[Webhook] Error enviando comprobante al pagador:", emailErr);
                }
                // Enviar notificación por email al vendedor
                // Sistema 3: Si fue pago tardío, incluir nota especial en el email
                try {
                  const vendor = await getUserById(userId);
                  if (vendor?.email) {
                    await sendVendorPaymentEmail({
                      vendorEmail: vendor.email,
                      vendorName: vendor.name || "Vendedor",
                      payerName: pi.metadata?.payerName || "Cliente",
                      payerEmail: pi.metadata?.payerEmail || "",
                      amount: link.amount,
                      currency: link.currency || "MXN",
                      description: wasExpired
                        ? `[PAGO TARDÍO - LINK EXPIRADO] ${link.description || "Pago"}`
                        : link.description || "Pago",
                      transactionId: pi.id,
                      cardBrand,
                      cardLast4,
                      paidAt: new Date(),
                    });
                    if (wasExpired) {
                      console.log(`[Webhook][Sistema3] Notificación de pago tardío enviada al vendedor ${vendor.email}`);
                    } else {
                      console.log(`[Webhook] Notificación de pago enviada al vendedor ${vendor.email}`);
                    }
                  }
                } catch (vendorEmailErr) {
                  console.error("[Webhook] Error enviando notificación al vendedor:", vendorEmailErr);
                }
                // Disparar webhooks salientes del vendedor
                try {
                  await dispatchWebhookEvent(userId, "payment.success", {
                    paymentLinkToken: token,
                    paymentIntentId: pi.id,
                    amount: link.amount,
                    currency: link.currency || "MXN",
                    description: link.description || "",
                    payerName: pi.metadata?.payerName || "",
                    payerEmail: pi.metadata?.payerEmail || "",
                    payerPhone: pi.metadata?.payerPhone || "",
                    cardBrand: cardBrand || "",
                    cardLast4: cardLast4 || "",
                    paidAt: new Date().toISOString(),
                    merchantId: `merchant_${userId}`,
                  });
                } catch (whErr) {
                  console.error("[Webhook] Error disparando webhooks salientes:", whErr);
                }
                // Notificar a ContentAI (Hub de Comando)
                try {
                  await contentAIEvents.checkoutCompleted({
                    sessionId: pi.id,
                    amount: parseFloat(String(link.amount)),
                    currency: link.currency || "MXN",
                    customerEmail: pi.metadata?.payerEmail || undefined,
                    customerName: pi.metadata?.payerName || undefined,
                    description: link.description || undefined,
                    merchantId: userId,
                    stripePaymentIntentId: pi.id,
                  });
                } catch (caiErr) {
                  console.error("[ContentAI] Error notificando checkout.completed:", caiErr);
                }

                // ─── FASE 2A: Sincronización con Go High Level ─────────────────────────
                // Se encola de forma no bloqueante. Si GHL no está configurado
                // (GHL_API_KEY o GHL_LOCATION_ID ausentes), el registro queda en
                // 'skipped' sin interrumpir el flujo de pago.
                try {
                  const { enqueueGhlSync } = await import('./ghlClient');
                  await enqueueGhlSync({
                    transactionId: tx?.id ?? 0,
                    stripePaymentIntentId: pi.id,
                    payerName: pi.metadata?.payerName || null,
                    payerEmail: pi.metadata?.payerEmail || null,
                    payerPhone: pi.metadata?.payerPhone || null,
                    amountMxn: String(link.amount),
                    currency: link.currency || 'MXN',
                    paymentMethod: pi.payment_method_types?.[0] || null,
                    cardBrand: cardBrand || null,
                    cardLast4: cardLast4 || null,
                    paidAt: new Date(),
                    paidAfterExpiry: wasExpired,
                    paymentLinkDescription: link.description || null,
                    vendorUserId: userId,
                  });
                } catch (ghlErr) {
                  console.error('[GHL] Error al encolar sincronización:', ghlErr);
                }

                // ── FASE 2B: Google Sheets — Log Central de Ingresos ─────────────
                // No bloqueante. Si Sheets no está configurado, queda en 'skipped'.
                try {
                  const { enqueueSheetSync } = await import('./sheetsClient');
                  await enqueueSheetSync({
                    stripePaymentIntentId: pi.id,
                    eventType: 'payment_succeeded',
                    payerName: pi.metadata?.payerName || null,
                    payerEmail: pi.metadata?.payerEmail || null,
                    payerPhone: pi.metadata?.payerPhone || null,
                    amountMxn: String(link.amount),
                    currency: link.currency || 'MXN',
                    paymentMethod: pi.payment_method_types?.[0] || null,
                    cardBrand: cardBrand || null,
                    cardLast4: cardLast4 || null,
                    paymentStatus: 'succeeded',
                    paymentLinkToken: link.token || null,
                    errorMessage: null,
                    paidAfterExpiry: wasExpired,
                    vendorUserId: userId,
                    paidAt: new Date(),
                  });
                } catch (sheetsErr) {
                  console.error('[Sheets] Error al encolar sincronización de pago exitoso:', sheetsErr);
                }
              }
            }
            break;
          }

          case "payment_intent.payment_failed": {
            const pi = event.data.object as Stripe.PaymentIntent;
            const userId = pi.metadata?.userId ? parseInt(pi.metadata.userId) : null;

            if (userId) {
              const txs = await getTransactionsByUser(userId);
              const tx = txs.find((t) => t.stripePaymentIntentId === pi.id);
              if (tx) {
                // Obtener razón de fallo en español
                const failureCode = pi.last_payment_error?.code || "";
                const failureMessage = pi.last_payment_error?.message || "";
                const errorEs = getErrorMessageEs(failureCode, failureMessage);
                await updateTransactionStatus(tx.id, "failed", {
                  stripeChargeId: "",
                  cardLast4: undefined,
                  cardBrand: undefined,
                  errorMessage: errorEs,
                });
                // Enviar email de fallo al vendedor
                try {
                  const vendor = await getUserById(userId);
                  if (vendor?.email) {
                    // Intentar obtener amount desde el link de pago
                    const token = pi.metadata?.paymentLinkToken;
                    let amount = pi.amount ? pi.amount / 100 : 0;
                    let currency = pi.currency?.toUpperCase() || "MXN";
                    let description: string | undefined;
                    if (token) {
                      try {
                        const link = await getPaymentLinkByToken(token);
                        if (link) {
                          amount = parseFloat(String(link.amount));
                          currency = link.currency || "MXN";
                          description = link.description || undefined;
                        }
                      } catch (_) {}
                    }
                    await sendPaymentFailedVendorEmail({
                      vendorEmail: vendor.email,
                      vendorName: vendor.name || "Vendedor",
                      payerName: pi.metadata?.payerName || "Cliente",
                      payerEmail: pi.metadata?.payerEmail || "",
                      amount,
                      currency,
                      errorMessage: errorEs,
                      description,
                      failedAt: new Date(),
                    });
                    console.log(`[Webhook] Email de cobro fallido enviado al vendedor ${vendor.email}`);
                  }
                } catch (failedEmailErr) {
                  console.error("[Webhook] Error enviando email de fallo al vendedor:", failedEmailErr);
                }
                // Notificar a ContentAI
                try {
                  await contentAIEvents.paymentFailed({
                    sessionId: pi.id,
                    merchantId: userId,
                    errorCode: failureCode,
                    errorMessage: errorEs,
                    customerEmail: pi.metadata?.payerEmail || undefined,
                  });
                } catch (_) {}

                // ── FASE 2B: Google Sheets — Log de Pago Fallido ───────────────
                try {
                  const { enqueueSheetSync } = await import('./sheetsClient');
                  await enqueueSheetSync({
                    stripePaymentIntentId: pi.id,
                    eventType: 'payment_failed',
                    payerName: pi.metadata?.payerName || null,
                    payerEmail: pi.metadata?.payerEmail || null,
                    payerPhone: pi.metadata?.payerPhone || null,
                    amountMxn: String(pi.amount ? pi.amount / 100 : 0),
                    currency: pi.currency?.toUpperCase() || 'MXN',
                    paymentMethod: pi.payment_method_types?.[0] || null,
                    cardBrand: null,
                    cardLast4: null,
                    paymentStatus: 'failed',
                    paymentLinkToken: pi.metadata?.paymentLinkToken || null,
                    errorMessage: errorEs,
                    paidAfterExpiry: false,
                    vendorUserId: userId,
                    paidAt: null,
                  });
                } catch (sheetsFailedErr) {
                  console.error('[Sheets] Error al encolar pago fallido:', sheetsFailedErr);
                }
              }
            }
            break;
          }

          case "charge.dispute.created": {
            const dispute = event.data.object as Stripe.Dispute;
            console.log(`[Stripe Webhook] Disputa creada: ${dispute.id} por $${dispute.amount / 100} ${dispute.currency}`);
            try {
              // Buscar la transacción relacionada
              // Stripe puede enviar payment_intent o solo charge_id dependiendo del método de cobro
              let tx: Awaited<ReturnType<typeof getTransactionByPaymentIntent>> | undefined;
              if (typeof dispute.payment_intent === "string" && dispute.payment_intent) {
                tx = await getTransactionByPaymentIntent(dispute.payment_intent);
              }
              // Fallback: buscar por charge_id si no se encontró por payment_intent
              if (!tx && typeof dispute.charge === "string" && dispute.charge) {
                tx = await getTransactionByChargeId(dispute.charge);
                console.log(`[Webhook] Buscando transacción por chargeId ${dispute.charge}: ${tx ? 'encontrada' : 'no encontrada'}`);
              }
              if (!tx) {
                // Último recurso: buscar el charge en Stripe para obtener el payment_intent
                try {
                  const stripeClient = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' as any });
                  const charge = await stripeClient.charges.retrieve(typeof dispute.charge === 'string' ? dispute.charge : '');
                  if (charge.payment_intent && typeof charge.payment_intent === 'string') {
                    tx = await getTransactionByPaymentIntent(charge.payment_intent);
                    console.log(`[Webhook] Buscando transacción por PI desde charge ${dispute.charge}: ${tx ? 'encontrada' : 'no encontrada'}`);
                  }
                } catch (chargeErr) {
                  console.error('[Webhook] Error buscando charge en Stripe:', chargeErr);
                }
              }
              if (tx) {
                const reasonMap: Record<string, string> = {
                  fraudulent: "Cargo fraudulento",
                  duplicate: "Cargo duplicado",
                  product_not_received: "Producto no recibido",
                  product_unacceptable: "Producto inaceptable",
                  credit_not_processed: "Crédito no procesado",
                  subscription_canceled: "Suscripción cancelada",
                  unrecognized: "Cargo no reconocido",
                  general: "Disputa general",
                };
                const reasonEs = reasonMap[dispute.reason] || dispute.reason || "Contracargo";
                await createChargeback({
                  userId: tx.userId,
                  transactionId: tx.id,
                  stripeDisputeId: dispute.id,
                  amount: dispute.amount,
                  currency: dispute.currency,
                  reason: dispute.reason,
                  reasonEs,
                  status: "open",
                  dueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : undefined,
                });
                await notifyOwner({
                  title: `⚠️ Contracargo recibido: $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}`,
                  content: `Se abrió una disputa (${reasonEs}) por $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}. ID Stripe: ${dispute.id}. Tienes hasta el ${dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString("es-MX") : "fecha límite"} para responder.`,
                });
                // Notificar al usuario afectado en su panel
                try {
                  const dueByDate = dispute.evidence_details?.due_by
                    ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString('es-MX')
                    : 'próximamente';
                  await createNotification({
                    userId: tx.userId,
                    type: 'chargeback_alert',
                    title: `⚠️ Contracargo recibido: $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}`,
                    message: `Motivo: ${reasonEs}. Tienes hasta el ${dueByDate} para responder con evidencia. Ve a Aclaraciones para gestionarlo.`,
                    actionUrl: '/dashboard/chargebacks',
                  });
                } catch (_) {}
                // Enviar email de alerta al vendedor
                try {
                  const vendor = await getUserById(tx.userId);
                  const vendorSettings = await getVendorSettings(tx.userId);
                  if (vendor?.email) {
                    await sendChargebackAlertEmail({
                      vendorEmail: vendor.email,
                      vendorName: vendorSettings?.businessName || vendor.name || "Vendedor",
                      payerName: tx.payerName || "Cliente",
                      payerEmail: tx.payerEmail || "",
                      payerPhone: tx.payerPhone || undefined,
                      amount: dispute.amount,
                      currency: dispute.currency,
                      reasonEs,
                      stripeDisputeId: dispute.id,
                      transactionId: tx.id,
                      dueBy: dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : undefined,
                    });
                    console.log(`[Webhook] Email de alerta de contracargo enviado a ${vendor.email}`);
                  }
                } catch (emailErr) {
                  console.error('[Webhook] Error enviando email de alerta de contracargo:', emailErr);
                }
                // Notificar a ContentAI
                try {
                  await contentAIEvents.chargebackCreated({
                    chargebackId: tx.id,
                    transactionId: tx.id,
                    amount: dispute.amount,
                    currency: dispute.currency,
                    reason: reasonEs,
                    merchantId: tx.userId,
                  });
                } catch (_) {}
                // Agregar pagador a lista negra automáticamente
                try {
                  const txDetails = await getTransactionByPaymentIntent(
                    typeof dispute.payment_intent === 'string' ? dispute.payment_intent : ''
                  );
                  if (txDetails?.payerEmail) {
                    await addPayerToBlacklist({
                      userId: tx.userId,
                      type: 'email',
                      value: txDetails.payerEmail,
                      reason: `Contracargo automático: ${reasonEs}`,
                      chargebackId: undefined,
                      transactionId: tx.id,
                      payerName: txDetails.payerName || undefined,
                      chargebackAmount: dispute.amount,
                    });
                    console.log(`[Webhook] Pagador ${txDetails.payerEmail} agregado a lista negra por contracargo`);
                  }
                } catch (blErr) {
                  console.error('[Webhook] Error agregando a lista negra:', blErr);
                }
              }
            } catch (err) {
              console.error("[Stripe Webhook] Error al crear chargeback:", err);
            }
            break;
          }

          case "charge.dispute.updated": {
            const dispute = event.data.object as Stripe.Dispute;
            console.log(`[Stripe Webhook] Disputa actualizada: ${dispute.id} status=${dispute.status}`);
            try {
              const cb = await getChargebackByDisputeId(dispute.id);
              if (cb) {
                const statusMap: Record<string, string> = {
                  needs_response: 'open',
                  under_review: 'under_review',
                  charge_refunded: 'lost',
                  warning_needs_response: 'open',
                  warning_under_review: 'under_review',
                  warning_closed: 'lost',
                };
                const newStatus = statusMap[dispute.status] || dispute.status;
                await updateChargebackStatus(cb.id, newStatus);
                console.log(`[Stripe Webhook] Chargeback ${cb.id} actualizado a: ${newStatus}`);
              }
            } catch (err) {
              console.error('[Stripe Webhook] Error actualizando chargeback:', err);
            }
            break;
          }

          case "charge.dispute.closed": {
            const dispute = event.data.object as Stripe.Dispute;
            console.log(`[Stripe Webhook] Disputa cerrada: ${dispute.id} status=${dispute.status}`);
            try {
              const cb = await getChargebackByDisputeId(dispute.id);
              if (cb) {
                // won = ganamos la disputa, lost = perdimos
                const finalStatus = dispute.status === 'won' ? 'won' : 'lost';
                await updateChargebackStatus(cb.id, finalStatus, undefined, new Date());
                // Notificar al vendedor del resultado
                const statusText = finalStatus === 'won'
                  ? `✅ Ganaste la disputa de $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}. El dinero fue devuelto a tu cuenta.`
                  : `❌ Perdiste la disputa de $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}. El banco resolvió a favor del cliente.`;
                await notifyOwner({
                  title: finalStatus === 'won' ? '✅ Contracargo ganado' : '❌ Contracargo perdido',
                  content: statusText,
                });
                await createNotification({
                  userId: cb.userId,
                  type: 'payment_received',
                  title: finalStatus === 'won' ? '✅ Contracargo cerrado a tu favor' : '❌ Contracargo cerrado en contra',
                  message: statusText,
                  actionUrl: '/dashboard/sales',
                });
                console.log(`[Stripe Webhook] Chargeback ${cb.id} cerrado: ${finalStatus}`);
              }
            } catch (err) {
              console.error('[Stripe Webhook] Error cerrando chargeback:', err);
            }
            break;
          }

          // ─── Suscripciones ─────────────────────────────────────────────────
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const dbSub = await getSubscriptionByStripeId(sub.id);
            if (dbSub) {
              const statusMap: Record<string, string> = {
                active: "active",
                paused: "paused",
                canceled: "canceled",
                past_due: "past_due",
                incomplete: "incomplete",
                trialing: "active",
              };
              const newStatus = statusMap[sub.status] ?? sub.status;
              const cancelAtPeriodEnd = sub.cancel_at_period_end;
              await updateSubscription(dbSub.id, dbSub.ownerId, {
                status: newStatus,
                cancelAtPeriodEnd,
                stripeSubscriptionId: sub.id,
              });
              console.log(`[Stripe Webhook] Suscripción ${sub.id} actualizada: ${newStatus}`);
            }
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const dbSub = await getSubscriptionByStripeId(sub.id);
            if (dbSub) {
              await updateSubscription(dbSub.id, dbSub.ownerId, { status: "canceled", cancelAtPeriodEnd: false });
            }
            break;
          }

          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            // ── Caso 1: Suscripción recurrente interna ──────────────────────────
            if (session.mode === "subscription" && session.subscription && session.customer) {
              const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
              const dbSub = await getSubscriptionByCustomerId(customerId);
              if (dbSub) {
                const stripeSubId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
                await updateSubscription(dbSub.id, dbSub.ownerId, {
                  stripeSubscriptionId: stripeSubId,
                  status: "active",
                });
                console.log(`[Stripe Webhook] Checkout completado, suscripción activada: ${stripeSubId}`);

                // Notificar al dueño: primer pago de suscripción
                const amountFmt = new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: (session.currency || dbSub.currency || "mxn").toUpperCase(),
                }).format((session.amount_total ?? Number(dbSub.amount)) / 100);
                const customerLabel = dbSub.customerName || dbSub.customerEmail || "Cliente";
                try {
                  await createNotification({
                    userId: dbSub.ownerId,
                    type: "payment_received",
                    title: `🔔 Nueva suscripción activada: ${amountFmt}`,
                    message: `${customerLabel} se suscribió al plan "${dbSub.name}" por ${amountFmt}/${dbSub.interval}.`,
                    actionUrl: "/dashboard/recurring",
                  });
                } catch (_) {}
                try {
                  await notifyOwner({
                    title: `✅ Nueva suscripción: ${amountFmt}/${dbSub.interval}`,
                    content: `${customerLabel} activó el plan "${dbSub.name}" (${amountFmt}). Suscripción ID: ${stripeSubId}.`,
                  });
                } catch (_) {}

                // Disparar webhook saliente (BrokerHub/ContentAI) para primer pago
                try {
                  await dispatchWebhookEvent(dbSub.ownerId, "subscription.activated", {
                    subscription_id: dbSub.id,
                    stripe_subscription_id: stripeSubId,
                    plan_name: dbSub.name,
                    customer_email: dbSub.customerEmail,
                    customer_name: dbSub.customerName || "",
                    amount: Number(dbSub.amount),
                    amount_formatted: amountFmt,
                    currency: (session.currency || dbSub.currency || "mxn").toUpperCase(),
                    interval: dbSub.interval,
                    activated_at: new Date().toISOString(),
                  });
                } catch (_) {}
              }
            }

            // ── Caso 2: Pago único de API externa (ContentAI, BrokerHub) ────────
            // Detectado por kobrapay_session_id en metadata de Stripe
            const kobrapaySessionId = session.metadata?.kobrapay_session_id;
            if (kobrapaySessionId && session.mode === "payment" && session.payment_status === "paid") {
              try {
                const db2 = await (await import("./db")).getDb();
                if (db2) {
                  const { apiCheckoutSessions } = await import("../drizzle/schema");
                  const { eq: eq2 } = await import("drizzle-orm");

                  const [dbSession] = await db2.select().from(apiCheckoutSessions)
                    .where(eq2(apiCheckoutSessions.sessionId, kobrapaySessionId)).limit(1);

                  if (dbSession && dbSession.status !== "completed") {
                    // Marcar sesión como completada
                    await db2.update(apiCheckoutSessions)
                      .set({ status: "completed", updatedAt: new Date() })
                      .where(eq2(apiCheckoutSessions.sessionId, kobrapaySessionId));

                    // Construir payload completo con metadata intacto para ContentAI/BrokerHub
                    const webhookData: Record<string, unknown> = {
                      session_id: kobrapaySessionId,
                      stripe_session_id: session.id,
                      amount: session.amount_total ?? dbSession.amount,
                      currency: (session.currency || dbSession.currency || "mxn").toUpperCase(),
                      description: dbSession.description,
                      customer_email: session.customer_details?.email || dbSession.customerEmail || "",
                      customer_name: session.customer_details?.name || dbSession.customerName || "",
                      paid_at: new Date().toISOString(),
                      merchant_id: `merchant_${dbSession.userId}`,
                      payment_status: "paid",
                    };

                    // Incluir todo el metadata original (plan_id, plan_name, external_user_id, etc.)
                    if (session.metadata) {
                      for (const [k, v] of Object.entries(session.metadata)) {
                        if (k !== "kobrapay_session_id" && k !== "merchant_user_id") {
                          webhookData[k] = v;
                        }
                      }
                    }

                    // Disparar webhook payment.success hacia ContentAI/BrokerHub
                    await dispatchWebhookEvent(dbSession.userId, "payment.success", webhookData);
                    console.log(`[Stripe Webhook] API checkout completado: ${kobrapaySessionId} | merchant ${dbSession.userId} | webhook disparado`);

                    // Notificar al dueño en el panel (campana) — pago de plataforma externa
                    const platformName = session.metadata?.plan_name
                      ? `${session.metadata.plan_name}`
                      : dbSession.description || "pago externo";
                    const amountFormatted = new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: (session.currency || dbSession.currency || "mxn").toUpperCase(),
                    }).format((session.amount_total ?? dbSession.amount) / 100);
                    try {
                      await createNotification({
                        userId: dbSession.userId,
                        type: "payment_received",
                        title: `💳 Pago API recibido: ${amountFormatted}`,
                        message: `${webhookData.customer_name || webhookData.customer_email || "Cliente"} pagó ${amountFormatted} por "${platformName}".`,
                        actionUrl: "/dashboard/sales",
                      });
                    } catch (_) {}

                    // Notificar al dueño por email (Manus push)
                    try {
                      await notifyOwner({
                        title: `✅ Nuevo pago API: ${amountFormatted}`,
                        content: `${webhookData.customer_name || webhookData.customer_email || "Cliente"} pagó ${amountFormatted} por "${platformName}" (sesión: ${kobrapaySessionId}).`,
                      });
                    } catch (_) {}
                  }
                }
              } catch (apiCheckoutErr) {
                console.error("[Stripe Webhook] Error procesando API checkout session:", apiCheckoutErr);
              }
            }

            break;
          }

          case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            // Solo procesar facturas de suscripción (no las de pago único)
            // En Stripe API v2026+, el parent contiene la referencia a la suscripción
            const invSubId = (invoice as unknown as { subscription?: string | { id: string } }).subscription;
            if (invSubId && invoice.customer) {
              const stripeSubId = typeof invSubId === "string" ? invSubId : invSubId.id;
              const dbSub = await getSubscriptionByStripeId(stripeSubId);
              if (dbSub) {
                // Determinar plataforma de origen para el badge
                const srcPlatform = (dbSub as any).sourcePlatform || "kobrapay";
                const platformLabel = srcPlatform === "brokerhub" ? "BrokerHub" : srcPlatform === "contentai" ? "ContentAI" : "KobraPay";
                const platformEmoji = srcPlatform === "brokerhub" ? "🏠" : srcPlatform === "contentai" ? "✍️" : "💳";
                const amountFormatted = new Intl.NumberFormat("es-MX", { style: "currency", currency: invoice.currency.toUpperCase() }).format(invoice.amount_paid / 100);

                // Obtener datos del dueño para enviar email
                const owner = await getUserById(dbSub.ownerId);
                if (owner?.email) {
                  try {
                    await sendRecurringPaymentEmail({
                      ownerEmail: owner.email,
                      ownerName: owner.name || "Usuario KobraPay",
                      customerEmail: dbSub.customerEmail,
                      customerName: dbSub.customerName,
                      planName: `[${platformLabel}] ${dbSub.name}`,
                      amount: invoice.amount_paid,
                      currency: invoice.currency,
                      interval: dbSub.interval,
                      paidAt: new Date(invoice.created * 1000),
                    });
                  } catch (_) {}
                }
                // Notificación en el panel
                try {
                  await createNotification({
                    userId: dbSub.ownerId,
                    type: "payment_received",
                    title: `${platformEmoji} [${platformLabel}] Cobro recurrente: ${amountFormatted}`,
                    message: `Se cobró exitosamente el plan "${dbSub.name}" a ${dbSub.customerEmail} vía ${platformLabel}.`,
                    actionUrl: `/dashboard/subscriptions/${dbSub.id}`,
                  });
                } catch (_) {}
                // Notificar al owner via push con badge de plataforma
                try {
                  await notifyOwner({
                    title: `${platformEmoji} [${platformLabel}] Cobro recurrente: ${amountFormatted}`,
                    content: `Plan "${dbSub.name}" cobrado a ${dbSub.customerEmail} vía ${platformLabel}. Ver detalle en KobraPay.`,
                  });
                } catch (_) {}
                // Disparar webhook saliente al cliente (ej: BrokerHub)
                try {
                  await dispatchWebhookEvent(dbSub.ownerId, "subscription.payment_succeeded", {
                    subscription_id: dbSub.id,
                    stripe_subscription_id: stripeSubId,
                    plan_name: dbSub.name,
                    customer_email: dbSub.customerEmail,
                    customer_name: dbSub.customerName || "",
                    amount: invoice.amount_paid,
                    amount_formatted: `$${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
                    currency: invoice.currency.toUpperCase(),
                    interval: dbSub.interval,
                    invoice_id: invoice.id,
                    paid_at: new Date(invoice.created * 1000).toISOString(),
                    next_payment_attempt: invoice.next_payment_attempt
                      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
                      : null,
                  });
                  console.log(`[Webhook] subscription.payment_succeeded disparado para owner ${dbSub.ownerId}`);
                } catch (whErr) {
                  console.error("[Webhook] Error disparando webhook de suscripción:", whErr);
                }
              }
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const failedSubId = (invoice as unknown as { subscription?: string | { id: string } }).subscription;
            if (failedSubId) {
              const stripeSubId = typeof failedSubId === "string" ? failedSubId : failedSubId.id;
              const dbSub = await getSubscriptionByStripeId(stripeSubId);
              if (dbSub) {
                await updateSubscription(dbSub.id, dbSub.ownerId, { status: "past_due" });
                try {
                  await createNotification({
                    userId: dbSub.ownerId,
                    type: "payment_received",
                    title: `⚠️ Cobro recurrente fallido: ${dbSub.name}`,
                    message: `No se pudo cobrar el plan "${dbSub.name}" a ${dbSub.customerEmail}. Revisa el estado de la suscripción.`,
                    actionUrl: "/dashboard/recurring",
                  });
                } catch (_) {}
                // Disparar webhook saliente de fallo (para que BrokerHub suspenda acceso)
                try {
                  await dispatchWebhookEvent(dbSub.ownerId, "subscription.payment_failed", {
                    subscription_id: dbSub.id,
                    stripe_subscription_id: stripeSubId,
                    plan_name: dbSub.name,
                    customer_email: dbSub.customerEmail,
                    customer_name: dbSub.customerName || "",
                    amount: invoice.amount_due,
                    amount_formatted: `$${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
                    currency: invoice.currency.toUpperCase(),
                    interval: dbSub.interval,
                    invoice_id: invoice.id,
                    failed_at: new Date(invoice.created * 1000).toISOString(),
                    next_payment_attempt: invoice.next_payment_attempt
                      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
                      : null,
                    status: "past_due",
                  });
                } catch (whErr) {
                  console.error("[Webhook] Error disparando webhook de fallo de suscripción:", whErr);
                }
              }
            }
            break;
          }

          // ─── Stripe Connect: onboarding completado ──────────────────────────
          case "account.updated": {
            const account = event.data.object as Stripe.Account;
            console.log(`[Stripe Webhook] account.updated: ${account.id} charges=${account.charges_enabled} payouts=${account.payouts_enabled}`);
            try {
              const { getDb } = await import('./db');
              const { vendorSettings } = await import('../drizzle/schema');
              const { eq } = await import('drizzle-orm');
              const db = await getDb();
              if (!db) break;
              // Buscar el vendor que tiene este stripeConnectAccountId
              const [vendor] = await db.select().from(vendorSettings)
                .where(eq(vendorSettings.stripeConnectAccountId, account.id))
                .limit(1);
              if (vendor) {
                const newStatus = account.charges_enabled ? 'active' : account.details_submitted ? 'pending' : 'not_started';
                await db.update(vendorSettings)
                  .set({
                    stripeConnectStatus: newStatus as 'active' | 'pending' | 'not_started' | 'restricted' | 'disabled',
                    stripeConnectChargesEnabled: account.charges_enabled,
                    stripeConnectPayoutsEnabled: account.payouts_enabled,
                    stripeConnectDetailsSubmitted: account.details_submitted,
                    stripeConnectOnboardedAt: account.charges_enabled && !vendor.stripeConnectOnboardedAt ? new Date() : vendor.stripeConnectOnboardedAt,
                  })
                  .where(eq(vendorSettings.id, vendor.id));
                // Notificar al usuario si su cuenta quedó activa
                if (account.charges_enabled && !vendor.stripeConnectChargesEnabled) {
                  await createNotification({
                    userId: vendor.userId,
                    type: 'module_approved',
                    title: '✅ ¡Tu cuenta de cobros está activa!',
                    message: 'Tu cuenta Stripe Connect fue verificada. Ya puedes recibir pagos directamente en tu cuenta bancaria.',
                    actionUrl: '/dashboard/connect',
                  });
                }
                console.log(`[Stripe Webhook] Vendor ${vendor.userId} Connect status updated to: ${newStatus}`);
              }
            } catch (err) {
              console.error('[Stripe Webhook] Error updating Connect account:', err);
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
        // ─── Sistema 1: Marcar evento como procesado exitosamente ─────────────────────────
        if (webhookEventDbId) {
          await marcarProcesado(webhookEventDbId).catch((e) =>
            console.error("[WebhookStore] Error al marcar procesado:", e)
          );
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[Stripe Webhook] Error processing event:", errMsg);
        // ─── Sistema 1: Marcar evento como fallido y registrar error para retry ─────────────────
        if (webhookEventDbId) {
          await marcarFallido(webhookEventDbId, errMsg).catch((e) =>
            console.error("[WebhookStore] Error al marcar fallido:", e)
          );
        }
      }

      res.json({ received: true });
    }
  );
}

// ─── Stripe Connect Webhook ───────────────────────────────────────────────────
// Este endpoint recibe eventos de las cuentas Connect de los vendedores.
// Se debe registrar en Stripe Dashboard → Webhooks → "Connect webhooks" apuntando a:
// https://payprocess-tm7gpbte.manus.space/api/stripe/connect-webhook
// Eventos a escuchar: charge.dispute.created, charge.dispute.updated, charge.dispute.closed
export function registerStripeConnectWebhook(app: express.Application) {
  app.post(
    "/api/stripe/connect-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      // Usar el secret del Connect webhook (diferente al webhook principal)
      const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, connectSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Connect Webhook] Signature verification failed:", message);
        return res.status(400).json({ error: `Webhook Error: ${message}` });
      }
      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        return res.json({ verified: true });
      }
      // La cuenta Connect afectada está en event.account
      const connectedAccountId = (event as unknown as { account?: string }).account;
      console.log(`[Connect Webhook] Event: ${event.type} (${event.id}) account: ${connectedAccountId}`);
      try {
        switch (event.type) {
          case "charge.dispute.created": {
            const dispute = event.data.object as Stripe.Dispute;
            console.log(`[Connect Webhook] Disputa creada en cuenta ${connectedAccountId}: ${dispute.id} por $${dispute.amount / 100} ${dispute.currency}`);
            // Buscar el vendedor por stripeConnectAccountId
            let vendor: Awaited<ReturnType<typeof getUserById>> | undefined;
            let vendorSettings: Awaited<ReturnType<typeof getVendorSettings>> | undefined;
            if (connectedAccountId) {
              const db = await (await import("./db")).getDb();
              if (db) {
                const { eq } = await import("drizzle-orm");
                const { vendorSettings: vsTable, users } = await import("../drizzle/schema");
                const rows = await db
                  .select({ userId: vsTable.userId, businessName: vsTable.businessName, businessEmail: vsTable.businessEmail })
                  .from(vsTable)
                  .where(eq(vsTable.stripeConnectAccountId, connectedAccountId))
                  .limit(1);
                if (rows[0]) {
                  vendor = await getUserById(rows[0].userId);
                  vendorSettings = await getVendorSettings(rows[0].userId);
                }
              }
            }
            if (!vendor?.email) {
              console.warn(`[Connect Webhook] No se encontró vendedor para cuenta Connect ${connectedAccountId}`);
              break;
            }
            // Buscar la transacción relacionada
            let tx: Awaited<ReturnType<typeof getTransactionByPaymentIntent>> | undefined;
            if (typeof dispute.payment_intent === "string" && dispute.payment_intent) {
              tx = await getTransactionByPaymentIntent(dispute.payment_intent);
            }
            if (!tx && typeof dispute.charge === "string" && dispute.charge) {
              tx = await getTransactionByChargeId(dispute.charge);
            }
            const reasonMap: Record<string, string> = {
              fraudulent: "Cargo fraudulento",
              duplicate: "Cargo duplicado",
              product_not_received: "Producto no recibido",
              product_unacceptable: "Producto inaceptable",
              credit_not_processed: "Crédito no procesado",
              subscription_canceled: "Suscripción cancelada",
              unrecognized: "Cargo no reconocido",
              general: "Disputa general",
            };
            const reasonEs = reasonMap[dispute.reason] || dispute.reason || "Contracargo";
            const dueBy = dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : undefined;
            // Crear chargeback en BD si no existe
            if (tx) {
              try {
                const existing = await getChargebackByDisputeId(dispute.id);
                if (!existing) {
                  await createChargeback({
                    userId: tx.userId,
                    transactionId: tx.id,
                    stripeDisputeId: dispute.id,
                    amount: dispute.amount,
                    currency: dispute.currency,
                    reason: dispute.reason,
                    reasonEs,
                    status: "open",
                    dueBy,
                  });
                  // Notificación en panel
                  try {
                    const dueByDate = dueBy ? dueBy.toLocaleDateString('es-MX') : 'próximamente';
                    await createNotification({
                      userId: tx.userId,
                      type: 'chargeback_alert',
                      title: `⚠️ Contracargo recibido: $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()}`,
                      message: `Motivo: ${reasonEs}. Tienes hasta el ${dueByDate} para responder con evidencia. Ve a Aclaraciones para gestionarlo.`,
                      actionUrl: '/dashboard/chargebacks',
                    });
                  } catch (_) {}
                }
              } catch (cbErr) {
                console.error('[Connect Webhook] Error creando chargeback:', cbErr);
              }
            }
            // Enviar email de alerta al vendedor
            try {
              await sendChargebackAlertEmail({
                vendorEmail: vendor.email,
                vendorName: vendorSettings?.businessName || vendor.name || "Vendedor",
                payerName: tx?.payerName || "Cliente",
                payerEmail: tx?.payerEmail || "",
                payerPhone: tx?.payerPhone || undefined,
                amount: dispute.amount,
                currency: dispute.currency,
                reasonEs,
                stripeDisputeId: dispute.id,
                transactionId: tx?.id || 0,
                dueBy,
              });
              console.log(`[Connect Webhook] ✅ Email de alerta enviado a ${vendor.email} para disputa ${dispute.id}`);
            } catch (emailErr) {
              console.error('[Connect Webhook] Error enviando email de alerta:', emailErr);
            }
            // Notificar al owner también
            await notifyOwner({
              title: `⚠️ Contracargo Connect: $${(dispute.amount / 100).toFixed(2)} ${dispute.currency.toUpperCase()} — ${vendor.name}`,
              content: `Vendedor: ${vendor.email} | Motivo: ${reasonEs} | Disputa: ${dispute.id} | Cuenta: ${connectedAccountId}`,
            });
            break;
          }
          case "charge.dispute.updated": {
            const dispute = event.data.object as Stripe.Dispute;
            const statusMap: Record<string, string> = {
              warning_needs_response: "open",
              warning_under_review: "under_review",
              warning_closed: "closed",
              needs_response: "open",
              under_review: "under_review",
              charge_refunded: "won",
              won: "won",
              lost: "lost",
            };
            const newStatus = statusMap[dispute.status] || "open";
            try {
              const existing = await getChargebackByDisputeId(dispute.id);
              if (existing) {
                await updateChargebackStatus(existing.id, newStatus as "open" | "under_review" | "won" | "lost" | "closed");
                console.log(`[Connect Webhook] Chargeback ${dispute.id} actualizado a ${newStatus}`);
              }
            } catch (err) {
              console.error('[Connect Webhook] Error actualizando chargeback:', err);
            }
            break;
          }
          case "charge.dispute.closed": {
            const dispute = event.data.object as Stripe.Dispute;
            const finalStatus = dispute.status === "won" ? "won" : "lost";
            try {
              const existing = await getChargebackByDisputeId(dispute.id);
              if (existing) {
                await updateChargebackStatus(existing.id, finalStatus);
                console.log(`[Connect Webhook] Chargeback ${dispute.id} cerrado como ${finalStatus}`);
              }
            } catch (err) {
              console.error('[Connect Webhook] Error cerrando chargeback:', err);
            }
            break;
          }
          default:
            console.log(`[Connect Webhook] Unhandled event: ${event.type}`);
        }
      } catch (err) {
        console.error("[Connect Webhook] Error processing event:", err);
      }
      res.json({ received: true });
    }
  );
}
