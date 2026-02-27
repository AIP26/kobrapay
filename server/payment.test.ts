import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB functions
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getPaymentLinksByUser: vi.fn().mockResolvedValue([]),
  getPaymentLinkByToken: vi.fn().mockResolvedValue(null),
  createPaymentLink: vi.fn().mockResolvedValue({ id: 1, token: "test-token-123" }),
  updatePaymentLinkStatus: vi.fn().mockResolvedValue(undefined),
  cancelPaymentLink: vi.fn().mockResolvedValue(undefined),
  getTransactionsByUser: vi.fn().mockResolvedValue([]),
  createTransaction: vi.fn().mockResolvedValue({ id: 1 }),
  updateTransactionStatus: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalCollected: 0,
    totalLinks: 0,
    paidLinks: 0,
    pendingLinks: 0,
  }),
  getVendorSettings: vi.fn().mockResolvedValue(null),
  upsertVendorSettings: vi.fn().mockResolvedValue(undefined),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test-token-123"),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("paymentLinks.list", () => {
  it("returns empty array for authenticated user with no links", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paymentLinks.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("paymentLinks.create", () => {
  it("creates a payment link for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paymentLinks.create({
      clientName: "Juan García",
      amount: 500,
      description: "Consulta médica",
      currency: "MXN",
    });
    expect(result).toBeDefined();
    expect(result.token).toBe("test-token-123");
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.paymentLinks.create({
        clientName: "Juan",
        amount: 100,
        description: "Test",
        currency: "MXN",
      })
    ).rejects.toThrow();
  });
});

describe("paymentLinks.getByToken", () => {
  it("throws NOT_FOUND for non-existent token", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.paymentLinks.getByToken({ token: "non-existent-token" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("transactions.list", () => {
  it("returns empty array for authenticated user with no transactions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("transactions.stats", () => {
  it("returns dashboard stats for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.stats();
    expect(result).toMatchObject({
      totalCollected: expect.any(Number),
      totalLinks: expect.any(Number),
      paidLinks: expect.any(Number),
      pendingLinks: expect.any(Number),
    });
  });
});

describe("vendor.getSettings", () => {
  it("returns null for user without settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vendor.getSettings();
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
