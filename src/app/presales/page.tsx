'use client';

import { FileSearch, FileText, Microscope, Presentation, FlaskConical, CheckCircle2, Lock } from 'lucide-react';

const presalesStages = [
  { icon: FileSearch, name: 'RFP/RFI Intake', description: 'Receive and parse incoming RFPs, RFIs, and RFQs. AI extracts requirements and deadlines.', status: 'coming_soon' },
  { icon: FileText, name: 'Response Drafting', description: 'AI-assisted response generation using knowledge base, past proposals, and deal context.', status: 'coming_soon' },
  { icon: Microscope, name: 'Technical Evaluation', description: 'Solution architecture, feasibility assessment, and technical scoring.', status: 'coming_soon' },
  { icon: FlaskConical, name: 'POC Tracking', description: 'Track proof-of-concept engagements, success criteria, and demo scheduling.', status: 'coming_soon' },
  { icon: Presentation, name: 'Proposal Management', description: 'Collaborative proposal creation, version control, approval workflows.', status: 'coming_soon' },
  { icon: CheckCircle2, name: 'Handoff to Delivery', description: 'Seamless transition from presales to delivery with full context transfer.', status: 'coming_soon' },
];

export default function PresalesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium mb-4">
          <Lock className="h-3 w-3" /> Coming Soon
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Presales Portal</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          Full presales lifecycle management — from RFP intake to delivery handoff. AI-assisted at every step.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presalesStages.map((stage, i) => (
          <div key={i} className="g-surface g-elevated p-5 opacity-75">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center flex-shrink-0">
                <stage.icon className="h-5 w-5 text-[#7c3aed]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
                  <span className="g-chip bg-amber-500/10 text-amber-500">Soon</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="g-surface g-elevated p-6 text-center">
        <h3 className="text-sm font-semibold text-foreground mb-2">Interested in early access?</h3>
        <p className="text-xs text-muted-foreground mb-4">The Presales Portal integrates with your existing deal pipeline, contracts, and AI agents.</p>
        <button className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors">
          Request Early Access
        </button>
      </div>
    </div>
  );
}
