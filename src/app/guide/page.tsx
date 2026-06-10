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
  Globe, Mail, Calendar, Home, Award, Star, CircleCheck
} from 'lucide-react';

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

export default function GuidePage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [quickStart, setQuickStart] = useState(false);

  // Live pipeline stats for context
  const { data: opportunities = [] } = trpc.opportunity.list.useQuery();
  const activeDeals = (opportunities as any[]).filter((o: any) => !['Won', 'Lost'].includes(o.status));
  const totalPipeline = activeDeals.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
  const allTasks = (opportunities as any[]).flatMap((o: any) => o.subTasks || []);
  const overdueTasks = allTasks.filter((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date());

  const journeySteps = [
    {
      title: 'Prospecting & Lead Generation',
      description: 'Capture leads from any channel, qualify with AI, and build your pipeline',
      features: [
        { icon: Magnet, title: 'Lead Management', description: 'AI-powered lead scoring, qualification, and enrichment. Leads flow: Signal → Qualify → Enrich → Engage → Convert.', href: '/leads', color: '#7c3aed', tag: 'AI', stats: `${(opportunities as any[]).length > 0 ? 'Pipeline active' : 'Start adding leads'}` },
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
          <BookOpen className="h-3.5 w-3.5" /> Interactive Platform Guide
        </div>
        <h1 className="text-3xl font-bold text-foreground font-display">Welcome to Galent SalesPilot</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          AI-native sales intelligence platform. Follow the journey below — each step links to the actual feature so you can try it immediately.
        </p>
      </div>

      {/* Live stats banner */}
      {(opportunities as any[]).length > 0 && (
        <div className="grid grid-cols-4 gap-3 animate-flow-in">
          {[
            { label: 'Pipeline', value: `$${(totalPipeline / 1e6).toFixed(1)}M`, color: '#7c3aed' },
            { label: 'Active Deals', value: String(activeDeals.length), color: '#22c55e' },
            { label: 'Tasks', value: String(allTasks.length), color: '#3b82f6' },
            { label: 'Overdue', value: String(overdueTasks.length), color: overdueTasks.length > 0 ? '#ef4444' : '#22c55e' },
          ].map(stat => (
            <div key={stat.label} className="p-3 rounded-xl g-surface text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              <div className="text-lg font-bold g-metric" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Start buttons */}
      <div className="flex items-center gap-3 justify-center">
        <Link href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors">
          <Home className="h-4 w-4" /> Go to Command Center
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
