import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { z } from "zod";
import {
  createOtpVerification,
  createPaymentLink,
  createPlatformClient,
  createTransaction,
  getAllTransactionsForAdmin,
  getDashboardStats,
  getCustomersByUser,
  getCustomerTransactions,
  getPlatformClientByEmail,
  getPlatformClientById,
  getPlatformClientsByAdmin,
  getPaymentLinkByToken,
  getPaymentLinksByUser,
  getTransactionsByUser,
  searchTransactionsByUser,
  getVendorSettings,
  updatePaymentLink,
  updatePaymentLinkStatus,
  updatePlatformClient,
  updateTransactionStatus,
  upsertCustomer,
  upsertVendorSettings,
  verifyOtp,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { securityRouter } from "./routers/security";
import { notifyOwner } from "./_core/notification";
import { sendOtpEmail, sendPaymentReceipt } from "./_core/email";
import { storagePut } from "./storage";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

// Helper: generar código OTP de 6 dígitos
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}



// Helper: calcular comisión
function calculateCommission(amount: number, commissionRate: number) {
  const commissionAmount = (amount * commissionRate) / 100;
  const netAmount = amount - commissionAmount;
  return { commissionAmount, netAmount };
}

export const appRouter = router({
  system: systemRouter,
  security: securityRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Configuración del vendedor ───────────────────────────────────────────
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
          commissionRate: z.number().min(0).max(100).optional(),
          usdExchangeRate: z.number().min(0).optional(),
          otpEnabled: z.boolean().optional(),
          selfieEnabled: z.boolean().optional(),
          chargebackText: z.string().max(1000).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertVendorSettings({
          userId: ctx.user.id,
          businessName: input.businessName,
          businessEmail: input.businessEmail || null,
          businessPhone: input.businessPhone || null,
          currency: input.currency,
          commissionRate: input.commissionRate !== undefined ? String(input.commissionRate) : undefined,
          usdExchangeRate: input.usdExchangeRate !== undefined ? String(input.usdExchangeRate) : undefined,
          otpEnabled: input.otpEnabled,
          selfieEnabled: input.selfieEnabled,
          chargebackText: input.chargebackText || null,
        });
      }),
  }),

  // ─── Gestión de clientes de la plataforma (multi-tenant) ──────────────────
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getPlatformClientsByAdmin(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          email: z.string().email(),
          businessName: z.string().max(255).optional().or(z.literal("")),
          phone: z.string().max(32).optional().or(z.literal("")),
          commissionRate: z.number().min(0).max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const existing = await getPlatformClientByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ya existe un cliente con ese email" });

        const tempPassword = nanoid(10);
        const client = await createPlatformClient({
          adminUserId: ctx.user.id,
          name: input.name,
          email: input.email,
          businessName: input.businessName || null,
          phone: input.phone || null,
          commissionRate: input.commissionRate !== undefined ? String(input.commissionRate) : null,
          status: "active",
          tempPassword,
        });

        return { ...client, tempPassword };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          businessName: z.string().max(255).optional().or(z.literal("")),
          phone: z.string().max(32).optional().or(z.literal("")),
          commissionRate: z.number().min(0).max(100).optional(),
          status: z.enum(["active", "suspended", "pending"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const client = await getPlatformClientById(input.id);
        if (!client || client.adminUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        return updatePlatformClient(input.id, {
          name: input.name,
          businessName: input.businessName || null,
          phone: input.phone || null,
          commissionRate: input.commissionRate !== undefined ? String(input.commissionRate) : undefined,
          status: input.status,
        });
      }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const clients = await getPlatformClientsByAdmin(ctx.user.id);
      const allTxs = await getAllTransactionsForAdmin(ctx.user.id);
      const succeededTxs = allTxs.filter((t) => t.status === "succeeded");
      const totalCommission = succeededTxs.reduce((sum, t) => sum + parseFloat(String(t.commissionAmount || 0)), 0);
      return {
        totalClients: clients.length,
        activeClients: clients.filter((c) => c.status === "active").length,
        totalTransactions: succeededTxs.length,
        totalCommissionEarned: totalCommission,
      };
    }),
  }),

  // ─── Enlaces de pago ──────────────────────────────────────────────────────
  paymentLinks: router({
    create: protectedProcedure
      .input(
        z.object({
          clientName: z.string().min(1).max(255),
          clientEmail: z.string().email().optional().or(z.literal("")),
          amount: z.number().positive().min(1),
          description: z.string().min(1).max(1000),
          currency: z.enum(["MXN", "USD"]).default("MXN"),
          expiresInDays: z.number().min(1).max(365).optional(),
          requireOtp: z.boolean().default(false),
          requireSelfie: z.boolean().default(false),
          chargebackProtectionText: z.string().max(500).optional().or(z.literal("")),
          usdExchangeRate: z.number().min(0).default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(12);
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : null;

        // Obtener configuración del vendedor para aplicar comisión
        const settings = await getVendorSettings(ctx.user.id);
        const commissionRate = parseFloat(String(settings?.commissionRate || "0"));
        const { commissionAmount, netAmount } = calculateCommission(input.amount, commissionRate);

        // Texto de protección contracargos: usar el del input o el default del vendedor
        const chargebackText =
          input.chargebackProtectionText ||
          settings?.chargebackText ||
          "Al realizar este pago, usted acepta que el cargo es definitivo y no puede ser cancelado ni reembolsado una vez procesado.";

        const link = await createPaymentLink({
          userId: ctx.user.id,
          token,
          clientName: input.clientName,
          clientEmail: input.clientEmail || null,
          amount: String(input.amount),
          currency: input.currency,
          description: input.description,
          expiresAt: expiresAt ?? undefined,
          requireOtp: input.requireOtp,
          requireSelfie: input.requireSelfie,
          chargebackProtectionText: chargebackText,
          usdExchangeRate: String(input.usdExchangeRate),
          commissionRate: String(commissionRate),
          commissionAmount: String(commissionAmount),
        });

        return { ...link, netAmount };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getPaymentLinksByUser(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          clientName: z.string().min(1).max(255).optional(),
          clientEmail: z.string().email().optional().or(z.literal("")),
          amount: z.number().positive().min(1).optional(),
          description: z.string().min(1).max(1000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const links = await getPaymentLinksByUser(ctx.user.id);
        const link = links.find((l) => l.id === input.id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        if (link.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden editar enlaces pendientes" });
        }

        await updatePaymentLink(input.id, {
          clientName: input.clientName,
          clientEmail: input.clientEmail || undefined,
          amount: input.amount !== undefined ? String(input.amount) : undefined,
          description: input.description,
        });

        const updated = await getPaymentLinksByUser(ctx.user.id);
        return updated.find((l) => l.id === input.id);
      }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const links = await getPaymentLinksByUser(ctx.user.id);
        const link = links.find((l) => l.id === input.id);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        if (link.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se pueden cancelar enlaces pendientes" });
        }
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
          return { ...link, status: "expired" as const, vendorSettings: null };
        }

        // Obtener configuración del vendedor para mostrar en la página de pago
        const settings = await getVendorSettings(link.userId);
        return {
          ...link,
          vendorSettings: settings
            ? {
                businessName: settings.businessName,
                businessEmail: settings.businessEmail,
                logoUrl: settings.logoUrl,
                chargebackText: settings.chargebackText,
              }
            : null,
        };
      }),
  }),

  // ─── Transacciones ────────────────────────────────────────────────────────
  transactions: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const search = input?.search?.trim();
        if (search && search.length > 0) {
          return searchTransactionsByUser(ctx.user.id, search);
        }
        return getTransactionsByUser(ctx.user.id);
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllTransactionsForAdmin(ctx.user.id);
    }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardStats(ctx.user.id);
    }),

    exportCsv: protectedProcedure.query(async ({ ctx }) => {
      const txs = await getTransactionsByUser(ctx.user.id);
      const succeeded = txs.filter((t) => t.status === "succeeded");

      const rows = [
        ["Fecha", "Cliente", "Email", "Descripción", "Monto Bruto", "Comisión %", "Comisión $", "Monto Neto", "Tarjeta", "Estado"].join(","),
        ...succeeded.map((t) => {
          const commRate = parseFloat(String(t.commissionRate || 0));
          const commAmt = parseFloat(String(t.commissionAmount || 0));
          const net = parseFloat(String(t.netAmount || t.amount));
          return [
            new Date(t.createdAt).toLocaleDateString("es-MX"),
            `"${t.payerName || ""}"`,
            t.payerEmail || "",
            `"${t.metadata ? JSON.parse(t.metadata).description || "" : ""}"`,
            parseFloat(String(t.amount)).toFixed(2),
            commRate.toFixed(2) + "%",
            commAmt.toFixed(2),
            net.toFixed(2),
            t.cardBrand ? `${t.cardBrand} ****${t.cardLast4}` : "",
            t.status,
          ].join(",");
        }),
      ];

      return { csv: rows.join("\n"), count: succeeded.length };
    }),
  }),

  // ─── Verificación OTP ─────────────────────────────────────────────────────
  otp: router({
    send: publicProcedure
      .input(
        z.object({
          token: z.string(),
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        if (!link.requireOtp) throw new TRPCError({ code: "BAD_REQUEST", message: "Este enlace no requiere verificación OTP" });

        const settings = await getVendorSettings(link.userId);
        const code = generateOtpCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        await createOtpVerification({
          paymentLinkToken: input.token,
          email: input.email,
          code,
          expiresAt,
        });

        const emailSent = await sendOtpEmail(input.email, code, settings?.businessName || "Procesador de Pagos");
        console.log(`[OTP] Email enviado: ${emailSent}, código: ${code}`);

        return { success: true, message: "Código enviado a tu email" };
      }),

    verify: publicProcedure
      .input(
        z.object({
          token: z.string(),
          code: z.string().length(6),
        })
      )
      .mutation(async ({ input }) => {
        const result = await verifyOtp(input.token, input.code);
        if (!result.success) {
          const messages: Record<string, string> = {
            no_otp: "No se encontró un código activo. Solicita uno nuevo.",
            expired: "El código ha expirado. Solicita uno nuevo.",
            too_many_attempts: "Demasiados intentos fallidos. Solicita un nuevo código.",
            invalid_code: "Código incorrecto. Verifica e intenta de nuevo.",
          };
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: messages[result.reason || "invalid_code"] || "Código inválido",
          });
        }
        return { success: true };
      }),
  }),

  // ─── Selfie / Verificación de identidad ──────────────────────────────────
  identity: router({
    uploadSelfie: publicProcedure
      .input(
        z.object({
          token: z.string(),
          imageBase64: z.string(), // imagen en base64
          mimeType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ input }) => {
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });

        // Convertir base64 a buffer y subir a S3
        const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileKey = `selfies/${link.token}-${Date.now()}.jpg`;

        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Simulación de reconocimiento facial (score aleatorio alto para demo)
        // En producción integrar con AWS Rekognition, Azure Face API, etc.
        const faceMatchScore = (85 + Math.random() * 15).toFixed(2);

        return {
          success: true,
          selfieUrl: url,
          faceMatchScore: parseFloat(faceMatchScore),
          verified: parseFloat(faceMatchScore) >= 80,
        };
      }),
  }),

  // ─── Pagos con Stripe ─────────────────────────────────────────────────────
  payments: router({
    createIntent: publicProcedure
      .input(
        z.object({
          token: z.string(),
          payerName: z.string().min(1).max(255),
          payerEmail: z.string().email(),
          payerPhone: z.string().max(32).optional().or(z.literal("")),
          otpVerified: z.boolean().default(false),
          selfieVerified: z.boolean().default(false),
          selfieUrl: z.string().optional().or(z.literal("")),
          faceMatchScore: z.number().optional(),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
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
        if (link.requireOtp && !input.otpVerified) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Se requiere verificación OTP" });
        }
        if (link.requireSelfie && !input.selfieVerified) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Se requiere verificación de identidad con selfie" });
        }

        const amount = parseFloat(String(link.amount));
        const commissionRate = parseFloat(String(link.commissionRate || 0));
        const { commissionAmount, netAmount } = calculateCommission(amount, commissionRate);
        const amountCents = Math.round(amount * 100);
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
            commissionRate: String(commissionRate),
            commissionAmount: String(commissionAmount),
            netAmount: String(netAmount),
          },
          description: link.description,
          receipt_email: input.payerEmail,
        });

        const ipAddress = input.ipAddress || (ctx.req.headers["x-forwarded-for"] as string) || ctx.req.socket?.remoteAddress || "";
        const userAgent = input.userAgent || (ctx.req.headers["user-agent"] as string) || "";

        await createTransaction({
          paymentLinkId: link.id,
          userId: link.userId,
          stripePaymentIntentId: paymentIntent.id,
          amount: String(amount),
          currency: link.currency,
          commissionRate: String(commissionRate),
          commissionAmount: String(commissionAmount),
          netAmount: String(netAmount),
          status: "pending",
          payerName: input.payerName,
          payerEmail: input.payerEmail,
          payerPhone: input.payerPhone || null,
          otpVerified: input.otpVerified,
          selfieVerified: input.selfieVerified,
          selfieUrl: input.selfieUrl || null,
          faceMatchScore: input.faceMatchScore !== undefined ? String(input.faceMatchScore) : null,
          ipAddress,
          userAgent,
          metadata: JSON.stringify({ description: link.description }),
        });

        return {
          clientSecret: paymentIntent.client_secret!,
          paymentIntentId: paymentIntent.id,
          amount: link.amount,
          currency: link.currency,
          description: link.description,
          clientName: link.clientName,
          commissionRate,
          commissionAmount,
          netAmount,
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

          const settings = await getVendorSettings(link.userId);

          // Registrar/actualizar cliente en la base de datos de clientes
          try {
            if (paymentIntent.metadata.payerEmail) {
              await upsertCustomer({
                userId: link.userId,
                name: paymentIntent.metadata.payerName || "Cliente",
                email: paymentIntent.metadata.payerEmail,
                phone: paymentIntent.metadata.payerPhone || undefined,
                amount: parseFloat(String(link.amount)),
              });
            }
          } catch (err) {
            console.error("[Customers] Error al registrar cliente:", err);
          }

          // Enviar recibo profesional por email
          try {
            if (paymentIntent.metadata.payerEmail) {
              const txs2 = await getTransactionsByUser(link.userId);
              const tx2 = txs2.find((t) => t.stripePaymentIntentId === input.paymentIntentId);
              await sendPaymentReceipt({
                payerEmail: paymentIntent.metadata.payerEmail,
                payerName: paymentIntent.metadata.payerName || "Cliente",
                businessName: settings?.businessName || "Procesador de Pagos",
                businessEmail: settings?.businessEmail,
                amount: link.amount,
                currency: link.currency,
                description: link.description,
                transactionId: paymentIntent.id,
                cardBrand: tx?.cardBrand,
                cardLast4: tx?.cardLast4,
                paidAt: new Date(),
              });
            }
          } catch (err) {
            console.error("[Email] Error al enviar recibo:", err);
          }

          try {
            await notifyOwner({
              title: `💰 Pago recibido: $${link.amount} ${link.currency}`,
              content: `El cliente ${paymentIntent.metadata.payerName} (${paymentIntent.metadata.payerEmail}) pagó $${link.amount} ${link.currency} por "${link.description}". Neto: $${paymentIntent.metadata.netAmount} ${link.currency}.`,
            });
          } catch (_) {}

          return {
            success: true,
            status: "succeeded",
            businessName: settings?.businessName || "Procesador de Pagos",
            amount: link.amount,
            currency: link.currency,
            description: link.description,
            payerName: paymentIntent.metadata.payerName,
            payerEmail: paymentIntent.metadata.payerEmail,
          };
        }

        return { success: false, status: paymentIntent.status };
      }),
  }),

  // ─── Base de datos de clientes (pagadores) ──────────────────────────────────────
  customers: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        return getCustomersByUser(ctx.user.id, input.search);
      }),

    getTransactions: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ ctx, input }) => {
        return getCustomerTransactions(ctx.user.id, input.email);
      }),
  }),
});

export type AppRouter = typeof appRouter;
