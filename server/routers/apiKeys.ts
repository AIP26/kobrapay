import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { apiKeys } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

export const apiKeysRouter = router({
  // Listar API keys del usuario
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        permissions: apiKeys.permissions,
        lastUsedAt: apiKeys.lastUsedAt,
        requestCount: apiKeys.requestCount,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, ctx.user.id))
      .orderBy(desc(apiKeys.createdAt));
    return keys;
  }),

  // Generar nueva API key — retorna la key completa SOLO esta vez
  generate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      environment: z.enum(['live', 'test']).default('live'),
      permissions: z.enum(['checkout', 'read:stats', 'full']).default('checkout'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Limitar a 5 keys activas por usuario
      const existing = await db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(eq(apiKeys.userId, ctx.user.id));
      if (existing.length >= 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Máximo 5 API keys por cuenta. Revoca alguna antes de crear una nueva.',
        });
      }

      // Generar key: kp_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
      const rawKey = `kp_${input.environment}_${crypto.randomBytes(24).toString('hex')}`;
      const prefix = rawKey.substring(0, 16);
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      await db.insert(apiKeys).values({
        userId: ctx.user.id,
        name: input.name,
        keyHash,
        keyPrefix: prefix,
        environment: input.environment,
        permissions: input.permissions,
        isActive: true,
      });

      return { key: rawKey, prefix, environment: input.environment, name: input.name };
    }),

  // Revocar (desactivar) una API key
  revoke: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id)));
      return { success: true };
    }),

  // Obtener Merchant ID del usuario
  getMerchantInfo: protectedProcedure.query(async ({ ctx }) => {
    return {
      merchantId: `merchant_${ctx.user.id}`,
      userId: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),
});
