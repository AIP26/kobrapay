import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStripeWebhook, registerStripeConnectWebhook } from "../stripeWebhook";
import { registerApiV1Routes } from "../apiV1";
import { registerSecurityMiddleware } from "../security";
import { getPendingRegistrationsOlderThan, createNotification, getUserByEmail, hasRecentNotification, deduplicateNotifications, resetDbConnection, getDb } from "../db";
import { ENV } from "./env";
import { resolveStorageFile } from "../storage";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (required for rate limiting behind reverse proxy/CDN)
  app.set("trust proxy", 1);

  // Security middleware (headers, rate limiting, audit) — registered first
  registerSecurityMiddleware(app);

  // Stripe webhook MUST be registered BEFORE json middleware (needs raw body)
  registerStripeWebhook(app);
  // Stripe Connect webhook — receives events from connected accounts (disputes, etc.)
  registerStripeConnectWebhook(app);

  // Configure body parser — 10MB es suficiente para imágenes base64 (~7MB) con margen
  // Reducido de 50MB para prevenir ataques DoS por body inflado
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Health check para Railway/monitores (ligero, sin tocar DB)
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, uptime: process.uptime() });
  });
  // Health profundo: verifica conexión a la base de datos
  app.get("/health/db", async (_req, res) => {
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, db: "unavailable" });
    try {
      await db.execute("SELECT 1");
      res.status(200).json({ ok: true, db: "up" });
    } catch {
      res.status(503).json({ ok: false, db: "error" });
    }
  });

  // Archivos del volumen persistente (evidencias, logos, documentos)
  app.get(/^\/api\/files\/(.+)$/, (req, res) => {
    const relKey = (req.params[0] || "").split("?")[0];
    const resolved = resolveStorageFile(relKey);
    if (!resolved) return res.status(404).send("Not Found");
    res.setHeader("Content-Type", resolved.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(resolved.filePath);
  });

  // Public API v1 (requires API Key auth)
  registerApiV1Routes(app as any);

  // Image proxy: permite al frontend cargar imágenes externas sin bloqueo CORS
  // Solo permite URLs de dominios de confianza (S3/R2/CloudFront)
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "Missing url" });
      // Validar que la URL sea de un dominio permitido
      const allowedDomains = ["s3.amazonaws.com", "amazonaws.com", "cloudfront.net", "r2.dev"];
      const urlObj = new URL(url);
      const isAllowed = allowedDomains.some(d => urlObj.hostname.endsWith(d));
      if (!isAllowed) return res.status(403).json({ error: "Domain not allowed" });
      const response = await fetch(url);
      if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch image" });
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "private, max-age=3600");
      res.send(Buffer.from(buffer));
    } catch (err) {
      res.status(500).json({ error: "Proxy error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Railway asigna PORT; hay que bindear exactamente ese puerto (sin fallback)
  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ⏰ Job: recordatorio cada hora para registros pendientes > 24hrs (sin duplicados)
  setInterval(async () => {
    try {
      const pending = await getPendingRegistrationsOlderThan(24);
      if (pending.length === 0) return;
      const ownerUser = ENV.ownerEmail ? await getUserByEmail(ENV.ownerEmail) : undefined;
      if (ownerUser) {
        // Solo crear si no hay una notificación del mismo tipo en las últimas 3 horas
        const alreadyNotified = await hasRecentNotification(ownerUser.id, "pending_reminder", 3);
        if (!alreadyNotified) {
          await createNotification({
            userId: ownerUser.id,
            type: "pending_reminder",
            title: `⏰ ${pending.length} registro(s) pendiente(s) sin revisar`,
            message: `Tienes ${pending.length} solicitud(es) de registro con más de 24 horas sin revisar. Entra al panel de Registros para aprobar o rechazar.`,
            isRead: false,
            actionUrl: "/dashboard/registrations",
            metadata: JSON.stringify({ pendingCount: pending.length, checkedAt: new Date().toISOString() }),
          });
          console.log(`[PendingReminder] Notificación creada: ${pending.length} registros pendientes > 24hrs`);
        } else {
          console.log(`[PendingReminder] Omitida (ya existe notificación reciente no leída)`);
        }
        // Limpiar duplicados por si acaso
        await deduplicateNotifications(ownerUser.id, "pending_reminder");
      }
    } catch (err: unknown) {
      console.warn("[PendingReminder] Error en job de recordatorio:", err);
      // Reset DB connection on ECONNRESET so the next run reconnects cleanly
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ECONNRESET') || msg.includes('ECONNREFUSED') || msg.includes('Failed query')) {
        resetDbConnection();
        console.log('[PendingReminder] DB connection reset due to connection error — will reconnect on next run');
      }
    }
  }, 60 * 60 * 1000); // cada hora
}

startServer().catch(console.error);
