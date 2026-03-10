import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  getRegisteredCount: publicProcedure.query(async () => {
    try {
      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) return 0;
      const { users } = await import('../../drizzle/schema');
      const { count } = await import('drizzle-orm');
      const result = await db.select({ value: count() }).from(users);
      return result[0]?.value ?? 0;
    } catch {
      return 0;
    }
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
