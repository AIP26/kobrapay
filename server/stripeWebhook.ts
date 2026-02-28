import express from "express";
import Stripe from "stripe";
import {
  getPaymentLinkByToken,
  getTransactionsByUser,
  getTransactionByPaymentIntent,
  updatePaymentLinkStatus,
  updateTransactionStatus,
  createChargeback,
} from "./db";
import { notifyOwner } from "./_core/notification";

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

      try {
        switch (event.type) {
          case "payment_intent.succeeded": {
            const pi = event.data.object as Stripe.PaymentIntent;
            const token = pi.metadata?.paymentLinkToken;
            const userId = pi.metadata?.userId ? parseInt(pi.metadata.userId) : null;

            if (token && userId) {
              const link = await getPaymentLinkByToken(token);
              if (link && link.status === "pending") {
                await updatePaymentLinkStatus(link.id, "paid", new Date());

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
                  });
                }

                // Notify vendor
                try {
                  await notifyOwner({
                    title: `✅ Pago recibido: $${link.amount} ${link.currency}`,
                    content: `El cliente ${pi.metadata.payerName || "desconocido"} (${pi.metadata.payerEmail || ""}) pagó $${link.amount} ${link.currency} por "${link.description}".`,
                  });
                } catch (_) {}
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
              }
            }
            break;
          }

          case "charge.dispute.created": {
            const dispute = event.data.object as Stripe.Dispute;
            console.log(`[Stripe Webhook] Disputa creada: ${dispute.id} por $${dispute.amount / 100} ${dispute.currency}`);
            try {
              // Buscar la transacción relacionada
              let tx: Awaited<ReturnType<typeof getTransactionByPaymentIntent>> | undefined;
              if (typeof dispute.payment_intent === "string") {
                tx = await getTransactionByPaymentIntent(dispute.payment_intent);
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
              }
            } catch (err) {
              console.error("[Stripe Webhook] Error al crear chargeback:", err);
            }
            break;
          }

          case "charge.dispute.updated": {
            const dispute = event.data.object as Stripe.Dispute;
            console.log(`[Stripe Webhook] Disputa actualizada: ${dispute.id} status=${dispute.status}`);
            break;
          }

          case "charge.dispute.closed": {
            const dispute = event.data.object as Stripe.Dispute;
            console.log(`[Stripe Webhook] Disputa cerrada: ${dispute.id} status=${dispute.status}`);
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Stripe Webhook] Error processing event:", err);
      }

      res.json({ received: true });
    }
  );
}
