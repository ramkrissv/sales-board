import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import Integration from '@/lib/db/models/integration';

const DEFAULT_INTEGRATIONS = [
  { name: 'Salesforce', type: 'crm' as const, icon: 'database', description: 'Sync CRM data, contacts, and deal history from Salesforce.' },
  { name: 'HubSpot', type: 'marketing' as const, icon: 'megaphone', description: 'Import marketing campaigns, leads, and engagement metrics.' },
  { name: 'Gmail', type: 'email' as const, icon: 'mail', description: 'Track email conversations and auto-log client communications.' },
  { name: 'Outlook', type: 'email' as const, icon: 'mail', description: 'Sync Outlook emails, contacts, and calendar events.' },
  { name: 'Google Calendar', type: 'calendar' as const, icon: 'calendar', description: 'Sync meetings, deadlines, and scheduled follow-ups.' },
  { name: 'Microsoft 365', type: 'calendar' as const, icon: 'calendar', description: 'Connect Office 365 calendar, Teams, and OneDrive.' },
  { name: 'Slack', type: 'messaging' as const, icon: 'message-square', description: 'Get deal alerts and updates in your Slack channels.' },
  { name: 'Microsoft Teams', type: 'messaging' as const, icon: 'message-square', description: 'Push notifications and deal summaries to Teams.' },
];

export const integrationRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    let integrations = await Integration.find().sort({ type: 1, name: 1 }).lean();

    // Seed defaults if empty
    if (integrations.length === 0) {
      await Integration.insertMany(
        DEFAULT_INTEGRATIONS.map(i => ({
          ...i,
          status: 'disconnected',
          config: {},
          syncHealth: 0,
          createdBy: 'system',
        }))
      );
      integrations = await Integration.find().sort({ type: 1, name: 1 }).lean();
    }

    return integrations;
  }),

  connect: protectedProcedure
    .input(z.object({
      id: z.string(),
      config: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const integration = await Integration.findByIdAndUpdate(
        input.id,
        {
          $set: {
            status: 'connected',
            config: input.config || {},
            lastSyncAt: new Date(),
            syncHealth: 100,
          },
        },
        { new: true }
      ).lean();

      if (!integration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration not found' });
      }

      return integration;
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const integration = await Integration.findByIdAndUpdate(
        input.id,
        {
          $set: {
            status: 'disconnected',
            config: {},
            syncHealth: 0,
          },
        },
        { new: true }
      ).lean();

      if (!integration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration not found' });
      }

      return integration;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      config: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const integration = await Integration.findByIdAndUpdate(
        input.id,
        { $set: { config: input.config || {} } },
        { new: true }
      ).lean();

      if (!integration) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration not found' });
      }

      return integration;
    }),
});
