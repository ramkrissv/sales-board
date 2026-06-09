import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routers';
import { connectDB } from '@/lib/db/connection';

const handler = async (req: Request) => {
  await connectDB();
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });
};

export { handler as GET, handler as POST };
