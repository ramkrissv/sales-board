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

  discover: protectedProcedure
    .input(z.object({ serviceName: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Research the software service "${input.serviceName}" and generate an integration definition for a sales intelligence platform. Return ONLY valid JSON:
{
  "name": "<official service name>",
  "type": "<crm|marketing|email|calendar|messaging|storage|project_management|analytics|finance|hr|devtools|other>",
  "description": "<1-2 sentence description of what this service does>",
  "website": "<official website URL>",
  "authMethod": "<oauth2|api_key|basic_auth|webhook>",
  "availableActions": [
    {"name": "<action name>", "description": "<what it does>", "direction": "<read|write|both>"}
  ],
  "availableDataTypes": ["<contacts|deals|tasks|emails|events|files|messages|projects|tickets|invoices|etc>"],
  "apiDocsUrl": "<URL to API documentation>",
  "webhookSupport": true or false,
  "category": "<what category for a sales team: lead_enrichment|crm_sync|communication|project_tracking|document_management|analytics|other>"
}`
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        return { name: input.serviceName, type: 'other', description: text.slice(0, 200), error: 'Could not parse AI response' };
      }
    }),

  addDiscovered: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.string(),
      description: z.string(),
      website: z.string().optional(),
      authMethod: z.string().optional(),
      availableActions: z.array(z.object({ name: z.string(), description: z.string(), direction: z.string() })).optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const existing = await Integration.findOne({ name: input.name });
      if (existing) return existing.toObject();

      const integration = await Integration.create({
        name: input.name,
        type: input.type,
        status: 'disconnected',
        description: input.description,
        config: {
          website: input.website,
          authMethod: input.authMethod,
          availableActions: input.availableActions,
          category: input.category,
        },
        syncHealth: 0,
        createdBy: 'ai-discovery',
      });
      return integration.toObject();
    }),
});
