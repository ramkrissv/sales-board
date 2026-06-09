import { router } from '../trpc';
import { opportunityRouter } from './opportunity';
import { stakeholderRouter } from './stakeholder';
import { taskRouter } from './task';
import { resourceLinkRouter } from './resource-link';
import { accountRouter } from './account';
import { authRouter } from './auth';
import { userRouter } from './user';
import { graphRouter } from './graph';

export const appRouter = router({
  opportunity: opportunityRouter,
  stakeholder: stakeholderRouter,
  task: taskRouter,
  resourceLink: resourceLinkRouter,
  account: accountRouter,
  auth: authRouter,
  user: userRouter,
  graph: graphRouter,
});

export type AppRouter = typeof appRouter;
