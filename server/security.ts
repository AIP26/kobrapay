/**
 * KobraPay Security Middleware
 * Centralizes all security hardening: headers, rate limiting, audit logging, input sanitization
 */
import type { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import hpp from "hpp";
import compression from "compression";

// ─── In-memory store for failed login attempts (use Redis in production) ───────
const failedAttempts = new Map<string, { count: number; blockedUntil?: number }>();
const BLOCK_AFTER_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ─── Audit log (in-memory + DB persistence) ─────────────────────────────────────
interface AuditEntry {
  timestamp: string;
  ip: string;
  userId?: number;
  userEmail?: string;
  action: string;
  resource: string;
  statusCode?: number;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'critical';
  details?: string;
  success?: boolean;
}
const auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 10000;

export function logAudit(entry: Omit<AuditEntry, "timestamp">) {
  const fullEntry = { ...entry, timestamp: new Date().toISOString() };
  if (auditLog.length >= MAX_AUDIT_ENTRIES) auditLog.shift();
  auditLog.push(fullEntry);

  // Persist to DB asynchronously (fire and forget)
  const severity = entry.severity || (
    entry.action.includes('BLOCKED') || entry.action.includes('CRITICAL') ? 'critical' :
    entry.action.includes('RATE_LIMITED') || entry.action.includes('FORBIDDEN') ? 'warning' : 'info'
  );
  import('./db').then(({ getDb }) => getDb()).then(async (db) => {
    if (!db) return;
    try {
      const { auditLogs } = await import('../drizzle/schema');
      await (db as any).insert(auditLogs).values({
        userId: entry.userId ?? null,
        userEmail: entry.userEmail ?? null,
        action: entry.action.slice(0, 128),
        resource: entry.resource.slice(0, 512),
        details: entry.details ?? null,
        ipAddress: entry.ip.slice(0, 64),
        userAgent: entry.userAgent ?? null,
        statusCode: entry.statusCode ?? null,
        success: entry.success !== false,
        severity: severity as 'info' | 'warning' | 'critical',
      });
      // Alert superadmin on critical events
      if (severity === 'critical') {
        import('./_core/notification').then(({ notifyOwner }) => {
          notifyOwner({
            title: `⚠️ Alerta de Seguridad: ${entry.action}`,
            content: `IP: ${entry.ip}\nRecurso: ${entry.resource}\n${entry.details || ''}`,
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (_) { /* silent fail */ }
  }).catch(() => {});
}

export function getAuditLog(limit = 100): AuditEntry[] {
  return auditLog.slice(-limit).reverse();
}

// ─── IP extraction helper ──────────────────────────────────────────────────────
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// ─── Brute force protection ────────────────────────────────────────────────────
export function checkBruteForce(ip: string): { blocked: boolean; remainingMs?: number } {
  const record = failedAttempts.get(ip);
  if (!record) return { blocked: false };

  if (record.blockedUntil && Date.now() < record.blockedUntil) {
    return { blocked: true, remainingMs: record.blockedUntil - Date.now() };
  }

  // Block expired — reset
  if (record.blockedUntil && Date.now() >= record.blockedUntil) {
    failedAttempts.delete(ip);
    return { blocked: false };
  }

  return { blocked: false };
}

export function recordFailedAttempt(ip: string): void {
  const record = failedAttempts.get(ip) || { count: 0 };
  record.count += 1;
  if (record.count >= BLOCK_AFTER_ATTEMPTS) {
    record.blockedUntil = Date.now() + BLOCK_DURATION_MS;
    console.warn(`[Security] IP ${ip} blocked for 15 minutes after ${record.count} failed attempts`);
  }
  failedAttempts.set(ip, record);
}

export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// ─── Input sanitization ────────────────────────────────────────────────────────
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "") // Remove angle brackets (XSS prevention)
    .replace(/javascript:/gi, "") // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim()
    .slice(0, 10000); // Limit length
}

// ─── Rate limiters ─────────────────────────────────────────────────────────────

/** General API rate limiter: 200 requests per minute per IP */
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Por favor intenta de nuevo en un minuto.", code: "RATE_LIMITED" },
  handler: (req, res, next, options) => {
    const ip = getClientIp(req);
    logAudit({ ip, action: "RATE_LIMITED", resource: req.path, statusCode: 429 });
    res.status(429).json(options.message);
  },
});

/** Strict rate limiter for auth endpoints: 10 attempts per 15 minutes */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de acceso. Espera 15 minutos antes de intentar de nuevo.", code: "AUTH_RATE_LIMITED" },
  handler: (req, res, next, options) => {
    const ip = getClientIp(req);
    logAudit({ ip, action: "AUTH_RATE_LIMITED", resource: req.path, statusCode: 429 });
    console.warn(`[Security] Auth rate limit exceeded for IP: ${ip}`);
    res.status(429).json(options.message);
  },
});

/** Payment endpoint rate limiter: 30 payment attempts per 10 minutes */
export const paymentRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de pago. Por favor espera unos minutos.", code: "PAYMENT_RATE_LIMITED" },
  handler: (req, res, next, options) => {
    const ip = getClientIp(req);
    logAudit({ ip, action: "PAYMENT_RATE_LIMITED", resource: req.path, statusCode: 429 });
    res.status(429).json(options.message);
  },
});

/** Slow down middleware: gradually slows repeated requests */
export const speedLimiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 50,
  delayMs: (hits) => (hits - 50) * 100, // Add 100ms delay per request over 50
});

// ─── Security headers middleware ───────────────────────────────────────────────
export function setupSecurityHeaders(app: Express): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.stripe.com", "https://*.manus.computer", "wss://*.manus.computer"],
          frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://www.youtube.com", "https://youtube.com", "https://www.youtube-nocookie.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Required for Stripe.js
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Additional security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
}

// ─── Tenant isolation middleware ───────────────────────────────────────────────
/**
 * Validates that a userId belongs to the requesting user's tenant.
 * Superadmin (owner) can access any tenant.
 * Regular users can only access their own data.
 */
export function assertTenantAccess(
  requestingUserId: number,
  requestingUserRole: string,
  ownerOpenId: string,
  requestingUserOpenId: string,
  targetUserId: number
): void {
  // Superadmin (platform owner) has unrestricted access
  const isSuperAdmin = requestingUserOpenId === ownerOpenId;
  if (isSuperAdmin) return;

  // Admin can only access their own data
  if (requestingUserId !== targetUserId) {
    throw new Error("FORBIDDEN: Cross-tenant access denied");
  }
}

// ─── Audit middleware for API routes ──────────────────────────────────────────
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const start = Date.now();

  res.on("finish", () => {
    // Only log non-static, non-health requests
    if (req.path.startsWith("/api/") && !req.path.includes("health")) {
      logAudit({
        ip,
        action: req.method,
        resource: req.path,
        statusCode: res.statusCode,
        userAgent: req.headers["user-agent"],
      });
    }
  });

  next();
}

// ─── HTTP Parameter Pollution prevention ──────────────────────────────────────
export function setupHPP(app: Express): void {
  app.use(hpp({
    whitelist: ['ids', 'statuses', 'types'], // Allow array params for these
  }));
}

// ─── Request size validation ───────────────────────────────────────────────────
export function validateRequestSize(maxSizeMB = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxSizeMB * 1024 * 1024) {
      logAudit({
        ip: getClientIp(req),
        action: 'REQUEST_TOO_LARGE',
        resource: req.path,
        statusCode: 413,
        severity: 'warning',
        details: `Content-Length: ${contentLength} bytes`,
      });
      return res.status(413).json({ error: 'Solicitud demasiado grande', code: 'PAYLOAD_TOO_LARGE' });
    }
    next();
  };
}

// ─── SQL Injection pattern detection ──────────────────────────────────────────
const SQL_INJECTION_PATTERNS = [
  /('|(\')|--|;|\*|\/\*|\*\/|xp_|exec\s|execute\s|insert\s|select\s|delete\s|update\s|drop\s|create\s|alter\s|union\s)/i,
];

export function detectSQLInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

// ─── Suspicious request detection middleware ───────────────────────────────────
export function suspiciousRequestDetector(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const url = req.url;

  // Detect common attack patterns in URL
  const attackPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS in URL
    /union.*select/i, // SQL injection
    /exec\s*\(/i, // Code injection
    /\/etc\/passwd/i, // File inclusion
    /\/proc\/self/i, // Linux proc traversal
    /\x00/, // Null byte injection
    /base64_decode/i, // PHP code injection
    /eval\s*\(/i, // JS eval injection
  ];

  const isAttack = attackPatterns.some(p => p.test(url));
  if (isAttack) {
    logAudit({
      ip,
      action: 'ATTACK_DETECTED',
      resource: url.slice(0, 200),
      statusCode: 400,
      severity: 'critical',
      userAgent,
      details: `Suspicious pattern detected in URL`,
    });
    return void res.status(400).json({ error: 'Solicitud inválida', code: 'INVALID_REQUEST' });
  }

  // Detect scanner/bot user agents
  const scannerPatterns = /sqlmap|nikto|nmap|masscan|zgrab|nuclei|dirbuster|gobuster|wfuzz|burpsuite/i;
  if (scannerPatterns.test(userAgent)) {
    logAudit({
      ip,
      action: 'SCANNER_DETECTED',
      resource: url.slice(0, 200),
      statusCode: 403,
      severity: 'critical',
      userAgent,
      details: `Security scanner detected: ${userAgent.slice(0, 100)}`,
    });
    return void res.status(403).json({ error: 'Acceso denegado', code: 'FORBIDDEN' });
  }

  next();
}

// ─── Register all security middleware ─────────────────────────────────────────
export function registerSecurityMiddleware(app: Express): void {
  // 0. Compression (before everything for performance)
  app.use(compression());

  // 1. Security headers (must be first)
  setupSecurityHeaders(app);

  // 2. HTTP Parameter Pollution prevention
  setupHPP(app);

  // 3. Suspicious request detection (before rate limiting)
  app.use(suspiciousRequestDetector);

  // 4. Request size validation
  app.use(validateRequestSize(10));

  // 5. Rate limiting
  app.use("/api/oauth", authRateLimit);
  // Rate limit estricto para endpoints de pago (30 intentos por 10 min por IP)
  app.use("/api/trpc/transactions.createIntent", paymentRateLimit);
  app.use("/api/trpc/transactions.confirmPayment", paymentRateLimit);
  // Rate limit para login propio (prevenir fuerza bruta)
  app.use("/api/trpc/auth.loginEmail", authRateLimit);
  app.use("/api/trpc/auth.forgotPassword", authRateLimit);
  app.use("/api/trpc/auth.register", authRateLimit);
  app.use("/api/trpc", generalRateLimit);
  app.use("/api/trpc", speedLimiter);

  // 6. Audit logging
  app.use(auditMiddleware);

  console.log("[Security] All security middleware registered (v2 - enhanced)");
}
