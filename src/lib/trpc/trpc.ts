import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

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
  // In development/standalone mode, allow all requests
  // In production, this would check the session
  // For now, pass through but set default context
  return next({
    ctx: {
      userId: ctx.userId || 'default-user',
      userRole: ctx.userRole || 'admin',
    },
  });
});
