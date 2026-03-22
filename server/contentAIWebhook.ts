/**
 * contentAIWebhook.ts — Webhooks salientes a ContentAI
 *
 * Arquitectura Hub-Spoke:
 *   ContentAI es el Centro de Comando. KobraPay envía eventos a ContentAI
 *   cuando ocurren pagos o eventos importantes.
 *
 * Endpoint destino: https://www.aicontentlab.co/api/webhooks/kobrapay
 *
 * Eventos enviados:
 *   - checkout.completed   → Pago único completado
 *   - payment.failed       → Pago fallido
 *   - refund.processed     → Reembolso procesado
 *   - subscription.created → Suscripción creada
 *   - subscription.canceled → Suscripción cancelada
 *   - chargeback.created   → Contracargo creado
 */
import crypto from "crypto";

const CONTENTAI_WEBHOOK_URL = "https://www.aicontentlab.co/api/webhooks/kobrapay";
const CONTENTAI_API_KEY = process.env.CONTENTAI_API_KEY || "";

export type ContentAIEventType =
  | "checkout.completed"
  | "payment.failed"
  | "refund.processed"
  | "subscription.created"
  | "subscription.canceled"
  | "chargeback.created";

export interface ContentAIWebhookPayload {
  event: ContentAIEventType;
  platform: "kobrapay";
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Genera firma HMAC-SHA256 para el payload
 * ContentAI puede verificar con el mismo secreto
 */
function generateSignature(body: string): string {
  if (!CONTENTAI_API_KEY) return "";
  return crypto.createHmac("sha256", CONTENTAI_API_KEY).update(body).digest("hex");
}

/**
 * Envía un evento webhook a ContentAI
 * Silencioso en caso de error — no debe interrumpir el flujo de pago
 */
export async function notifyContentAI(
  event: ContentAIEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const payload: ContentAIWebhookPayload = {
      event,
      platform: "kobrapay",
      timestamp: new Date().toISOString(),
      data,
    };
    const body = JSON.stringify(payload);
    const signature = generateSignature(body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(CONTENTAI_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CONTENTAI_API_KEY}`,
        "X-KobraPay-Signature": signature,
        "X-KobraPay-Event": event,
        "X-KobraPay-Timestamp": payload.timestamp,
        "User-Agent": "KobraPay-Hub/2.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      console.log(`[ContentAI] ✓ Evento enviado: ${event} → HTTP ${response.status}`);
    } else {
      const text = await response.text().catch(() => "");
      console.warn(`[ContentAI] ✗ Error enviando ${event}: HTTP ${response.status} — ${text.slice(0, 200)}`);
    }
  } catch (err) {
    // Silencioso — no interrumpir el flujo de pago
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[ContentAI] ✗ Error de red enviando ${event}: ${message}`);
  }
}

/**
 * Helpers de conveniencia para cada tipo de evento
 */
export const contentAIEvents = {
  checkoutCompleted: (data: {
    sessionId: string;
    amount: number;
    currency: string;
    customerEmail?: string;
    customerName?: string;
    description?: string;
    merchantId: number;
    stripePaymentIntentId?: string;
    planId?: string;
    externalUserId?: string;
  }) => notifyContentAI("checkout.completed", data),

  paymentFailed: (data: {
    sessionId?: string;
    amount?: number;
    currency?: string;
    customerEmail?: string;
    merchantId: number;
    errorCode?: string;
    errorMessage?: string;
  }) => notifyContentAI("payment.failed", data),

  refundProcessed: (data: {
    transactionId: number;
    amount: number;
    currency: string;
    customerEmail?: string;
    merchantId: number;
    reason?: string;
  }) => notifyContentAI("refund.processed", data),

  subscriptionCreated: (data: {
    subscriptionId: number;
    stripeSubscriptionId?: string;
    planName: string;
    amount: number;
    currency: string;
    interval: string;
    customerEmail?: string;
    merchantId: number;
    externalUserId?: string;
  }) => notifyContentAI("subscription.created", data),

  subscriptionCanceled: (data: {
    subscriptionId: number;
    stripeSubscriptionId?: string;
    customerEmail?: string;
    merchantId: number;
    reason?: string;
  }) => notifyContentAI("subscription.canceled", data),

  chargebackCreated: (data: {
    chargebackId: number;
    transactionId: number;
    amount: number;
    currency: string;
    reason?: string;
    merchantId: number;
  }) => notifyContentAI("chargeback.created", data),
};
