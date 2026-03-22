/**
 * Security Router — only accessible by superadmin (platform owner)
 * Provides: audit logs, login attempts, tenant management, system stats
 */
import { z } from "zod";
import { router, superAdminProcedure, protectedProcedure, isSuperAdmin } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, paymentLinks, transactions, platformClients, auditLogs, ipAllowlist, securityAlerts } from "../../drizzle/schema";
import { desc, eq, count, sql, gte, and } from "drizzle-orm";
import { getAuditLog } from "../security";
import {
  getRecentAlerts,
  getUnreadAlertCount,
  markAlertsRead,
  addIpToAllowlist,
  removeIpFromAllowlist,
  getIpAllowlist,
  getBlockedIps,
  unblockIp,
  getAllSecurityConfig,
  updateSecurityParam,
} from "../securityAlerts";
import { getClientIp } from "../security";

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

  // ─── IP Allowlist ──────────────────────────────────────────────────────────
  /**
   * Obtener la lista de IPs autorizadas para el usuario actual
   */
  getIpAllowlist: protectedProcedure.query(async ({ ctx }) => {
    return getIpAllowlist(ctx.user.id);
  }),

  /**
   * Agregar una IP a la allowlist
   */
  addIpToAllowlist: protectedProcedure
    .input(z.object({
      ipCidr: z.string().min(7).max(50),
      label: z.string().max(100).optional(),
      apiKeyId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validar formato IP o CIDR básico
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      if (!ipRegex.test(input.ipCidr)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de IP inválido. Usa IPv4 (ej: 203.0.113.5) o CIDR (ej: 203.0.113.0/24)" });
      }
      await addIpToAllowlist({
        userId: ctx.user.id,
        apiKeyId: input.apiKeyId,
        ipCidr: input.ipCidr,
        label: input.label,
      });
      return { success: true };
    }),

  /**
   * Eliminar (desactivar) una IP de la allowlist
   */
  removeIpFromAllowlist: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await removeIpFromAllowlist(input.id, ctx.user.id);
      return { success: true };
    }),

  // ─── Security Alerts ───────────────────────────────────────────────────────
  /**
   * Obtener alertas de seguridad recientes — superadmin only
   */
  getSecurityAlerts: superAdminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return getRecentAlerts(input.limit);
    }),

  /**
   * Contar alertas no leídas — superadmin only
   */
  getUnreadAlertCount: superAdminProcedure.query(async () => {
    return { count: await getUnreadAlertCount() };
  }),

  /**
   * Marcar alertas como leídas — superadmin only
   */
  markAlertsRead: superAdminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await markAlertsRead(input.ids);
      return { success: true };
    }),

  /**
   * Analiza transacciones recientes y detecta patrones de fraude/riesgo
   */
  getFraudAlerts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { alerts: [], riskScore: 0, riskLevel: 'low' as const, analyzedTransactions: 0, generatedAt: new Date() };

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTxs = await db.select()
      .from(transactions)
      .innerJoin(paymentLinks, eq(transactions.paymentLinkId, paymentLinks.id))
      .where(and(eq(paymentLinks.userId, ctx.user.id), gte(transactions.createdAt, since)))
      .orderBy(desc(transactions.createdAt))
      .limit(100);

    const alerts: Array<{ type: string; severity: 'high' | 'medium' | 'low'; message: string; count?: number }> = [];
    let riskScore = 0;

    // 1. Detectar múltiples intentos fallidos (posible carding)
    const failedTxs = recentTxs.filter(r => r.transactions.status === 'failed');
    if (failedTxs.length >= 5) {
      alerts.push({ type: 'carding', severity: 'high', message: `${failedTxs.length} pagos fallidos en los últimos 7 días. Posible intento de carding.`, count: failedTxs.length });
      riskScore += 40;
    } else if (failedTxs.length >= 3) {
      alerts.push({ type: 'failed_payments', severity: 'medium', message: `${failedTxs.length} pagos fallidos en los últimos 7 días.`, count: failedTxs.length });
      riskScore += 20;
    }

    // 2. Detectar mismo email con múltiples pagos en 24h
    const emailCounts: Record<string, number> = {};
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    recentTxs.filter(r => r.transactions.createdAt >= last24h && r.transactions.status === 'succeeded').forEach(r => {
      const email = r.transactions.payerEmail || 'unknown';
      emailCounts[email] = (emailCounts[email] || 0) + 1;
    });
    const suspiciousEmails = Object.entries(emailCounts).filter(([, cnt]) => cnt >= 3);
    if (suspiciousEmails.length > 0) {
      alerts.push({ type: 'repeated_payer', severity: 'medium', message: `${suspiciousEmails.length} correo(s) realizaron 3+ pagos en 24h. Verifica duplicados.`, count: suspiciousEmails.length });
      riskScore += 25;
    }

    // 3. Detectar montos inusualmente altos (outliers)
    const succeededAmounts = recentTxs
      .filter(r => r.transactions.status === 'succeeded')
      .map(r => parseFloat(String(r.payment_links.amount)));
    if (succeededAmounts.length >= 5) {
      const avg = succeededAmounts.reduce((a, b) => a + b, 0) / succeededAmounts.length;
      const outliers = succeededAmounts.filter(a => a > avg * 5);
      if (outliers.length > 0) {
        alerts.push({ type: 'high_amount', severity: 'low', message: `${outliers.length} transacción(es) con monto inusualmente alto (>5x promedio).`, count: outliers.length });
        riskScore += 10;
      }
    }

    return {
      alerts,
      riskScore: Math.min(riskScore, 100),
      riskLevel: (riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      analyzedTransactions: recentTxs.length,
      generatedAt: new Date(),
    };
  }),

  // ─── IPs Bloqueadas ────────────────────────────────────────────────────────────────────
  /**
   * Obtener lista de IPs bloqueadas — superadmin only
   */
  getBlockedIps: superAdminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }))
    .query(async ({ input }) => {
      return getBlockedIps(input.limit);
    }),

  /**
   * Desbloquear una IP manualmente — superadmin only
   */
  unblockIp: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await unblockIp(input.id, ctx.user.id);
      return { success: true };
    }),

  // ─── Configuración Dinámica de Seguridad ────────────────────────────────────────────────────
  /**
   * Obtener todos los parámetros de seguridad configurables — superadmin only
   */
  getSecurityConfig: superAdminProcedure.query(async () => {
    return getAllSecurityConfig();
  }),

  /**
   * Actualizar un parámetro de seguridad — superadmin only
   */
  updateSecurityConfig: superAdminProcedure
    .input(z.object({
      key: z.enum([
        "auto_block_threshold",
        "auto_block_duration_hours",
        "auto_block_window_minutes",
        "alert_throttle_minutes",
        "ip_allowlist_enabled",
      ]),
      value: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateSecurityParam(input.key, input.value, ctx.user.id);
      return { success: true };
    }),

  // ─── Diagnóstico de IP ────────────────────────────────────────────────────────────────────
  /**
   * Retorna la IP pública del solicitante.
   * ContentAI y BrokerHub pueden llamar a este endpoint para conocer su IP de salida
   * y agregarla a la allowlist de KobraPay.
   * Requiere autenticación (cualquier usuario logueado).
   */
  getMyIp: protectedProcedure.query(async ({ ctx }) => {
    const req = (ctx as any).req;
    const ip = req ? getClientIp(req) : "unknown";
    return {
      ip,
      message: "Agrega esta IP a la allowlist de tu API key en KobraPay para restringir el acceso.",
      instructions: {
        kobrapay_panel: "Ve a Seguridad → IPs Autorizadas → Agregar IP",
        api: "POST /api/trpc/security.addIpToAllowlist con { ipCidr: \"" + ip + "\" }",
      },
    };
  }),

  // ─── Estado del Sistema ────────────────────────────────────────────────────────────────────────────────────────
  /**
   * Estado del sistema en tiempo real — visible para cualquier usuario autenticado
   * Devuelve: estado de la plataforma, ContentAI, webhooks recientes, métricas básicas
   */
  getSystemStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const now = new Date();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let userStats = { totalLinks: 0, totalTx: 0, succeededTx: 0, failedTx: 0, volumeMxn: 0 };
    let recentWebhooks: Array<{ id: number; event: string; success: boolean; statusCode: number | null; attemptedAt: Date; url: string }> = [];
    let webhookStats = { total: 0, succeeded: 0, failed: 0, successRate: 100 };
    let contentAIStatus: 'operational' | 'degraded' | 'down' = 'operational';
    let contentAILatencyMs: number | null = null;

    try {
      if (db) {
        const { webhookEndpoints, webhookDeliveryLogs } = await import('../../drizzle/schema');
        const { eq, desc, gte, and: drizzleAnd, count: drizzleCount, sql: drizzleSql } = await import('drizzle-orm');

        // Stats de transacciones del usuario (últimos 7 días)
        const txRows = await db.select({
          status: transactions.status,
          cnt: drizzleCount(),
          total: drizzleSql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
        }).from(transactions)
          .innerJoin(paymentLinks, eq(transactions.paymentLinkId, paymentLinks.id))
          .where(drizzleAnd(eq(paymentLinks.userId, ctx.user.id), gte(transactions.createdAt, since7d)))
          .groupBy(transactions.status);

        for (const row of txRows) {
          userStats.totalTx += Number(row.cnt);
          if (row.status === 'succeeded') {
            userStats.succeededTx = Number(row.cnt);
            userStats.volumeMxn = parseFloat(String(row.total));
          } else if (row.status === 'failed') {
            userStats.failedTx = Number(row.cnt);
          }
        }

        // Links totales del usuario
        const [linksRow] = await db.select({ cnt: drizzleCount() }).from(paymentLinks)
          .where(eq(paymentLinks.userId, ctx.user.id));
        userStats.totalLinks = Number(linksRow?.cnt || 0);

        // Webhooks recientes del usuario (últimas 24h)
        const userWebhooks = await db.select({ id: webhookEndpoints.id, url: webhookEndpoints.url })
          .from(webhookEndpoints)
          .where(eq(webhookEndpoints.userId, ctx.user.id));

        if (userWebhooks.length > 0) {
          const webhookIds = userWebhooks.map(w => w.id);
          const urlMap = Object.fromEntries(userWebhooks.map(w => [w.id, w.url]));

          const logs = await db.select().from(webhookDeliveryLogs)
            .where(gte(webhookDeliveryLogs.attemptedAt, since24h))
            .orderBy(desc(webhookDeliveryLogs.attemptedAt))
            .limit(50);

          const userLogs = logs.filter(l => webhookIds.includes(l.webhookEndpointId));
          recentWebhooks = userLogs.slice(0, 10).map(l => ({
            id: l.id,
            event: l.event,
            success: l.success,
            statusCode: l.statusCode,
            attemptedAt: l.attemptedAt,
            url: urlMap[l.webhookEndpointId] || 'unknown',
          }));

          webhookStats.total = userLogs.length;
          webhookStats.succeeded = userLogs.filter(l => l.success).length;
          webhookStats.failed = userLogs.filter(l => !l.success).length;
          webhookStats.successRate = webhookStats.total > 0
            ? Math.round((webhookStats.succeeded / webhookStats.total) * 100)
            : 100;
        }
      }
    } catch (err) {
      console.error('[SystemStatus] Error obteniendo métricas:', err);
    }

    // Ping a ContentAI para verificar disponibilidad
    try {
      const pingStart = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch('https://www.aicontentlab.co', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      contentAILatencyMs = Date.now() - pingStart;
      contentAIStatus = resp.ok || resp.status < 500 ? 'operational' : 'degraded';
    } catch {
      contentAIStatus = 'down';
    }

    return {
      generatedAt: now,
      platform: {
        status: 'operational' as const,
        version: '2.0',
        environment: process.env.NODE_ENV || 'production',
        uptime: Math.round(process.uptime()),
      },
      contentAI: {
        status: contentAIStatus,
        latencyMs: contentAILatencyMs,
        webhookUrl: 'https://www.aicontentlab.co/api/webhooks/kobrapay',
      },
      userStats: {
        ...userStats,
        period: '7d',
        successRate: userStats.totalTx > 0
          ? Math.round((userStats.succeededTx / userStats.totalTx) * 100)
          : 100,
      },
      webhooks: {
        ...webhookStats,
        recent: recentWebhooks,
        period: '24h',
      },
    };
  }),
});
