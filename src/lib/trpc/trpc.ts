import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure; // TODO: add auth middleware later
