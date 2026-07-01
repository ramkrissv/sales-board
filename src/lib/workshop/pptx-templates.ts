/**
 * PPTX Workshop Templates — maps presentation slide structures to workshop modules.
 * Used for:
 * 1. Creating workshops from uploaded PPTX decks (input)
 * 2. Generating workshop-ready slide structures (output/pre-template)
 * 3. Populating whiteboard zones + assessment dimensions dynamically
 */

export interface WorkshopSlideTemplate {
  id: string;
  title: string;
  type: 'cover' | 'context' | 'discovery' | 'architecture' | 'planning' | 'operations' | 'outcomes' | 'prework';
  module: string; // maps to workshop tab
  whiteboardZone: string; // maps to whiteboard zone
  keyTopics: string[];
  assessmentDimensions: string[];
  promptHints: string[]; // AI hints for generating content
}

export const ENTERPRISE_AI_WORKSHOP_TEMPLATE: WorkshopSlideTemplate[] = [
  {
    id: 'cover',
    title: 'Workshop Agenda & Approach',
    type: 'cover',
    module: 'overview',
    whiteboardZone: '',
    keyTopics: ['Strategic intent', 'Format', 'Participants', 'Timeline'],
    assessmentDimensions: [],
    promptHints: ['Whiteboard-led, co-created', 'Strategic not tactical', 'Foundation then increments'],
  },
  {
    id: 'mandate',
    title: 'Why We Are Here — The Mandate',
    type: 'context',
    module: 'intake',
    whiteboardZone: 'discovery',
    keyTopics: ['Enterprise strategy vs point solution', 'Foundation then increments', 'Center of Excellence', 'Governed framework'],
    assessmentDimensions: ['AI Strategy & Ambition', 'Executive Sponsorship', 'Operating Model'],
    promptHints: ['Not quick wins — full journey', 'Professional-grade, deployable', 'Hub-and-spoke model'],
  },
  {
    id: 'engagement-layers',
    title: 'Engagement Layers',
    type: 'context',
    module: 'intake',
    whiteboardZone: 'strategy',
    keyTopics: ['Foundational AI infrastructure', 'Incremental delivery', 'Use-case partnership'],
    assessmentDimensions: ['Reusable AI Toolkit / Platform', 'Build vs Buy vs Partner'],
    promptHints: ['The Hub — Gigafactory for AI', 'Agents, MCP, guardrails, governance', 'LLMOps & AgentOps as one framework'],
  },
  {
    id: 'operating-model',
    title: 'Operating Model — Hub & Spoke',
    type: 'operations',
    module: 'whiteboard',
    whiteboardZone: 'people',
    keyTopics: ['AI Hub (shared services)', 'Engineering spokes', 'Business spokes', 'Security & governance spoke'],
    assessmentDimensions: ['Operating Model Hub-and-Spoke', 'Team Design & FDSE Augmentation', 'Skills & Reskilling'],
    promptHints: ['One governed core', 'Spokes consume one foundation', 'Avoid agent swarm and tech debt'],
  },
  {
    id: 'drivers',
    title: 'Pain Points & Strategic Drivers',
    type: 'discovery',
    module: 'whiteboard',
    whiteboardZone: 'painpoints',
    keyTopics: ['Predictive gap', 'Use-case proliferation', 'PII vs business need', 'Role-based views', 'Cost constraints', 'No reference model'],
    assessmentDimensions: ['Value Measurement / KPIs', 'Data & Knowledge Foundation', 'Compliance & Regulatory'],
    promptHints: ['~35 ungoverned AI efforts', 'Resolve PII at architecture level', 'Minimal 3rd-party spend'],
  },
  {
    id: 'ecosystem',
    title: 'Current Ecosystem Snapshot',
    type: 'discovery',
    module: 'intake',
    whiteboardZone: 'architecture',
    keyTopics: ['Cloud & platform (GCP)', 'Models (Gemini, Claude)', 'Frameworks (LangGraph)', 'Data & retrieval', 'Dev & ops', 'Constraints'],
    assessmentDimensions: ['Current-State Architecture', 'GCP Foundation', 'Model / LLM Strategy', 'Integration & Interoperability'],
    promptHints: ['Vertex AI, Model Garden', 'Pinecone, AlloyDB', 'Kiro IDE', 'No GPU provisioning'],
  },
  {
    id: 'format',
    title: 'Workshop Format & Principles',
    type: 'planning',
    module: 'overview',
    whiteboardZone: '',
    keyTopics: ['Two half-day sessions', 'Whiteboard-led', 'Strategic not tactical', 'Mixed team', 'Foundation then increments', 'Reuse + Google partner'],
    assessmentDimensions: [],
    promptHints: ['Co-create live', 'Frame, structure and elevate'],
  },
  {
    id: 'session1',
    title: 'Session 1 — Discover & Frame',
    type: 'planning',
    module: 'whiteboard',
    whiteboardZone: 'discovery',
    keyTopics: ['Welcome & objectives', 'Ecosystem walkthrough', 'Current state whiteboard', 'Hub-and-spoke discussion', 'Foundational components'],
    assessmentDimensions: [],
    promptHints: ['Where Hughes is', 'What the foundation must serve'],
  },
  {
    id: 'session2',
    title: 'Session 2 — Architect & Roadmap',
    type: 'architecture',
    module: 'assess',
    whiteboardZone: 'architecture',
    keyTopics: ['Target-state architecture', 'Technical building blocks', 'Incremental delivery', 'Enablement & operating model', 'Roadmap & next steps'],
    assessmentDimensions: ['Reusable AI Toolkit / Platform', 'Kiro & Agent Build Framework', 'Operating Rhythm & Delivery'],
    promptHints: ['Reference architecture', 'No agent swarm', 'Reusable constructs'],
  },
  {
    id: 'building-blocks',
    title: 'Technical Building Blocks',
    type: 'architecture',
    module: 'assess',
    whiteboardZone: 'architecture',
    keyTopics: [
      'Foundational architecture', 'Agent workflows & orchestration', 'Agent memory',
      'Secure agent execution', 'Secure MCP & tool connectivity', 'Retrieval & data strategy',
      'LLM I/O guardrails', 'RBAC & policy', 'Agent invocation',
      'Observability & traceability', 'Token monitoring & cost', 'Eval engine & LLM-as-judge',
    ],
    assessmentDimensions: [
      'Reusable AI Toolkit / Platform', 'Kiro & Agent Build Framework', 'Data & Knowledge Foundation',
      'Agentic Security', 'Evaluation & Quality / Evals', 'Responsible AI & Risk',
    ],
    promptHints: ['Architect & build', 'Govern & operate'],
  },
  {
    id: 'eval-engine',
    title: 'Eval Engine & Latency Trade-off',
    type: 'architecture',
    module: 'assess',
    whiteboardZone: 'architecture',
    keyTopics: ['Build → Eval → Baseline → Deploy', 'Latency vs grounding', 'Tier onto cheaper LLMs', 'Async critics', 'Right-size validation depth'],
    assessmentDimensions: ['Evaluation & Quality / Evals', 'Model / LLM Strategy'],
    promptHints: ['Biggest gap — nobody understands it', 'First-class, repeatable step'],
  },
  {
    id: 'galent-value',
    title: 'What Galent Brings',
    type: 'context',
    module: 'overview',
    whiteboardZone: 'strategy',
    keyTopics: ['Reference model', 'Target architecture', 'CoE & operating model', 'Co-built roadmap', 'Mixed delivery model', 'Ecosystem leverage'],
    assessmentDimensions: [],
    promptHints: ['Missing patterns & maturity model', 'What Java world had, for AI'],
  },
  {
    id: 'prework-client',
    title: 'Pre-Workshop — Client Preparation',
    type: 'prework',
    module: 'intake',
    whiteboardZone: '',
    keyTopics: ['Tools & libraries inventory', 'Vector/graph DB list', 'AI governance docs', 'AI skill matrix', 'Access to use cases', 'Reuse assets'],
    assessmentDimensions: [],
    promptHints: ['Per team inventory', 'Partition policies into architecture sections'],
  },
  {
    id: 'prework-galent',
    title: 'Pre-Workshop — Galent Preparation',
    type: 'prework',
    module: 'intake',
    whiteboardZone: '',
    keyTopics: ['Readback & align agenda', 'Draft architecture templates', 'Eval & guardrail approach', 'Facilitation kit', 'Senior attendees'],
    assessmentDimensions: [],
    promptHints: ['Skeleton target-state', 'Hub-spoke & CoE templates'],
  },
  {
    id: 'outcomes',
    title: 'What Done Looks Like',
    type: 'outcomes',
    module: 'findings',
    whiteboardZone: 'strategy',
    keyTopics: ['Aligned target architecture', 'Prioritized Increment-1 scope', 'Co-created roadmap', 'CoE & operating model', 'Enablement plan', 'Governance approach'],
    assessmentDimensions: [],
    promptHints: ['Strategic alignment first', 'Follow-ups scheduled from outcomes'],
  },
  {
    id: 'next-steps',
    title: 'Next Steps',
    type: 'outcomes',
    module: 'proposal',
    whiteboardZone: '',
    keyTopics: ['Finalize date', 'Agenda readback', 'Client data prep', 'Galent ref prep', 'Open channel'],
    assessmentDimensions: [],
    promptHints: ['Direct email exchange', 'Google product team available'],
  },
];

/** Convert PPTX template into workshop whiteboard zones */
export function templateToWhiteboardZones(template: WorkshopSlideTemplate[]): { id: string; label: string; color: string; x: number; y: number; w: number; h: number }[] {
  const zoneMap: Record<string, { label: string; color: string; topics: string[] }> = {};
  template.forEach(slide => {
    if (!slide.whiteboardZone) return;
    if (!zoneMap[slide.whiteboardZone]) {
      const colors: Record<string, string> = { discovery: '#3B82F6', painpoints: '#EF4444', architecture: '#8B5CF6', people: '#EC4899', strategy: '#0FB5AD', quickwins: '#F59E0B' };
      zoneMap[slide.whiteboardZone] = { label: ZONE_LABELS[slide.whiteboardZone] || slide.whiteboardZone, color: colors[slide.whiteboardZone] || '#3B82F6', topics: [] };
    }
    zoneMap[slide.whiteboardZone].topics.push(...slide.keyTopics);
  });
  return Object.entries(zoneMap).map(([id, z], i) => ({
    id, label: z.label, color: z.color,
    x: (i % 3) * 320 + 20, y: Math.floor(i / 3) * 340 + 20, w: 300, h: 320,
  }));
}

const ZONE_LABELS: Record<string, string> = {
  discovery: 'Discovery & Observations',
  painpoints: 'Pain Points & Drivers',
  architecture: 'Architecture & Technical',
  people: 'People, Process & Org',
  strategy: 'Strategy & Planning',
  quickwins: 'Quick Wins',
};

/** Extract assessment dimensions from template */
export function templateToAssessmentDimensions(template: WorkshopSlideTemplate[]): string[] {
  const dims = new Set<string>();
  template.forEach(slide => slide.assessmentDimensions.forEach(d => dims.add(d)));
  return [...dims];
}

/** Convert template to workshop intake questions */
export function templateToIntakeQuestions(template: WorkshopSlideTemplate[]): { section: string; question: string }[] {
  const questions: { section: string; question: string }[] = [];
  template.filter(s => s.type === 'prework' || s.type === 'discovery').forEach(slide => {
    slide.keyTopics.forEach(topic => {
      questions.push({ section: slide.title, question: topic });
    });
  });
  return questions;
}
