'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, Kanban, Magnet, Users, FileText, CheckSquare,
  TrendingUp, Bot, Network, Settings, ArrowRight, Check,
  MessageSquare, Upload, Search, Shield, BarChart3,
  Target, Briefcase, Crown, Eye, Rocket, BookOpen,
  ChevronDown, ChevronRight
} from 'lucide-react';

type Role = 'ae' | 'sdr' | 'manager' | 'presales' | 'exec';

const roles = [
  { id: 'ae' as Role, title: 'Account Executive', icon: Briefcase, subtitle: 'Close deals and manage pipeline', color: '#5B4FE9' },
  { id: 'sdr' as Role, title: 'Sales Development Rep', icon: Magnet, subtitle: 'Generate and qualify leads', color: '#11A7A0' },
  { id: 'manager' as Role, title: 'Sales Manager', icon: Crown, subtitle: 'Coach team and forecast revenue', color: '#B26A05' },
  { id: 'presales' as Role, title: 'Presales / Solution Architect', icon: Target, subtitle: 'Technical qualification and proposals', color: '#178A4C' },
  { id: 'exec' as Role, title: 'Executive (CSO/CFO/CEO)', icon: Eye, subtitle: 'Pipeline oversight and approvals', color: '#C73A3A' },
];

const guides: Record<Role, { section: string; steps: { title: string; description: string; action?: { label: string; href: string }; tips: string[] }[] }[]> = {
  ae: [
    {
      section: 'Daily Workflow',
      steps: [
        { title: 'Check your Command Center', description: 'Start each day reviewing AI-prioritized deals, critical actions, and pipeline health.', action: { label: 'Open Command Center', href: '/' }, tips: ['AI automatically analyzes your pipeline', 'Focus on "Ready to Close" deals first', 'Check overdue tasks immediately'] },
        { title: 'Work your Pipeline', description: 'Drag deals between stages on the Kanban board. The system checks gate criteria before each move.', action: { label: 'Open Pipeline', href: '/pipeline' }, tips: ['Gate criteria must be met to advance stages', 'Each drag shows a confirmation with requirements', 'Weighted values help prioritize high-probability deals'] },
        { title: 'Capture Meeting Notes', description: 'After every client meeting, paste notes and let AI extract action items, stakeholder sentiments, and next steps.', action: { label: 'Try Meeting Notes', href: '/' }, tips: ['Click "Notes" in the top bar', 'Supports Teams, Zoom, and plain text', 'AI auto-updates the deal conversation log'] },
        { title: 'Generate Documents', description: 'AI generates SOW, proposals, and pricing from deal context. One click, fully personalized.', action: { label: 'Open any deal → SOW button', href: '/pipeline' }, tips: ['Open a deal and click the green "SOW" button', 'Documents use real deal data and stakeholder context', 'Copy to clipboard for editing'] },
      ],
    },
    {
      section: 'Deal Management',
      steps: [
        { title: 'AI Deal Analysis', description: 'Every deal auto-analyzes when opened. See health score, win probability, risks, and recommended actions.', tips: ['Health ring shows 0-100 score', 'Click "Create Task" on any AI recommendation', 'Stage gate criteria shown in deal detail'] },
        { title: 'Manage Stakeholders', description: 'Track decision makers, champions, and contacts. The AI flags when key stakeholders are missing.', action: { label: 'View Contacts', href: '/stakeholders' }, tips: ['Toggle DM/Primary badges by clicking them', 'Add contacts from the deal detail "Stakeholders" tab', 'AI warns if no decision maker identified'] },
        { title: 'Set Forecast Category', description: 'Mark each deal as Commit, Best Case, or Pipeline for accurate forecasting.', action: { label: 'View Forecast', href: '/forecasting' }, tips: ['Set category from the Forecasting page table', 'Commit = you will close this', 'Best Case = likely but not certain'] },
      ],
    },
  ],
  sdr: [
    {
      section: 'Lead Generation',
      steps: [
        { title: 'Manage your Lead Pipeline', description: 'Track leads through Signal → Qualify → Enrich → Engage → Convert. AI assists at every stage.', action: { label: 'Open Leads', href: '/leads' }, tips: ['Click "AI Qualify" to score a lead', '"Draft Outreach" generates personalized emails', 'Convert qualified leads to deals with one click'] },
        { title: 'AI Qualification', description: 'Let Claude score leads on ICP fit, budget signals, and timing. Leads scoring 60+ auto-advance.', tips: ['Scores include reasoning explanation', 'Review and adjust scores as needed', 'High-scoring leads should be prioritized'] },
        { title: 'Draft Outreach', description: 'AI drafts personalized emails based on lead context, company data, and engagement signals.', tips: ['Review and edit before sending', 'Tone and source tags help customize', 'Track opens and replies'] },
      ],
    },
    {
      section: 'Handoff to AE',
      steps: [
        { title: 'Convert Leads to Deals', description: 'When a lead is qualified and engaged, convert to an opportunity with one click. All context transfers.', tips: ['Conversion creates the deal automatically', 'Lead contact becomes a stakeholder', 'AI score and context carry over'] },
      ],
    },
  ],
  manager: [
    {
      section: 'Team Oversight',
      steps: [
        { title: 'Use Scope Switcher', description: 'Toggle between My / Team / Org view on any page to see your team\'s deals.', tips: ['Scope affects all views simultaneously', 'Team view shows all direct reports', 'Org view shows entire pipeline'] },
        { title: 'Review Forecasting', description: 'Check Commit vs Best Case vs Pipeline. Compare weighted forecast against quota.', action: { label: 'View Forecast', href: '/forecasting' }, tips: ['Commit total is what you report up', 'AI-weighted values are more accurate than stage multipliers', 'Set forecast categories for your deals'] },
        { title: 'Monitor Pipeline Health', description: 'Dashboard shows funnel, conversion rates, business segmentation, and rep performance.', action: { label: 'View Dashboard', href: '/dashboard' }, tips: ['Sales funnel shows conversion rates between stages', 'Net New vs Existing shows business mix', 'Identify reps who need coaching from the by-owner section'] },
      ],
    },
    {
      section: 'Coaching & Approvals',
      steps: [
        { title: 'Review AI Insights', description: 'The Command Center surfaces at-risk deals and AI recommendations. Use these for coaching conversations.', tips: ['Deals with no next step are stalled by definition', 'Time-in-stage red flags signal stuck deals', 'AI risk alerts indicate missing stakeholders or activity'] },
        { title: 'Approve High-Value Deals', description: 'Deals above $500K require executive approval. Review and approve from the deal detail.', tips: ['Approval chain shows CSO → CFO → CEO progression', 'Add comments when approving or rejecting', 'Notifications fire when approval is requested'] },
        { title: 'Manage Team', description: 'Invite users, assign roles, and manage team structure.', action: { label: 'User Management', href: '/admin/users' }, tips: ['Roles: Admin, Manager, Rep, SDR, Presales, Viewer', 'Each role has different permissions', 'Admins can change roles and delete users'] },
      ],
    },
  ],
  presales: [
    {
      section: 'Technical Support',
      steps: [
        { title: 'Review Deals in Proposal Stage', description: 'Focus on deals needing technical qualification, architecture, and POC support.', action: { label: 'View Pipeline', href: '/pipeline' }, tips: ['Filter by Proposal stage', 'Check stage artifacts required', 'SOW generation needs technical input'] },
        { title: 'Use Ontology Templates', description: 'Each stage has required artifacts. The Proposal stage needs: SOW, Pricing Sheet, Technical Architecture.', tips: ['Open deal → Details tab → see "Stage Artifacts"', 'Required artifacts marked in orange', 'AI-generable artifacts can be auto-created'] },
        { title: 'Presales Portal (Coming Soon)', description: 'Full presales lifecycle: RFP intake, response drafting, POC tracking, proposal management.', action: { label: 'View Presales', href: '/presales' }, tips: ['Coming in a future release', 'Will integrate with deal pipeline', 'AI-assisted RFP response drafting'] },
      ],
    },
  ],
  exec: [
    {
      section: 'Executive Overview',
      steps: [
        { title: 'Pipeline at a Glance', description: 'Command Center shows total pipeline, weighted forecast, win rate, and AI intelligence brief.', action: { label: 'Command Center', href: '/' }, tips: ['Use Org scope to see entire pipeline', 'AI brief auto-generates on page load', 'Pipeline lifecycle visual shows stage distribution'] },
        { title: 'Forecast Review', description: 'Commit vs Best Case vs Pipeline with quarterly breakdown. Compare against quota.', action: { label: 'Forecast', href: '/forecasting' }, tips: ['Commit total is the number to report', 'AI-weighted values are more accurate', 'By-rep breakdown shows team performance'] },
        { title: 'Approve Deals', description: 'High-value deals require your approval. Review context, AI analysis, and approve/reject.', tips: ['Deals >$500K need CSO+CFO approval', 'Deals >$1M need CEO approval', 'Approval chain visible in deal detail'] },
      ],
    },
    {
      section: 'Strategic Intelligence',
      steps: [
        { title: 'Ask Galent', description: 'Use natural language to query your pipeline. "What is our forecast for Q3?" "Which accounts are at risk?"', action: { label: 'Ask Galent', href: '/ask' }, tips: ['Full pipeline context included automatically', 'Try: "What is our win rate by industry?"', 'AI provides specific, data-driven answers'] },
        { title: 'Review Account Health', description: 'Account 360 shows relationship maps, deal history, and expansion opportunities.', action: { label: 'Accounts', href: '/accounts' }, tips: ['Knowledge graph shows stakeholder relationships', 'Account health score aggregates deal health', 'Identify whitespace for expansion'] },
      ],
    },
  ],
};

export default function GuidePage() {
  const [selectedRole, setSelectedRole] = useState<Role>('ae');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Daily Workflow', 'Lead Generation', 'Team Oversight', 'Technical Support', 'Executive Overview']));

  const toggleStep = (id: string) => {
    setCompletedSteps(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSection = (s: string) => {
    setExpandedSections(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  };

  const roleGuide = guides[selectedRole];
  const totalSteps = roleGuide.reduce((s, g) => s + g.steps.length, 0);
  const completedCount = roleGuide.reduce((s, g) => s + g.steps.filter(step => completedSteps.has(`${selectedRole}-${step.title}`)).length, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Getting Started Guide</h1>
        <p className="text-sm text-muted-foreground mt-1">Select your role for a personalized walkthrough</p>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-5 gap-2">
        {roles.map(role => (
          <button key={role.id} onClick={() => setSelectedRole(role.id)}
            className={`p-3 rounded-xl g-surface text-center transition-all ${selectedRole === role.id ? '!border-[#7c3aed]/40 ring-1 ring-[#7c3aed]/20' : 'hover:!border-[#7c3aed]/20'}`}>
            <role.icon className="h-5 w-5 mx-auto mb-1.5" style={{ color: role.color }} />
            <div className="text-xs font-semibold text-foreground">{role.title.split('/')[0].trim()}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{role.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-card border border-border overflow-hidden">
          <div className="h-full bg-[#7c3aed] rounded-full transition-all" style={{ width: `${(completedCount / totalSteps) * 100}%` }} />
        </div>
        <span className="text-xs text-muted-foreground g-metric">{completedCount}/{totalSteps}</span>
      </div>

      {/* Guide sections */}
      {roleGuide.map(group => (
        <div key={group.section} className="space-y-2">
          <button onClick={() => toggleSection(group.section)} className="flex items-center gap-2 w-full text-left">
            {expandedSections.has(group.section) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="g-section-label">{group.section}</span>
          </button>

          {expandedSections.has(group.section) && (
            <div className="space-y-2 ml-6">
              {group.steps.map((step, i) => {
                const stepId = `${selectedRole}-${step.title}`;
                const isComplete = completedSteps.has(stepId);
                return (
                  <div key={i} className={`g-surface g-elevated p-4 transition-all ${isComplete ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleStep(stepId)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#7c3aed]/10 text-[#7c3aed]'}`}>
                        {isComplete ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                      </button>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${isComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        {!isComplete && (
                          <>
                            <div className="mt-2 space-y-0.5">
                              {step.tips.map((tip, j) => (
                                <div key={j} className="text-[11px] text-muted-foreground flex items-start gap-1">
                                  <span className="text-[#7c3aed]">•</span> {tip}
                                </div>
                              ))}
                            </div>
                            {step.action && (
                              <Link href={step.action.href} className="inline-flex items-center gap-1 mt-2 px-3 py-1 text-xs font-medium rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors">
                                {step.action.label} <ArrowRight className="h-3 w-3" />
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
