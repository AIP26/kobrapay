/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FASE 2A — Adaptador Go High Level (GHL) para KobraPay
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ESTADO: READY BUT NOT CONNECTED
 *
 * Este módulo está 100% implementado y listo para producción.
 * Solo requiere las siguientes variables de entorno para activarse:
 *
 *   GHL_API_KEY       → Private Integration Token de GHL (Bearer token)
 *   GHL_LOCATION_ID   → Location ID de tu sub-cuenta en GHL
 *
 * Mientras no estén configuradas, todas las operaciones retornan
 * { success: false, reason: 'GHL_NOT_CONFIGURED' } sin lanzar errores.
 *
 * ─── ENDPOINTS USADOS ────────────────────────────────────────────────────────
 *
 *   GET  /contacts/?locationId={id}&email={email}
 *        → Buscar contacto por email
 *        → Base: https://services.leadconnectorhq.com
 *
 *   POST /contacts/
 *        → Crear contacto nuevo si no existe
 *        → Payload: { locationId, firstName, lastName, email, phone, source, tags, customFields }
 *
 *   PUT  /contacts/{contactId}
 *        → Actualizar contacto existente con datos del pago
 *        → Payload: { customFields, tags }
 *
 *   POST /contacts/{contactId}/notes
 *        → Agregar nota interna con detalle del pago
 *        → Payload: { body, userId }
 *
 * ─── SCOPES / PERMISOS REQUERIDOS EN EL TOKEN GHL ───────────────────────────
 *
 *   contacts.readonly      → buscar contactos por email
 *   contacts.write         → crear y actualizar contactos
 *   contacts/notes.write   → crear notas en contactos
 *
 * ─── CUSTOM FIELDS EN GHL (debes crearlos manualmente en tu cuenta) ─────────
 *
 *   kobrapay_ultimo_pago_monto     → Monto del último pago (Number)
 *   kobrapay_ultimo_pago_fecha     → Fecha del último pago (Date)
 *   kobrapay_ultimo_pago_metodo    → Método de pago (Text)
 *   kobrapay_ultimo_pago_txid      → Transaction ID de Stripe (Text)
 *   kobrapay_total_pagado          → Suma total pagada (Number)
 *   kobrapay_num_pagos             → Número de pagos realizados (Number)
 *   kobrapay_pago_tardio           → Pago tardío (OXXO/SPEI post-expiración) (Checkbox)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getDb } from "./db";
import { ghlSyncQueue } from "../drizzle/schema";
import { eq, and, lte, lt } from "drizzle-orm";

// ─── Configuración ────────────────────────────────────────────────────────────

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";
const MAX_ATTEMPTS = 5;

// Backoff exponencial: 1min, 5min, 15min, 1h, 4h
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000, 14_400_000];

function isConfigured(): boolean {
  return !!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
}

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: GHL_API_VERSION,
  };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GhlPaymentPayload {
  transactionId: number;
  stripePaymentIntentId: string;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  amountMxn: string;           // decimal como string (ej: "1500.00")
  currency: string;
  paymentMethod: string | null; // "card" | "oxxo" | "spei"
  cardBrand: string | null;
  cardLast4: string | null;
  paidAt: Date;
  paidAfterExpiry: boolean;
  paymentLinkDescription: string | null;
  vendorUserId: number;
}

interface GhlContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface GhlResult {
  success: boolean;
  reason?: string;
  contactId?: string;
  noteId?: string;
  action?: "created" | "updated" | "skipped";
  error?: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function splitName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: "Cliente", lastName: "KobraPay" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "MXN",
  }).format(num);
}

function formatPaymentMethod(method: string | null, brand: string | null, last4: string | null): string {
  if (!method) return "Desconocido";
  if (method === "card") {
    const b = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Tarjeta";
    return last4 ? `${b} terminada en ${last4}` : b;
  }
  if (method === "oxxo") return "OXXO";
  if (method === "spei") return "SPEI / Transferencia";
  return method;
}

// ─── API GHL ──────────────────────────────────────────────────────────────────

/**
 * Buscar contacto por email en GHL.
 * Retorna el primer resultado o null si no existe.
 */
async function searchContactByEmail(email: string): Promise<GhlContact | null> {
  const url = `${GHL_BASE_URL}/contacts/?locationId=${process.env.GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL search failed: ${res.status} ${body}`);
  }

  const data = await res.json() as { contacts?: GhlContact[] };
  return data.contacts?.[0] ?? null;
}

/**
 * Crear contacto nuevo en GHL.
 */
async function createContact(payload: GhlPaymentPayload): Promise<GhlContact> {
  const { firstName, lastName } = splitName(payload.payerName);

  const body = {
    locationId: process.env.GHL_LOCATION_ID,
    firstName,
    lastName,
    email: payload.payerEmail,
    phone: payload.payerPhone ?? undefined,
    source: "KobraPay",
    tags: ["kobrapay-cliente"],
    customFields: buildCustomFields(payload),
  };

  const res = await fetch(`${GHL_BASE_URL}/contacts/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL create contact failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { contact: GhlContact };
  return data.contact;
}

/**
 * Actualizar contacto existente en GHL con los datos del pago.
 */
async function updateContact(contactId: string, payload: GhlPaymentPayload): Promise<void> {
  const body = {
    customFields: buildCustomFields(payload),
    tags: buildTags(payload),
  };

  const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL update contact failed: ${res.status} ${err}`);
  }
}

/**
 * Agregar nota interna al contacto en GHL con el detalle completo del pago.
 */
async function addPaymentNote(contactId: string, payload: GhlPaymentPayload): Promise<string> {
  const montoFmt = formatCurrency(payload.amountMxn, payload.currency);
  const metodoPago = formatPaymentMethod(payload.paymentMethod, payload.cardBrand, payload.cardLast4);
  const fechaPago = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(payload.paidAt);

  const tardio = payload.paidAfterExpiry
    ? "\n⚠️ PAGO TARDÍO: Este pago fue recibido después de que el link de cobro expiró."
    : "";

  const noteBody = `✅ PAGO EXITOSO — KobraPay
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monto:         ${montoFmt}
Fecha:         ${fechaPago}
Método:        ${metodoPago}
Concepto:      ${payload.paymentLinkDescription ?? "Sin descripción"}
Transaction ID: ${payload.stripePaymentIntentId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━${tardio}`;

  const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}/notes`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ body: noteBody }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GHL add note failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { note?: { id: string } };
  return data.note?.id ?? "";
}

/**
 * Construir el array de custom fields para GHL.
 * Los IDs de los campos deben coincidir con los creados en tu cuenta GHL.
 * Usa los nombres de campo como claves (GHL los mapea por nombre).
 */
function buildCustomFields(payload: GhlPaymentPayload) {
  return [
    { key: "kobrapay_ultimo_pago_monto",  field_value: parseFloat(payload.amountMxn) },
    { key: "kobrapay_ultimo_pago_fecha",  field_value: payload.paidAt.toISOString().split("T")[0] },
    { key: "kobrapay_ultimo_pago_metodo", field_value: formatPaymentMethod(payload.paymentMethod, payload.cardBrand, payload.cardLast4) },
    { key: "kobrapay_ultimo_pago_txid",   field_value: payload.stripePaymentIntentId },
    { key: "kobrapay_pago_tardio",        field_value: payload.paidAfterExpiry ? "true" : "false" },
  ];
}

function buildTags(payload: GhlPaymentPayload): string[] {
  const tags = ["kobrapay-cliente", "pago-exitoso"];
  if (payload.paymentMethod === "oxxo") tags.push("pago-oxxo");
  if (payload.paymentMethod === "spei") tags.push("pago-spei");
  if (payload.paidAfterExpiry) tags.push("pago-tardio");
  return tags;
}

// ─── Función principal de sincronización ──────────────────────────────────────

/**
 * Sincronizar un pago exitoso con GHL.
 *
 * Flujo:
 *   1. Buscar contacto por email en GHL
 *   2. Si no existe → crear contacto nuevo
 *   3. Si existe → actualizar con datos del pago
 *   4. Agregar nota interna con detalle del pago
 *   5. Retornar resultado con contactId, noteId y acción realizada
 */
export async function syncPaymentToGhl(payload: GhlPaymentPayload): Promise<GhlResult> {
  // Modo "not configured": retornar sin error, sin bloquear el flujo
  if (!isConfigured()) {
    console.log("[GHL] No configurado — GHL_API_KEY o GHL_LOCATION_ID faltantes. Sincronización omitida.");
    return { success: false, reason: "GHL_NOT_CONFIGURED" };
  }

  if (!payload.payerEmail) {
    console.warn("[GHL] Sin email del pagador — no se puede sincronizar contacto sin email.");
    return { success: false, reason: "NO_PAYER_EMAIL" };
  }

  let contact: GhlContact | null = null;
  let action: "created" | "updated" = "updated";

  // 1. Buscar contacto por email
  contact = await searchContactByEmail(payload.payerEmail);

  // 2. Si no existe, crear
  if (!contact) {
    contact = await createContact(payload);
    action = "created";
    console.log(`[GHL] Contacto creado: ${contact.id} (${payload.payerEmail})`);
  } else {
    // 3. Si existe, actualizar
    await updateContact(contact.id, payload);
    console.log(`[GHL] Contacto actualizado: ${contact.id} (${payload.payerEmail})`);
  }

  // 4. Agregar nota con detalle del pago
  const noteId = await addPaymentNote(contact.id, payload);
  console.log(`[GHL] Nota agregada: ${noteId} en contacto ${contact.id}`);

  return {
    success: true,
    contactId: contact.id,
    noteId,
    action,
  };
}

// ─── Cola de sincronización con retry ─────────────────────────────────────────

/**
 * Encolar un pago para sincronización con GHL.
 * Se llama desde el webhook de Stripe después de registrar la transacción.
 * Si GHL no está configurado, el registro queda en 'skipped'.
 */
export async function enqueueGhlSync(payload: GhlPaymentPayload): Promise<void> {
  const db = await getDb();
  if (!db) { console.error('[GHL] DB no disponible para encolar sync'); return; }

  // Anti-duplicados: si ya existe un registro para este PI, ignorar
  const existing = await db
    .select({ id: ghlSyncQueue.id, status: ghlSyncQueue.status })
    .from(ghlSyncQueue)
    .where(eq(ghlSyncQueue.stripePaymentIntentId, payload.stripePaymentIntentId))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[GHL] Registro ya existe en cola para PI ${payload.stripePaymentIntentId} (status: ${existing[0].status}). Ignorando.`);
    return;
  }

  // Si GHL no está configurado, encolar como skipped con razón
  const initialStatus = isConfigured() ? "pending" : "skipped";
  const lastError = isConfigured() ? null : "GHL_NOT_CONFIGURED: Activa GHL_API_KEY y GHL_LOCATION_ID para sincronizar";

  await db.insert(ghlSyncQueue).values({
    transactionId: payload.transactionId,
    stripePaymentIntentId: payload.stripePaymentIntentId,
    payerName: payload.payerName,
    payerEmail: payload.payerEmail,
    payerPhone: payload.payerPhone,
    amountMxn: payload.amountMxn,
    currency: payload.currency,
    paymentMethod: payload.paymentMethod,
    cardBrand: payload.cardBrand,
    cardLast4: payload.cardLast4,
    paidAt: payload.paidAt,
    paidAfterExpiry: payload.paidAfterExpiry,
    paymentLinkDescription: payload.paymentLinkDescription,
    vendorUserId: payload.vendorUserId,
    status: initialStatus,
    lastError,
  });

  console.log(`[GHL] Pago encolado para sincronización (PI: ${payload.stripePaymentIntentId}, status: ${initialStatus})`);

  // Si está configurado, intentar sincronización inmediata
  if (isConfigured()) {
    await processGhlSyncItem(payload.stripePaymentIntentId);
  }
}

/**
 * Procesar un item de la cola de sincronización.
 * Maneja el lock de procesamiento y el registro del resultado.
 */
async function processGhlSyncItem(stripePaymentIntentId: string): Promise<void> {
  const db = await getDb();
  if (!db) { console.error('[GHL] DB no disponible para procesar sync'); return; }

  // Obtener el item y hacer lock (status → processing)
  const items = await db
    .select()
    .from(ghlSyncQueue)
    .where(
      and(
        eq(ghlSyncQueue.stripePaymentIntentId, stripePaymentIntentId),
        eq(ghlSyncQueue.status, "pending")
      )
    )
    .limit(1);

  if (items.length === 0) return;
  const item = items[0];

  // Lock
  await db
    .update(ghlSyncQueue)
    .set({ status: "processing" })
    .where(eq(ghlSyncQueue.id, item.id));

  try {
    const result = await syncPaymentToGhl({
      transactionId: item.transactionId,
      stripePaymentIntentId: item.stripePaymentIntentId!,
      payerName: item.payerName,
      payerEmail: item.payerEmail,
      payerPhone: item.payerPhone,
      amountMxn: item.amountMxn,
      currency: item.currency,
      paymentMethod: item.paymentMethod,
      cardBrand: item.cardBrand,
      cardLast4: item.cardLast4,
      paidAt: item.paidAt,
      paidAfterExpiry: item.paidAfterExpiry,
      paymentLinkDescription: item.paymentLinkDescription,
      vendorUserId: item.vendorUserId ?? 0,
    });

    if (result.success) {
      await db
        .update(ghlSyncQueue)
        .set({
          status: "synced",
          ghlContactId: result.contactId,
          ghlNoteId: result.noteId,
          ghlAction: result.action,
          syncedAt: new Date(),
          lastError: null,
        })
        .where(eq(ghlSyncQueue.id, item.id));
    } else {
      // GHL no configurado u otro skip
      await db
        .update(ghlSyncQueue)
        .set({
          status: "skipped",
          lastError: result.reason ?? "Unknown skip reason",
        })
        .where(eq(ghlSyncQueue.id, item.id));
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const newAttempts = (item.attempts ?? 0) + 1;
    const isFinal = newAttempts >= MAX_ATTEMPTS;

    // Calcular próximo reintento con backoff exponencial
    const delayMs = RETRY_DELAYS_MS[Math.min(newAttempts - 1, RETRY_DELAYS_MS.length - 1)];
    const nextRetry = new Date(Date.now() + delayMs);

    console.error(`[GHL] Error en sincronización (intento ${newAttempts}/${MAX_ATTEMPTS}): ${errorMsg}`);

    await db
      .update(ghlSyncQueue)
      .set({
        status: isFinal ? "failed" : "pending",
        attempts: newAttempts,
        lastError: errorMsg,
        nextRetryAt: isFinal ? null : nextRetry,
      })
      .where(eq(ghlSyncQueue.id, item.id));

    if (isFinal) {
      console.error(`[GHL] ⚠️ ALERTA: Sincronización fallida definitivamente para PI ${stripePaymentIntentId} después de ${MAX_ATTEMPTS} intentos`);
    }
  }
}

/**
 * Worker de retry: procesar items pendientes cuyo nextRetryAt ya pasó.
 * Llamar periódicamente (ej: cada 5 minutos desde un job o endpoint).
 */
export async function retryPendingGhlSyncs(): Promise<{ processed: number; failed: number }> {
  if (!isConfigured()) return { processed: 0, failed: 0 };

  const db = await getDb();
  if (!db) return { processed: 0, failed: 0 };
  const now = new Date();

  const pending = await db
    .select()
    .from(ghlSyncQueue)
    .where(
      and(
        eq(ghlSyncQueue.status, "pending"),
        lte(ghlSyncQueue.nextRetryAt, now)
      )
    )
    .limit(20); // Procesar máx 20 por ciclo

  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    if (!item.stripePaymentIntentId) continue;
    try {
      await processGhlSyncItem(item.stripePaymentIntentId);
      processed++;
    } catch {
      failed++;
    }
  }

  if (processed > 0 || failed > 0) {
    console.log(`[GHL] Retry worker: ${processed} procesados, ${failed} fallidos`);
  }

  return { processed, failed };
}

/**
 * Obtener estadísticas de la cola de sincronización.
 * Útil para el panel de administración.
 */
export async function getGhlSyncStats(): Promise<{
  pending: number;
  synced: number;
  failed: number;
  skipped: number;
  isConfigured: boolean;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, synced: 0, failed: 0, skipped: 0, isConfigured: isConfigured() };
  const rows = await db
    .select({ status: ghlSyncQueue.status })
    .from(ghlSyncQueue);

  const counts = { pending: 0, synced: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    if (row.status === "pending" || row.status === "processing") counts.pending++;
    else if (row.status === "synced") counts.synced++;
    else if (row.status === "failed") counts.failed++;
    else if (row.status === "skipped") counts.skipped++;
  }

  return { ...counts, isConfigured: isConfigured() };
}
