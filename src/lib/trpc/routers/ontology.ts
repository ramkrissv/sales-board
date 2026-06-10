import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const StageTemplateSchema = new Schema({
  stage: String, engagementType: String, serviceLine: String,
  templates: [{ name: String, type: String, description: String, required: Boolean, aiGenerable: Boolean }],
  gateCriteria: [{ field: String, condition: String, description: String }],
  roles: [{ role: String, responsibility: String }],
}, { timestamps: true });

function getModel() {
  return mongoose.models.SalesStageTemplate || mongoose.model('SalesStageTemplate', StageTemplateSchema);
}

export const ontologyRouter = router({
  getForStage: protectedProcedure
    .input(z.object({ stage: z.string(), engagementType: z.string().optional(), serviceLine: z.string().optional() }))
    .query(async ({ input }) => {
      await connectDB();
      const Model = getModel();
      // Auto-seed if empty
      const count = await Model.countDocuments();
      if (count === 0) {
        const { seedOntology } = await import('@/lib/db/seed-ontology');
        await seedOntology();
      }
      const filter: Record<string, string> = { stage: input.stage };
      if (input.engagementType) filter.engagementType = input.engagementType;
      if (input.serviceLine) filter.serviceLine = input.serviceLine;
      // Try specific first, fall back to generic
      let template = await Model.findOne(filter).lean();
      if (!template) template = await Model.findOne({ stage: input.stage }).lean();
      return template;
    }),

  list: protectedProcedure.query(async () => {
    await connectDB();
    const Model = getModel();
    const count = await Model.countDocuments();
    if (count === 0) {
      const { seedOntology } = await import('@/lib/db/seed-ontology');
      await seedOntology();
    }
    return Model.find().sort({ stage: 1 }).lean();
  }),
});
