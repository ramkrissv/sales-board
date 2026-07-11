import mongoose, { Schema, Document } from 'mongoose';

export interface IPipelineSnapshot extends Document {
  snapshotDate: Date;
  period: 'daily' | 'weekly' | 'monthly';
  // Aggregate metrics
  totalOpportunities: number;
  activeOpportunities: number;
  totalPipeline: number;        // sum of active TCV
  weightedPipeline: number;     // stage-weighted TCV
  // By stage
  byStage: {
    stage: string;
    count: number;
    tcv: number;
    avgAge: number;
  }[];
  // By forecast category
  byForecast: {
    category: string;
    count: number;
    tcv: number;
  }[];
  // By owner
  byOwner: {
    owner: string;
    count: number;
    tcv: number;
    wonCount: number;
    wonTcv: number;
  }[];
  // Conversion metrics
  conversions: {
    fromStage: string;
    toStage: string;
    count: number;
  }[];
  // Health scores
  funnelHealthScore: number;
  avgDealHealth: number;
  // Win/loss
  wonCount: number;
  wonTcv: number;
  lostCount: number;
  winRate: number;
  // Velocity
  avgDealAge: number;
  avgCycleTime: number;        // avg days from created to won
  // Stakeholder coverage
  dealsWithDM: number;
  dealsWithTcv: number;
  // Metadata
  createdAt: Date;
}

const PipelineSnapshotSchema = new Schema<IPipelineSnapshot>(
  {
    snapshotDate: { type: Date, required: true },
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    totalOpportunities: { type: Number, default: 0 },
    activeOpportunities: { type: Number, default: 0 },
    totalPipeline: { type: Number, default: 0 },
    weightedPipeline: { type: Number, default: 0 },
    byStage: [{ stage: String, count: Number, tcv: Number, avgAge: Number }],
    byForecast: [{ category: String, count: Number, tcv: Number }],
    byOwner: [{ owner: String, count: Number, tcv: Number, wonCount: Number, wonTcv: Number }],
    conversions: [{ fromStage: String, toStage: String, count: Number }],
    funnelHealthScore: { type: Number, default: 0 },
    avgDealHealth: { type: Number, default: 0 },
    wonCount: { type: Number, default: 0 },
    wonTcv: { type: Number, default: 0 },
    lostCount: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    avgDealAge: { type: Number, default: 0 },
    avgCycleTime: { type: Number, default: 0 },
    dealsWithDM: { type: Number, default: 0 },
    dealsWithTcv: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PipelineSnapshotSchema.index({ snapshotDate: -1 });
PipelineSnapshotSchema.index({ period: 1, snapshotDate: -1 });

export const PipelineSnapshot =
  mongoose.models.PipelineSnapshot || mongoose.model<IPipelineSnapshot>('PipelineSnapshot', PipelineSnapshotSchema);
