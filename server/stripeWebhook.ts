import express from "express";
import Stripe from "stripe";
import {
  getPaymentLinkByToken,
  getTransactionsByUser,
  updatePaymentLinkStatus,
  updateTransactionStatus,
} from "./db";
import { notifyOwner } from "./_core/notification";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export function registerStripeWebhook(app: express.Application) {
  // IMPORTANT: Must use raw body BEFORE json middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Stripe Webhook] Signature verification failed:", message);
        return res.status(400).json({ error: `Webhook Error: ${message}` });
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "payment_intent.succeeded": {
            const pi = event.data.object as Stripe.PaymentIntent;
            const token = pi.metadata?.paymentLinkToken;
            const userId = pi.metadata?.userId ? parseInt(pi.metadata.userId) : null;

            if (token && userId) {
              const link = await getPaymentLinkByToken(token);
              if (link && link.status === "pending") {
                await updatePaymentLinkStatus(link.id, "paid", new Date());

                // Get card info from charge
                let cardLast4: string | undefined;
                let cardBrand: string | undefined;
                let stripeChargeId: string | undefined;

                if (pi.latest_charge) {
                  try {
                    const charge = await stripe.charges.retrieve(String(pi.latest_charge));
                    cardLast4 = charge.payment_method_details?.card?.last4 || undefined;
                    cardBrand = charge.payment_method_details?.card?.brand || undefined;
                    stripeChargeId = charge.id;
                  } catch (_) {}
                }

                // Update transaction
                const txs = await getTransactionsByUser(userId);
                const tx = txs.find((t) => t.stripePaymentIntentId === pi.id);
                if (tx) {
                  await updateTransactionStatus(tx.id, "succeeded", {
                    stripeChargeId: stripeChargeId || "",
                    cardLast4,
                    cardBrand,
                  });
                }

                // Notify vendor
                try {
                  await notifyOwner({
                    title: `✅ Pago recibido: $${link.amount} ${link.currency}`,
                    content: `El cliente ${pi.metadata.payerName || "desconocido"} (${pi.metadata.payerEmail || ""}) pagó $${link.amount} ${link.currency} por "${link.description}".`,
                  });
                } catch (_) {}
              }
            }
            break;
          }

          case "payment_intent.payment_failed": {
            const pi = event.data.object as Stripe.PaymentIntent;
            const userId = pi.metadata?.userId ? parseInt(pi.metadata.userId) : null;

            if (userId) {
              const txs = await getTransactionsByUser(userId);
              const tx = txs.find((t) => t.stripePaymentIntentId === pi.id);
              if (tx) {
                await updateTransactionStatus(tx.id, "failed", {
                  stripeChargeId: "",
                  cardLast4: undefined,
                  cardBrand: undefined,
                });
              }
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err) {
        console.error("[Stripe Webhook] Error processing event:", err);
      }

      res.json({ received: true });
    }
  );
}
