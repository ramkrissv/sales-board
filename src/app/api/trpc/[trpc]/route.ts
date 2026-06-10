import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routers';
import { connectDB } from '@/lib/db/connection';

const handler = async (req: Request) => {
  await connectDB();

  // Try to get session for context
  let userId = 'default-user';
  let userRole = 'admin';

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({ userId, userRole }),
  });
};

export { handler as GET, handler as POST };
