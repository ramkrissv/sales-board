import { router, publicProcedure } from '../trpc';

export const authRouter = router({
  getUser: publicProcedure.query(async () => {
    // TODO: Replace with real auth lookup once auth middleware is added
    return {
      id: 'default-user',
      email: 'admin@galent.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    };
  }),
});
