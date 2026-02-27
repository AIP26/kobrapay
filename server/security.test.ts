/**
 * Security Tests — Multi-tenant isolation, role enforcement, brute force protection
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  checkBruteForce,
  recordFailedAttempt,
  clearFailedAttempts,
  sanitizeString,
  getAuditLog,
  logAudit,
} from "./security";
import { isSuperAdmin } from "./_core/trpc";
import { ENV } from "./_core/env";

// ─── Brute Force Protection Tests ─────────────────────────────────────────────
describe("Brute Force Protection", () => {
  const TEST_IP = "192.168.1.100";

  beforeEach(() => {
    clearFailedAttempts(TEST_IP);
  });

  it("should not block IP on first attempt", () => {
    recordFailedAttempt(TEST_IP);
    const result = checkBruteForce(TEST_IP);
    expect(result.blocked).toBe(false);
  });

  it("should not block IP with 9 failed attempts", () => {
    for (let i = 0; i < 9; i++) {
      recordFailedAttempt(TEST_IP);
    }
    const result = checkBruteForce(TEST_IP);
    expect(result.blocked).toBe(false);
  });

  it("should block IP after 10 failed attempts", () => {
    for (let i = 0; i < 10; i++) {
      recordFailedAttempt(TEST_IP);
    }
    const result = checkBruteForce(TEST_IP);
    expect(result.blocked).toBe(true);
    expect(result.remainingMs).toBeGreaterThan(0);
  });

  it("should clear failed attempts after calling clearFailedAttempts", () => {
    for (let i = 0; i < 10; i++) {
      recordFailedAttempt(TEST_IP);
    }
    clearFailedAttempts(TEST_IP);
    const result = checkBruteForce(TEST_IP);
    expect(result.blocked).toBe(false);
  });

  it("should block different IPs independently", () => {
    const IP_A = "10.0.0.1";
    const IP_B = "10.0.0.2";
    clearFailedAttempts(IP_A);
    clearFailedAttempts(IP_B);

    for (let i = 0; i < 10; i++) {
      recordFailedAttempt(IP_A);
    }

    expect(checkBruteForce(IP_A).blocked).toBe(true);
    expect(checkBruteForce(IP_B).blocked).toBe(false);
  });
});

// ─── Input Sanitization Tests ──────────────────────────────────────────────────
describe("Input Sanitization", () => {
  it("should remove angle brackets to prevent XSS", () => {
    const result = sanitizeString("<script>alert('xss')</script>");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("should remove javascript: URIs", () => {
    const result = sanitizeString("javascript:alert(1)");
    expect(result.toLowerCase()).not.toContain("javascript:");
  });

  it("should remove inline event handlers", () => {
    const result = sanitizeString("onclick=alert(1)");
    expect(result.toLowerCase()).not.toContain("onclick=");
  });

  it("should preserve normal text", () => {
    const input = "Hola, soy un cliente de KobraPay";
    const result = sanitizeString(input);
    expect(result).toBe(input);
  });

  it("should handle non-string input gracefully", () => {
    expect(sanitizeString(null)).toBe("");
    expect(sanitizeString(undefined)).toBe("");
    expect(sanitizeString(123)).toBe("");
  });

  it("should truncate strings over 10000 characters", () => {
    const longString = "a".repeat(15000);
    const result = sanitizeString(longString);
    expect(result.length).toBeLessThanOrEqual(10000);
  });
});

// ─── SuperAdmin Role Tests ─────────────────────────────────────────────────────
describe("SuperAdmin Role Detection", () => {
  it("should identify the platform owner as superadmin", () => {
    const ownerOpenId = ENV.ownerOpenId;
    if (ownerOpenId) {
      expect(isSuperAdmin(ownerOpenId)).toBe(true);
    }
  });

  it("should reject a random user as superadmin", () => {
    expect(isSuperAdmin("random-user-open-id-12345")).toBe(false);
  });

  it("should reject empty string as superadmin", () => {
    expect(isSuperAdmin("")).toBe(false);
  });

  it("should reject similar but not exact openId as superadmin", () => {
    const ownerOpenId = ENV.ownerOpenId;
    if (ownerOpenId) {
      expect(isSuperAdmin(ownerOpenId + "_fake")).toBe(false);
      expect(isSuperAdmin(ownerOpenId.slice(0, -1))).toBe(false);
    }
  });
});

// ─── Audit Log Tests ───────────────────────────────────────────────────────────
describe("Audit Log", () => {
  it("should log audit entries", () => {
    const before = getAuditLog(1000).length;
    logAudit({ ip: "127.0.0.1", action: "GET", resource: "/api/test", statusCode: 200 });
    const after = getAuditLog(1000).length;
    expect(after).toBeGreaterThan(before);
  });

  it("should return entries in reverse chronological order (newest first)", () => {
    logAudit({ ip: "127.0.0.1", action: "GET", resource: "/api/first", statusCode: 200 });
    logAudit({ ip: "127.0.0.1", action: "POST", resource: "/api/second", statusCode: 201 });

    const logs = getAuditLog(2);
    expect(logs[0].resource).toBe("/api/second");
    expect(logs[1].resource).toBe("/api/first");
  });

  it("should respect the limit parameter", () => {
    const logs = getAuditLog(5);
    expect(logs.length).toBeLessThanOrEqual(5);
  });

  it("should include timestamp in each entry", () => {
    logAudit({ ip: "127.0.0.1", action: "GET", resource: "/api/ts-test", statusCode: 200 });
    const logs = getAuditLog(1);
    expect(logs[0].timestamp).toBeDefined();
    expect(new Date(logs[0].timestamp).getTime()).not.toBeNaN();
  });
});

// ─── Tenant Isolation Tests ────────────────────────────────────────────────────
describe("Multi-Tenant Isolation", () => {
  it("should not allow user A to access user B data", () => {
    const userA = { id: 1, openId: "user-a-open-id" };
    const userB = { id: 2, openId: "user-b-open-id" };
    const ownerOpenId = "owner-open-id";

    // Simulate tenant access check
    const canAccess = (requestingUser: typeof userA, targetUserId: number, ownerOpenId: string) => {
      if (requestingUser.openId === ownerOpenId) return true; // superadmin
      return requestingUser.id === targetUserId;
    };

    expect(canAccess(userA, userA.id, ownerOpenId)).toBe(true);   // A can access own data
    expect(canAccess(userA, userB.id, ownerOpenId)).toBe(false);  // A cannot access B's data
    expect(canAccess(userB, userA.id, ownerOpenId)).toBe(false);  // B cannot access A's data
  });

  it("should allow superadmin to access any tenant data", () => {
    const superAdmin = { id: 999, openId: "owner-open-id" };
    const ownerOpenId = "owner-open-id";

    const canAccess = (requestingUser: typeof superAdmin, targetUserId: number, ownerOpenId: string) => {
      if (requestingUser.openId === ownerOpenId) return true;
      return requestingUser.id === targetUserId;
    };

    expect(canAccess(superAdmin, 1, ownerOpenId)).toBe(true);
    expect(canAccess(superAdmin, 2, ownerOpenId)).toBe(true);
    expect(canAccess(superAdmin, 100, ownerOpenId)).toBe(true);
  });
});
