/**
 * KobraPay Security Middleware
 * Centralizes all security hardening: headers, rate limiting, audit logging,
 * input sanitization, HTTPS enforcement, HMAC webhook validation, and sensitive file blocking.
 *
 * v3 — Production hardening:
 *   1. HTTPS enforcement for all outgoing webhook/API calls to external platforms
 *   2. HMAC signature validation for incoming webhooks from external platforms
 *   3. Sensitive file blocking (.env, .bak, backups, credentials)
 */
import type { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import hpp from "hpp";
import compression from "compression";
import crypto from "crypto";

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
  handler: (req, res, _next, options) => {
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
  handler: (req, res, _next, options) => {
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
  handler: (req, res, _next, options) => {
    const ip = getClientIp(req);
    logAudit({ ip, action: "PAYMENT_RATE_LIMITED", resource: req.path, statusCode: 429 });
    res.status(429).json(options.message);
  },
});

/** Webhook rate limiter: 60 events per minute per IP */
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes de webhook.", code: "WEBHOOK_RATE_LIMITED" },
  handler: (req, res, _next, options) => {
    const ip = getClientIp(req);
    logAudit({ ip, action: "WEBHOOK_RATE_LIMITED", resource: req.path, statusCode: 429, severity: 'warning' });
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
          connectSrc: ["'self'", "https://api.stripe.com"],
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
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
}

// ─── [SECURITY #3] Sensitive file blocking middleware ─────────────────────────
/**
 * Blocks access to sensitive files that should never be served publicly:
 * .env files, backup files, credential files, config files with secrets, etc.
 * Returns 404 (not 403) to avoid revealing that the file exists.
 */
const SENSITIVE_FILE_PATTERNS = [
  /^\/\.env(\.|$)/i,           // .env, .env.local, .env.production, etc.
  /^\/\.env$/i,                // .env exactly
  /\.env\./i,                  // any .env.* file
  /\.(bak|backup|old|orig|save|swp|tmp)$/i, // backup extensions
  /\.(sql|dump|db|sqlite|sqlite3)$/i,        // database files
  /\/(config|credentials?|secrets?)\.(json|yaml|yml|toml|ini|cfg|conf)$/i, // config files
  /\/\.git\//i,                // git directory
  /\/\.ssh\//i,                // SSH keys
  // NOTE: /node_modules/ is NOT blocked here — Vite dev server uses /@fs/ paths
  // In production these paths don't exist so no blocking needed
  /\/(package-lock|yarn\.lock|pnpm-lock\.yaml)$/i, // lock files
  /\/drizzle\/.*\.sql$/i,      // migration SQL files
  /\/server\/.*\.(ts|js)$/i,   // server source files
  /\/\.htaccess$/i,            // Apache config
  /\/web\.config$/i,           // IIS config
  /\/wp-config\.php$/i,        // WordPress config
  /\/phpinfo\.php$/i,          // PHP info
  /\/(passwd|shadow|sudoers)$/i, // Unix system files
  /\/proc\//i,                 // Linux proc filesystem
  /\/etc\//i,                  // Linux etc directory
];

export function blockSensitiveFiles(req: Request, res: Response, next: NextFunction): void {
  const urlPath = req.path.toLowerCase();

  const isBlocked = SENSITIVE_FILE_PATTERNS.some(pattern => pattern.test(urlPath));
  if (isBlocked) {
    const ip = getClientIp(req);
    logAudit({
      ip,
      action: 'SENSITIVE_FILE_ACCESS_BLOCKED',
      resource: req.path.slice(0, 200),
      statusCode: 404,
      severity: 'critical',
      userAgent: req.headers['user-agent'],
      details: `Attempted access to sensitive file: ${req.path.slice(0, 100)}`,
    });
    console.warn(`[Security] Blocked access to sensitive file: ${req.path} from IP: ${ip}`);
    // Return 404 (not 403) to avoid revealing that the file exists
    return void res.status(404).send("Not Found");
  }

  next();
}

// ─── [SECURITY #1] HTTPS enforcement for outgoing requests ────────────────────
/**
 * Validates that a URL uses HTTPS before making outgoing requests.
 * Prevents accidental HTTP calls that could expose sensitive data in transit.
 * @throws Error if URL is not HTTPS
 */
export function enforceHttpsUrl(url: string, context: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      throw new Error(
        `[Security] HTTPS required for ${context}: received ${parsed.protocol}// URL. ` +
        `All external communications must use HTTPS.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('HTTPS required')) {
      throw err;
    }
    throw new Error(`[Security] Invalid URL for ${context}: ${url}`);
  }
}

/**
 * Safe fetch wrapper that enforces HTTPS for all outgoing requests.
 * Use this instead of fetch() for all external API calls to ContentAI, BrokerHub, etc.
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {},
  context = 'external request'
): Promise<globalThis.Response> {
  enforceHttpsUrl(url, context);
  return fetch(url, options);
}

// ─── [SECURITY #2] HMAC webhook signature validation ─────────────────────────
/**
 * Validates incoming webhook signatures from external platforms (ContentAI, BrokerHub).
 * Each platform sends a HMAC-SHA256 signature in a header that we verify against the shared secret.
 */

/** Supported external platforms and their signature header names */
const WEBHOOK_SIGNATURE_HEADERS: Record<string, string> = {
  'contentai': 'x-contentai-signature',
  'brokerhub': 'x-brokerhub-signature',
  'kobrapay': 'x-kobrapay-signature', // Our own outgoing webhooks
};

/**
 * Verifies a HMAC-SHA256 signature from an external platform webhook.
 * Uses timing-safe comparison to prevent timing attacks.
 * @returns true if valid, false if invalid or missing
 */
export function verifyWebhookSignature(
  platform: string,
  rawBody: string | Buffer,
  headers: Record<string, string | string[] | undefined>,
  secret: string
): boolean {
  const headerName = WEBHOOK_SIGNATURE_HEADERS[platform.toLowerCase()];
  if (!headerName) {
    console.warn(`[Security] Unknown platform for webhook validation: ${platform}`);
    return false;
  }

  const receivedSig = headers[headerName];
  if (!receivedSig || typeof receivedSig !== 'string') {
    console.warn(`[Security] Missing webhook signature header: ${headerName}`);
    return false;
  }

  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const receivedBuf = Buffer.from(receivedSig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (receivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Express middleware factory for validating incoming webhooks from external platforms.
 * If the secret env var is not configured, logs a warning and allows through (backward compat).
 */
export function createWebhookValidator(platform: string, secretEnvVar: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const secret = process.env[secretEnvVar];

    // If no secret configured, log warning and allow through (for backward compat)
    if (!secret) {
      console.warn(
        `[Security] Webhook secret not configured for ${platform} (${secretEnvVar}). ` +
        `Skipping signature validation. Set ${secretEnvVar} in environment to enable.`
      );
      next();
      return;
    }

    const rawBody = (req as any).rawBody || req.body;
    const bodyStr = typeof rawBody === 'string' ? rawBody :
      Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') :
      JSON.stringify(rawBody);

    const isValid = verifyWebhookSignature(platform, bodyStr, req.headers as any, secret);

    if (!isValid) {
      logAudit({
        ip,
        action: 'WEBHOOK_SIGNATURE_INVALID',
        resource: req.path,
        statusCode: 401,
        severity: 'critical',
        userAgent: req.headers['user-agent'],
        details: `Invalid webhook signature from ${platform}. Possible replay attack or unauthorized caller.`,
      });
      console.error(`[Security] Invalid webhook signature from ${platform} — IP: ${ip}`);
      res.status(401).json({ error: 'Invalid webhook signature', code: 'INVALID_SIGNATURE' });
      return;
    }

    console.log(`[Security] Webhook signature valid for ${platform} — IP: ${ip}`);
    next();
  };
}

// ─── Tenant isolation middleware ───────────────────────────────────────────────
/**
 * Validates that a userId belongs to the requesting user's tenant.
 * Superadmin (owner) can access any tenant.
 * Regular users can only access their own data.
 */
export function assertTenantAccess(
  requestingUserId: number,
  _requestingUserRole: string,
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

  // 3. [SECURITY #3] Block sensitive file access BEFORE static file serving
  app.use(blockSensitiveFiles);

  // 4. Suspicious request detection (before rate limiting)
  app.use(suspiciousRequestDetector);

  // 5. Request size validation
  app.use(validateRequestSize(10));

  // 6. Rate limiting
  app.use("/api/oauth", authRateLimit);
  // Strict rate limit for payment endpoints (30 attempts per 10 min per IP)
  app.use("/api/trpc/transactions.createIntent", paymentRateLimit);
  app.use("/api/trpc/transactions.confirmPayment", paymentRateLimit);
  // Strict rate limit for API v1 payment endpoints
  app.use("/api/v1/checkout", paymentRateLimit);
  app.use("/api/v1/subscription", paymentRateLimit);
  // Rate limit for webhook endpoints
  app.use("/api/stripe/webhook", webhookRateLimit);
  app.use("/api/v1/webhook", webhookRateLimit);
  // Rate limit for login/auth (prevent brute force)
  app.use("/api/trpc/auth.loginEmail", authRateLimit);
  app.use("/api/trpc/auth.forgotPassword", authRateLimit);
  app.use("/api/trpc/auth.register", authRateLimit);
  app.use("/api/trpc", generalRateLimit);
  app.use("/api/trpc", speedLimiter);

  // 7. Audit logging
  app.use(auditMiddleware);

  console.log("[Security] All security middleware registered (v3 - production hardening)");
  console.log("[Security] Active: HTTPS enforcement, HMAC webhook validation, sensitive file blocking");
}
