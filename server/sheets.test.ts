/**
 * Tests — Fase 2B: Integración Google Sheets via Apps Script Web App
 * Cubre: modo not-configured, enqueue, anti-duplicados, retry, buildRow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock de getDb (Drizzle ORM) ─────────────────────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

// Cadena de Drizzle: db.select().from().where().limit()
const mockLimit  = vi.fn();
const mockWhere  = vi.fn().mockReturnValue({ limit: mockLimit });
const mockFrom   = vi.fn().mockReturnValue({ where: mockWhere });
const mockValues = vi.fn().mockResolvedValue(undefined);
const mockSet    = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

mockSelect.mockReturnValue({ from: mockFrom });
mockInsert.mockReturnValue({ values: mockValues });
mockUpdate.mockReturnValue({ set: mockSet });

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// ─── Mock de fetch (Apps Script Web App) ─────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Payload de prueba ────────────────────────────────────────────────────────
const mockPayload = {
  stripePaymentIntentId: "pi_test_sheets_001",
  eventType: "payment_succeeded" as const,
  payerName: "Ana García",
  payerEmail: "ana@example.com",
  payerPhone: "+52 55 1234 5678",
  amountMxn: "1500.00",
  currency: "MXN",
  paymentMethod: "card",
  cardBrand: "visa",
  cardLast4: "4242",
  paymentStatus: "succeeded",
  paymentLinkToken: "tok_test_abc123",
  errorMessage: null,
  paidAfterExpiry: false,
  vendorUserId: 42,
  paidAt: new Date("2026-04-14T12:00:00Z"),
};

const mockFailedPayload = {
  ...mockPayload,
  stripePaymentIntentId: "pi_test_sheets_002",
  eventType: "payment_failed" as const,
  paymentStatus: "failed",
  cardBrand: null,
  cardLast4: null,
  errorMessage: "Fondos insuficientes en la tarjeta",
  paidAt: null,
};

const mockOxxoExpiredPayload = {
  ...mockPayload,
  stripePaymentIntentId: "pi_test_sheets_003",
  eventType: "payment_succeeded" as const,
  paymentMethod: "oxxo",
  cardBrand: null,
  cardLast4: null,
  paidAfterExpiry: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setEnvConfigured() {
  process.env.GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxMOCK/exec";
}

function clearEnv() {
  delete process.env.GOOGLE_APPS_SCRIPT_URL;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Fase 2B — Google Sheets Integration (Apps Script)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockLimit.mockResolvedValue([]);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockValues.mockResolvedValue(undefined);
    mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockInsert.mockReturnValue({ values: mockValues });
  });

  afterEach(() => {
    clearEnv();
  });

  // ─── Test 1: Modo "not configured" ─────────────────────────────────────────
  describe("Modo NOT CONFIGURED", () => {
    it("syncPaymentToSheets retorna SHEETS_NOT_CONFIGURED cuando falta GOOGLE_APPS_SCRIPT_URL", async () => {
      clearEnv();
      const { syncPaymentToSheets } = await import("./sheetsClient");
      const result = await syncPaymentToSheets(mockPayload);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("SHEETS_NOT_CONFIGURED");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("enqueueSheetSync guarda el evento con status 'skipped' cuando no está configurado", async () => {
      clearEnv();
      // Mock: no existe registro previo
      mockLimit.mockResolvedValue([]);

      const { enqueueSheetSync } = await import("./sheetsClient");
      await enqueueSheetSync(mockPayload);

      // Debe haber llamado a insert con status 'skipped'
      expect(mockInsert).toHaveBeenCalled();
      const insertValuesCall = mockValues.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(insertValuesCall?.status).toBe("skipped");
      // No debe llamar a fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ─── Test 2: Anti-duplicados en la cola ────────────────────────────────────
  describe("Anti-duplicados en cola", () => {
    it("enqueueSheetSync ignora si el PI + eventType ya está en la cola con status 'synced'", async () => {
      clearEnv();
      // Mock: ya existe un registro sincronizado
      mockLimit.mockResolvedValue([{ id: 1, status: "synced" }]);

      const { enqueueSheetSync } = await import("./sheetsClient");
      await enqueueSheetSync(mockPayload);

      // No debe hacer INSERT
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("enqueueSheetSync permite el mismo PI con diferente eventType", async () => {
      clearEnv();
      // Mock: no existe registro para este eventType
      mockLimit.mockResolvedValue([]);

      const processingPayload = { ...mockPayload, eventType: "payment_processing" as const };
      const { enqueueSheetSync } = await import("./sheetsClient");
      await enqueueSheetSync(processingPayload);

      // Debe hacer INSERT
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  // ─── Test 3: Escenario pago exitoso ────────────────────────────────────────
  describe("Escenario: Pago exitoso (tarjeta)", () => {
    it("syncPaymentToSheets agrega nueva fila cuando Apps Script responde con action='appended'", async () => {
      setEnvConfigured();

      mockFetch.mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ success: true, action: "appended", row: 5 }),
      });

      const { syncPaymentToSheets } = await import("./sheetsClient");
      const result = await syncPaymentToSheets(mockPayload);

      expect(result.success).toBe(true);
      expect(result.action).toBe("appended");
      expect(result.rowIndex).toBe(5);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verificar que el payload enviado contiene los campos correctos
      const fetchCall = mockFetch.mock.calls[0];
      const sentBody  = JSON.parse(fetchCall[1].body as string);
      expect(sentBody.cliente).toBe("Ana García");
      expect(sentBody.email).toBe("ana@example.com");
      expect(sentBody.monto).toBe(1500);
      expect(sentBody.metodoPago).toBe("Visa ****4242");
      expect(sentBody.status).toBe("✅ Exitoso");
      expect(sentBody.pagoTardio).toBe("No");
    });

    it("syncPaymentToSheets actualiza fila existente cuando Apps Script responde con action='updated'", async () => {
      setEnvConfigured();

      mockFetch.mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ success: true, action: "updated", row: 3 }),
      });

      const { syncPaymentToSheets } = await import("./sheetsClient");
      const result = await syncPaymentToSheets(mockPayload);

      expect(result.success).toBe(true);
      expect(result.action).toBe("updated");
      expect(result.rowIndex).toBe(3);
    });
  });

  // ─── Test 4: Escenario pago fallido ────────────────────────────────────────
  describe("Escenario: Pago fallido", () => {
    it("registra el error en el payload enviado al Sheet", async () => {
      setEnvConfigured();

      mockFetch.mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ success: true, action: "appended", row: 6 }),
      });

      const { syncPaymentToSheets } = await import("./sheetsClient");
      await syncPaymentToSheets(mockFailedPayload);

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(sentBody.status).toBe("❌ Fallido");
      expect(sentBody.error).toBe("Fondos insuficientes en la tarjeta");
      expect(sentBody.tipoEvento).toBe("payment_failed");
    });
  });

  // ─── Test 5: OXXO pagado después de expiración ─────────────────────────────
  describe("Escenario: OXXO pagado después de expiración", () => {
    it("registra paidAfterExpiry=true como 'Sí' en el payload", async () => {
      setEnvConfigured();

      mockFetch.mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ success: true, action: "appended", row: 7 }),
      });

      const { syncPaymentToSheets } = await import("./sheetsClient");
      await syncPaymentToSheets(mockOxxoExpiredPayload);

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(sentBody.pagoTardio).toBe("Sí");
      expect(sentBody.metodoPago).toBe("OXXO");
    });
  });

  // ─── Test 6: Retry ante fallo de Apps Script ───────────────────────────────
  describe("Retry ante fallo de Apps Script", () => {
    it("reintenta hasta MAX_RETRIES y retorna error si siempre falla", async () => {
      setEnvConfigured();

      // Simular 3 fallos consecutivos
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      const { syncPaymentToSheets } = await import("./sheetsClient");
      const result = await syncPaymentToSheets(mockPayload);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("MAX_RETRIES_EXCEEDED");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("tiene éxito en el segundo intento si el primero falla", async () => {
      setEnvConfigured();

      mockFetch
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce({
          ok:   true,
          json: async () => ({ success: true, action: "appended", row: 4 }),
        });

      const { syncPaymentToSheets } = await import("./sheetsClient");
      const result = await syncPaymentToSheets(mockPayload);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Test 7: Estadísticas de cola ─────────────────────────────────────────
  describe("Estadísticas de cola", () => {
    it("getSheetsSyncStats retorna conteos correctos por status", async () => {
      // Mock: 45 synced, 3 pending, 1 failed, 0 skipped
      const fakeRows = [
        ...Array(45).fill({ status: "synced" }),
        ...Array(3).fill({ status: "pending" }),
        ...Array(1).fill({ status: "failed" }),
      ];
      mockFrom.mockReturnValue({ where: mockWhere });
      // Para getSheetsSyncStats no hay .where(), solo .from()
      mockSelect.mockReturnValue({ from: vi.fn().mockResolvedValue(fakeRows) });

      const { getSheetsSyncStats } = await import("./sheetsClient");
      const stats = await getSheetsSyncStats();

      expect(stats.synced).toBe(45);
      expect(stats.pending).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.skipped).toBe(0);
      expect(stats.total).toBe(49);
    });
  });

  // ─── Test 8: Formato del payload ──────────────────────────────────────────
  describe("Formato del payload enviado a Apps Script", () => {
    it("incluye _meta con source=kobrapay y version=2.0", async () => {
      setEnvConfigured();

      mockFetch.mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ success: true, action: "appended", row: 8 }),
      });

      const { syncPaymentToSheets } = await import("./sheetsClient");
      await syncPaymentToSheets(mockPayload);

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(sentBody._meta.source).toBe("kobrapay");
      expect(sentBody._meta.version).toBe("2.0");
      expect(sentBody._meta.sentAt).toBeDefined();
    });

    it("formatea SPEI como 'SPEI / Transferencia'", async () => {
      setEnvConfigured();

      mockFetch.mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ success: true, action: "appended", row: 9 }),
      });

      const speiPayload = { ...mockPayload, paymentMethod: "spei", cardBrand: null, cardLast4: null };
      const { syncPaymentToSheets } = await import("./sheetsClient");
      await syncPaymentToSheets(speiPayload);

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(sentBody.metodoPago).toBe("SPEI / Transferencia");
    });

    it("incluye header X-KobraPay-Source en el request", async () => {
      setEnvConfigured();

      mockFetch.mockResolvedValueOnce({
        ok:   true,
        json: async () => ({ success: true, action: "appended", row: 10 }),
      });

      const { syncPaymentToSheets } = await import("./sheetsClient");
      await syncPaymentToSheets(mockPayload);

      const fetchOptions = mockFetch.mock.calls[0][1];
      expect(fetchOptions.headers["X-KobraPay-Source"]).toBe("webhook");
    });
  });
});
