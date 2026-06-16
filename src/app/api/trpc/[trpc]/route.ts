import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routers';
import { connectDB } from '@/lib/db/connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import mongoose from 'mongoose';

const handler = async (req: Request) => {
  await connectDB();

  // Extract real user identity from session
  let userId = 'default-user';
  let userRole = 'rep'; // Safe default — not admin
  let userName = '';

  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userId = (session.user as any).id || 'default-user';
      userName = session.user.name || session.user.email || '';

      // Look up user role from DB
      const User = mongoose.models.User;
      if (User && userId !== 'default-user') {
        const dbUser = await User.findById(userId).lean();
        if (dbUser) {
          userRole = (dbUser as any).role || 'rep';
          userName = `${(dbUser as any).firstName || ''} ${(dbUser as any).lastName || ''}`.trim() || userName;
        }
      }
    }
  } catch {
    // Session extraction failed — continue with defaults
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({ userId, userRole, userName }),
  });
};

export { handler as GET, handler as POST };
