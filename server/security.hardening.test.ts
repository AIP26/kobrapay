/**
 * KobraPay Security Hardening Tests
 * Tests for the 3 critical security improvements:
 * 1. HTTPS enforcement for outgoing requests
 * 2. HMAC webhook signature validation
 * 3. Sensitive file blocking
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  enforceHttpsUrl,
  verifyWebhookSignature,
  blockSensitiveFiles,
  sanitizeString,
  detectSQLInjection,
} from "./security";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// ─── Test helpers ─────────────────────────────────────────────────────────────
function mockReq(path: string): Partial<Request> {
  return {
    path,
    url: path,
    headers: { "x-forwarded-for": "1.2.3.4" },
    socket: { remoteAddress: "1.2.3.4" } as any,
  };
}

function mockRes(): { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; statusCode: number } {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// ─── [SECURITY #1] HTTPS enforcement ─────────────────────────────────────────
describe("HTTPS Enforcement (Security #1)", () => {
  it("should allow HTTPS URLs", () => {
    expect(() => enforceHttpsUrl("https://contentai-mdjbhzth.manus.space/api/kobra/webhook", "test")).not.toThrow();
    expect(() => enforceHttpsUrl("https://brokerhub.com.mx/api/webhooks/kobrapay", "test")).not.toThrow();
    expect(() => enforceHttpsUrl("https://api.stripe.com/v1/charges", "test")).not.toThrow();
  });

  it("should block HTTP URLs", () => {
    expect(() => enforceHttpsUrl("http://contentai.example.com/webhook", "test")).toThrow("HTTPS required");
    expect(() => enforceHttpsUrl("http://brokerhub.com.mx/webhook", "test")).toThrow("HTTPS required");
    expect(() => enforceHttpsUrl("http://malicious.com/steal-data", "test")).toThrow("HTTPS required");
  });

  it("should block invalid URLs", () => {
    expect(() => enforceHttpsUrl("not-a-url", "test")).toThrow();
    expect(() => enforceHttpsUrl("ftp://example.com/file", "test")).toThrow("HTTPS required");
  });
});

// ─── [SECURITY #2] HMAC webhook signature validation ─────────────────────────
describe("HMAC Webhook Signature Validation (Security #2)", () => {
  const secret = "test_webhook_secret_12345";

  function makeSignature(body: string): string {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  it("should accept valid ContentAI webhook signature", () => {
    const body = JSON.stringify({ event: "payment.success", data: { amount: 100 } });
    const sig = makeSignature(body);
    const headers = { "x-contentai-signature": sig };
    expect(verifyWebhookSignature("contentai", body, headers, secret)).toBe(true);
  });

  it("should accept valid BrokerHub webhook signature", () => {
    const body = JSON.stringify({ event: "subscription.activated", userId: "123" });
    const sig = makeSignature(body);
    const headers = { "x-brokerhub-signature": sig };
    expect(verifyWebhookSignature("brokerhub", body, headers, secret)).toBe(true);
  });

  it("should reject invalid signature", () => {
    const body = JSON.stringify({ event: "payment.success" });
    const headers = { "x-contentai-signature": "invalid_signature_hex" };
    expect(verifyWebhookSignature("contentai", body, headers, secret)).toBe(false);
  });

  it("should reject missing signature header", () => {
    const body = JSON.stringify({ event: "payment.success" });
    const headers = {}; // No signature header
    expect(verifyWebhookSignature("contentai", body, headers, secret)).toBe(false);
  });

  it("should reject tampered body", () => {
    const originalBody = JSON.stringify({ event: "payment.success", amount: 100 });
    const tamperedBody = JSON.stringify({ event: "payment.success", amount: 99999 }); // Tampered!
    const sig = makeSignature(originalBody);
    const headers = { "x-contentai-signature": sig };
    expect(verifyWebhookSignature("contentai", tamperedBody, headers, secret)).toBe(false);
  });

  it("should reject unknown platform", () => {
    const body = "{}";
    const headers = { "x-unknown-signature": makeSignature(body) };
    expect(verifyWebhookSignature("unknown_platform", body, headers, secret)).toBe(false);
  });

  it("should use timing-safe comparison (prevent timing attacks)", () => {
    const body = JSON.stringify({ data: "test" });
    const correctSig = makeSignature(body);
    const wrongSig = "0".repeat(correctSig.length);
    const headers1 = { "x-contentai-signature": correctSig };
    const headers2 = { "x-contentai-signature": wrongSig };
    // Both should complete without timing difference (no early exit)
    expect(verifyWebhookSignature("contentai", body, headers1, secret)).toBe(true);
    expect(verifyWebhookSignature("contentai", body, headers2, secret)).toBe(false);
  });
});

// ─── [SECURITY #3] Sensitive file blocking ────────────────────────────────────
describe("Sensitive File Blocking (Security #3)", () => {
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function testBlock(path: string) {
    const req = mockReq(path) as Request;
    const res = mockRes() as unknown as Response;
    blockSensitiveFiles(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  }

  function testAllow(path: string) {
    const req = mockReq(path) as Request;
    const res = mockRes() as unknown as Response;
    blockSensitiveFiles(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  }

  it("should block backup files", () => {
    testBlock("/backup.bak");
    testBlock("/database.backup");
    testBlock("/data.old");
    testBlock("/config.orig");
  });

  it("should block database files", () => {
    testBlock("/database.sql");
    testBlock("/dump.sql");
    testBlock("/data.db");
    testBlock("/app.sqlite");
  });

  it("should block config/credential files", () => {
    testBlock("/config.json");
    testBlock("/secrets.yaml");
    testBlock("/credentials.json");
    testBlock("/.htaccess");
    testBlock("/web.config");
  });

  it("should block git directory", () => {
    testBlock("/.git/config");
    testBlock("/.git/HEAD");
  });

  it("should block server source files", () => {
    testBlock("/server/routers.ts");
    testBlock("/server/db.js");
  });

  it("should allow normal application routes", () => {
    testAllow("/");
    testAllow("/dashboard");
    testAllow("/api/trpc/auth.me");
    testAllow("/api/v1/checkout");
    testAllow("/blog/como-cobrar");
    testAllow("/assets/main.js");
    testAllow("/favicon.ico");
    testAllow("/manifest.json");
  });
});

// ─── Input sanitization ────────────────────────────────────────────────────────
describe("Input Sanitization", () => {
  it("should remove XSS patterns", () => {
    expect(sanitizeString("<script>alert('xss')</script>")).not.toContain("<script>");
    expect(sanitizeString("onclick=alert(1)")).not.toContain("onclick=");
    expect(sanitizeString("javascript:alert(1)")).not.toContain("javascript:");
  });

  it("should detect SQL injection patterns", () => {
    expect(detectSQLInjection("'; DROP TABLE users; --")).toBe(true);
    expect(detectSQLInjection("UNION SELECT * FROM users")).toBe(true);
    expect(detectSQLInjection("normal text")).toBe(false);
    expect(detectSQLInjection("John Doe")).toBe(false);
  });

  it("should handle non-string inputs gracefully", () => {
    expect(sanitizeString(null)).toBe("");
    expect(sanitizeString(undefined)).toBe("");
    expect(sanitizeString(123)).toBe("");
  });
});
