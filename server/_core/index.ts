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
import { registerSecurityMiddleware } from "../security";

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

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

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
}

startServer().catch(console.error);
