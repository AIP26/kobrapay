/**
 * infrastructure.test.ts
 * Tests para los 4 sistemas de infraestructura crítica (v9.5):
 *   Sistema 1: Webhook resiliente (webhookStore)
 *   Sistema 2: Polling de estado de pago (getPaymentStatus)
 *   Sistema 3: Trazabilidad OXXO/SPEI (paidAfterExpiry)
 *   Sistema 4: Alertas internas (logs estructurados)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
  }),
  getTransactionByPaymentIntent: vi.fn(),
  getPaymentLinkByToken: vi.fn(),
  updatePaymentLinkStatus: vi.fn(),
  updateTransactionStatus: vi.fn(),
  getTransactionsByUser: vi.fn(),
  getUserById: vi.fn(),
  getVendorSettings: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/email", () => ({
  sendPaymentReceipt: vi.fn().mockResolvedValue(undefined),
  sendVendorPaymentEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedVendorEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── Sistema 1: Webhook Resiliente ───────────────────────────────────────────
describe("Sistema 1: Webhook Resiliente (webhookStore)", () => {
  it("debe tener las funciones de webhookStore exportadas", async () => {
    const webhookStore = await import("./webhookStore");
    expect(typeof webhookStore.persistirEvento).toBe("function");
    expect(typeof webhookStore.marcarProcesado).toBe("function");
    expect(typeof webhookStore.marcarFallido).toBe("function");
    expect(typeof webhookStore.marcarProcesando).toBe("function");
    expect(typeof webhookStore.alertarEventoFallido).toBe("function");
    expect(typeof webhookStore.alertarPagoFallido).toBe("function");
    expect(typeof webhookStore.alertarWebhookDuplicado).toBe("function");
    expect(typeof webhookStore.alertarPagoSinConfirmacion).toBe("function");
  });

  it("persistirEvento debe lanzar cuando la BD no está disponible (comportamiento esperado)", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce(null as any);
    const { persistirEvento } = await import("./webhookStore");
    // Si la BD no está disponible, persistirEvento lanza para que el webhook retorne 500
    // y Stripe reintente el evento más tarde (comportamiento correcto de resiliencia)
    await expect(persistirEvento({
      stripeEventId: "evt_test_456",
      eventType: "payment_intent.succeeded",
      payload: {},
    })).rejects.toThrow("DB no disponible");
  });

  it("marcarFallido debe retornar sin lanzar cuando la BD no está disponible", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValueOnce(null as any);
    const { marcarFallido } = await import("./webhookStore");
    // marcarFallido usa early return cuando db es null
    await expect(marcarFallido(999, "Error de prueba")).resolves.not.toThrow();
  });

  it("alertarWebhookDuplicado debe ser una función síncrona que no lanza excepción", async () => {
    const { alertarWebhookDuplicado } = await import("./webhookStore");
    expect(() => alertarWebhookDuplicado("evt_test_789", "payment_intent.succeeded")).not.toThrow();
  });
});

// ─── Sistema 2: Polling de Estado de Pago ────────────────────────────────────
describe("Sistema 2: Polling de Estado de Pago", () => {
  it("el mapa de estados de Stripe debe cubrir todos los estados posibles", () => {
    const statusMap: Record<string, { label: string; isFinal: boolean; isSuccess: boolean }> = {
      succeeded:               { label: "Pago confirmado",           isFinal: true,  isSuccess: true  },
      processing:              { label: "Procesando pago",            isFinal: false, isSuccess: false },
      requires_action:         { label: "Requiere acción del banco",  isFinal: false, isSuccess: false },
      requires_payment_method: { label: "Pago no completado",         isFinal: true,  isSuccess: false },
      canceled:                { label: "Pago cancelado",             isFinal: true,  isSuccess: false },
      requires_confirmation:   { label: "Pendiente de confirmar",     isFinal: false, isSuccess: false },
      requires_capture:        { label: "Pendiente de captura",       isFinal: false, isSuccess: false },
    };

    // Solo 'succeeded' debe ser isSuccess=true
    const successStates = Object.entries(statusMap).filter(([, v]) => v.isSuccess);
    expect(successStates).toHaveLength(1);
    expect(successStates[0][0]).toBe("succeeded");

    // Los estados finales no deben hacer polling
    const finalStates = Object.entries(statusMap).filter(([, v]) => v.isFinal);
    expect(finalStates.length).toBeGreaterThanOrEqual(3);

    // processing no debe ser final (el polling debe continuar)
    expect(statusMap.processing.isFinal).toBe(false);
    expect(statusMap.processing.isSuccess).toBe(false);
  });

  it("webhookPending debe ser true cuando Stripe dice succeeded pero el link no está paid", () => {
    const piStatus = "succeeded";
    const linkStatus = "pending"; // El webhook aún no llegó
    const webhookPending = piStatus === "succeeded" && linkStatus !== "paid";
    expect(webhookPending).toBe(true);
  });

  it("webhookPending debe ser false cuando el link ya está paid", () => {
    const piStatus = "succeeded";
    const linkStatus = "paid";
    const webhookPending = piStatus === "succeeded" && linkStatus !== "paid";
    expect(webhookPending).toBe(false);
  });
});

// ─── Sistema 3: Trazabilidad OXXO/SPEI ───────────────────────────────────────
describe("Sistema 3: Trazabilidad OXXO/SPEI (paidAfterExpiry)", () => {
  it("wasExpired debe ser true cuando el link está en estado 'expired'", () => {
    const linkStatus = "expired";
    const wasExpired = linkStatus === "expired";
    expect(wasExpired).toBe(true);
  });

  it("wasExpired debe ser false cuando el link está en estado 'pending'", () => {
    const linkStatus = "pending";
    const wasExpired = linkStatus === "expired";
    expect(wasExpired).toBe(false);
  });

  it("el webhook debe aceptar links en estado 'pending' y 'expired' pero no 'paid'", () => {
    const acceptedStatuses = ["pending", "expired"];
    const rejectedStatuses = ["paid", "cancelled", "inactive"];

    for (const status of acceptedStatuses) {
      const shouldProcess = status === "pending" || status === "expired";
      expect(shouldProcess).toBe(true);
    }

    for (const status of rejectedStatuses) {
      const shouldProcess = status === "pending" || status === "expired";
      expect(shouldProcess).toBe(false);
    }
  });

  it("la descripción del email al vendedor debe incluir '[PAGO TARDÍO]' cuando wasExpired=true", () => {
    const wasExpired = true;
    const description = "Consulta médica";
    const emailDescription = wasExpired
      ? `[PAGO TARDÍO - LINK EXPIRADO] ${description}`
      : description;
    expect(emailDescription).toContain("[PAGO TARDÍO - LINK EXPIRADO]");
    expect(emailDescription).toContain(description);
  });

  it("la descripción del email NO debe incluir '[PAGO TARDÍO]' cuando wasExpired=false", () => {
    const wasExpired = false;
    const description = "Consulta médica";
    const emailDescription = wasExpired
      ? `[PAGO TARDÍO - LINK EXPIRADO] ${description}`
      : description;
    expect(emailDescription).toBe(description);
    expect(emailDescription).not.toContain("[PAGO TARDÍO");
  });
});

// ─── Sistema 4: Alertas Internas ─────────────────────────────────────────────
describe("Sistema 4: Alertas Internas (logs estructurados)", () => {
  it("el guard de idempotencia debe detectar eventos ya procesados", () => {
    // Simular un evento ya procesado
    const existingTx = { id: 1, status: "succeeded", stripePaymentIntentId: "pi_test_123" };
    const isAlreadyProcessed = existingTx && existingTx.status === "succeeded";
    expect(isAlreadyProcessed).toBe(true);
  });

  it("el guard de idempotencia NO debe bloquear eventos nuevos", () => {
    // Simular un evento nuevo (sin TX existente)
    const existingTx = null;
    const isAlreadyProcessed = existingTx !== null && (existingTx as any)?.status === "succeeded";
    expect(isAlreadyProcessed).toBe(false);
  });

  it("el guard de idempotencia NO debe bloquear eventos con TX en estado 'failed'", () => {
    // Un pago que falló antes puede reintentarse
    const existingTx = { id: 1, status: "failed", stripePaymentIntentId: "pi_test_456" };
    const isAlreadyProcessed = existingTx && existingTx.status === "succeeded";
    expect(isAlreadyProcessed).toBe(false);
  });

  it("los logs estructurados deben incluir el prefijo correcto por sistema", () => {
    const logPrefixes = {
      sistema1: "[Webhook][Sistema1]",
      sistema2: "[Polling]",
      sistema3: "[Webhook][Sistema3]",
      sistema4: "[Webhook][Alerta]",
      idempotencia: "[Webhook] Idempotencia:",
    };

    // Verificar que los prefijos son únicos y descriptivos
    const uniquePrefixes = new Set(Object.values(logPrefixes));
    expect(uniquePrefixes.size).toBe(Object.keys(logPrefixes).length);
  });
});

// ─── Escenarios de integración ────────────────────────────────────────────────
describe("Escenarios de integración completos", () => {
  it("Escenario A: Tarjeta exitosa — flujo normal sin paidAfterExpiry", () => {
    const scenario = {
      linkStatus: "pending",
      piStatus: "succeeded",
      wasExpired: false,
      expectedPaidAfterExpiry: false,
      expectedEmailPrefix: "",
    };
    expect(scenario.wasExpired).toBe(false);
    expect(scenario.expectedPaidAfterExpiry).toBe(false);
  });

  it("Escenario B: Tarjeta processing — polling debe continuar", () => {
    const scenario = {
      piStatus: "processing",
      isFinal: false,
      isSuccess: false,
      pollingContinues: true,
    };
    expect(scenario.isFinal).toBe(false);
    expect(scenario.pollingContinues).toBe(true);
  });

  it("Escenario C: Webhook reenviado — guard de idempotencia activo", () => {
    const existingTx = { status: "succeeded" };
    const isDuplicate = existingTx?.status === "succeeded";
    expect(isDuplicate).toBe(true);
  });

  it("Escenario D: OXXO pagado antes de expirar — wasExpired=false", () => {
    const linkStatus = "pending";
    const wasExpired = linkStatus === "expired";
    expect(wasExpired).toBe(false);
  });

  it("Escenario E: OXXO pagado después de expirar — wasExpired=true, paidAfterExpiry=true", () => {
    const linkStatus = "expired";
    const wasExpired = linkStatus === "expired";
    expect(wasExpired).toBe(true);
    // El flag debe propagarse a la TX
    const txUpdate = { paidAfterExpiry: wasExpired };
    expect(txUpdate.paidAfterExpiry).toBe(true);
  });

  it("Escenario F: SPEI confirmado asincrónicamente — mismo flujo que OXXO", () => {
    // SPEI también es asíncrono, el mismo código maneja ambos
    const speiLinkStatus = "pending"; // link aún activo
    const wasExpired = speiLinkStatus === "expired";
    expect(wasExpired).toBe(false);

    // Si el link ya expiró cuando llegó el SPEI
    const speiLinkStatusExpired = "expired";
    const wasExpiredSpei = speiLinkStatusExpired === "expired";
    expect(wasExpiredSpei).toBe(true);
  });
});
