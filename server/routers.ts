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
  getTransactionsByUserFiltered,
  searchTransactionsByUser,
  getVendorSettings,
  updatePaymentLink,
  updatePaymentLinkStatus,
  updatePlatformClient,
  updateTransactionStatus,
  upsertCustomer,
  upsertVendorSettings,
  verifyOtp,
  getProductsByUser,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustProductStock,
  getAllRegistrations,
  updateUserAccountStatus,
  getUserById,
  createContract,
  getContractsByAdmin,
  getContractById,
  getContractBySignToken,
  updateContract,
  createSalesAgent,
  getSalesAgentsByAdmin,
  getSalesAgentById,
  updateSalesAgent,
  getPendingCommissionsByAgent,
  getCommissionSummaryByAgent,
  markCommissionsAsPaid,
  linkAgentToClient,
  upsertClientRecord,
  getClientRecords,
  getClientRecordById,
  getTransactionsByPayerEmail,
  getUserProfile,
  upsertUserProfile,
  createChargeback,
  getChargebacksByUser,
  getAllChargebacks,
  updateChargebackStatus,
  createInvoice,
  getInvoicesByUser,
  getInvoiceById,
  updateInvoiceStatus,
  createNotification,
  getNotificationsByUser,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getPendingRegistrationsOlderThan,
  createEmployeeRecord,
  getEmployeeRecordsByOwner,
  getEmployeeRecordById,
  updateEmployeeRecord,
  deleteEmployeeRecord,
  createEmployeeDocument,
  getEmployeeDocuments,
  deleteEmployeeDocument,
  getNextEmployeeNumber,
  createAttendanceRecord,
  getAttendanceByEmployee,
  getAttendanceByOwner,
  getLastAttendanceRecord,
  createSubscription,
  getSubscriptionsByOwner,
  getSubscriptionById,
  updateSubscription,
  updateEmployeePayrollData,
  getAttendanceForPayroll,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  createAbsenceRecord,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { isSuperAdmin, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { securityRouter } from "./routers/security";
import { notifyOwner } from "./_core/notification";
import { sendOtpEmail, sendPaymentReceipt, sendWelcomeEmail, sendInvoiceEmail } from "./_core/email";
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
    me: publicProcedure.query((opts) => {
      if (!opts.ctx.user) return null;
      return {
        ...opts.ctx.user,
        isSuperAdmin: isSuperAdmin(opts.ctx.user.openId),
      };
    }),
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

    // Detalle de un cliente con sus transacciones y estadísticas
    getDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const client = await getPlatformClientById(input.id);
        if (!client || client.adminUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const txs = client.userId ? await getTransactionsByUser(client.userId) : [];
        const succeededTxs = txs.filter((t) => t.status === "succeeded");
        const totalVolume = succeededTxs.reduce((s, t) => s + parseFloat(String(t.amount || 0)), 0);
        const totalCommission = succeededTxs.reduce((s, t) => s + parseFloat(String(t.commissionAmount || 0)), 0);
        const totalNet = succeededTxs.reduce((s, t) => s + parseFloat(String(t.netAmount || 0)), 0);
        const links = client.userId ? await getPaymentLinksByUser(client.userId) : [];
        return {
          client,
          stats: {
            totalTransactions: txs.length,
            succeededTransactions: succeededTxs.length,
            totalVolume,
            totalCommission,
            totalNet,
            totalLinks: links.length,
            activeLinks: links.filter((l) => l.status === "pending").length,
          },
          recentTransactions: txs.slice(0, 20).map((t) => ({
            id: t.id,
            operationNumber: t.operationNumber,
            payerName: t.payerName,
            payerEmail: t.payerEmail,
            amount: parseFloat(String(t.amount || 0)),
            commissionAmount: parseFloat(String(t.commissionAmount || 0)),
            netAmount: parseFloat(String(t.netAmount || 0)),
            commissionRate: parseFloat(String(t.commissionRate || 0)),
            status: t.status,
            createdAt: t.createdAt,
          })),
        };
      }),

    // Desglose de comisiones por negocio para el admin
    getCommissionBreakdown: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const clients = await getPlatformClientsByAdmin(ctx.user.id);
      const breakdown = await Promise.all(
        clients.map(async (client) => {
          const txs = client.userId ? await getTransactionsByUser(client.userId) : [];
          const succeededTxs = txs.filter((t) => t.status === "succeeded");
          const totalVolume = succeededTxs.reduce((s, t) => s + parseFloat(String(t.amount || 0)), 0);
          const totalCommission = succeededTxs.reduce((s, t) => s + parseFloat(String(t.commissionAmount || 0)), 0);
          const commissionRate = parseFloat(String(client.commissionRate ?? 7));
          return {
            clientId: client.id,
            clientName: client.name,
            businessName: client.businessName || null,
            email: client.email,
            status: client.status,
            commissionRate,
            totalVolume,
            totalCommission,
            transactionCount: succeededTxs.length,
          };
        })
      );
      const grandTotalVolume = breakdown.reduce((s, b) => s + b.totalVolume, 0);
      const grandTotalCommission = breakdown.reduce((s, b) => s + b.totalCommission, 0);
      return {
        breakdown: breakdown.sort((a, b) => b.totalCommission - a.totalCommission),
        grandTotalVolume,
        grandTotalCommission,
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
          requireSignature: z.boolean().default(false),
          requireIdUpload: z.boolean().default(false),
          chargebackProtectionText: z.string().max(500).optional().or(z.literal("")),
          usdExchangeRate: z.number().min(0).default(0),
          // MSI: array de meses habilitados (ej: [3, 6, 9, 12])
          msiOptions: z.array(z.number().int().min(3).max(24)).optional(),
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
          requireSignature: input.requireSignature,
          requireIdUpload: input.requireIdUpload,
          chargebackProtectionText: chargebackText,
          usdExchangeRate: String(input.usdExchangeRate),
          commissionRate: String(commissionRate),
          commissionAmount: String(commissionAmount),
          msiOptions: input.msiOptions && input.msiOptions.length > 0 ? JSON.stringify(input.msiOptions) : null,
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
      .input(z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const hasFilters = input?.search || input?.status || input?.dateFrom || input?.dateTo;
        if (hasFilters) {
          return getTransactionsByUserFiltered(ctx.user.id, {
            search: input?.search,
            status: input?.status,
            dateFrom: input?.dateFrom,
            dateTo: input?.dateTo,
          });
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

    monthlyReport: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        const txs = await getTransactionsByUser(ctx.user.id);
        const settings = await getVendorSettings(ctx.user.id);
        const { year, month } = input;
        const filtered = txs.filter((t) => {
          const d = new Date(t.createdAt);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        const succeeded = filtered.filter((t) => t.status === "succeeded");
        const failed = filtered.filter((t) => t.status === "failed");
        const totalBruto = succeeded.reduce((s, t) => s + parseFloat(String(t.amount)), 0);
        const totalComision = succeeded.reduce((s, t) => s + parseFloat(String(t.commissionAmount || 0)), 0);
        const totalNeto = succeeded.reduce((s, t) => s + parseFloat(String(t.netAmount || t.amount)), 0);
        const byDay: Record<string, { count: number; total: number }> = {};
        for (const t of succeeded) {
          const day = new Date(t.createdAt).getDate().toString();
          if (!byDay[day]) byDay[day] = { count: 0, total: 0 };
          byDay[day].count++;
          byDay[day].total += parseFloat(String(t.amount));
        }
        return {
          year, month,
          businessName: settings?.businessName || "Mi Negocio",
          businessEmail: settings?.businessEmail || "",
          totalTransactions: succeeded.length,
          failedTransactions: failed.length,
          totalBruto,
          totalComision,
          totalNeto,
          commissionRate: parseFloat(String(settings?.commissionRate || 0)),
          transactions: succeeded.map((t) => ({
            id: t.id,
            operationNumber: t.operationNumber,
            date: t.createdAt,
            payerName: t.payerName,
            payerEmail: t.payerEmail,
            amount: parseFloat(String(t.amount)),
            commissionAmount: parseFloat(String(t.commissionAmount || 0)),
            netAmount: parseFloat(String(t.netAmount || t.amount)),
            cardBrand: t.cardBrand,
            cardLast4: t.cardLast4,
            msiMonths: t.msiMonths,
          })),
          byDay,
        };
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
    uploadSignature: publicProcedure
      .input(
        z.object({
          token: z.string(),
          imageBase64: z.string(), // canvas PNG en base64
        })
      )
      .mutation(async ({ input }) => {
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileKey = `signatures/${link.token}-${Date.now()}.png`;
        const { url } = await storagePut(fileKey, buffer, "image/png");
        return { success: true, signatureUrl: url };
      }),
    uploadIdDocument: publicProcedure
      .input(
        z.object({
          token: z.string(),
          fileBase64: z.string(), // archivo en base64
          mimeType: z.string().default("image/jpeg"),
          fileName: z.string().default("id_document"),
        })
      )
      .mutation(async ({ input }) => {
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.mimeType.includes("pdf") ? "pdf" : input.mimeType.includes("png") ? "png" : "jpg";
        const fileKey = `id_documents/${link.token}-${Date.now()}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { success: true, idDocumentUrl: url };
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
          signatureUrl: z.string().optional().or(z.literal("")),
          idDocumentUrl: z.string().optional().or(z.literal("")),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
          msiMonths: z.number().int().min(3).max(24).optional(),
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
        if (link.requireSignature && !input.signatureUrl) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Se requiere firma digital" });
        }
        if (link.requireIdUpload && !input.idDocumentUrl) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Se requiere cargar identificación" });
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
          signatureUrl: input.signatureUrl || null,
          idDocumentUrl: input.idDocumentUrl || null,
          ipAddress,
          userAgent,
          msiMonths: input.msiMonths || null,
          metadata: JSON.stringify({ description: link.description, msiMonths: input.msiMonths || null }),
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

          // Registrar/actualizar expediente del cliente
          // Usamos el objeto tx que ya tenemos (tiene selfieUrl, signatureUrl, idDocumentUrl)
          // Si tx no tiene los archivos aún, los tomamos del metadata del paymentIntent
          try {
            if (paymentIntent.metadata.payerEmail) {
              await upsertClientRecord(link.userId, {
                payerEmail: paymentIntent.metadata.payerEmail,
                payerName: paymentIntent.metadata.payerName || undefined,
                payerPhone: paymentIntent.metadata.payerPhone || undefined,
                selfieUrl: tx?.selfieUrl || paymentIntent.metadata.selfieUrl || undefined,
                signatureUrl: tx?.signatureUrl || paymentIntent.metadata.signatureUrl || undefined,
                idDocumentUrl: tx?.idDocumentUrl || paymentIntent.metadata.idDocumentUrl || undefined,
                faceMatchScore: tx?.faceMatchScore ? parseFloat(String(tx.faceMatchScore)) : undefined,
                selfieVerified: tx?.selfieVerified ?? false,
                amount: parseFloat(String(link.amount)),
              });
            }
          } catch (err) {
            console.error("[ClientRecords] Error al registrar expediente:", err);
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

  // ─── Colaboradores (staff) ────────────────────────────────────────────────
  staff: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) return [];
      const { eq, and } = await import('drizzle-orm');
      const { users } = await import('../drizzle/schema');
      return db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        isActive: users.isActive,
        staffRole: users.staffRole,
        createdAt: users.createdAt,
      }).from(users).where(
        and(
          eq(users.createdByUserId, ctx.user.id),
          eq(users.role, 'user')
        )
      );
    }),

    invite: protectedProcedure
      .input(z.object({ name: z.string().min(1), email: z.string().email(), staffRole: z.enum(["asistente", "operador"]).default("operador") }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { eq } = await import('drizzle-orm');
        const { users } = await import('../drizzle/schema');
        // Verificar si ya existe
        const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) {
          // Si ya existe, actualizar createdByUserId si no tiene dueño
          const u = existing[0];
          if (u.createdByUserId && u.createdByUserId !== ctx.user.id) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Este email ya pertenece a otro negocio' });
          }
          await db.update(users).set({ createdByUserId: ctx.user.id, role: 'user', isActive: true, staffRole: input.staffRole }).where(eq(users.id, u.id));
        } else {
          // Crear usuario pendiente (sin openId, se asignará al primer login)
          await db.insert(users).values({
            openId: `pending_${nanoid(16)}`,
            name: input.name,
            email: input.email,
            role: 'user',
            staffRole: input.staffRole,
            createdByUserId: ctx.user.id,
            isActive: false,
          });
        }
        // Enviar email de invitación
        try {
          const { sendOtpEmail } = await import('./_core/email');
          const settings = await import('./db').then(m => m.getVendorSettings(ctx.user.id));
          const businessName = settings?.businessName || 'KobraPay';
          // Usar Resend directamente para email de invitación
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY || '');
          await resend.emails.send({
            from: `${businessName} via KobraPay <noreply@kobrapay.mx>`,
            to: input.email,
            subject: `Invitación a colaborar en ${businessName}`,
            html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="color:#0e7490">Has sido invitado a colaborar</h2>
              <p>Hola <strong>${input.name}</strong>,</p>
              <p><strong>${businessName}</strong> te ha invitado a colaborar en KobraPay como colaborador.</p>
              <p>Inicia sesión en <a href="https://kobrapay.mx/dashboard" style="color:#0e7490">kobrapay.mx</a> con este email para acceder.</p>
              <p style="color:#6b7280;font-size:13px">Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
            </div>`,
          });
        } catch (e) {
          console.warn('[Staff] Error enviando email de invitación:', e);
        }
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { eq, and } = await import('drizzle-orm');
        const { users } = await import('../drizzle/schema');
        // Solo puede eliminar colaboradores que él creó
        await db.update(users).set({ createdByUserId: null, isActive: false }).where(
          and(eq(users.id, input.staffId), eq(users.createdByUserId, ctx.user.id))
        );
        return { success: true };
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
  // ─── Catálogo / Inventario ────────────────────────────────────────────────────
  products: router({
    list: protectedProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        return getProductsByUser(ctx.user.id, input.includeInactive ?? false);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const product = await getProductById(input.id, ctx.user.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        return product;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        price: z.number().positive(),
        category: z.string().optional(),
        imageUrl: z.string().url().optional(),
        trackStock: z.boolean().default(false),
        stock: z.number().int().min(0).default(0),
        lowStockAlert: z.number().int().min(0).default(5),
      }))
      .mutation(async ({ ctx, input }) => {
        return createProduct({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          price: String(input.price),
          category: input.category ?? null,
          imageUrl: input.imageUrl ?? null,
          trackStock: input.trackStock,
          stock: input.stock,
          lowStockAlert: input.lowStockAlert,
          isActive: true,
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        price: z.number().positive().optional(),
        category: z.string().optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
        trackStock: z.boolean().optional(),
        stock: z.number().int().min(0).optional(),
        lowStockAlert: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, price, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (price !== undefined) data.price = String(price);
        return updateProduct(id, ctx.user.id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteProduct(input.id, ctx.user.id);
      }),
    adjustStock: protectedProcedure
      .input(z.object({ id: z.number(), delta: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        return adjustProductStock(input.id, ctx.user.id, input.delta);
      }),
  }),

  // ─── Gestión de registros (super-admin) ──────────────────────────────────────────
  registrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Solo el superadmin puede ver todos los registros
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el super-admin puede gestionar registros" });
      return getAllRegistrations();
    }),

    approve: protectedProcedure
      .input(z.object({
        userId: z.number(),
        commissionRate: z.number().min(0).max(100).default(5),
        accountType: z.string().default("business"),
        permissions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserAccountStatus(input.userId, "active");
        // Guardar accountType y permissions en user_profiles
        await upsertUserProfile(input.userId, {
          accountType: input.accountType,
          permissions: input.permissions,
        });
        // Buscar si ya existe como cliente del admin
        const targetUser = await getUserById(input.userId);
        if (targetUser) {
          const existingClient = await getPlatformClientByEmail(targetUser.email ?? "");
          if (!existingClient && targetUser.email) {
            // Crear automáticamente como cliente con comisión configurable
            await createPlatformClient({
              adminUserId: ctx.user.id,
              name: targetUser.name || targetUser.email,
              email: targetUser.email,
              businessName: null,
              phone: null,
              commissionRate: String(input.commissionRate),
              status: "active",
              tempPassword: null,
            });
          }
        }
        await notifyOwner({ title: "Cuenta aprobada", content: `La cuenta de ${targetUser?.name || targetUser?.email || `ID ${input.userId}`} ha sido aprobada y asignada como cliente con ${input.commissionRate}% de comisión.` });
        // Enviar email de bienvenida al nuevo usuario
        if (targetUser?.email) {
          try {
            const profile = await getUserProfile(input.userId);
            await sendWelcomeEmail({
              to: targetUser.email,
              name: profile?.fullName || targetUser.name || "Usuario",
              businessName: profile?.businessName || targetUser.name || "Tu negocio",
            });
          } catch (emailErr) {
            console.error("[Registrations] Error al enviar email de bienvenida:", emailErr);
          }
        }
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({ userId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserAccountStatus(input.userId, "blocked");
        // Send rejection email
        const targetUser = await getUserById(input.userId);
        if (targetUser?.email) {
          try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY || '');
            const reason = input.reason || "No cumple con los requisitos actuales de la plataforma.";
            await resend.emails.send({
              from: 'KobraPay <noreply@kobrapay.mx>',
              to: targetUser.email,
              subject: 'Actualizaci\u00f3n sobre tu solicitud en KobraPay',
              html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663381362445/yMTQoaqGYTxuRnnF.png" alt="KobraPay" style="width:48px;height:48px;margin-bottom:16px" />
                <h2 style="color:#1a1f2e">Actualizaci\u00f3n de tu solicitud</h2>
                <p>Hola <strong>${targetUser.name || 'Usuario'}</strong>,</p>
                <p>Hemos revisado tu solicitud de acceso a KobraPay y lamentamos informarte que en este momento no podemos activar tu cuenta.</p>
                <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;margin:16px 0">
                  <p style="color:#991b1b;margin:0"><strong>Motivo:</strong> ${reason}</p>
                </div>
                <p>Si crees que esto es un error o tienes m\u00e1s informaci\u00f3n que compartir, cont\u00e1ctanos directamente:</p>
                <a href="mailto:soporte@kobrapay.mx" style="color:#0e7490">soporte@kobrapay.mx</a>
                <p style="color:#6b7280;font-size:12px;margin-top:24px">KobraPay &mdash; kobrapay.mx</p>
              </div>`,
            });
          } catch (emailErr) {
            console.error('[Registrations] Error sending rejection email:', emailErr);
          }
        }
        return { success: true };
      }),

    setPending: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserAccountStatus(input.userId, "pending");
        return { success: true };
      }),
  }),
  // ─── Contratos digitales (solo super-admin y asistente) ─────────────────────
  contracts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      return getContractsByAdmin(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const contract = await getContractById(input.id);
        if (!contract || contract.createdByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return contract;
      }),

    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const contract = await getContractBySignToken(input.token);
        if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato no encontrado" });
        if (contract.signTokenExpiresAt && new Date() > contract.signTokenExpiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este enlace de contrato ha expirado" });
        }
        return contract;
      }),

    create: protectedProcedure
      .input(z.object({
        clientName: z.string().min(1).max(255),
        clientEmail: z.string().email(),
        clientPhone: z.string().max(32).optional().or(z.literal("")),
        clientRfc: z.string().max(20).optional().or(z.literal("")),
        clientCurp: z.string().max(20).optional().or(z.literal("")),
        clientAddress: z.string().optional().or(z.literal("")),
        businessName: z.string().max(255).optional().or(z.literal("")),
        clientIneNumber: z.string().max(50).optional().or(z.literal("")),
        commissionRate: z.number().min(0).max(100).default(6),
        contractDurationMonths: z.number().int().min(0).max(60).default(0),
        includeExclusivityClause: z.boolean().default(false),
        customTerms: z.string().optional().or(z.literal("")),
        internalNotes: z.string().optional().or(z.literal("")),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const contract = await createContract({
          createdByUserId: ctx.user.id,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone || null,
          clientRfc: input.clientRfc || null,
          clientCurp: input.clientCurp || null,
          clientAddress: input.clientAddress || null,
          businessName: input.businessName || null,
          clientIneNumber: input.clientIneNumber || null,
          commissionRate: String(input.commissionRate),
          contractDurationMonths: input.contractDurationMonths,
          includeExclusivityClause: input.includeExclusivityClause,
          customTerms: input.customTerms || null,
          internalNotes: input.internalNotes || null,
          status: "draft",
        });
        return contract;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clientName: z.string().min(1).max(255).optional(),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().max(32).optional().or(z.literal("")),
        clientRfc: z.string().max(20).optional().or(z.literal("")),
        clientCurp: z.string().max(20).optional().or(z.literal("")),
        clientAddress: z.string().optional().or(z.literal("")),
        businessName: z.string().max(255).optional().or(z.literal("")),
        clientIneNumber: z.string().max(50).optional().or(z.literal("")),
        commissionRate: z.number().min(0).max(100).optional(),
        contractDurationMonths: z.number().int().min(0).max(60).optional(),
        includeExclusivityClause: z.boolean().optional(),
        customTerms: z.string().optional().or(z.literal("")),
        internalNotes: z.string().optional().or(z.literal("")),
        status: z.enum(["draft", "sent", "signed", "archived"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, commissionRate, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (commissionRate !== undefined) data.commissionRate = String(commissionRate);
        return updateContract(id, data);
      }),

    sendToClient: protectedProcedure
      .input(z.object({ id: z.number(), expiresInDays: z.number().int().min(1).max(30).default(7) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const contract = await getContractById(input.id);
        if (!contract || contract.createdByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
        await updateContract(input.id, { signToken: token, signTokenExpiresAt: expiresAt, status: "sent" });
        // Enviar email al cliente
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY || '');
          const signUrl = `${ctx.req.headers.origin || 'https://kobrapay.mx'}/sign-contract/${token}`;
          await resend.emails.send({
            from: 'KobraPay Contratos <noreply@kobrapay.mx>',
            to: contract.clientEmail,
            subject: `Contrato de servicios KobraPay — ${contract.clientName}`,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0e7490">Contrato de Servicios KobraPay</h2>
              <p>Hola <strong>${contract.clientName}</strong>,</p>
              <p>Te enviamos el contrato de servicios de KobraPay para tu revisión y firma digital.</p>
              <p>Por favor revisa el contrato y firma digitalmente haciendo clic en el siguiente enlace:</p>
              <a href="${signUrl}" style="display:inline-block;background:#0e7490;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">Ver y Firmar Contrato</a>
              <p style="color:#6b7280;font-size:13px">Este enlace expira en ${input.expiresInDays} días. Si tienes dudas, contáctanos.</p>
            </div>`,
          });
        } catch (e) {
          console.warn('[Contracts] Error enviando email:', e);
        }
        return { success: true, signToken: token };
      }),

    signContract: publicProcedure
      .input(z.object({
        token: z.string(),
        signatureData: z.string(), // base64 de la firma
        signerName: z.string().min(1),
        signerIp: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const contract = await getContractBySignToken(input.token);
        if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato no encontrado" });
        if (contract.status === "signed") throw new TRPCError({ code: "BAD_REQUEST", message: "Este contrato ya fue firmado" });
        if (contract.signTokenExpiresAt && new Date() > contract.signTokenExpiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El enlace ha expirado" });
        }
        // Guardar firma en S3
        const base64Data = input.signatureData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileKey = `contracts/signatures/${contract.id}-${Date.now()}.png`;
        const { url: signatureUrl } = await storagePut(fileKey, buffer, 'image/png');
        const ip = input.signerIp || (ctx.req.headers["x-forwarded-for"] as string) || ctx.req.socket?.remoteAddress || "";
        await updateContract(contract.id, {
          signatureUrl,
          signedAt: new Date(),
          signedFromIp: ip,
          status: "signed",
        });
        return { success: true, signatureUrl };
      }),

    uploadDocument: publicProcedure
      .input(z.object({
        token: z.string(),
        docType: z.enum(["ine", "passport", "addressProof", "rfc", "curp"]),
        fileData: z.string(), // base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const contract = await getContractBySignToken(input.token);
        if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
        const ext = input.mimeType.includes("pdf") ? "pdf" : input.mimeType.includes("png") ? "png" : "jpg";
        const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileKey = `contracts/docs/${contract.id}-${input.docType}-${Date.now()}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const fieldMap: Record<string, string> = {
          ine: "ineUrl",
          passport: "passportUrl",
          addressProof: "addressProofUrl",
          rfc: "rfcDocUrl",
          curp: "curpDocUrl",
        };
        await updateContract(contract.id, { [fieldMap[input.docType]]: url });
        return { success: true, url };
      }),
  }),

  // ─── Vendedores/Afiliados (solo super-admin) ──────────────────────────────────
  salesAgents: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      return getSalesAgentsByAdmin(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const agent = await getSalesAgentById(input.id);
        if (!agent || agent.createdByUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return agent;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email(),
        phone: z.string().max(32).optional().or(z.literal("")),
        commissionRate: z.number().min(0).max(100).default(0.5),
        bankName: z.string().max(128).optional().or(z.literal("")),
        clabe: z.string().length(18).optional().or(z.literal("")),
        bankAccountHolder: z.string().max(255).optional().or(z.literal("")),
        paymentCycle: z.enum(["weekly", "biweekly"]).default("biweekly"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const referralCode = nanoid(8).toUpperCase();
        return createSalesAgent({
          createdByUserId: ctx.user.id,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          commissionRate: String(input.commissionRate),
          bankName: input.bankName || null,
          clabe: input.clabe || null,
          bankAccountHolder: input.bankAccountHolder || null,
          paymentCycle: input.paymentCycle,
          referralCode,
          isActive: true,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        phone: z.string().max(32).optional().or(z.literal("")),
        commissionRate: z.number().min(0).max(100).optional(),
        bankName: z.string().max(128).optional().or(z.literal("")),
        clabe: z.string().length(18).optional().or(z.literal("")),
        bankAccountHolder: z.string().max(255).optional().or(z.literal("")),
        paymentCycle: z.enum(["weekly", "biweekly"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, commissionRate, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (commissionRate !== undefined) data.commissionRate = String(commissionRate);
        return updateSalesAgent(id, data);
      }),

    getCommissionSummary: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        return getCommissionSummaryByAgent(input.agentId);
      }),

    getPendingCommissions: protectedProcedure
      .input(z.object({ agentId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        return getPendingCommissionsByAgent(input.agentId);
      }),

    markAsPaid: protectedProcedure
      .input(z.object({ agentId: z.number(), paymentReference: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        await markCommissionsAsPaid(input.agentId, input.paymentReference);
        return { success: true };
      }),

    linkToClient: protectedProcedure
      .input(z.object({ agentId: z.number(), clientUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        await linkAgentToClient(input.agentId, input.clientUserId);
        return { success: true };
      }),
  }),

  // ─── Expedientes de Clientes ─────────────────────────────────────────────────
  clientRecords: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getClientRecords(ctx.user.id, input?.search);
      }),

    detail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const record = await getClientRecordById(ctx.user.id, input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado" });
        const txHistory = await getTransactionsByPayerEmail(ctx.user.id, record.payerEmail);
        return { record, transactions: txHistory };
      }),

    searchByTx: protectedProcedure
      .input(z.object({ operationNumber: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        // Buscar transacción por número de operación y devolver el expediente del pagador
        const allTx = await getTransactionsByUserFiltered(ctx.user.id, { search: input.operationNumber });
        const tx = allTx[0];
        if (!tx || !tx.payerEmail) throw new TRPCError({ code: "NOT_FOUND", message: "Transacción no encontrada" });
        const records = await getClientRecords(ctx.user.id, tx.payerEmail);
        const record = records[0];
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Expediente no encontrado para esta transacción" });
        return record;
      }),

    // Sincronizar un expediente con los datos de sus transacciones
    syncFromTransactions: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const record = await getClientRecordById(ctx.user.id, input.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        // Obtener todas las transacciones de este pagador
        const txHistory = await getTransactionsByPayerEmail(ctx.user.id, record.payerEmail);
        // Buscar la más reciente con evidencia
        const withSelfie = txHistory.find((t) => t.selfieUrl);
        const withSignature = txHistory.find((t) => t.signatureUrl);
        const withId = txHistory.find((t) => t.idDocumentUrl);
        await upsertClientRecord(ctx.user.id, {
          payerEmail: record.payerEmail,
          payerName: record.payerName || undefined,
          payerPhone: record.payerPhone || undefined,
          selfieUrl: withSelfie?.selfieUrl || undefined,
          signatureUrl: withSignature?.signatureUrl || undefined,
          idDocumentUrl: withId?.idDocumentUrl || undefined,
          faceMatchScore: withSelfie?.faceMatchScore ? parseFloat(String(withSelfie.faceMatchScore)) : undefined,
          selfieVerified: withSelfie?.selfieVerified ?? false,
          amount: 0, // No sumar monto, solo actualizar evidencia
        });
        return { success: true };
      }),

    // Sincronizar TODOS los expedientes del usuario con datos de transacciones
    syncAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        const allRecords = await getClientRecords(ctx.user.id);
        let updated = 0;
        for (const record of allRecords) {
          const txHistory = await getTransactionsByPayerEmail(ctx.user.id, record.payerEmail);
          const withSelfie = txHistory.find((t) => t.selfieUrl);
          const withSignature = txHistory.find((t) => t.signatureUrl);
          const withId = txHistory.find((t) => t.idDocumentUrl);
          if (withSelfie || withSignature || withId) {
            await upsertClientRecord(ctx.user.id, {
              payerEmail: record.payerEmail,
              payerName: record.payerName || undefined,
              payerPhone: record.payerPhone || undefined,
              selfieUrl: withSelfie?.selfieUrl || record.latestSelfieUrl || undefined,
              signatureUrl: withSignature?.signatureUrl || record.latestSignatureUrl || undefined,
              idDocumentUrl: withId?.idDocumentUrl || record.latestIdDocumentUrl || undefined,
              faceMatchScore: withSelfie?.faceMatchScore ? parseFloat(String(withSelfie.faceMatchScore)) : undefined,
              selfieVerified: withSelfie?.selfieVerified ?? record.selfieVerified ?? false,
              amount: 0,
            });
            updated++;
          }
        }
        return { updated };
      }),
  }),

  // ─── Panel de Comisiones de la Plataforma (solo super-admin) ────────────────────────
  commissions: router({
    // Resumen general de comisiones de la plataforma
    summary: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await import('./db').then(m => m.getDb());
      if (!db) return { totalEarned: 0, totalTransactions: 0, clients: [] };
      const { eq, and, desc, sql } = await import('drizzle-orm');
      const { transactions, users, platformClients } = await import('../drizzle/schema');

      // Obtener todas las transacciones exitosas
      const allTxs = await db.select({
        id: transactions.id,
        userId: transactions.userId,
        amount: transactions.amount,
        commissionRate: transactions.commissionRate,
        commissionAmount: transactions.commissionAmount,
        netAmount: transactions.netAmount,
        status: transactions.status,
        createdAt: transactions.createdAt,
        payerName: transactions.payerName,
        payerEmail: transactions.payerEmail,
      }).from(transactions)
        .where(eq(transactions.status, 'succeeded'))
        .orderBy(desc(transactions.createdAt));

      // Obtener todos los clientes de la plataforma
      const clients = await db.select({
        id: platformClients.id,
        userId: platformClients.userId,
        name: platformClients.name,
        email: platformClients.email,
        businessName: platformClients.businessName,
        commissionRate: platformClients.commissionRate,
        status: platformClients.status,
      }).from(platformClients);

      // Agrupar comisiones por cliente
      const clientMap = new Map<number, {
        clientId: number;
        name: string;
        email: string;
        businessName: string | null;
        commissionRate: string | null;
        status: string;
        totalTransactions: number;
        totalVolume: number;
        totalCommission: number;
        lastTransactionAt: Date | null;
      }>();

      for (const client of clients) {
        if (!client.userId) continue;
        clientMap.set(client.userId, {
          clientId: client.id,
          name: client.name,
          email: client.email,
          businessName: client.businessName,
          commissionRate: client.commissionRate,
          status: client.status,
          totalTransactions: 0,
          totalVolume: 0,
          totalCommission: 0,
          lastTransactionAt: null,
        });
      }

      let totalEarned = 0;
      for (const tx of allTxs) {
        const clientData = clientMap.get(tx.userId);
        if (clientData) {
          const comm = parseFloat(String(tx.commissionAmount || 0));
          const vol = parseFloat(String(tx.amount || 0));
          clientData.totalTransactions++;
          clientData.totalVolume += vol;
          clientData.totalCommission += comm;
          totalEarned += comm;
          if (!clientData.lastTransactionAt || new Date(tx.createdAt) > clientData.lastTransactionAt) {
            clientData.lastTransactionAt = new Date(tx.createdAt);
          }
        }
      }

      // Comisiones por mes (últimos 12 meses)
      const monthlyMap = new Map<string, number>();
      for (const tx of allTxs) {
        const d = new Date(tx.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + parseFloat(String(tx.commissionAmount || 0)));
      }
      const monthly = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([month, amount]) => ({ month, amount }));

      return {
        totalEarned,
        totalTransactions: allTxs.length,
        clients: Array.from(clientMap.values()).sort((a, b) => b.totalCommission - a.totalCommission),
        monthly,
      };
    }),
  }),

  // ─── Perfil extendido del usuario (registro) ──────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserProfile(ctx.user.id);
    }),

    save: protectedProcedure
      .input(
        z.object({
          fullName: z.string().min(2).max(255),
          birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
          curp: z.string().length(18).regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/, "CURP inválida"),
          rfc: z.string().min(12).max(13).optional().or(z.literal("")),
          phone: z.string().min(10).max(32),
          businessName: z.string().min(2).max(255),
          businessType: z.string().max(128).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertUserProfile(ctx.user.id, {
          fullName: input.fullName,
          birthDate: input.birthDate,
          curp: input.curp.toUpperCase(),
          rfc: input.rfc ? input.rfc.toUpperCase() : null,
          phone: input.phone,
          businessName: input.businessName,
          businessType: input.businessType || null,
          profileCompleted: true,
        });
        // Notificar al super-admin de nuevo registro
        await notifyOwner({
          title: "Nuevo registro en KobraPay",
          content: `${input.fullName} (${ctx.user.email}) completó su perfil. Negocio: ${input.businessName}. Revisa y aprueba la cuenta en el panel de Registros.`,
        });
        return { success: true };
      }),

    // Actualizar datos extendidos: negocio, bancarios, etc.
    update: protectedProcedure
      .input(
        z.object({
          fullName: z.string().min(2).max(255).optional(),
          birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
          curp: z.string().length(18).optional().or(z.literal("")),
          rfc: z.string().min(12).max(13).optional().or(z.literal("")),
          phone: z.string().min(10).max(32).optional().or(z.literal("")),
          businessName: z.string().max(255).optional().or(z.literal("")),
          businessType: z.string().max(128).optional().or(z.literal("")),
          razonSocial: z.string().max(255).optional().or(z.literal("")),
          direccionFiscal: z.string().max(500).optional().or(z.literal("")),
          codigoPostal: z.string().max(10).optional().or(z.literal("")),
          ciudad: z.string().max(128).optional().or(z.literal("")),
          estado: z.string().max(64).optional().or(z.literal("")),
          sitioWeb: z.string().max(255).optional().or(z.literal("")),
          clabe: z.string().max(18).optional().or(z.literal("")),
          banco: z.string().max(128).optional().or(z.literal("")),
          titularCuenta: z.string().max(255).optional().or(z.literal("")),
          rfcTitular: z.string().max(13).optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(input)) {
          if (v !== undefined) data[k] = v === "" ? null : v;
        }
        if (data.curp && typeof data.curp === "string") data.curp = data.curp.toUpperCase();
        if (data.rfc && typeof data.rfc === "string") data.rfc = data.rfc.toUpperCase();
        if (data.rfcTitular && typeof data.rfcTitular === "string") data.rfcTitular = data.rfcTitular.toUpperCase();
        await upsertUserProfile(ctx.user.id, data as Parameters<typeof upsertUserProfile>[1]);
        return { success: true };
      }),

    // Upload de foto de perfil (base64 → S3)
    uploadAvatar: protectedProcedure
      .input(z.object({
        base64: z.string().min(10),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "La imagen no puede superar 5MB" });
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `avatars/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await upsertUserProfile(ctx.user.id, { avatarUrl: url });
        return { url };
      }),

    // Upload de documentos (INE, domicilio, acta)
    uploadDocument: protectedProcedure
      .input(z.object({
        base64: z.string().min(10),
        mimeType: z.string(),
        docType: z.enum(["ine", "domicilio", "acta"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (buffer.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo no puede superar 10MB" });
        const ext = input.mimeType.includes("pdf") ? "pdf" : (input.mimeType.split("/")[1] || "jpg");
        const key = `docs/${ctx.user.id}-${input.docType}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const fieldMap: Record<string, string> = { ine: "ineUrl", domicilio: "domicilioUrl", acta: "actaConstitutiva" };
        await upsertUserProfile(ctx.user.id, { [fieldMap[input.docType]]: url } as Parameters<typeof upsertUserProfile>[1]);
        return { url };
      }),
  }),

  // *** CHARGEBACKS (Aclaraciones) ***
  chargebacks: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getChargebacksByUser(ctx.user.id);
    }),
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllChargebacks();
    }),
    create: protectedProcedure
      .input(z.object({
        transactionId: z.number().optional(),
        amount: z.number().min(1),
        currency: z.string().default("MXN"),
        reason: z.string().max(128).optional(),
        reasonEs: z.string().max(255).optional(),
        notes: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createChargeback({
          userId: ctx.user.id,
          transactionId: input.transactionId,
          amount: input.amount,
          currency: input.currency,
          reason: input.reason,
          reasonEs: input.reasonEs,
          notes: input.notes,
          status: "open",
        });
        return { success: true };
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "under_review", "won", "lost", "closed"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN" });
        const resolvedAt = ["won","lost","closed"].includes(input.status) ? new Date() : undefined;
        await updateChargebackStatus(input.id, input.status, input.notes, resolvedAt);
        return { success: true };
      }),
  }),

  // *** INVOICES (Facturas) ***
  invoices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getInvoicesByUser(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        transactionId: z.number().optional(),
        emisorRfc: z.string().max(13),
        emisorNombre: z.string().max(255),
        receptorRfc: z.string().max(13),
        receptorNombre: z.string().max(255),
        receptorEmail: z.string().email().optional().or(z.literal("")),
        conceptos: z.array(z.object({
          descripcion: z.string(),
          cantidad: z.number(),
          valorUnitario: z.number(),
          importe: z.number(),
        })),
        subtotal: z.number(),
        iva: z.number(),
        total: z.number(),
        currency: z.string().default("MXN"),
      }))
      .mutation(async ({ ctx, input }) => {
        const folio = `KP-${Date.now().toString(36).toUpperCase()}`;
        await createInvoice({
          userId: ctx.user.id,
          transactionId: input.transactionId,
          folio,
          emisorRfc: input.emisorRfc.toUpperCase(),
          emisorNombre: input.emisorNombre,
          receptorRfc: input.receptorRfc.toUpperCase(),
          receptorNombre: input.receptorNombre,
          receptorEmail: input.receptorEmail || null,
          conceptos: JSON.stringify(input.conceptos),
          subtotal: input.subtotal,
          iva: input.iva,
          total: input.total,
          currency: input.currency,
          status: "draft",
        });
        return { success: true, folio };
      }),
    issue: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const inv = await getInvoiceById(input.id);
        if (!inv || inv.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await updateInvoiceStatus(input.id, "issued", new Date());
        return { success: true };
      }),
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const inv = await getInvoiceById(input.id);
        if (!inv || inv.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await updateInvoiceStatus(input.id, "cancelled", undefined, new Date());
        return { success: true };
      }),
    sendEmail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const inv = await getInvoiceById(input.id);
        if (!inv || inv.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (!inv.receptorEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "La factura no tiene email del receptor" });
        const conceptos = typeof inv.conceptos === "string" ? JSON.parse(inv.conceptos) : (inv.conceptos as Array<{ descripcion: string; cantidad: number; valorUnitario: number; importe: number }>);
        const sent = await sendInvoiceEmail({
          to: inv.receptorEmail,
          receptorNombre: inv.receptorNombre,
          emisorNombre: inv.emisorNombre,
          folio: inv.folio,
          fecha: inv.issuedAt || inv.createdAt,
          conceptos,
          subtotal: parseFloat(String(inv.subtotal)),
          iva: parseFloat(String(inv.iva)),
          total: parseFloat(String(inv.total)),
          currency: inv.currency,
        });
        if (!sent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo enviar el email. Verifica la configuración de Resend." });
        return { success: true };
      }),
  }),

  // ─── BÚSQUEDA GLOBAL ───────────────────────────────────────────────────────
  search: router({
    global: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(100) }))
      .query(async ({ ctx, input }) => {
        const q = input.query.trim();
        if (q.length < 2) return { transactions: [], links: [], customers: [], pages: [] };

        // Buscar transacciones
        const txs = await searchTransactionsByUser(ctx.user.id, q);
        const txResults = txs.slice(0, 5).map(t => ({
          type: "transaction" as const,
          id: t.id,
          title: t.payerName || "Cliente",
          subtitle: t.operationNumber ? `#${t.operationNumber}` : (t.payerEmail || ""),
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          href: "/dashboard/sales",
        }));

        // Buscar enlaces de pago
        const allLinks = await getPaymentLinksByUser(ctx.user.id);
        const term = q.toLowerCase();
        const linkResults = allLinks
          .filter(l =>
            l.clientName?.toLowerCase().includes(term) ||
            l.description?.toLowerCase().includes(term) ||
            l.clientEmail?.toLowerCase().includes(term)
          )
          .slice(0, 5)
          .map(l => ({
            type: "link" as const,
            id: l.id,
            title: l.clientName || "Sin nombre",
            subtitle: l.description || "",
            amount: l.amount,
            currency: l.currency,
            status: l.status,
            href: "/dashboard/links",
          }));

        // Buscar clientes/pagadores
        const customerResults = await getCustomersByUser(ctx.user.id, q);
        const custResults = customerResults.slice(0, 5).map(c => ({
          type: "customer" as const,
          id: c.id,
          title: c.name || c.email,
          subtitle: c.email,
          amount: c.totalPaid,
          currency: "MXN",
          status: "active",
          href: "/dashboard/payers",
        }));

        // Buscar páginas del menú por palabras clave
        const pages = [
          { label: "Panel", href: "/dashboard", keywords: ["panel", "inicio", "dashboard", "home"] },
          { label: "Mis Ventas", href: "/dashboard/sales", keywords: ["ventas", "sales", "transacciones", "cobros"] },
          { label: "Links de Pago", href: "/dashboard/links", keywords: ["links", "enlaces", "pago"] },
          { label: "Nuevo Cobro", href: "/dashboard/create", keywords: ["nuevo", "cobro", "crear", "enlace"] },
          { label: "Mis Facturas", href: "/dashboard/invoices", keywords: ["facturas", "cfdi", "factura"] },
          { label: "Aclaraciones", href: "/dashboard/chargebacks", keywords: ["aclaraciones", "contracargos", "disputas"] },
          { label: "Mis Pagadores", href: "/dashboard/payers", keywords: ["pagadores", "clientes", "payers"] },
          { label: "Expedientes", href: "/dashboard/expedientes", keywords: ["expedientes", "archivos"] },
          { label: "Catálogo", href: "/dashboard/catalog", keywords: ["catalogo", "productos", "inventario"] },
          { label: "Punto de Venta", href: "/dashboard/pos", keywords: ["pos", "punto", "venta", "terminal"] },
          { label: "Contratos", href: "/dashboard/contracts", keywords: ["contratos", "firma"] },
          { label: "Reporte Mensual", href: "/dashboard/report", keywords: ["reporte", "mensual", "pdf"] },
          { label: "Configuración", href: "/dashboard/settings", keywords: ["configuracion", "ajustes", "settings"] },
          { label: "Ayuda", href: "/dashboard/help", keywords: ["ayuda", "help", "soporte"] },
          { label: "Colaboradores", href: "/dashboard/staff", keywords: ["colaboradores", "empleados", "staff"] },
          { label: "Widget de Pago", href: "/dashboard/widget", keywords: ["widget", "embebible", "codigo"] },
          { label: "Cobros Recurrentes", href: "/dashboard/recurring", keywords: ["recurrentes", "suscripciones", "automaticos"] },
        ];
        const pageResults = pages
          .filter(p => p.keywords.some(k => k.includes(term) || term.includes(k)))
          .slice(0, 4)
          .map(p => ({
            type: "page" as const,
            id: 0,
            title: p.label,
            subtitle: p.href,
            amount: 0,
            currency: "",
            status: "",
            href: p.href,
          }));

        return {
          transactions: txResults,
          links: linkResults,
          customers: custResults,
          pages: pageResults,
        };
      }),
  }),

  // ─── Notificaciones (Centro de Notificaciones del Super-Admin) ───────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationsByUser(ctx.user.id);
    }),

    countUnread: protectedProcedure.query(async ({ ctx }) => {
      const count = await countUnreadNotifications(ctx.user.id);
      return { count };
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    // Job: crear recordatorio si hay registros pendientes > 24hrs sin aprobar
    checkPendingReminders: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "superadmin" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const pending = await getPendingRegistrationsOlderThan(24);
      if (pending.length > 0) {
        await createNotification({
          userId: ctx.user.id,
          type: "pending_reminder",
          title: `⏰ ${pending.length} registro(s) pendiente(s) de autorizar`,
          message: `Tienes ${pending.length} solicitud(es) de registro que llevan más de 24 horas sin revisar. Por favor revisa y autoriza o rechaza cada una.`,
          isRead: false,
          actionUrl: "/dashboard/registrations",
          metadata: JSON.stringify({ pendingCount: pending.length }),
        });
      }
      return { pendingCount: pending.length };
    }),
  }),

  // ─── Expedientes de Colaboradores ────────────────────────────────────────
  employees: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getEmployeeRecordsByOwner(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const emp = await getEmployeeRecordById(input.id, ctx.user.id);
        if (!emp) throw new TRPCError({ code: "NOT_FOUND" });
        const docs = await getEmployeeDocuments(input.id, ctx.user.id);
        return { ...emp, documents: docs };
      }),

    create: protectedProcedure
      .input(z.object({
        fullName: z.string().min(2),
        position: z.string().optional(),
        department: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        curp: z.string().optional(),
        rfc: z.string().optional(),
        address: z.string().optional(),
        startDate: z.string().optional(),
        notes: z.string().optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
        employeeNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Auto-generar número si no se proporciona
        const empNumber = input.employeeNumber || await getNextEmployeeNumber(ctx.user.id);
        const emp = await createEmployeeRecord({
          ownerId: ctx.user.id,
          fullName: input.fullName,
          position: input.position ?? null,
          department: input.department ?? null,
          email: input.email || null,
          phone: input.phone ?? null,
          curp: input.curp ?? null,
          rfc: input.rfc ?? null,
          address: input.address ?? null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          notes: input.notes ?? null,
          photoUrl: input.photoUrl ?? null,
          photoKey: input.photoKey ?? null,
          status: "active",
          employeeNumber: empNumber,
        });
        return emp;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().min(2).optional(),
        position: z.string().optional(),
        department: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        curp: z.string().optional(),
        rfc: z.string().optional(),
        address: z.string().optional(),
        startDate: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, startDate, ...rest } = input;
        await updateEmployeeRecord(id, ctx.user.id, {
          ...rest,
          email: rest.email || null,
          startDate: startDate ? new Date(startDate) : undefined,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteEmployeeRecord(input.id, ctx.user.id);
        return { success: true };
      }),

    addDocument: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        type: z.enum(["cv", "ine", "domicilio", "referencia_laboral", "referencia_personal", "otro"]),
        name: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const emp = await getEmployeeRecordById(input.employeeId, ctx.user.id);
        if (!emp) throw new TRPCError({ code: "NOT_FOUND" });
        const doc = await createEmployeeDocument({
          employeeId: input.employeeId,
          ownerId: ctx.user.id,
          type: input.type,
          name: input.name,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          mimeType: input.mimeType ?? null,
          fileSize: input.fileSize ?? null,
        });
        return doc;
      }),

    deleteDocument: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteEmployeeDocument(input.id, ctx.user.id);
        return { success: true };
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const emp = await getEmployeeRecordById(input.employeeId, ctx.user.id);
        if (!emp) throw new TRPCError({ code: "NOT_FOUND" });
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.mimeType.includes("png") ? "png" : input.mimeType.includes("webp") ? "webp" : "jpg";
        const suffix = Math.random().toString(36).slice(2, 8);
        const key = `employees/${input.employeeId}/photo-${suffix}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateEmployeeRecord(input.employeeId, ctx.user.id, { photoUrl: url, photoKey: key });
        return { success: true, photoUrl: url };
      }),

    uploadDocument: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        type: z.enum(["cv", "ine", "domicilio", "referencia_laboral", "referencia_personal", "otro"]),
        name: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const emp = await getEmployeeRecordById(input.employeeId, ctx.user.id);
        if (!emp) throw new TRPCError({ code: "NOT_FOUND" });
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.mimeType.includes("pdf") ? "pdf" : input.mimeType.includes("png") ? "png" : input.mimeType.includes("webp") ? "webp" : "jpg";
        const suffix = Math.random().toString(36).slice(2, 8);
        const key = `employees/${input.employeeId}/docs/${input.type}-${suffix}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const doc = await createEmployeeDocument({
          employeeId: input.employeeId,
          ownerId: ctx.user.id,
          type: input.type,
          name: input.name,
          fileUrl: url,
          fileKey: key,
          mimeType: input.mimeType,
          fileSize: input.fileSize ?? null,
        });
        return doc;
      }),

    nextNumber: protectedProcedure.query(async ({ ctx }) => {
      const next = await getNextEmployeeNumber(ctx.user.id);
      return { employeeNumber: next };
    }),
  }),

  // ─── Reloj Checador ──────────────────────────────────────────────────────────
  attendance: router({
    checkIn: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        type: z.enum(["in", "out"]),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const emp = await getEmployeeRecordById(input.employeeId, ctx.user.id);
        if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador no encontrado" });
        const record = await createAttendanceRecord({
          employeeId: input.employeeId,
          ownerId: ctx.user.id,
          type: input.type,
          timestamp: new Date(),
          ipAddress: ctx.req.ip || null,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          notes: input.notes || null,
        });
        return record;
      }),

    getByEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return getAttendanceByEmployee(input.employeeId, ctx.user.id, input.limit ?? 50);
      }),

    getAll: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const start = input?.startDate ? new Date(input.startDate) : undefined;
        const end = input?.endDate ? new Date(input.endDate) : undefined;
        return getAttendanceByOwner(ctx.user.id, start, end);
      }),

    getLastRecord: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getLastAttendanceRecord(input.employeeId, ctx.user.id);
      }),

    getMonthlyReport: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ ctx, input }) => {
        // Calcular rango del mes
        const start = new Date(input.year, input.month - 1, 1);
        const end = new Date(input.year, input.month, 0, 23, 59, 59);
        const records = await getAttendanceByOwner(ctx.user.id, start, end);
        const employees = await getEmployeeRecordsByOwner(ctx.user.id);

        // Agrupar registros por empleado
        const reportMap = new Map<number, { employeeId: number; name: string; position: string | null; employeeNumber: string | null; records: typeof records }>();

        for (const emp of employees) {
          reportMap.set(emp.id, { employeeId: emp.id, name: emp.fullName, position: emp.position, employeeNumber: emp.employeeNumber, records: [] });
        }
        for (const rec of records) {
          const entry = reportMap.get(rec.employeeId);
          if (entry) entry.records.push(rec);
        }

        // Calcular horas trabajadas por empleado
        const report = Array.from(reportMap.values()).map(emp => {
          const days = new Map<string, { in?: Date; out?: Date }>();
          for (const rec of emp.records) {
            const day = new Date(rec.timestamp).toISOString().split("T")[0];
            if (!days.has(day)) days.set(day, {});
            const d = days.get(day)!;
            if (rec.type === "in" && !d.in) d.in = new Date(rec.timestamp);
            if (rec.type === "out") d.out = new Date(rec.timestamp);
          }
          let totalMinutes = 0;
          let daysWorked = 0;
          const dailyDetails: { date: string; checkIn: string; checkOut: string; hours: string }[] = [];
          for (const [date, d] of Array.from(days.entries())) {
            if (d.in && d.out) {
              const mins = Math.round((d.out.getTime() - d.in.getTime()) / 60000);
              if (mins > 0) { totalMinutes += mins; daysWorked++; }
              dailyDetails.push({
                date,
                checkIn: d.in.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
                checkOut: d.out.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
                hours: `${Math.floor(mins / 60)}h ${mins % 60}m`,
              });
            } else if (d.in) {
              dailyDetails.push({ date, checkIn: d.in.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }), checkOut: "—", hours: "—" });
            }
          }
          dailyDetails.sort((a, b) => a.date.localeCompare(b.date));
          return {
            ...emp,
            daysWorked,
            totalHours: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
            totalMinutes,
            dailyDetails,
          };
        });

        return { year: input.year, month: input.month, employees: report };
      }),
    // Registrar ausencia
    registerAbsence: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        date: z.string(),
        absenceType: z.enum(["rest", "sick_leave", "paid_leave", "unpaid_leave"]),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const emp = await getEmployeeRecordById(input.employeeId, ctx.user.id);
        if (!emp) throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador no encontrado" });
        const date = new Date(input.date + "T12:00:00");
        return createAbsenceRecord({ employeeId: input.employeeId, ownerId: ctx.user.id, date, absenceType: input.absenceType, comment: input.comment || null });
      }),
    // Editar registro (solo admin)
    editRecord: protectedProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["in", "out", "absence"]).optional(),
        timestamp: z.string().optional(),
        notes: z.string().max(500).optional().nullable(),
        absenceType: z.enum(["rest", "sick_leave", "paid_leave", "unpaid_leave"]).optional().nullable(),
        comment: z.string().max(500).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateAttendanceRecord(id, ctx.user.id, ctx.user.id, { ...data, timestamp: data.timestamp ? new Date(data.timestamp) : undefined });
        return { success: true };
      }),
    // Eliminar registro (solo admin)
    deleteRecord: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteAttendanceRecord(input.id, ctx.user.id);
        return { success: true };
      }),
    // Historial detallado de un colaborador
    employeeHistory: protectedProcedure
      .input(z.object({ employeeId: z.number(), year: z.number().optional(), month: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const emp = await getEmployeeRecordById(input.employeeId, ctx.user.id);
        if (!emp) throw new TRPCError({ code: "NOT_FOUND" });
        const records = await getAttendanceByEmployee(input.employeeId, ctx.user.id, 500);
        let filtered = records;
        if (input.year && input.month) {
          const start = new Date(input.year, input.month - 1, 1);
          const end = new Date(input.year, input.month, 0, 23, 59, 59);
          filtered = records.filter(r => new Date(r.timestamp) >= start && new Date(r.timestamp) <= end);
        }
        return { employee: emp, records: filtered };
      }),
  }),
  // ─── Cobros Recurrentes (Stripe Billing)) ─────────────────────────────────────
  subscriptions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getSubscriptionsByOwner(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        amount: z.number().positive().min(10), // mínimo $10 MXN
        currency: z.enum(["mxn", "usd"]).default("mxn"),
        interval: z.enum(["day", "week", "month", "year"]),
        intervalCount: z.number().int().min(1).max(12).default(1),
        customerEmail: z.string().email(),
        customerName: z.string().optional(),
        origin: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Crear producto en Stripe
        const product = await stripe.products.create({
          name: input.name,
          description: input.description || undefined,
        });

        // 2. Crear precio recurrente en Stripe
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(input.amount * 100), // centavos
          currency: input.currency,
          recurring: {
            interval: input.interval as "day" | "week" | "month" | "year",
            interval_count: input.intervalCount,
          },
        });

        // 3. Crear o recuperar cliente en Stripe
        const stripeCustomers = await stripe.customers.list({ email: input.customerEmail, limit: 1 });
        let customer = stripeCustomers.data[0];
        if (!customer) {
          customer = await stripe.customers.create({
            email: input.customerEmail,
            name: input.customerName || undefined,
            metadata: { ownerId: String(ctx.user.id) },
          });
        }

        // 4. Crear sesión de checkout para la suscripción
        const origin = input.origin || "https://kobrapay.mx";
        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: "subscription",
          line_items: [{ price: price.id, quantity: 1 }],
          success_url: `${origin}/dashboard/recurring?success=1`,
          cancel_url: `${origin}/dashboard/recurring?canceled=1`,
          allow_promotion_codes: true,
          metadata: {
            user_id: String(ctx.user.id),
            customer_email: input.customerEmail,
            customer_name: input.customerName || "",
          },
        });

        // 5. Guardar en BD con estado "incomplete" hasta que el cliente pague
        const sub = await createSubscription({
          ownerId: ctx.user.id,
          stripeProductId: product.id,
          stripePriceId: price.id,
          stripeCustomerId: customer.id,
          name: input.name,
          description: input.description || null,
          amount: Math.round(input.amount * 100),
          currency: input.currency,
          interval: input.interval,
          intervalCount: input.intervalCount,
          customerEmail: input.customerEmail,
          customerName: input.customerName || null,
          status: "incomplete",
          cancelAtPeriodEnd: false,
        });

        return { subscription: sub, checkoutUrl: session.url };
      }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getSubscriptionById(input.id, ctx.user.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        if (sub.stripeSubscriptionId) {
          await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
        }
        await updateSubscription(input.id, ctx.user.id, { cancelAtPeriodEnd: true, status: "canceled" });
        return { success: true };
      }),

    pause: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getSubscriptionById(input.id, ctx.user.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        if (sub.stripeSubscriptionId) {
          await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            pause_collection: { behavior: "void" },
          });
        }
        await updateSubscription(input.id, ctx.user.id, { status: "paused" });
        return { success: true };
      }),

    resume: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getSubscriptionById(input.id, ctx.user.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        if (sub.stripeSubscriptionId) {
          await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            pause_collection: "",
          } as Parameters<typeof stripe.subscriptions.update>[1]);
        }
        await updateSubscription(input.id, ctx.user.id, { status: "active" });
        return { success: true };
      }),
  }),

  // ─── Nómina ───────────────────────────────────────────────────────────────
  payroll: router({
    // Calcular nómina de un período
    calculate: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
        cycle: z.enum(["weekly", "biweekly", "monthly"]).default("biweekly"),
      }))
      .query(async ({ ctx, input }) => {
        const employees = await getEmployeeRecordsByOwner(ctx.user.id);
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        const attendance = await getAttendanceForPayroll(ctx.user.id, start, end);

        // Agrupar registros por empleado
        const byEmployee = new Map<number, typeof attendance>();
        for (const rec of attendance) {
          if (!byEmployee.has(rec.employeeId)) byEmployee.set(rec.employeeId, []);
          byEmployee.get(rec.employeeId)!.push(rec);
        }

        const payrollRows = employees.map(emp => {
          const records = byEmployee.get(emp.id) ?? [];
          let totalMinutes = 0;
          let checkInTime: Date | null = null;
          const days = new Set<string>();
          for (const rec of records) {
            if (rec.type === "in") {
              checkInTime = new Date(rec.timestamp);
            } else if (rec.type === "out" && checkInTime) {
              const outTime = new Date(rec.timestamp);
              totalMinutes += Math.max(0, (outTime.getTime() - checkInTime.getTime()) / 60000);
              days.add(checkInTime.toISOString().slice(0, 10));
              checkInTime = null;
            }
          }
          const totalHours = totalMinutes / 60;
          const dailyRate = parseFloat(emp.dailyRate ?? "0");
          const dailyHoursNum = parseFloat(emp.dailyHours ?? "8");
          const overtimeEnabled = emp.overtimeEnabled ?? false;
          const overtimeRateNum = parseFloat(emp.overtimeRate ?? "0");
          // Calcular horas regulares y extras por dia
          let regularHours = 0;
          let overtimeHours = 0;
          const hourlyEquiv = dailyHoursNum > 0 ? dailyRate / dailyHoursNum : 0;
          for (const day of Array.from(days)) {
            const dayRecs = records.filter(r => new Date(r.timestamp).toISOString().slice(0, 10) === day);
            let dayMinutes = 0;
            let dayIn: Date | null = null;
            for (const r of dayRecs) {
              if (r.type === "in") dayIn = new Date(r.timestamp);
              else if (r.type === "out" && dayIn) {
                dayMinutes += Math.max(0, (new Date(r.timestamp).getTime() - dayIn.getTime()) / 60000);
                dayIn = null;
              }
            }
            const dayHours = dayMinutes / 60;
            regularHours += Math.min(dayHours, dailyHoursNum);
            if (overtimeEnabled) overtimeHours += Math.max(0, dayHours - dailyHoursNum);
          }
          const grossPay = (regularHours * hourlyEquiv) + (overtimeHours * (overtimeRateNum || hourlyEquiv * 1.5));
          const imss = grossPay * 0.0175;
          const isr = grossPay > 10000 ? grossPay * 0.10 : grossPay > 5000 ? grossPay * 0.064 : 0;
          const netPay = grossPay - imss - isr;
          return {
            employeeId: emp.id,
            employeeNumber: emp.employeeNumber ?? "",
            fullName: emp.fullName,
            position: emp.position ?? "",
            department: emp.department ?? "",
            dailyRate,
            dailyHours: dailyHoursNum,
            overtimeEnabled,
            overtimeRate: overtimeRateNum,
            totalHours: Math.round(totalHours * 100) / 100,
            regularHours: Math.round(regularHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            daysWorked: days.size,
            grossPay: Math.round(grossPay * 100) / 100,
            imss: Math.round(imss * 100) / 100,
            isr: Math.round(isr * 100) / 100,
            netPay: Math.round(netPay * 100) / 100,
            paymentCycle: emp.paymentCycle ?? "biweekly",
            bankName: emp.bankName ?? "",
            clabe: emp.clabe ?? "",
            bankAccountHolder: emp.bankAccountHolder ?? "",
            restDay: emp.restDay ?? "sunday",
            status: emp.status,
          };
        });

        return { rows: payrollRows, startDate: input.startDate, endDate: input.endDate, cycle: input.cycle };
      }),

    // Actualizar datos de nómina de un colaborador
    updatePayrollData: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        dailyRate: z.string().optional(),
        dailyHours: z.string().optional(),
        restDay: z.string().optional(),
        overtimeEnabled: z.boolean().optional(),
        overtimeRate: z.string().optional(),
        paymentCycle: z.enum(["weekly", "biweekly", "monthly"]).optional(),
        bankName: z.string().optional(),
        clabe: z.string().max(18).optional(),
        bankAccountHolder: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateEmployeePayrollData(input.employeeId, ctx.user.id, {
          dailyRate: input.dailyRate,
          dailyHours: input.dailyHours,
          restDay: input.restDay,
          overtimeEnabled: input.overtimeEnabled,
          overtimeRate: input.overtimeRate,
          paymentCycle: input.paymentCycle,
          bankName: input.bankName,
          clabe: input.clabe,
          bankAccountHolder: input.bankAccountHolder,
        });
        return { success: true };
      }),

    // Historial de asistencia detallado de un colaborador
    employeeHistory: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        end.setHours(23, 59, 59, 999);
        const records = await getAttendanceForPayroll(ctx.user.id, start, end);
        const empRecords = records.filter(r => r.employeeId === input.employeeId);

        // Agrupar por día
        const byDay = new Map<string, { checkIn?: string; checkOut?: string; hoursWorked: number }>();
        let pendingIn: Date | null = null;
        for (const rec of empRecords) {
          const day = new Date(rec.timestamp).toISOString().slice(0, 10);
          if (!byDay.has(day)) byDay.set(day, { hoursWorked: 0 });
          const entry = byDay.get(day)!;
          if (rec.type === "in") {
            entry.checkIn = new Date(rec.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
            pendingIn = new Date(rec.timestamp);
          } else if (rec.type === "out") {
            entry.checkOut = new Date(rec.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
            if (pendingIn) {
              entry.hoursWorked += Math.max(0, (new Date(rec.timestamp).getTime() - pendingIn.getTime()) / 3600000);
              pendingIn = null;
            }
          }
        }

        const days = Array.from(byDay.entries()).map(([date, data]) => ({
          date,
          checkIn: data.checkIn ?? null,
          checkOut: data.checkOut ?? null,
          hoursWorked: Math.round(data.hoursWorked * 100) / 100,
        })).sort((a, b) => b.date.localeCompare(a.date));

        return { days };
      }),
  }),

  // ─── Compra de Lectores (Stripe Checkout) ───────────────────────────────────────────
  readers: router({
    createCheckout: protectedProcedure
      .input(z.object({
        readerId: z.enum(["kobrapay-nano", "kobrapay-pro"]),
        quantity: z.number().int().min(1).max(10).default(1),
        shippingName: z.string().min(1),
        shippingPhone: z.string().min(1),
        shippingAddress: z.string().min(1),
        shippingCity: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const READER_PRODUCTS = {
          "kobrapay-nano": { name: "KobraPay Nano - Lector Bluetooth", price: 129900, description: "Lector Bluetooth compacto. Acepta chip, banda magnética y NFC." },
          "kobrapay-pro": { name: "KobraPay Pro - Terminal con pantalla táctil", price: 349900, description: "Terminal con pantalla táctil 5\", WiFi + 4G, impresora de tickets." },
        };
        const product = READER_PRODUCTS[input.readerId];
        const origin = ctx.req.headers.origin || "https://kobrapay.mx";
        const session = await stripe.checkout.sessions.create({
          line_items: [{
            price_data: {
              currency: "mxn",
              product_data: {
                name: product.name,
                description: product.description,
                images: [],
              },
              unit_amount: product.price,
            },
            quantity: input.quantity,
          }],
          mode: "payment",
          customer_email: ctx.user.email ?? undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            reader_id: input.readerId,
            quantity: input.quantity.toString(),
            shipping_name: input.shippingName,
            shipping_phone: input.shippingPhone,
            shipping_address: input.shippingAddress,
            shipping_city: input.shippingCity,
          },
          success_url: `${origin}/dashboard/reader?success=1`,
          cancel_url: `${origin}/dashboard/reader?cancelled=1`,
          allow_promotion_codes: true,
        });
        return { url: session.url ?? "" };
      }),
  }),
});
export type AppRouter = typeof appRouter;

