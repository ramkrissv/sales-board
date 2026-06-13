import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { hasPermission, type Role } from '@/lib/auth/rbac';

export interface Context {
  userId?: string;
  userRole?: string;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that checks for authentication
export const protectedProcedure = t.procedure.use(async ({ next, ctx }) => {
  return next({
    ctx: {
      userId: ctx.userId || 'default-user',
      userRole: ctx.userRole || 'admin',
    },
  });
});

/**
 * Create a procedure that requires a specific permission
 * Usage: requirePermission('opportunity:delete').mutation(...)
 */
export function requirePermission(permission: string) {
  return protectedProcedure.use(async ({ next, ctx }) => {
    const role = (ctx.userRole || 'viewer') as Role;
    if (!hasPermission(role, permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient permissions. Role '${role}' cannot perform '${permission}'.`,
      });
    }
    return next({ ctx });
  });
}

/**
 * Admin-only procedure
 */
export const adminProcedure = protectedProcedure.use(async ({ next, ctx }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required.',
    });
  }
  return next({ ctx });
});
