import { router } from '../trpc';
import { opportunityRouter } from './opportunity';
import { stakeholderRouter } from './stakeholder';
import { taskRouter } from './task';
import { resourceLinkRouter } from './resource-link';
import { accountRouter } from './account';
import { authRouter } from './auth';
import { userRouter } from './user';
import { graphRouter } from './graph';
import { aiRouter } from './ai';

export const appRouter = router({
  opportunity: opportunityRouter,
  stakeholder: stakeholderRouter,
  task: taskRouter,
  resourceLink: resourceLinkRouter,
  account: accountRouter,
  auth: authRouter,
  user: userRouter,
  graph: graphRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
