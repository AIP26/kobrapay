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
  getUserByOpenId,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { isSuperAdmin, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { securityRouter } from "./routers/security";
import { aiAssistantRouter } from "./routers/aiAssistant";
import { apiKeysRouter } from "./routers/apiKeys";
import { pricingRouter } from "./routers/pricing";
import { notifyOwner } from "./_core/notification";
import { sendOtpEmail, sendPaymentReceipt, sendWelcomeEmail, sendInvoiceEmail, sendRefundNotification, sendSubscriptionInviteEmail, sendNewRegistrationEmail, sendRegistrationConfirmationEmail } from "./_core/email";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

// Helper: generar código OTP de 6 dígitos
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}



// Helper: calcular comisión
// Modelo de precios KobraPay (TARIFAS REALES VERIFICADAS):
//   - Stripe cobra: 3.6% del monto + $3 MXN fijos (tarifa real México, verificada en dashboard Stripe)
//   - KobraPay cobra: 1.0% del monto + $0.50 MXN fijos + IVA 16% sobre esa parte
//   - El vendedor recibe: monto - stripe_fee - kobrapay_fee_con_iva
// Suma efectiva: 4.6% + $3.50 MXN + IVA sobre la parte KobraPay
function calculateCommission(
  amount: number,
  _commissionRate: number,
  stripeFeeRate = 3.6,
  stripeFeeFixed = 3,
  kobrapayRate = 1.0,
  kobrapayFixed = 0.50,
  ivaRate = 16
) {
  const stripeFee = parseFloat(((amount * stripeFeeRate) / 100 + stripeFeeFixed).toFixed(2));
  const kobrapayBase = parseFloat(((amount * kobrapayRate) / 100 + kobrapayFixed).toFixed(2));
  const kobrapayIva = parseFloat(((kobrapayBase * ivaRate) / 100).toFixed(2));
  const kobrapayFee = parseFloat((kobrapayBase + kobrapayIva).toFixed(2));
  const netAmount = parseFloat((amount - stripeFee - kobrapayFee).toFixed(2));
  return {
    commissionAmount: kobrapayFee,  // lo que cobra KobraPay (con IVA)
    kobrapayBase,                   // comisión KobraPay antes de IVA
    kobrapayIva,                    // IVA sobre comisión KobraPay
    kobrapayFee,                    // total KobraPay (base + IVA)
    stripeFee,
    netAmount,
  };
}

export const appRouter = router({
  system: systemRouter,
  security: securityRouter,
  aiAssistant: aiAssistantRouter,
  apiKeys: apiKeysRouter,
  pricing: pricingRouter,

  auth: router({
    me: publicProcedure.query(async (opts) => {
      if (!opts.ctx.user) return null;
      // Obtener permisos del perfil del usuario (para filtrar sidebar)
      let permissions: string | null = null;
      try {
        const profile = await getUserProfile(opts.ctx.user.id);
        permissions = profile?.permissions || null;
      } catch { /* sin perfil */ }
      return {
        ...opts.ctx.user,
        isSuperAdmin: isSuperAdmin(opts.ctx.user.openId, opts.ctx.user.role),
        permissions,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { users } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

    // ─── Login propio (email + contraseña) ──────────────────────────────────────────────────────────────────────
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import('bcryptjs');
        const crypto = await import('crypto');
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq, or } = await import('drizzle-orm');
        // Verificar si ya existe
        const existing = await db.select({ id: users.id, email: users.email })
          .from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Ya existe una cuenta con este correo electrónico' });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `email_${crypto.randomBytes(16).toString('hex')}`;
        const verifyToken = crypto.randomBytes(32).toString('hex');
        await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          loginMethod: 'email',
          role: 'user',
          accountStatus: 'pending',
          isActive: true,
          onboardingCompleted: false,
          emailVerified: false,
          emailVerifyToken: verifyToken,
          passwordHash,
          lastSignedIn: new Date(),
        });
        // ─── Auto-aprobación por IA ───────────────────────────────────────────────
        // La IA evalúa el registro y aprueba automáticamente si el perfil es válido
        try {
          const { invokeLLM } = await import('./_core/llm');
          const aiResponse = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `Eres el sistema de aprobación automática de KobraPay, una plataforma de pagos mexicana.
                Tu tarea es evaluar solicitudes de registro y decidir si aprobar o rechazar.
                POLÍTICA DE APROBACIÓN: Aprueba SIEMPRE a menos que detectes señales claras de fraude (nombre ofensivo, email claramente falso como test@test.com, o datos incoherentes).
                Responde SOLO con JSON: { "decision": "approve" | "reject", "reason": "string" }`,
              },
              {
                role: 'user',
                content: `Evalúa este registro:\nNombre: ${input.name}\nEmail: ${input.email}\nFecha: ${new Date().toISOString()}`,
              },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'approval_decision',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    decision: { type: 'string', enum: ['approve', 'reject'] },
                    reason: { type: 'string' },
                  },
                  required: ['decision', 'reason'],
                  additionalProperties: false,
                },
              },
            },
          });
          const content = aiResponse?.choices?.[0]?.message?.content;
          if (content && typeof content === 'string') {
            const parsed = JSON.parse(content);
            if (parsed.decision === 'approve') {
              // Aprobar la cuenta automáticamente
              const { getDb } = await import('./db');
              const db = await getDb();
              if (db) {
                const { users: usersTable } = await import('../drizzle/schema');
                const { eq: eqOp } = await import('drizzle-orm');
                const newUser = await db.select().from(usersTable).where(eqOp(usersTable.email, input.email)).limit(1);
                if (newUser[0]) {
                  await updateUserAccountStatus(newUser[0].id, 'active');
                  // Crear como cliente de la plataforma
                  const existingClient = await getPlatformClientByEmail(input.email);
                  if (!existingClient) {
                    const owner = await getUserByOpenId(ENV.ownerOpenId);
                    if (owner) {
                      await createPlatformClient({
                        adminUserId: owner.id,
                        name: input.name,
                        email: input.email,
                        businessName: null,
                        phone: null,
                        commissionRate: '5',
                        status: 'active',
                        tempPassword: null,
                      });
                    }
                  }
                  // Enviar email de bienvenida
                  await sendWelcomeEmail({
                    to: input.email,
                    name: input.name,
                    businessName: input.name,
                  });
                  console.log(`[AutoApproval] Cuenta aprobada automáticamente por IA: ${input.email}`);
                }
              }
            }
          }
        } catch (aiErr) {
          console.error('[AutoApproval] Error en aprobación automática por IA:', aiErr);
          // Si la IA falla, el registro queda pendiente para revisión manual
        }
        // Enviar email al owner (notificación propia de KobraPay, sin Manus)
        try {
          const owner = await getUserByOpenId(ENV.ownerOpenId);
          if (owner?.email) {
            await sendNewRegistrationEmail({
              ownerEmail: owner.email,
              newUserName: input.name,
              newUserEmail: input.email,
              registeredAt: new Date(),
            });
          }
        } catch { /* no bloquear el registro si el email falla */ }
        // Enviar email de verificación al usuario que se registró
        try {
          const origin = (ctx.req.headers.origin as string) || 'https://kobrapay.mx';
          await sendRegistrationConfirmationEmail({
            userEmail: input.email,
            userName: input.name,
            verifyToken,
            origin,
          });
        } catch { /* no bloquear el registro si el email falla */ }
        return { success: true, message: 'Cuenta creada. Revisa tu correo y haz clic en el enlace de verificación para activar tu cuenta.' };
      }),

    loginEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import('bcryptjs');
        const jwt = await import('jsonwebtoken');
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');
        // Normalizar email a minúsculas para búsqueda case-insensitive
        const normalizedEmail = input.email.toLowerCase().trim();
        const found = await db.select().from(users)
          .where(sql`LOWER(${users.email}) = ${normalizedEmail}`).limit(1);
        if (!found.length || !found[0].passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' });
        }
        const user = found[0];
        if (!user.isActive) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Tu cuenta está inactiva. Contacta a soporte.' });
        }
        if (user.accountStatus === 'blocked') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Tu cuenta ha sido bloqueada. Contacta a soporte@kobrapay.mx.' });
        }
        // Cuentas pending pueden iniciar sesión pero verán la pantalla de espera (DashboardLayout lo maneja)
        const valid = await bcrypt.compare(input.password, user.passwordHash as string);
        if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Correo o contraseña incorrectos' });
        // Actualizar lastSignedIn
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
        // Generar JWT de sesión usando el mismo formato que el SDK de Manus
        const { sdk: sdkInstance } = await import('./_core/sdk');
        const sessionToken = await sdkInstance.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: 30 * 24 * 60 * 60 * 1000, // 30 días
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const crypto = await import('crypto');
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');
        const normalizedEmail = input.email.toLowerCase().trim();
        const found = await db.select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
          .from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`).limit(1);
        // Siempre responder éxito para no revelar si el email existe (anti-enumeración)
        if (!found.length || !found[0].passwordHash) {
          return { success: true, message: 'Si el correo existe, recibirás instrucciones en breve.' };
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        await db.update(users).set({ passwordResetToken: token, passwordResetExpires: expires })
          .where(eq(users.id, found[0].id));
        try {
          const origin = ctx.req.headers.origin || 'https://payprocess-tm7gpbte.manus.space';
          const resetUrl = `${origin}/reset-password?token=${token}`;
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'KobraPay <noreply@kobrapay.mx>',
            to: found[0].email!,
            subject: 'Recupera tu contraseña - KobraPay',
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663381362445/Tm7GPbTEGgvmgj5v2qy4Z4/kobrapay_logo_correct_f5aef830.png" alt="KobraPay" style="height:40px;margin-bottom:24px" />
                <h2 style="color:#111;margin-bottom:8px">Recupera tu contraseña</h2>
                <p style="color:#555">Hola ${found[0].name || 'usuario'}, recibimos una solicitud para restablecer tu contraseña.</p>
                <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#06b6d4;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Restablecer contraseña</a>
                <p style="color:#888;font-size:13px">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
              </div>
            `,
          });
        } catch { /* no bloquear si el email falla */ }
        return { success: true, message: 'Si el correo existe, recibirás instrucciones en breve.' };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import('bcryptjs');
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq, and, gt } = await import('drizzle-orm');
        const found = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.passwordResetToken, input.token),
            gt(users.passwordResetExpires, new Date())
          ))
          .limit(1);
        if (!found.length) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.' });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.update(users).set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        }).where(eq(users.id, found[0].id));
        return { success: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
      }),

    verifyEmail: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const found = await db.select({ id: users.id })
          .from(users).where(eq(users.emailVerifyToken, input.token)).limit(1);
        if (!found.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token de verificación inválido' });
        // Activar cuenta automáticamente al verificar email
        await db.update(users).set({ 
          emailVerified: true, 
          emailVerifyToken: null,
          accountStatus: 'active',
          isActive: true,
        }).where(eq(users.id, found[0].id));
        return { success: true };
      }),

    resendVerificationEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const crypto = await import('crypto');
        const found = await db.select({ id: users.id, name: users.name, email: users.email, emailVerified: users.emailVerified })
          .from(users).where(eq(users.email, input.email.toLowerCase().trim())).limit(1);
        // Por seguridad, siempre devolver éxito aunque no exista o ya esté verificado
        if (!found.length || found[0].emailVerified) {
          return { success: true };
        }
        const newToken = (crypto as typeof import('crypto')).randomBytes(32).toString('hex');
        await db.update(users).set({ emailVerifyToken: newToken }).where(eq(users.id, found[0].id));
        try {
          const origin = (ctx.req.headers.origin as string) || 'https://kobrapay.mx';
          await sendRegistrationConfirmationEmail({
            userEmail: found[0].email!,
            userName: found[0].name || 'Usuario',
            verifyToken: newToken,
            origin,
          });
        } catch { /* no bloquear si falla el email */ }
        return { success: true };
      }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().optional(),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import('bcryptjs');
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const found = await db.select({ id: users.id, passwordHash: users.passwordHash })
          .from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        if (found[0].passwordHash) {
          if (!input.currentPassword) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debes ingresar tu contraseña actual.' });
          }
          const valid = await bcrypt.compare(input.currentPassword, found[0].passwordHash as string);
          if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'La contraseña actual es incorrecta.' });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.update(users).set({ passwordHash }).where(eq(users.id, ctx.user.id));
        return { success: true, message: 'Contraseña actualizada correctamente.' };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255).optional(),
        phone: z.string().max(30).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users, vendorSettings } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        // Update name in users table
        if (input.name) {
          await db.update(users).set({ name: input.name }).where(eq(users.id, ctx.user.id));
        }
        // Update phone in vendorSettings
        if (input.phone !== undefined) {
          const existing = await db.select({ id: vendorSettings.id })
            .from(vendorSettings).where(eq(vendorSettings.userId, ctx.user.id)).limit(1);
          if (existing.length > 0) {
            await db.update(vendorSettings).set({ businessPhone: input.phone }).where(eq(vendorSettings.userId, ctx.user.id));
          } else {
            await db.insert(vendorSettings).values({ userId: ctx.user.id, businessPhone: input.phone });
          }
        }
        return { success: true };
      }),
  }),

  // ─── Configuración del vendedor ───────────────────────────────────────────
  vendor: router({
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      // Si no existe el registro, crearlo automáticamente con valores por defecto
      const existing = await getVendorSettings(ctx.user.id);
      if (!existing) {
        await upsertVendorSettings({
          userId: ctx.user.id,
          businessName: ctx.user.name || 'Mi Negocio',
          businessEmail: ctx.user.email || '',
          commissionRate: '4.6' as any,
          currency: 'MXN',
        });
      }
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
          ivaRate: z.number().min(0).max(100).optional(),
          ivaEnabled: z.boolean().optional(),
          usdExchangeRate: z.number().min(0).optional(),
          otpEnabled: z.boolean().optional(),
          selfieEnabled: z.boolean().optional(),
          chargebackText: z.string().max(1000).optional().or(z.literal("")),
          businessCountry: z.string().length(2).optional(),
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
          ivaRate: input.ivaRate !== undefined ? String(input.ivaRate) : undefined,
          ivaEnabled: input.ivaEnabled,
          usdExchangeRate: input.usdExchangeRate !== undefined ? String(input.usdExchangeRate) : undefined,
          otpEnabled: input.otpEnabled,
          selfieEnabled: input.selfieEnabled,
          chargebackText: input.chargebackText || null,
          businessCountry: input.businessCountry || "MX",
        });
      }),

    // ─── PIN de seguridad para operaciones sensibles ─────────────────────────────────────────────────────
    setDeletePin: protectedProcedure
      .input(z.object({
        newPin: z.string().length(4).regex(/^\d{4}$/, "El PIN debe ser exactamente 4 dígitos numéricos"),
        currentPin: z.string().length(4).regex(/^\d{4}$/).optional(), // requerido si ya tiene PIN
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo el superadministrador puede configurar el PIN' });
        }
        const settings = await getVendorSettings(ctx.user.id);
        // Si ya tiene PIN, verificar el PIN actual antes de cambiar
        if (settings?.deletePin) {
          if (!input.currentPin) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debes ingresar tu PIN actual para cambiarlo' });
          }
          if (settings.deletePin !== input.currentPin) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN actual incorrecto' });
          }
        }
        await upsertVendorSettings({
          userId: ctx.user.id,
          businessName: settings?.businessName || 'Mi Negocio',
          deletePin: input.newPin,
        });
        return { success: true, isNew: !settings?.deletePin };
      }),

    hasDeletePin: protectedProcedure.query(async ({ ctx }) => {
      if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) return { hasPin: false };
      const settings = await getVendorSettings(ctx.user.id);
      return { hasPin: !!settings?.deletePin };
    }),

    // ─── Perfil Público del Negocio ──────────────────────────────────────────────────────────────────────
    updatePublicProfile: protectedProcedure
      .input(z.object({
        businessSlug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones").optional().or(z.literal("")),
        publicBio: z.string().max(500).optional().or(z.literal("")),
        websiteUrl: z.string().url().optional().or(z.literal("")),
        publicProfileEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { vendorSettings } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        // Verificar que el slug no esté en uso por otro usuario
        if (input.businessSlug) {
          const existing = await db.select({ id: vendorSettings.id, userId: vendorSettings.userId })
            .from(vendorSettings)
            .where(eq(vendorSettings.businessSlug, input.businessSlug))
            .limit(1);
          if (existing.length > 0 && existing[0].userId !== ctx.user.id) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Este slug ya está en uso por otro negocio' });
          }
        }
        await upsertVendorSettings({
          userId: ctx.user.id,
          businessName: (await getVendorSettings(ctx.user.id))?.businessName || 'Mi Negocio',
          businessSlug: input.businessSlug || null,
          publicBio: input.publicBio || null,
          websiteUrl: input.websiteUrl || null,
          publicProfileEnabled: input.publicProfileEnabled,
        });
        return { success: true };
      }),

    // Obtener perfil público por slug (público, sin auth)
    getPublicProfile: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) return null;
        const { vendorSettings } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const result = await db.select({
          businessName: vendorSettings.businessName,
          businessEmail: vendorSettings.businessEmail,
          businessPhone: vendorSettings.businessPhone,
          logoUrl: vendorSettings.logoUrl,
          businessSlug: vendorSettings.businessSlug,
          publicBio: vendorSettings.publicBio,
          websiteUrl: vendorSettings.websiteUrl,
          publicProfileEnabled: vendorSettings.publicProfileEnabled,
          businessCountry: vendorSettings.businessCountry,
          currency: vendorSettings.currency,
          userId: vendorSettings.userId,
        })
          .from(vendorSettings)
          .where(and(
            eq(vendorSettings.businessSlug, input.slug),
            eq(vendorSettings.publicProfileEnabled, true)
          ))
          .limit(1);
        if (!result.length) return null;
        return result[0];
      }),

    // Obtener links públicos activos de un negocio por userId
    getPublicLinks: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) return [];
        const { paymentLinks } = await import('../drizzle/schema');
        const { eq, and, gt, isNull, or, sql } = await import('drizzle-orm');
        const now = new Date();
        return db.select({
          id: paymentLinks.id,
          token: paymentLinks.token,
          clientName: paymentLinks.clientName,
          amount: paymentLinks.amount,
          currency: paymentLinks.currency,
          description: paymentLinks.description,
          expiresAt: paymentLinks.expiresAt,
          status: paymentLinks.status,
          createdAt: paymentLinks.createdAt,
        })
          .from(paymentLinks)
          .where(and(
            eq(paymentLinks.userId, input.userId),
            sql`${paymentLinks.status} = 'active'`,
            or(isNull(paymentLinks.expiresAt), gt(paymentLinks.expiresAt, now))
          ))
          .limit(20)
          .orderBy(paymentLinks.createdAt);
      }),

    // ─── Stripe Connect ────────────────────────────────────────────────────────────────────────────────
    // Crear o continuar el onboarding de Stripe Connect
    connectOnboard: protectedProcedure
      .input(z.object({ returnUrl: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-02-25.clover" as any });
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { vendorSettings } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const settings = await getVendorSettings(ctx.user.id);
        let accountId = settings?.stripeConnectAccountId;

        // Crear cuenta Express si no existe
        if (!accountId) {
          const account = await stripeClient.accounts.create({
            type: 'express',
            country: 'MX',
            email: ctx.user.email || undefined,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: { kobrapay_user_id: String(ctx.user.id) },
          });
          accountId = account.id;
          // Guardar en BD
          if (settings) {
            await db.update(vendorSettings)
              .set({ stripeConnectAccountId: accountId, stripeConnectStatus: 'pending' })
              .where(eq(vendorSettings.userId, ctx.user.id));
          } else {
            await db.insert(vendorSettings).values({
              userId: ctx.user.id,
              businessName: ctx.user.name || 'Mi Negocio',
              stripeConnectAccountId: accountId,
              stripeConnectStatus: 'pending',
            });
          }
        }

        // Crear link de onboarding
        let accountLink;
        try {
          accountLink = await stripeClient.accountLinks.create({
            account: accountId,
            refresh_url: `${input.returnUrl}?connect=refresh`,
            return_url: `${input.returnUrl}?connect=success`,
            type: 'account_onboarding',
          });
        } catch (stripeErr: any) {
          // Error de perfil de plataforma no configurado en Stripe Dashboard
          if (
            stripeErr?.message?.includes('platform-profile') ||
            stripeErr?.message?.includes('managing losses') ||
            stripeErr?.code === 'platform_profile_incomplete'
          ) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: 'PLATFORM_PROFILE_REQUIRED',
            });
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: stripeErr?.message || 'Error al crear enlace de Stripe Connect',
          });
        }

        return { url: accountLink.url, accountId };
      }),

    // Obtener estado de la cuenta Connect
    connectStatus: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getVendorSettings(ctx.user.id);
      if (!settings?.stripeConnectAccountId) {
        return { status: 'not_started' as const, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false, accountId: null as string | null };
      }
      try {
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-02-25.clover" as any });
        const account = await stripeClient.accounts.retrieve(settings.stripeConnectAccountId);
        const { getDb } = await import('./db');
        const db = await getDb();
        if (db) {
          const { vendorSettings } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const newStatus = account.charges_enabled ? 'active' : account.details_submitted ? 'pending' : 'not_started';
          await db.update(vendorSettings).set({
            stripeConnectStatus: newStatus as any,
            stripeConnectChargesEnabled: account.charges_enabled,
            stripeConnectPayoutsEnabled: account.payouts_enabled,
            stripeConnectDetailsSubmitted: account.details_submitted,
          }).where(eq(vendorSettings.userId, ctx.user.id));
        }
        return {
          status: (account.charges_enabled ? 'active' : account.details_submitted ? 'pending' : 'not_started') as string,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          accountId: settings.stripeConnectAccountId,
          businessName: (account.business_profile as any)?.name || null as string | null,
          email: account.email || null as string | null,
        };
      } catch {
        return {
          status: settings.stripeConnectStatus || 'not_started',
          chargesEnabled: settings.stripeConnectChargesEnabled,
          payoutsEnabled: settings.stripeConnectPayoutsEnabled,
          detailsSubmitted: settings.stripeConnectDetailsSubmitted,
          accountId: settings.stripeConnectAccountId,
          businessName: null as string | null,
          email: null as string | null,
        };
      }
    }),

    // Obtener saldo disponible en la cuenta Connect
    connectBalance: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getVendorSettings(ctx.user.id);
      if (!settings?.stripeConnectAccountId || !settings.stripeConnectChargesEnabled) {
        return { available: [] as {amount: number, currency: string}[], pending: [] as {amount: number, currency: string}[] };
      }
      try {
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-02-25.clover" as any });
        const balance = await stripeClient.balance.retrieve({ stripeAccount: settings.stripeConnectAccountId });
        return {
          available: balance.available.map(b => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() })),
          pending: balance.pending.map(b => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() })),
        };
      } catch {
        // Si la clave actual no tiene acceso a la cuenta Connect (ej. test key vs live account),
        // retornar balance vacío en lugar de error 500
        return { available: [] as {amount: number, currency: string}[], pending: [] as {amount: number, currency: string}[] };
      }
    }),

    // Solicitar retiro (payout) a cuenta bancaria
    connectPayout: protectedProcedure
      .input(z.object({ amount: z.number().positive(), currency: z.string().default('mxn') }))
      .mutation(async ({ ctx, input }) => {
        const settings = await getVendorSettings(ctx.user.id);
        if (!settings?.stripeConnectAccountId || !settings.stripeConnectPayoutsEnabled) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Tu cuenta no tiene retiros habilitados aún. Completa el proceso de verificación.' });
        }
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-02-25.clover" as any });
        const payout = await stripeClient.payouts.create({
          amount: Math.round(input.amount * 100),
          currency: input.currency,
          metadata: { kobrapay_user_id: String(ctx.user.id) },
        }, { stripeAccount: settings.stripeConnectAccountId });
        return { id: payout.id, amount: payout.amount / 100, currency: payout.currency.toUpperCase(), status: payout.status, arrivalDate: new Date(payout.arrival_date * 1000) };
      }),

    // Historial de retiros de la cuenta Connect
    connectPayoutHistory: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getVendorSettings(ctx.user.id);
      if (!settings?.stripeConnectAccountId) return { payouts: [] };
      try {
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-02-25.clover" as any });
        const payouts = await stripeClient.payouts.list(
          { limit: 20 },
          { stripeAccount: settings.stripeConnectAccountId }
        );
        return {
          payouts: payouts.data.map(p => ({
            id: p.id,
            amount: p.amount / 100,
            currency: p.currency.toUpperCase(),
            status: p.status,
            arrivalDate: new Date(p.arrival_date * 1000),
            createdAt: new Date(p.created * 1000),
            description: p.description || null,
          })),
        };
      } catch {
        return { payouts: [] };
      }
    }),

    // ─── FacturAPI (Facturación SAT / CFDI) ──────────────────────────────────
    // Guardar y verificar la API Key de FacturAPI del cliente
    saveFacturApiKey: protectedProcedure
      .input(z.object({
        apiKey: z.string().min(10).max(512),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar que la API Key es válida llamando a FacturAPI
        let orgData: { id: string; name: string; rfc: string; tax_system: string } | null = null;
        try {
          const resp = await fetch('https://www.facturapi.io/v2/organizations', {
            headers: { 'Authorization': `Bearer ${input.apiKey}` },
          });
          if (!resp.ok) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'API Key de FacturAPI inválida. Verifica que sea correcta y tenga permisos.' });
          }
          const data = await resp.json() as { data: Array<{ id: string; name: string; legal: { name: string; tax_id: string; tax_system: string } }> };
          if (!data.data || data.data.length === 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'No se encontró ninguna organización en tu cuenta de FacturAPI. Crea una organización primero en facturapi.io.' });
          }
          const org = data.data[0];
          orgData = {
            id: org.id,
            name: org.legal?.name || org.name,
            rfc: org.legal?.tax_id || '',
            tax_system: org.legal?.tax_system || '',
          };
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al conectar con FacturAPI. Intenta de nuevo.' });
        }
        // Guardar en BD
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { vendorSettings } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const existing = await getVendorSettings(ctx.user.id);
        if (existing) {
          await db.update(vendorSettings).set({
            facturApiKey: input.apiKey,
            facturApiEnabled: true,
            facturApiOrganizationId: orgData.id,
            facturApiRfc: orgData.rfc,
            facturApiRazonSocial: orgData.name,
            facturApiRegimenFiscal: orgData.tax_system,
            facturApiVerifiedAt: new Date(),
          }).where(eq(vendorSettings.userId, ctx.user.id));
        } else {
          await db.insert(vendorSettings).values({
            userId: ctx.user.id,
            businessName: ctx.user.name || 'Mi Negocio',
            facturApiKey: input.apiKey,
            facturApiEnabled: true,
            facturApiOrganizationId: orgData.id,
            facturApiRfc: orgData.rfc,
            facturApiRazonSocial: orgData.name,
            facturApiRegimenFiscal: orgData.tax_system,
            facturApiVerifiedAt: new Date(),
          });
        }
        return { success: true, organizationId: orgData.id, rfc: orgData.rfc, razonSocial: orgData.name, regimenFiscal: orgData.tax_system };
      }),

    // Desactivar FacturAPI
    disableFacturApi: protectedProcedure.mutation(async ({ ctx }) => {
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { vendorSettings } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await db.update(vendorSettings).set({
        facturApiEnabled: false,
        facturApiKey: null,
        facturApiOrganizationId: null,
        facturApiRfc: null,
        facturApiRazonSocial: null,
        facturApiRegimenFiscal: null,
        facturApiVerifiedAt: null,
      }).where(eq(vendorSettings.userId, ctx.user.id));
      return { success: true };
    }),

    // Obtener estado de FacturAPI (sin exponer la API Key completa)
    getFacturApiStatus: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getVendorSettings(ctx.user.id);
      if (!settings?.facturApiEnabled || !settings.facturApiKey) {
        return { enabled: false, rfc: null as string | null, razonSocial: null as string | null, regimenFiscal: null as string | null, verifiedAt: null as Date | null, apiKeyHint: null as string | null };
      }
      return {
        enabled: true,
        rfc: settings.facturApiRfc,
        razonSocial: settings.facturApiRazonSocial,
        regimenFiscal: settings.facturApiRegimenFiscal,
        verifiedAt: settings.facturApiVerifiedAt,
        apiKeyHint: `...${settings.facturApiKey.slice(-8)}`,
      };
    }),

    // Emitir CFDI real usando FacturAPI
    issueCfdi: protectedProcedure
      .input(z.object({
        invoiceId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await getVendorSettings(ctx.user.id);
        if (!settings?.facturApiEnabled || !settings.facturApiKey || !settings.facturApiOrganizationId) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Activa FacturAPI primero en Configuración → Facturación SAT.' });
        }
        const inv = await getInvoiceById(input.invoiceId);
        if (!inv || inv.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        if (inv.status === 'issued' && inv.uuid) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta factura ya fue timbrada ante el SAT.' });
        }
        const conceptos = typeof inv.conceptos === 'string' ? JSON.parse(inv.conceptos) : inv.conceptos as Array<{ descripcion: string; cantidad: number; valorUnitario: number; importe: number }>;
        const payload = {
          type: 'I',
          customer: {
            legal_name: inv.receptorNombre,
            tax_id: inv.receptorRfc,
            tax_system: '616',
            email: inv.receptorEmail || undefined,
            address: { zip: '06600' },
          },
          items: conceptos.map((c: { descripcion: string; cantidad: number; valorUnitario: number }) => ({
            quantity: c.cantidad,
            product: {
              description: c.descripcion,
              product_key: '84111506',
              unit_key: 'E48',
              price: c.valorUnitario / 100,
              tax_included: false,
              taxes: [{ type: 'IVA', rate: 0.16 }],
            },
          })),
          currency: inv.currency || 'MXN',
          use: 'G03',
          payment_form: '99',
          payment_method: 'PUE',
        };
        let cfdiData: { id: string; uuid: string; pdf_url?: string; xml_url?: string } | null = null;
        try {
          const resp = await fetch('https://www.facturapi.io/v2/invoices', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${settings.facturApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            const errBody = await resp.json() as { message?: string };
            throw new TRPCError({ code: 'BAD_REQUEST', message: `FacturAPI: ${(errBody as any).message || 'Error al timbrar'}` });
          }
          cfdiData = await resp.json() as { id: string; uuid: string; pdf_url?: string; xml_url?: string };
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al conectar con FacturAPI para timbrar.' });
        }
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { invoices } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(invoices).set({
          uuid: cfdiData!.uuid,
          status: 'issued',
          xmlUrl: cfdiData!.xml_url || null,
          pdfUrl: cfdiData!.pdf_url || null,
          issuedAt: new Date(),
        }).where(eq(invoices.id, input.invoiceId));
        return { success: true, uuid: cfdiData!.uuid, pdfUrl: cfdiData!.pdf_url, xmlUrl: cfdiData!.xml_url };
      }),
  }),
  // ─── Gestión de clientes de la plataforma (multi-tenant) ───────────────────
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
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
      if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
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

    // Detalle COMPLETO de un cliente: perfil, vendorSettings, asociado referidor, transacciones, permisos
    getDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const client = await getPlatformClientById(input.id);
        if (!client) throw new TRPCError({ code: "NOT_FOUND" });
        const txs = client.userId ? await getTransactionsByUser(client.userId) : [];
        const succeededTxs = txs.filter((t) => t.status === "succeeded");
        const totalVolume = succeededTxs.reduce((s, t) => s + parseFloat(String(t.amount || 0)), 0);
        const totalCommission = succeededTxs.reduce((s, t) => s + parseFloat(String(t.commissionAmount || 0)), 0);
        const totalNet = succeededTxs.reduce((s, t) => s + parseFloat(String(t.netAmount || 0)), 0);
        const links = client.userId ? await getPaymentLinksByUser(client.userId) : [];
        // Perfil extendido del cliente
        const clientProfile = client.userId ? await getUserProfile(client.userId) : null;
        // Cuenta de usuario (role, accountStatus, lastSignedIn)
        const userAccount = client.userId ? await getUserById(client.userId) : null;
        // Configuracion del negocio (vendorSettings)
        const vendorConfig = client.userId ? await getVendorSettings(client.userId) : null;
        // Asociado referidor (si tiene)
        let referringAssociate: {
          commissionRecordId: number; associateId: number;
          associateName: string; associateEmail: string;
          commissionRate: number; status: string;
        } | null = null;
        if (client.userId) {
          const { getAssociateCommissionForClient } = await import("./db");
          const ac = await getAssociateCommissionForClient(client.userId);
          if (ac) {
            const assocUser = await getUserById(ac.associateUserId);
            referringAssociate = {
              commissionRecordId: ac.id,
              associateId: ac.associateUserId,
              associateName: assocUser?.name || assocUser?.email || `Asociado #${ac.associateUserId}`,
              associateEmail: assocUser?.email || "",
              commissionRate: parseFloat(String(ac.commissionRate)),
              status: ac.status,
            };
          }
        }
        // Lista de asociados disponibles para asignar (solo superadmin)
        let availableAssociates: { id: number; commissionRecordId: number; name: string; email: string }[] = [];
        if (ctx.isSuperAdmin) {
          const db2 = await import("./db").then(m => m.getDb ? m.getDb() : null);
          if (db2) {
            const { users: usersTable, associateCommissions: acTable } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const assocs = await db2.select().from(usersTable).where(eq(usersTable.role, "associate"));
            const acRecords = await db2.select().from(acTable);
            availableAssociates = assocs.map(a => {
              const rec = acRecords.find(r => r.associateUserId === a.id);
              return { id: a.id, commissionRecordId: rec?.id ?? 0, name: a.name || a.email || "", email: a.email || "" };
            }).filter(a => a.commissionRecordId > 0);
          }
        }
        return {
          client,
          permissions: clientProfile?.permissions || null,
          accountType: clientProfile?.accountType || "business",
          profile: clientProfile ? {
            fullName: clientProfile.fullName, birthDate: clientProfile.birthDate,
            curp: clientProfile.curp, rfc: clientProfile.rfc, phone: clientProfile.phone,
            businessName: clientProfile.businessName, businessType: clientProfile.businessType,
            razonSocial: clientProfile.razonSocial, direccionFiscal: clientProfile.direccionFiscal,
            codigoPostal: clientProfile.codigoPostal, ciudad: clientProfile.ciudad,
            estado: clientProfile.estado, sitioWeb: clientProfile.sitioWeb,
            clabe: clientProfile.clabe, banco: clientProfile.banco,
            titularCuenta: clientProfile.titularCuenta, avatarUrl: clientProfile.avatarUrl,
            profileCompleted: clientProfile.profileCompleted,
          } : null,
          userAccount: userAccount ? {
            role: userAccount.role, accountStatus: userAccount.accountStatus,
            lastSignedIn: userAccount.lastSignedIn, createdAt: userAccount.createdAt,
            emailVerified: userAccount.emailVerified, onboardingCompleted: userAccount.onboardingCompleted,
          } : null,
          vendorConfig: vendorConfig ? {
            businessName: vendorConfig.businessName, businessEmail: vendorConfig.businessEmail,
            businessPhone: vendorConfig.businessPhone, businessCountry: vendorConfig.businessCountry,
            stripeConnectStatus: vendorConfig.stripeConnectStatus,
            stripeConnectChargesEnabled: vendorConfig.stripeConnectChargesEnabled,
            commissionRate: parseFloat(String(vendorConfig.commissionRate)),
            businessSlug: vendorConfig.businessSlug, websiteUrl: vendorConfig.websiteUrl,
            publicProfileEnabled: vendorConfig.publicProfileEnabled,
          } : null,
          referringAssociate,
          availableAssociates,
          stats: {
            totalTransactions: txs.length, succeededTransactions: succeededTxs.length,
            totalVolume, totalCommission, totalNet,
            totalLinks: links.length,
            activeLinks: links.filter((l) => l.status === "pending").length,
            paidLinks: links.filter((l) => l.status === "paid").length,
          },
          recentTransactions: txs.slice(0, 20).map((t) => ({
            id: t.id, operationNumber: t.operationNumber,
            payerName: t.payerName, payerEmail: t.payerEmail,
            amount: parseFloat(String(t.amount || 0)),
            commissionAmount: parseFloat(String(t.commissionAmount || 0)),
            netAmount: parseFloat(String(t.netAmount || 0)),
            commissionRate: parseFloat(String(t.commissionRate || 0)),
            status: t.status, createdAt: t.createdAt,
          })),
          recentLinks: links.slice(0, 10).map((l) => ({
            id: l.id, token: l.token, clientName: l.clientName,
            amount: parseFloat(String(l.amount || 0)),
            status: l.status, createdAt: l.createdAt, paidAt: l.paidAt,
          })),
        };
      }),

    // Asignar o desasignar asociado referidor a un cliente
    assignAssociate: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        associateCommissionId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const client = await getPlatformClientById(input.clientId);
        if (!client) throw new TRPCError({ code: "NOT_FOUND" });
        if (!client.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "El cliente aun no tiene cuenta activa" });
        const db = await import("./db").then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { vendorSettings: vs } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const existing = await db.select().from(vs).where(eq(vs.userId, client.userId)).limit(1);
        if (existing.length > 0) {
          await db.update(vs).set({ referredByAssociateCommissionId: input.associateCommissionId } as any).where(eq(vs.userId, client.userId));
        } else {
          await db.insert(vs).values({ userId: client.userId, referredByAssociateCommissionId: input.associateCommissionId } as any);
        }
        return { success: true };
      }),

    // Actualizar permisos de un cliente
    updatePermissions: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        permissions: z.string(),
        accountType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const client = await getPlatformClientById(input.clientId);
        if (!client) throw new TRPCError({ code: "NOT_FOUND" });
        if (client.userId) {
          await upsertUserProfile(client.userId, {
            permissions: input.permissions,
            accountType: input.accountType,
          });
        }
        return { success: true };
      }),

    // Aplicar plantilla de sector a un cliente (asigna permisos predefinidos)
    applyTemplate: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        templateId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const { getTemplateById, templateToPermissionsJson } = await import('../shared/sectorTemplates');
        const template = getTemplateById(input.templateId);
        if (!template) throw new TRPCError({ code: "BAD_REQUEST", message: "Plantilla no encontrada" });
        const client = await getPlatformClientById(input.clientId);
        if (!client) throw new TRPCError({ code: "NOT_FOUND" });
        const permissionsJson = JSON.stringify(templateToPermissionsJson(template));
        if (client.userId) {
          await upsertUserProfile(client.userId, {
            permissions: permissionsJson,
            accountType: input.templateId,
          });
        }
        return { success: true, templateName: template.name };
      }),

    // Desglose de comisiones por negocio para el admin
    getCommissionBreakdown: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
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
          clientPhone: z.string().max(32).optional().or(z.literal("")),
          amount: z.number().positive().min(1).max(999999), // Máximo $999,999 MXN para prevenir fraude
          description: z.string().min(1).max(1000),
          currency: z.string().min(2).max(8).default("MXN"), // ISO 4217: MXN, USD, EUR, CAD, COP, BRL, CLP, PEN, GBP, AUD, JPY, etc.
          countryCode: z.string().length(2).optional(), // ISO 3166-1 alpha-2
          expiresInDays: z.number().min(1).max(365).optional(),
          requireOtp: z.boolean().default(false),
          requireSelfie: z.boolean().default(false),
          requireSignature: z.boolean().default(false),
          requireIdUpload: z.boolean().default(false),
          chargebackProtectionText: z.string().max(500).optional().or(z.literal("")),
          usdExchangeRate: z.number().min(0).default(0),
          // MSI: array de meses habilitados (ej: [3, 6, 9, 12])
          msiOptions: z.array(z.number().int().min(3).max(24)).optional(),
          // Métodos de pago permitidos: ["card","oxxo","spei","meses"] — null/vacío = todos los de la plataforma
          allowedPaymentMethods: z.array(z.enum(["card","oxxo","spei","meses"])).optional(),
          // Propina
          tipEnabled: z.boolean().default(false),
          tipSuggestions: z.array(z.number().int().min(1).max(100)).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(21); // 21 chars = ~126 bits de entropía, suficiente para prevenir enumeración
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
          clientPhone: input.clientPhone || null,
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
          allowedPaymentMethods: input.allowedPaymentMethods && input.allowedPaymentMethods.length > 0 ? JSON.stringify(input.allowedPaymentMethods) : null,
          tipEnabled: input.tipEnabled,
          tipSuggestions: input.tipSuggestions && input.tipSuggestions.length > 0 ? JSON.stringify(input.tipSuggestions) : null,
          countryCode: input.countryCode || "MX",
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

    duplicate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const links = await getPaymentLinksByUser(ctx.user.id);
        const original = links.find((l) => l.id === input.id);
        if (!original) throw new TRPCError({ code: 'NOT_FOUND', message: 'Enlace no encontrado' });
        const { nanoid: _nanoid } = await import('nanoid');
        const token = _nanoid(21);
        const settings = await getVendorSettings(ctx.user.id);
        const commissionRate = parseFloat(String(settings?.commissionRate || '0'));
        const amount = parseFloat(String(original.amount));
        const { commissionAmount, netAmount } = calculateCommission(amount, commissionRate);
        const newLink = await createPaymentLink({
          userId: ctx.user.id,
          token,
          clientName: original.clientName,
          clientEmail: original.clientEmail ?? null,
          clientPhone: original.clientPhone ?? null,
          amount: String(amount),
          currency: original.currency,
          description: original.description,
          expiresAt: undefined,
          requireOtp: original.requireOtp ?? false,
          requireSelfie: original.requireSelfie ?? false,
          requireSignature: original.requireSignature ?? false,
          requireIdUpload: original.requireIdUpload ?? false,
          chargebackProtectionText: original.chargebackProtectionText ?? '',
          usdExchangeRate: String(original.usdExchangeRate ?? '0'),
          commissionRate: String(commissionRate),
          commissionAmount: String(commissionAmount),
          msiOptions: original.msiOptions ?? null,
          allowedPaymentMethods: original.allowedPaymentMethods ?? null,
          tipEnabled: original.tipEnabled ?? false,
          tipSuggestions: original.tipSuggestions ?? null,
          countryCode: original.countryCode ?? 'MX',
        });
        return { ...newLink, netAmount };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), pin: z.string().length(4).optional() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb: _getDb } = await import('./db');
        const db = await _getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { paymentLinks: plTable } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const [link] = await db.select().from(plTable)
          .where(and(eq(plTable.id, input.id), eq(plTable.userId, ctx.user.id)))
          .limit(1);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        // Si el enlace está pagado, requerir PIN
        if (link.status === 'paid') {
          if (!input.pin) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "PIN_REQUIRED" });
          }
          const settings = await getVendorSettings(ctx.user.id);
          if (!settings?.deletePin) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tienes un PIN configurado. Ve a Ajustes > Seguridad para configurarlo.' });
          }
          if (settings.deletePin !== input.pin) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN incorrecto.' });
          }
        }
        await db.delete(plTable).where(and(eq(plTable.id, input.id), eq(plTable.userId, ctx.user.id)));
        return { success: true };
      }),

    // Eliminar múltiples enlaces (pagados requieren PIN)
    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(100), pin: z.string().length(4).optional() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb: _getDb } = await import('./db');
        const db = await _getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { paymentLinks: plTable } = await import('../drizzle/schema');
        const { eq, and, inArray } = await import('drizzle-orm');
        // Verificar cuántos de los seleccionados están pagados
        const selectedLinks = await db.select().from(plTable).where(
          and(eq(plTable.userId, ctx.user.id), inArray(plTable.id, input.ids))
        );
        const paidLinks = selectedLinks.filter(l => l.status === 'paid');
        if (paidLinks.length > 0) {
          // Hay pagados: requerir PIN
          if (!input.pin) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "PIN_REQUIRED" });
          }
          const settings = await getVendorSettings(ctx.user.id);
          if (!settings?.deletePin) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tienes un PIN configurado. Ve a Ajustes > Seguridad para configurarlo.' });
          }
          if (settings.deletePin !== input.pin) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN incorrecto.' });
          }
        }
        // Eliminar todos los seleccionados (pagados y no pagados)
        await db.delete(plTable).where(
          and(eq(plTable.userId, ctx.user.id), inArray(plTable.id, input.ids))
        );
        return { success: true };
      }),

    // Archivar/desarchivar múltiples enlaces
    bulkArchive: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(100), archived: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb: _getDb } = await import('./db');
        const db = await _getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { paymentLinks: plTable } = await import('../drizzle/schema');
        const { eq, and, inArray } = await import('drizzle-orm');
        await db.update(plTable)
          .set({ archived: input.archived })
          .where(and(eq(plTable.userId, ctx.user.id), inArray(plTable.id, input.ids)));
        return { success: true };
      }),

    // Archivar/desarchivar un solo enlace
    archive: protectedProcedure
      .input(z.object({ id: z.number(), archived: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb: _getDb } = await import('./db');
        const db = await _getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { paymentLinks: plTable } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.update(plTable)
          .set({ archived: input.archived })
          .where(and(eq(plTable.id, input.id), eq(plTable.userId, ctx.user.id)));
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
      const settings = await getVendorSettings(ctx.user.id);
      const ivaRate = settings?.ivaEnabled !== false ? parseFloat(String(settings?.ivaRate || 16)) / 100 : 0;
      const ivaPct = (ivaRate * 100).toFixed(0);

      const rows = [
        ["Fecha", "Cliente", "Email", "Descripción", "Monto Bruto", "Comisión %", "Comisión $", `IVA (${ivaPct}%)`, "Total KobraPay", "Monto Neto", "Tarjeta", "Estado"].join(","),
        ...succeeded.map((t) => {
          const commRate = parseFloat(String(t.commissionRate || 0));
          const commAmt = parseFloat(String(t.commissionAmount || 0));
          const ivaAmt = commAmt * ivaRate;
          const totalKobraPay = commAmt + ivaAmt;
          const net = parseFloat(String(t.netAmount || t.amount));
          return [
            new Date(t.createdAt).toLocaleDateString("es-MX"),
            `"${t.payerName || ""}"`,
            t.payerEmail || "",
            `"${t.metadata ? JSON.parse(t.metadata).description || "" : ""}"`,
            parseFloat(String(t.amount)).toFixed(2),
            commRate.toFixed(2) + "%",
            commAmt.toFixed(2),
            ivaAmt.toFixed(2),
            totalKobraPay.toFixed(2),
            net.toFixed(2),
            t.cardBrand ? `${t.cardBrand} ****${t.cardLast4}` : "",
            t.status,
          ].join(",");
        }),
      ];

      return { csv: rows.join("\n"), count: succeeded.length };
    }),

    // Eliminar transacción (solo superadmin, requiere PIN de 4 dígitos)
    delete: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        pin: z.string().length(4).regex(/^\d{4}$/, "El PIN debe ser 4 dígitos numéricos"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo superadmin puede eliminar transacciones
        if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo el superadministrador puede eliminar transacciones' });
        }
        // Verificar PIN
        const settings = await getVendorSettings(ctx.user.id);
        if (!settings?.deletePin) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tienes un PIN configurado. Configura tu PIN en Ajustes > Seguridad.' });
        }
        if (settings.deletePin !== input.pin) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN incorrecto. Verifica tu PIN de seguridad.' });
        }
        // Verificar que la transacción existe y pertenece al superadmin
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { transactions: txTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const existing = await db.select().from(txTable).where(eq(txTable.id, input.transactionId)).limit(1);
        if (!existing.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transacción no encontrada' });
        await db.delete(txTable).where(eq(txTable.id, input.transactionId));
        return { success: true };
      }),

    // Eliminar múltiples transacciones (solo superadmin, requiere PIN)
    deleteMany: protectedProcedure
      .input(z.object({
        transactionIds: z.array(z.number()).min(1).max(100),
        pin: z.string().length(4).regex(/^\d{4}$/, "El PIN debe ser 4 dígitos numéricos"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo el superadministrador puede eliminar transacciones' });
        }
        const settings = await getVendorSettings(ctx.user.id);
        if (!settings?.deletePin) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tienes un PIN configurado. Configura tu PIN en Ajustes > Seguridad.' });
        }
        if (settings.deletePin !== input.pin) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN incorrecto. Verifica tu PIN de seguridad.' });
        }
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { transactions: txTable } = await import('../drizzle/schema');
        const { inArray } = await import('drizzle-orm');
        await db.delete(txTable).where(inArray(txTable.id, input.transactionIds));
         return { success: true, deleted: input.transactionIds.length };
      }),
    // Listar transacciones con solicitudes de reembolso pendientes (para admin del negocio)
    listPendingRefunds: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) return [];
      const { transactions } = await import('../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');
      return db.select().from(transactions)
        .where(and(
          eq(transactions.userId, ctx.user.id),
          eq((transactions as any).refundRequestStatus, 'pending')
        ));
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
        console.log(`[OTP] Email enviado: ${emailSent}`); // No loguear el código por seguridad

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
          imageBase64: z.string().max(7_000_000, "La imagen es demasiado grande (máx 5MB)"), // ~5MB en base64
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
          imageBase64: z.string().max(7_000_000, "La firma es demasiado grande (máx 5MB)"), // canvas PNG en base64
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
          payerEmail: z.string().transform(v => v.trim().toLowerCase()).pipe(z.string().email()),
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
        // Verificar lista negra de pagadores
        try {
          const { isPayerBlacklisted } = await import('./db');
          const blocked = await isPayerBlacklisted(link.userId, input.payerEmail);
          if (blocked) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No es posible procesar este pago. Contacta al comercio para más información.",
            });
          }
        } catch (e) {
          if (e instanceof TRPCError) throw e;
          console.error('[Checkout] Error verificando lista negra:', e);
        }
        const amount = parseFloat(String(link.amount));
        const commissionRate = parseFloat(String(link.commissionRate || 0));
        const { commissionAmount, netAmount } = calculateCommission(amount, commissionRate);
        const amountCents = Math.round(amount * 100);
        const currency = link.currency.toLowerCase();

        // Verificar si el vendedor tiene Stripe Connect activo
        const vendorSettings = await getVendorSettings(link.userId);
        const connectedAccountId = vendorSettings?.stripeConnectAccountId;
        const connectEnabled = vendorSettings?.stripeConnectChargesEnabled;

        // Comisión de plataforma KobraPay: 1% del monto + $0.50 MXN fijos
        // Esto es la ganancia neta de KobraPay (Stripe cobra aparte 3.6% + $3 MXN)
        const kobraPayFeePercent = 1.0; // 1% ganancia KobraPay
        const kobraPayFeeFixed = 50; // $0.50 MXN en centavos
        const kobraPayFeeCents = Math.round(amountCents * kobraPayFeePercent / 100) + kobraPayFeeFixed;

        // Determinar métodos de pago permitidos según configuración del enlace
        // Por defecto solo tarjeta. OXXO, SPEI y meses sin intereses se activan por enlace.
        const linkAllowedMethods: string[] = link.allowedPaymentMethods
          ? JSON.parse(link.allowedPaymentMethods as string)
          : ['card'];
        // Mapear a tipos de Stripe
        const stripeMethodTypes: string[] = [];
        if (linkAllowedMethods.includes('card')) stripeMethodTypes.push('card');
        if (currency === 'mxn' && linkAllowedMethods.includes('oxxo')) stripeMethodTypes.push('oxxo');
        // SPEI (transferencia bancaria) — activado en Stripe dashboard
        if (currency === 'mxn' && linkAllowedMethods.includes('spei')) stripeMethodTypes.push('customer_balance');
        // Siempre incluir al menos tarjeta como fallback
        if (stripeMethodTypes.length === 0) stripeMethodTypes.push('card');
        // Meses sin intereses (installments) — solo para MXN con tarjetas mexicanas
        const enableInstallments = currency === 'mxn' && linkAllowedMethods.includes('meses');
        // Construir payment_method_options solo para los métodos activos
        const pmOptions: Record<string, unknown> = {};
        if (stripeMethodTypes.includes('oxxo')) {
          pmOptions.oxxo = { expires_after_days: 3 };
        }
        if (stripeMethodTypes.includes('customer_balance')) {
          pmOptions.customer_balance = {
            funding_type: 'bank_transfer',
            bank_transfer: { type: 'mx_bank_transfer' },
          };
        }
        if (enableInstallments) {
          pmOptions.card = {
            installments: { enabled: true },
          };
        }

        const paymentIntentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
          amount: amountCents,
          currency,
          payment_method_types: stripeMethodTypes as any,
          payment_method_options: Object.keys(pmOptions).length > 0 ? pmOptions as any : undefined,
          metadata: {
            paymentLinkId: String(link.id),
            paymentLinkToken: link.token,
            linkToken: link.token, // Para validar ownership en confirmPayment
            userId: String(link.userId),
            payerName: input.payerName,
            payerEmail: input.payerEmail,
            payerPhone: input.payerPhone || "",
            description: link.description,
            commissionRate: String(commissionRate),
            commissionAmount: String(commissionAmount),
            netAmount: String(netAmount),
            kobrapayFee: String(kobraPayFeeCents),
            useConnect: connectEnabled ? "true" : "false",
          },
          description: link.description,
          receipt_email: input.payerEmail,
          // Anti-contracargos: descripción clara en el estado de cuenta del cliente
          // statement_descriptor: máx 22 caracteres, solo letras/números/espacios
          statement_descriptor_suffix: (() => {
            const biz = (vendorSettings?.businessName || 'KOBRAPAY').toUpperCase().replace(/[^A-Z0-9 ]/g, '').substring(0, 22);
            return biz || 'KOBRAPAY';
          })(),
        };

        // Si el vendedor tiene Connect activo, enrutar pago y retener comisión KobraPay
        if (connectedAccountId && connectEnabled) {
          paymentIntentParams.application_fee_amount = kobraPayFeeCents;
          paymentIntentParams.transfer_data = { destination: connectedAccountId };
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

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
          allowedPaymentMethods: linkAllowedMethods,
        };
      }),

    confirmPayment: publicProcedure
      .input(z.object({ paymentIntentId: z.string(), token: z.string() }))
      .mutation(async ({ input }) => {
        const link = await getPaymentLinkByToken(input.token);
        if (!link) throw new TRPCError({ code: "NOT_FOUND" });
        // Verificar que el paymentIntent pertenece a este link (anti-fraude)
        const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
        const piLinkToken = paymentIntent.metadata?.linkToken;
        if (piLinkToken && piLinkToken !== input.token) {
          console.warn(`[Security] confirmPayment: paymentIntent ${input.paymentIntentId} no pertenece al token ${input.token}`);
          throw new TRPCError({ code: "FORBIDDEN", message: "Este pago no corresponde a este enlace" });
        }
        // Verificar que el monto del paymentIntent coincide con el monto del link (anti-manipulación de precio)
        const piAmount = paymentIntent.amount; // en centavos
        const linkAmountCents = Math.round(parseFloat(String(link.amount)) * 100);
        if (Math.abs(piAmount - linkAmountCents) > 1) {
          console.warn(`[Security] confirmPayment: monto manipulado. PI: ${piAmount}, Link: ${linkAmountCents}`);
          throw new TRPCError({ code: "BAD_REQUEST", message: "El monto del pago no coincide con el enlace" });
        }

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

    // ─── Reembolso de una transacción ───────────────────────────────────────
    refund: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer"),
        amountCents: z.number().int().positive().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { transactions } = await import('../drizzle/schema');
        const { eq, and, or } = await import('drizzle-orm');
        // Empleados pueden solicitar reembolsos de transacciones de su jefe (createdByUserId)
        const isEmployee = ctx.user.role === 'user' && ctx.user.staffRole != null;
        const txRows = await db.select().from(transactions)
          .where(
            isEmployee
              ? and(eq(transactions.id, input.transactionId), eq(transactions.userId, ctx.user.createdByUserId!))
              : and(eq(transactions.id, input.transactionId), eq(transactions.userId, ctx.user.id))
          )
          .limit(1);
        if (!txRows.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transacción no encontrada' });
        const tx = txRows[0];
        if (tx.status !== 'succeeded') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solo se pueden reembolsar transacciones exitosas' });
        }
        if (!tx.stripePaymentIntentId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta transacción no tiene referencia de pago de Stripe' });
        }
        // Si es empleado, crear solicitud pendiente de aprobación
        if (isEmployee) {
          await db.update(transactions)
            .set({
              refundRequestedBy: ctx.user.id,
              refundRequestedAt: new Date(),
              refundRequestReason: input.reason,
              refundRequestStatus: 'pending',
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, tx.id));
          // Notificar al administrador del negocio
          try {
            await notifyOwner({
              title: `⚠️ Solicitud de reembolso pendiente`,
              content: `Tu empleado solicitó un reembolso de $${tx.amount} ${tx.currency} para ${tx.payerName || 'cliente'} (${tx.payerEmail || ''}). Motivo: ${input.reason}. Ve a Mis Ventas para aprobar o rechazar.`,
            });
          } catch (_) {}
          return { success: true, pending: true, message: 'Solicitud enviada al administrador para aprobación' };
        }
        // Si es admin, ejecutar directamente
        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: tx.stripePaymentIntentId,
          reason: input.reason,
        };
        if (input.amountCents) refundParams.amount = input.amountCents;
        const refund = await stripe.refunds.create(refundParams);
        await db.update(transactions)
          .set({ status: 'refunded', refundRequestStatus: null, updatedAt: new Date() })
          .where(eq(transactions.id, tx.id));
        // Enviar email de notificación al cliente
        if (tx.payerEmail) {
          try {
            const settings = await getVendorSettings(tx.userId);
            await sendRefundNotification({
              payerEmail: tx.payerEmail,
              payerName: tx.payerName || 'Cliente',
              businessName: settings?.businessName || 'KobraPay',
              amount: tx.amount,
              currency: tx.currency,
              description: tx.metadata ? (() => { try { return JSON.parse(tx.metadata).description || undefined; } catch { return undefined; } })() : undefined,
              refundId: refund.id,
              reason: input.reason,
              refundedAt: new Date(),
            });
          } catch (err) {
            console.error('[Email] Error al enviar notificación de reembolso:', err);
          }
        }
        try {
          await notifyOwner({
            title: `↩️ Reembolso procesado: $${tx.amount} ${tx.currency}`,
            content: `Se reembolsó $${tx.amount} ${tx.currency} a ${tx.payerName || 'cliente'} (${tx.payerEmail || ''}). Motivo: ${input.reason}. Stripe refund ID: ${refund.id}`,
          });
        } catch (_) {}
        return { success: true, pending: false, refundId: refund.id, status: refund.status };
      }),

    // ─── Aprobar o rechazar solicitud de reembolso (solo admin) ────────────────────
    approveRefund: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        action: z.enum(['approve', 'reject']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo el administrador puede aprobar reembolsos' });
        }
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { transactions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const txRows = await db.select().from(transactions)
          .where(and(eq(transactions.id, input.transactionId), eq(transactions.userId, ctx.user.id)))
          .limit(1);
        if (!txRows.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transacción no encontrada' });
        const tx = txRows[0];
        if (tx.refundRequestStatus !== 'pending') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No hay solicitud de reembolso pendiente' });
        }
        if (input.action === 'reject') {
          await db.update(transactions)
            .set({ refundRequestStatus: 'rejected', updatedAt: new Date() })
            .where(eq(transactions.id, tx.id));
          return { success: true, action: 'rejected' };
        }
        // Aprobar: ejecutar el reembolso en Stripe
        if (!tx.stripePaymentIntentId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sin referencia Stripe' });
        const refund = await stripe.refunds.create({
          payment_intent: tx.stripePaymentIntentId,
          reason: (tx.refundRequestReason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
        });
        await db.update(transactions)
          .set({ status: 'refunded', refundRequestStatus: 'approved', updatedAt: new Date() })
          .where(eq(transactions.id, tx.id));
        if (tx.payerEmail) {
          try {
            const settings = await getVendorSettings(tx.userId);
            await sendRefundNotification({
              payerEmail: tx.payerEmail,
              payerName: tx.payerName || 'Cliente',
              businessName: settings?.businessName || 'KobraPay',
              amount: tx.amount,
              currency: tx.currency,
              refundId: refund.id,
              reason: tx.refundRequestReason || 'requested_by_customer',
              refundedAt: new Date(),
            });
          } catch (_) {}
        }
        return { success: true, action: 'approved', refundId: refund.id };
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

    // Eliminar un cliente/pagador (solo superadmin, requiere PIN)
    delete: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        pin: z.string().length(4).regex(/^\d{4}$/, "El PIN debe ser 4 dígitos"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo el superadministrador puede eliminar clientes' });
        }
        const settings = await getVendorSettings(ctx.user.id);
        if (!settings?.deletePin) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Configura tu PIN en Ajustes antes de eliminar' });
        if (settings.deletePin !== input.pin) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN incorrecto' });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { customers } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.delete(customers).where(and(eq(customers.email, input.email), eq(customers.userId, ctx.user.id)));
        return { success: true };
      }),

    // Eliminar TODOS los clientes del usuario (solo superadmin, requiere PIN)
    deleteAll: protectedProcedure
      .input(z.object({
        pin: z.string().length(4).regex(/^\d{4}$/, "El PIN debe ser 4 dígitos"),
        confirm: z.literal("ELIMINAR TODO"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo el superadministrador puede realizar esta acción' });
        }
        const settings = await getVendorSettings(ctx.user.id);
        if (!settings?.deletePin) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Configura tu PIN en Ajustes antes de eliminar' });
        if (settings.deletePin !== input.pin) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN incorrecto' });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { customers } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const result = await db.delete(customers).where(eq(customers.userId, ctx.user.id));
        return { success: true, deleted: result[0]?.affectedRows ?? 0 };
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
      if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
      return getContractsByAdmin(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
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
    getByClientEmail: protectedProcedure
      .input(z.object({ clientEmail: z.string().email() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
        const allContracts = await getContractsByAdmin(ctx.user.id);
        return allContracts.filter(c => c.clientEmail.toLowerCase() === input.clientEmail.toLowerCase());
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
        if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
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
        if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
        const { id, commissionRate, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (commissionRate !== undefined) data.commissionRate = String(commissionRate);
        return updateContract(id, data);
      }),

    sendToClient: protectedProcedure
      .input(z.object({ id: z.number(), expiresInDays: z.number().int().min(1).max(30).default(7) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
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
        // Notificar al admin que el cliente firmó
        try {
          const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
          if (db) {
            const { users: usersTable } = await import('../drizzle/schema');
            const { eq: eqOp } = await import('drizzle-orm');
            const adminUser = await db.select().from(usersTable).where(eqOp(usersTable.id, contract.createdByUserId)).limit(1);
            if (adminUser[0]) {
              await createNotification({
                userId: adminUser[0].id,
                type: 'contract_signed',
                title: '\u2712\ufe0f Contrato firmado por el cliente',
                message: `${contract.clientName} ha firmado el contrato No. KP-${String(contract.id).padStart(5, '0')}. Entra a Contratos para firmarlo t\u00fa tambi\u00e9n.`,
                actionUrl: '/dashboard/contracts',
                metadata: JSON.stringify({ contractId: contract.id, clientName: contract.clientName }),
              });
            }
          }
          await notifyOwner({
            title: `\u2712\ufe0f Contrato firmado \u2014 ${contract.clientName}`,
            content: `El cliente ${contract.clientName} (${contract.clientEmail}) firm\u00f3 el contrato No. KP-${String(contract.id).padStart(5, '0')}. Comisi\u00f3n: ${contract.commissionRate}%. Entra al panel para firmarlo.`,
          });
        } catch (e) {
          console.warn('[Contracts] Error enviando notificaci\u00f3n de firma:', e);
        }
        return { success: true, signatureUrl };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteContract } = await import('./db');
        const contract = await getContractById(input.id);
        if (!contract || contract.createdByUserId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        await deleteContract(input.id, ctx.user.id);
        return { success: true };
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
    adminSign: protectedProcedure
      .input(z.object({
        contractId: z.number(),
        signatureData: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') throw new TRPCError({ code: "FORBIDDEN" });
        const contract = await getContractById(input.contractId);
        if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
        const base64Data = input.signatureData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileKey = `contracts/admin-signatures/${contract.id}-admin-${Date.now()}.png`;
        const { url: adminSignatureUrl } = await storagePut(fileKey, buffer, 'image/png');
        await updateContract(contract.id, {
          adminSignatureUrl,
          adminSignedAt: new Date(),
          adminSignedByName: ctx.user.name || ctx.user.email,
        });
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY || '');
          await resend.emails.send({
            from: 'KobraPay Contratos <noreply@kobrapay.mx>',
            to: contract.clientEmail,
            subject: `Contrato firmado por KobraPay — ${contract.clientName}`,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0e7490">Contrato Firmado por KobraPay</h2>
              <p>Hola <strong>${contract.clientName}</strong>,</p>
              <p>KobraPay ha firmado tu contrato de servicios.</p>
              <ul style="background:#f0f9ff;padding:16px;border-radius:8px;border:1px solid #bae6fd">
                <li>Contrato No. KP-${String(contract.id).padStart(5, '0')}</li>
                <li>Comisión: ${contract.commissionRate}%</li>
                <li>Firmado el: ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
              </ul>
              <p style="color:#6b7280;font-size:13px">Contacto: soporte@kobrapay.mx</p>
            </div>`,
          });
        } catch (e) {
          console.warn('[Contracts] Error enviando email de firma admin:', e);
        }
        return { success: true, adminSignatureUrl };
      }),
  }),
  // ─── Vendedores/Afiliados (solo super-admin)) ──────────────────────────────────
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
        paymentCycle: z.enum(["weekly", "biweekly", "monthly", "manual", "custom_day"]).default("biweekly"),
        paymentDay: z.number().min(1).max(28).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const referralCode = nanoid(8).toUpperCase();
        // Si es custom_day, guardamos como "day_N"
        const paymentCycle = input.paymentCycle === "custom_day"
          ? `day_${input.paymentDay ?? 1}`
          : input.paymentCycle;
        return createSalesAgent({
          createdByUserId: ctx.user.id,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          commissionRate: String(input.commissionRate),
          bankName: input.bankName || null,
          clabe: input.clabe || null,
          bankAccountHolder: input.bankAccountHolder || null,
          paymentCycle,
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
        paymentCycle: z.enum(["weekly", "biweekly", "monthly", "manual", "custom_day"]).optional(),
        paymentDay: z.number().min(1).max(28).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, commissionRate, paymentCycle, paymentDay, ...rest } = input;
        const data: Record<string, unknown> = { ...rest };
        if (commissionRate !== undefined) data.commissionRate = String(commissionRate);
        if (paymentCycle !== undefined) {
          data.paymentCycle = paymentCycle === 'custom_day' ? `day_${paymentDay ?? 1}` : paymentCycle;
        }
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
      // Admins normales pueden ver sus propias comisiones; superadmin ve todo
      const isAdmin = ctx.user.role === 'admin';
      if (!ctx.isSuperAdmin && !isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await import('./db').then(m => m.getDb());
      if (!db) return { totalEarned: 0, totalTransactions: 0, clients: [] };
      const { eq, and, desc, sql } = await import('drizzle-orm');
      const { transactions, users, platformClients } = await import('../drizzle/schema');

      // Obtener transacciones exitosas (filtrar por userId si es admin normal)
      const txWhere = ctx.isSuperAdmin
        ? eq(transactions.status, 'succeeded')
        : and(eq(transactions.status, 'succeeded'), eq(transactions.userId, ctx.user.id));
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
        cardLast4: transactions.cardLast4,
        cardBrand: transactions.cardBrand,
        operationNumber: transactions.operationNumber,
        currency: transactions.currency,
        paymentLinkId: transactions.paymentLinkId,
      }).from(transactions)
        .where(txWhere)
        .orderBy(desc(transactions.createdAt));

      // Obtener clientes de la plataforma (filtrar por adminUserId si es admin normal)
      const clientsWhere = ctx.isSuperAdmin
        ? undefined
        : eq(platformClients.adminUserId, ctx.user.id);
      const clients = await db.select({
        id: platformClients.id,
        userId: platformClients.userId,
        name: platformClients.name,
        email: platformClients.email,
        businessName: platformClients.businessName,
        commissionRate: platformClients.commissionRate,
        status: platformClients.status,
      }).from(platformClients)
        .where(clientsWhere);

      // Obtener datos de usuarios y vendor_settings para fallback
      const { vendorSettings } = await import('../drizzle/schema');
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      }).from(users);
      const allVendorSettings = await db.select({
        userId: vendorSettings.userId,
        businessName: vendorSettings.businessName,
      }).from(vendorSettings);
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      const vendorMap = new Map(allVendorSettings.map(v => [v.userId, v]));

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

      // Poblar clientMap con clientes registrados (usando userId si existe)
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

      // También agregar entradas para usuarios con transacciones que no están en platform_clients
      for (const tx of allTxs) {
        if (!clientMap.has(tx.userId)) {
          const u = userMap.get(tx.userId);
          const vs = vendorMap.get(tx.userId);
          // Buscar en platform_clients por email del usuario
          const matchedClient = clients.find(c => c.email?.toLowerCase() === u?.email?.toLowerCase());
          clientMap.set(tx.userId, {
            clientId: matchedClient?.id ?? tx.userId,
            name: u?.name || u?.email || `Usuario #${tx.userId}`,
            email: u?.email || '',
            businessName: vs?.businessName || matchedClient?.businessName || null,
            commissionRate: matchedClient?.commissionRate || null,
            status: 'active',
            totalTransactions: 0,
            totalVolume: 0,
            totalCommission: 0,
            lastTransactionAt: null,
          });
        }
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

      // Enriquecer transacciones con nombre del cliente (negocio)
      const enrichedTxs = allTxs.map(tx => {
        const clientData = clientMap.get(tx.userId);
        return {
          ...tx,
          clientName: clientData?.businessName || clientData?.name ||
            vendorMap.get(tx.userId)?.businessName ||
            userMap.get(tx.userId)?.name ||
            userMap.get(tx.userId)?.email ||
            'Sin nombre',
          clientEmail: clientData?.email || userMap.get(tx.userId)?.email || null,
        };
      });
      return {
        totalEarned,
        totalTransactions: allTxs.length,
        clients: Array.from(clientMap.values()).sort((a, b) => b.totalCommission - a.totalCommission),
        monthly,
        transactions: enrichedTxs,
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

    deleteDocument: protectedProcedure
      .input(z.object({
        docType: z.enum(["ine", "domicilio", "acta"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const fieldMap: Record<string, string> = { ine: "ineUrl", domicilio: "domicilioUrl", acta: "actaConstitutiva" };
        await upsertUserProfile(ctx.user.id, { [fieldMap[input.docType]]: null } as Parameters<typeof upsertUserProfile>[1]);
        return { success: true };
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
    // Enviar evidencia a Stripe para disputar un contracargo
    submitEvidence: protectedProcedure
      .input(z.object({
        chargebackId: z.number(),
        stripeDisputeId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getAllChargebacks, getPaymentConsentByTransaction } = await import('./db');
        // Verificar que el chargeback pertenece al usuario
        const cbs = await getChargebacksByUser(ctx.user.id);
        const cb = cbs.find(c => c.id === input.chargebackId);
        if (!cb) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contracargo no encontrado' });
        if (!cb.stripeDisputeId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Sin ID de disputa en Stripe' });
        // Obtener evidencia: consentimiento + datos de transacción
        const consent = cb.transactionId ? await getPaymentConsentByTransaction(cb.transactionId) : null;
        const txs = await getTransactionsByUser(ctx.user.id);
        const tx = cb.transactionId ? txs.find(t => t.id === cb.transactionId) : null;
        const vendorCfg = await getVendorSettings(ctx.user.id);
        // Construir evidencia de texto para Stripe
        const consentText = consent ? [
          `CONSENTIMIENTO EXPLÍCITO DEL PAGADOR:`,
          `  - Nombre: ${consent.payerName}`,
          `  - Email: ${consent.payerEmail}`,
          `  - Teléfono: ${consent.payerPhone || 'N/A'}`,
          `  - IP del dispositivo: ${consent.ipAddress || 'N/A'}`,
          `  - Timestamp de aceptación: ${new Date(consent.consentAt).toLocaleString('es-MX')}`,
          `  - Monto aceptado: $${consent.amountAccepted} ${consent.currency}`,
          `  - User-Agent: ${consent.userAgent || 'N/A'}`,
          `  - Términos aceptados: ${consent.termsSnapshot ? 'Sí — ' + consent.termsSnapshot.substring(0, 300) : 'Sí'}`,
        ].join('\n') : 'Sin registro de consentimiento digital';
        const evidencePayload: Record<string, string> = {
          product_description: (tx?.metadata ? (() => { try { return JSON.parse(String(tx.metadata)).description || ''; } catch { return ''; } })() : '') || 'Servicio procesado a través de KobraPay',
          customer_name: tx?.payerName || consent?.payerName || 'Cliente',
          customer_email_address: tx?.payerEmail || consent?.payerEmail || '',
          billing_address: `${tx?.payerName || ''} - ${tx?.payerEmail || ''}`,
          service_date: tx ? new Date(tx.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          uncategorized_text: [
            `EVIDENCIA DE PAGO - KobraPay`,
            `Negocio: ${vendorCfg?.businessName || 'KobraPay'}`,
            `Monto: $${tx?.amount || cb.amount / 100} ${tx?.currency || cb.currency}`,
            `Fecha de pago: ${tx ? new Date(tx.createdAt).toLocaleString('es-MX') : 'N/A'}`,
            `N° Operación: ${tx?.operationNumber || 'N/A'}`,
            `Stripe PI: ${tx?.stripePaymentIntentId || 'N/A'}`,
            `Selfie del pagador: ${tx?.selfieUrl ? 'Disponible — ' + tx.selfieUrl : 'No disponible'}`,
            `Identificación del pagador: ${tx?.idDocumentUrl ? 'Disponible — ' + tx.idDocumentUrl : 'No disponible'}`,
            consentText,
          ].join('\n'),
        };
        // Subir archivos de evidencia (selfie + ID) a Stripe si están disponibles
        const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' as any });
        if (tx?.selfieUrl) {
          try {
            const selfieResp = await fetch(tx.selfieUrl);
            const selfieBuffer = Buffer.from(await selfieResp.arrayBuffer());
            const selfieFile = await stripe.files.create({
              purpose: 'dispute_evidence',
              file: { data: selfieBuffer, name: 'selfie_pagador.jpg', type: 'image/jpeg' },
            });
            (evidencePayload as any).customer_signature = selfieFile.id;
          } catch { /* selfie no crítica */ }
        }
        if (tx?.idDocumentUrl) {
          try {
            const idResp = await fetch(tx.idDocumentUrl);
            const idBuffer = Buffer.from(await idResp.arrayBuffer());
            const idFile = await stripe.files.create({
              purpose: 'dispute_evidence',
              file: { data: idBuffer, name: 'identificacion_pagador.jpg', type: 'image/jpeg' },
            });
            (evidencePayload as any).uncategorized_file = idFile.id;
          } catch { /* ID no crítico */ }
        }
        await stripe.disputes.update(cb.stripeDisputeId, {
          evidence: evidencePayload as any,
          submit: true,
        });
        // Actualizar estado a under_review
        await updateChargebackStatus(cb.id, 'under_review', 'Evidencia enviada automáticamente a Stripe');
        return { success: true, message: 'Evidencia enviada a Stripe correctamente' };
      }),
    // Guardar consentimiento del pagador antes del pago
    saveConsent: publicProcedure
      .input(z.object({
        paymentToken: z.string(),
        payerName: z.string(),
        payerEmail: z.string().email(),
        payerPhone: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        serviceDescription: z.string().optional(),
        amountAccepted: z.string(),
        currency: z.string().default('MXN'),
        termsSnapshot: z.string().optional(),
        consentAt: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createPaymentConsent } = await import('./db');
        await createPaymentConsent({
          paymentToken: input.paymentToken,
          payerName: input.payerName,
          payerEmail: input.payerEmail,
          payerPhone: input.payerPhone,
          ipAddress: input.ipAddress || (ctx.req.headers['x-forwarded-for'] as string) || ctx.req.socket?.remoteAddress || '',
          userAgent: input.userAgent || (ctx.req.headers['user-agent'] as string) || '',
          serviceDescription: input.serviceDescription,
          amountAccepted: input.amountAccepted,
          currency: input.currency,
          termsSnapshot: input.termsSnapshot,
          consentAt: input.consentAt,
          createdAt: Date.now(),
        });
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
        birthDate: z.string().optional().or(z.literal("")),
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
          birthDate: input.birthDate || null,
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
        birthDate: z.string().optional().or(z.literal("")),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, startDate, birthDate, ...rest } = input;
        await updateEmployeeRecord(id, ctx.user.id, {
          ...rest,
          email: rest.email || null,
          startDate: startDate ? new Date(startDate) : undefined,
          birthDate: birthDate !== undefined ? (birthDate || null) : undefined,
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
        type: z.enum(["manual_puesto", "cv", "ine", "domicilio", "referencia_laboral", "referencia_personal", "otro"]),
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
        type: z.enum(["manual_puesto", "cv", "ine", "domicilio", "referencia_laboral", "referencia_personal", "otro"]),
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
        sourcePlatform: z.enum(["kobrapay", "brokerhub", "contentai"]).default("kobrapay"),
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
          sourcePlatform: input.sourcePlatform || "kobrapay",
        });

        // 6. Obtener nombre del negocio del vendedor
        const settings = await getVendorSettings(ctx.user.id);
        const businessName = settings?.businessName || ctx.user.name || 'KobraPay';

        // 7. Enviar email al cliente con el link de checkout (no abrir para el admin)
        let emailSent = false;
        if (session.url) {
          emailSent = await sendSubscriptionInviteEmail({
            customerEmail: input.customerEmail,
            customerName: input.customerName || null,
            planName: input.name,
            amount: Math.round(input.amount * 100),
            currency: input.currency,
            interval: input.interval,
            intervalCount: input.intervalCount,
            checkoutUrl: session.url,
            businessName,
          });
        }

        return { subscription: sub, checkoutUrl: session.url, emailSent };
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

    resendLink: protectedProcedure
      .input(z.object({ id: z.number(), origin: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getSubscriptionById(input.id, ctx.user.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        if (sub.status !== "incomplete") throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se puede reenviar el link de suscripciones pendientes" });

        // Crear nueva sesión de checkout con el mismo precio
        const origin = input.origin || "https://kobrapay.mx";
        const customerId: string | undefined = sub.stripeCustomerId ?? undefined;
        const priceId: string = sub.stripePriceId ?? '';
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/dashboard/recurring?success=1`,
          cancel_url: `${origin}/dashboard/recurring?canceled=1`,
          allow_promotion_codes: true,
          metadata: {
            user_id: String(ctx.user.id),
            customer_email: sub.customerEmail,
            customer_name: sub.customerName || "",
          },
        });

        // Intentar reenviar email
        const settings = await getVendorSettings(ctx.user.id);
        const businessName = settings?.businessName || ctx.user.name || 'KobraPay';
        let emailSent = false;
        if (session.url) {
          emailSent = await sendSubscriptionInviteEmail({
            customerEmail: sub.customerEmail,
            customerName: sub.customerName || null,
            planName: sub.name,
            amount: sub.amount,
            currency: sub.currency,
            interval: sub.interval,
            intervalCount: sub.intervalCount,
            checkoutUrl: session.url,
            businessName,
          });
        }

        return { checkoutUrl: session.url, emailSent };
      }),

    // Listar suscripciones externas (BrokerHub, ContentAI) para el panel Mis Ventas
    listExternal: protectedProcedure.query(async ({ ctx }) => {
      const subs = await getSubscriptionsByOwner(ctx.user.id);
      // Retornar todas las suscripciones con su plataforma de origen para mostrar en Mis Ventas
      return subs.map((s) => ({
        id: s.id,
        type: "subscription" as const,
        sourcePlatform: (s as any).sourcePlatform || "kobrapay",
        planName: s.name,
        customerEmail: s.customerEmail,
        customerName: s.customerName || null,
        amount: s.amount,
        currency: s.currency,
        interval: s.interval,
        status: s.status,
        createdAt: s.createdAt,
      }));
    }),

    // Estadísticas de suscripciones externas para el Dashboard
    externalStats: protectedProcedure.query(async ({ ctx }) => {
      const subs = await getSubscriptionsByOwner(ctx.user.id);
      const activeSubs = subs.filter((s) => s.status === "active");
      const totalMonthlyRevenue = activeSubs.reduce((sum, s) => {
        // Convertir todo a mensual para comparar
        const monthlyAmount = s.interval === "year" ? s.amount / 12 :
          s.interval === "week" ? s.amount * 4.33 :
          s.interval === "day" ? s.amount * 30 :
          s.amount; // month
        return sum + monthlyAmount;
      }, 0);
      const byPlatform: Record<string, { count: number; monthlyRevenue: number }> = {};
      for (const s of activeSubs) {
        const platform = (s as any).sourcePlatform || "kobrapay";
        if (!byPlatform[platform]) byPlatform[platform] = { count: 0, monthlyRevenue: 0 };
        byPlatform[platform].count++;
        const monthlyAmount = s.interval === "year" ? s.amount / 12 :
          s.interval === "week" ? s.amount * 4.33 :
          s.interval === "day" ? s.amount * 30 :
          s.amount;
        byPlatform[platform].monthlyRevenue += monthlyAmount;
      }
      return {
        totalActive: activeSubs.length,
        totalMonthlyRevenue,
        byPlatform,
      };
    }),

    // Obtener detalle de una suscripción con historial de pagos de Stripe
    getDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { subscriptions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const found = await db.select().from(subscriptions)
          .where(and(eq(subscriptions.id, input.id), eq(subscriptions.ownerId, ctx.user.id)))
          .limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const sub = found[0];
        // Obtener historial de pagos de Stripe si hay stripeSubscriptionId
        let invoices: any[] = [];
        if (sub.stripeSubscriptionId) {
          try {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
            const invoiceList = await stripe.invoices.list({
              subscription: sub.stripeSubscriptionId,
              limit: 24,
            });
            invoices = invoiceList.data.map((inv) => ({
              id: inv.id,
              amount: inv.amount_paid,
              currency: inv.currency,
              status: inv.status,
              paidAt: inv.status_transitions?.paid_at ? inv.status_transitions.paid_at * 1000 : null,
              invoiceUrl: inv.hosted_invoice_url,
              periodStart: inv.period_start * 1000,
              periodEnd: inv.period_end * 1000,
            }));
          } catch (e) {
            // Si Stripe falla, retornar vacío
            invoices = [];
          }
        }
        return { ...sub, invoices };
      }),

    // Cancelar una suscripción con opción de inmediata o al final del período
    cancelWithOptions: protectedProcedure
      .input(z.object({ id: z.number(), immediately: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { subscriptions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const found = await db.select().from(subscriptions)
          .where(and(eq(subscriptions.id, input.id), eq(subscriptions.ownerId, ctx.user.id)))
          .limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const sub = found[0];
        if (sub.stripeSubscriptionId) {
          try {
            const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });
            if (input.immediately) {
              await stripeClient.subscriptions.cancel(sub.stripeSubscriptionId);
            } else {
              await stripeClient.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
            }
          } catch (e: any) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message });
          }
        }
        // Actualizar en BD
        await db.update(subscriptions)
          .set(input.immediately ? { status: 'canceled' } : { cancelAtPeriodEnd: true })
          .where(eq(subscriptions.id, input.id));
        return { success: true };
      }),

    // Obtener suscripciones con estado past_due o incomplete para alertas
    getOverdue: protectedProcedure.query(async ({ ctx }) => {
      const subs = await getSubscriptionsByOwner(ctx.user.id);
      return subs.filter((s) => s.status === 'past_due' || s.status === 'incomplete');
    }),

    // Exportar suscripciones externas como CSV con desglose por plataforma
    exportCsv: protectedProcedure
      .input(z.object({ platform: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const subs = await getSubscriptionsByOwner(ctx.user.id);
        const platformLabels: Record<string, string> = { brokerhub: 'BrokerHub', contentai: 'ContentAI', kobrapay: 'KobraPay' };
        const filtered = input.platform && input.platform !== 'all'
          ? subs.filter((s) => (s as any).sourcePlatform === input.platform)
          : subs;
        const rows = [
          ['Fecha Alta', 'Cliente', 'Email', 'Plan', 'Monto', 'Moneda', 'Intervalo', 'Estado', 'Plataforma', 'Stripe Sub ID'].join(','),
          ...filtered.map((s) => {
            const platform = (s as any).sourcePlatform || 'kobrapay';
            const amountFormatted = ((s.amount || 0) / 100).toFixed(2);
            return [
              new Date(s.createdAt).toLocaleDateString('es-MX'),
              `"${s.customerName || ''}"`,
              s.customerEmail || '',
              `"${s.name}"`,
              amountFormatted,
              (s.currency || 'mxn').toUpperCase(),
              s.interval || 'month',
              s.status,
              platformLabels[platform] || platform,
              s.stripeSubscriptionId || '',
            ].join(',');
          }),
        ];
        return { csv: rows.join('\n'), count: filtered.length };
      }),

    // Solo superadmin puede eliminar suscripciones canceladas
    deleteCanceled: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo superadmin puede eliminar suscripciones' });
        }
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { subscriptions } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        // Verificar que existe y está cancelada
        const found = await db.select().from(subscriptions).where(eq(subscriptions.id, input.id)).limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const sub = found[0];
        if (sub.status !== 'canceled' && !sub.cancelAtPeriodEnd) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solo se pueden eliminar suscripciones canceladas' });
        }
        await db.delete(subscriptions).where(eq(subscriptions.id, input.id));
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

  // ─── AGENDA MÉDICA ────────────────────────────────────────────────────────────
  medical: router({
    patients: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getMedicalPatientsByOwner } = await import('./db');
        return getMedicalPatientsByOwner(ctx.user.id);
      }),
      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          const { getMedicalPatientById } = await import('./db');
          return getMedicalPatientById(input.id, ctx.user.id);
        }),
      create: protectedProcedure
        .input(z.object({
          firstName: z.string().min(1).max(128),
          lastName: z.string().min(1).max(128),
          email: z.string().email().optional().or(z.literal('')),
          phone: z.string().max(32).optional().or(z.literal('')),
          birthDate: z.string().optional().or(z.literal('')),
          gender: z.string().optional().or(z.literal('')),
          address: z.string().optional().or(z.literal('')),
          photoUrl: z.string().optional().or(z.literal('')),
          bloodType: z.string().optional().or(z.literal('')),
          allergies: z.string().optional().or(z.literal('')),
          medicalNotes: z.string().optional().or(z.literal('')),
        }))
        .mutation(async ({ ctx, input }) => {
          const { createMedicalPatient } = await import('./db');
          return createMedicalPatient({
            ownerId: ctx.user.id,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email || null,
            phone: input.phone || null,
            birthDate: input.birthDate || null,
            gender: input.gender || null,
            address: input.address || null,
            photoUrl: input.photoUrl || null,
            bloodType: input.bloodType || null,
            allergies: input.allergies || null,
            medicalNotes: input.medicalNotes || null,
          });
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          firstName: z.string().min(1).max(128).optional(),
          lastName: z.string().min(1).max(128).optional(),
          email: z.string().email().optional().or(z.literal('')),
          phone: z.string().max(32).optional().or(z.literal('')),
          birthDate: z.string().optional().or(z.literal('')),
          gender: z.string().optional().or(z.literal('')),
          address: z.string().optional().or(z.literal('')),
          photoUrl: z.string().optional().or(z.literal('')),
          bloodType: z.string().optional().or(z.literal('')),
          allergies: z.string().optional().or(z.literal('')),
          medicalNotes: z.string().optional().or(z.literal('')),
        }))
        .mutation(async ({ ctx, input }) => {
          const { updateMedicalPatient } = await import('./db');
          const { id, ...data } = input;
          await updateMedicalPatient(id, ctx.user.id, data);
          return { success: true };
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const { deleteMedicalPatient } = await import('./db');
          await deleteMedicalPatient(input.id, ctx.user.id);
          return { success: true };
        }),
    }),

    appointments: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const { getMedicalAppointmentsByOwner } = await import('./db');
        return getMedicalAppointmentsByOwner(ctx.user.id);
      }),
      listByPatient: protectedProcedure
        .input(z.object({ patientId: z.number() }))
        .query(async ({ ctx, input }) => {
          const { getMedicalAppointmentsByPatient } = await import('./db');
          return getMedicalAppointmentsByPatient(input.patientId, ctx.user.id);
        }),
      create: protectedProcedure
        .input(z.object({
          patientId: z.number(),
          title: z.string().min(1).max(255),
          appointmentDate: z.string(),
          durationMinutes: z.number().default(30),
          notes: z.string().optional().or(z.literal('')),
        }))
        .mutation(async ({ ctx, input }) => {
          const { createMedicalAppointment, getMedicalPatientById } = await import('./db');
          const { sendAppointmentEmail } = await import('./_core/email');
          const appt = await createMedicalAppointment({
            ownerId: ctx.user.id,
            patientId: input.patientId,
            title: input.title,
            appointmentDate: new Date(input.appointmentDate),
            durationMinutes: input.durationMinutes,
            notes: input.notes || null,
            status: 'scheduled',
            reminderSent: false,
          });
          try {
            const patient = await getMedicalPatientById(input.patientId, ctx.user.id);
            if (patient?.email) {
              const apptDate = new Date(input.appointmentDate);
              const timeStr = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' });
              const patientFullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');
              const vendorSett = await getVendorSettings(ctx.user.id);
              await sendAppointmentEmail({
                patientEmail: patient.email,
                patientName: patientFullName,
                doctorName: ctx.user.name || 'Su médico',
                businessName: vendorSett?.businessName || ctx.user.name || 'Consultorio',
                appointmentDate: input.appointmentDate,
                appointmentTime: timeStr,
                reason: input.title,
                notes: input.notes || undefined,
                action: 'created',
              });
            }
          } catch (emailErr) {
            console.warn('[Agenda] No se pudo enviar email de cita:', emailErr);
          }
          return appt;
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          title: z.string().min(1).max(255).optional(),
          appointmentDate: z.string().optional(),
          durationMinutes: z.number().optional(),
          status: z.string().optional(),
          notes: z.string().optional().or(z.literal('')),
          patientEmail: z.string().optional(),
          patientName: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const { updateMedicalAppointment } = await import('./db');
          const { sendAppointmentEmail } = await import('./_core/email');
          const { id, appointmentDate, patientEmail, patientName, ...rest } = input;
          await updateMedicalAppointment(id, ctx.user.id, {
            ...rest,
            ...(appointmentDate ? { appointmentDate: new Date(appointmentDate) } : {}),
          });
          if (patientEmail && patientName && appointmentDate) {
            try {
              const isCancelled = input.status === 'cancelled';
              const apptDate = new Date(appointmentDate);
              const timeStr = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' });
              await sendAppointmentEmail({
                patientEmail,
                patientName,
                doctorName: ctx.user.name || 'Su médico',
                businessName: ctx.user.name || 'Consultorio',
                appointmentDate,
                appointmentTime: timeStr,
                reason: input.title || 'Consulta',
                notes: input.notes || undefined,
                action: isCancelled ? 'cancelled' : 'updated',
              });
            } catch (emailErr) {
              console.warn('[Agenda] No se pudo enviar email de actualización de cita:', emailErr);
            }
          }
          return { success: true };
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const { deleteMedicalAppointment } = await import('./db');
          await deleteMedicalAppointment(input.id, ctx.user.id);
          return { success: true };
        }),
    }),

    records: router({
      listByPatient: protectedProcedure
        .input(z.object({ patientId: z.number() }))
        .query(async ({ ctx, input }) => {
          const { getMedicalRecordsByPatient } = await import('./db');
          return getMedicalRecordsByPatient(input.patientId, ctx.user.id);
        }),
      create: protectedProcedure
        .input(z.object({
          patientId: z.number(),
          appointmentId: z.number().optional(),
          diagnosis: z.string().optional().or(z.literal('')),
          treatment: z.string().optional().or(z.literal('')),
          prescription: z.string().optional().or(z.literal('')),
          clinicalNotes: z.string().optional().or(z.literal('')),
          attachments: z.string().optional().or(z.literal('')),
        }))
        .mutation(async ({ ctx, input }) => {
          const { createMedicalRecord } = await import('./db');
          return createMedicalRecord({
            ownerId: ctx.user.id,
            patientId: input.patientId,
            appointmentId: input.appointmentId || null,
            diagnosis: input.diagnosis || null,
            treatment: input.treatment || null,
            prescription: input.prescription || null,
            clinicalNotes: input.clinicalNotes || null,
            attachments: input.attachments || null,
            recordDate: new Date(),
          });
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          diagnosis: z.string().optional().or(z.literal('')),
          treatment: z.string().optional().or(z.literal('')),
          prescription: z.string().optional().or(z.literal('')),
          clinicalNotes: z.string().optional().or(z.literal('')),
          attachments: z.string().optional().or(z.literal('')),
        }))
        .mutation(async ({ ctx, input }) => {
          const { updateMedicalRecord } = await import('./db');
          const { id, ...data } = input;
          await updateMedicalRecord(id, ctx.user.id, data);
          return { success: true };
        }),
    }),

    uploadFile: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileBase64: z.string(),
        patientId: z.number(),
        fileCategory: z.string().default('general'),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.fileName.split('.').pop() || 'bin';
        const key = `medical/${ctx.user.id}/patient-${input.patientId}/${Date.now()}-${input.fileCategory}.${ext}`;
        const { url } = await storagePut(key, buffer, input.fileType);
        return { url, key };
      }),
    // ─── Cumpleaños de hoy ────────────────────────────────────────────────────
    todayBirthdays: protectedProcedure
      .query(async ({ ctx }) => {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const { getMedicalPatientsByOwner, getEmployeeRecordsByOwner: getEmpByOwner } = await import('./db');
        const [patients, employees] = await Promise.all([
          getMedicalPatientsByOwner(ctx.user.id),
          getEmpByOwner(ctx.user.id),
        ]);
        const patientBdays = patients
          .filter((p: any) => {
            if (!p.birthDate) return false;
            const parts = (p.birthDate as string).split('-');
            return parts.length >= 3 && parts[1] === mm && parts[2] === dd;
          })
          .map((p: any) => ({ id: p.id, name: [p.firstName, p.lastName].filter(Boolean).join(' '), email: p.email, type: 'patient' as const }));
        const employeeBdays = employees
          .filter((e: any) => {
            if (!e.birthDate) return false;
            const parts = (e.birthDate as string).split('-');
            return parts.length >= 3 && parts[1] === mm && parts[2] === dd;
          })
          .map((e: any) => ({ id: e.id, name: e.fullName, email: e.email, type: 'employee' as const }));
        return { patients: patientBdays, employees: employeeBdays };
      }),
    sendBirthdayEmails: protectedProcedure
      .input(z.object({ type: z.enum(['patients', 'employees']) }))
      .mutation(async ({ ctx, input }) => {
        const { sendBirthdayEmail } = await import('./_core/email');
        const vendorSett = await getVendorSettings(ctx.user.id);
        const businessName = vendorSett?.businessName || ctx.user.name || 'KobraPay';
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        let sent = 0;
        if (input.type === 'patients') {
          const { getMedicalPatientsByOwner } = await import('./db');
          const patients = await getMedicalPatientsByOwner(ctx.user.id);
          for (const p of patients) {
            if (!p.email || !p.birthDate) continue;
            const bParts = (p.birthDate as string).split('-');
            if (bParts.length < 3 || bParts[1] !== mm || bParts[2] !== dd) continue;
            const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
            await sendBirthdayEmail({ recipientEmail: p.email, recipientName: name, businessName, senderName: businessName, type: 'patient' });
            sent++;
          }
        } else {
          const { getEmployeeRecordsByOwner: getEmpByOwner } = await import('./db');
          const employees = await getEmpByOwner(ctx.user.id);
          for (const e of employees) {
            if (!e.email || !e.birthDate) continue;
            const bParts = (e.birthDate as string).split('-');
            if (bParts.length < 3 || bParts[1] !== mm || bParts[2] !== dd) continue;
            await sendBirthdayEmail({ recipientEmail: e.email, recipientName: e.fullName, businessName, senderName: 'KobraPay', type: 'employee' });
            sent++;
          }
        }
        return { sent };
      }),

    // ─── Recordatorio 24h antes al paciente ───────────────────────────────────
    sendAppointmentReminder: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getMedicalAppointmentById, getMedicalPatientById } = await import('./db');
        const { sendAppointmentEmail } = await import('./_core/email');
        const appt = await getMedicalAppointmentById(input.appointmentId, ctx.user.id);
        if (!appt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cita no encontrada' });
        if (appt.status === 'cancelled') throw new TRPCError({ code: 'BAD_REQUEST', message: 'La cita est\u00e1 cancelada' });
        const patient = await getMedicalPatientById(appt.patientId, ctx.user.id);
        if (!patient?.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'El paciente no tiene correo registrado' });
        const vendorSett = await getVendorSettings(ctx.user.id);
        const businessName = vendorSett?.businessName || ctx.user.name || 'Consultorio';
        const businessPhone = (vendorSett as any)?.businessPhone || undefined;
        const businessEmail = (vendorSett as any)?.businessEmail || undefined;
        const businessLogoUrl = (vendorSett as any)?.logoUrl || undefined;
        // Obtener perfil del usuario para especialidad y dirección
        const profile = await getUserProfile(ctx.user.id);
        const doctorSpecialty = (profile as any)?.businessType || undefined;
        const businessAddress = (profile as any)?.ciudad
          ? `${(profile as any).ciudad}${(profile as any).estado ? ', ' + (profile as any).estado : ''}`
          : undefined;
        const apptDate = new Date(appt.appointmentDate);
        const timeStr = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' });
        const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');
        const sent = await sendAppointmentEmail({
          patientEmail: patient.email,
          patientName,
          doctorName: ctx.user.name || 'Su médico',
          businessName,
          businessPhone,
          businessEmail,
          businessLogoUrl,
          doctorSpecialty,
          businessAddress,
          appointmentDate: appt.appointmentDate.toISOString(),
          appointmentTime: timeStr,
          reason: appt.title,
          notes: appt.notes || undefined,
          action: 'updated',
        });
        const dateFormatted = apptDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const waMsg = encodeURIComponent(`Hola ${patientName}, te recordamos tu cita en ${businessName} el ${dateFormatted} a las ${timeStr}. Por favor confirma tu asistencia.`);
        const waLink = patient.phone ? `https://wa.me/${patient.phone.replace(/\D/g, '')}?text=${waMsg}` : null;
        return { sent, whatsappLink: waLink, patientPhone: patient.phone };
      }),

    // ─── Citas de hoy para campanita ──────────────────────────────────────────────
    todayAppointmentsAlert: protectedProcedure
      .query(async ({ ctx }) => {
        const { getMedicalAppointmentsByOwner: getAppts, getMedicalPatientById: getPatient } = await import('./db');
        const appts = await getAppts(ctx.user.id);
        const today = new Date();
        const todayAppts = appts.filter((a: any) => {
          const d = new Date(a.appointmentDate);
          return d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate() &&
            a.status === 'scheduled';
        });
        // Enriquecer con nombre del paciente
        const enriched = await Promise.all(todayAppts.map(async (a: any) => {
          const patient = await getPatient(a.patientId, ctx.user.id);
          return {
            ...a,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente',
          };
        }));
        return { count: enriched.length, appointments: enriched };
      }),
    // ─── Alerta post-cita al admin ────────────────────────────────────────────────
    sendPostAppointmentAlert: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getMedicalAppointmentById, getMedicalPatientById } = await import('./db');
        const appt = await getMedicalAppointmentById(input.appointmentId, ctx.user.id);
        if (!appt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cita no encontrada' });
        const patient = await getMedicalPatientById(appt.patientId, ctx.user.id);
        const patientName = patient ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') : 'Paciente';
        const apptDate = new Date(appt.appointmentDate);
        const timeStr = apptDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        await notifyOwner({
          title: `\u23f0 Cita terminada: ${patientName}`,
          content: `La cita de ${patientName} (${appt.title}) programada a las ${timeStr} ya debi\u00f3 concluir. Marca la cita como Completada o Cancelada en la Agenda M\u00e9dica.`,
        });
        return { sent: true };
      }),
  }),

  // ─── Capacitaciones ───────────────────────────────────────────────────────────
  training: router({
    // Listar cursos (globales de KobraPay + internos del negocio)
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getCourses, getCourseProgress } = await import('./db');
      const allCourses = await getCourses(ctx.user.id);
      const myProgress = await getCourseProgress(ctx.user.id);
      return allCourses.map(c => ({
        ...c,
        progress: myProgress.filter(p => p.courseId === c.id),
        isCompleted: myProgress.some(p => p.courseId === c.id && !p.moduleId && p.status === 'completed'),
      }));
    }),

    // Detalle de un curso con módulos y progreso
    getDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getCourseById, getCourseModules, getCourseProgress } = await import('./db');
        const course = await getCourseById(input.id);
        if (!course) throw new TRPCError({ code: 'NOT_FOUND' });
        const modules = await getCourseModules(input.id);
        const progress = await getCourseProgress(ctx.user.id, input.id);
        return { course, modules, progress };
      }),

    // Marcar curso o módulo como completado
    markComplete: protectedProcedure
      .input(z.object({
        courseId: z.number(),
        moduleId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { upsertCourseProgress } = await import('./db');
        return upsertCourseProgress({
          userId: ctx.user.id,
          courseId: input.courseId,
          moduleId: input.moduleId || null,
          status: 'completed',
          notes: input.notes || null,
        });
      }),

    // Subir evidencia de un curso
    uploadEvidence: protectedProcedure
      .input(z.object({
        courseId: z.number(),
        moduleId: z.number().optional(),
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string().default('application/octet-stream'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const { upsertCourseProgress } = await import('./db');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.fileName.split('.').pop() || 'bin';
        const key = `evidence/${ctx.user.id}/course-${input.courseId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return upsertCourseProgress({
          userId: ctx.user.id,
          courseId: input.courseId,
          moduleId: input.moduleId || null,
          status: 'completed',
          evidenceUrl: url,
          evidenceKey: key,
          evidenceName: input.fileName,
        });
      }),

    // Crear curso (superadmin = global, admin = interno)
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.enum(['english', 'office', 'first_aid', 'sales', 'books', 'health', 'other']).default('other'),
        level: z.enum(['basic', 'intermediate', 'advanced', 'general']).default('general'),
        externalUrl: z.string().url().optional().or(z.literal('')),
        content: z.string().optional(),
        coverImageUrl: z.string().optional(),
        durationMinutes: z.number().min(0).default(0),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCourse } = await import('./db');
        // Superadmin crea cursos globales (ownerId = null), admin crea cursos internos
        const ownerId = isSuperAdmin(ctx.user.openId) ? null : ctx.user.id;
        return createCourse({
          ...input,
          ownerId,
          externalUrl: input.externalUrl || null,
          content: input.content || null,
          coverImageUrl: input.coverImageUrl || null,
          isActive: true,
        });
      }),

    // Eliminar curso (solo quien lo creó o superadmin)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getCourseById, deleteCourse } = await import('./db');
        const course = await getCourseById(input.id);
        if (!course) throw new TRPCError({ code: 'NOT_FOUND' });
        if (course.ownerId !== null && course.ownerId !== ctx.user.id && !isSuperAdmin(ctx.user.openId)) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        await deleteCourse(input.id);
        return { success: true };
      }),

    // Borrar evidencia de un curso/módulo
    deleteEvidence: protectedProcedure
      .input(z.object({
        courseId: z.number(),
        moduleId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { deleteEvidenceFromProgress } = await import('./db');
        await deleteEvidenceFromProgress({
          userId: ctx.user.id,
          courseId: input.courseId,
          moduleId: input.moduleId || null,
        });
        return { success: true };
      }),
    // Subir imagen de portada de un curso (sin crear progreso)
    uploadCourseCover: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = input.fileName.split('.').pop() || 'jpg';
        const key = `course-covers/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, key };
      }),

    // Obtener CV de capacitaciones del usuario actual
    getMyCV: protectedProcedure
      .query(async ({ ctx }) => {
        const { getCourseProgress, getCourseById } = await import('./db');
        const progress = await getCourseProgress(ctx.user.id);
        const completed = progress.filter(p => p.status === 'completed' && !p.moduleId);
        const enriched = await Promise.all(completed.map(async p => {
          const course = await getCourseById(p.courseId);
          return { ...p, course };
        }));
        return enriched;
      }),
    // Obtener CV de capacitaciones de un empleado (admin puede ver de cualquiera)
    getEmployeeCV: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getCourseProgress, getCourseById } = await import('./db');
        if (ctx.user.id !== input.userId && ctx.user.role !== 'admin' && !isSuperAdmin(ctx.user.openId)) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const progress = await getCourseProgress(input.userId);
        const completed = progress.filter(p => p.status === 'completed' && !p.moduleId);
        const enriched = await Promise.all(completed.map(async p => {
          const course = await getCourseById(p.courseId);
          return { ...p, course };
        }));
        return enriched;
      }),
  }),
  // ─── Revista Interna de la Empresa ──────────────────────────────────────────────────
  magazine: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { magazines } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      return db.select().from(magazines).where(eq(magazines.ownerId, ctx.user.id)).orderBy(desc(magazines.createdAt));
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'NOT_FOUND' });
        const { magazines } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const result = await db.select().from(magazines).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id))).limit(1);
        if (!result[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        return result[0];
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        subtitle: z.string().max(500).optional().or(z.literal('')),
        edition: z.string().max(100).optional().or(z.literal('')),
        aiPrompt: z.string().optional().or(z.literal('')),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { magazines } = await import('../drizzle/schema');
        // Generar contenido con IA si se proporciona un prompt
        let content = null;
        if (input.aiPrompt) {
          try {
            const { invokeLLM } = await import('./_core/llm');
            const response = await invokeLLM({
              messages: [
                { role: 'system', content: 'Eres un editor de revistas corporativas profesional. Genera contenido en formato JSON con la siguiente estructura: [{"type": "article", "title": "...", "body": "..."}]. Genera entre 3 y 5 secciones relevantes para una revista interna de empresa. El contenido debe ser en español, profesional y motivador.' },
                { role: 'user', content: `Crea el contenido para una revista interna con el siguiente tema/contexto: ${input.aiPrompt}. Título de la revista: ${input.title}` },
              ],
            });
            const rawContent = response?.choices?.[0]?.message?.content || '';
            const raw = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
            // Intentar parsear JSON del response
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (jsonMatch) content = jsonMatch[0];
          } catch (e) {
            console.error('[Magazine] Error generating AI content:', e);
          }
        }
        await db.insert(magazines).values({
          ownerId: ctx.user.id,
          title: input.title,
          subtitle: input.subtitle || null,
          edition: input.edition || null,
          aiPrompt: input.aiPrompt || null,
          content,
        });
        const { eq: eqM, desc: descM } = await import('drizzle-orm');
        const result = await db.select().from(magazines).where(eqM(magazines.ownerId, ctx.user.id)).orderBy(descM(magazines.createdAt)).limit(1);
        return result[0];
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        subtitle: z.string().max(500).optional().or(z.literal('')),
        edition: z.string().max(100).optional().or(z.literal('')),
        content: z.string().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { magazines } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
        if (data.isPublished) updateData.publishedAt = new Date();
        await db.update(magazines).set(updateData).where(and(eq(magazines.id, id), eq(magazines.ownerId, ctx.user.id)));
        const result = await db.select().from(magazines).where(and(eq(magazines.id, id), eq(magazines.ownerId, ctx.user.id))).limit(1);
        return result[0];
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { magazines } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.delete(magazines).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id)));
        return { success: true };
      }),
    uploadCover: protectedProcedure
      .input(z.object({
        id: z.number(),
        fileBase64: z.string(),
        mimeType: z.string().default('image/jpeg'),
        ext: z.string().default('jpg'),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { magazines } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const existing = await db.select().from(magazines).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id))).limit(1);
        if (!existing[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `magazines/${ctx.user.id}/cover-${input.id}-${Date.now()}.${input.ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.update(magazines).set({ coverImageUrl: url, coverImageKey: key, updatedAt: new Date() }).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id)));
        return { url };
      }),
    uploadFile: protectedProcedure
      .input(z.object({
        id: z.number(),
        fileBase64: z.string(),
        mimeType: z.string(),
        ext: z.string().default('pdf'),
        fileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { magazines } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const existing = await db.select().from(magazines).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id))).limit(1);
        if (!existing[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `magazines/${ctx.user.id}/file-${input.id}-${Date.now()}.${input.ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        let sections: any[] = [];
        try { if (existing[0].content) sections = JSON.parse(existing[0].content); } catch {}
        sections.push({ type: 'file', title: input.fileName || 'Archivo adjunto', fileUrl: url, mimeType: input.mimeType });
        await db.update(magazines).set({ content: JSON.stringify(sections), updatedAt: new Date() }).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id)));
        return { url };
      }),
    generateContent: protectedProcedure
      .input(z.object({ id: z.number(), prompt: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { magazines } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const existing = await db.select().from(magazines).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id))).limit(1);
        if (!existing[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        const { invokeLLM } = await import('./_core/llm');
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Eres un editor de revistas corporativas profesional. Genera contenido en formato JSON con la siguiente estructura exacta: [{"type": "article", "title": "Título de la sección", "body": "Contenido completo de la sección en varios párrafos"}]. Genera entre 3 y 5 secciones. El contenido debe ser en español, profesional, motivador y relevante para empleados de una empresa.' },
            { role: 'user', content: `Crea el contenido para la revista interna "${existing[0].title}". Contexto/tema: ${input.prompt}` },
          ],
        });
        const rawContent2 = response?.choices?.[0]?.message?.content || '';
        const raw2 = typeof rawContent2 === 'string' ? rawContent2 : JSON.stringify(rawContent2);
        const jsonMatch2 = raw2.match(/\[[\s\S]*\]/);
        const content = jsonMatch2 ? jsonMatch2[0] : JSON.stringify([{ type: 'article', title: 'Bienvenida', body: raw2 }]);
        await db.update(magazines).set({ content, updatedAt: new Date() }).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id)));
        const result = await db.select().from(magazines).where(and(eq(magazines.id, input.id), eq(magazines.ownerId, ctx.user.id))).limit(1);
        return result[0];
      }),
  }),

  // ─── Agenda de Proveedores ──────────────────────────────────────────────────────
  suppliers: router({
    // Listar proveedores del usuario actual
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        category: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) return [];
        const { suppliers } = await import('../drizzle/schema');
        const { eq, and, or, like, desc } = await import('drizzle-orm');
        let conditions: any[] = [eq(suppliers.ownerId, ctx.user.id), eq(suppliers.isActive, true)];
        if (input?.category && input.category !== 'all') {
          conditions.push(eq(suppliers.category, input.category));
        }
        const rows = await db.select().from(suppliers)
          .where(and(...conditions))
          .orderBy(desc(suppliers.createdAt));
        // Filtrar por búsqueda en memoria (más simple y compatible)
        if (input?.search) {
          const q = input.search.toLowerCase();
          return rows.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.company || '').toLowerCase().includes(q) ||
            (s.phone || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q) ||
            (s.notes || '').toLowerCase().includes(q)
          );
        }
        return rows;
      }),

    // Crear proveedor
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        company: z.string().max(255).optional().or(z.literal('')),
        phone: z.string().max(32).optional().or(z.literal('')),
        email: z.string().email().optional().or(z.literal('')),
        category: z.string().default('other'),
        notes: z.string().optional().or(z.literal('')),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { suppliers } = await import('../drizzle/schema');
        await db.insert(suppliers).values({
          ownerId: ctx.user.id,
          name: input.name,
          company: input.company || null,
          phone: input.phone || null,
          email: input.email || null,
          category: input.category,
          notes: input.notes || null,
        });
        const { eq, desc } = await import('drizzle-orm');
        const result = await db.select().from(suppliers)
          .where(eq(suppliers.ownerId, ctx.user.id))
          .orderBy(desc(suppliers.createdAt))
          .limit(1);
        return result[0];
      }),

    // Actualizar proveedor
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        company: z.string().max(255).optional().or(z.literal('')),
        phone: z.string().max(32).optional().or(z.literal('')),
        email: z.string().email().optional().or(z.literal('')),
        category: z.string().optional(),
        notes: z.string().optional().or(z.literal('')),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { suppliers } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (data.name !== undefined) updateData.name = data.name;
        if (data.company !== undefined) updateData.company = data.company || null;
        if (data.phone !== undefined) updateData.phone = data.phone || null;
        if (data.email !== undefined) updateData.email = data.email || null;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.notes !== undefined) updateData.notes = data.notes || null;
        await db.update(suppliers).set(updateData).where(and(eq(suppliers.id, id), eq(suppliers.ownerId, ctx.user.id)));
        const result = await db.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.ownerId, ctx.user.id))).limit(1);
        return result[0];
      }),

    // Eliminar proveedor (soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { suppliers } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.update(suppliers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(suppliers.id, input.id), eq(suppliers.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ─── Prescripciones Médicas ─────────────────────────────────────────────────────
  prescriptions: router({
    // Obtener/crear perfil del doctor
    getDoctorProfile: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return null;
      const { doctorProfiles } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const result = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, ctx.user.id)).limit(1);
      return result[0] || null;
    }),

    saveDoctorProfile: protectedProcedure
      .input(z.object({
        fullName: z.string().optional(),
        specialty: z.string().optional(),
        licenseNumber: z.string().optional(),
        institution: z.string().optional(),
        officePhone: z.string().optional(),
        officeAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { doctorProfiles } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const existing = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          await db.update(doctorProfiles).set({ ...input, updatedAt: new Date() }).where(eq(doctorProfiles.userId, ctx.user.id));
        } else {
          await db.insert(doctorProfiles).values({ userId: ctx.user.id, ...input });
        }
        const result = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, ctx.user.id)).limit(1);
        return result[0];
      }),

    uploadMembrete: protectedProcedure
      .input(z.object({ fileName: z.string(), fileBase64: z.string(), mimeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { doctorProfiles } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.fileName.split('.').pop() || 'png';
        const key = `doctor-membretes/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const existing = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          await db.update(doctorProfiles).set({ membreteUrl: url, membreteKey: key, updatedAt: new Date() }).where(eq(doctorProfiles.userId, ctx.user.id));
        } else {
          await db.insert(doctorProfiles).values({ userId: ctx.user.id, membreteUrl: url, membreteKey: key });
        }
        return { url, key };
      }),

    saveSignature: protectedProcedure
      .input(z.object({ signatureBase64: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { doctorProfiles } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const buffer = Buffer.from(input.signatureBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
        const key = `doctor-signatures/${ctx.user.id}-${Date.now()}.png`;
        const { url } = await storagePut(key, buffer, 'image/png');
        const existing = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          await db.update(doctorProfiles).set({ savedSignatureUrl: url, savedSignatureKey: key, updatedAt: new Date() }).where(eq(doctorProfiles.userId, ctx.user.id));
        } else {
          await db.insert(doctorProfiles).values({ userId: ctx.user.id, savedSignatureUrl: url, savedSignatureKey: key });
        }
        return { url, key };
      }),

    list: protectedProcedure
      .input(z.object({ patientId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) return [];
        const { prescriptions } = await import('../drizzle/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        let conditions: any[] = [eq(prescriptions.doctorId, ctx.user.id)];
        if (input?.patientId) conditions.push(eq(prescriptions.patientId, input.patientId));
        return db.select().from(prescriptions).where(and(...conditions)).orderBy(desc(prescriptions.prescriptionDate));
      }),

    create: protectedProcedure
      .input(z.object({
        patientId: z.number().optional(),
        patientName: z.string().min(1),
        patientAge: z.string().optional(),
        patientGender: z.string().optional(),
        diagnosis: z.string().optional(),
        medications: z.string(),
        instructions: z.string().optional(),
        signatureBase64: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { prescriptions, doctorProfiles } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        // Obtener membrete del doctor
        const profile = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, ctx.user.id)).limit(1);
        const membreteUrl = profile[0]?.membreteUrl || null;
        const membreteKey = profile[0]?.membreteKey || null;
        // Guardar firma si viene
        let signatureUrl: string | null = null;
        let signatureKey: string | null = null;
        if (input.signatureBase64) {
          const buffer = Buffer.from(input.signatureBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
          const key = `prescription-signatures/${ctx.user.id}-${Date.now()}.png`;
          const { url } = await storagePut(key, buffer, 'image/png');
          signatureUrl = url;
          signatureKey = key;
        }
        await db.insert(prescriptions).values({
          doctorId: ctx.user.id,
          patientId: input.patientId || null,
          patientName: input.patientName,
          patientAge: input.patientAge || null,
          patientGender: input.patientGender || null,
          diagnosis: input.diagnosis || null,
          medications: input.medications,
          instructions: input.instructions || null,
          membreteUrl,
          membreteKey,
          signatureUrl,
          signatureKey,
          status: input.signatureBase64 ? 'signed' : 'draft',
        });
        const result = await db.select().from(prescriptions).where(eq(prescriptions.doctorId, ctx.user.id)).orderBy(desc(prescriptions.createdAt)).limit(1);
        return result[0];
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { prescriptions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.delete(prescriptions).where(and(eq(prescriptions.id, input.id), eq(prescriptions.doctorId, ctx.user.id)));
        return { success: true };
      }),

    // Editar prescripción existente
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        patientName: z.string().min(1).optional(),
        patientAge: z.string().optional(),
        patientGender: z.string().optional(),
        diagnosis: z.string().optional(),
        medications: z.string().optional(),
        instructions: z.string().optional(),
        signatureBase64: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { prescriptions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const existing = await db.select().from(prescriptions).where(and(eq(prescriptions.id, input.id), eq(prescriptions.doctorId, ctx.user.id))).limit(1);
        if (!existing.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Prescripción no encontrada' });
        const updates: Record<string, any> = {};
        if (input.patientName !== undefined) updates.patientName = input.patientName;
        if (input.patientAge !== undefined) updates.patientAge = input.patientAge;
        if (input.patientGender !== undefined) updates.patientGender = input.patientGender;
        if (input.diagnosis !== undefined) updates.diagnosis = input.diagnosis;
        if (input.medications !== undefined) updates.medications = input.medications;
        if (input.instructions !== undefined) updates.instructions = input.instructions;
        if (input.signatureBase64) {
          const { storagePut } = await import('./storage');
          const buffer = Buffer.from(input.signatureBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
          const key = `prescription-signatures/${ctx.user.id}-${Date.now()}.png`;
          const { url } = await storagePut(key, buffer, 'image/png');
          updates.signatureUrl = url;
          updates.signatureKey = key;
          updates.status = 'signed';
        }
        await db.update(prescriptions).set(updates).where(and(eq(prescriptions.id, input.id), eq(prescriptions.doctorId, ctx.user.id)));
        const result = await db.select().from(prescriptions).where(eq(prescriptions.id, input.id)).limit(1);
        return result[0];
      }),

    // Subir sello del doctor
    uploadStamp: protectedProcedure
      .input(z.object({ fileName: z.string(), fileBase64: z.string(), mimeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { doctorProfiles } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.fileName.split('.').pop() || 'png';
        const key = `doctor-stamps/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const existing = await db.select().from(doctorProfiles).where(eq(doctorProfiles.userId, ctx.user.id)).limit(1);
        if (existing.length > 0) {
          await db.update(doctorProfiles).set({ stampUrl: url, stampKey: key, updatedAt: new Date() }).where(eq(doctorProfiles.userId, ctx.user.id));
        } else {
          await db.insert(doctorProfiles).values({ userId: ctx.user.id, stampUrl: url, stampKey: key });
        }
        return { url, key };
      }),
  }),


  // ─── Módulo Farmacia ─────────────────────────────────────────────────────
  pharmacy: router({
    // Clientes
    listCustomers: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) return [];
        const { pharmacyCustomers } = await import('../drizzle/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        const rows = await db.select().from(pharmacyCustomers)
          .where(and(eq(pharmacyCustomers.ownerId, ctx.user.id), eq(pharmacyCustomers.isActive, true)))
          .orderBy(desc(pharmacyCustomers.createdAt));
        if (input?.search) {
          const q = input.search.toLowerCase();
          return rows.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.phone || '').includes(q) ||
            (c.email || '').toLowerCase().includes(q)
          );
        }
        return rows;
      }),

    createCustomer: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        birthDate: z.string().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
        allergies: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { pharmacyCustomers } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        await db.insert(pharmacyCustomers).values({ ownerId: ctx.user.id, ...input, email: input.email || null });
        const result = await db.select().from(pharmacyCustomers).where(eq(pharmacyCustomers.ownerId, ctx.user.id)).orderBy(desc(pharmacyCustomers.createdAt)).limit(1);
        return result[0];
      }),

    updateCustomer: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        birthDate: z.string().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
        allergies: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { pharmacyCustomers } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const { id, ...data } = input;
        await db.update(pharmacyCustomers).set({ ...data, updatedAt: new Date() }).where(and(eq(pharmacyCustomers.id, id), eq(pharmacyCustomers.ownerId, ctx.user.id)));
        const result = await db.select().from(pharmacyCustomers).where(and(eq(pharmacyCustomers.id, id), eq(pharmacyCustomers.ownerId, ctx.user.id))).limit(1);
        return result[0];
      }),

    deleteCustomer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { pharmacyCustomers } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.update(pharmacyCustomers).set({ isActive: false, updatedAt: new Date() }).where(and(eq(pharmacyCustomers.id, input.id), eq(pharmacyCustomers.ownerId, ctx.user.id)));
        return { success: true };
      }),

    // Prescripciones de un cliente
    listPrescriptions: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) return [];
        const { pharmacyPrescriptions } = await import('../drizzle/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        return db.select().from(pharmacyPrescriptions)
          .where(and(eq(pharmacyPrescriptions.customerId, input.customerId), eq(pharmacyPrescriptions.ownerId, ctx.user.id)))
          .orderBy(desc(pharmacyPrescriptions.createdAt));
      }),

    uploadPrescription: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        doctorName: z.string().optional(),
        prescriptionDate: z.string().optional(),
        medications: z.string().optional(),
        notes: z.string().optional(),
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { pharmacyPrescriptions } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const ext = input.fileName.split('.').pop() || 'jpg';
        const key = `pharmacy-prescriptions/${ctx.user.id}/${input.customerId}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.insert(pharmacyPrescriptions).values({
          ownerId: ctx.user.id,
          customerId: input.customerId,
          doctorName: input.doctorName || null,
          prescriptionDate: input.prescriptionDate || null,
          medications: input.medications || null,
          notes: input.notes || null,
          fileUrl: url,
          fileKey: key,
          fileName: input.fileName,
          fileMimeType: input.mimeType,
          status: 'pending',
        });
        const result = await db.select().from(pharmacyPrescriptions)
          .where(eq(pharmacyPrescriptions.ownerId, ctx.user.id))
          .orderBy(desc(pharmacyPrescriptions.createdAt)).limit(1);
        return result[0];
      }),

    updatePrescriptionStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'dispensed', 'partial']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { pharmacyPrescriptions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const updateData: any = { status: input.status, updatedAt: new Date() };
        if (input.status === 'dispensed') updateData.dispensedAt = new Date();
        if (input.notes) updateData.notes = input.notes;
        await db.update(pharmacyPrescriptions).set(updateData)
          .where(and(eq(pharmacyPrescriptions.id, input.id), eq(pharmacyPrescriptions.ownerId, ctx.user.id)));
        return { success: true };
      }),

    deletePrescription: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { pharmacyPrescriptions } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.delete(pharmacyPrescriptions).where(and(eq(pharmacyPrescriptions.id, input.id), eq(pharmacyPrescriptions.ownerId, ctx.user.id)));
        return { success: true };
      }),
  }),

  // ─── Control de Acceso por Módulo ───────────────────────────────────────────────────
  moduleAccess: router({
    // Verificar si el usuario actual tiene acceso a un módulo
    check: protectedProcedure
      .input(z.object({ module: z.string() }))
      .query(async ({ ctx, input }) => {
        // El superadmin siempre tiene acceso
        if (ctx.isSuperAdmin) return { hasAccess: true, isSuperAdmin: true };
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) return { hasAccess: false, isSuperAdmin: false };
        const { moduleAccess } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const result = await db.select().from(moduleAccess)
          .where(and(
            eq(moduleAccess.userId, ctx.user.id),
            eq(moduleAccess.module, input.module),
            eq(moduleAccess.isActive, true)
          )).limit(1);
        return { hasAccess: result.length > 0, isSuperAdmin: false };
      }),

    // Solicitar acceso a un módulo (usuario/admin)
    requestAccess: protectedProcedure
      .input(z.object({
        module: z.string(),
        businessType: z.string().optional(),
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.isSuperAdmin) return { success: true, alreadyGranted: true };
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleAccess, moduleRequests } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        // Verificar si ya tiene acceso
        const existing = await db.select().from(moduleAccess)
          .where(and(eq(moduleAccess.userId, ctx.user.id), eq(moduleAccess.module, input.module), eq(moduleAccess.isActive, true))).limit(1);
        if (existing.length > 0) return { success: true, alreadyGranted: true };
        // Verificar si ya tiene solicitud pendiente
        const pendingReq = await db.select().from(moduleRequests)
          .where(and(eq(moduleRequests.userId, ctx.user.id), eq(moduleRequests.module, input.module), eq(moduleRequests.status, 'pending'))).limit(1);
        if (pendingReq.length > 0) return { success: true, alreadyRequested: true };
        // Crear solicitud
        await db.insert(moduleRequests).values({
          userId: ctx.user.id,
          module: input.module,
          businessType: input.businessType || null,
          message: input.message || null,
          status: 'pending',
        });
        // Notificar al superadmin
        try {
          const { notifyOwner } = await import('./_core/notification');
          const moduleLabel = input.module === 'prescriptions' ? 'Prescripciones Médicas' : 'Farmacia';
          await notifyOwner({
            title: `⚠️ Solicitud de acceso: ${moduleLabel}`,
            content: `El usuario ${ctx.user.name || ctx.user.email} (ID: ${ctx.user.id}) solicita acceso al módulo ${moduleLabel}.\nTipo de negocio: ${input.businessType || 'No especificado'}\nMensaje: ${input.message || 'Sin mensaje'}\n\nRevisa el panel de superadmin para aprobar o rechazar.`,
          });
        } catch (e) { /* notificación no crítica */ }
        return { success: true, requested: true };
      }),

    // [SUPERADMIN] Listar solicitudes pendientes
    listRequests: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { moduleRequests, users } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      const requests = await db.select({
        id: moduleRequests.id,
        userId: moduleRequests.userId,
        module: moduleRequests.module,
        businessType: moduleRequests.businessType,
        message: moduleRequests.message,
        status: moduleRequests.status,
        requestedAt: moduleRequests.requestedAt,
        reviewedAt: moduleRequests.reviewedAt,
        reviewNotes: moduleRequests.reviewNotes,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
      }).from(moduleRequests)
        .leftJoin(users, eq(moduleRequests.userId, users.id))
        .orderBy(desc(moduleRequests.requestedAt));
      return requests;
    }),

    // [SUPERADMIN] Listar todos los accesos activos
    listAccess: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { moduleAccess, users } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      return db.select({
        id: moduleAccess.id,
        userId: moduleAccess.userId,
        module: moduleAccess.module,
        isActive: moduleAccess.isActive,
        grantedAt: moduleAccess.grantedAt,
        notes: moduleAccess.notes,
        userName: users.name,
        userEmail: users.email,
      }).from(moduleAccess)
        .leftJoin(users, eq(moduleAccess.userId, users.id))
        .orderBy(desc(moduleAccess.grantedAt));
    }),

    // [SUPERADMIN] Aprobar solicitud y otorgar acceso
    approveRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleAccess, moduleRequests } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        // Obtener la solicitud
        const req = await db.select().from(moduleRequests).where(eq(moduleRequests.id, input.requestId)).limit(1);
        if (!req[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        // Otorgar acceso (upsert)
        const existing = await db.select().from(moduleAccess)
          .where(and(eq(moduleAccess.userId, req[0].userId), eq(moduleAccess.module, req[0].module))).limit(1);
        if (existing.length > 0) {
          await db.update(moduleAccess).set({ isActive: true, grantedBy: ctx.user.id, grantedAt: new Date(), notes: input.notes || null, revokedAt: null })
            .where(and(eq(moduleAccess.userId, req[0].userId), eq(moduleAccess.module, req[0].module)));
        } else {
          await db.insert(moduleAccess).values({ userId: req[0].userId, module: req[0].module, isActive: true, grantedBy: ctx.user.id, notes: input.notes || null });
        }
        // Actualizar solicitud
        await db.update(moduleRequests).set({ status: 'approved', reviewedBy: ctx.user.id, reviewedAt: new Date(), reviewNotes: input.notes || null })
          .where(eq(moduleRequests.id, input.requestId));
        // Notificar al usuario que su acceso fue aprobado
        try {
          const moduleNames: Record<string, string> = {
            prescriptions: 'Prescripciones Médicas',
            pharmacy: 'Farmacia',
            medical_agenda: 'Agenda Médica',
          };
          const moduleName = moduleNames[req[0].module] || req[0].module;
          await createNotification({
            userId: req[0].userId,
            type: 'module_approved',
            title: `✅ Acceso aprobado: ${moduleName}`,
            message: `Tu solicitud de acceso al módulo de ${moduleName} fue aprobada. Ya puedes usar esta funcionalidad desde el menú Sector Salud.`,
            isRead: false,
            actionUrl: '/dashboard',
            metadata: JSON.stringify({ module: req[0].module, approvedBy: ctx.user.id }),
          });
        } catch (notifErr) {
          console.warn('[moduleAccess] Error al crear notificación de aprobación:', notifErr);
        }
        return { success: true };
      }),

    // [SUPERADMIN] Rechazar solicitud
    rejectRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleRequests } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(moduleRequests).set({ status: 'rejected', reviewedBy: ctx.user.id, reviewedAt: new Date(), reviewNotes: input.notes || null })
          .where(eq(moduleRequests.id, input.requestId));
        return { success: true };
      }),

    // [SUPERADMIN] Otorgar acceso directamente (sin solicitud)
    grantAccess: protectedProcedure
      .input(z.object({ userId: z.number(), module: z.string(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleAccess } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const existing = await db.select().from(moduleAccess)
          .where(and(eq(moduleAccess.userId, input.userId), eq(moduleAccess.module, input.module))).limit(1);
        if (existing.length > 0) {
          await db.update(moduleAccess).set({ isActive: true, grantedBy: ctx.user.id, grantedAt: new Date(), notes: input.notes || null, revokedAt: null })
            .where(and(eq(moduleAccess.userId, input.userId), eq(moduleAccess.module, input.module)));
        } else {
          await db.insert(moduleAccess).values({ userId: input.userId, module: input.module, isActive: true, grantedBy: ctx.user.id, notes: input.notes || null });
        }
        return { success: true };
      }),

    // [SUPERADMIN] Revocar acceso
    revokeAccess: protectedProcedure
      .input(z.object({ userId: z.number(), module: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleAccess } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.update(moduleAccess).set({ isActive: false, revokedAt: new Date() })
          .where(and(eq(moduleAccess.userId, input.userId), eq(moduleAccess.module, input.module)));
        return { success: true };
      }),

    // [ADMIN] Gestionar acceso de sus colaboradores al módulo
    grantToCollaborator: protectedProcedure
      .input(z.object({ collaboratorUserId: z.number(), module: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleAccess } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        // Verificar que el admin mismo tiene acceso al módulo
        if (!ctx.isSuperAdmin) {
          const adminAccess = await db.select().from(moduleAccess)
            .where(and(eq(moduleAccess.userId, ctx.user.id), eq(moduleAccess.module, input.module), eq(moduleAccess.isActive, true))).limit(1);
          if (adminAccess.length === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes acceso a este módulo' });
        }
        const existing = await db.select().from(moduleAccess)
          .where(and(eq(moduleAccess.userId, input.collaboratorUserId), eq(moduleAccess.module, input.module))).limit(1);
        if (existing.length > 0) {
          await db.update(moduleAccess).set({ isActive: true, grantedBy: ctx.user.id, grantedAt: new Date() })
            .where(and(eq(moduleAccess.userId, input.collaboratorUserId), eq(moduleAccess.module, input.module)));
        } else {
          await db.insert(moduleAccess).values({ userId: input.collaboratorUserId, module: input.module, isActive: true, grantedBy: ctx.user.id });
        }
        return { success: true };
      }),

    revokeFromCollaborator: protectedProcedure
      .input(z.object({ collaboratorUserId: z.number(), module: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && !ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleAccess } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.update(moduleAccess).set({ isActive: false, revokedAt: new Date() })
          .where(and(eq(moduleAccess.userId, input.collaboratorUserId), eq(moduleAccess.module, input.module)));
        return { success: true };
      }),

    // [ASSISTANT] Pre-aprobar solicitud (pasa a bandeja del superadmin)
    assistantPreApprove: protectedProcedure
      .input(z.object({ requestId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
        if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo el asistente puede pre-aprobar solicitudes' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleRequests } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(moduleRequests).set({
          status: 'assistant_approved' as any,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.notes ? `[Asistente]: ${input.notes}` : '[Pre-aprobado por asistente]',
        }).where(eq(moduleRequests.id, input.requestId));
        return { success: true };
      }),

    // [ASSISTANT] Rechazar solicitud definitivamente
    assistantReject: protectedProcedure
      .input(z.object({ requestId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
        if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleRequests } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(moduleRequests).set({
          status: 'rejected',
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.notes ? `[Asistente rechazó]: ${input.notes}` : '[Rechazado por asistente]',
        }).where(eq(moduleRequests.id, input.requestId));
        return { success: true };
      }),

    // [SUPERADMIN] Aprobar definitivamente solicitud pre-aprobada por asistente (con notificación)
    superAdminFinalApprove: protectedProcedure
      .input(z.object({ requestId: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { moduleAccess, moduleRequests, users } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const req = await db.select().from(moduleRequests).where(eq(moduleRequests.id, input.requestId)).limit(1);
        if (!req[0]) throw new TRPCError({ code: 'NOT_FOUND' });
        // Otorgar acceso
        const existing = await db.select().from(moduleAccess)
          .where(and(eq(moduleAccess.userId, req[0].userId), eq(moduleAccess.module, req[0].module))).limit(1);
        if (existing.length > 0) {
          await db.update(moduleAccess).set({ isActive: true, grantedBy: ctx.user.id, grantedAt: new Date(), notes: input.notes || null, revokedAt: null })
            .where(and(eq(moduleAccess.userId, req[0].userId), eq(moduleAccess.module, req[0].module)));
        } else {
          await db.insert(moduleAccess).values({ userId: req[0].userId, module: req[0].module, isActive: true, grantedBy: ctx.user.id, notes: input.notes || null });
        }
        // Marcar solicitud como aprobada
        await db.update(moduleRequests).set({
          status: 'approved',
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.notes ? `[SuperAdmin]: ${input.notes}` : '[Aprobado por SuperAdmin]',
        }).where(eq(moduleRequests.id, input.requestId));
        // Notificar al usuario que su acceso fue aprobado
        try {
          const userRow = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, req[0].userId)).limit(1);
          const moduleLabels: Record<string, string> = {
            prescriptions: 'Prescripciones Médicas',
            pharmacy: 'Farmacia',
          };
          const moduleLabel = moduleLabels[req[0].module] || req[0].module;
          const { notifyOwner } = await import('./_core/notification');
          await notifyOwner({
            title: `✅ Acceso aprobado: ${moduleLabel}`,
            content: `El acceso al módulo ${moduleLabel} ha sido aprobado para ${userRow[0]?.name || 'el usuario'} (${userRow[0]?.email || ''}).`,
          });
        } catch (_) { /* notificación no crítica */ }
        return { success: true };
      }),

    // [ASSISTANT/SUPERADMIN] Listar solicitudes pendientes para el asistente
    listPendingForAssistant: protectedProcedure.query(async ({ ctx }) => {
      const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
      if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { moduleRequests, users } = await import('../drizzle/schema');
      const { eq, desc, or } = await import('drizzle-orm');
      return db.select({
        id: moduleRequests.id,
        userId: moduleRequests.userId,
        module: moduleRequests.module,
        businessType: moduleRequests.businessType,
        message: moduleRequests.message,
        status: moduleRequests.status,
        requestedAt: moduleRequests.requestedAt,
        reviewedAt: moduleRequests.reviewedAt,
        reviewNotes: moduleRequests.reviewNotes,
        userName: users.name,
        userEmail: users.email,
      }).from(moduleRequests)
        .leftJoin(users, eq(moduleRequests.userId, users.id))
        .orderBy(desc(moduleRequests.requestedAt));
    }),

    // [SUPERADMIN] Listar solicitudes pre-aprobadas por asistente (bandeja final)
    listPreApproved: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { moduleRequests, users } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      return db.select({
        id: moduleRequests.id,
        userId: moduleRequests.userId,
        module: moduleRequests.module,
        businessType: moduleRequests.businessType,
        message: moduleRequests.message,
        status: moduleRequests.status,
        requestedAt: moduleRequests.requestedAt,
        reviewedAt: moduleRequests.reviewedAt,
        reviewNotes: moduleRequests.reviewNotes,
        userName: users.name,
        userEmail: users.email,
      }).from(moduleRequests)
        .leftJoin(users, eq(moduleRequests.userId, users.id))
        .where(eq(moduleRequests.status, 'assistant_approved' as any))
        .orderBy(desc(moduleRequests.requestedAt));
    }),

    // [ASSISTANT/SUPERADMIN] Cambiar rol de usuario a assistant
    setAssistantRole: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(users).set({ role: 'assistant' as any }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    // [SUPERADMIN] Asignar rol de Asociado a un usuario
    setAssociateRole: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(users).set({ role: 'associate' as any }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    // [SUPERADMIN] Listar todos los usuarios para gestión de roles
    listAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { users } = await import('../drizzle/schema');
      const { desc } = await import('drizzle-orm');
      return db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt));
    }),

    // Aplicar plantilla de sector a un cliente (asigna permisos predefinidos)
    applyTemplate: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        templateId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && !ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const { getTemplateById, templateToPermissionsJson } = await import('../shared/sectorTemplates');
        const template = getTemplateById(input.templateId);
        if (!template) throw new TRPCError({ code: "BAD_REQUEST", message: "Plantilla no encontrada" });
        const client = await getPlatformClientById(input.clientId);
        if (!client) throw new TRPCError({ code: "NOT_FOUND" });
        const permissionsJson = JSON.stringify(templateToPermissionsJson(template));
        if (client.userId) {
          await upsertUserProfile(client.userId, {
            permissions: permissionsJson,
            accountType: input.templateId,
          });
        }
        return { success: true, templateName: template.name };
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // BANK ACCOUNTS — Múltiples cuentas bancarias por usuario (Express + Custom)
  // ─────────────────────────────────────────────────────────────────────────
  bankAccounts: router({
    // Listar todas las cuentas del usuario
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { bankAccounts } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      return db.select().from(bankAccounts)
        .where(eq(bankAccounts.userId, ctx.user.id))
        .orderBy(desc(bankAccounts.isPrimary), desc(bankAccounts.createdAt));
    }),

    // Crear nueva cuenta bancaria
    create: protectedProcedure
      .input(z.object({
        connectType: z.enum(['express', 'custom']).default('express'),
        accountAlias: z.string().min(1).max(100),
        bankName: z.string().max(100).optional(),
        clabe: z.string().length(18).optional().or(z.literal('')),
        accountNumber: z.string().max(20).optional(),
        cardNumber: z.string().max(16).optional(),
        accountHolderName: z.string().max(255).optional(),
        rfc: z.string().max(20).optional(),
        curp: z.string().max(18).optional(),
        razonSocial: z.string().max(255).optional(),
        regimenFiscal: z.string().max(100).optional(),
        isPrimary: z.boolean().default(false),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { bankAccounts } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        // Si es primaria, quitar primaria de las demás
        if (input.isPrimary) {
          await db.update(bankAccounts)
            .set({ isPrimary: false })
            .where(eq(bankAccounts.userId, ctx.user.id));
        }
        const result = await db.insert(bankAccounts).values({
          userId: ctx.user.id,
          connectType: input.connectType,
          accountAlias: input.accountAlias,
          bankName: input.bankName || null,
          clabe: input.clabe || null,
          accountNumber: input.accountNumber || null,
          cardNumber: input.cardNumber || null,
          accountHolderName: input.accountHolderName || null,
          rfc: input.rfc || null,
          curp: input.curp || null,
          razonSocial: input.razonSocial || null,
          regimenFiscal: input.regimenFiscal || null,
          isPrimary: input.isPrimary,
          createdAt: now,
          updatedAt: now,
        });
        // Notificar al superadmin sobre la nueva cuenta bancaria registrada
        notifyOwner({
          title: '\uD83C\uDFE6 Nueva cuenta bancaria registrada',
          content: `El usuario ${ctx.user.name || ctx.user.email} (ID: ${ctx.user.id}) registr\u00F3 una nueva cuenta bancaria.\n\nAlias: ${input.accountAlias}\nTipo: ${input.connectType}\nBanco: ${input.bankName || 'No especificado'}\nTitular: ${input.accountHolderName || 'No especificado'}\nRFC: ${input.rfc || 'No especificado'}\nRaz\u00F3n Social: ${input.razonSocial || 'No especificado'}\n\nRevisa y valida los datos fiscales antes de activar cobros.`,
        }).catch(() => {});
        return { success: true, id: Number((result as any).insertId) };
      }),

    // Actualizar cuenta bancaria
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        accountAlias: z.string().min(1).max(100).optional(),
        bankName: z.string().max(100).optional(),
        clabe: z.string().max(18).optional(),
        accountNumber: z.string().max(20).optional(),
        cardNumber: z.string().max(16).optional(),
        accountHolderName: z.string().max(255).optional(),
        rfc: z.string().max(20).optional(),
        curp: z.string().max(18).optional(),
        razonSocial: z.string().max(255).optional(),
        regimenFiscal: z.string().max(100).optional(),
        isPrimary: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { bankAccounts } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        if (input.isPrimary) {
          await db.update(bankAccounts)
            .set({ isPrimary: false })
            .where(eq(bankAccounts.userId, ctx.user.id));
        }
        const { id, ...rest } = input;
        await db.update(bankAccounts)
          .set({ ...rest, updatedAt: Date.now() })
          .where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, ctx.user.id)));
        return { success: true };
      }),

    // Eliminar cuenta bancaria
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { bankAccounts } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        await db.delete(bankAccounts)
          .where(and(eq(bankAccounts.id, input.id), eq(bankAccounts.userId, ctx.user.id)));
        return { success: true };
      }),

    // Iniciar onboarding de Stripe Connect para una cuenta específica
    startStripeOnboarding: protectedProcedure
      .input(z.object({
        bankAccountId: z.number(),
        returnUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { bankAccounts } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' as any });

        const rows = await db.select().from(bankAccounts)
          .where(and(eq(bankAccounts.id, input.bankAccountId), eq(bankAccounts.userId, ctx.user.id)))
          .limit(1);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const account = rows[0];

        let stripeAccountId = account.stripeAccountId;
        if (!stripeAccountId) {
          const stripeAccount = await stripeClient.accounts.create({
            type: account.connectType === 'custom' ? 'custom' : 'express',
            country: 'MX',
            email: ctx.user.email || undefined,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: 'individual',
            metadata: { kobrapay_user_id: String(ctx.user.id), bank_account_id: String(account.id) },
          });
          stripeAccountId = stripeAccount.id;
          await db.update(bankAccounts)
            .set({ stripeAccountId, stripeStatus: 'pending', updatedAt: Date.now() })
            .where(eq(bankAccounts.id, account.id));
        }

        const accountLink = await stripeClient.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${input.returnUrl}?connect=refresh&account=${account.id}`,
          return_url: `${input.returnUrl}?connect=success&account=${account.id}`,
          type: 'account_onboarding',
        });
        return { url: accountLink.url };
      }),

    // Obtener estado de Stripe para una cuenta
    getStripeStatus: protectedProcedure
      .input(z.object({ bankAccountId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { bankAccounts } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const rows = await db.select().from(bankAccounts)
          .where(and(eq(bankAccounts.id, input.bankAccountId), eq(bankAccounts.userId, ctx.user.id)))
          .limit(1);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const account = rows[0];
        if (!account.stripeAccountId) return { status: 'not_started', chargesEnabled: false, payoutsEnabled: false };
        try {
          const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' as any });
          const stripeAcc = await stripeClient.accounts.retrieve(account.stripeAccountId);
          const newStatus = stripeAcc.charges_enabled ? 'active' : stripeAcc.details_submitted ? 'pending' : 'not_started';
          await db.update(bankAccounts).set({
            stripeStatus: newStatus as any,
            stripeChargesEnabled: stripeAcc.charges_enabled,
            stripePayoutsEnabled: stripeAcc.payouts_enabled ?? false,
            stripeDetailsSubmitted: stripeAcc.details_submitted,
            updatedAt: Date.now(),
          }).where(eq(bankAccounts.id, account.id));
          return { status: newStatus, chargesEnabled: stripeAcc.charges_enabled, payoutsEnabled: stripeAcc.payouts_enabled ?? false };
        } catch {
          return { status: account.stripeStatus, chargesEnabled: account.stripeChargesEnabled, payoutsEnabled: account.stripePayoutsEnabled };
        }
      }),

    // Obtener saldo de una cuenta Stripe Connect
    getBalance: protectedProcedure
      .input(z.object({ bankAccountId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) return { available: 0, pending: 0, currency: 'MXN' };
        const { bankAccounts } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const rows = await db.select().from(bankAccounts)
          .where(and(eq(bankAccounts.id, input.bankAccountId), eq(bankAccounts.userId, ctx.user.id)))
          .limit(1);
        if (!rows.length || !rows[0].stripeAccountId || !rows[0].stripeChargesEnabled) {
          return { available: 0, pending: 0, currency: 'MXN' };
        }
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' as any });
        const balance = await stripeClient.balance.retrieve({ stripeAccount: rows[0].stripeAccountId! });
        const avail = balance.available.find(b => b.currency === 'mxn') || balance.available[0];
        const pend = balance.pending.find(b => b.currency === 'mxn') || balance.pending[0];
        return {
          available: avail ? avail.amount / 100 : 0,
          pending: pend ? pend.amount / 100 : 0,
          currency: 'MXN',
        };
      }),

    // Solicitar retiro de una cuenta
    requestPayout: protectedProcedure
      .input(z.object({ bankAccountId: z.number(), amount: z.number().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { bankAccounts } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const rows = await db.select().from(bankAccounts)
          .where(and(eq(bankAccounts.id, input.bankAccountId), eq(bankAccounts.userId, ctx.user.id)))
          .limit(1);
        if (!rows.length || !rows[0].stripeAccountId || !rows[0].stripePayoutsEnabled) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Esta cuenta no tiene retiros habilitados.' });
        }
        const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' as any });
        const payout = await stripeClient.payouts.create(
          { amount: Math.round(input.amount * 100), currency: 'mxn' },
          { stripeAccount: rows[0].stripeAccountId! }
        );
        return { id: payout.id, amount: payout.amount / 100, arrivalDate: new Date(payout.arrival_date * 1000) };
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // ONBOARDING SURVEY — Encuesta de calificación post-registro
  // ─────────────────────────────────────────────────────────────────────────
  onboarding: router({
    // Verificar si el usuario ya completó la encuesta
    getSurveyStatus: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return { completed: false, survey: null };
      const { onboardingSurveys } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const surveys = await db.select().from(onboardingSurveys)
        .where(eq(onboardingSurveys.userId, ctx.user.id))
        .limit(1);
      if (surveys.length === 0) return { completed: false, survey: null };
      // Si fue omitida (skipped) o completada, se considera como completada para no redirigir
      return { completed: true, skipped: surveys[0].skipped, survey: surveys[0] };
    }),

    // Omitir la encuesta de onboarding (insertar registro con skipped=true)
    skipSurvey: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { onboardingSurveys } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      // Verificar si ya existe
      const existing = await db.select().from(onboardingSurveys)
        .where(eq(onboardingSurveys.userId, ctx.user.id)).limit(1);
      if (existing.length > 0) {
        // Ya existe, marcar como skipped
        await db.update(onboardingSurveys)
          .set({ skipped: true })
          .where(eq(onboardingSurveys.userId, ctx.user.id));
      } else {
        // Insertar registro mínimo con skipped=true
        await db.insert(onboardingSurveys).values({
          userId: ctx.user.id,
          businessType: 'skipped',
          businessSize: 'skipped',
          monthlyRevenueEstimate: 'skipped',
          skipped: true,
          status: 'skipped',
        });
      }
      return { success: true };
    }),

    // Guardar respuestas de la encuesta y calcular plan recomendado
    submitSurvey: protectedProcedure
      .input(z.object({
        businessType: z.string().min(1),
        businessSize: z.string().min(1),
        monthlyRevenueEstimate: z.string().min(1),
        needsCardPayments: z.boolean().default(true),
        needsInternationalCards: z.boolean().default(false),
        needsRecurringBilling: z.boolean().default(false),
        needsInvoicing: z.boolean().default(false),
        needsMultipleBankAccounts: z.boolean().default(false),
        interestedModules: z.array(z.string()).default([]),
        currentPaymentProcessor: z.string().optional(),
        mainChallenge: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { onboardingSurveys } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        // Calcular plan recomendado basado en respuestas
        let recommendedPlan = 'express';
        let recommendedCommission = 3.36;
        let planReasoning = '';

        const revenueMap: Record<string, number> = {
          '<10k': 5000, '10k-50k': 30000, '50k-100k': 75000,
          '100k-500k': 300000, '500k+': 750000,
        };
        const estimatedRevenue = revenueMap[input.monthlyRevenueEstimate] || 5000;

        if (
          input.needsMultipleBankAccounts ||
          input.businessSize === 'large' ||
          estimatedRevenue >= 300000
        ) {
          recommendedPlan = 'custom';
          recommendedCommission = 2.7;
          planReasoning = 'Empresa grande o con necesidad de múltiples cuentas bancarias. Se recomienda Stripe Connect Custom para mayor flexibilidad y mejor tasa.';
        } else if (estimatedRevenue >= 75000 || input.businessSize === 'medium') {
          recommendedPlan = 'express';
          recommendedCommission = 2.7;
          planReasoning = 'Negocio mediano con buen volumen. Stripe Connect Express es ideal para recibir pagos directamente con tasa competitiva.';
        } else {
          recommendedPlan = 'express';
          recommendedCommission = 3.36;
          planReasoning = 'Negocio pequeño o nuevo. Stripe Connect Express es la mejor opción para empezar sin complicaciones.';
        }

        const now = Date.now();

        // Verificar si ya existe una encuesta para este usuario
        const existing = await db.select({ id: onboardingSurveys.id })
          .from(onboardingSurveys)
          .where(eq(onboardingSurveys.userId, ctx.user.id))
          .limit(1);

        const surveyData = {
          userId: ctx.user.id,
          businessType: input.businessType,
          businessSize: input.businessSize,
          monthlyRevenueEstimate: input.monthlyRevenueEstimate,
          needsCardPayments: input.needsCardPayments,
          needsInternationalCards: input.needsInternationalCards,
          needsRecurringBilling: input.needsRecurringBilling,
          needsInvoicing: input.needsInvoicing,
          needsMultipleBankAccounts: input.needsMultipleBankAccounts,
          interestedModules: JSON.stringify(input.interestedModules),
          currentPaymentProcessor: input.currentPaymentProcessor || null,
          mainChallenge: input.mainChallenge || null,
          recommendedPlan,
          recommendedCommission: String(recommendedCommission),
          planReasoning,
          status: 'pending_review',
        };

        if (existing.length > 0) {
          await db.update(onboardingSurveys)
            .set(surveyData)
            .where(eq(onboardingSurveys.userId, ctx.user.id));
        } else {
          await db.insert(onboardingSurveys).values({ ...surveyData });
        }

        // Notificar al superadmin/asistente
        const revenueLabels: Record<string, string> = {
          '<10k': 'Menos de $10,000 MXN',
          '10k-50k': '$10,000 - $50,000 MXN',
          '50k-100k': '$50,000 - $100,000 MXN',
          '100k-500k': '$100,000 - $500,000 MXN',
          '500k+': 'Más de $500,000 MXN',
        };

        // ─── Scoring IA automático al completar el onboarding ───
        let aiScore = 50;
        let aiDecision: 'auto_approved' | 'manual_review' | 'auto_rejected' = 'manual_review';
        let aiReasoning = 'Revisión manual requerida';
        let riskFlags: string[] = [];
        let scoreFactors = {};
        let scoringId: number | undefined;

        try {
          const { registrationScores } = await import('../drizzle/schema');
          const { invokeLLM } = await import('./_core/llm');

          // Verificar duplicados
          const { eq: eqScore } = await import('drizzle-orm');
          const userEmail = ctx.user.email || '';
          const existingScore = userEmail ? await db.select().from(registrationScores)
            .where(eqScore(registrationScores.applicantEmail, userEmail)) : [];
          const isDuplicate = existingScore.length > 0;

          const scoringPrompt = `Eres un motor de scoring para KobraPay, una plataforma de pagos mexicana.
Evalúa esta solicitud de registro y asigna un score del 0 al 100.

Datos del solicitante:
- Email: ${ctx.user.email}
- Nombre: ${ctx.user.name || 'No proporcionado'}
- Tipo de negocio: ${input.businessType}
- Tamaño del negocio: ${input.businessSize}
- Ingresos mensuales: ${revenueLabels[input.monthlyRevenueEstimate] || input.monthlyRevenueEstimate}
- Necesita cobros con tarjeta: ${input.needsCardPayments ? 'Sí' : 'No'}
- Necesita facturación: ${input.needsInvoicing ? 'Sí' : 'No'}
- Procesador actual: ${input.currentPaymentProcessor || 'Ninguno'}
- ¿Email ya registrado antes?: ${isDuplicate ? 'SÍ - POSIBLE DUPLICADO' : 'No'}
- Plan recomendado: ${recommendedPlan} al ${recommendedCommission}%

Criterios:
- 80-100: Auto-aprobar (negocio legítimo, datos completos)
- 50-79: Revisión manual (datos incompletos o señales menores)
- 0-49: Auto-rechazar (fraude, duplicado, datos falsos)

Responde SOLO con JSON válido:
{
  "score": <número 0-100>,
  "decision": "auto_approved" | "manual_review" | "auto_rejected",
  "reasoning": "<explicación breve en español>",
  "riskFlags": ["<señal1>"],
  "scoreFactors": { "emailQuality": <0-20>, "businessInfo": <0-20>, "rfcProvided": <0-20>, "revenueEstimate": <0-20>, "noDuplicates": <0-20> }
}`;

          const aiResponse = await invokeLLM({
            messages: [
              { role: 'system', content: 'Eres un motor de scoring de riesgo para una plataforma de pagos. Responde SOLO con JSON válido, sin markdown.' },
              { role: 'user', content: scoringPrompt },
            ],
          });
          const rawContent = aiResponse.choices[0]?.message?.content;
          const content = typeof rawContent === 'string' ? rawContent : '{}';
          const parsed = JSON.parse(content);
          aiScore = Math.min(100, Math.max(0, parsed.score || 50));
          aiDecision = parsed.decision || 'manual_review';
          aiReasoning = parsed.reasoning || 'Sin razonamiento';
          riskFlags = parsed.riskFlags || [];
          scoreFactors = parsed.scoreFactors || {};

          // Guardar el score en la BD
          const [scoreRecord] = await db.insert(registrationScores).values({
            applicantEmail: userEmail,
            applicantName: ctx.user.name || undefined,
            businessName: input.businessType,
            aiScore,
            decision: aiDecision,
            scoreFactors: JSON.stringify(scoreFactors),
            riskFlags: JSON.stringify(riskFlags),
            aiReasoning,
            createdAt: now,
            updatedAt: now,
          });
          scoringId = scoreRecord?.insertId;
        } catch (e) {
          console.warn('[Onboarding] Scoring IA falló, usando manual_review por defecto', e);
        }

        // Notificación al superadmin con resultado del scoring
        const scoreEmoji = aiScore >= 80 ? '✅' : aiScore >= 50 ? '⚠️' : '❌';
        const decisionLabel = aiDecision === 'auto_approved' ? 'AUTO-APROBADO' : aiDecision === 'manual_review' ? 'REVISIÓN MANUAL' : 'AUTO-RECHAZADO';
        await notifyOwner({
          title: `${scoreEmoji} Onboarding: ${ctx.user.name || ctx.user.email} — Score ${aiScore}/100 (${decisionLabel})`,
          content: `Usuario: ${ctx.user.name || ctx.user.email}\nEmail: ${ctx.user.email}\nNegocio: ${input.businessType} (${input.businessSize})\nIngreso mensual: ${revenueLabels[input.monthlyRevenueEstimate] || input.monthlyRevenueEstimate}\nPlan recomendado: ${recommendedPlan.toUpperCase()} al ${recommendedCommission}%\n\n🤖 SCORING IA:\n- Score: ${aiScore}/100\n- Decisión: ${decisionLabel}\n- Razón: ${aiReasoning}\n- Flags de riesgo: ${riskFlags.length > 0 ? riskFlags.join(', ') : 'Ninguno'}\n\n${aiDecision === 'manual_review' ? '⚠️ REQUIERE REVISIÓN MANUAL en /dashboard/ai-scoring' : ''}`,
        });

        return { success: true, recommendedPlan, recommendedCommission, planReasoning, aiScore, aiDecision, aiReasoning };
      }),

    // [ASSISTANT/SUPERADMIN] Listar todas las encuestas pendientes
    listSurveys: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
        if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) return [];
        const { onboardingSurveys, users } = await import('../drizzle/schema');
        const { desc, eq, and } = await import('drizzle-orm');
        const conditions = input?.status
          ? [eq(onboardingSurveys.status, input.status)]
          : [];
        const rows = await db.select({
          survey: onboardingSurveys,
          userName: users.name,
          userEmail: users.email,
        })
          .from(onboardingSurveys)
          .leftJoin(users, eq(onboardingSurveys.userId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(onboardingSurveys.createdAt));
        return rows;
      }),

    // [ASSISTANT] Pre-aprobar encuesta con notas
    assistantReview: protectedProcedure
      .input(z.object({
        surveyId: z.number(),
        assistantNotes: z.string().optional(),
        action: z.enum(['approve', 'reject', 'request_info']),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
        if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { onboardingSurveys } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const newStatus = input.action === 'approve' ? 'assistant_approved'
          : input.action === 'reject' ? 'rejected'
          : 'pending_info';
        await db.update(onboardingSurveys)
          .set({
            status: newStatus,
            assistantNotes: input.assistantNotes || null,
            reviewedByAssistantAt: Date.now(),
          })
          .where(eq(onboardingSurveys.id, input.surveyId));
        // Notificar al superadmin si el asistente aprobó
        if (input.action === 'approve') {
          await notifyOwner({
            title: '✅ Encuesta pre-aprobada por asistente',
            content: `El asistente aprobó la encuesta #${input.surveyId}. Notas: ${input.assistantNotes || 'Sin notas'}. Pendiente de aprobación final.`,
          });
        }
        return { success: true };
      }),

    // [SUPERADMIN] Aprobación final y asignación de plan
    adminApprove: protectedProcedure
      .input(z.object({
        surveyId: z.number(),
        finalPlan: z.string(),
        finalCommission: z.number(),
        adminNotes: z.string().optional(),
        action: z.enum(['approve', 'reject']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { onboardingSurveys, users, vendorSettings } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const surveys = await db.select().from(onboardingSurveys)
          .where(eq(onboardingSurveys.id, input.surveyId))
          .limit(1);
        if (surveys.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });
        const survey = surveys[0];

        const newStatus = input.action === 'approve' ? 'approved' : 'rejected';
        await db.update(onboardingSurveys)
          .set({
            status: newStatus,
            recommendedPlan: input.finalPlan,
            recommendedCommission: String(input.finalCommission),
            planReasoning: input.adminNotes || survey.planReasoning,
            reviewedByAdminAt: Date.now(),
          })
          .where(eq(onboardingSurveys.id, input.surveyId));

        // Si se aprueba, actualizar la comisión del usuario en vendor_settings
        if (input.action === 'approve') {
          await db.update(vendorSettings)
            .set({ commissionRate: String(input.finalCommission) })
            .where(eq(vendorSettings.userId, survey.userId));
          // Activar la cuenta del usuario
          await db.update(users)
            .set({ accountStatus: 'active' })
            .where(eq(users.id, survey.userId));
        }
        return { success: true };
      }),

    markWelcomeShown: protectedProcedure.mutation(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ welcomeShown: true }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // KOBRAPAY ADVISOR — Chatbot de IA privado para el superadmin
  // ─────────────────────────────────────────────────────────────────────────
  // ─── IA para Asistente (mismo contexto KobraPay) ───────────────────────────
  assistantAdvisor: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
        if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN' });
        const { invokeLLM } = await import('./_core/llm');
        const systemPrompt = `Eres el Asesor Estratégico de KobraPay para el equipo interno. Tu nombre es "KobraPay Advisor".

KobraPay es una plataforma de cobros y pagos digitales que opera en México y más de 24 países. Permite a los negocios aceptar pagos con tarjeta (Visa, Mastercard, Amex), OXXO y transferencias SPEI, crear enlaces de pago personalizados, gestionar transacciones y emitir facturas digitales (CFDI).

PLAN Y COMISIÓN (plan único de lanzamiento):
- Plan Beta: 4.6% + $3.50 MXN + IVA por transacción. Sin mensualidad, sin hardware, sin permanencia. Activación en 24h.
Desglose: Stripe cobra 3.6% + $3 MXN, KobraPay cobra 1% + $0.50 MXN. El IVA (16%) se aplica sobre la parte KobraPay.

MÉTODOS DE PAGO (configurables por enlace):
- Tarjeta de crédito/débito (Visa, Mastercard, Amex)
- OXXO (pago en efectivo en tiendas OXXO, México)
- SPEI (transferencia bancaria, México)
Cada negocio puede habilitar o deshabilitar métodos por enlace de pago.

ROLES EN LA PLATAFORMA:
- Superadmin: dueño de KobraPay, acceso total, configura comisiones globales y aprueba Enterprise
- Asistente KobraPay (tú): equipo interno, revisa solicitudes de onboarding, aprueba/rechaza prospectos
- Admin Empresa: dueño del negocio cliente, gestiona su cuenta, empleados y transacciones
- Empleado: usuario del negocio, crea enlaces y ve ventas, solicita reembolsos (requiere aprobación del admin)
- Asociado: vendedor externo que refiere negocios y gana comisión escalonada (0.3% a 5% según cartera)

FLUJO DE REEMBOLSOS:
- Empleados: solo pueden SOLICITAR reembolso (queda pendiente de aprobación)
- Admins del negocio: APRUEBAN o RECHAZAN solicitudes de sus empleados
- Superadmin: ejecuta reembolsos directamente sin aprobación previa
- Reembolsos parciales: disponibles, se especifica el monto exacto a reembolsar
- El cliente recibe email automático cuando se procesa su reembolso

ONBOARDING:
- El negocio completa encuesta de bienvenida (tipo de negocio, volumen estimado, necesidades)
- El sistema asigna automáticamente un plan recomendado según el volumen declarado
- El asistente KobraPay revisa y aprueba o ajusta el plan
- Para Enterprise, el superadmin negocia directamente las condiciones

MÓDULOS DISPONIBLES:
- Cobros y Links de Pago (con selector de métodos por enlace)
- Mis Ventas (historial de transacciones, filtros, exportar CSV)
- Clientes (base de datos de pagadores con KobraScore)
- Facturación CFDI (facturas digitales con firma electrónica)
- Contratos Digitales (Art. 89 Código de Comercio)
- Cobros Recurrentes (suscripciones automáticas)
- Agenda Médica (citas y expedientes)
- Recursos Humanos (empleados, nómina, checador)
- Catálogo / POS (productos y punto de venta)
- Reportes mensuales con PDF
- KobraScore (puntuación de riesgo por cliente)
- Perfil Público del Negocio (/p/slug)

Tu rol como asistente interno es:
1. Revisar solicitudes de onboarding y asignar planes correctamente
2. Responder dudas sobre la plataforma, precios y flujos operativos
3. Apoyar en la gestión de clientes y comunicaciones
4. Escalar casos complejos al superadmin cuando corresponda
5. Ayudar a redactar comunicaciones profesionales con clientes

Responde SIEMPRE en español mexicano, de forma directa y profesional.`;
        const response = await invokeLLM({
          messages: [{ role: 'system', content: systemPrompt }, ...input.messages],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sin respuesta del modelo' });
        return { message: typeof content === 'string' ? content : JSON.stringify(content) };
      }),
  }),

  // ─── IA para Administrador (consultoría de negocios) ─────────────────────────
  adminAdvisor: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin' || ctx.isSuperAdmin;
        if (!isAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const { invokeLLM } = await import('./_core/llm');
        const systemPrompt = `Eres un Consultor de Negocios experto para clientes de KobraPay. Tu nombre es "KobraPay Business Advisor".

KobraPay es una plataforma de cobros y pagos digitales disponible en México y más de 24 países. Los negocios pueden aceptar pagos con tarjeta (Visa, Mastercard, Amex), OXXO y SPEI, crear enlaces de pago, gestionar transacciones y emitir facturas digitales.

PLAN DISPONIBLE (plan único de lanzamiento):
- Plan Beta: 4.6% + $3.50 MXN + IVA por transacción. Sin mensualidad, sin hardware, sin permanencia. Activación en 24h.
Desglose: Stripe cobra 3.6% + $3 MXN, KobraPay cobra 1% + $0.50 MXN. El IVA (16%) se aplica sobre la parte KobraPay.

MÓDULOS DISPONIBLES EN KOBRAPAY:
- Cobros y Links de Pago (con selector de métodos: tarjeta, OXXO, SPEI por enlace)
- Mis Ventas (historial, filtros, exportar CSV)
- Clientes (base de datos de pagadores con KobraScore)
- Facturación CFDI (facturas digitales)
- Contratos Digitales con firma electrónica (Art. 89 Código de Comercio)
- Cobros Recurrentes (suscripciones automáticas)
- Agenda Médica (citas y expedientes)
- Recursos Humanos (empleados, nómina)
- Catálogo / POS (punto de venta)
- Reportes mensuales en PDF

Tu función es ayudar a los administradores (clientes de la plataforma KobraPay) a:
1. Optimizar sus operaciones de cobro y pagos
2. Estrategias de crecimiento para su negocio
3. Consejos sobre gestión financiera, flujo de caja y rentabilidad
4. Cómo aprovechar al máximo los módulos de KobraPay
5. Mejores prácticas para reducir contracargos y fraudes
6. Cómo fidelizar clientes y aumentar ventas
7. Análisis de sus métricas de cobro y sugerencias de mejora
8. Consejos legales básicos (LFPDPPP, SAT, CFDI) — siempre recomendar consultar un abogado para temas específicos

NO tienes acceso a datos específicos de la cuenta del usuario. Responde con consejos generales de negocios.
Responde SIEMPRE en español mexicano, de forma práctica, directa y como si fueras un consultor de negocios experimentado. Sé conciso pero completo.`;
        const response = await invokeLLM({
          messages: [{ role: 'system', content: systemPrompt }, ...input.messages],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sin respuesta del modelo' });
        return { message: typeof content === 'string' ? content : JSON.stringify(content) };
      }),
  }),

  // ─── Cuenta de Asociado ────────────────────────────────────────────────────
  associate: router({
    // IA del Asociado (para ventas y simulador)
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAssociate = ctx.user.role === 'associate' || ctx.isSuperAdmin;
        if (!isAssociate) throw new TRPCError({ code: 'FORBIDDEN' });
        const { invokeLLM } = await import('./_core/llm');
        const systemPrompt = `Eres el Asesor de Ventas de KobraPay para Asociados. Tu nombre es "KobraPay Sales Coach".

KobraPay es una plataforma de cobros y pagos digitales disponible en México y más de 24 países. Los negocios pueden aceptar pagos con tarjeta (Visa, Mastercard, Amex), OXXO y SPEI, crear enlaces de pago, gestionar transacciones y emitir facturas digitales — sin mensualidad, sin hardware, sin contratos de permanencia.

PLAN DISPONIBLE (para ofrecer a prospectos):
- Plan Beta: 4.6% + $3.50 MXN + IVA por transacción. Sin mensualidad, sin hardware, sin permanencia. Activación en 24h.
Desglose transparente: Stripe cobra 3.6% + $3 MXN, KobraPay cobra 1% + $0.50 MXN. El IVA (16%) se aplica sobre la parte KobraPay.
Ventaja competitiva: Mercado Pago cobra 3.29%, PayPal 3.5%, Clip 3.6% — pero ninguno incluye contratos digitales, cobros recurrentes, firma electrónica, OTP ni agenda.

MÉTODOS DE PAGO (ventaja diferencial):
- Tarjeta de crédito/débito (Visa, Mastercard, Amex)
- OXXO (pago en efectivo, muy popular en México)
- SPEI (transferencia bancaria instantánea)
- Cada enlace de pago puede tener métodos habilitados/deshabilitados según el negocio

COMISIÓN DEL ASOCIADO (sistema escalonado):
- El asociado gana comisión mensual sobre el volumen procesado de sus clientes referidos
- Comisión escalonada: 0.3% (cartera pequeña) hasta 5% (cartera grande)
- Ejemplo: cliente procesa $100K MXN/mes → asociado puede ganar entre $300 y $5,000 MXN/mes según su nivel
- Comisión pagada mensualmente por KobraPay

MÓDULOS QUE DIFERENCIAN A KOBRAPAY:
- Cobros y Links de Pago con múltiples métodos de pago por enlace
- Facturación CFDI (facturas digitales)
- Contratos Digitales con firma electrónica
- Cobros Recurrentes (suscripciones)
- Agenda Médica y Expedientes
- Recursos Humanos y Nómina
- Catálogo / POS
- KobraScore (puntuación de riesgo de clientes)
- Reportes mensuales en PDF
- Perfil Público del Negocio

ARGUMENTOS DE VENTA CLAVE:
- Sin mensualidad: solo pagas cuando cobras
- Sin hardware: funciona desde cualquier dispositivo con internet
- Más completo que otras plataformas: incluye módulos de gestión empresarial que otros no tienen
- Disponible en 24+ países: ideal para negocios con clientes internacionales
- Soporte en español: equipo dedicado en México

Tu rol es:
1. Ayudar al asociado a VENDER KobraPay a negocios mexicanos
2. Dar argumentos de venta y respuestas a objeciones comunes
3. Calcular cuánto ganará el asociado con un cliente específico
4. Sugerir qué plan ofrecer según el perfil del cliente
5. Ayudar a redactar mensajes de WhatsApp, emails y propuestas comerciales
6. Dar tips de prospección y cierre de ventas

Responde SIEMPRE en español mexicano, de forma motivadora, práctica y orientada a cerrar ventas.`;
        const response = await invokeLLM({
          messages: [{ role: 'system', content: systemPrompt }, ...input.messages],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sin respuesta del modelo' });
        return { message: typeof content === 'string' ? content : JSON.stringify(content) };
      }),

    // Listar clientes registrados por el asociado
    listClients: protectedProcedure.query(async ({ ctx }) => {
      const isAssociate = ctx.user.role === 'associate' || ctx.isSuperAdmin;
      if (!isAssociate) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { associateCommissions } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      return db.select().from(associateCommissions)
        .where(eq(associateCommissions.associateUserId, ctx.user.id))
        .orderBy(desc(associateCommissions.createdAt));
    }),

    // Registrar un nuevo cliente prospecto
    registerClient: protectedProcedure
      .input(z.object({
        clientName: z.string().min(1).max(255),
        clientEmail: z.string().email(),
        clientBusinessName: z.string().max(255).optional(),
        clientPhone: z.string().max(32).optional(),
        assignedPlan: z.enum(['express', 'connect', 'custom', 'enterprise']).optional(),
        customPlanName: z.string().max(100).optional(),
        customCommissionRate: z.number().min(0).max(10).optional(),
        paymentCycle: z.enum(['weekly', 'biweekly', 'monthly', 'custom']).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAssociate = ctx.user.role === 'associate' || ctx.isSuperAdmin;
        if (!isAssociate) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateCommissions } = await import('../drizzle/schema');
        const now = Date.now();
        const commissionToSave = input.customCommissionRate !== undefined
          ? String(input.customCommissionRate)
          : '1.00';
        const notesWithCustomPlan = input.customPlanName
          ? `[Plan personalizado: ${input.customPlanName}]${input.notes ? ' ' + input.notes : ''}`
          : (input.notes || null);
        const result = await db.insert(associateCommissions).values({
          associateUserId: ctx.user.id,
          clientEmail: input.clientEmail,
          clientName: input.clientName,
          clientBusinessName: input.clientBusinessName || null,
          clientPhone: input.clientPhone || null,
          assignedPlan: input.assignedPlan || null,
          notes: notesWithCustomPlan,
          status: 'pending',
          commissionRate: commissionToSave,
          paymentCycle: input.paymentCycle || 'monthly',
          totalVolumeProcessed: '0.00',
          totalCommissionEarned: '0.00',
          createdAt: now,
          updatedAt: now,
        });
        // Notificar al superadmin
        notifyOwner({
          title: '🤝 Nuevo cliente registrado por Asociado',
          content: `El asociado ${ctx.user.name || ctx.user.email} registró un nuevo cliente.\n\nCliente: ${input.clientName}\nEmail: ${input.clientEmail}\nNegocio: ${input.clientBusinessName || 'No especificado'}\nPlan sugerido: ${input.assignedPlan || 'Por definir'}\nComisión: ${commissionToSave}%\nCiclo de pago: ${input.paymentCycle || 'monthly'}\nNotas: ${input.notes || 'Sin notas'}`,
        }).catch(() => {});
        return { success: true, id: Number((result as any).insertId) };
      }),

    // Obtener resumen de comisiones del asociado
    getCommissionSummary: protectedProcedure.query(async ({ ctx }) => {
      const isAssociate = ctx.user.role === 'associate' || ctx.isSuperAdmin;
      if (!isAssociate) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return { totalClients: 0, activeClients: 0, pendingClients: 0, totalVolume: 0, totalEarned: 0 };
      const { associateCommissions } = await import('../drizzle/schema');
      const { eq, sum, count } = await import('drizzle-orm');
      const clients = await db.select().from(associateCommissions)
        .where(eq(associateCommissions.associateUserId, ctx.user.id));
      const totalClients = clients.length;
      const activeClients = clients.filter(c => c.status === 'active').length;
      const pendingClients = clients.filter(c => c.status === 'pending').length;
      // PRIVACIDAD: El asociado NO puede ver el volumen de ingresos de sus clientes
      // Solo puede ver sus propias comisiones generadas
      const totalEarned = clients.reduce((acc, c) => acc + parseFloat(String(c.totalCommissionEarned) || '0'), 0);
      return { totalClients, activeClients, pendingClients, totalEarned };
    }),

    // [Asistente] Pre-aprobar un cliente de asociado (Paso 1 del flujo de dos pasos)
    assistantPreApprove: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        notes: z.string().optional(),
        assignedPlan: z.enum(['express', 'connect', 'custom', 'enterprise']).optional(),
        commissionRate: z.number().min(0).max(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo asistentes o superadmin pueden pre-aprobar
        const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
        if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo asistentes pueden pre-aprobar clientes' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateCommissions } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        const [clientRecord] = await db.select().from(associateCommissions)
          .where(eq(associateCommissions.id, input.clientId));
        if (!clientRecord) throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente no encontrado' });
        if (clientRecord.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'El cliente no está en estado pendiente' });
        const updateData: Record<string, unknown> = {
          status: 'assistant_approved',
          updatedAt: now,
        };
        if (input.assignedPlan) updateData.assignedPlan = input.assignedPlan;
        if (input.commissionRate !== undefined) updateData.commissionRate = String(input.commissionRate);
        if (input.notes) updateData.notes = `[Pre-aprobado por asistente]: ${input.notes}`;
        await db.update(associateCommissions).set(updateData).where(eq(associateCommissions.id, input.clientId));
        // Notificar al superadmin para aprobación final
        notifyOwner({
          title: '⏳ Cliente pre-aprobado — Requiere aprobación final',
          content: `El asistente ${ctx.user.name || ctx.user.email} pre-aprobó un cliente de asociado.\n\nCliente: ${clientRecord.clientName}\nEmail: ${clientRecord.clientEmail}\nNegocio: ${clientRecord.clientBusinessName || 'No especificado'}\nPlan sugerido: ${input.assignedPlan || clientRecord.assignedPlan || 'Por definir'}\nComisión: ${input.commissionRate || clientRecord.commissionRate}%\nNotas: ${input.notes || 'Sin notas'}\n\nAcción requerida: Aprobar o rechazar en el Panel de Comisiones.`,
        }).catch(() => {});
        return { success: true };
      }),

    // [Asistente] Rechazar un cliente de asociado (Paso 1 del flujo)
    assistantReject: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
        if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateCommissions } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        const [clientRecord] = await db.select().from(associateCommissions)
          .where(eq(associateCommissions.id, input.clientId));
        if (!clientRecord) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.update(associateCommissions).set({
          status: 'rejected',
          updatedAt: now,
          notes: input.notes ? `[Rechazado por asistente]: ${input.notes}` : '[Rechazado por asistente]',
        }).where(eq(associateCommissions.id, input.clientId));
        // Notificar al superadmin
        notifyOwner({
          title: '❌ Cliente rechazado por asistente',
          content: `El asistente ${ctx.user.name || ctx.user.email} rechazó el cliente ${clientRecord.clientName} (${clientRecord.clientEmail}).\nMotivo: ${input.notes || 'Sin motivo especificado'}`,
        }).catch(() => {});
        return { success: true };
      }),

    // [SuperAdmin] Listar clientes pendientes de pre-aprobación (para el asistente)
    listPendingForAssistant: protectedProcedure.query(async ({ ctx }) => {
      const isAssistant = ctx.user.role === 'assistant' || ctx.isSuperAdmin;
      if (!isAssistant) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { associateCommissions, users } = await import('../drizzle/schema');
      const { eq, inArray, desc } = await import('drizzle-orm');
      const pendingClients = await db.select().from(associateCommissions)
        .where(inArray(associateCommissions.status, ['pending', 'assistant_approved']))
        .orderBy(desc(associateCommissions.createdAt));
      // Enriquecer con datos del asociado
      const associateIds = Array.from(new Set(pendingClients.map(c => c.associateUserId)));
      const associates = associateIds.length > 0
        ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
            .where(inArray(users.id, associateIds))
        : [];
      const assocMap = Object.fromEntries(associates.map(a => [a.id, a]));
      return pendingClients.map(c => ({
        ...c,
        associateName: assocMap[c.associateUserId]?.name || assocMap[c.associateUserId]?.email || `Asociado ${c.associateUserId}`,
        associateEmail: assocMap[c.associateUserId]?.email || '',
      }));
    }),

    // [SuperAdmin] Actualizar status de un cliente prospecto del asociado
    updateClientStatus: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        status: z.enum(['pending', 'assistant_approved', 'active', 'rejected', 'inactive']),
        assignedPlan: z.enum(['express', 'connect', 'custom', 'enterprise']).optional(),
        commissionRate: z.number().min(0).max(10).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateCommissions } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        const updateData: Record<string, unknown> = { status: input.status, updatedAt: now };
        if (input.assignedPlan) updateData.assignedPlan = input.assignedPlan;
        if (input.commissionRate !== undefined) updateData.commissionRate = String(input.commissionRate);
        if (input.notes) updateData.notes = input.notes;
        if (input.status === 'active') updateData.approvedAt = now;
        // Obtener el registro del cliente antes de actualizar para notificar al asociado
        const [clientRecord] = await db.select().from(associateCommissions)
          .where(eq(associateCommissions.id, input.clientId));
        await db.update(associateCommissions).set(updateData).where(eq(associateCommissions.id, input.clientId));
        // Notificar al asociado sobre el cambio de estado
        if (clientRecord && (input.status === 'active' || input.status === 'rejected')) {
          const { users } = await import('../drizzle/schema');
          const [associateUser] = await db.select().from(users)
            .where(eq(users.id, clientRecord.associateUserId));
          if (associateUser) {
            const statusMsg = input.status === 'active'
              ? `✅ ¡Tu cliente fue APROBADO! Ya puede usar KobraPay.`
              : `❌ Tu cliente fue rechazado. Contacta al equipo para más información.`;
            notifyOwner({
              title: `🤝 Actualización de cliente - Asociado: ${associateUser.name || associateUser.email}`,
              content: `${statusMsg}\n\nCliente: ${clientRecord.clientName}\nEmail: ${clientRecord.clientEmail}\nNegocio: ${clientRecord.clientBusinessName || 'No especificado'}\nPlan: ${clientRecord.assignedPlan || 'Por definir'}\nComisión asignada: ${clientRecord.commissionRate}%\nCiclo de pago: ${clientRecord.paymentCycle}`,
            }).catch(() => {});
          }
        }
        return { success: true };
      }),
    // ─── Tiers de comisión escalonada para asociados ─────────────────────────────
    // [Todos] Listar los tiers de comisión (público para que el asociado vea su nivel)
    listCommissionTiers: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { associateCommissionTiers } = await import('../drizzle/schema');
      const { asc } = await import('drizzle-orm');
      return db.select().from(associateCommissionTiers)
        .where((await import('drizzle-orm')).eq(associateCommissionTiers.isActive, true))
        .orderBy(asc(associateCommissionTiers.sortOrder));
    }),

    // [SuperAdmin] Actualizar un tier de comisión
    updateCommissionTier: protectedProcedure
      .input(z.object({
        id: z.number(),
        minClients: z.number().min(1),
        maxClients: z.number().nullable(),
        commissionPct: z.number().min(0.1).max(10),
        label: z.string().min(1).max(64),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateCommissionTiers } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        await db.update(associateCommissionTiers).set({
          minClients: input.minClients,
          maxClients: input.maxClients,
          commissionPct: String(input.commissionPct),
          label: input.label,
          description: input.description,
          sortOrder: input.sortOrder,
          isActive: input.isActive !== undefined ? input.isActive : true,
          updatedAt: now,
        }).where(eq(associateCommissionTiers.id, input.id));
        return { success: true };
      }),

    // [SuperAdmin] Crear un nuevo tier de comisión
    createCommissionTier: protectedProcedure
      .input(z.object({
        minClients: z.number().min(1),
        maxClients: z.number().nullable(),
        commissionPct: z.number().min(0.1).max(10),
        label: z.string().min(1).max(64),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateCommissionTiers } = await import('../drizzle/schema');
        const now = Date.now();
        await db.insert(associateCommissionTiers).values({
          minClients: input.minClients,
          maxClients: input.maxClients,
          commissionPct: String(input.commissionPct),
          label: input.label,
          description: input.description || '',
          sortOrder: input.sortOrder || 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        return { success: true };
      }),

    // [SuperAdmin] Eliminar un tier de comisión
    deleteCommissionTier: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateCommissionTiers } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.delete(associateCommissionTiers).where(eq(associateCommissionTiers.id, input.id));
        return { success: true };
      }),

    // [SuperAdmin] Listar todos los asociados y sus clientes
    listAllAssociates: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { users, associateCommissions } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      const associates = await db.select().from(users).where(eq(users.role, 'associate'));
      const result = await Promise.all(associates.map(async (assoc) => {
        const clients = await db.select().from(associateCommissions)
          .where(eq(associateCommissions.associateUserId, assoc.id))
          .orderBy(desc(associateCommissions.createdAt));
        const totalEarned = clients.reduce((acc, c) => acc + parseFloat(String(c.totalCommissionEarned) || '0'), 0);
        return { associate: assoc, clients, totalEarned };
      }));
      return result;
    }),
    // Obtener código de referido e información del programa de referidos
    getMyReferralInfo: protectedProcedure.query(async ({ ctx }) => {
      const isAssociate = ctx.user.role === 'associate' || ctx.isSuperAdmin;
      if (!isAssociate) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return { referralCode: null, totalReferrals: 0, activeReferrals: 0, pendingReferrals: 0, totalEarned: 0, monthlyEarned: 0, clients: [] };
      const { associateCommissions } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const referralCode = `KP-${String(ctx.user.id).padStart(4, '0').toUpperCase()}`;
      const clients = await db.select().from(associateCommissions)
        .where(eq(associateCommissions.associateUserId, ctx.user.id));
      const totalReferrals = clients.length;
      const activeReferrals = clients.filter(c => c.status === 'active').length;
      const pendingReferrals = clients.filter(c => c.status === 'pending' || c.status === 'assistant_approved').length;
      const totalEarned = clients.reduce((acc, c) => acc + parseFloat(String(c.totalCommissionEarned) || '0'), 0);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monthlyEarned = clients
        .filter(c => c.updatedAt >= startOfMonth)
        .reduce((acc, c) => acc + parseFloat(String(c.totalCommissionEarned) || '0'), 0);
      return {
        referralCode,
        totalReferrals,
        activeReferrals,
        pendingReferrals,
        totalEarned,
        monthlyEarned,
        clients: clients.map(c => ({
          id: c.id,
          clientName: c.clientName,
          clientEmail: c.clientEmail,
          clientBusinessName: c.clientBusinessName,
          status: c.status,
          assignedPlan: c.assignedPlan,
          commissionRate: parseFloat(String(c.commissionRate)),
          totalCommissionEarned: parseFloat(String(c.totalCommissionEarned) || '0'),
          createdAt: c.createdAt,
        })),
      };
    }),

    // Obtener historial de ganancias del asociado (por cada pago de sus clientes)
    getMyEarnings: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const isAssociate = ctx.user.role === 'associate' || ctx.isSuperAdmin;
        if (!isAssociate) throw new TRPCError({ code: 'FORBIDDEN' });
        const { getAssociateEarnings } = await import('./db');
        return getAssociateEarnings(ctx.user.id, input.limit ?? 50);
      }),

    // [SuperAdmin] Vincular un cliente con su asociado referidor
    linkClientToAssociate: protectedProcedure
      .input(z.object({
        clientUserId: z.number(),
        associateCommissionId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const { linkClientToAssociate } = await import('./db');
        await linkClientToAssociate(input.clientUserId, input.associateCommissionId);
        return { success: true };
      }),

    // [SuperAdmin] Obtener todos los asociados con sus ganancias pendientes de liquidar
    getPendingLiquidations: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
      if (!db) return [];
      const { users, associateCommissions, associateEarnings } = await import('../drizzle/schema');
      const { eq, and, desc } = await import('drizzle-orm');
      const associates = await db.select().from(users).where(eq(users.role, 'associate'));
      const result = await Promise.all(associates.map(async (assoc) => {
        const pending = await db.select().from(associateEarnings)
          .where(and(eq(associateEarnings.associateUserId, assoc.id), eq(associateEarnings.status, 'pending')))
          .orderBy(desc(associateEarnings.createdAt));
        const pendingTotal = pending.reduce((acc, e) => acc + parseFloat(String(e.commissionAmount) || '0'), 0);
        const commRec = await db.select().from(associateCommissions)
          .where(eq(associateCommissions.associateUserId, assoc.id));
        const totalEarned = commRec.reduce((acc, c) => acc + parseFloat(String(c.totalCommissionEarned) || '0'), 0);
        return {
          associateId: assoc.id,
          associateName: assoc.name || assoc.email || `Asociado #${assoc.id}`,
          associateEmail: assoc.email,
          pendingTotal: Math.round(pendingTotal * 100) / 100,
          pendingCount: pending.length,
          totalEarned: Math.round(totalEarned * 100) / 100,
          recentEarnings: pending.slice(0, 5).map(e => ({
            id: e.id,
            paymentAmount: parseFloat(String(e.paymentAmount)),
            commissionAmount: parseFloat(String(e.commissionAmount)),
            commissionRate: parseFloat(String(e.commissionRate)),
            currency: e.currency,
            createdAt: e.createdAt,
          })),
        };
      }));
      return result.filter(r => r.pendingTotal > 0 || r.totalEarned > 0);
    }),

    // [SuperAdmin] Marcar ganancias como pagadas (liquidar al asociado)
    markEarningsPaid: protectedProcedure
      .input(z.object({
        associateUserId: z.number(),
        reference: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb ? m.getDb() : null);
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { associateEarnings } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const now = Date.now();
        await db.update(associateEarnings)
          .set({ status: 'paid', paidAt: now, paidReference: input.reference })
          .where(and(
            eq(associateEarnings.associateUserId, input.associateUserId),
            eq(associateEarnings.status, 'pending'),
          ));
        const { createNotification } = await import('./db');
        await createNotification({
          userId: input.associateUserId,
          type: 'payment_received',
          title: '✅ Comisión liquidada',
          message: `Tu comisión acumulada ha sido transferida. Referencia: ${input.reference}`,
          actionUrl: '/dashboard/associate',
        });
        return { success: true };
      }),
  }),
  advisor: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const { invokeLLM } = await import('./_core/llm');
        const systemPrompt = `Eres el Asesor Estratégico de KobraPay, un asistente de IA privado y exclusivo para el dueño de la plataforma KobraPay. Tu nombre es "KobraPay Advisor".

KobraPay es una plataforma de cobros y pagos digitales que opera en México y más de 24 países. Permite a los negocios aceptar pagos con tarjeta (Visa, Mastercard, Amex), OXXO y transferencias SPEI, crear enlaces de pago personalizados, gestionar transacciones y emitir facturas digitales (CFDI).

PLAN Y ESTRUCTURA DE COMISIONES (plan único de lanzamiento):
- Plan Beta: 4.6% + $3.50 MXN + IVA por transacción. Sin mensualidad, sin hardware, sin permanencia.
Desglose: Stripe cobra 3.6% + $3 MXN, KobraPay gana 1% + $0.50 MXN. El IVA (16%) se aplica sobre la parte KobraPay.

CÁLCULO DE GANANCIAS PARA KOBRAPAY (estimados con 1% + $0.50 MXN):
- Cliente procesa $10K MXN/mes: KobraPay gana ~$105 MXN/mes
- Cliente procesa $50K MXN/mes: KobraPay gana ~$525 MXN/mes
- Cliente procesa $100K MXN/mes: KobraPay gana ~$1,050 MXN/mes
- Cliente procesa $500K MXN/mes: KobraPay gana ~$5,250 MXN/mes

MÉTODOS DE PAGO DISPONIBLES (configurables por enlace):
- Tarjeta de crédito/débito (Visa, Mastercard, Amex)
- OXXO (pago en efectivo, México)
- SPEI (transferencia bancaria, México)
El superadmin puede habilitar/deshabilitar OXXO y SPEI globalmente desde el Panel de Configuración.

ROLES EN LA PLATAFORMA:
- Superadmin (tú): acceso total, configura comisiones globales, aprueba Enterprise, ve todas las transacciones
- Asistente KobraPay: equipo interno, revisa onboarding, aprueba/rechaza prospectos
- Admin Empresa: dueño del negocio cliente, gestiona su cuenta y empleados
- Empleado: usuario del negocio, crea enlaces, solicita reembolsos (requiere aprobación del admin)
- Asociado: vendedor externo con comisión escalonada (0.3% a 5% según cartera)

FLUJO DE REEMBOLSOS:
- Empleados: solo SOLICITAN (queda pendiente)
- Admins del negocio: APRUEBAN o RECHAZAN solicitudes de sus empleados
- Superadmin: ejecuta reembolsos directamente sin aprobación previa
- Reembolsos parciales: disponibles

ONBOARDING Y APROBACIÓN:
- El negocio completa encuesta de bienvenida
- Sistema asigna plan automáticamente según volumen declarado
- El asistente KobraPay revisa y aprueba o ajusta
- Para Enterprise: el superadmin negocia directamente

Tu rol es:
1. Ayudar al dueño a NEGOCIAR con clientes potenciales (dar argumentos, calcular precios)
2. Responder dudas sobre la plataforma, precios y competencia
3. Sugerir estrategias para CONSEGUIR y RETENER clientes
4. Explicar conceptos técnicos de forma simple y clara
5. Calcular cuánto ganaría KobraPay con un cliente específico según su volumen
6. Dar consejos de ventas, marketing y propuestas comerciales
7. Ayudar a redactar mensajes, propuestas o respuestas para clientes

Responde SIEMPRE en español mexicano, de forma directa, práctica y como si fueras un socio de negocios experimentado. Sé conciso pero completo. Cuando calcules comisiones o ganancias, muestra los números claramente con formato de tabla cuando sea útil.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            ...input.messages,
          ],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sin respuesta del modelo' });
        return { message: typeof content === 'string' ? content : JSON.stringify(content) };
      }),
  }),

  // ─── Soporte técnico y buzón de sugerencias ──────────────────────────────
  support: router({
    // Crear ticket de soporte
    createTicket: protectedProcedure
      .input(z.object({
        category: z.enum(['technical', 'billing', 'feature', 'bug', 'other']),
        subject: z.string().min(5).max(255),
        description: z.string().min(10),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { supportTickets } = await import('../drizzle/schema');
        const now = Date.now();
        await db.insert(supportTickets).values({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? '',
          userName: ctx.user.name ?? ctx.user.email ?? undefined,
          category: input.category,
          subject: input.subject,
          description: input.description,
          status: 'open',
          priority: input.priority,
          createdAt: now,
          updatedAt: now,
        });
        const { notifyOwner } = await import('./_core/notification');
        await notifyOwner({
          title: `Nuevo ticket de soporte: ${input.subject}`,
          content: `Usuario: ${ctx.user.email}\nCategoría: ${input.category}\nPrioridad: ${input.priority}\n\n${input.description}`,
        });
        return { success: true };
      }),

    // Obtener tickets del usuario
    getMyTickets: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) return [];
      const { eq, desc } = await import('drizzle-orm');
      const { supportTickets } = await import('../drizzle/schema');
      return db.select().from(supportTickets)
        .where(eq(supportTickets.userId, ctx.user.id))
        .orderBy(desc(supportTickets.createdAt));
    }),

    // Obtener todos los tickets (admin)
    getAllTickets: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) return [];
      const { desc } = await import('drizzle-orm');
      const { supportTickets } = await import('../drizzle/schema');
      const isSuperAdmin = (ctx.user as Record<string, unknown>)?.isSuperAdmin === true;
      const isAdmin = ctx.user.role === 'admin';
      if (!isSuperAdmin && !isAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    }),

    // Responder/resolver ticket (admin)
    resolveTicket: protectedProcedure
      .input(z.object({
        ticketId: z.number(),
        resolution: z.string(),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { supportTickets } = await import('../drizzle/schema');
        const isSuperAdmin = (ctx.user as Record<string, unknown>)?.isSuperAdmin === true;
        const isAdmin = ctx.user.role === 'admin';
        if (!isSuperAdmin && !isAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        await db.update(supportTickets)
          .set({
            resolution: input.resolution,
            status: input.status,
            resolvedAt: input.status === 'resolved' || input.status === 'closed' ? now : undefined,
            updatedAt: now,
          })
          .where(eq(supportTickets.id, input.ticketId));
        return { success: true };
      }),

    // IA de soporte técnico
    aiSupport: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import('./_core/llm');
        const systemPrompt = `Eres el asistente de soporte técnico de KobraPay, una plataforma de cobros y pagos digitales disponible en México y más de 24 países.

Tu función es ayudar a los usuarios a resolver problemas técnicos con la plataforma KobraPay.

PLAN DISPONIBLE:
- Plan Beta: 4.6% + $3.50 MXN + IVA por transacción. Sin mensualidad, sin hardware, sin permanencia. Activación en 24h.
Desglose: Stripe cobra 3.6% + $3 MXN, KobraPay cobra 1% + $0.50 MXN. El IVA (16%) se aplica sobre la parte KobraPay.

MÉTODOS DE PAGO SOPORTADOS:
- Tarjeta de crédito/débito (Visa, Mastercard, Amex)
- OXXO (pago en efectivo en tiendas OXXO, México)
- SPEI (transferencia bancaria, México)
Nota: Los métodos de pago se configuran por enlace de pago. El negocio puede habilitar/deshabilitar cada método.

MÓDULOS DISPONIBLES EN KOBRAPAY:
- Cobros / Links de Pago: crear enlaces con métodos de pago configurables, compartir por WhatsApp o QR
- Mis Ventas: historial de transacciones, filtros, exportar CSV, eliminar con PIN
- Clientes: base de datos de pagadores con KobraScore
- Facturación CFDI: facturas digitales
- Contratos Digitales: crear y firmar contratos (Art. 89 Código de Comercio)
- Cobros Recurrentes: suscripciones automáticas
- Agenda Médica: citas y expedientes
- Recursos Humanos: empleados, nómina, checador
- Catálogo / POS: productos y punto de venta
- Reportes Mensuales: PDF con logo del negocio
- KobraScore: puntuación de riesgo por cliente
- Perfil Público del Negocio: página pública /p/slug
- Configuración: datos fiscales, notificaciones, seguridad, PIN de eliminación

ROLES Y PERMISOS:
- Admin Empresa: acceso completo a su cuenta, puede aprobar reembolsos de empleados
- Empleado: puede crear enlaces y ver ventas, solo puede SOLICITAR reembolsos (requiere aprobación del admin)
- Asociado: acceso a su panel de comisiones y clientes referidos

FLUJO DE REEMBOLSOS:
- Empleados: solo pueden solicitar reembolso (queda pendiente)
- Admins del negocio: aprueban o rechazan solicitudes de sus empleados
- Reembolsos parciales: disponibles, se especifica el monto
- El cliente recibe email automático cuando se procesa su reembolso

Problemas comunes y soluciones:
- "No puedo iniciar sesión": verificar correo y contraseña, usar el enlace de recuperación de contraseña
- "El pago no aparece": verificar en Mis Ventas, puede tardar 5 min en actualizarse
- "Error al crear enlace": verificar que todos los campos obligatorios estén llenos
- "No recibo notificaciones": verificar configuración en Ajustes > Notificaciones
- "El cliente no puede pagar": verificar que el enlace no haya expirado, que la tarjeta sea válida, que el método de pago esté habilitado en el enlace
- "¿Cuándo recibo mi dinero?": el procesador de pagos transfiere en 2-7 días hábiles según el plan
- "Error al procesar pago con OXXO": verificar que OXXO esté habilitado en el enlace y que el monto sea válido
- "Error al procesar pago con SPEI": verificar que SPEI esté habilitado en el enlace
- "No puedo hacer reembolso": si eres empleado, solo puedes solicitar; el admin debe aprobar
- "¿Cómo elimino una transacción?": en Mis Ventas, seleccionar transacción(es) y usar el botón de eliminar con PIN de 4 dígitos
- "¿Cómo configuro mi PIN de eliminación?": en Configuración > Seguridad

Responde SIEMPRE en español mexicano, de forma amable, clara y paso a paso. Si el problema es muy complejo o requiere intervención humana, sugiere crear un ticket de soporte.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            ...input.messages,
          ],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sin respuesta' });
        return { message: typeof content === 'string' ? content : JSON.stringify(content) };
      }),
  }),

  // ─── Buzón de sugerencias / feedback ─────────────────────────────────────
  feedback: router({
    // Enviar sugerencia o reporte
    send: protectedProcedure
      .input(z.object({
        type: z.enum(['suggestion', 'bug', 'feature_request', 'compliment', 'other']),
        subject: z.string().min(3).max(255),
        message: z.string().min(10),
        rating: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { feedbackMessages } = await import('../drizzle/schema');
        const now = Date.now();
        await db.insert(feedbackMessages).values({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? '',
          userName: ctx.user.name ?? ctx.user.email ?? undefined,
          type: input.type,
          subject: input.subject,
          message: input.message,
          rating: input.rating ?? undefined,
          status: 'new',
          createdAt: now,
        });
        const { notifyOwner } = await import('./_core/notification');
        const typeLabels: Record<string, string> = {
          suggestion: 'Sugerencia', bug: 'Reporte de bug',
          feature_request: 'Solicitud de función', compliment: 'Felicitación', other: 'Otro',
        };
        await notifyOwner({
          title: `${typeLabels[input.type] || 'Feedback'}: ${input.subject}`,
          content: `De: ${ctx.user.email}\n${input.rating ? `Calificación: ${input.rating}/5\n` : ''}\n${input.message}`,
        });
        return { success: true };
      }),

    // Obtener feedback (admin)
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await import('./db').then(m => m.getDb());
      if (!db) return [];
      const { desc } = await import('drizzle-orm');
      const { feedbackMessages } = await import('../drizzle/schema');
      const isSuperAdmin = (ctx.user as Record<string, unknown>)?.isSuperAdmin === true;
      const isAdmin = ctx.user.role === 'admin';
      if (!isSuperAdmin && !isAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
      return db.select().from(feedbackMessages).orderBy(desc(feedbackMessages.createdAt));
    }),
    // Responder feedback (admin)
    reply: protectedProcedure
      .input(z.object({
        feedbackId: z.number(),
        adminReply: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { eq } = await import('drizzle-orm');
        const { feedbackMessages } = await import('../drizzle/schema');
        const isSuperAdmin = (ctx.user as Record<string, unknown>)?.isSuperAdmin === true;
        const isAdmin = ctx.user.role === 'admin';
        if (!isSuperAdmin && !isAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        await db.update(feedbackMessages)
          .set({ adminReply: input.adminReply, status: 'replied', repliedAt: Date.now() })
          .where(eq(feedbackMessages.id, input.feedbackId));
        return { success: true };
      }),
  }),

  // ─── Motor de Scoring IA para Registro de Clientes ───────────────────────────
  aiScoring: router({
    // Evaluar una solicitud de registro con IA
    evaluate: protectedProcedure
      .input(z.object({
        applicantEmail: z.string().email(),
        applicantName: z.string().optional(),
        businessName: z.string().optional(),
        businessType: z.string().optional(),
        monthlyRevenue: z.string().optional(),
        rfc: z.string().optional(),
        phone: z.string().optional(),
        associateClientId: z.number().optional(),
        onboardingSurveyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin && ctx.user.role !== 'assistant') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { registrationScores } = await import('../drizzle/schema');
        const { eq, or } = await import('drizzle-orm');
        const { invokeLLM } = await import('./_core/llm');

        // Verificar duplicados
        const existing = await db.select().from(registrationScores)
          .where(eq(registrationScores.applicantEmail, input.applicantEmail));
        const isDuplicate = existing.length > 0;

        // Llamar a la IA para scoring
        const prompt = `Eres un motor de scoring para KobraPay, una plataforma de pagos mexicana.
Evalúa esta solicitud de registro de negocio y asigna un score del 0 al 100.

Datos del solicitante:
- Email: ${input.applicantEmail}
- Nombre: ${input.applicantName || 'No proporcionado'}
- Negocio: ${input.businessName || 'No proporcionado'}
- Tipo de negocio: ${input.businessType || 'No especificado'}
- Ingresos mensuales estimados: ${input.monthlyRevenue || 'No especificado'}
- RFC: ${input.rfc || 'No proporcionado'}
- Teléfono: ${input.phone || 'No proporcionado'}
- ¿Email ya registrado antes?: ${isDuplicate ? 'SÍ - POSIBLE DUPLICADO' : 'No'}

Criterios de scoring:
- 80-100: Auto-aprobar (negocio legítimo, datos completos, sin señales de riesgo)
- 50-79: Revisión manual (datos incompletos o señales menores de riesgo)
- 0-49: Auto-rechazar (señales claras de fraude, duplicado, datos falsos)

Responde SOLO con JSON válido:
{
  "score": <número 0-100>,
  "decision": "auto_approved" | "manual_review" | "auto_rejected",
  "reasoning": "<explicación breve en español>",
  "riskFlags": ["<señal1>", "<señal2>"],
  "scoreFactors": {
    "emailQuality": <0-20>,
    "businessInfo": <0-20>,
    "rfcProvided": <0-20>,
    "revenueEstimate": <0-20>,
    "noDuplicates": <0-20>
  }
}`;

        let aiScore = 50;
        let decision: 'auto_approved' | 'manual_review' | 'auto_rejected' = 'manual_review';
        let aiReasoning = 'Revisión manual requerida';
        let riskFlags: string[] = [];
        let scoreFactors = {};

        try {
          const aiResponse = await invokeLLM({
            messages: [
              { role: 'system', content: 'Eres un motor de scoring de riesgo para una plataforma de pagos. Responde SOLO con JSON válido, sin markdown.' },
              { role: 'user', content: prompt },
            ],
          });
          const rawContent = aiResponse.choices[0]?.message?.content;
          const content = typeof rawContent === 'string' ? rawContent : '{}';
          const parsed = JSON.parse(content);
          aiScore = Math.min(100, Math.max(0, parsed.score || 50));
          decision = parsed.decision || 'manual_review';
          aiReasoning = parsed.reasoning || 'Sin razonamiento';
          riskFlags = parsed.riskFlags || [];
          scoreFactors = parsed.scoreFactors || {};
        } catch (e) {
          // Si la IA falla, usar revisión manual
          aiReasoning = 'Error al evaluar con IA - revisión manual requerida';
        }

        // Guardar en la base de datos
        const now = Date.now();
        const [record] = await db.insert(registrationScores).values({
          applicantEmail: input.applicantEmail,
          applicantName: input.applicantName,
          businessName: input.businessName,
          associateClientId: input.associateClientId,
          onboardingSurveyId: input.onboardingSurveyId,
          aiScore,
          decision,
          scoreFactors: JSON.stringify(scoreFactors),
          riskFlags: JSON.stringify(riskFlags),
          aiReasoning,
          createdAt: now,
          updatedAt: now,
        });

        return { aiScore, decision, aiReasoning, riskFlags, scoreFactors, id: record?.insertId };
      }),

    // Listar todos los scores (para el superadmin)
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        decision: z.enum(['auto_approved', 'manual_review', 'auto_rejected']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin && ctx.user.role !== 'assistant') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb());
        if (!db) return [];
        const { registrationScores } = await import('../drizzle/schema');
        const { desc, eq } = await import('drizzle-orm');
        let query = db.select().from(registrationScores).orderBy(desc(registrationScores.createdAt)).limit(input.limit);
        return query;
      }),

    // Revisión manual: aprobar o rechazar
    review: protectedProcedure
      .input(z.object({
        scoreId: z.number(),
        decision: z.enum(['auto_approved', 'auto_rejected']),
        reviewerNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: 'FORBIDDEN' });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { registrationScores } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await db.update(registrationScores)
          .set({
            decision: input.decision,
            reviewedBy: ctx.user.id,
            reviewedAt: Date.now(),
            reviewerNotes: input.reviewerNotes,
            updatedAt: Date.now(),
          })
          .where(eq(registrationScores.id, input.scoreId));
        return { success: true };
      }),
  }),

  // --- Cotización por Email ---───────────────────────────────────────────────
  quote: router({
    sendByEmail: protectedProcedure
      .input(z.object({
        prospectEmail: z.string().email(),
        prospectName: z.string(),
        mode: z.enum(["online", "terminal"]),
        amount: z.number().positive(),
        kobrapayRate: z.number().min(0).max(100),
        ivaRate: z.number().min(0).max(100),
        monthlyVolume: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const { sendQuoteEmail } = await import("./_core/email");

        // Stripe México: 3.6% + $3 MXN (tarifa real verificada en dashboard Stripe)
        const stripeFixed = 3.00;
        const stripeRate = 0.036;
        const stripeFee = input.amount * stripeRate + stripeFixed;
        const kpFee = input.amount * (input.kobrapayRate / 100);
        const kpIva = kpFee * (input.ivaRate / 100);
        const totalDeducted = stripeFee + kpFee + kpIva;
        const netForBusiness = input.amount - totalDeducted;
        const effectiveRate = (totalDeducted / input.amount) * 100;

        const competitors = input.mode === "online" ? [
          { name: "Mercado Pago", rate: 3.29, fixed: 0 },
          { name: "PayPal", rate: 3.5, fixed: 4 },
          { name: "Clip (online)", rate: 3.6, fixed: 0 },
          { name: "Conekta", rate: 2.9, fixed: 0.30 },
        ] : [
          { name: "Clip (presencial)", rate: 3.6, fixed: 0 },
          { name: "Mercado Pago Point", rate: 3.29, fixed: 0 },
          { name: "BBVA Terminal", rate: 3.2, fixed: 0 },
          { name: "Stripe solo", rate: 2.7, fixed: 0.05 },
        ];

        const competitorsWithNet = competitors.map(c => ({
          ...c,
          net: input.amount - (input.amount * (c.rate / 100) + c.fixed),
        }));

        const bestCompetitorNet = Math.max(...competitorsWithNet.map(c => c.net));
        const savings = netForBusiness - bestCompetitorNet;
        const savingsText = savings > 0
          ? `Con KobraPay recibes $${savings.toFixed(2)} MXN más que con la mejor alternativa disponible.`
          : `KobraPay ofrece una tasa competitiva de ${effectiveRate.toFixed(2)}% efectivo.`;

        // Generar explicación con IA
        let aiExplanation = `Tu tasa efectiva con KobraPay es de ${effectiveRate.toFixed(2)}%, que incluye la comisión de procesamiento Stripe y la comisión KobraPay. ${savingsText} Sin mensualidades ni contratos.`;
        try {
          const llmRes = await invokeLLM({
            messages: [
              { role: "system", content: "Eres un asesor financiero de KobraPay. Escribe una explicación breve (2-3 oraciones, máximo 60 palabras) en español para un prospecto de negocio, explicando por qué KobraPay es una buena opción para procesar sus pagos. Sé directo, profesional y enfocado en el ahorro. No uses emojis." },
              { role: "user", content: `El prospecto cobra $${input.amount} MXN por transacción. Con KobraPay recibe $${netForBusiness.toFixed(2)} MXN neto (tasa efectiva ${effectiveRate.toFixed(2)}%). La mejor competencia le daría $${bestCompetitorNet.toFixed(2)} MXN. Ahorro vs competencia: $${savings.toFixed(2)} MXN. Modo: ${input.mode === "online" ? "cobro online" : "terminal física"}.` },
            ],
          });
          const content = llmRes?.choices?.[0]?.message?.content;
          if (typeof content === "string" && content.length > 10) {
            aiExplanation = content;
          }
        } catch (e) {
          console.warn("[Quote] LLM falló, usando explicación default", e);
        }

        // Proyección mensual
        let monthlyNet: number | undefined;
        if (input.monthlyVolume && input.monthlyVolume > 0) {
          const mStripe = input.monthlyVolume * stripeRate + stripeFixed * (input.monthlyVolume / input.amount);
          const mKp = input.monthlyVolume * (input.kobrapayRate / 100);
          const mIva = mKp * (input.ivaRate / 100);
          monthlyNet = input.monthlyVolume - mStripe - mKp - mIva;
        }

        const associateName = ctx.user.name || ctx.user.email || "Tu Asesor KobraPay";

        const sent = await sendQuoteEmail({
          prospectEmail: input.prospectEmail,
          prospectName: input.prospectName,
          associateName,
          mode: input.mode,
          amount: input.amount,
          kobrapayRate: input.kobrapayRate,
          ivaRate: input.ivaRate,
          netForBusiness,
          totalDeducted,
          effectiveRate,
          competitors: competitorsWithNet,
          aiExplanation,
          monthlyVolume: input.monthlyVolume,
          monthlyNet,
        });

        return { success: sent, aiExplanation, netForBusiness, effectiveRate };
      }),

    // Cotización pública (desde landing page, sin login)
    sendPublicQuote: publicProcedure
      .input(z.object({
        prospectEmail: z.string().email(),
        prospectName: z.string(),
        monthlyVolume: z.number().positive(),
        singleAmount: z.number().positive(),
        kpRate: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const { sendQuoteEmail } = await import("./_core/email");
        const iva = 0.16;
        // Stripe México: 3.6% + $3 MXN (tarifa real verificada)
        const stripeRate = 0.036;
        const stripeFixed = 3.00;
        const stripeFee = input.singleAmount * stripeRate + stripeFixed;
        const kpFee = input.singleAmount * (input.kpRate / 100);
        const kpIva = kpFee * iva;
        const totalDeducted = stripeFee + kpFee + kpIva;
        const netForBusiness = input.singleAmount - totalDeducted;
        const effectiveRate = (totalDeducted / input.singleAmount) * 100;
        const competitors = [
          { name: "Mercado Pago", rate: 3.29, fixed: 0 },
          { name: "PayPal", rate: 3.5, fixed: 4 },
          { name: "Clip", rate: 3.6, fixed: 0 },
          { name: "Conekta", rate: 2.9, fixed: 0.30 },
        ];
        const competitorsWithNet = competitors.map(c => ({
          ...c,
          net: input.singleAmount - (input.singleAmount * (c.rate / 100) + c.fixed),
        }));
        const bestCompetitorNet = Math.max(...competitorsWithNet.map(c => c.net));
        const savings = netForBusiness - bestCompetitorNet;
        let aiExplanation = `Con KobraPay recibes $${netForBusiness.toFixed(2)} MXN por cada $${input.singleAmount} MXN cobrado (tasa efectiva ${effectiveRate.toFixed(2)}%). ${savings > 0 ? `Eso es $${savings.toFixed(2)} MXN más que con la mejor alternativa del mercado.` : ""} Sin mensualidades, sin contratos.`;
        try {
          const llmRes = await invokeLLM({
            messages: [
              { role: "system", content: "Eres un asesor financiero de KobraPay. Escribe una explicación breve (2-3 oraciones, máximo 60 palabras) en español para un prospecto de negocio, explicando por qué KobraPay es una buena opción. Sé directo y enfocado en el ahorro. No uses emojis." },
              { role: "user", content: `Prospecto con volumen mensual de $${input.monthlyVolume} MXN. Por cobro de $${input.singleAmount} MXN recibe $${netForBusiness.toFixed(2)} MXN neto. Ahorro vs competencia: $${savings.toFixed(2)} MXN. Plan KobraPay: ${input.kpRate}%.` },
            ],
          });
          const content = llmRes?.choices?.[0]?.message?.content;
          if (typeof content === "string" && content.length > 10) aiExplanation = content;
        } catch (e) { /* usa default */ }
        const monthlyStripe = input.monthlyVolume * stripeRate + stripeFixed;
        const monthlyKp = input.monthlyVolume * (input.kpRate / 100);
        const monthlyIva = monthlyKp * iva;
        const monthlyNet = input.monthlyVolume - monthlyStripe - monthlyKp - monthlyIva;
        const sent = await sendQuoteEmail({
          prospectEmail: input.prospectEmail,
          prospectName: input.prospectName,
          associateName: "El equipo KobraPay",
          mode: "online",
          amount: input.singleAmount,
          kobrapayRate: input.kpRate,
          ivaRate: 16,
          netForBusiness,
          totalDeducted,
          effectiveRate,
          competitors: competitorsWithNet,
          aiExplanation,
          monthlyVolume: input.monthlyVolume,
          monthlyNet,
        });
        return { success: sent };
      }),

    // Registrar cotización enviada en el historial
    logQuote: protectedProcedure
      .input(z.object({
        prospectEmail: z.string().email(),
        prospectName: z.string().default(""),
        monthlyVolume: z.number().default(0),
        singleAmount: z.number().default(0),
        kpRate: z.number().default(0),
        mode: z.enum(["online", "terminal"]).default("online"),
        netAmount: z.number().default(0),
        totalFee: z.number().default(0),
        effectiveRate: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { ok: false };
        const { quoteLogs } = await import("../drizzle/schema");
        await db.insert(quoteLogs).values({
          senderId: ctx.user.id,
          senderName: ctx.user.name || ctx.user.email || "",
          prospectEmail: input.prospectEmail,
          prospectName: input.prospectName,
          monthlyVolume: String(input.monthlyVolume),
          singleAmount: String(input.singleAmount),
          kpRate: String(input.kpRate),
          mode: input.mode,
          netAmount: String(input.netAmount),
          totalFee: String(input.totalFee),
          effectiveRate: String(input.effectiveRate),
          registered: 0,
          emailSent: 1,
          createdAt: Date.now(),
        });
        return { ok: true };
      }),

    // Historial de cotizaciones enviadas
    getLogs: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        all: z.boolean().default(false),
      }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { logs: [], total: 0, page: 1, limit: 20 };
        const { quoteLogs } = await import("../drizzle/schema");
        const { eq, desc, count } = await import("drizzle-orm");
        const isSuperAdminUser = ctx.user.role === "admin";
        const showAll = input.all && isSuperAdminUser;
        const offset = (input.page - 1) * input.limit;
        const baseQuery = showAll
          ? db.select().from(quoteLogs)
          : db.select().from(quoteLogs).where(eq(quoteLogs.senderId, ctx.user.id));
        const rows = await baseQuery.orderBy(desc(quoteLogs.createdAt)).limit(input.limit).offset(offset);
        const countQuery = showAll
          ? db.select({ total: count() }).from(quoteLogs)
          : db.select({ total: count() }).from(quoteLogs).where(eq(quoteLogs.senderId, ctx.user.id));
        const countResult = await countQuery;
        return { logs: rows, total: countResult[0]?.total ?? 0, page: input.page, limit: input.limit };
      }),

    // Estadisticas de cotizaciones
    getStats: protectedProcedure
      .input(z.object({ all: z.boolean().default(false) }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { totalSent: 0, totalConverted: 0, conversionRate: 0, avgRate: 0, totalVolumeQuoted: 0 };
        const { quoteLogs } = await import("../drizzle/schema");
        const { eq, sum, avg, count } = await import("drizzle-orm");
        const isSuperAdminUser = ctx.user.role === "admin";
        const showAll = input.all && isSuperAdminUser;
        const baseQuery = showAll
          ? db.select({
              totalSent: count(),
              totalConverted: sum(quoteLogs.registered),
              avgRate: avg(quoteLogs.effectiveRate),
              totalVolume: sum(quoteLogs.monthlyVolume),
            }).from(quoteLogs)
          : db.select({
              totalSent: count(),
              totalConverted: sum(quoteLogs.registered),
              avgRate: avg(quoteLogs.effectiveRate),
              totalVolume: sum(quoteLogs.monthlyVolume),
            }).from(quoteLogs).where(eq(quoteLogs.senderId, ctx.user.id));
        const rows = await baseQuery;
        const r = rows[0];
        const totalSent = r?.totalSent ?? 0;
        const totalConverted = Number(r?.totalConverted ?? 0);
        const conversionRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0;
        return {
          totalSent,
          totalConverted,
          conversionRate,
          avgRate: Number(r?.avgRate ?? 0),
          totalVolumeQuoted: Number(r?.totalVolume ?? 0),
        };
      }),
  }),

  // ─── Asistente IA de ayuda contextual (para todos los roles) ──────────────────
  help: router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })),
        userRole: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import('./_core/llm');
        const role = ctx.user.role || input.userRole || 'user';

        const roleContext: Record<string, string> = {
          superadmin: 'Eres el asistente personal del dueño y superadministrador de KobraPay. Tienes acceso a toda la información de la plataforma. Puedes ayudar con configuraciones avanzadas, estrategia de negocio, gestión de usuarios, configuración de comisiones globales, aprobación de planes Enterprise y cualquier aspecto de la plataforma.',
          admin: 'Eres el asistente del administrador de negocio en KobraPay. Ayudas a gestionar clientes, revisar transacciones, crear enlaces de pago, aprobar o rechazar reembolsos de empleados, configurar la cuenta y resolver dudas operativas del día a día.',
          assistant: 'Eres el asistente del equipo interno de KobraPay. Ayudas a revisar solicitudes de onboarding, aprobar o rechazar prospectos, asignar planes (Express/Connect/Enterprise), gestionar el flujo de trabajo del equipo y responder dudas sobre la plataforma.',
          associate: 'Eres el asistente del asociado de KobraPay. Ayudas a entender cómo registrar clientes, cómo funciona el sistema de comisiones escalonadas (0.3% a 5% según cartera), cómo presentar los planes Express/Connect/Enterprise a prospectos y cómo maximizar sus ingresos.',
          employee: 'Eres el asistente del empleado de KobraPay. Ayudas a usar la plataforma: crear enlaces de pago (con tarjeta, OXXO o SPEI), ver transacciones, solicitar reembolsos (que requieren aprobación del admin), entender los reportes y resolver dudas del día a día.',
          user: 'Eres el asistente del usuario de KobraPay. Ayudas a crear enlaces de pago, entender las comisiones (Plan Beta: 4.6% + $3.50 MXN + IVA — Stripe cobra 3.6%+$3 MXN, KobraPay cobra 1%+$0.50 MXN), ver el historial de ventas, gestionar reembolsos y usar todas las funciones de la plataforma de forma sencilla.',
        };

        const systemPrompt = `Eres KobraBot, el asistente inteligente de KobraPay. ${roleContext[role] || roleContext['user']}

KobraPay es una plataforma de cobros y pagos digitales disponible en México y más de 24 países:
- Acepta pagos con tarjeta (Visa, Mastercard, Amex), OXXO y SPEI desde cualquier dispositivo
- Crea enlaces de pago y compártelos por WhatsApp, correo o redes sociales
- Cada enlace puede tener métodos de pago configurados (tarjeta, OXXO, SPEI)
- Cobra recurrente: mensualidades, suscripciones, colegiaturas
- Facturas digitales (CFDI) integradas
- Contratos digitales con firma electrónica (Art. 89 Código de Comercio)
- Agenda médica y expedientes para clínicas
- Gestión de personal (RH básico)
- KobraScore: puntuación de riesgo por cliente
- Perfil Público del Negocio: página pública /p/slug

PLAN Y COMISIONES:
- Plan Beta: 4.6% + $3.50 MXN + IVA por transacción. Sin mensualidad, sin hardware, sin permanencia. Activación en 24h.
Desglose: Stripe cobra 3.6% + $3 MXN, KobraPay cobra 1% + $0.50 MXN. El IVA (16%) se aplica sobre la parte KobraPay.

REEMBOLSOS:
- Empleados: solo pueden SOLICITAR reembolso (requiere aprobación del admin)
- Admins del negocio: APRUEBAN o RECHAZAN solicitudes de sus empleados
- Reembolsos parciales: disponibles

Cómo crear un enlace de pago:
1. Ve a "Links de Pago" en el menú lateral
2. Haz clic en "Nuevo link"
3. Ingresa el nombre del producto/servicio y el monto
4. Selecciona los métodos de pago que quieres habilitar (tarjeta, OXXO, SPEI)
5. Copia el link y compártelo con tu cliente
6. Cuando el cliente pague, recibes una notificación y el dinero se deposita en tu cuenta

Responde SIEMPRE en español mexicano, de forma amigable, clara y práctica. Si no sabes algo, sugiere contactar al soporte. Máximo 3 párrafos por respuesta, a menos que sea una guía paso a paso.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            ...input.messages,
          ],
        });
        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Sin respuesta del modelo' });
        return { message: typeof content === 'string' ? content : JSON.stringify(content) };
      }),
  }),

  // ─── KobraScore ────────────────────────────────────────────────────────────
  kobraScore: router({
    getScore: protectedProcedure
      .input(z.object({ targetUserId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { transactions: txT, chargebacks: cbT, users: usersT } = await import('../drizzle/schema');
        const { eq, and, gte } = await import('drizzle-orm');
        const db2 = await getDb();
        if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { targetUserId } = input;
        const now = Date.now();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
        const recentTxs = await db2.select().from(txT).where(and(eq(txT.userId, targetUserId), eq(txT.status, 'succeeded'), gte(txT.createdAt, thirtyDaysAgo)));
        const totalVolume30d = recentTxs.reduce((s: number, t: { amount: string | null }) => s + parseFloat(String(t.amount || '0')), 0);
        const txs90d = await db2.select().from(txT).where(and(eq(txT.userId, targetUserId), eq(txT.status, 'succeeded'), gte(txT.createdAt, ninetyDaysAgo)));
        const txCount90d = txs90d.length;
        const cbs = await db2.select().from(cbT).where(and(eq(cbT.userId, targetUserId), gte(cbT.createdAt, ninetyDaysAgo)));
        const chargebackCount = cbs.length;
        const chargebackRate = txCount90d > 0 ? (chargebackCount / txCount90d) * 100 : 0;
        const userRows = await db2.select({ createdAt: usersT.createdAt }).from(usersT).where(eq(usersT.id, targetUserId)).limit(1);
        const accountAgeDays = userRows[0]?.createdAt
          ? Math.floor((now - new Date(userRows[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        let volumeScore = totalVolume30d >= 50000 ? 30 : totalVolume30d >= 20000 ? 20 : totalVolume30d >= 5000 ? 10 : totalVolume30d > 0 ? 5 : 0;
        let freqScore = txCount90d >= 50 ? 25 : txCount90d >= 20 ? 18 : txCount90d >= 5 ? 10 : txCount90d > 0 ? 5 : 0;
        let cbScore = chargebackRate === 0 ? 25 : chargebackRate < 1 ? 18 : chargebackRate < 3 ? 10 : 0;
        let ageScore = accountAgeDays >= 365 ? 20 : accountAgeDays >= 180 ? 15 : accountAgeDays >= 90 ? 10 : accountAgeDays >= 30 ? 5 : 0;
        const totalScore = volumeScore + freqScore + cbScore + ageScore;
        let level: string; let color: string; let description: string;
        if (totalScore >= 85) { level = 'Excelente'; color = '#10b981'; description = 'Cliente de alto valor, riesgo mínimo'; }
        else if (totalScore >= 65) { level = 'Bueno'; color = '#3b82f6'; description = 'Cliente confiable con buen historial'; }
        else if (totalScore >= 45) { level = 'Regular'; color = '#f59e0b'; description = 'Cliente en desarrollo, monitorear actividad'; }
        else if (totalScore >= 25) { level = 'Bajo'; color = '#f97316'; description = 'Actividad limitada, requiere seguimiento'; }
        else { level = 'Nuevo'; color = '#6b7280'; description = 'Sin historial suficiente para evaluar'; }
        return {
          score: totalScore, level, color, description,
          breakdown: {
            volume: { score: volumeScore, max: 30, label: 'Volumen de Ventas', detail: `$${totalVolume30d.toLocaleString('es-MX', { minimumFractionDigits: 2 })} en 30 días` },
            frequency: { score: freqScore, max: 25, label: 'Frecuencia de Cobros', detail: `${txCount90d} transacciones en 90 días` },
            chargebacks: { score: cbScore, max: 25, label: 'Historial de Contracargos', detail: chargebackCount === 0 ? 'Sin contracargos' : `${chargebackCount} contracargo(s) — ${chargebackRate.toFixed(1)}%` },
            age: { score: ageScore, max: 20, label: 'Antigüedad de Cuenta', detail: `${accountAgeDays} días en la plataforma` },
          },
        };
      }),
    getAllScores: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import('./db');
      const { transactions: txT, chargebacks: cbT, users: usersT } = await import('../drizzle/schema');
      const { eq, and, gte } = await import('drizzle-orm');
      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const vendorUsers = await db2.select({ id: usersT.id, name: usersT.name, email: usersT.email, createdAt: usersT.createdAt }).from(usersT).where(eq(usersT.createdByUserId, ctx.user.id));
      const now30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const now90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const scores = await Promise.all(vendorUsers.map(async (u) => {
        const txs30d = await db2.select({ amount: txT.amount }).from(txT).where(and(eq(txT.userId, u.id), eq(txT.status, 'succeeded'), gte(txT.createdAt, now30)));
        const txs90d = await db2.select({ id: txT.id }).from(txT).where(and(eq(txT.userId, u.id), eq(txT.status, 'succeeded'), gte(txT.createdAt, now90)));
        const cbs = await db2.select({ id: cbT.id }).from(cbT).where(eq(cbT.userId, u.id));
        const vol = txs30d.reduce((s: number, t: { amount: string | null }) => s + parseFloat(String(t.amount || '0')), 0);
        const cbRate = txs90d.length > 0 ? (cbs.length / txs90d.length) * 100 : 0;
        const ageDays = Math.floor((Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const vs = vol >= 50000 ? 30 : vol >= 20000 ? 20 : vol >= 5000 ? 10 : vol > 0 ? 5 : 0;
        const fs = txs90d.length >= 50 ? 25 : txs90d.length >= 20 ? 18 : txs90d.length >= 5 ? 10 : txs90d.length > 0 ? 5 : 0;
        const cs = cbRate === 0 ? 25 : cbRate < 1 ? 18 : cbRate < 3 ? 10 : 0;
        const as2 = ageDays >= 365 ? 20 : ageDays >= 180 ? 15 : ageDays >= 90 ? 10 : ageDays >= 30 ? 5 : 0;
        const total = vs + fs + cs + as2;
        const level = total >= 85 ? 'Excelente' : total >= 65 ? 'Bueno' : total >= 45 ? 'Regular' : total >= 25 ? 'Bajo' : 'Nuevo';
        const color = total >= 85 ? '#10b981' : total >= 65 ? '#3b82f6' : total >= 45 ? '#f59e0b' : total >= 25 ? '#f97316' : '#6b7280';
        return { userId: u.id, name: u.name ?? '', email: u.email, score: total, level, color, volume30d: vol, txCount90d: txs90d.length, chargebackCount: cbs.length };
      }));
      return scores;
    }),
  }),
  deposits: router({
    // Listar depósitos del usuario autenticado
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { deposits } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        const limit = input?.limit ?? 50;
        const rows = await db.select().from(deposits)
          .where(eq(deposits.userId, ctx.user.id))
          .orderBy(desc(deposits.createdAt))
          .limit(limit);
        return rows;
      }),

    // Listar todos los depósitos (solo superadmin/admin)
    listAll: protectedProcedure
      .input(z.object({ userId: z.number().optional(), limit: z.number().min(1).max(200).default(100) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'superadmin' && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { deposits } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        const limit = input?.limit ?? 100;
        let query = db.select().from(deposits).orderBy(desc(deposits.createdAt)).limit(limit);
        if (input?.userId) {
          const rows = await db.select().from(deposits)
            .where(eq(deposits.userId, input.userId))
            .orderBy(desc(deposits.createdAt))
            .limit(limit);
          return rows;
        }
        return await query;
      }),

    // Crear solicitud de depósito
    create: protectedProcedure
      .input(z.object({
        amount: z.number().positive(),
        destinationClabe: z.string().length(18).optional(),
        destinationBank: z.string().max(128).optional(),
        beneficiaryName: z.string().max(255).optional(),
        reference: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { deposits } = await import('../drizzle/schema');
        const fee = parseFloat((input.amount * 0.005).toFixed(2)); // 0.5% fee
        const netAmount = parseFloat((input.amount - fee).toFixed(2));
        const now = Date.now();
        const estimatedDate = now + (2 * 24 * 60 * 60 * 1000); // +2 días hábiles
        await db.insert(deposits).values({
          userId: ctx.user.id,
          amount: String(input.amount),
          fee: String(fee),
          netAmount: String(netAmount),
          currency: 'MXN',
          depositStatus: 'pending',
          destinationClabe: input.destinationClabe || null,
          destinationBank: input.destinationBank || null,
          beneficiaryName: input.beneficiaryName || null,
          reference: input.reference || null,
          estimatedDate,
          createdAt: now,
          updatedAt: now,
        } as any);
        return { success: true, netAmount, fee };
      }),

    // Actualizar estado de depósito (solo superadmin)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
        trackingNumber: z.string().max(64).optional(),
        failureReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'superadmin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { deposits } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        await db.update(deposits).set({
          depositStatus: input.status as any,
          trackingNumber: input.trackingNumber || null,
          failureReason: input.failureReason || null,
          completedAt: input.status === 'completed' ? now : null,
          updatedAt: now,
        } as any).where(eq(deposits.id, input.id));
        return { success: true };
      }),
  }),

  transferRecords: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { transferRecords } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        const limit = input?.limit ?? 50;
        return db.select().from(transferRecords)
          .where(eq(transferRecords.userId, ctx.user.id))
          .orderBy(desc(transferRecords.createdAt))
          .limit(limit);
      }),

    // Superadmin puede cargar transferencias manualmente para cualquier usuario
    create: protectedProcedure
      .input(z.object({
        userId: z.number().optional(), // si no se pasa, se usa el usuario autenticado
        type: z.enum(['sent', 'received']),
        transferType: z.enum(['spei', 'wire', 'zelle', 'crypto', 'other']),
        amount: z.number().positive(),
        currency: z.string().max(8).default('MXN'),
        status: z.enum(['pending', 'completed', 'failed', 'cancelled']).default('pending'),
        trackingNumber: z.string().max(128).optional(),
        senderName: z.string().max(255).optional(),
        senderBank: z.string().max(128).optional(),
        senderClabe: z.string().max(18).optional(),
        recipientName: z.string().max(255).optional(),
        recipientBank: z.string().max(128).optional(),
        recipientClabe: z.string().max(18).optional(),
        recipientAccount: z.string().max(64).optional(),
        concept: z.string().max(255).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const targetUserId = (ctx.user.role === 'superadmin' && input.userId) ? input.userId : ctx.user.id;
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { transferRecords } = await import('../drizzle/schema');
        const now = Date.now();
        await db.insert(transferRecords).values({
          userId: targetUserId,
          type: input.type,
          transferType: input.transferType,
          amount: String(input.amount),
          currency: input.currency,
          status: input.status,
          trackingNumber: input.trackingNumber || null,
          senderName: input.senderName || null,
          senderBank: input.senderBank || null,
          senderClabe: input.senderClabe || null,
          recipientName: input.recipientName || null,
          recipientBank: input.recipientBank || null,
          recipientClabe: input.recipientClabe || null,
          recipientAccount: input.recipientAccount || null,
          concept: input.concept || null,
          notes: input.notes || null,
          completedAt: input.status === 'completed' ? now : null,
          createdAt: now,
          updatedAt: now,
        } as any);
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
        trackingNumber: z.string().max(128).optional(),
        failureReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'superadmin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { transferRecords } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const now = Date.now();
        await db.update(transferRecords).set({
          status: input.status as any,
          trackingNumber: input.trackingNumber || null,
          failureReason: input.failureReason || null,
          completedAt: input.status === 'completed' ? now : null,
          updatedAt: now,
        } as any).where(eq(transferRecords.id, input.id));
        return { success: true };
      }),
  }),


  metrics: router({
    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { users, transactions, chargebacks, paymentLinks } = await import('../drizzle/schema');
      const { gte, eq, and, sql } = await import('drizzle-orm');

      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekAgoDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const monthAgoDate = new Date(now - 30 * 24 * 60 * 60 * 1000);

      // Ventas del día
      const todaySales = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0)`,
        count: sql<number>`COUNT(*)`,
      }).from(transactions).where(
        and(gte(transactions.createdAt, todayStart), sql`${transactions.status} = 'succeeded'`)
      );

      // Ventas de la semana
      const weekSales = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0)`,
        count: sql<number>`COUNT(*)`,
      }).from(transactions).where(
        and(gte(transactions.createdAt, weekAgoDate), sql`${transactions.status} = 'succeeded'`)
      );

      // Nuevos registros hoy
      const newUsersToday = await db.select({ count: sql<number>`COUNT(*)` })
        .from(users).where(gte(users.createdAt, todayStart));

      // Nuevos registros este mes
      const newUsersMonth = await db.select({ count: sql<number>`COUNT(*)` })
        .from(users).where(gte(users.createdAt, monthAgoDate));

      // Total usuarios activos (con al menos 1 transacción)
      const activeUsers = await db.select({
        count: sql<number>`COUNT(DISTINCT userId)`,
      }).from(transactions).where(gte(transactions.createdAt, monthAgoDate));

      // Chargebacks pendientes
      const pendingChargebacks = await db.select({ count: sql<number>`COUNT(*)` })
        .from(chargebacks).where(sql`${chargebacks.status} IN ('open', 'under_review')`);

      // Links de pago activos
      const activeLinks = await db.select({ count: sql<number>`COUNT(*)` })
        .from(paymentLinks).where(sql`${paymentLinks.status} = 'active'`);

      // Top 5 usuarios por ventas este mes
      const topUsers = await db.select({
        userId: transactions.userId,
        total: sql<string>`SUM(CAST(amount AS DECIMAL(10,2)))`,
        count: sql<number>`COUNT(*)`,
      }).from(transactions)
        .where(and(gte(transactions.createdAt, monthAgoDate), sql`${transactions.status} = 'succeeded'`))
        .groupBy(transactions.userId)
        .orderBy(sql`SUM(CAST(amount AS DECIMAL(10,2))) DESC`)
        .limit(5);

      // Obtener nombres de los top usuarios
      const topUserIds = topUsers.map(u => u.userId).filter(Boolean) as number[];
      let topUsersWithNames: Array<{ userId: number; name: string; email: string; total: string; count: number }> = [];
      if (topUserIds.length > 0) {
        const usersInfo = await db.select({ id: users.id, name: users.name, email: users.email })
          .from(users).where(sql`id IN (${sql.join(topUserIds.map(id => sql`${id}`), sql`, `)})`);
        topUsersWithNames = topUsers.map(u => {
          const info = usersInfo.find(ui => ui.id === u.userId);
          return {
            userId: u.userId as number,
            name: info?.name || 'Sin nombre',
            email: info?.email || '',
            total: u.total || '0',
            count: u.count || 0,
          };
        });
      }

      return {
        today: {
          salesTotal: parseFloat(todaySales[0]?.total || '0'),
          salesCount: Number(todaySales[0]?.count || 0),
          newUsers: Number(newUsersToday[0]?.count || 0),
        },
        week: {
          salesTotal: parseFloat(weekSales[0]?.total || '0'),
          salesCount: Number(weekSales[0]?.count || 0),
        },
        month: {
          newUsers: Number(newUsersMonth[0]?.count || 0),
          activeUsers: Number(activeUsers[0]?.count || 0),
        },
        alerts: {
          pendingChargebacks: Number(pendingChargebacks[0]?.count || 0),
          activeLinks: Number(activeLinks[0]?.count || 0),
        },
        topUsers: topUsersWithNames,
        generatedAt: now,
      };
    }),
  }),

  // ─── CONFIGURACIÓN GLOBAL DE PLATAFORMA ────────────────────────────────────
  platformConfig: router({
    // Obtener todas las configuraciones (superadmin)
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { platformConfig } = await import('../drizzle/schema');
      const configs = await db.select().from(platformConfig);
      return configs;
    }),

    // Obtener configuración pública (para simulador y frontend)
    getPublic: publicProcedure.query(async () => {
      const { getDb } = await import('./db');
      const db = await getDb();
      const { platformConfig } = await import('../drizzle/schema');
      const keys = ['kobrapay_fee_rate', 'stripe_fee_rate', 'stripe_fee_fixed_mxn', 'iva_rate', 'oxxo_enabled', 'spei_enabled'];
      const result: Record<string, string> = {};
      if (db) {
        const configs = await db.select().from(platformConfig);
        for (const c of configs) {
          if (keys.includes(c.key)) result[c.key] = c.value;
        }
      }
      // Defaults si no existen
      return {
        kobrapayFeeRate: parseFloat(result['kobrapay_fee_rate'] ?? '1.5'),
        stripeFeeRate: parseFloat(result['stripe_fee_rate'] ?? '1.5'),
        stripeFeeFixed: parseFloat(result['stripe_fee_fixed_mxn'] ?? '3'),
        ivaRate: parseFloat(result['iva_rate'] ?? '16'),
        oxxoEnabled: (result['oxxo_enabled'] ?? 'true') === 'true',
        speiEnabled: (result['spei_enabled'] ?? 'true') === 'true',
      };
    }),

    // Actualizar una configuración (superadmin)
    update: protectedProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { platformConfig } = await import('../drizzle/schema');
        const now = Date.now();
        await db.insert(platformConfig)
          .values({ key: input.key, value: input.value, updatedAt: now, updatedBy: ctx.user.id })
          .onDuplicateKeyUpdate({ set: { value: input.value, updatedAt: now, updatedBy: ctx.user.id } });
        return { success: true };
      }),

    // Actualizar múltiples configuraciones a la vez (superadmin)
    updateMany: protectedProcedure
      .input(z.array(z.object({ key: z.string(), value: z.string() })))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { platformConfig } = await import('../drizzle/schema');
        const now = Date.now();
        for (const item of input) {
          await db.insert(platformConfig)
            .values({ key: item.key, value: item.value, updatedAt: now, updatedBy: ctx.user.id })
            .onDuplicateKeyUpdate({ set: { value: item.value, updatedAt: now, updatedBy: ctx.user.id } });
        }
        return { success: true };
      }),
  }),

  // ─── Impersonación de clientes (solo superadmin) ──────────────────────────────
  impersonate: router({
    // Obtener lista de usuarios que se pueden impersonar
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await import('./db').then(m => m.getDb());
      if (!db) return [];
      const { users, vendorSettings } = await import('../drizzle/schema');
      const { eq, ne } = await import('drizzle-orm');
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        openId: users.openId,
        accountStatus: users.accountStatus,
        createdAt: users.createdAt,
      }).from(users)
        .where(ne(users.id, ctx.user.id))
        .orderBy(users.id);
      // Obtener businessName de vendorSettings
      const allVS = await db.select({ userId: vendorSettings.userId, businessName: vendorSettings.businessName }).from(vendorSettings);
      const vsMap = new Map(allVS.map(v => [v.userId, v.businessName]));
      return allUsers.map(u => ({ ...u, businessName: vsMap.get(u.id) || null }));
    }),

    // Crear token de sesión para impersonar a un usuario
    startSession: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN" });
        const db = await import('./db').then(m => m.getDb());
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const found = await db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email })
          .from(users).where(eq(users.id, input.userId)).limit(1);
        if (!found.length) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        const target = found[0];
        const { sdk: sdkInstance } = await import('./_core/sdk');
        const { COOKIE_NAME } = await import('@shared/const');
        const { getSessionCookieOptions } = await import('./_core/cookies');
        // Guardar el token original del superadmin en una cookie separada para poder restaurar
        const originalToken = ctx.req.cookies?.[COOKIE_NAME];
        const impersonateToken = await sdkInstance.createSessionToken(target.openId, {
          name: target.name || '',
          expiresInMs: 4 * 60 * 60 * 1000, // 4 horas máximo
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        // Guardar token original para restaurar después
        if (originalToken) {
          ctx.res.cookie('kobrapay_superadmin_restore', originalToken, { ...cookieOptions, maxAge: 4 * 60 * 60 * 1000 });
        }
        ctx.res.cookie(COOKIE_NAME, impersonateToken, { ...cookieOptions, maxAge: 4 * 60 * 60 * 1000 });
        return { success: true, targetUser: { id: target.id, name: target.name, email: target.email } };
      }),

    // Restaurar sesión original del superadmin
    restoreSession: protectedProcedure.mutation(async ({ ctx }) => {
      const { COOKIE_NAME } = await import('@shared/const');
      const { getSessionCookieOptions } = await import('./_core/cookies');
      const restoreToken = ctx.req.cookies?.['kobrapay_superadmin_restore'];
      if (!restoreToken) throw new TRPCError({ code: "NOT_FOUND", message: "No hay sesión de superadmin para restaurar" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, restoreToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      ctx.res.clearCookie('kobrapay_superadmin_restore', cookieOptions);
      return { success: true };
    }),
  }),

  // ─── Registro Público de Asociados ────────────────────────────────────────
  associatePublic: router({
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        password: z.string().min(8).max(128),
        phone: z.string().min(10).max(32),
        city: z.string().min(2).max(100),
        state: z.string().min(2).max(100),
        bio: z.string().max(500).optional(),
        experience: z.string().max(255).optional(),
        bankName: z.string().max(100).optional(),
        clabe: z.string().length(18).optional(),
        bankAccountHolder: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import('bcryptjs');
        const crypto = await import('crypto');
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { users, associateProfiles } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const existing = await db.select({ id: users.id })
          .from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Ya existe una cuenta con este correo electrónico' });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `email_${crypto.randomBytes(16).toString('hex')}`;
        await db.insert(users).values({
          openId,
          name: input.name,
          email: input.email,
          loginMethod: 'email',
          role: 'associate',
          accountStatus: 'active',
          isActive: true,
          onboardingCompleted: false,
          emailVerified: false,
          passwordHash,
          lastSignedIn: new Date(),
        });
        const newUser = await db.select({ id: users.id })
          .from(users).where(eq(users.email, input.email)).limit(1);
        if (newUser.length > 0) {
          await db.insert(associateProfiles).values({
            userId: newUser[0].id,
            phone: input.phone,
            city: input.city,
            state: input.state,
            bio: input.bio,
            experience: input.experience,
            bankName: input.bankName,
            clabe: input.clabe,
            bankAccountHolder: input.bankAccountHolder,
          });
        }
        try {
          await notifyOwner({
            title: `🤝 Nuevo asociado: ${input.name}`,
            content: `${input.name} (${input.email}) se registró como asociado desde ${input.city}, ${input.state}.`,
          });
        } catch { /* no bloquear */ }
        return { success: true, message: 'Cuenta de asociado creada. Ya puedes iniciar sesión.' };
      }),
  }),

  // ─── Lista Negra de Pagadores ────────────────────────────────────────────
  blacklist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getPayerBlacklist } = await import('./db');
      return getPayerBlacklist(ctx.user.id);
    }),
    add: protectedProcedure
      .input(z.object({
        type: z.enum(['email', 'card_last4']),
        value: z.string().min(1).max(320),
        reason: z.string().max(255).optional(),
        payerName: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { addPayerToBlacklist } = await import('./db');
        await addPayerToBlacklist({
          userId: ctx.user.id,
          type: input.type,
          value: input.value,
          reason: input.reason,
          payerName: input.payerName,
        });
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { removeFromBlacklist } = await import('./db');
        await removeFromBlacklist(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Webhooks ───────────────────────────────────────────────────────────────
  webhooks: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const { webhookEndpoints } = await import('../drizzle/schema');
      const { eq, desc } = await import('drizzle-orm');
      return db.select().from(webhookEndpoints)
        .where(eq(webhookEndpoints.userId, ctx.user.id))
        .orderBy(desc(webhookEndpoints.createdAt));
    }),

    create: protectedProcedure
      .input(z.object({
        url: z.string().url('Debe ser una URL válida').max(512),
        description: z.string().max(255).optional(),
        events: z.array(z.string()).min(1, 'Selecciona al menos un evento'),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { webhookEndpoints } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        // Limit: max 5 webhooks per user
        const existing = await db.select({ id: webhookEndpoints.id })
          .from(webhookEndpoints).where(eq(webhookEndpoints.userId, ctx.user.id));
        if (existing.length >= 5) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Máximo 5 webhooks por cuenta' });
        const crypto = await import('crypto');
        const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');
        const result = await db.insert(webhookEndpoints).values({
          userId: ctx.user.id,
          url: input.url,
          description: input.description || null,
          events: JSON.stringify(input.events),
          secret,
          isActive: true,
          failureCount: 0,
        });
        return { success: true, id: (result as any).insertId, secret };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        url: z.string().url().max(512).optional(),
        description: z.string().max(255).optional(),
        events: z.array(z.string()).min(1).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { webhookEndpoints } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const found = await db.select().from(webhookEndpoints)
          .where(and(eq(webhookEndpoints.id, input.id), eq(webhookEndpoints.userId, ctx.user.id))).limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const updates: Record<string, unknown> = {};
        if (input.url !== undefined) updates.url = input.url;
        if (input.description !== undefined) updates.description = input.description;
        if (input.events !== undefined) updates.events = JSON.stringify(input.events);
        if (input.isActive !== undefined) { updates.isActive = input.isActive; if (input.isActive) updates.failureCount = 0; }
        await db.update(webhookEndpoints).set(updates).where(eq(webhookEndpoints.id, input.id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { webhookEndpoints } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const found = await db.select({ id: webhookEndpoints.id })
          .from(webhookEndpoints)
          .where(and(eq(webhookEndpoints.id, input.id), eq(webhookEndpoints.userId, ctx.user.id))).limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, input.id));
        return { success: true };
      }),

    regenerateSecret: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { webhookEndpoints } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const found = await db.select({ id: webhookEndpoints.id })
          .from(webhookEndpoints)
          .where(and(eq(webhookEndpoints.id, input.id), eq(webhookEndpoints.userId, ctx.user.id))).limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        const crypto = await import('crypto');
        const newSecret = 'whsec_' + crypto.randomBytes(24).toString('hex');
        await db.update(webhookEndpoints).set({ secret: newSecret }).where(eq(webhookEndpoints.id, input.id));
        return { success: true, secret: newSecret };
      }),

    getLogs: protectedProcedure
      .input(z.object({ webhookId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { webhookEndpoints, webhookDeliveryLogs } = await import('../drizzle/schema');
        const { eq, and, desc } = await import('drizzle-orm');
        // Verify ownership
        const found = await db.select({ id: webhookEndpoints.id })
          .from(webhookEndpoints)
          .where(and(eq(webhookEndpoints.id, input.webhookId), eq(webhookEndpoints.userId, ctx.user.id))).limit(1);
        if (!found.length) throw new TRPCError({ code: 'NOT_FOUND' });
        return db.select().from(webhookDeliveryLogs)
          .where(eq(webhookDeliveryLogs.webhookEndpointId, input.webhookId))
          .orderBy(desc(webhookDeliveryLogs.attemptedAt))
          .limit(50);
      }),
  }),
});
export type AppRouter = typeof appRouter;

// NOTE: The apiKeys router is appended below — do not duplicate
