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
import { contractRouter } from './contract';
import { engagementTypeRouter } from './engagement-type';
import { settingsRouter } from './settings';
import { forecastRouter } from './forecast';
import { integrationRouter } from './integration';
import { notificationRouter } from './notification';
import { workflowRouter } from './workflow';
import { leadRouter } from './lead';
import { activityRouter } from './activity';
import { ontologyRouter } from './ontology';
import { approvalRouter } from './approval';
import { harnessRouter } from './harness';
import { campaignRouter } from './campaign';
import { directoryRouter } from './directory';

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
  contract: contractRouter,
  engagementType: engagementTypeRouter,
  settings: settingsRouter,
  forecast: forecastRouter,
  integration: integrationRouter,
  notification: notificationRouter,
  workflow: workflowRouter,
  lead: leadRouter,
  activity: activityRouter,
  ontology: ontologyRouter,
  approval: approvalRouter,
  harness: harnessRouter,
  campaign: campaignRouter,
  directory: directoryRouter,
});

export type AppRouter = typeof appRouter;
