import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── Helper: check if user is the platform owner (superadmin) ─────────────────
// El superadmin es cualquier usuario con role='superadmin' en la base de datos.
// El dueño de la plataforma obtiene ese rol automáticamente al registrarse con
// el email configurado en OWNER_EMAIL (ver db.upsertUser y auth.register).
export function isSuperAdmin(_userOpenId: string, userRole?: string): boolean {
  return userRole === 'superadmin';
}

// ─── Require any authenticated user ──────────────────────────────────────────
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      isSuperAdmin: isSuperAdmin(ctx.user.openId, ctx.user.role),
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// ─── Require admin or superadmin ─────────────────────────────────────────────
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const superAdmin = isSuperAdmin(ctx.user.openId, ctx.user.role);
    if (!superAdmin && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        isSuperAdmin: superAdmin,
      },
    });
  }),
);

// ─── Require superadmin only (platform owner) ────────────────────────────────
export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!isSuperAdmin(ctx.user.openId, ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acceso denegado. Esta sección es exclusiva del administrador de la plataforma. (10003)",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        isSuperAdmin: true as const,
      },
    });
  }),
);
