import mongoose, { Schema } from 'mongoose';

// ── Sub-schemas ──

const EvidenceSchema = new Schema({
  kind: { type: String, enum: ['file', 'link', 'quote', 'screenshot'], default: 'quote' },
  label: String,
  url: String,
  quote: String,
  source: String,
}, { _id: false });

const DimensionDetailSchema = new Schema({
  id: { type: String, required: true },
  label: String,
  body: String,
  kind: { type: String, enum: ['subrubric', 'evidence_check', 'question', 'note'], default: 'subrubric' },
  order: { type: Number, default: 0 },
  aiGenerated: { type: Boolean, default: true },
  edited: { type: Boolean, default: false },
}, { _id: false });

const FindingSchema = new Schema({
  body: String,
  implication: String,
  authorId: String,
  aiGenerated: { type: Boolean, default: false },
  createdAt: Date,
}, { _id: false });

const DimensionSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  probe: String,
  guidance: String,
  sectionId: String,
  workstreamCode: String,
  order: { type: Number, default: 0 },
  // Scores
  currentScore: { type: Number, min: 0, max: 4 },
  targetScore: { type: Number, min: 0, max: 4 },
  confidence: { type: Number, min: 1, max: 5 },
  priority: { type: Boolean, default: false },
  scoredBy: String,
  scoredAt: Date,
  // Finding
  finding: FindingSchema,
  // Evidence
  evidence: [EvidenceSchema],
  // AI Detail children
  details: [DimensionDetailSchema],
}, { _id: false });

const SectionSchema = new Schema({
  id: { type: String, required: true },
  name: String,
  order: { type: Number, default: 0 },
}, { _id: false });

const LevelSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  summary: String,
  weight: { type: Number, default: 1 },
  order: { type: Number, default: 0 },
  sections: [SectionSchema],
  dimensions: [DimensionSchema],
}, { _id: false });

const ScalePointSchema = new Schema({
  value: { type: Number, required: true },
  label: { type: String, required: true },
  description: String,
}, { _id: false });

const ScoringScaleSchema = new Schema({
  name: { type: String, default: 'Maturity 0-4' },
  points: [ScalePointSchema],
}, { _id: false });

const WorkstreamSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  objective: String,
  order: { type: Number, default: 0 },
}, { _id: false });

const FrameworkSchema = new Schema({
  name: String,
  version: { type: Number, default: 1 },
  sourceTemplateId: String,
  scoringScale: ScoringScaleSchema,
  levels: [LevelSchema],
  workstreams: [WorkstreamSchema],
}, { _id: false });

// Use Cases
const UseCaseSchema = new Schema({
  id: { type: String, required: true },
  name: String,
  sponsor: String,
  problem: String,
  tower: String, // Business Tower / IT Tower / custom
  value: { type: Number, min: 1, max: 5, default: 3 },
  feasibility: { type: Number, min: 1, max: 5, default: 3 },
  effort: Number,
  isPilot: { type: Boolean, default: false },
  scores: Schema.Types.Mixed, // custom scoring axes
  order: { type: Number, default: 0 },
}, { _id: false });

// Scope Items
const ScopeTaskSchema = new Schema({
  id: String,
  task: String,
  estimate: Number,
  order: { type: Number, default: 0 },
  aiGenerated: { type: Boolean, default: true },
}, { _id: false });

const ScopeItemSchema = new Schema({
  id: { type: String, required: true },
  workstreamCode: String,
  sourceDimensionId: String,
  title: String,
  description: String,
  effort: { type: Number, default: 0 },
  phase: { type: String, default: 'P1' },
  owner: String,
  isManual: { type: Boolean, default: false },
  tasks: [ScopeTaskSchema],
}, { _id: false });

// Proposals
const ProposalSchema = new Schema({
  version: Number,
  title: String,
  body: Schema.Types.Mixed,
  generatedBy: String,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// AI Interactions
const AIInteractionSchema = new Schema({
  id: String,
  assist: String,
  model: String,
  input: Schema.Types.Mixed,
  output: Schema.Types.Mixed,
  status: { type: String, enum: ['proposed', 'accepted', 'edited', 'rejected'], default: 'proposed' },
  userId: String,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

// Participants
const ParticipantSchema = new Schema({
  name: String,
  title: String,
  email: String,
  isDecisionMaker: { type: Boolean, default: false },
}, { _id: false });

// ── Main Workshop Schema ──

const WorkshopSchema = new Schema({
  id: { type: String, unique: true, required: true },
  opportunityId: { type: String, index: true },
  accountId: String,
  customerName: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Scoring Complete', 'Proposal Generated', 'Delivered', 'Archived'],
    default: 'Scheduled',
  },
  mode: { type: String, enum: ['with_ai', 'without_ai'], default: 'with_ai' },
  format: { type: String, enum: ['in-person', 'virtual', 'hybrid'], default: 'in-person' },
  sponsor: String,
  scheduledDate: Date,
  facilitators: [String],
  participants: [ParticipantSchema],
  meta: Schema.Types.Mixed,

  // The assessment framework (cloned from template)
  framework: FrameworkSchema,

  // Use cases
  useCases: [UseCaseSchema],

  // Scope items (derived from gaps)
  scopeItems: [ScopeItemSchema],

  // Generated proposals
  proposals: [ProposalSchema],

  // AI interaction log
  aiInteractions: [AIInteractionSchema],

  // Whiteboard — freeform discovery notes (persisted, feeds into Assess AI context)
  whiteboard: {
    sections: [{ id: String, title: String, icon: String, color: String, collapsed: Boolean, source: String }],
    notes: [{ id: String, text: String, color: String, sectionId: String, votes: Number, type: String, fileName: String, timestamp: Number }],
  },

  createdBy: String,
  updatedBy: String,
}, { timestamps: true });

export const Workshop =
  mongoose.models.Workshop || mongoose.model('Workshop', WorkshopSchema);
