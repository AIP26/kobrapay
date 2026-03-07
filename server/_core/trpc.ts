import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── Helper: check if user is the platform owner (superadmin) ─────────────────
// El superadmin es ÚNICAMENTE el dueño de la plataforma identificado por OWNER_OPEN_ID.
// Los clientes con role='admin' son administradores de su propio negocio, NO superadmin.
export function isSuperAdmin(userOpenId: string, _userRole?: string): boolean {
  // Solo el dueño real de la plataforma (OWNER_OPEN_ID) es superadmin
  if (ENV.ownerOpenId && userOpenId === ENV.ownerOpenId) return true;
  return false;
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
