/**
 * KobraPay Security Alerts & IP Allowlist Module
 *
 * Funcionalidades:
 *   1. IP Allowlist: verificar si una IP está permitida para una API key
 *   2. Security Alerts: crear alertas automáticas y notificar al owner
 *   3. Threshold alerting: agrupar eventos repetidos para evitar spam
 */
import { getDb } from "./db";
import { ipAllowlist, securityAlerts } from "../drizzle/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type AlertType =
  | "brute_force"
  | "sensitive_file_access"
  | "ip_blocked"
  | "invalid_api_key"
  | "webhook_attack"
  | "rate_limit_exceeded"
  | "ip_not_allowed"
  | "suspicious_request";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

// ─── Throttle: evitar spam de alertas repetidas ───────────────────────────────
// Guarda en memoria el último timestamp de alerta por (ip + type)
const alertThrottle = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutos entre alertas del mismo tipo/IP

function shouldThrottle(ip: string, type: AlertType): boolean {
  const key = `${ip}:${type}`;
  const last = alertThrottle.get(key) || 0;
  if (Date.now() - last < THROTTLE_MS) return true;
  alertThrottle.set(key, Date.now());
  return false;
}

// ─── Crear alerta de seguridad ────────────────────────────────────────────────
export async function createSecurityAlert(params: {
  type: AlertType;
  severity: AlertSeverity;
  ip?: string;
  resource?: string;
  message: string;
  metadata?: Record<string, unknown>;
  userId?: number;
  notifyOwnerNow?: boolean;
}): Promise<void> {
  const { type, severity, ip, resource, message, metadata, userId, notifyOwnerNow } = params;

  // Throttle para no crear miles de alertas del mismo tipo/IP
  if (ip && shouldThrottle(ip, type)) return;

  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(securityAlerts).values({
      type,
      severity,
      ip: ip || null,
      resource: resource || null,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      userId: userId || null,
      isRead: false,
      notifiedOwner: false,
    });

    // Notificar al owner en tiempo real para alertas críticas o altas
    if (notifyOwnerNow || severity === "critical" || severity === "high") {
      const emoji = severity === "critical" ? "🚨" : "⚠️";
      const typeLabel: Record<AlertType, string> = {
        brute_force: "Fuerza bruta",
        sensitive_file_access: "Acceso a archivo sensible",
        ip_blocked: "IP bloqueada",
        invalid_api_key: "API key inválida",
        webhook_attack: "Ataque webhook",
        rate_limit_exceeded: "Rate limit excedido",
        ip_not_allowed: "IP no autorizada",
        suspicious_request: "Solicitud sospechosa",
      };
      try {
        await notifyOwner({
          title: `${emoji} Alerta de Seguridad: ${typeLabel[type]}`,
          content: `${message}${ip ? ` | IP: ${ip}` : ""}${resource ? ` | Recurso: ${resource}` : ""} | Severidad: ${severity.toUpperCase()}`,
        });
        // Marcar como notificado
        await db
          .update(securityAlerts)
          .set({ notifiedOwner: true })
          .where(
            and(
              eq(securityAlerts.type, type),
              eq(securityAlerts.isRead, false),
              eq(securityAlerts.notifiedOwner, false)
            )
          );
      } catch (_) {
        // No fallar si la notificación falla
      }
    }
  } catch (err) {
    console.error("[SecurityAlerts] Error creando alerta:", err);
  }
}

// ─── IP Allowlist: verificar si una IP está permitida ─────────────────────────
/**
 * Verifica si una IP está en la allowlist de una API key.
 * - Si la API key no tiene entradas en la allowlist → permite todo (comportamiento por defecto)
 * - Si tiene entradas → solo permite las IPs en la lista
 * - Soporta CIDR notation (e.g. "203.0.113.0/24") e IPs exactas
 */
export async function checkIpAllowlist(
  apiKeyId: number,
  userId: number,
  clientIp: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const db = await getDb();
    if (!db) return { allowed: true }; // Si no hay DB, permitir (fail open)

    // Obtener todas las entradas activas para esta API key o para el usuario (sin apiKeyId específico)
    const entries = await db
      .select()
      .from(ipAllowlist)
      .where(
        and(
          eq(ipAllowlist.userId, userId),
          eq(ipAllowlist.isActive, true)
        )
      );

    // Filtrar: entradas que aplican a esta API key específica O a todas las keys del usuario
    const applicable = entries.filter(
      (e) => e.apiKeyId === null || e.apiKeyId === apiKeyId
    );

    // Si no hay entradas, permitir todo
    if (applicable.length === 0) return { allowed: true };

    // Verificar si la IP del cliente coincide con alguna entrada
    const isAllowed = applicable.some((entry) => ipMatchesCidr(clientIp, entry.ipCidr));

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `IP ${clientIp} no está en la lista de IPs autorizadas para esta API key`,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("[IpAllowlist] Error verificando IP:", err);
    return { allowed: true }; // Fail open para no bloquear operaciones legítimas por error de DB
  }
}

/**
 * Verifica si una IP coincide con un CIDR o IP exacta.
 * Soporta IPv4 con notación CIDR (e.g. "192.168.1.0/24") e IPs exactas.
 */
function ipMatchesCidr(ip: string, cidr: string): boolean {
  // Limpiar IPv6-mapped IPv4 (::ffff:1.2.3.4 → 1.2.3.4)
  const cleanIp = ip.replace(/^::ffff:/, "");

  if (!cidr.includes("/")) {
    // IP exacta
    return cleanIp === cidr;
  }

  try {
    const [network, prefixStr] = cidr.split("/");
    const prefix = parseInt(prefixStr, 10);

    const ipNum = ipToNumber(cleanIp);
    const networkNum = ipToNumber(network);

    if (ipNum === null || networkNum === null) return false;

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipNum & mask) === (networkNum & mask);
  } catch {
    return false;
  }
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

// ─── Obtener alertas recientes ────────────────────────────────────────────────
export async function getRecentAlerts(limit = 50): Promise<typeof securityAlerts.$inferSelect[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(securityAlerts)
      .orderBy(desc(securityAlerts.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export async function getUnreadAlertCount(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    const rows = await db
      .select()
      .from(securityAlerts)
      .where(eq(securityAlerts.isRead, false));
    return rows.length;
  } catch {
    return 0;
  }
}

export async function markAlertsRead(ids: number[]): Promise<void> {
  try {
    const db = await getDb();
    if (!db || !ids.length) return;
    for (const id of ids) {
      await db.update(securityAlerts).set({ isRead: true }).where(eq(securityAlerts.id, id));
    }
  } catch (err) {
    console.error("[SecurityAlerts] Error marcando alertas como leídas:", err);
  }
}

// ─── Gestión de IP Allowlist ──────────────────────────────────────────────────
export async function addIpToAllowlist(params: {
  userId: number;
  apiKeyId?: number;
  ipCidr: string;
  label?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  await db.insert(ipAllowlist).values({
    userId: params.userId,
    apiKeyId: params.apiKeyId || null,
    ipCidr: params.ipCidr,
    label: params.label || null,
    isActive: true,
  });
}

export async function removeIpFromAllowlist(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  await db
    .update(ipAllowlist)
    .set({ isActive: false })
    .where(and(eq(ipAllowlist.id, id), eq(ipAllowlist.userId, userId)));
}

export async function getIpAllowlist(userId: number): Promise<typeof ipAllowlist.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(ipAllowlist)
    .where(and(eq(ipAllowlist.userId, userId), eq(ipAllowlist.isActive, true)));
}
