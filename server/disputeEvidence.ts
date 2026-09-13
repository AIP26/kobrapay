/**
 * Evidencia de disputas (contracargos) — lógica compartida.
 *
 * Usada por:
 *  1. routers.ts -> chargebacks.submitEvidence (botón manual del vendedor)
 *  2. stripeWebhook.ts -> charge.dispute.created (AUTO-ENVÍO al abrirse la disputa)
 *
 * El auto-envío protege a la plataforma: Stripe retiene el dinero a la plataforma
 * y si nadie responde antes de evidence_details.due_by, la disputa se pierde
 * por default. La evidencia digital (consentimiento + selfie + INE) se envía
 * sin depender de que el vendedor entre al panel.
 *
 * OJO: Stripe solo permite UNA entrega de evidencia por disputa (submit: true
 * es irreversible). Si el vendedor quiere agregar algo después, debe hacerlo
 * antes del submit o directamente en el panel de Stripe.
 */
import { ENV } from "./_core/env";

export interface AutoEvidenceResult {
  submitted: boolean;
  reason?: string;
}

/** Convierte URLs relativas de storage local (/api/files/...) a absolutas. */
function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = ENV.appUrl || "https://www.kobrapay.mx";
  return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

/**
 * Arma y envía la evidencia de una disputa a Stripe.
 * Devuelve { submitted: true } si Stripe la aceptó.
 */
export async function submitDisputeEvidence(opts: {
  userId: number;
  transactionId: number | null;
  stripeDisputeId: string;
  chargebackAmountCents: number;
  chargebackCurrency: string;
  /** Si la disputa vive en una cuenta Connect, hay que operar en nombre de esa cuenta. */
  stripeAccountId?: string;
}): Promise<AutoEvidenceResult> {
  const {
    getPaymentConsentByTransaction,
    getTransactionsByUser,
    getVendorSettings,
  } = await import("./db");

  const consent = opts.transactionId ? await getPaymentConsentByTransaction(opts.transactionId) : null;
  const txs = await getTransactionsByUser(opts.userId);
  const tx = opts.transactionId ? txs.find((t) => t.id === opts.transactionId) : null;
  const vendorCfg = await getVendorSettings(opts.userId);

  const consentText = consent
    ? [
        `CONSENTIMIENTO EXPLÍCITO DEL PAGADOR:`,
        `  - Nombre: ${consent.payerName}`,
        `  - Email: ${consent.payerEmail}`,
        `  - Teléfono: ${consent.payerPhone || "N/A"}`,
        `  - IP del dispositivo: ${consent.ipAddress || "N/A"}`,
        `  - Timestamp de aceptación: ${new Date(consent.consentAt).toLocaleString("es-MX")}`,
        `  - Monto aceptado: $${consent.amountAccepted} ${consent.currency}`,
        `  - User-Agent: ${consent.userAgent || "N/A"}`,
        `  - Términos aceptados: ${consent.termsSnapshot ? "Sí — " + String(consent.termsSnapshot).substring(0, 300) : "Sí"}`,
      ].join("\n")
    : "Sin registro de consentimiento digital";

  const evidencePayload: Record<string, string> = {
    product_description:
      (tx?.metadata
        ? (() => {
            try {
              return JSON.parse(String(tx.metadata)).description || "";
            } catch {
              return "";
            }
          })()
        : "") || "Servicio procesado a través de KobraPay",
    customer_name: tx?.payerName || consent?.payerName || "Cliente",
    customer_email_address: tx?.payerEmail || consent?.payerEmail || "",
    billing_address: `${tx?.payerName || ""} - ${tx?.payerEmail || ""}`,
    service_date: tx ? new Date(tx.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    uncategorized_text: [
      `EVIDENCIA DE PAGO - KobraPay`,
      `Negocio: ${vendorCfg?.businessName || "KobraPay"}`,
      `Monto: $${tx?.amount || opts.chargebackAmountCents / 100} ${tx?.currency || opts.chargebackCurrency}`,
      `Fecha de pago: ${tx ? new Date(tx.createdAt).toLocaleString("es-MX") : "N/A"}`,
      `N° Operación: ${tx?.operationNumber || "N/A"}`,
      `Stripe PI: ${tx?.stripePaymentIntentId || "N/A"}`,
      `Selfie del pagador: ${tx?.selfieUrl ? "Adjunta en archivo" : "No disponible"}`,
      `Identificación del pagador: ${tx?.idDocumentUrl ? "Adjunta en archivo" : "No disponible"}`,
      consentText,
    ].join("\n"),
  };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { submitted: false, reason: "STRIPE_SECRET_KEY no configurada" };
  const stripe = new (await import("stripe")).default(stripeKey, { apiVersion: "2026-02-25.clover" as any });
  // En cuentas Connect, los archivos y la disputa se operan en nombre de la cuenta conectada
  const accountOpts = opts.stripeAccountId ? { stripeAccount: opts.stripeAccountId } : undefined;

  // Subir archivos (selfie + INE) a Stripe como evidencia formal
  if (tx?.selfieUrl) {
    try {
      const resp = await fetch(toAbsoluteUrl(String(tx.selfieUrl)));
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const file = await stripe.files.create({
          purpose: "dispute_evidence",
          file: { data: buf, name: "selfie_pagador.jpg", type: "image/jpeg" },
        }, accountOpts);
        (evidencePayload as any).customer_signature = file.id;
      }
    } catch (e) {
      console.error("[Disputa] No se pudo adjuntar selfie:", e);
    }
  }
  if (tx?.idDocumentUrl) {
    try {
      const resp = await fetch(toAbsoluteUrl(String(tx.idDocumentUrl)));
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const file = await stripe.files.create({
          purpose: "dispute_evidence",
          file: { data: buf, name: "identificacion_pagador.jpg", type: "image/jpeg" },
        }, accountOpts);
        (evidencePayload as any).uncategorized_file = file.id;
      }
    } catch (e) {
      console.error("[Disputa] No se pudo adjuntar INE:", e);
    }
  }

  try {
    await stripe.disputes.update(opts.stripeDisputeId, {
      evidence: evidencePayload as any,
      submit: true,
    }, accountOpts);
  } catch (e: any) {
    // Ej.: evidencia ya enviada antes (Stripe solo acepta UNA entrega por disputa)
    return { submitted: false, reason: e?.message || "Stripe rechazó la evidencia" };
  }
  return { submitted: true };
}
