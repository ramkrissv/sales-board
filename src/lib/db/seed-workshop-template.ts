/**
 * Seed the default Galent Enterprise AI Framework template.
 * 3 levels, 22 dimensions with probes, 8 workstreams, 0-4 maturity scale.
 */
import { connectDB } from './connection';
import mongoose from 'mongoose';

export async function seedWorkshopTemplate() {
  await connectDB();

  const WT = mongoose.models.WorkshopTemplate ||
    (await import('./models/workshop-template')).WorkshopTemplate;

  const existing = await WT.findOne({ id: 'galent-enterprise-ai-v1' });
  if (existing) return;

  const template = {
    id: 'galent-enterprise-ai-v1',
    name: 'Galent Enterprise AI Framework',
    description: 'McKinsey-grade AI transformation assessment. 3 levels, 22 dimensions, 8 workstreams. Proven in the Hughes engagement.',
    version: 1,
    isDefault: true,
    framework: {
      name: 'Galent Enterprise AI Framework',
      version: 1,
      scoringScale: {
        name: 'Maturity 0-4',
        points: [
          { value: 0, label: 'Absent', description: 'Not present or undefined' },
          { value: 1, label: 'Ad hoc', description: 'Exists in pockets, person-dependent, no standard' },
          { value: 2, label: 'Repeatable', description: 'Defined and used, but not consistently governed' },
          { value: 3, label: 'Governed', description: 'Standardized, owned, measured, and governed' },
          { value: 4, label: 'Optimized', description: 'Continuously improved, automated, benchmarked' },
        ],
      },
      levels: [
        {
          id: 'L1',
          name: 'Business & Value',
          summary: 'Is the AI ambition real, funded, and tied to measurable value? Tests whether use cases have a thesis, prioritization discipline, and an owner who will fund pilots.',
          weight: 0.30,
          order: 0,
          sections: [],
          dimensions: [
            { id: '1.1', name: 'AI Strategy & Ambition', probe: 'Is there an explicit, quantified AI ambition tied to enterprise priorities — or a list of experiments?', workstreamCode: 'WS8', order: 0 },
            { id: '1.2', name: 'Value Creation Thesis', probe: 'For the top use cases, is value estimated with a defensible method, or asserted?', workstreamCode: 'WS3', order: 1 },
            { id: '1.3', name: 'Use Case Pipeline (50+)', probe: 'Is the backlog captured as comparable 1-pagers (problem, sponsor, value), or scattered?', workstreamCode: 'WS3', order: 2 },
            { id: '1.4', name: 'Prioritization & Funding', probe: 'Is there a repeatable way to rank and fund use cases, or does loudest-voice win?', workstreamCode: 'WS3', order: 3 },
            { id: '1.5', name: 'Executive Sponsorship', probe: 'Does each priority use case have an accountable business owner, not just a delivery team?', workstreamCode: 'WS4', order: 4 },
            { id: '1.6', name: 'Value Measurement (KPIs)', probe: 'Will realized value be tracked post-launch against the original estimate?', workstreamCode: 'WS8', order: 5 },
          ],
        },
        {
          id: 'L2',
          name: 'Architecture & Platform',
          summary: 'Can a new use case be onboarded onto a governed, reusable foundation — or does each one rebuild from scratch? The toolkit Galent will design.',
          weight: 0.40,
          order: 1,
          sections: [],
          dimensions: [
            { id: '2.1', name: 'Current-State Architecture', probe: 'Is today\'s AI architecture documented and shared, or tribal knowledge?', workstreamCode: 'WS1', order: 0 },
            { id: '2.2', name: 'Reusable AI Toolkit / Platform', probe: 'Is there a shared platform a new use case onboards into, or one-off builds?', workstreamCode: 'WS2', order: 1 },
            { id: '2.3', name: 'Cloud / Hyperscaler Foundation', probe: 'Are landing zone, networking, identity, and cost controls established on the target hyperscaler (AWS/Azure/GCP)?', workstreamCode: 'WS6', order: 2 },
            { id: '2.4', name: 'Agent Build Framework', probe: 'Are agents built with a consistent framework, lifecycle, and versioning (e.g. LangGraph, CrewAI, custom)?', workstreamCode: 'WS2', order: 3 },
            { id: '2.5', name: 'Data & Knowledge Foundation', probe: 'Is grounding data governed, retrievable, and access-controlled for agents?', workstreamCode: 'WS2', order: 4 },
            { id: '2.6', name: 'Integration & Interoperability', probe: 'Can agents reach systems of record through governed, reusable connectors?', workstreamCode: 'WS6', order: 5 },
            { id: '2.7', name: 'Model / LLM Strategy', probe: 'Is there a deliberate model selection, routing, and fallback strategy?', workstreamCode: 'WS2', order: 6 },
            { id: '2.8', name: 'Build vs Buy vs Partner', probe: 'Are component decisions made on a clear framework, or default-to-build?', workstreamCode: 'WS6', order: 7 },
          ],
        },
        {
          id: 'L3',
          name: 'Operating Model & Governance',
          summary: 'Once built, will it run safely and scale? Tests the operating model, FDSE augmentation, and the security and compliance fabric.',
          weight: 0.30,
          order: 2,
          sections: [],
          dimensions: [
            { id: '3.1', name: 'Operating Model (Hub-and-Spoke)', probe: 'Is there a central capability with embedded spokes, or fragmented ownership?', workstreamCode: 'WS4', order: 0 },
            { id: '3.2', name: 'Team Design & FDSE Augmentation', probe: 'Is delivery capacity and shape defined, with an augmentation plan for gaps?', workstreamCode: 'WS5', order: 1 },
            { id: '3.3', name: 'Skills & Reskilling', probe: 'Is there a reskilling path so internal teams own what\'s delivered?', workstreamCode: 'WS4', order: 2 },
            { id: '3.4', name: 'Operating Rhythm & Delivery', probe: 'Is there a cadence — intake, build, review, release — or ad hoc delivery?', workstreamCode: 'WS5', order: 3 },
            { id: '3.5', name: 'Agentic Security', probe: 'Are agent permissions, secrets, and action boundaries controlled and audited?', workstreamCode: 'WS7', order: 4 },
            { id: '3.6', name: 'Evaluation & Quality (Evals)', probe: 'Is agent quality measured with evals before and after release?', workstreamCode: 'WS7', order: 5 },
            { id: '3.7', name: 'Compliance & Regulatory', probe: 'Are identity, data protection, and industry-specific compliance obligations (SOC2/HIPAA/PCI/SOX/FedRAMP) met by design?', workstreamCode: 'WS7', order: 6 },
            { id: '3.8', name: 'Responsible AI & Risk', probe: 'Is there a register for AI risk, bias, and human-in-the-loop decisions?', workstreamCode: 'WS7', order: 7 },
          ],
        },
      ],
      workstreams: [
        { code: 'WS1', name: 'Current-State Assessment', objective: 'Document the existing AI environment as a gap map against enterprise-grade requirements.', order: 0 },
        { code: 'WS2', name: 'Future-State Architecture & Toolkit', objective: 'Design the reusable AI platform that any use case can onboard into.', order: 1 },
        { code: 'WS3', name: 'Prioritized Use Case List', objective: 'Score and sequence the backlog, with rationale for the first funded pilots.', order: 2 },
        { code: 'WS4', name: 'People & Enablement Plan', objective: 'Define the hub-and-spoke operating model, team design, and reskilling roadmap.', order: 3 },
        { code: 'WS5', name: 'Augmentation Model (FDSE)', objective: 'Stand up the Galent FDSE model and co-located delivery oversight.', order: 4 },
        { code: 'WS6', name: 'Tech Stack & Integration Map', objective: 'Map the stack and integrations with build vs. buy vs. partner decisions.', order: 5 },
        { code: 'WS7', name: 'Security & Compliance', objective: 'Set agentic security, evals, and governance for the operating fabric.', order: 6 },
        { code: 'WS8', name: 'Next-Step Roadmap', objective: 'Sequence a phased delivery plan with milestones, owners, and investment model.', order: 7 },
      ],
    },
    createdBy: 'system',
  };

  await WT.create(template);
  console.log('Seeded: Galent Enterprise AI Framework workshop template');
}
