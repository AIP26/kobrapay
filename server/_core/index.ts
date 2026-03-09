import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStripeWebhook } from "../stripeWebhook";
import { registerApiV1Routes } from "../apiV1";
import { registerSecurityMiddleware } from "../security";
import { getPendingRegistrationsOlderThan, createNotification, getUserByOpenId, hasRecentNotification, deduplicateNotifications } from "../db";
import { ENV } from "./env";
import { notifyOwner } from "./notification";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (required for rate limiting behind reverse proxy/CDN)
  app.set("trust proxy", 1);

  // Security middleware (headers, rate limiting, audit) — registered first
  registerSecurityMiddleware(app);

  // Stripe webhook MUST be registered BEFORE json middleware (needs raw body)
  registerStripeWebhook(app);

  // Configure body parser — 10MB es suficiente para imágenes base64 (~7MB) con margen
  // Reducido de 50MB para prevenir ataques DoS por body inflado
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Public API v1 (requires API Key auth)
  registerApiV1Routes(app as any);

  // Image proxy: permite al frontend cargar imágenes de S3 sin bloqueo CORS
  // Solo permite URLs de dominios de confianza (S3/CDN de Manus)
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "Missing url" });
      // Validar que la URL sea de un dominio permitido
      const allowedDomains = ["s3.amazonaws.com", "manus.space", "manus.computer", "amazonaws.com", "cloudfront.net"];
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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ⏰ Job: recordatorio cada hora para registros pendientes > 24hrs (sin duplicados)
  setInterval(async () => {
    try {
      const pending = await getPendingRegistrationsOlderThan(24);
      if (pending.length === 0) return;
      const ownerUser = await getUserByOpenId(ENV.ownerOpenId);
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
    } catch (err) {
      console.warn("[PendingReminder] Error en job de recordatorio:", err);
    }
  }, 60 * 60 * 1000); // cada hora
}

startServer().catch(console.error);
