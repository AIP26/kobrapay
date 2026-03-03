/**
 * Security Router — only accessible by superadmin (platform owner)
 * Provides: audit logs, login attempts, tenant management, system stats
 */
import { z } from "zod";
import { router, superAdminProcedure, protectedProcedure, isSuperAdmin } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, paymentLinks, transactions, platformClients, auditLogs } from "../../drizzle/schema";
import { desc, eq, count, sql, gte, and } from "drizzle-orm";
import { getAuditLog } from "../security";

export const securityRouter = router({
  /**
   * Get audit log from DB — superadmin only
   */
  getAuditLogs: superAdminProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      severity: z.enum(['info', 'warning', 'critical', 'all']).default('all'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return getAuditLog(input.limit);
      try {
        const query = db.select().from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(input.limit);
        if (input.severity !== 'all') {
          return db.select().from(auditLogs)
            .where(eq(auditLogs.severity, input.severity as any))
            .orderBy(desc(auditLogs.createdAt))
            .limit(input.limit);
        }
        return query;
      } catch {
        return getAuditLog(input.limit);
      }
    }),

  /**
   * Get security stats (last 24h) — superadmin only
   */
  getSecurityStats: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, warnings: 0, critical: 0, blockedIps: 0, topIps: [] };
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [total] = await db.select({ count: count() }).from(auditLogs).where(gte(auditLogs.createdAt, since24h));
      const [warnings] = await db.select({ count: count() }).from(auditLogs).where(and(eq(auditLogs.severity, 'warning'), gte(auditLogs.createdAt, since24h)));
      const [critical] = await db.select({ count: count() }).from(auditLogs).where(and(eq(auditLogs.severity, 'critical'), gte(auditLogs.createdAt, since24h)));
      const topIps = await db.select({
        ip: auditLogs.ipAddress,
        count: count(),
      }).from(auditLogs)
        .where(gte(auditLogs.createdAt, since24h))
        .groupBy(auditLogs.ipAddress)
        .orderBy(desc(count()))
        .limit(10);
      return {
        total: total.count,
        warnings: warnings.count,
        critical: critical.count,
        blockedIps: topIps.filter(r => r.count > 50).length,
        topIps,
      };
    } catch {
      return { total: 0, warnings: 0, critical: 0, blockedIps: 0, topIps: [] };
    }
  }),

  /**
   * Get platform-wide stats — superadmin only
   */
  getPlatformStats: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalUsers: 0, totalLinks: 0, totalTransactions: 0, totalClients: 0, totalRevenue: 0 };

    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalLinks] = await db.select({ count: count() }).from(paymentLinks);
    const [totalTxns] = await db.select({ count: count() }).from(transactions);
    const [totalClients] = await db.select({ count: count() }).from(platformClients);

    const succeededTxns = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(12,2))), 0)` })
      .from(transactions)
      .where(eq(transactions.status, "succeeded"));

    return {
      totalUsers: totalUsers.count,
      totalLinks: totalLinks.count,
      totalTransactions: totalTxns.count,
      totalClients: totalClients.count,
      totalRevenue: Number(succeededTxns[0]?.total ?? 0),
    };
  }),

  /**
   * List all users on the platform — superadmin only
   */
  getAllUsers: superAdminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.limit);
    }),

  /**
   * Suspend or activate a user — superadmin only
   */
  setUserActive: superAdminProcedure
    .input(z.object({ userId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes suspender tu propia cuenta." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      await db
        .update(users)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  /**
   * Change user role — superadmin only
   */
  setUserRole: superAdminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "superadmin"]) }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes cambiar tu propio rol." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      await db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  /**
   * Check if current user is superadmin (used by frontend to show/hide sections)
   */
  checkSuperAdmin: protectedProcedure.query(({ ctx }) => {
    return { isSuperAdmin: isSuperAdmin(ctx.user.openId, ctx.user.role) };
  }),
});
