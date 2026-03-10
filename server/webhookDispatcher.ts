/**
 * KobraPay Webhook Dispatcher
 * Envía notificaciones automáticas a URLs registradas por los clientes
 * cuando ocurren eventos de pago (payment.success, payment.failed, etc.)
 */

import crypto from "crypto";

export type WebhookEventType =
  | "payment.success"
  | "payment.failed"
  | "payment.refunded"
  | "chargeback.created";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

function generateSignature(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function deliverWebhook(
  webhookId: number,
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode: number | null; responseBody: string }> {
  const body = JSON.stringify(payload);
  const signature = generateSignature(secret, body);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KobraPay-Signature": signature,
        "X-KobraPay-Event": payload.event,
        "X-KobraPay-Timestamp": payload.timestamp,
        "User-Agent": "KobraPay-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseBody = await response.text().catch(() => "");
    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      statusCode: null,
      responseBody: `Error: ${message}`,
    };
  }
}

export async function dispatchWebhookEvent(
  userId: number,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return;

    const { webhookEndpoints, webhookDeliveryLogs } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.userId, userId),
          eq(webhookEndpoints.isActive, true)
        )
      );

    if (!endpoints.length) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const endpoint of endpoints) {
      let events: string[] = [];
      try {
        events = JSON.parse(endpoint.events || "[]");
      } catch {
        events = ["payment.success", "payment.failed"];
      }

      if (!events.includes(event)) continue;

      console.log(`[WebhookDispatcher] Enviando ${event} a ${endpoint.url} (webhook #${endpoint.id})`);

      const result = await deliverWebhook(endpoint.id, endpoint.url, endpoint.secret, payload);

      try {
        await db.insert(webhookDeliveryLogs).values({
          webhookEndpointId: endpoint.id,
          event,
          payload: JSON.stringify(payload),
          statusCode: result.statusCode,
          responseBody: result.responseBody,
          success: result.success,
        });

        const updateData: Record<string, unknown> = {
          lastTriggeredAt: new Date(),
          lastStatusCode: result.statusCode,
        };

        if (!result.success) {
          updateData.failureCount = (endpoint.failureCount || 0) + 1;
          if ((endpoint.failureCount || 0) + 1 >= 10) {
            updateData.isActive = false;
            console.warn(`[WebhookDispatcher] Webhook #${endpoint.id} desactivado por demasiados fallos`);
          }
        } else {
          updateData.failureCount = 0;
        }

        await db
          .update(webhookEndpoints)
          .set(updateData)
          .where(eq(webhookEndpoints.id, endpoint.id));

        console.log(
          `[WebhookDispatcher] ${result.success ? "OK" : "FAIL"} ${endpoint.url} -> HTTP ${result.statusCode ?? "timeout"}`
        );
      } catch (logErr) {
        console.error("[WebhookDispatcher] Error guardando log:", logErr);
      }
    }
  } catch (err) {
    console.error("[WebhookDispatcher] Error general:", err);
  }
}
