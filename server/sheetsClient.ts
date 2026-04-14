/**
 * sheetsClient.ts — Fase 2B: Integración Google Sheets via Apps Script Web App
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ARQUITECTURA (sin Service Account, sin credenciales de Google Cloud):
 *
 *   KobraPay Webhook
 *       │
 *       ▼
 *   enqueueSheetSync()
 *       │
 *       ├─ Guarda en sheets_sync_queue (BD) ← anti-duplicados + retry
 *       │
 *       └─ POST JSON → GOOGLE_APPS_SCRIPT_URL
 *                          │
 *                          ▼
 *                    Apps Script Web App
 *                          │
 *                          ▼
 *                    Google Sheet "KobraPay - Pagos"
 *
 * ESTADO: READY BUT NOT CONNECTED
 *
 * Solo requiere 1 variable de entorno:
 *   GOOGLE_APPS_SCRIPT_URL  → URL del Web App publicado en Apps Script
 *                             Formato: https://script.google.com/macros/s/{ID}/exec
 *
 * ─── CHECKLIST DE ACTIVACIÓN ─────────────────────────────────────────────────
 *
 * 1. Crear un Google Sheet nuevo (o usar uno existente)
 * 2. Ir a Extensiones → Apps Script
 * 3. Pegar el código de /scripts/kobrapay-apps-script.js
 * 4. Guardar → Implementar → Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo (tu cuenta de Google)
 *    - Quién tiene acceso: Cualquier persona
 * 5. Copiar la URL del Web App (https://script.google.com/macros/s/{ID}/exec)
 * 6. En KobraPay → Settings → Secrets: GOOGLE_APPS_SCRIPT_URL = {URL copiada}
 * 7. Listo — los pagos empezarán a registrarse automáticamente
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { sheetsSyncQueue } from "../drizzle/schema";

// ─── Configuración ────────────────────────────────────────────────────────────

const APPS_SCRIPT_URL = () => process.env.GOOGLE_APPS_SCRIPT_URL || "";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000; // 1s, 2s, 4s

function isConfigured(): boolean {
  const url = APPS_SCRIPT_URL();
  return Boolean(url && url.startsWith("https://script.google.com/"));
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SheetsEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "payment_processing";

export interface SheetsPaymentPayload {
  stripePaymentIntentId: string;
  eventType: SheetsEventType;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  amountMxn: string;
  currency: string;
  paymentMethod: string | null;   // card | oxxo | spei
  cardBrand: string | null;       // visa | mastercard | amex | null
  cardLast4: string | null;
  paymentStatus: string;
  paymentLinkToken: string | null;
  errorMessage: string | null;
  paidAfterExpiry: boolean;
  vendorUserId: number | null;
  paidAt: Date | null;
}

export interface SheetsResult {
  success: boolean;
  action?: "appended" | "updated" | "skipped";
  reason?: string;
  rowIndex?: number;
  error?: string;
}

export interface SheetsSyncStats {
  pending: number;
  synced: number;
  failed: number;
  skipped: number;
  total: number;
  isConfigured: boolean;
}

// ─── Construcción del payload para Apps Script ────────────────────────────────

function buildAppsScriptPayload(p: SheetsPaymentPayload): Record<string, unknown> {
  const now = p.paidAt ?? new Date();

  const fecha = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(now);

  const hora = new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "America/Mexico_City",
  }).format(now);

  const metodoPago = (() => {
    const m = (p.paymentMethod || "").toLowerCase();
    if (m === "card") {
      const brandMap: Record<string, string> = {
        visa: "Visa", mastercard: "Mastercard", amex: "American Express",
        discover: "Discover", jcb: "JCB", unionpay: "UnionPay",
      };
      const brand = brandMap[(p.cardBrand || "").toLowerCase()] || (p.cardBrand || "Tarjeta");
      return p.cardLast4 ? `${brand} ****${p.cardLast4}` : brand;
    }
    if (m === "oxxo") return "OXXO";
    if (m === "spei") return "SPEI / Transferencia";
    return p.paymentMethod || "Desconocido";
  })();

  const statusLabel = (() => {
    switch (p.eventType) {
      case "payment_succeeded":  return "✅ Exitoso";
      case "payment_failed":     return "❌ Fallido";
      case "payment_processing": return "⏳ En Proceso";
      default: return p.paymentStatus;
    }
  })();

  return {
    fecha,
    hora,
    cliente:         p.payerName || "(Sin nombre)",
    email:           p.payerEmail || "",
    telefono:        p.payerPhone || "",
    monto:           parseFloat(p.amountMxn) || 0,
    moneda:          p.currency || "MXN",
    metodoPago,
    status:          statusLabel,
    transactionId:   "",
    paymentIntentId: p.stripePaymentIntentId,
    linkToken:       p.paymentLinkToken || "",
    pagoTardio:      p.paidAfterExpiry ? "Sí" : "No",
    error:           p.errorMessage || "",
    tipoEvento:      p.eventType,
    vendorId:        p.vendorUserId ? String(p.vendorUserId) : "",
    _meta: {
      source:  "kobrapay",
      version: "2.0",
      sentAt:  new Date().toISOString(),
    },
  };
}

// ─── Envío con retry exponencial ─────────────────────────────────────────────

async function sendToAppsScript(
  payload: Record<string, unknown>,
  attempt = 1
): Promise<SheetsResult> {
  try {
    const response = await fetch(APPS_SCRIPT_URL(), {
      method:  "POST",
      headers: {
        "Content-Type":       "application/json",
        "X-KobraPay-Source":  "webhook",
        "X-KobraPay-Version": "2.0",
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const result = await response.json().catch(() => ({})) as Record<string, unknown>;

    if (result.success === false) {
      throw new Error(String(result.error || "Apps Script retornó error"));
    }

    return {
      success:  true,
      action:   (result.action as "appended" | "updated") || "appended",
      rowIndex: typeof result.row === "number" ? result.row : undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (attempt < MAX_RETRIES) {
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[Sheets] Intento ${attempt}/${MAX_RETRIES} fallido. Reintentando en ${waitMs}ms. Error: ${errorMsg}`
      );
      await new Promise((r) => setTimeout(r, waitMs));
      return sendToAppsScript(payload, attempt + 1);
    }

    return { success: false, reason: "MAX_RETRIES_EXCEEDED", error: errorMsg };
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * syncPaymentToSheets — Envío directo sin persistencia en BD.
 */
export async function syncPaymentToSheets(p: SheetsPaymentPayload): Promise<SheetsResult> {
  if (!isConfigured()) {
    const preview = JSON.stringify(buildAppsScriptPayload(p), null, 2);
    console.log(`[Sheets] NOT CONFIGURED — Payload que se enviaría:\n${preview}`);
    return { success: false, reason: "SHEETS_NOT_CONFIGURED" };
  }

  const appsScriptPayload = buildAppsScriptPayload(p);
  console.log(`[Sheets] Enviando evento ${p.eventType} para PI ${p.stripePaymentIntentId}`);

  const result = await sendToAppsScript(appsScriptPayload);

  if (result.success) {
    console.log(`[Sheets] ✅ Sincronizado — acción: ${result.action}, fila: ${result.rowIndex ?? "?"}`);
  } else {
    console.error(`[Sheets] ❌ Error al sincronizar PI ${p.stripePaymentIntentId}: ${result.error}`);
  }

  return result;
}

/**
 * enqueueSheetSync — Función principal del webhook.
 * Persiste en BD (anti-duplicados + retry) y luego envía a Apps Script.
 * NUNCA lanza excepción — el flujo de cobro no debe interrumpirse.
 */
export async function enqueueSheetSync(p: SheetsPaymentPayload): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Sheets] Sin conexión a BD para encolar evento");
    return;
  }

  try {
    // ── Anti-duplicados: verificar si ya existe este PI + eventType ──────────
    const existing = await db
      .select({ id: sheetsSyncQueue.id, status: sheetsSyncQueue.status })
      .from(sheetsSyncQueue)
      .where(
        and(
          eq(sheetsSyncQueue.stripePaymentIntentId, p.stripePaymentIntentId),
          eq(sheetsSyncQueue.eventType, p.eventType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0];
      if (prev.status === "synced") {
        console.log(
          `[Sheets] Evento ${p.eventType} para PI ${p.stripePaymentIntentId} ya sincronizado. Ignorando.`
        );
        return;
      }
      // Reencolar si estaba fallido o pendiente
      await db
        .update(sheetsSyncQueue)
        .set({ status: "pending", retries: 0, lastError: null })
        .where(eq(sheetsSyncQueue.id, prev.id));
    } else {
      // ── Insertar nuevo evento en la cola ───────────────────────────────────
      const payloadJson   = JSON.stringify(buildAppsScriptPayload(p));
      const initialStatus = isConfigured() ? "pending" : "skipped" as const;

      await db.insert(sheetsSyncQueue).values({
        stripePaymentIntentId: p.stripePaymentIntentId,
        eventType:             p.eventType,
        payerEmail:            p.payerEmail,
        payerName:             p.payerName,
        amountMxn:             p.amountMxn,
        currency:              p.currency,
        paymentMethod:         p.paymentMethod,
        paymentStatus:         p.paymentStatus,
        paymentLinkToken:      p.paymentLinkToken,
        errorMessage:          p.errorMessage,
        paidAfterExpiry:       p.paidAfterExpiry,
        vendorUserId:          p.vendorUserId,
        payloadJson,
        status:                initialStatus,
        retries:               0,
      });

      if (!isConfigured()) {
        console.log(
          `[Sheets] SKIPPED (no configurado) — Evento ${p.eventType} guardado en cola.\n` +
          `Payload que se enviaría:\n${payloadJson}`
        );
        return;
      }
    }

    // ── Envío inmediato a Apps Script ─────────────────────────────────────────
    const result = await syncPaymentToSheets(p);

    // ── Actualizar estado en la cola ──────────────────────────────────────────
    if (result.success) {
      await db
        .update(sheetsSyncQueue)
        .set({ status: "synced", lastError: null })
        .where(
          and(
            eq(sheetsSyncQueue.stripePaymentIntentId, p.stripePaymentIntentId),
            eq(sheetsSyncQueue.eventType, p.eventType)
          )
        );
    } else {
      await db
        .update(sheetsSyncQueue)
        .set({
          status:    "failed",
          lastError: result.error || result.reason || "Error desconocido",
        })
        .where(
          and(
            eq(sheetsSyncQueue.stripePaymentIntentId, p.stripePaymentIntentId),
            eq(sheetsSyncQueue.eventType, p.eventType)
          )
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Sheets] Error en enqueueSheetSync: ${msg}`);
    // No lanzar — el flujo de cobro no debe interrumpirse
  }
}

/**
 * retryFailedSheetEvents — Reintenta eventos fallidos.
 */
export async function retryFailedSheetEvents(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  if (!isConfigured()) {
    console.log("[Sheets] No configurado — no se pueden reintentar eventos");
    return { retried: 0, succeeded: 0, failed: 0 };
  }

  const db = await getDb();
  if (!db) return { retried: 0, succeeded: 0, failed: 0 };

  const rows = await db
    .select({
      id:                    sheetsSyncQueue.id,
      stripePaymentIntentId: sheetsSyncQueue.stripePaymentIntentId,
      eventType:             sheetsSyncQueue.eventType,
      payloadJson:           sheetsSyncQueue.payloadJson,
    })
    .from(sheetsSyncQueue)
    .where(inArray(sheetsSyncQueue.status, ["failed", "pending"]))
    .limit(50);

  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payloadJson || "{}") as Record<string, unknown>;
      const result  = await sendToAppsScript(payload);

      if (result.success) {
        await db
          .update(sheetsSyncQueue)
          .set({ status: "synced", lastError: null })
          .where(eq(sheetsSyncQueue.id, row.id));
        succeeded++;
      } else {
        await db
          .update(sheetsSyncQueue)
          .set({ status: "failed", lastError: result.error || "Error en reintento" })
          .where(eq(sheetsSyncQueue.id, row.id));
        failed++;
      }
    } catch {
      failed++;
    }
  }

  console.log(`[Sheets] Reintento: ${succeeded} exitosos, ${failed} fallidos de ${rows.length}`);
  return { retried: rows.length, succeeded, failed };
}

/**
 * getSheetsSyncStats — Estadísticas de la cola para el panel de admin.
 */
export async function getSheetsSyncStats(): Promise<SheetsSyncStats> {
  const db = await getDb();
  if (!db) {
    return { pending: 0, synced: 0, failed: 0, skipped: 0, total: 0, isConfigured: isConfigured() };
  }

  const allRows = await db
    .select({ status: sheetsSyncQueue.status })
    .from(sheetsSyncQueue);

  const stats: SheetsSyncStats = {
    pending: 0, synced: 0, failed: 0, skipped: 0, total: allRows.length,
    isConfigured: isConfigured(),
  };

  for (const row of allRows) {
    if (row.status === "pending")  stats.pending++;
    else if (row.status === "synced")  stats.synced++;
    else if (row.status === "failed")  stats.failed++;
    else if (row.status === "skipped") stats.skipped++;
  }

  return stats;
}
