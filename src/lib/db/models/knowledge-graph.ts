import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeNode extends Document {
  nodeId: string;
  nodeType: 'account' | 'person' | 'opportunity' | 'product' | 'service_line' | 'competitor' | 'team' | 'user';
  label: string;
  properties: Record<string, any>;
  edges: {
    targetNodeId: string;
    relationship: string;
    properties: {
      weight: number;
      since?: Date;
      lastInteraction?: Date;
      context?: string;
    };
  }[];
  embedding?: number[];
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const EdgeSchema = new Schema({
  targetNodeId: { type: String, required: true, index: true },
  relationship: {
    type: String,
    required: true,
    enum: [
      'HAS_STAKEHOLDER',
      'REPORTS_TO',
      'CHAMPIONS',
      'EVALUATES',
      'DECIDES',
      'OWNS_OPPORTUNITY',
      'BELONGS_TO_ACCOUNT',
      'COMPETES_WITH',
      'USES_PRODUCT',
      'SOLD_SERVICE',
      'INFLUENCED_BY',
      'SIMILAR_TO',
      'MEMBER_OF_TEAM',
      'MANAGES',
      'PARTNERS_WITH',
      'REFERRED_BY',
    ]
  },
  properties: {
    weight: { type: Number, default: 0.5, min: 0, max: 1 },
    since: Date,
    lastInteraction: Date,
    context: String,
  },
}, { _id: false });

const KnowledgeNodeSchema = new Schema<IKnowledgeNode>({
  nodeId: { type: String, required: true, unique: true, index: true },
  nodeType: {
    type: String,
    required: true,
    enum: ['account', 'person', 'opportunity', 'product', 'service_line', 'competitor', 'team', 'user'],
    index: true,
  },
  label: { type: String, required: true },
  properties: { type: Schema.Types.Mixed, default: {} },
  edges: [EdgeSchema],
  embedding: [Number],
  updatedBy: { type: String, default: 'system' },
}, { timestamps: true });

// Compound indexes for efficient graph queries
KnowledgeNodeSchema.index({ 'edges.targetNodeId': 1, 'edges.relationship': 1 });
KnowledgeNodeSchema.index({ nodeType: 1, 'properties.industry': 1 });

export default mongoose.models.KnowledgeNode || mongoose.model<IKnowledgeNode>('KnowledgeNode', KnowledgeNodeSchema);
