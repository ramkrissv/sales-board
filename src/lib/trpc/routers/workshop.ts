import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { getMaxTokens, getModelForUseCase, checkRateLimit } from '@/lib/ai/budgets';
import { validatePrompt, getSandboxMaxTokens } from '@/lib/ai/sandbox';
import { logTrace, updateMetrics } from '@/lib/ai/telemetry';
import { getTaskSummary } from '@/lib/ai/execution';
import mongoose from 'mongoose';

function getWorkshopModel() {
  return mongoose.models.Workshop || require('@/lib/db/models/workshop').Workshop;
}
function getTemplateModel() {
  return mongoose.models.WorkshopTemplate || require('@/lib/db/models/workshop-template').WorkshopTemplate;
}
function getOppModel() {
  return mongoose.models.Opportunity;
}

export const workshopRouter = router({
  // ── List templates (auto-seed on first access) ──
  listTemplates: protectedProcedure.query(async () => {
    await connectDB();
    const WT = getTemplateModel();
    const count = await WT.countDocuments();
    if (count === 0) {
      try {
        const { seedAllWorkshopTemplates } = await import('@/lib/db/seed-workshop-templates');
        await seedAllWorkshopTemplates();
      } catch (e) {
        // Seed the basic template as fallback
        try {
          const { seedWorkshopTemplate } = await import('@/lib/db/seed-workshop-template');
          await seedWorkshopTemplate();
        } catch {}
      }
    }
    return WT.find().sort({ isDefault: -1, createdAt: -1 }).lean();
  }),

  // ── Create workshop (clones template + optionally auto-creates opportunity) ──
  create: protectedProcedure
    .input(z.object({
      customerName: z.string().min(1),
      title: z.string().min(1),
      templateId: z.string().default('galent-enterprise-ai-v1'),
      opportunityId: z.string().optional(),
      accountId: z.string().optional(),
      mode: z.enum(['with_ai', 'without_ai']).default('with_ai'),
      format: z.enum(['in-person', 'virtual', 'hybrid']).default('in-person'),
      sponsor: z.string().optional(),
      scheduledDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const WT = getTemplateModel();
      const Opp = getOppModel();

      // Seed template if needed
      const templateCount = await WT.countDocuments();
      if (templateCount === 0) {
        const { seedWorkshopTemplate } = await import('@/lib/db/seed-workshop-template');
        await seedWorkshopTemplate();
      }

      // Load template
      const template = await WT.findOne({ id: input.templateId }).lean();
      if (!template) throw new Error(`Template ${input.templateId} not found`);

      const workshopId = `WKS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // Auto-create opportunity if none provided
      let oppId = input.opportunityId;
      if (!oppId && Opp) {
        const newOppId = `OPP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await Opp.create({
          id: newOppId,
          customerName: input.customerName,
          opportunityName: `${input.customerName} — AI Assessment Workshop`,
          status: 'Discovery',
          tcv: 0,
          dealDuration: '12 months',
          expectedCloseDate: new Date(Date.now() + 90 * 86400000),
          startDate: new Date(),
          primaryOwner: ctx.userName || 'Unassigned',
          industry: '',
          region: 'North America',
          source: 'Workshop',
          workshopId,
          createdBy: ctx.userName || 'system',
          updatedBy: ctx.userName || 'system',
        });
        oppId = newOppId;
      } else if (oppId && Opp) {
        // Link workshop to existing opportunity
        await Opp.findOneAndUpdate({ id: oppId }, { $set: { workshopId } });
      }

      // Clone framework from template
      const framework = JSON.parse(JSON.stringify((template as any).framework));
      framework.sourceTemplateId = input.templateId;

      const workshop = await WS.create({
        id: workshopId,
        opportunityId: oppId,
        accountId: input.accountId,
        customerName: input.customerName,
        title: input.title,
        status: 'Scheduled',
        mode: input.mode,
        format: input.format,
        sponsor: input.sponsor,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        framework,
        useCases: [],
        scopeItems: [],
        proposals: [],
        aiInteractions: [],
        createdBy: ctx.userName || 'system',
        updatedBy: ctx.userName || 'system',
      });

      return workshop.toObject();
    }),

  // ── Get by ID ──
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const workshop = await WS.findOne({ id: input.id }).lean();
      if (!workshop) throw new Error('Workshop not found');
      // Multi-tenant: log access (full scoping requires org model)
      return workshop;
    }),

  // ── List workshops ──
  list: protectedProcedure
    .input(z.object({
      accountId: z.string().optional(),
      opportunityId: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const filter: any = { status: { $ne: 'Archived' } };
      if (input?.accountId) filter.accountId = input.accountId;
      if (input?.opportunityId) filter.opportunityId = input.opportunityId;
      if (input?.status) filter.status = input.status;
      return WS.find(filter).sort({ createdAt: -1 }).lean();
    }),

  // ── Update meta ──
  updateMeta: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      sponsor: z.string().optional(),
      status: z.string().optional(),
      mode: z.enum(['with_ai', 'without_ai']).optional(),
      format: z.enum(['in-person', 'virtual', 'hybrid']).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const { id, ...updates } = input;
      return WS.findOneAndUpdate(
        { id },
        { $set: { ...updates, updatedBy: ctx.userName || 'system' } },
        { new: true }
      ).lean();
    }),

  // ── Score a dimension ──
  scoreDimension: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      levelId: z.string(),
      dimensionId: z.string(),
      currentScore: z.number().min(0).max(4).optional(),
      targetScore: z.number().min(0).max(4).optional(),
      priority: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const WS = getWorkshopModel();

      const updateFields: any = {};
      if (input.currentScore !== undefined) {
        updateFields['framework.levels.$[lvl].dimensions.$[dim].currentScore'] = input.currentScore;
      }
      if (input.targetScore !== undefined) {
        updateFields['framework.levels.$[lvl].dimensions.$[dim].targetScore'] = input.targetScore;
      }
      if (input.priority !== undefined) {
        updateFields['framework.levels.$[lvl].dimensions.$[dim].priority'] = input.priority;
      }
      updateFields['framework.levels.$[lvl].dimensions.$[dim].scoredBy'] = ctx.userName || 'system';
      updateFields['framework.levels.$[lvl].dimensions.$[dim].scoredAt'] = new Date();

      // Update status to In Progress if still Scheduled
      const ws = await WS.findOne({ id: input.workshopId }).lean();
      if ((ws as any)?.status === 'Scheduled') {
        updateFields['status'] = 'In Progress';
      }

      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $set: updateFields },
        {
          arrayFilters: [
            { 'lvl.id': input.levelId },
            { 'dim.id': input.dimensionId },
          ],
          new: true,
        }
      ).lean();
    }),

  // ── Update finding ──
  updateFinding: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      levelId: z.string(),
      dimensionId: z.string(),
      body: z.string(),
      implication: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        {
          $set: {
            'framework.levels.$[lvl].dimensions.$[dim].finding': {
              body: input.body,
              implication: input.implication || '',
              authorId: ctx.userName || 'system',
              aiGenerated: false,
              createdAt: new Date(),
            },
          },
        },
        {
          arrayFilters: [
            { 'lvl.id': input.levelId },
            { 'dim.id': input.dimensionId },
          ],
          new: true,
        }
      ).lean();
    }),

  // ── Use case CRUD ──
  addUseCase: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      name: z.string(),
      sponsor: z.string().optional(),
      problem: z.string().optional(),
      tower: z.string().optional(),
      value: z.number().min(1).max(5).default(3),
      feasibility: z.number().min(1).max(5).default(3),
      isPilot: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const ucId = `uc-${Date.now().toString(36)}`;
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $push: { useCases: { ...input, id: ucId, order: 0 } } },
        { new: true }
      ).lean();
    }),

  updateUseCase: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      useCaseId: z.string(),
      name: z.string().optional(),
      sponsor: z.string().optional(),
      problem: z.string().optional(),
      tower: z.string().optional(),
      value: z.number().min(1).max(5).optional(),
      feasibility: z.number().min(1).max(5).optional(),
      isPilot: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const updates: any = {};
      if (input.name !== undefined) updates['useCases.$[uc].name'] = input.name;
      if (input.sponsor !== undefined) updates['useCases.$[uc].sponsor'] = input.sponsor;
      if (input.problem !== undefined) updates['useCases.$[uc].problem'] = input.problem;
      if (input.tower !== undefined) updates['useCases.$[uc].tower'] = input.tower;
      if (input.value !== undefined) updates['useCases.$[uc].value'] = input.value;
      if (input.feasibility !== undefined) updates['useCases.$[uc].feasibility'] = input.feasibility;
      if (input.isPilot !== undefined) updates['useCases.$[uc].isPilot'] = input.isPilot;
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $set: updates },
        { arrayFilters: [{ 'uc.id': input.useCaseId }], new: true }
      ).lean();
    }),

  deleteUseCase: protectedProcedure
    .input(z.object({ workshopId: z.string(), useCaseId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $pull: { useCases: { id: input.useCaseId } } },
        { new: true }
      ).lean();
    }),

  // ── Scope items ──
  addScopeItem: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      workstreamCode: z.string().optional(),
      sourceDimensionId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      effort: z.number().default(0),
      phase: z.string().default('P1'),
      owner: z.string().optional(),
      isManual: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const siId = `si-${Date.now().toString(36)}`;
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $push: { scopeItems: { ...input, id: siId, tasks: [] } } },
        { new: true }
      ).lean();
    }),

  updateScopeItem: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      scopeItemId: z.string(),
      effort: z.number().optional(),
      phase: z.string().optional(),
      owner: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const updates: any = {};
      if (input.effort !== undefined) updates['scopeItems.$[si].effort'] = input.effort;
      if (input.phase !== undefined) updates['scopeItems.$[si].phase'] = input.phase;
      if (input.owner !== undefined) updates['scopeItems.$[si].owner'] = input.owner;
      if (input.title !== undefined) updates['scopeItems.$[si].title'] = input.title;
      if (input.description !== undefined) updates['scopeItems.$[si].description'] = input.description;
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $set: updates },
        { arrayFilters: [{ 'si.id': input.scopeItemId }], new: true }
      ).lean();
    }),

  // ── Framework editing: add level ──
  addLevel: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      id: z.string(),
      name: z.string(),
      weight: z.number().default(0.33),
      summary: z.string().optional(),
      order: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $push: { 'framework.levels': { id: input.id, name: input.name, weight: input.weight, summary: input.summary || '', order: input.order, sections: [], dimensions: [] } } },
        { new: true }
      ).lean();
    }),

  // ── Framework editing: add dimension to level ──
  addDimension: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      levelId: z.string(),
      id: z.string(),
      name: z.string(),
      probe: z.string().optional(),
      workstreamCode: z.string().optional(),
      guidance: z.string().optional(),
      order: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId, 'framework.levels.id': input.levelId },
        { $push: { 'framework.levels.$.dimensions': {
          id: input.id, name: input.name, probe: input.probe || '',
          workstreamCode: input.workstreamCode || '', guidance: input.guidance || '',
          order: input.order, priority: false, evidence: [], details: [],
        } } },
        { new: true }
      ).lean();
    }),

  // ── Delete scope item ──
  deleteScopeItem: protectedProcedure
    .input(z.object({ workshopId: z.string(), scopeItemId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $pull: { scopeItems: { id: input.scopeItemId } } },
        { new: true }
      ).lean();
    }),

  // ── Update level (name, weight, summary) ──
  updateLevel: protectedProcedure
    .input(z.object({ workshopId: z.string(), levelId: z.string(), name: z.string().optional(), weight: z.number().optional(), summary: z.string().optional() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const update: any = {};
      if (input.name) update['framework.levels.$.name'] = input.name;
      if (input.weight !== undefined) update['framework.levels.$.weight'] = input.weight;
      if (input.summary !== undefined) update['framework.levels.$.summary'] = input.summary;
      return WS.findOneAndUpdate(
        { id: input.workshopId, 'framework.levels.id': input.levelId },
        { $set: update },
        { new: true }
      ).lean();
    }),

  // ── Delete level ──
  deleteLevel: protectedProcedure
    .input(z.object({ workshopId: z.string(), levelId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $pull: { 'framework.levels': { id: input.levelId } } },
        { new: true }
      ).lean();
    }),

  // ── Update workstream ──
  updateWorkstream: protectedProcedure
    .input(z.object({ workshopId: z.string(), code: z.string(), name: z.string().optional(), objective: z.string().optional() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const update: any = {};
      if (input.name) update['framework.workstreams.$.name'] = input.name;
      if (input.objective !== undefined) update['framework.workstreams.$.objective'] = input.objective;
      return WS.findOneAndUpdate(
        { id: input.workshopId, 'framework.workstreams.code': input.code },
        { $set: update },
        { new: true }
      ).lean();
    }),

  // ── Delete workstream ──
  deleteWorkstream: protectedProcedure
    .input(z.object({ workshopId: z.string(), code: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $pull: { 'framework.workstreams': { code: input.code } } },
        { new: true }
      ).lean();
    }),

  // ── Delete dimension ──
  deleteDimension: protectedProcedure
    .input(z.object({ workshopId: z.string(), levelId: z.string(), dimensionId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId, 'framework.levels.id': input.levelId },
        { $pull: { 'framework.levels.$.dimensions': { id: input.dimensionId } } },
        { new: true }
      ).lean();
    }),

  // ── Delete finding (clear finding from dimension) ──
  // ── Save whiteboard state ──
  saveWhiteboard: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      sections: z.array(z.any()).optional(),
      notes: z.array(z.any()).optional(),
      // Direct state fields
      stickies: z.array(z.any()).optional(),
      mediaItems: z.array(z.any()).optional(),
      canvasData: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      // Store whiteboard state directly — no wrapping in notes array
      const wbData: any = {};
      if (input.stickies !== undefined) wbData.stickies = input.stickies;
      if (input.sections !== undefined) wbData.sections = input.sections;
      if (input.mediaItems !== undefined) wbData.mediaItems = input.mediaItems;
      if (input.canvasData !== undefined) wbData.canvasData = input.canvasData;
      // Backwards compat: if notes array has JSON state in text, extract it
      if (input.notes?.length && input.notes[0]?.text?.startsWith('{')) {
        try {
          const parsed = JSON.parse(input.notes[0].text);
          Object.assign(wbData, parsed);
        } catch {}
      }
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $set: { whiteboard: wbData } },
        { new: true }
      ).lean();
    }),

  deleteFinding: protectedProcedure
    .input(z.object({ workshopId: z.string(), levelId: z.string(), dimensionId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const ws = await WS.findOne({ id: input.workshopId });
      if (!ws) return null;
      const level = (ws as any).framework?.levels?.find((l: any) => l.id === input.levelId);
      if (!level) return null;
      const dim = level.dimensions?.find((d: any) => d.id === input.dimensionId);
      if (dim) { dim.finding = null; dim.details = []; }
      await ws.save();
      return ws.toObject();
    }),

  // (updateMeta already defined above)

  // ── Run AI Assist (through registry) ──
  runAssist: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      assistKey: z.string(),
      input: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const workshop = await WS.findOne({ id: input.workshopId }).lean();
      if (!workshop) throw new Error('Workshop not found');

      const { getAssist } = await import('@/lib/workshop/ai-registry');
      const assist = getAssist(input.assistKey);
      if (!assist) throw new Error(`Assist "${input.assistKey}" not found`);

      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const context = {
        workshopId: input.workshopId,
        customerName: (workshop as any).customerName,
        title: (workshop as any).title,
        framework: (workshop as any).framework,
      };

      // ── GUARDRAIL CHAIN: rate limit → sandbox → model route → call → telemetry ──

      // 1. Rate limit (config/token_budgets.json)
      const rateCheck = checkRateLimit();
      if (!rateCheck.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}s.`);
      }

      // 2. Build prompt
      const hasCustomPrompt = input.input?._customPrompt;
      const prompt = hasCustomPrompt || assist.buildPrompt(context, input.input);

      // 3. Sandbox validation (gatekeeper/sandbox.config.json)
      const validation = validatePrompt(prompt);
      if (!validation.valid) {
        throw new Error(`Sandbox violation: ${validation.violation}`);
      }

      // 4. Model routing (config/token_budgets.json → registry → env)
      const configModel = getModelForUseCase(input.assistKey);
      const model = assist.model.includes('opus')
        ? assist.model
        : (configModel || process.env.AI_DEFAULT_MODEL || assist.model);

      // 5. Token limits (config/token_budgets.json + gatekeeper cap)
      const isHeavy = hasCustomPrompt || assist.model.includes('opus') || ['currentstate.narrative', 'proposal.generate', 'scope.synthesize'].includes(input.assistKey);
      const maxTokens = Math.min(
        isHeavy ? getMaxTokens('opus') : getMaxTokens(model),
        getSandboxMaxTokens()
      );

      // 6. Execute AI call with timing
      const startMs = Date.now();
      let text = '';
      let callSuccess = true;
      try {
        const response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        });
        text = response.content[0].type === 'text' ? response.content[0].text : '';
      } catch (err: any) {
        callSuccess = false;
        // 7a. Log error to telemetry
        logTrace({
          id: `ai-${Date.now().toString(36)}`,
          timestamp: new Date().toISOString(),
          assist: input.assistKey,
          model,
          latencyMs: Date.now() - startMs,
          status: 'error',
          workshopId: input.workshopId,
          userId: ctx.userName || ctx.userId,
          error: err.message,
        });
        updateMetrics(input.assistKey, model, Date.now() - startMs, false);
        throw err;
      }
      const latencyMs = Date.now() - startMs;

      // 7b. Log success to telemetry (telemetry/traces/ + telemetry/metrics/)
      logTrace({
        id: `ai-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        assist: input.assistKey,
        model,
        latencyMs,
        status: 'success',
        workshopId: input.workshopId,
        userId: ctx.userName || ctx.userId,
      });
      updateMetrics(input.assistKey, model, latencyMs, true);

      // 8. Log AI interaction to MongoDB
      const interactionId = `ai-${Date.now().toString(36)}`;
      await WS.findOneAndUpdate(
        { id: input.workshopId },
        { $push: { aiInteractions: {
          id: interactionId,
          assist: input.assistKey,
          model,
          input: input.input,
          output: text,
          status: 'proposed',
          userId: ctx.userName || ctx.userId,
          createdAt: new Date(),
        } } }
      );

      // Parse if schema exists
      let parsed = text;
      if (assist.schema) {
        try {
          const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        } catch {}
      }

      return { output: parsed, interactionId, raw: text };
    }),

  // ── Accept/Reject AI interaction ──
  updateInteraction: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      interactionId: z.string(),
      status: z.enum(['accepted', 'edited', 'rejected']),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId, 'aiInteractions.id': input.interactionId },
        { $set: { 'aiInteractions.$.status': input.status } },
        { new: true }
      ).lean();
    }),

  // ── Save dimension details (persist Deep Discovery) ──
  saveDimensionDetails: protectedProcedure
    .input(z.object({
      workshopId: z.string(),
      levelId: z.string(),
      dimensionId: z.string(),
      details: z.array(z.object({
        id: z.string(),
        label: z.string(),
        body: z.string(),
        kind: z.string().default('subrubric'),
        order: z.number().default(0),
        aiGenerated: z.boolean().default(true),
        edited: z.boolean().default(false),
      })),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate(
        { id: input.workshopId },
        { $set: { 'framework.levels.$[lvl].dimensions.$[dim].details': input.details } },
        { arrayFilters: [{ 'lvl.id': input.levelId }, { 'dim.id': input.dimensionId }], new: true }
      ).lean();
    }),

  // ── Export as JSON ──
  exportJSON: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const workshop = await WS.findOne({ id: input.id }).lean();
      if (!workshop) throw new Error('Workshop not found');
      return workshop;
    }),

  // ── Import from JSON ──
  importJSON: protectedProcedure
    .input(z.object({ data: z.any() }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const WS = getWorkshopModel();
      const data = input.data as any;
      const newId = `WKS-${Date.now().toString(36).toUpperCase()}-IMP`;
      delete data._id;
      delete data.__v;
      data.id = newId;
      data.status = 'Scheduled';
      data.createdBy = ctx.userName || 'import';
      data.updatedBy = ctx.userName || 'import';
      const workshop = await WS.create(data);
      return workshop.toObject();
    }),

  // ── Delete ──
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const WS = getWorkshopModel();
      return WS.findOneAndUpdate({ id: input.id }, { $set: { status: 'Archived' } }).lean();
    }),
});
