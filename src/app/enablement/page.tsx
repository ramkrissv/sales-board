'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, BookOpen, Target, Briefcase, Cpu, FileText, ExternalLink,
  ChevronRight, Search, Loader2, MessageSquare, Award, Zap, Shield,
  Globe, Users, DollarSign, BarChart3, Layers, Code, CheckCircle,
  Play, Copy, Download, Star, TrendingUp, ArrowRight
} from 'lucide-react';

// ── Galent Offerings Catalog ──
const OFFERINGS = [
  {
    id: 'ai-engineering', name: 'AI & Data Engineering', icon: Cpu, color: '#7c3aed',
    tagline: 'GenAI, ML platforms, data lakes, computer vision, NLP',
    services: ['GenAI Application Development', 'ML Platform Build', 'Data Lake / Lakehouse', 'Computer Vision', 'NLP & Conversational AI', 'MLOps', 'Predictive Analytics', 'Document Intelligence'],
    differentiators: ['GalentAI platform for accelerated delivery', 'Production-grade MLOps from day 1', 'Responsible AI guardrails built-in'],
    idealFor: 'Enterprises looking to operationalize AI beyond POCs',
    tcvRange: '$200K - $2M',
    battleCard: {
      vsAccenture: 'Faster delivery (3x), specialized AI talent, platform-led approach',
      vsInfosys: 'Deeper AI expertise, smaller focused teams, higher quality',
      vsBoutique: 'Enterprise scale + startup speed, GalentAI platform advantage',
    },
  },
  {
    id: 'cloud-infra', name: 'Cloud & Infrastructure', icon: Globe, color: '#3b82f6',
    tagline: 'Migration, cloud-native, Kubernetes, FinOps, DR',
    services: ['Cloud Migration (Lift & Shift)', 'Cloud-Native Platform', 'Infrastructure as Code', 'Multi-Cloud Strategy', 'Serverless Architecture', 'DR & High Availability', 'Cost Optimization / FinOps'],
    differentiators: ['Multi-cloud certified team', 'IaC-first approach', 'FinOps built into every engagement'],
    idealFor: 'Organizations migrating to cloud or optimizing cloud spend',
    tcvRange: '$100K - $2M',
    battleCard: {
      vsAWS_PS: 'Cloud-agnostic, not locked to one provider',
      vsTCS: 'Modern tooling (Terraform, K8s), not legacy approaches',
      vsStartup: 'Enterprise governance + production hardening',
    },
  },
  {
    id: 'app-dev', name: 'Application Development', icon: Code, color: '#22c55e',
    tagline: 'Custom apps, mobile, APIs, legacy modernization, microservices',
    services: ['Custom Web Applications', 'Mobile (Cross-Platform)', 'API Platform & Gateway', 'Legacy Modernization', 'E-Commerce', 'Microservices Architecture', 'Low-Code Platforms'],
    differentiators: ['AI-augmented SDLC via GalentAI', 'Full-stack expertise across modern frameworks', '40% faster delivery through AI-assisted coding'],
    idealFor: 'Companies building new digital products or modernizing legacy systems',
    tcvRange: '$150K - $3M',
    battleCard: {
      vsOffshore: 'Quality-first with AI augmentation, not just cost arbitrage',
      vsProduct: 'Custom-built for your exact needs, not SaaS limitations',
      vsFreelance: 'Enterprise reliability, team continuity, IP protection',
    },
  },
  {
    id: 'managed-services', name: 'Managed Services', icon: Shield, color: '#f59e0b',
    tagline: 'AMS, cloud ops, NOC/SOC, DevOps-as-a-Service, DataOps',
    services: ['Application Managed Services', 'Cloud Managed Services', 'NOC/SOC Operations', 'DevOps as a Service', 'DataOps', 'QA Center of Excellence'],
    differentiators: ['AI-driven monitoring and alerting', 'Proactive vs reactive support model', 'Continuous improvement built into SLAs'],
    idealFor: 'Enterprises needing 24/7 reliable operations with continuous improvement',
    tcvRange: '$300K - $3M/year',
    battleCard: {
      vsHCL: 'Smaller, more accountable teams. Higher talent quality.',
      vsCognizant: 'AI-native operations, not manual runbooks',
      vsInternal: 'Cost-effective with offshore model + specialized skills',
    },
  },
  {
    id: 'staff-aug', name: 'Staff Augmentation', icon: Users, color: '#ec4899',
    tagline: 'Development teams, DevOps, QA, data engineering',
    services: ['Development Team Augmentation', 'DevOps Team', 'QA Team', 'Data Engineering Team', 'AI/ML Specialists', 'Solution Architects'],
    differentiators: ['Curated talent with AI-validated skills', 'Flexible ramp-up/down', 'India + US hybrid model'],
    idealFor: 'Companies needing to scale teams quickly with quality talent',
    tcvRange: '$150K - $800K/year',
    battleCard: {
      vsToptal: 'Team-based, not individual contractors. Better continuity.',
      vsGlobal: 'India COE with US oversight. Best of both worlds.',
      vsInternal: 'Faster hiring (2-3 weeks vs 2-3 months). Flexible commitment.',
    },
  },
  {
    id: 'consulting', name: 'Consulting & Advisory', icon: Briefcase, color: '#11A7A0',
    tagline: 'Architecture review, due diligence, AI readiness, cloud strategy',
    services: ['Technology Due Diligence', 'Architecture Review', 'Cloud Strategy Assessment', 'AI Readiness Assessment', 'Digital Transformation Strategy', 'Enterprise Architecture'],
    differentiators: ['Practitioner-led (not just slides)', 'Actionable roadmaps, not shelf-ware', 'Follow-through execution capability'],
    idealFor: 'C-suite leaders needing strategic technology guidance',
    tcvRange: '$30K - $500K',
    battleCard: {
      vsMcKinsey: 'Technical depth + execution capability at 1/3 the cost',
      vsGartner: 'Custom analysis, not generic quadrants',
      vsInternal: 'External perspective + industry benchmarks',
    },
  },
];

// ── Sales Playbooks ──
const PLAYBOOKS = [
  { id: 'discovery', title: 'Discovery Call Framework', stage: 'Discovery', duration: '30 min', steps: ['Open with industry insight', 'Ask about current tech stack', 'Identify pain points (3 max)', 'Understand decision process', 'Qualify budget & timeline', 'Propose next step (demo/workshop)'] },
  { id: 'demo', title: 'GalentAI Platform Demo', stage: 'Qualification', duration: '45 min', steps: ['Start with customer\'s use case', 'Show relevant platform capability', 'Live demo with their data if possible', 'Highlight AI-assisted SDLC metrics', 'Compare to their current approach', 'Propose POC scope'] },
  { id: 'proposal', title: 'Proposal Presentation', stage: 'Proposal', duration: '60 min', steps: ['Executive summary (2 min)', 'Understanding of requirements (5 min)', 'Proposed solution (15 min)', 'Team & timeline (10 min)', 'Pricing walkthrough (10 min)', 'Q&A and next steps (15 min)'] },
  { id: 'negotiation', title: 'Negotiation Playbook', stage: 'Negotiation', duration: 'Variable', steps: ['Never lead with discount', 'Understand their constraints first', 'Offer value-adds before price cuts', 'Bundle services for better margins', 'Get commitment on timeline', 'MSA/SOW parallel processing'] },
  { id: 'close', title: 'Close & Handoff', stage: 'Close', duration: '30 min', steps: ['Confirm all terms in writing', 'Introduce delivery team', 'Schedule kickoff within 2 weeks', 'Set up governance cadence', 'Define success metrics', 'Plan 30-60-90 day milestones'] },
];

type Tab = 'coach' | 'offerings' | 'playbooks' | 'artifacts';

export default function EnablementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('coach');
  const [selectedOffering, setSelectedOffering] = useState<typeof OFFERINGS[0] | null>(null);
  const [coachQuery, setCoachQuery] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [coachMode, setCoachMode] = useState<'platform' | 'offerings' | 'objection'>('platform');
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);
  const [artifactSearch, setArtifactSearch] = useState('');

  const chatMutation = trpc.ai.chat.useMutation();

  const handleCoachAsk = () => {
    if (!coachQuery.trim()) return;
    const modeContext = coachMode === 'platform'
      ? 'You are the GalentAI Platform Coach. Help the sales rep understand and demo the Galent platform capabilities, AI-assisted SDLC, and technical differentiators.'
      : coachMode === 'offerings'
      ? `You are the Galent Offerings Coach. Help the sales rep position Galent services. Offerings: ${OFFERINGS.map(o => o.name + ': ' + o.tagline).join('. ')}`
      : 'You are an Objection Handling Coach. Help the sales rep handle common objections about pricing, competition, offshore quality, and AI readiness.';

    chatMutation.mutate({
      message: `${modeContext}\n\nSales rep asks: ${coachQuery}\n\nGive a concise, actionable answer (max 150 words). Include specific talk tracks or phrases the rep can use.`,
      context: { page: 'enablement' },
    }, {
      onSuccess: (data) => { setCoachResponse(data.response); },
    });
  };

  const TABS = [
    { id: 'coach' as Tab, label: 'AI Coach', icon: Sparkles },
    { id: 'offerings' as Tab, label: 'Offerings', icon: Layers },
    { id: 'playbooks' as Tab, label: 'Playbooks', icon: BookOpen },
    { id: 'artifacts' as Tab, label: 'Artifacts', icon: FileText },
  ];

  // Curated artifact library
  const ARTIFACTS = [
    { id: 'a1', name: 'Galent Company Overview Deck', type: 'Presentation', format: 'PPTX', tags: ['overview', 'intro'], icon: '📊' },
    { id: 'a2', name: 'GalentAI Platform Demo Script', type: 'Script', format: 'DOC', tags: ['demo', 'platform'], icon: '📝' },
    { id: 'a3', name: 'AI/ML Capability Brochure', type: 'Brochure', format: 'PDF', tags: ['ai', 'ml', 'capability'], icon: '📄' },
    { id: 'a4', name: 'Cloud Migration Case Study — Apple', type: 'Case Study', format: 'PDF', tags: ['cloud', 'migration', 'apple'], icon: '📋' },
    { id: 'a5', name: 'Managed Services Pricing Template', type: 'Template', format: 'XLSX', tags: ['pricing', 'managed services'], icon: '💰' },
    { id: 'a6', name: 'Healthcare Industry Brief', type: 'Brief', format: 'PDF', tags: ['healthcare', 'industry'], icon: '🏥' },
    { id: 'a7', name: 'Financial Services Case Study — HNI', type: 'Case Study', format: 'PDF', tags: ['finserv', 'hni', 'case study'], icon: '📋' },
    { id: 'a8', name: 'Staff Augmentation Rate Card', type: 'Template', format: 'XLSX', tags: ['rates', 'staff aug', 'pricing'], icon: '💰' },
    { id: 'a9', name: 'Security & Compliance Matrix', type: 'Template', format: 'XLSX', tags: ['security', 'compliance', 'soc2'], icon: '🔒' },
    { id: 'a10', name: 'QA CoE Reference Architecture', type: 'Technical', format: 'PDF', tags: ['qa', 'testing', 'coe'], icon: '🧪' },
    { id: 'a11', name: 'GalentAI SDLC Metrics Report', type: 'Report', format: 'PDF', tags: ['ai', 'sdlc', 'metrics', 'productivity'], icon: '📈' },
    { id: 'a12', name: 'Partnership & Teaming Agreement Template', type: 'Legal', format: 'DOC', tags: ['legal', 'partnership', 'nda'], icon: '📜' },
  ];

  const filteredArtifacts = artifactSearch
    ? ARTIFACTS.filter(a => a.name.toLowerCase().includes(artifactSearch.toLowerCase()) || a.tags.some(t => t.includes(artifactSearch.toLowerCase())))
    : ARTIFACTS;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-display flex items-center gap-2">
            <Award className="h-5 w-5 text-[#7c3aed]" />
            Sales Enablement
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI coaching, battle cards, playbooks, and curated artifacts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className={`h-3.5 w-3.5 ${activeTab === tab.id ? 'text-[#7c3aed]' : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ AI COACH TAB ═══ */}
      {activeTab === 'coach' && (
        <div className="space-y-5">
          {/* Coach mode selector */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { mode: 'platform' as const, icon: Cpu, label: 'Platform Coach', desc: 'GalentAI capabilities, demos, technical differentiation', color: '#7c3aed' },
              { mode: 'offerings' as const, icon: Briefcase, label: 'Offerings Coach', desc: 'Service positioning, pricing guidance, deal sizing', color: '#3b82f6' },
              { mode: 'objection' as const, icon: Shield, label: 'Objection Handling', desc: 'Competitive responses, pricing pushback, risk mitigation', color: '#f59e0b' },
            ].map(c => (
              <button key={c.mode} onClick={() => setCoachMode(c.mode)}
                className={`p-4 rounded-xl text-left transition-all ${
                  coachMode === c.mode ? 'g-surface g-elevated border-[1px]' : 'bg-card border border-border hover:border-[#7c3aed]/20'
                }`} style={coachMode === c.mode ? { borderColor: c.color + '40' } : {}}>
                <c.icon className="h-5 w-5 mb-2" style={{ color: c.color }} />
                <div className="text-sm font-semibold text-foreground">{c.label}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{c.desc}</div>
              </button>
            ))}
          </div>

          {/* Coach input */}
          <div className="g-surface g-elevated p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[#7c3aed]" />
              <span className="text-sm font-semibold text-foreground">
                {coachMode === 'platform' ? 'Platform Coach' : coachMode === 'offerings' ? 'Offerings Coach' : 'Objection Handler'}
              </span>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(coachMode === 'platform' ? [
                'How do I demo GalentAI for legacy modernization?',
                'What makes our AI-assisted SDLC different?',
                'How to explain our platform to a CTO?',
              ] : coachMode === 'offerings' ? [
                'How to size a managed services deal?',
                'What margin should I target for staff aug?',
                'How to position against Accenture?',
              ] : [
                'Client says we\'re too expensive',
                'They prefer a larger vendor like TCS',
                'Concerned about offshore quality',
              ]).map((q, i) => (
                <button key={i} onClick={() => { setCoachQuery(q); }}
                  className="px-2.5 py-1 text-[10px] rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
                  {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input value={coachQuery} onChange={e => setCoachQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCoachAsk()}
                placeholder="Ask your AI sales coach anything..."
                className="flex-1 px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
              <button onClick={handleCoachAsk} disabled={chatMutation.isPending || !coachQuery.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors">
                {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
              </button>
            </div>

            {coachResponse && (
              <div className="mt-4 p-4 rounded-lg bg-card border border-[#7c3aed]/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                  <span className="text-[10px] font-semibold text-[#7c3aed]">AI Coach</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{coachResponse.replace(/\*\*/g, '').replace(/#{1,3}\s/g, '')}</p>
                <button onClick={() => navigator.clipboard.writeText(coachResponse)}
                  className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" /> Copy response
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ OFFERINGS TAB ═══ */}
      {activeTab === 'offerings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {OFFERINGS.map(o => (
              <button key={o.id} onClick={() => setSelectedOffering(selectedOffering?.id === o.id ? null : o)}
                className={`p-4 rounded-xl text-left transition-all ${
                  selectedOffering?.id === o.id ? 'g-surface g-elevated ring-1' : 'bg-card border border-border hover:border-[#7c3aed]/20'
                }`} style={selectedOffering?.id === o.id ? { borderColor: o.color + '40' } : undefined}>
                <o.icon className="h-5 w-5 mb-2" style={{ color: o.color }} />
                <div className="text-sm font-semibold text-foreground">{o.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{o.tagline}</div>
                <div className="text-[10px] text-muted-foreground mt-2">{o.tcvRange}</div>
              </button>
            ))}
          </div>

          {/* Offering detail */}
          {selectedOffering && (
            <div className="g-surface g-elevated p-5 rounded-xl space-y-4 animate-flow-in">
              <div className="flex items-center gap-3">
                <selectedOffering.icon className="h-6 w-6" style={{ color: selectedOffering.color }} />
                <div>
                  <h3 className="text-base font-semibold text-foreground font-display">{selectedOffering.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedOffering.tagline}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="g-section-label">Services</span>
                  <div className="space-y-1 mt-2">
                    {selectedOffering.services.map(s => (
                      <div key={s} className="flex items-center gap-2 text-xs text-foreground">
                        <CheckCircle className="h-3 w-3 text-[var(--g-green)] shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="g-section-label">Differentiators</span>
                  <div className="space-y-1 mt-2">
                    {selectedOffering.differentiators.map(d => (
                      <div key={d} className="flex items-start gap-2 text-xs text-foreground">
                        <Star className="h-3 w-3 text-[#f59e0b] shrink-0 mt-0.5" /> {d}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <span className="g-section-label">Ideal For</span>
                    <p className="text-xs text-foreground mt-1">{selectedOffering.idealFor}</p>
                  </div>
                </div>
              </div>

              {/* Battle Cards */}
              <div>
                <span className="g-section-label">Competitive Battle Cards</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  {Object.entries(selectedOffering.battleCard).map(([competitor, response]) => (
                    <div key={competitor} className="p-3 rounded-lg bg-card border border-border">
                      <div className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-wider mb-1">
                        vs {competitor.replace('vs', '').replace(/_/g, ' ')}
                      </div>
                      <p className="text-[11px] text-foreground">{response}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PLAYBOOKS TAB ═══ */}
      {activeTab === 'playbooks' && (
        <div className="space-y-3">
          {PLAYBOOKS.map(pb => (
            <div key={pb.id} className="g-surface g-elevated rounded-xl overflow-hidden">
              <button onClick={() => setExpandedPlaybook(expandedPlaybook === pb.id ? null : pb.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center">
                    <Play className="h-4 w-4 text-[#7c3aed]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{pb.title}</div>
                    <div className="text-[10px] text-muted-foreground">{pb.stage} · {pb.duration}</div>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expandedPlaybook === pb.id ? 'rotate-90' : ''}`} />
              </button>
              {expandedPlaybook === pb.id && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="space-y-2 mt-3">
                    {pb.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-xs text-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ ARTIFACTS TAB ═══ */}
      {activeTab === 'artifacts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={artifactSearch} onChange={e => setArtifactSearch(e.target.value)}
                placeholder="Search artifacts..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
            <span className="text-xs text-muted-foreground">{filteredArtifacts.length} artifacts</span>
          </div>

          <div className="p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20 text-xs text-muted-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
            Connect SharePoint in <a href="/integrations" className="text-[#7c3aed] hover:underline">Integrations</a> to sync live documents from your sales library.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredArtifacts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-[#7c3aed]/20 transition-all group">
                <span className="text-lg">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{a.type}</span>
                    <span className="text-[10px] text-muted-foreground">{a.format}</span>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg text-muted-foreground hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 opacity-0 group-hover:opacity-100 transition-all">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
