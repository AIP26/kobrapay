/**
 * webhookStore.ts — Sistema 1: Almacenamiento resiliente de eventos de Stripe
 *
 * Flujo de procesamiento:
 *   1. Stripe envía evento → persistirEvento() lo guarda como 'pending'
 *   2. Webhook intenta procesarlo → marcarProcesando() cambia a 'processing'
 *   3a. Éxito → marcarProcesado() cambia a 'processed' + registra processedAt
 *   3b. Error → marcarFallido() incrementa attempts + guarda lastError
 *   4. Si attempts >= MAX_ATTEMPTS → status queda 'failed' para revisión manual
 *   5. Si el evento ya existía → marcarDuplicado() cambia a 'duplicate'
 *
 * Garantías:
 *   - Ningún evento se pierde: se persiste ANTES de procesarlo
 *   - Idempotencia: stripeEventId tiene UNIQUE constraint en BD
 *   - Trazabilidad: cada evento tiene timestamps y log de errores
 *   - Alertas: eventos fallidos generan log estructurado para monitoreo
 */

import { getDb } from "./db";
import { webhookEvents } from "../drizzle/schema";
import { eq, and, lt, inArray } from "drizzle-orm";

const MAX_ATTEMPTS = 3;

export interface WebhookEventData {
  stripeEventId: string;
  eventType: string;
  payload: string; // JSON serializado del evento completo
  paymentLinkToken?: string;
  stripePaymentIntentId?: string;
  relatedUserId?: number;
}

/**
 * Persiste un evento de Stripe en la BD antes de procesarlo.
 * Retorna:
 *   { saved: true, id }  → evento nuevo, procesar
 *   { saved: false, duplicate: true } → evento ya existía, ignorar
 */
export async function persistirEvento(data: WebhookEventData): Promise<
  | { saved: true; id: number }
  | { saved: false; duplicate: true }
> {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  try {
    const [result] = await db
      .insert(webhookEvents)
      .values({
        stripeEventId: data.stripeEventId,
        eventType: data.eventType,
        payload: data.payload,
        status: "pending",
        attempts: 0,
        paymentLinkToken: data.paymentLinkToken,
        stripePaymentIntentId: data.stripePaymentIntentId,
        relatedUserId: data.relatedUserId,
        receivedAt: new Date(),
      })
      .$returningId();

    console.log(`[WebhookStore] ✅ Evento persistido: ${data.eventType} (${data.stripeEventId}) id=${result.id}`);
    return { saved: true, id: result.id };
  } catch (err: unknown) {
    // Error de UNIQUE constraint = evento duplicado
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Duplicate entry") || msg.includes("UNIQUE") || msg.includes("ER_DUP_ENTRY")) {
      console.warn(`[WebhookStore] ⚠️  Evento duplicado detectado: ${data.stripeEventId}. Ignorando.`);
      // Marcar como duplicate en BD para trazabilidad
      try {
      await db
        .update(webhookEvents)
        .set({ status: "duplicate" as const, updatedAt: new Date() })
        .where(eq(webhookEvents.stripeEventId, data.stripeEventId));
      } catch (_) {}
      return { saved: false, duplicate: true };
    }
    // Error inesperado al persistir — log crítico
    console.error(`[WebhookStore] ❌ ERROR CRÍTICO al persistir evento ${data.stripeEventId}:`, msg);
    throw err;
  }
}

/**
 * Marca el evento como 'processing' (lock optimista).
 * Incrementa el contador de intentos.
 */
export async function marcarProcesando(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Incrementar attempts y cambiar status a processing en un solo UPDATE
  await db.execute(
    `UPDATE webhook_events SET attempts = attempts + 1, status = 'processing', updatedAt = NOW() WHERE id = ${id}`
  );
}

/**
 * Marca el evento como procesado exitosamente.
 */
export async function marcarProcesado(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(webhookEvents)
    .set({
      status: "processed",
      processedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(webhookEvents.id, id));
  console.log(`[WebhookStore] ✅ Evento id=${id} procesado exitosamente`);
}

/**
 * Marca el evento como fallido y registra el error.
 * Si ya alcanzó MAX_ATTEMPTS, genera alerta crítica.
 */
export async function marcarFallido(id: number, error: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Obtener el estado actual para saber cuántos intentos lleva
  const [current] = await db
    .select({ attempts: webhookEvents.attempts, eventType: webhookEvents.eventType, stripeEventId: webhookEvents.stripeEventId })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, id))
    .limit(1);

  const attempts = current?.attempts ?? 0;
  const isFinal = attempts >= MAX_ATTEMPTS;

  await db
    .update(webhookEvents)
    .set({
      status: "failed" as const,
      lastError: error.substring(0, 2000),
      updatedAt: new Date(),
    })
    .where(eq(webhookEvents.id, id));

  if (isFinal) {
    // Alerta crítica: evento agotó reintentos
    alertarEventoFallido({
      id,
      eventType: current?.eventType ?? "unknown",
      stripeEventId: current?.stripeEventId ?? "unknown",
      attempts,
      error,
    });
  } else {
    console.warn(`[WebhookStore] ⚠️  Evento id=${id} falló (intento ${attempts}/${MAX_ATTEMPTS}): ${error.substring(0, 200)}`);
  }
}

/**
 * Sistema 4: Alerta interna cuando un evento de webhook agota sus reintentos.
 * Genera log estructurado JSON para integración con sistemas de monitoreo.
 */
export function alertarEventoFallido(data: {
  id: number;
  eventType: string;
  stripeEventId: string;
  attempts: number;
  error: string;
}): void {
  const alert = {
    level: "CRITICAL",
    system: "KobraPay-Webhook",
    alert: "WEBHOOK_EVENT_EXHAUSTED",
    timestamp: new Date().toISOString(),
    eventId: data.id,
    stripeEventId: data.stripeEventId,
    eventType: data.eventType,
    attempts: data.attempts,
    error: data.error.substring(0, 500),
    action: "Revisar manualmente en tabla webhook_events",
    dashboard: "/dashboard/admin/webhook-events",
  };
  console.error(`[ALERT:CRITICAL] ${JSON.stringify(alert)}`);
}

/**
 * Sistema 4: Alerta cuando se detecta un pago fallido.
 * Se llama desde el webhook cuando payment_intent.payment_failed.
 */
export function alertarPagoFallido(data: {
  stripePaymentIntentId: string;
  payerEmail?: string;
  amount?: string;
  currency?: string;
  errorCode?: string;
  errorMessage?: string;
  userId?: number;
}): void {
  const alert = {
    level: "WARNING",
    system: "KobraPay-Payments",
    alert: "PAYMENT_FAILED",
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.warn(`[ALERT:WARNING] ${JSON.stringify(alert)}`);
}

/**
 * Sistema 4: Alerta cuando se detecta un webhook duplicado.
 */
export function alertarWebhookDuplicado(stripeEventId: string, eventType: string): void {
  const alert = {
    level: "INFO",
    system: "KobraPay-Webhook",
    alert: "WEBHOOK_DUPLICATE",
    timestamp: new Date().toISOString(),
    stripeEventId,
    eventType,
    note: "Stripe reenvió un evento ya procesado. Ignorado correctamente.",
  };
  console.info(`[ALERT:INFO] ${JSON.stringify(alert)}`);
}

/**
 * Sistema 4: Alerta cuando un pago queda en estado 'processing' por más de N minutos.
 * Llamar periódicamente desde un job o al detectar el estado.
 */
export function alertarPagoSinConfirmacion(data: {
  transactionId: number;
  stripePaymentIntentId: string;
  payerEmail?: string;
  minutosEnProcesing: number;
}): void {
  const alert = {
    level: "WARNING",
    system: "KobraPay-Payments",
    alert: "PAYMENT_STUCK_PROCESSING",
    timestamp: new Date().toISOString(),
    ...data,
    action: "Verificar estado en Stripe Dashboard",
  };
  console.warn(`[ALERT:WARNING] ${JSON.stringify(alert)}`);
}

/**
 * Obtiene eventos pendientes o fallidos para reintento manual.
 * Útil para un job de recuperación o panel de admin.
 */
export async function obtenerEventosPendientes(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookEvents)
    .where(inArray(webhookEvents.status, ["pending", "failed"]))
    .limit(limit)
    .orderBy(webhookEvents.receivedAt);
}

/**
 * Obtiene estadísticas del sistema de webhook para el dashboard.
 */
export async function obtenerEstadisticasWebhook(): Promise<{
  processed: number;
  pending: number;
  failed: number;
  duplicates: number;
  processing: number;
  total: number;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const [rows] = await db.execute(`
    SELECT
      SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) AS processed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status = 'duplicate' THEN 1 ELSE 0 END) AS duplicates,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
      COUNT(*) AS total
    FROM webhook_events
    WHERE receivedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `) as unknown as [Array<Record<string, number>>];
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    processed: Number(row.processed ?? 0),
    pending: Number(row.pending ?? 0),
    failed: Number(row.failed ?? 0),
    duplicates: Number(row.duplicates ?? 0),
    processing: Number(row.processing ?? 0),
    total: Number(row.total ?? 0),
  };
}
