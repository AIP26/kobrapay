/**
 * KobraPay Public API v1
 * Endpoint: POST /api/v1/checkout
 * Autenticación: Bearer token (API Key)
 */
import { Router } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { apiKeys, apiCheckoutSessions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export function registerApiV1Routes(app: Router) {
  // Middleware de autenticación por API Key
  async function authenticateApiKey(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization || "";
    const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({ error: "API key requerida. Usa el header: Authorization: Bearer kp_live_..." });
    }

    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Error interno del servidor" });

      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const found = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
        .limit(1);

      if (!found.length) {
        return res.status(401).json({ error: "API key inválida o revocada" });
      }

      // Actualizar lastUsedAt y requestCount
      await db.update(apiKeys)
        .set({ lastUsedAt: new Date(), requestCount: found[0].requestCount + 1 })
        .where(eq(apiKeys.id, found[0].id));

      req.apiKey = found[0];
      next();
    } catch (err) {
      console.error("[API v1] Auth error:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // POST /api/v1/checkout — Crear sesión de pago
  app.post("/api/v1/checkout", authenticateApiKey, async (req: any, res: any) => {
    try {
      const {
        amount,           // Monto en centavos MXN (ej: 10000 = $100.00 MXN)
        description,      // Descripción del producto/servicio
        customer_email,   // Email del cliente (opcional)
        customer_name,    // Nombre del cliente (opcional)
        success_url,      // URL de redirección al pagar exitosamente
        cancel_url,       // URL de redirección al cancelar
        metadata,         // Metadata adicional (objeto JSON)
        currency = "MXN", // Moneda (default: MXN)
      } = req.body;

      // Validaciones
      if (!amount || typeof amount !== "number" || amount < 50) {
        return res.status(400).json({ error: "El monto mínimo es 50 centavos (MXN 0.50)" });
      }
      if (!description || typeof description !== "string") {
        return res.status(400).json({ error: "La descripción es requerida" });
      }
      if (!success_url || !cancel_url) {
        return res.status(400).json({ error: "success_url y cancel_url son requeridos" });
      }

      const sessionId = `kp_sess_${crypto.randomBytes(16).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      // Crear Stripe Checkout Session
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        customer_email: customer_email || undefined,
        success_url: `${success_url}?session_id=${sessionId}&status=success`,
        cancel_url: `${cancel_url}?session_id=${sessionId}&status=cancelled`,
        client_reference_id: sessionId,
        metadata: {
          kobrapay_session_id: sessionId,
          merchant_user_id: req.apiKey.userId.toString(),
          ...(metadata || {}),
        },
        allow_promotion_codes: true,
      });

      // Guardar sesión en la base de datos
      const db = await getDb();
      if (db) {
        await db.insert(apiCheckoutSessions).values({
          apiKeyId: req.apiKey.id,
          userId: req.apiKey.userId,
          sessionId,
          amount,
          currency,
          description,
          customerEmail: customer_email || null,
          customerName: customer_name || null,
          successUrl: success_url,
          cancelUrl: cancel_url,
          checkoutUrl: stripeSession.url || "",
          metadata: metadata ? JSON.stringify(metadata) : null,
          status: "pending",
          expiresAt,
        });
      }

      return res.json({
        session_id: sessionId,
        checkout_url: stripeSession.url,
        expires_at: expiresAt.toISOString(),
        amount,
        currency,
        description,
      });
    } catch (err: any) {
      console.error("[API v1] Checkout error:", err);
      return res.status(500).json({ error: err.message || "Error al crear la sesión de pago" });
    }
  });

  // GET /api/v1/checkout/:session_id — Consultar estado de una sesión
  app.get("/api/v1/checkout/:session_id", authenticateApiKey, async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Error interno del servidor" });

      const session = await db
        .select()
        .from(apiCheckoutSessions)
        .where(
          and(
            eq(apiCheckoutSessions.sessionId, req.params.session_id),
            eq(apiCheckoutSessions.userId, req.apiKey.userId)
          )
        )
        .limit(1);

      if (!session.length) {
        return res.status(404).json({ error: "Sesión no encontrada" });
      }

      return res.json({
        session_id: session[0].sessionId,
        status: session[0].status,
        amount: session[0].amount,
        currency: session[0].currency,
        description: session[0].description,
        customer_email: session[0].customerEmail,
        checkout_url: session[0].checkoutUrl,
        created_at: session[0].createdAt,
        expires_at: session[0].expiresAt,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error interno" });
    }
  });

  // GET /api/v1/merchant — Info del merchant (verificar credenciales)
  app.get("/api/v1/merchant", authenticateApiKey, async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Error interno del servidor" });
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const user = await db.select({ id: users.id, name: users.name, email: users.email })
        .from(users).where(eq(users.id, req.apiKey.userId)).limit(1);

      return res.json({
        merchant_id: `merchant_${req.apiKey.userId}`,
        name: user[0]?.name || "",
        email: user[0]?.email || "",
        api_key_name: req.apiKey.name,
        environment: req.apiKey.environment,
        permissions: req.apiKey.permissions,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error interno" });
    }
  });
}
