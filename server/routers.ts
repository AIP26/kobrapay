import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { z } from "zod";
import {
  createPaymentLink,
  createTransaction,
  getDashboardStats,
  getPaymentLinkByToken,
  getPaymentLinksByUser,
  getTransactionsByUser,
  getVendorSettings,
  updatePaymentLinkStatus,
  updateTransactionStatus,
  upsertVendorSettings,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  vendor: router({
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      return getVendorSettings(ctx.user.id);
    }),

    updateSettings: protectedProcedure
      .input(
        z.object({
          businessName: z.string().min(1).max(255),
          businessEmail: z.string().email().optional().or(z.literal("")),
          businessPhone: z.string().max(32).optional().or(z.literal("")),
          currency: z.enum(["MXN", "USD"]).default("MXN"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertVendorSettings({
          userId: ctx.user.id,
          businessName: input.businessName,
          businessEmail: input.businessEmail || null,
          businessPhone: input.businessPhone || null,
          currency: input.currency,
        });
      }),
  }),

  paymentLinks: router({
    create: protectedProcedure
      .input(
        z.object({
          clientName: z.string().min(1).max(255),
          clientEmail: z.string().email().optional().or(z.literal("")),
          amount: z.number().positive().min(10),
          description: z.string().min(1).max(1000),
          currency: z.enum(["MXN", "USD"]).default("MXN"),
          expiresInDays: z.number().min(1).max(365).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(12);
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : null;

        const link = await createPaymentLink({
          userId: ctx.user.id,
          token,
          clientName: input.clientName,
          clientEmail: input.clientEmail || null,
          amount: String(input.amount),
          currency: input.currency,
          description: input.description,
          expiresAt: expiresAt ?? undefined,
        });

        return link;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getPaymentLinksByUser(ctx.user.id);
    }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const links = await getPaymentLinksByUser(ctx.user.id);
        const link = links.find((l) => l.id === input.id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        if (link.status !== "pending")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden cancelar enlaces pendientes" });
        await updatePaymentLinkStatus(input.id, "cancelled");
        return { success: true };
      }),

    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Enlace de pago no encontrado" });

        if (link.expiresAt && new Date() > link.expiresAt && link.status === "pending") {
          await updatePaymentLinkStatus(link.id, "expired");
          return { ...link, status: "expired" as const };
        }

        return link;
      }),
  }),

  transactions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getTransactionsByUser(ctx.user.id);
    }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardStats(ctx.user.id);
    }),
  }),

  payments: router({
    createIntent: publicProcedure
      .input(
        z.object({
          token: z.string(),
          payerName: z.string().min(1).max(255),
          payerEmail: z.string().email(),
          payerPhone: z.string().max(32).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ input }) => {
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Enlace de pago no encontrado" });
        if (link.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: link.status === "paid" ? "Este enlace ya fue pagado" : "Este enlace no está disponible",
          });
        }
        if (link.expiresAt && new Date() > link.expiresAt) {
          await updatePaymentLinkStatus(link.id, "expired");
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este enlace ha expirado" });
        }

        const amountCents = Math.round(parseFloat(String(link.amount)) * 100);
        const currency = link.currency.toLowerCase();

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency,
          metadata: {
            paymentLinkId: String(link.id),
            paymentLinkToken: link.token,
            userId: String(link.userId),
            payerName: input.payerName,
            payerEmail: input.payerEmail,
            payerPhone: input.payerPhone || "",
            description: link.description,
          },
          description: link.description,
          receipt_email: input.payerEmail,
        });

        await createTransaction({
          paymentLinkId: link.id,
          userId: link.userId,
          stripePaymentIntentId: paymentIntent.id,
          amount: String(link.amount),
          currency: link.currency,
          status: "pending",
          payerName: input.payerName,
          payerEmail: input.payerEmail,
          payerPhone: input.payerPhone || null,
        });

        return {
          clientSecret: paymentIntent.client_secret!,
          paymentIntentId: paymentIntent.id,
          amount: link.amount,
          currency: link.currency,
          description: link.description,
          clientName: link.clientName,
        };
      }),

    confirmPayment: publicProcedure
      .input(z.object({ paymentIntentId: z.string(), token: z.string() }))
      .mutation(async ({ input }) => {
        const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });

        if (paymentIntent.status === "succeeded") {
          await updatePaymentLinkStatus(link.id, "paid", new Date());

          let cardLast4: string | undefined;
          let cardBrand: string | undefined;
          if (paymentIntent.latest_charge) {
            try {
              const charge = await stripe.charges.retrieve(String(paymentIntent.latest_charge));
              cardLast4 = charge.payment_method_details?.card?.last4 || undefined;
              cardBrand = charge.payment_method_details?.card?.brand || undefined;
            } catch (_) {}
          }

          const txs = await getTransactionsByUser(link.userId);
          const tx = txs.find((t) => t.stripePaymentIntentId === input.paymentIntentId);
          if (tx) {
            await updateTransactionStatus(tx.id, "succeeded", {
              stripeChargeId: String(paymentIntent.latest_charge || ""),
              cardLast4,
              cardBrand,
            });
          }

          try {
            await notifyOwner({
              title: `Pago recibido: $${link.amount} ${link.currency}`,
              content: `El cliente ${paymentIntent.metadata.payerName} (${paymentIntent.metadata.payerEmail}) pagó $${link.amount} ${link.currency} por "${link.description}".`,
            });
          } catch (_) {}

          return { success: true, status: "succeeded" };
        }

        return { success: false, status: paymentIntent.status };
      }),
  }),
});

export type AppRouter = typeof appRouter;
