import mongoose, { Schema } from 'mongoose';

const StageTemplateSchema = new Schema({
  stage: String, engagementType: String, serviceLine: String,
  templates: [{ name: String, type: String, description: String, required: Boolean, aiGenerable: Boolean }],
  gateCriteria: [{ field: String, condition: String, description: String }],
  roles: [{ role: String, responsibility: String }],
}, { timestamps: true });

export async function seedOntology() {
  const Model = mongoose.models.SalesStageTemplate || mongoose.model('SalesStageTemplate', StageTemplateSchema);
  const count = await Model.countDocuments();
  if (count > 0) return;

  await Model.insertMany([
    {
      stage: 'Discovery',
      templates: [
        { name: 'Account Research Brief', type: 'document', description: 'Company overview, industry, tech stack, key personnel', required: true, aiGenerable: true },
        { name: 'Initial Meeting Agenda', type: 'document', description: 'Structured agenda for first customer meeting', required: false, aiGenerable: true },
        { name: 'Stakeholder Map', type: 'artifact', description: 'Visual map of decision makers, influencers, champions', required: true, aiGenerable: false },
        { name: 'Discovery Checklist', type: 'checklist', description: 'Pain points, budget signals, timeline, competition', required: true, aiGenerable: false },
      ],
      gateCriteria: [
        { field: 'customerStakeholders', condition: 'length >= 1', description: 'At least one stakeholder identified' },
        { field: 'industry', condition: 'not empty', description: 'Industry identified' },
        { field: 'conversationLog', condition: 'length > 50', description: 'Initial conversation captured' },
      ],
      roles: [
        { role: 'Account Executive', responsibility: 'Lead discovery meetings, qualify opportunity' },
        { role: 'SDR', responsibility: 'Initial outreach, meeting scheduling' },
      ],
    },
    {
      stage: 'Qualification',
      templates: [
        { name: 'MEDDIC Assessment', type: 'checklist', description: 'Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion', required: true, aiGenerable: true },
        { name: 'Business Case Draft', type: 'document', description: 'ROI analysis and value proposition', required: false, aiGenerable: true },
        { name: 'Competitive Analysis', type: 'document', description: 'Competitor comparison and differentiation', required: false, aiGenerable: true },
        { name: 'Technical Requirements', type: 'artifact', description: 'Customer technical requirements and constraints', required: true, aiGenerable: false },
      ],
      gateCriteria: [
        { field: 'tcv', condition: '> 0', description: 'TCV estimated' },
        { field: 'customerStakeholders', condition: 'has decision maker', description: 'Decision maker identified' },
        { field: 'billingModel', condition: 'not empty', description: 'Engagement model selected' },
      ],
      roles: [
        { role: 'Account Executive', responsibility: 'Qualify budget, authority, need, timeline' },
        { role: 'Presales', responsibility: 'Technical qualification, architecture assessment' },
      ],
    },
    {
      stage: 'Proposal',
      templates: [
        { name: 'Statement of Work (SOW)', type: 'document', description: 'Full scope, deliverables, timeline, pricing', required: true, aiGenerable: true },
        { name: 'Pricing Sheet', type: 'document', description: 'Detailed pricing with engagement model', required: true, aiGenerable: true },
        { name: 'Executive Presentation', type: 'document', description: 'Deck for executive stakeholders', required: false, aiGenerable: true },
        { name: 'RFP Response', type: 'document', description: 'Formal response to customer RFP', required: false, aiGenerable: true },
        { name: 'Technical Architecture', type: 'artifact', description: 'Solution architecture diagram', required: false, aiGenerable: false },
      ],
      gateCriteria: [
        { field: 'margin', condition: '> 20', description: 'Margin above 20%' },
        { field: 'tcv', condition: '> 0', description: 'TCV confirmed' },
      ],
      roles: [
        { role: 'Account Executive', responsibility: 'Present proposal, handle objections' },
        { role: 'Presales', responsibility: 'Technical proposal, architecture, POC if needed' },
        { role: 'Delivery', responsibility: 'Validate delivery approach and resource plan' },
      ],
    },
    {
      stage: 'Negotiation',
      templates: [
        { name: 'MSA Draft', type: 'document', description: 'Master Service Agreement', required: true, aiGenerable: true },
        { name: 'Negotiation Playbook', type: 'checklist', description: 'Walk-away points, concessions, non-negotiables', required: false, aiGenerable: true },
        { name: 'Legal Review Checklist', type: 'checklist', description: 'Terms requiring legal review', required: true, aiGenerable: false },
        { name: 'Final Pricing Approval', type: 'artifact', description: 'Internal approval for final pricing', required: true, aiGenerable: false },
      ],
      gateCriteria: [
        { field: 'margin', condition: '>= 15', description: 'Margin above floor' },
        { field: 'contracts', condition: 'has MSA or SOW', description: 'Contract drafted' },
      ],
      roles: [
        { role: 'Account Executive', responsibility: 'Lead negotiation, close deal' },
        { role: 'Sales Manager', responsibility: 'Approve pricing, escalation support' },
        { role: 'Legal', responsibility: 'Review contract terms' },
      ],
    },
    {
      stage: 'Won',
      templates: [
        { name: 'Delivery Handoff', type: 'document', description: 'Customer context, technical requirements, team intro', required: true, aiGenerable: true },
        { name: 'Onboarding Plan', type: 'document', description: 'Customer onboarding timeline and milestones', required: false, aiGenerable: true },
        { name: 'Success Metrics', type: 'artifact', description: 'KPIs and success criteria for the engagement', required: true, aiGenerable: false },
      ],
      gateCriteria: [],
      roles: [
        { role: 'Delivery Manager', responsibility: 'Take over delivery execution' },
        { role: 'Account Manager', responsibility: 'Ongoing relationship management' },
      ],
    },
  ]);

  console.log('[seed] Sales ontology seeded: 5 stage templates');
}
