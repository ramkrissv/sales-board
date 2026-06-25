/**
 * Workshop TypeScript types — derived from the Mongoose schema.
 * Replaces all `any` typing in workshop components.
 */

export interface WorkshopScalePoint {
  value: number;
  label: string;
  description?: string;
}

export interface WorkshopScoringScale {
  name: string;
  points: WorkshopScalePoint[];
}

export interface WorkshopEvidence {
  kind: 'file' | 'link' | 'quote' | 'screenshot';
  label: string;
  url?: string;
  quote?: string;
  source?: string;
}

export interface WorkshopDimensionDetail {
  id: string;
  label: string;
  body: string;
  kind: 'subrubric' | 'evidence_check' | 'question' | 'note';
  order: number;
  aiGenerated: boolean;
  edited: boolean;
}

export interface WorkshopFinding {
  body?: string;
  implication?: string;
  authorId?: string;
  aiGenerated: boolean;
  createdAt?: Date;
}

export interface WorkshopDimension {
  id: string;
  name: string;
  probe?: string;
  guidance?: string;
  sectionId?: string;
  workstreamCode?: string;
  order: number;
  currentScore?: number | null;
  targetScore?: number | null;
  confidence?: number | null;
  priority: boolean;
  scoredBy?: string;
  scoredAt?: Date;
  finding?: WorkshopFinding;
  evidence: WorkshopEvidence[];
  details: WorkshopDimensionDetail[];
}

export interface WorkshopSection {
  id: string;
  name: string;
  order: number;
}

export interface WorkshopLevel {
  id: string;
  name: string;
  summary?: string;
  weight: number;
  order: number;
  sections: WorkshopSection[];
  dimensions: WorkshopDimension[];
}

export interface WorkshopWorkstream {
  code: string;
  name: string;
  objective?: string;
  order: number;
}

export interface WorkshopFramework {
  name?: string;
  version: number;
  sourceTemplateId?: string;
  scoringScale: WorkshopScoringScale;
  levels: WorkshopLevel[];
  workstreams: WorkshopWorkstream[];
}

export interface WorkshopUseCase {
  id: string;
  name: string;
  sponsor?: string;
  problem?: string;
  tower?: string;
  value: number;
  feasibility: number;
  effort?: number;
  isPilot: boolean;
  scores?: Record<string, any>;
  order: number;
}

export interface WorkshopScopeTask {
  id: string;
  task: string;
  estimate?: number;
  order: number;
  aiGenerated: boolean;
}

export interface WorkshopScopeItem {
  id: string;
  workstreamCode?: string;
  sourceDimensionId?: string;
  title: string;
  description?: string;
  effort: number;
  phase: string;
  owner?: string;
  isManual: boolean;
  tasks: WorkshopScopeTask[];
}

export interface WorkshopProposal {
  version: number;
  title: string;
  body: any;
  generatedBy?: string;
  createdAt: Date;
}

export interface WorkshopAIInteraction {
  id: string;
  assist: string;
  model: string;
  input: any;
  output: any;
  status: 'proposed' | 'accepted' | 'edited' | 'rejected';
  userId?: string;
  createdAt: Date;
}

export interface WorkshopParticipant {
  name: string;
  title?: string;
  email?: string;
  isDecisionMaker: boolean;
}

export type WorkshopStatus = 'Scheduled' | 'In Progress' | 'Scoring Complete' | 'Proposal Generated' | 'Delivered' | 'Archived';
export type WorkshopMode = 'with_ai' | 'without_ai';
export type WorkshopFormat = 'in-person' | 'virtual' | 'hybrid';

export interface Workshop {
  id: string;
  opportunityId?: string;
  accountId?: string;
  customerName: string;
  title: string;
  description?: string;
  status: WorkshopStatus;
  mode: WorkshopMode;
  format: WorkshopFormat;
  sponsor?: string;
  scheduledDate?: Date;
  facilitators: string[];
  participants: WorkshopParticipant[];
  meta?: any;
  framework: WorkshopFramework;
  useCases: WorkshopUseCase[];
  scopeItems: WorkshopScopeItem[];
  proposals: WorkshopProposal[];
  aiInteractions: WorkshopAIInteraction[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
