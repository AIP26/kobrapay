import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isSuperAdmin, protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const pricingRouter = router({
  getAll: publicProcedure.query(async () => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return [];
    const { sql } = await import("drizzle-orm");
    const rows = await db.execute(
      sql`SELECT * FROM pricing_plans WHERE is_active = 1 ORDER BY sort_order ASC`
    );
    return ((rows as unknown as any[][])[0] || []).map((r: any) => ({
      id: Number(r.id),
      planKey: r.plan_key as string,
      name: r.name as string,
      description: r.description as string | null,
      totalRate: parseFloat(r.total_rate),
      stripeRate: parseFloat(r.stripe_rate),
      stripeFixed: parseFloat(r.stripe_fixed),
      kobrapayRate: parseFloat(r.kobrapay_rate),
      kobrapayFixed: parseFloat(r.kobrapay_fixed),
      fixedFee: parseFloat(r.fixed_fee),
      minVolume: Number(r.min_volume),
      maxVolume: Number(r.max_volume),
      color: r.color as string,
      features: JSON.parse(r.features || "[]") as string[],
      badge: r.badge as string | null,
      sortOrder: Number(r.sort_order),
      isActive: !!r.is_active,
      updatedAt: Number(r.updated_at),
    }));
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(255).optional(),
        totalRate: z.number().min(0).max(20).optional(),
        stripeRate: z.number().min(0).max(20).optional(),
        stripeFixed: z.number().min(0).optional(),
        kobrapayRate: z.number().min(0).max(20).optional(),
        kobrapayFixed: z.number().min(0).optional(),
        fixedFee: z.number().min(0).optional(),
        minVolume: z.number().int().min(0).optional(),
        maxVolume: z.number().int().min(0).optional(),
        color: z.string().optional(),
        features: z.array(z.string()).optional(),
        badge: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sql } = await import("drizzle-orm");

      const fields: Record<string, any> = {};
      if (input.name !== undefined) fields.name = input.name;
      if (input.description !== undefined) fields.description = input.description;
      if (input.totalRate !== undefined) fields.total_rate = input.totalRate;
      if (input.stripeRate !== undefined) fields.stripe_rate = input.stripeRate;
      if (input.stripeFixed !== undefined) fields.stripe_fixed = input.stripeFixed;
      if (input.kobrapayRate !== undefined) fields.kobrapay_rate = input.kobrapayRate;
      if (input.kobrapayFixed !== undefined) fields.kobrapay_fixed = input.kobrapayFixed;
      if (input.fixedFee !== undefined) fields.fixed_fee = input.fixedFee;
      if (input.minVolume !== undefined) fields.min_volume = input.minVolume;
      if (input.maxVolume !== undefined) fields.max_volume = input.maxVolume;
      if (input.color !== undefined) fields.color = input.color;
      if (input.features !== undefined) fields.features = JSON.stringify(input.features);
      if (input.badge !== undefined) fields.badge = input.badge;
      if (input.isActive !== undefined) fields.is_active = input.isActive ? 1 : 0;
      fields.updated_at = Date.now();
      fields.updated_by = ctx.user.id;

      const fieldKeys = Object.keys(fields);
      if (fieldKeys.length > 2) {
        const parts: string[] = [];
        for (const k of fieldKeys) {
          const v = fields[k];
          const safeV = v === null ? "NULL" : ("'" + String(v).replace(/'/g, "''") + "'");
          parts.push(k + " = " + safeV);
        }
        const setClauses = parts.join(", ");
        await db.execute(sql.raw("UPDATE pricing_plans SET " + setClauses + " WHERE id = " + input.id));
      }
      return { success: true };
    }),
});
