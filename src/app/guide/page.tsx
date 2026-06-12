'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, Kanban, Magnet, Users, FileText, CheckSquare,
  TrendingUp, Bot, Network, Settings, ArrowRight, Check,
  MessageSquare, Upload, Search, Shield, BarChart3,
  Target, Briefcase, Crown, Eye, Rocket, BookOpen,
  ChevronDown, ChevronRight, Play, DollarSign, Zap,
  Globe, Mail, Calendar, Home, Award, Star, CircleCheck,
  Download, ClipboardList, Lock, Handshake, Trophy, RefreshCw
} from 'lucide-react';

// ── SOP Data ──
const sopStages = [
  {
    number: 1,
    title: 'PROSPECTING',
    subtitle: 'EE / EN / NN Classification',
    icon: Magnet,
    color: '#7c3aed',
    activities: [
      'NN (New-New): Cold outreach, event follow-up, referral. Requires ICP validation.',
      'EN (Existing-New): Cross-sell to existing account. Leverage existing relationship.',
      'EE (Existing-Existing): Renewal/expansion. Highest win probability.',
    ],
    tools: ['Signal Intake', 'Campaigns', 'Lead Management'],
    gate: 'Lead captured with source classification (EE/EN/NN) + ICP fit score assigned',
  },
  {
    number: 2,
    title: 'QUALIFICATION',
    subtitle: 'Discovery → Qualification',
    icon: Search,
    color: '#3b82f6',
    activities: [
      'BANT assessment: Budget, Authority, Need, Timeline',
      'Identify decision maker (DM) — MANDATORY before advancing',
      'Log meeting notes via Signal Intake or Meeting Notes',
      'AI auto-qualifies leads with ICP scoring (60+ = qualified)',
    ],
    tools: ['Lead Management', 'Signal Intake', 'AI Agent: Deal Coach'],
    gate: 'Must have DM identified + budget signal confirmed',
  },
  {
    number: 3,
    title: 'PROPOSAL',
    subtitle: 'Qualification → Proposal',
    icon: FileText,
    color: '#178A4C',
    activities: [
      'Use Proposal Studio for AI-assisted drafting',
      'Select template from 150+ library (match domain + engagement type)',
      'Mandatory sections: Exec Summary, Scope, Team, Timeline, Pricing',
      'Export as PDF/DOCX for client delivery',
      'Link pricing from Pricing Engine',
    ],
    tools: ['Presales OS / Proposal Studio', 'Pricing Engine', 'Templates Library'],
    gate: 'Proposal delivered + stakeholder feedback received',
  },
  {
    number: 4,
    title: 'NEGOTIATION',
    subtitle: 'Proposal → Negotiation',
    icon: Handshake,
    color: '#B26A05',
    activities: [
      'Draft contracts using Contracts tab',
      'Review pricing with margin targets (≥28% standard)',
      'Get executive approval for deals >$500K',
      'Document all terms in conversation log',
    ],
    tools: ['Contracts', 'Pricing Engine', 'Deal Room'],
    gate: 'Commercial terms agreed + legal review complete',
  },
  {
    number: 5,
    title: 'CLOSE',
    subtitle: 'Negotiation → Won / Lost',
    icon: Trophy,
    color: '#22c55e',
    activities: [
      'Won: Auto-creates kickoff + delivery workspace tasks',
      'Lost: Document reason, update for competitive intelligence',
      'Contracts: SOW/MSA execution tracked in Contracts tab',
    ],
    tools: ['Pipeline Board', 'Contracts', 'Tasks'],
    gate: 'Contract executed (Won) or loss reason documented (Lost)',
  },
  {
    number: 6,
    title: 'DELIVERY & GROWTH',
    subtitle: 'Ongoing Revenue & Expansion',
    icon: RefreshCw,
    color: '#11A7A0',
    activities: [
      'Track ongoing revenue (monthly/quarterly)',
      'Identify upsell opportunities (EN → EE path)',
      'Maintain account health through regular touchpoints',
      'Feed competitive intelligence back into prospecting',
    ],
    tools: ['Analytics Dashboard', 'Account Intelligence', 'Forecasting'],
    gate: 'Account health score maintained above threshold + expansion pipeline seeded',
  },
];

// ── PDF Generation ──
function buildPDFContent(stats: { pipeline: string; activeDeals: number; wonDeals: number; accounts: number; ee: number; en: number; nn: number }) {
  const sopHTML = sopStages.map(s => `
    <div class="stage">
      <h3>Stage ${s.number}: ${s.title} <span style="color:#666;font-weight:normal;font-size:13px">— ${s.subtitle}</span></h3>
      <p style="font-size:13px;color:#555;margin:4px 0 8px"><strong>Key Activities:</strong></p>
      <ul>${s.activities.map(a => `<li>${a}</li>`).join('')}</ul>
      <p style="font-size:13px;color:#555;margin:8px 0 4px"><strong>Tools:</strong> ${s.tools.join(', ')}</p>
      <div class="gate"><strong>Gate Criteria:</strong> ${s.gate}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head>
    <title>Galent SalesPilot — User Guide & Sales SOP</title>
    <style>
      body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; padding: 0 24px; line-height: 1.6; }
      h1 { color: #7c3aed; font-size: 24px; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
      h2 { color: #333; margin-top: 32px; font-size: 18px; }
      h3 { color: #1a1a2e; margin-bottom: 4px; font-size: 15px; }
      .stage { border-left: 3px solid #7c3aed; padding-left: 16px; margin: 20px 0; }
      .gate { background: #f0f0f5; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-top: 8px; }
      ul { margin: 4px 0; padding-left: 20px; }
      li { font-size: 13px; margin: 3px 0; color: #333; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
      .stat-box { text-align: center; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
      .stat-value { font-size: 20px; font-weight: 700; color: #7c3aed; }
      .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; text-align: center; }
      .section-divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
      @media print { body { margin: 20px; } .stage { break-inside: avoid; } }
    </style>
  </head><body>
    <h1>Galent SalesPilot — User Guide & Sales SOP</h1>
    <p style="color:#555;font-size:14px;">AI-native sales intelligence platform for IT Services & Staffing. This document covers the standard operating procedure for the complete sales lifecycle.</p>

    <div class="stats-grid">
      <div class="stat-box"><div class="stat-value">${stats.pipeline}</div><div class="stat-label">Pipeline</div></div>
      <div class="stat-box"><div class="stat-value">${stats.activeDeals}</div><div class="stat-label">Active Deals</div></div>
      <div class="stat-box"><div class="stat-value">${stats.wonDeals}</div><div class="stat-label">Won</div></div>
      <div class="stat-box"><div class="stat-value">${stats.accounts}</div><div class="stat-label">Accounts</div></div>
    </div>
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-box"><div class="stat-value">${stats.ee}</div><div class="stat-label">EE (Existing-Existing)</div></div>
      <div class="stat-box"><div class="stat-value">${stats.en}</div><div class="stat-label">EN (Existing-New)</div></div>
      <div class="stat-box"><div class="stat-value">${stats.nn}</div><div class="stat-label">NN (New-New)</div></div>
    </div>

    <hr class="section-divider" />
    <h2>Sales Process SOP — Galent IT Services & Staffing</h2>
    ${sopHTML}

    <hr class="section-divider" />
    <h2>Platform Features</h2>

    <h3>Core Sales</h3>
    <ul>
      <li><strong>Pipeline Management</strong> — Board, Funnel, Table, Calendar, Graph views. Drag-drop with AI gate analysis.</li>
      <li><strong>Conversational Lead Capture</strong> — Describe leads naturally (voice or text), AI extracts all fields.</li>
      <li><strong>Deal Room</strong> — AI-powered conversational deal management with inline forms.</li>
      <li><strong>Contacts Intelligence</strong> — Auto-categorized: Executive, Champion, Influencer, Gatekeeper, End User.</li>
      <li><strong>Tasks</strong> — AI auto-creates tasks on stage changes. Overdue tracking.</li>
    </ul>

    <h3>Presales & Pricing</h3>
    <ul>
      <li><strong>Proposal Studio</strong> — Conversational AI drafts proposals. 150+ templates across 12 domains.</li>
      <li><strong>Pricing Desk</strong> — Rate cards by geo (NA/India/LATAM/EU). Blended team builder. CSV export.</li>
      <li><strong>Solutioning</strong> — Effort estimator, SA assignments, architecture notes.</li>
      <li><strong>Contracts</strong> — SOW, MSA, NDA lifecycle with approval chains.</li>
      <li><strong>Export</strong> — PDF, DOCX, Markdown export for proposals.</li>
    </ul>

    <h3>Intelligence & Analytics</h3>
    <ul>
      <li><strong>Dashboard</strong> — Recharts: funnel, forecast, industry distribution.</li>
      <li><strong>Growth Whitespace</strong> — Account × service line grid. Click "+" to create expansion opportunities.</li>
      <li><strong>Insights</strong> — Lessons learnt from won/lost deals. AI pattern detection.</li>
      <li><strong>Forecasting</strong> — Commit/Best Case/Pipeline categories. Weighted forecast.</li>
      <li><strong>EE/EN/NN Classification</strong> — Existing-Existing (repeat), Existing-New (expand), New-New.</li>
      <li><strong>Revenue Tracking</strong> — Monthly/quarterly/YTD across all surfaces.</li>
    </ul>

    <h3>AI & Automation</h3>
    <ul>
      <li><strong>9 AI Agents</strong> — Deal Coach, Research, Outreach, Hygiene, Forecast, Intake, Proposal, Account Intel, Competitive Intel.</li>
      <li><strong>Sales Enablement</strong> — 3 AI coaches (Platform, Offerings, Objection), battle cards, playbooks.</li>
      <li><strong>Ask Galent</strong> — Natural language pipeline queries with GenUI action buttons.</li>
      <li><strong>Agentic Auto-Actions</strong> — Stage changes auto-create tasks (SOW, pricing, contracts, kickoff).</li>
    </ul>

    <h3>Integrations & Plugins</h3>
    <ul>
      <li><strong>Outlook Add-in</strong> — "Send to SalesPilot" sidebar in Outlook. Manifest: /plugins/outlook/manifest.xml</li>
      <li><strong>Teams App</strong> — Pipeline, Ask Galent, Signal tabs in Teams. Manifest: /plugins/teams/manifest.json</li>
      <li><strong>SharePoint</strong> — Sync proposals and SOWs to SharePoint libraries.</li>
      <li><strong>CRM Sync</strong> — Salesforce, HubSpot, Pipedrive, Zoho, Freshsales bidirectional sync.</li>
      <li><strong>Email</strong> — Gmail/Outlook IMAP+SMTP connector (App Password, no OAuth needed).</li>
      <li><strong>Webhooks</strong> — /api/webhooks/teams, /api/webhooks/outlook for external integrations.</li>
    </ul>

    <h3>Admin & Users</h3>
    <ul>
      <li><strong>User Management</strong> — Create users, assign roles (Admin/Manager/Rep/SDR/Presales/Viewer).</li>
      <li><strong>O365 Directory</strong> — Search organization directory, invite users from Azure AD.</li>
      <li><strong>Microsoft SSO</strong> — Sign in with Microsoft O365 via Azure AD OAuth.</li>
      <li><strong>Smart Matching</strong> — Users auto-matched to their deals by fuzzy name matching.</li>
    </ul>

    <hr class="section-divider" />
    <h2>Getting Started</h2>
    <ol>
      <li>Sign in at <strong>https://salespilot.galent.ai</strong> with Microsoft or email.</li>
      <li>Check the <strong>"My Day"</strong> tab for your daily brief and deal stories.</li>
      <li>Open <strong>Pipeline</strong> to see your deals on the Board or Funnel view.</li>
      <li>Click any deal to open the <strong>Deal Detail</strong> with 8 tabs (Details, Stakeholders, Tasks, Pricing, Presales, Contracts, Docs, Log).</li>
      <li>Use <strong>Ask Galent</strong> (top bar) to query your pipeline in natural language.</li>
      <li>Go to <strong>Presales</strong> to build proposals with the AI Proposal Studio.</li>
      <li>Check <strong>Growth</strong> for whitespace expansion opportunities.</li>
      <li>Visit <strong>Enablement</strong> for AI coaching, battle cards, and playbooks.</li>
    </ol>

    <div class="footer">
      Galent SalesPilot v1.4 · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · https://salespilot.galent.ai
    </div>
  </body></html>`;
}

// ── Interactive Feature Cards ──
function FeatureCard({ icon: Icon, title, description, href, color, tag, stats }: {
  icon: any; title: string; description: string; href: string; color: string; tag?: string; stats?: string;
}) {
  return (
    <Link href={href} className="group p-5 rounded-xl g-surface g-elevated hover-glow transition-all text-left">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground group-hover:text-[#7c3aed] transition-colors">{title}</span>
            {tag && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] font-medium">{tag}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          {stats && <p className="text-[10px] text-muted-foreground mt-2 opacity-70">{stats}</p>}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
      </div>
    </Link>
  );
}

// ── Journey Step ──
function JourneyStep({ number, title, description, features, isActive, onToggle }: {
  number: number; title: string; description: string;
  features: { icon: any; title: string; description: string; href: string; color: string; tag?: string; stats?: string }[];
  isActive: boolean; onToggle: () => void;
}) {
  return (
    <div className="relative">
      {/* Step indicator */}
      <button onClick={onToggle} className="flex items-center gap-4 w-full text-left group">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
          isActive ? 'bg-[#7c3aed] text-white' : 'bg-secondary text-muted-foreground group-hover:bg-[#7c3aed]/10 group-hover:text-[#7c3aed]'
        }`}>
          {number}
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-foreground font-display">{title}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {isActive ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Features grid */}
      {isActive && (
        <div className="mt-4 ml-14 grid grid-cols-1 md:grid-cols-2 gap-3 animate-flow-in">
          {features.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      )}
    </div>
  );
}

// ── SOP Stage Card ──
function SOPStageCard({ stage, isOpen, onToggle }: {
  stage: typeof sopStages[0]; isOpen: boolean; onToggle: () => void;
}) {
  const Icon = stage.icon;
  return (
    <div className="rounded-xl g-surface g-elevated overflow-hidden transition-all">
      <button onClick={onToggle} className="flex items-center gap-4 w-full text-left p-4 group">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${stage.color}15` }}>
          <Icon className="h-5 w-5" style={{ color: stage.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${stage.color}15`, color: stage.color }}>
              STAGE {stage.number}
            </span>
            <span className="text-sm font-semibold text-foreground font-display">{stage.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{stage.subtitle}</p>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 animate-flow-in">
          <div className="ml-14 space-y-3">
            {/* Activities */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Key Activities</div>
              <ul className="space-y-1.5">
                {stage.activities.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: stage.color }} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tools & Features</div>
              <div className="flex flex-wrap gap-1.5">
                {stage.tools.map(t => (
                  <span key={t} className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-foreground font-medium">{t}</span>
                ))}
              </div>
            </div>

            {/* Gate */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/10">
              <Lock className="h-3.5 w-3.5 mt-0.5 text-[#7c3aed] shrink-0" />
              <div>
                <div className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">Gate Criteria</div>
                <p className="text-xs text-foreground mt-0.5">{stage.gate}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [activeSOP, setActiveSOP] = useState(-1);
  const [quickStart, setQuickStart] = useState(false);

  // Live pipeline stats for context
  const { data: opportunities = [] } = trpc.opportunity.list.useQuery();
  const opps = opportunities as any[];
  const activeDeals = opps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
  const wonDeals = opps.filter((o: any) => o.status === 'Won');
  const totalPipeline = activeDeals.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
  const totalRevenue = wonDeals.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
  const allTasks = opps.flatMap((o: any) => o.subTasks || []);
  const overdueTasks = allTasks.filter((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date());

  // Account + classification counts
  const uniqueAccounts = new Set(opps.map((o: any) => o.account).filter(Boolean));
  const eeCount = opps.filter((o: any) => (o.classification || '').toUpperCase() === 'EE').length;
  const enCount = opps.filter((o: any) => (o.classification || '').toUpperCase() === 'EN').length;
  const nnCount = opps.filter((o: any) => (o.classification || '').toUpperCase() === 'NN').length;

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = buildPDFContent({
      pipeline: `$${(totalPipeline / 1e6).toFixed(1)}M`,
      activeDeals: activeDeals.length,
      wonDeals: wonDeals.length,
      accounts: uniqueAccounts.size,
      ee: eeCount,
      en: enCount,
      nn: nnCount,
    });
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const journeySteps = [
    {
      title: 'Prospecting & Lead Generation',
      description: 'Capture leads from any channel, qualify with AI, and build your pipeline',
      features: [
        { icon: Magnet, title: 'Lead Management', description: 'AI-powered lead scoring, qualification, and enrichment. Leads flow: Signal → Qualify → Enrich → Engage → Convert.', href: '/leads', color: '#7c3aed', tag: 'AI', stats: `${opps.length > 0 ? 'Pipeline active' : 'Start adding leads'}` },
        { icon: Globe, title: 'Signal Intake', description: 'Capture intel from voice recordings, Teams transcripts, Outlook emails, or desktop notes. AI extracts deal signals automatically.', href: '/intake', color: '#11A7A0', tag: 'Omni-channel' },
        { icon: Mail, title: 'Campaigns', description: 'Track outbound, ABM, and inbound campaigns with funnel analytics. Create, manage, and measure campaign performance.', href: '/campaigns', color: '#3b82f6' },
        { icon: Network, title: 'Account Intelligence', description: 'Deep account research with AI-powered company analysis, relationship mapping, and expansion signals.', href: '/accounts', color: '#f59e0b', stats: 'AI enrichment + intent scoring' },
      ],
    },
    {
      title: 'Pipeline Management',
      description: 'Manage your deals through stages with AI coaching, multiple views, and real-time insights',
      features: [
        { icon: Kanban, title: 'Pipeline Board', description: 'Drag-and-drop kanban with gate criteria, AI readiness analysis on every stage move, and weighted values.', href: '/pipeline', color: '#7c3aed', tag: 'Primary', stats: `${activeDeals.length} active deals · $${(totalPipeline / 1e6).toFixed(1)}M pipeline` },
        { icon: MessageSquare, title: 'Deal Room', description: 'Conversational deal management. Add tasks, stakeholders, change stages — all through natural language with AI assistance.', href: '/deal-room', color: '#22c55e' },
        { icon: CheckSquare, title: 'Tasks', description: 'AI auto-creates tasks when deals change stages. Track overdue items, set priorities, and link everything to deals.', href: '/tasks', color: '#ef4444', stats: overdueTasks.length > 0 ? `${overdueTasks.length} overdue tasks need attention` : 'All tasks on track' },
        { icon: Users, title: 'Contacts & Intelligence', description: 'Auto-categorized contacts: Executive, Champion, Influencer, Gatekeeper. Slide-out intelligence panel for each person.', href: '/stakeholders', color: '#8b5cf6', tag: 'AI Categories' },
      ],
    },
    {
      title: 'Presales & Pricing',
      description: 'Build proposals, estimate pricing, and generate SOW documents — all AI-assisted',
      features: [
        { icon: Target, title: 'Presales OS', description: 'Pursuit pipeline (RFP/RFI/Proactive), 10-section Proposal Studio with AI drafting, solutioning effort estimator, and templates.', href: '/presales', color: '#178A4C', tag: 'AI Studio' },
        { icon: DollarSign, title: 'Pricing Engine', description: '11 roles × 6 geo regions with Galent rate cards. Build team compositions, calculate blended rates, margins, and export to CSV.', href: '/pricing', color: '#B26A05' },
        { icon: FileText, title: 'Contracts', description: 'Full contract lifecycle: SOW, MSA, NDA, Change Orders. Approval chains, expiry tracking, and deal linking.', href: '/contracts', color: '#C73A3A' },
      ],
    },
    {
      title: 'Analytics & Forecasting',
      description: 'Pipeline insights, revenue forecasting, and deal flow visualization',
      features: [
        { icon: BarChart3, title: 'Analytics Dashboard', description: 'Pipeline by stage, by owner, by industry. Sales funnel with conversion rates. Forecast by quarter.', href: '/dashboard', color: '#7c3aed' },
        { icon: TrendingUp, title: 'Forecasting', description: 'Commit / Best Case / Pipeline categories. Weighted forecast, win rate tracking, rep-level breakdown.', href: '/forecasting', color: '#3b82f6' },
        { icon: Eye, title: 'Deal Graph', description: 'Interactive pipeline visualization — graph, sankey, and list views. Click any node to drill into deal details.', href: '/graph', color: '#22c55e' },
      ],
    },
    {
      title: 'AI Agents & Automation',
      description: '9 specialized AI agents + workflow automation + natural language queries',
      features: [
        { icon: Bot, title: 'AI Agent Fleet', description: '9 agents: Deal Coach, Research, Outreach Drafter, Pipeline Hygiene, Forecast, Intake Processor, Proposal Drafter, Account Intel, Competitive Intel.', href: '/agents', color: '#7c3aed', tag: '9 Agents', stats: 'Claude-powered with guardrails' },
        { icon: Sparkles, title: 'Ask Galent', description: 'Natural language queries about your pipeline. "Which deals are at risk?" "What is our forecast for Q3?" AI responds with data.', href: '/ask', color: '#11A7A0' },
        { icon: Zap, title: 'Workflows', description: 'Trigger → Condition → Action automation. Auto-runs on deal events, task overdue, lead qualification, and scheduled intervals.', href: '/workflows', color: '#f59e0b' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-xs font-medium">
          <BookOpen className="h-3.5 w-3.5" /> Interactive Platform Guide & Sales SOP
        </div>
        <h1 className="text-3xl font-bold text-foreground font-display">Welcome to Galent SalesPilot</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          AI-native sales intelligence platform. Follow the journey below — each step links to the actual feature so you can try it immediately. Includes the full Sales SOP for Galent IT Services & Staffing.
        </p>
      </div>

      {/* Download PDF + Quick Start buttons */}
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors"
        >
          <Download className="h-4 w-4" /> Download Guide as PDF
        </button>
        <Link href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Home className="h-4 w-4" /> Command Center
        </Link>
        <Link href="/pipeline"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Kanban className="h-4 w-4" /> Open Pipeline
        </Link>
        <Link href="/ask"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Sparkles className="h-4 w-4 text-[#7c3aed]" /> Ask Galent
        </Link>
      </div>

      {/* Live stats banner — expanded */}
      {opps.length > 0 && (
        <div className="space-y-3 animate-flow-in">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Pipeline', value: `$${(totalPipeline / 1e6).toFixed(1)}M`, color: '#7c3aed' },
              { label: 'Revenue (Won)', value: `$${(totalRevenue / 1e6).toFixed(1)}M`, color: '#22c55e' },
              { label: 'Active Deals', value: String(activeDeals.length), color: '#3b82f6' },
              { label: 'Won', value: String(wonDeals.length), color: '#22c55e' },
              { label: 'Accounts', value: String(uniqueAccounts.size), color: '#f59e0b' },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl g-surface text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className="text-lg font-bold g-metric" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'EE (Existing-Existing)', value: String(eeCount), color: '#22c55e', desc: 'Renewal / Expansion' },
              { label: 'EN (Existing-New)', value: String(enCount), color: '#3b82f6', desc: 'Cross-sell' },
              { label: 'NN (New-New)', value: String(nnCount), color: '#7c3aed', desc: 'New Business' },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl g-surface text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className="text-lg font-bold g-metric" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journey Steps */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sales Lifecycle Journey</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4">
          {journeySteps.map((step, i) => (
            <div key={step.title}>
              <JourneyStep
                number={i + 1}
                title={step.title}
                description={step.description}
                features={step.features}
                isActive={activeStep === i}
                onToggle={() => setActiveStep(activeStep === i ? -1 : i)}
              />
              {i < journeySteps.length - 1 && (
                <div className="ml-5 h-6 border-l-2 border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sales SOP Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sales Process SOP</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="h-5 w-5 text-[#7c3aed]" />
            <div>
              <div className="text-sm font-semibold text-foreground font-display">Standard Operating Procedure</div>
              <p className="text-xs text-muted-foreground">Galent IT Services & Staffing — 6-stage sales process with gate criteria</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sopStages.map((stage) => (
            <SOPStageCard
              key={stage.number}
              stage={stage}
              isOpen={activeSOP === stage.number}
              onToggle={() => setActiveSOP(activeSOP === stage.number ? -1 : stage.number)}
            />
          ))}
        </div>

        {/* SOP Flow Diagram */}
        <div className="p-4 rounded-xl g-surface text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Process Flow</div>
          <div className="flex items-center justify-center gap-1 flex-wrap text-xs font-medium">
            {sopStages.map((stage, i) => (
              <div key={stage.number} className="flex items-center gap-1">
                <span className="px-3 py-1.5 rounded-lg text-white text-[11px]" style={{ backgroundColor: stage.color }}>
                  {stage.title}
                </span>
                {i < sopStages.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform capabilities summary */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-sm font-semibold text-foreground mb-3 font-display">Platform Capabilities</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { label: '33 Routes', desc: 'Full-featured pages' },
            { label: '9 AI Agents', desc: 'Claude-powered' },
            { label: '21 tRPC Routers', desc: 'Type-safe API' },
            { label: '8 Deal Tabs', desc: 'Single source of truth' },
            { label: 'Real-time', desc: 'Socket.IO events' },
            { label: '6 Pipeline Views', desc: 'Board/Table/Calendar...' },
            { label: 'MCP Tools', desc: 'Agent-callable integrations' },
            { label: '121 Tests', desc: 'Vitest suite' },
          ].map(cap => (
            <div key={cap.label} className="flex items-center gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-[var(--g-green)] shrink-0" />
              <div>
                <span className="font-medium text-foreground">{cap.label}</span>
                <span className="text-muted-foreground ml-1">— {cap.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
