/**
 * KobraPay Public API v1
 * Endpoints:
 *   POST   /api/v1/checkout              — Pago único
 *   POST   /api/v1/checkout/sessions     — Alias para ContentAI (acepta plan_id, plan_name, user_id extra)
 *   GET    /api/v1/checkout/:session_id  — Estado de sesión
 *   POST   /api/v1/subscription          — Crear suscripción recurrente
 *   GET    /api/v1/subscription          — Listar suscripciones (filtro: ?customer_email=)
 *   DELETE /api/v1/subscription/:id      — Cancelar suscripción
 *   GET    /api/v1/merchant              — Info del merchant
 *
 * Autenticación: Bearer token (API Key) o header X-API-Key
 *
 * Integraciones externas:
 *   ContentAI  -> POST /api/v1/checkout/sessions + webhook a https://contentai-mdjbhzth.manus.space/api/kobra/webhook
 *   BrokerHub  -> POST /api/v1/subscription + webhook a https://brokerhub.com.mx/api/webhooks/kobrapay
 */
import { Router } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { apiKeys, apiCheckoutSessions, subscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export function registerApiV1Routes(app: Router) {
  // ─── Middleware de autenticación por API Key ──────────────────────────────
  async function authenticateApiKey(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization || "";
    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : (req.headers["x-api-key"] as string);

    if (!apiKey) {
      return res.status(401).json({
        error: "API key requerida. Usa el header: Authorization: Bearer kp_live_...",
      });
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

      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date(), requestCount: found[0].requestCount + 1 })
        .where(eq(apiKeys.id, found[0].id));

      req.apiKey = found[0];
      next();
    } catch (err) {
      console.error("[API v1] Auth error:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  // ─── POST /api/v1/checkout — Crear sesión de pago único ──────────────────
  app.post("/api/v1/checkout", authenticateApiKey, async (req: any, res: any) => {
    try {
      const {
        amount,
        description,
        customer_email,
        customer_name,
        success_url,
        cancel_url,
        metadata,
        currency = "MXN",
      } = req.body;

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
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: { name: description },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
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

  // ─── GET /api/v1/checkout/:session_id — Estado de sesión ─────────────────
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

  // ─── POST /api/v1/subscription — Crear suscripción recurrente ────────────
  /**
   * Body:
   *   plan_name       string   REQUERIDO — Nombre del plan (ej: "Plan Pro BrokerHub")
   *   amount          number   REQUERIDO — Monto en centavos MXN (ej: 49900 = $499/mes)
   *   customer_email  string   REQUERIDO — Email del suscriptor
   *   customer_name   string   Opcional  — Nombre del suscriptor
   *   description     string   Opcional  — Descripción del plan
   *   interval        string   Opcional  — "day"|"week"|"month"|"year" (default: "month")
   *   interval_count  number   Opcional  — Cada cuántos intervalos (default: 1)
   *   success_url     string   REQUERIDO — URL al completar el checkout
   *   cancel_url      string   REQUERIDO — URL al cancelar
   *   currency        string   Opcional  — "MXN" (default)
   *   metadata        object   Opcional  — Datos adicionales (ej: { user_id: "123" })
   *
   * Respuesta:
   *   subscription_id  string — ID interno KobraPay
   *   checkout_url     string — URL para que el cliente active la suscripción
   *   customer_id      string — ID del cliente en Stripe
   *   plan             object — Detalles del plan
   *   status           string — "pending_payment" hasta que el cliente pague
   */
  app.post("/api/v1/subscription", authenticateApiKey, async (req: any, res: any) => {
    try {
      const {
        plan_name,
        amount,
        customer_email,
        customer_name,
        description,
        interval = "month",
        interval_count = 1,
        success_url,
        cancel_url,
        metadata,
        currency = "MXN",
      } = req.body;

      // Validaciones
      if (!plan_name || typeof plan_name !== "string") {
        return res.status(400).json({ error: "plan_name es requerido" });
      }
      if (!amount || typeof amount !== "number" || amount < 50) {
        return res.status(400).json({ error: "El monto mínimo es 50 centavos (MXN 0.50)" });
      }
      if (!customer_email || typeof customer_email !== "string") {
        return res.status(400).json({ error: "customer_email es requerido" });
      }
      if (!success_url || !cancel_url) {
        return res.status(400).json({ error: "success_url y cancel_url son requeridos" });
      }
      const validIntervals = ["day", "week", "month", "year"];
      if (!validIntervals.includes(interval)) {
        return res.status(400).json({
          error: `interval debe ser uno de: ${validIntervals.join(", ")}`,
        });
      }

      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Error interno del servidor" });

      // 1. Crear o recuperar Customer en Stripe
      const existingCustomers = await stripe.customers.list({
        email: customer_email,
        limit: 1,
      });
      let stripeCustomer: Stripe.Customer;
      if (existingCustomers.data.length > 0) {
        stripeCustomer = existingCustomers.data[0];
        // Actualizar nombre si se proporcionó
        if (customer_name && !stripeCustomer.name) {
          stripeCustomer = await stripe.customers.update(stripeCustomer.id, {
            name: customer_name,
          });
        }
      } else {
        stripeCustomer = await stripe.customers.create({
          email: customer_email,
          name: customer_name || undefined,
          metadata: { merchant_user_id: req.apiKey.userId.toString() },
        });
      }

      // 2. Crear Producto en Stripe
      const stripeProduct = await stripe.products.create({
        name: plan_name,
        description: description || undefined,
        metadata: {
          merchant_user_id: req.apiKey.userId.toString(),
          ...(metadata || {}),
        },
      });

      // 3. Crear Precio recurrente en Stripe
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: amount,
        currency: currency.toLowerCase(),
        recurring: {
          interval: interval as "day" | "week" | "month" | "year",
          interval_count: Number(interval_count),
        },
      });

      // 4. Crear Checkout Session en modo subscription
      const subSessionId = `kp_sub_${crypto.randomBytes(16).toString("hex")}`;
      const stripeSession = await stripe.checkout.sessions.create({
        customer: stripeCustomer.id,
        mode: "subscription",
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        success_url: `${success_url}?session_id=${subSessionId}&status=success`,
        cancel_url: `${cancel_url}?session_id=${subSessionId}&status=cancelled`,
        allow_promotion_codes: true,
        client_reference_id: subSessionId,
        metadata: {
          kobrapay_session_id: subSessionId,
          merchant_user_id: req.apiKey.userId.toString(),
          customer_email,
          customer_name: customer_name || "",
          ...(metadata || {}),
        },
      });

      // 5. Guardar en la base de datos (estado: incomplete hasta que pague)
      await db.insert(subscriptions).values({
        ownerId: req.apiKey.userId,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        stripeCustomerId: stripeCustomer.id,
        name: plan_name,
        description: description || null,
        amount,
        currency: currency.toLowerCase(),
        interval,
        intervalCount: Number(interval_count),
        customerEmail: customer_email,
        customerName: customer_name || null,
        status: "incomplete",
      });

      const intervalLabels: Record<string, string> = {
        day: "día",
        week: "semana",
        month: "mes",
        year: "año",
      };

      return res.json({
        subscription_id: subSessionId,
        checkout_url: stripeSession.url,
        customer_id: stripeCustomer.id,
        plan: {
          name: plan_name,
          amount,
          currency: currency.toUpperCase(),
          interval: `cada ${Number(interval_count) > 1 ? interval_count + " " : ""}${intervalLabels[interval] || interval}`,
          amount_formatted: `$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`,
        },
        status: "pending_payment",
        message:
          "Comparte el checkout_url con tu cliente para que active la suscripción. El cobro se realizará automáticamente cada período.",
      });
    } catch (err: any) {
      console.error("[API v1] Subscription error:", err);
      return res
        .status(500)
        .json({ error: err.message || "Error al crear la suscripción" });
    }
  });

  // ─── GET /api/v1/subscription — Listar suscripciones del merchant ─────────
  // Query params opcionales: ?customer_email=cliente@email.com&status=active
  app.get("/api/v1/subscription", authenticateApiKey, async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Error interno del servidor" });

      const customerEmail = req.query.customer_email as string | undefined;
      const statusFilter = req.query.status as string | undefined;

      const results = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.ownerId, req.apiKey.userId));

      let filtered = results;
      if (customerEmail) {
        filtered = filtered.filter((s) => s.customerEmail === customerEmail);
      }
      if (statusFilter) {
        filtered = filtered.filter((s) => s.status === statusFilter);
      }

      return res.json({
        subscriptions: filtered.map((s) => ({
          id: s.id,
          plan_name: s.name,
          description: s.description,
          customer_email: s.customerEmail,
          customer_name: s.customerName,
          amount: s.amount,
          amount_formatted: `$${((s.amount || 0) / 100).toFixed(2)} ${(s.currency || "MXN").toUpperCase()}`,
          currency: (s.currency || "MXN").toUpperCase(),
          interval: s.interval,
          interval_count: s.intervalCount,
          status: s.status,
          current_period_end: s.currentPeriodEnd,
          cancel_at_period_end: s.cancelAtPeriodEnd,
          stripe_subscription_id: s.stripeSubscriptionId,
          created_at: s.createdAt,
        })),
        total: filtered.length,
        active: filtered.filter((s) => s.status === "active").length,
        pending: filtered.filter((s) => s.status === "incomplete").length,
        canceled: filtered.filter((s) => s.status === "canceled").length,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Error interno" });
    }
  });

  // ─── DELETE /api/v1/subscription/:id — Cancelar suscripción ──────────────
  app.delete("/api/v1/subscription/:id", authenticateApiKey, async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Error interno del servidor" });

      const subId = parseInt(req.params.id);
      if (isNaN(subId)) {
        return res.status(400).json({ error: "ID de suscripción inválido" });
      }

      const found = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, subId),
            eq(subscriptions.ownerId, req.apiKey.userId)
          )
        )
        .limit(1);

      if (!found.length) {
        return res.status(404).json({ error: "Suscripción no encontrada" });
      }

      const sub = found[0];

      // Cancelar en Stripe al final del período (no de inmediato)
      if (sub.stripeSubscriptionId) {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }

      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, status: "canceled" })
        .where(eq(subscriptions.id, subId));

      return res.json({
        success: true,
        message:
          "Suscripción cancelada. El acceso del cliente continúa hasta el fin del período actual.",
        subscription_id: subId,
        customer_email: sub.customerEmail,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: err.message || "Error al cancelar la suscripción" });
    }
  });

  // ─── POST /api/v1/checkout/sessions — Alias compatible con ContentAI ────────────
  // ContentAI apunta a esta URL. Acepta los mismos campos que /api/v1/checkout
  // más campos extra: plan_id, plan_name, user_id (external)
  app.post("/api/v1/checkout/sessions", authenticateApiKey, async (req: any, res: any) => {
    try {
      const {
        amount,
        description,
        customer_email,
        customer_name,
        success_url,
        cancel_url,
        metadata,
        currency = "MXN",
        plan_id,
        plan_name,
        user_id: externalUserId,
      } = req.body;

      if (!amount || typeof amount !== "number" || amount < 50) {
        return res.status(400).json({ error: "El monto mínimo es 50 centavos" });
      }
      const finalDescription = description || plan_name;
      if (!finalDescription) {
        return res.status(400).json({ error: "description o plan_name es requerido" });
      }
      if (!success_url || !cancel_url) {
        return res.status(400).json({ error: "success_url y cancel_url son requeridos" });
      }

      const sessionId = `kp_sess_${crypto.randomBytes(16).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Construir metadata completo para que el webhook lo reenvie a ContentAI intacto
      const fullMetadata: Record<string, string> = {
        kobrapay_session_id: sessionId,
        merchant_user_id: req.apiKey.userId.toString(),
        ...(plan_id !== undefined ? { plan_id: String(plan_id) } : {}),
        ...(plan_name ? { plan_name: String(plan_name) } : {}),
        ...(externalUserId !== undefined ? { external_user_id: String(externalUserId) } : {}),
      };
      if (metadata && typeof metadata === "object") {
        for (const [k, v] of Object.entries(metadata)) {
          fullMetadata[k] = String(v);
        }
      }

      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: finalDescription },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        customer_email: customer_email || undefined,
        success_url: `${success_url}?session_id=${sessionId}&status=success`,
        cancel_url: `${cancel_url}?session_id=${sessionId}&status=cancelled`,
        client_reference_id: sessionId,
        metadata: fullMetadata,
        allow_promotion_codes: true,
      });

      const db = await getDb();
      if (db) {
        await db.insert(apiCheckoutSessions).values({
          apiKeyId: req.apiKey.id,
          userId: req.apiKey.userId,
          sessionId,
          amount,
          currency,
          description: finalDescription,
          customerEmail: customer_email || null,
          customerName: customer_name || null,
          successUrl: success_url,
          cancelUrl: cancel_url,
          checkoutUrl: stripeSession.url || "",
          metadata: JSON.stringify(fullMetadata),
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
        description: finalDescription,
        plan_id: plan_id ?? null,
        external_user_id: externalUserId ?? null,
      });
    } catch (err: any) {
      console.error("[API v1] checkout/sessions error:", err);
      return res.status(500).json({ error: err.message || "Error al crear la sesión" });
    }
  });

  // ─── GET /api/v1/merchant — Info del merchant ─────────────────────────────
  app.get("/api/v1/merchant", authenticateApiKey, async (req: any, res: any) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Error interno del servidor" });
      const { users } = await import("../drizzle/schema");
      const user = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, req.apiKey.userId))
        .limit(1);

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
