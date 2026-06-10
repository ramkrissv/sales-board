'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, Kanban, Magnet, Users, FileText, CheckSquare,
  TrendingUp, Bot, Network, Settings, ArrowRight, Check,
  MessageSquare, Upload, Search
} from 'lucide-react';

const steps = [
  {
    id: 1, title: 'Explore your Command Center', icon: Sparkles,
    description: 'Your home page shows AI-powered pipeline intelligence, critical actions, and real-time activity.',
    action: { label: 'Go to Command Center', href: '/' },
    tips: ['AI automatically analyzes your pipeline on load', 'Click any deal to see full details', 'Check the activity feed for recent changes'],
  },
  {
    id: 2, title: 'Manage your Leads', icon: Magnet,
    description: 'Track leads through the AI-led qualification pipeline: Signal → Qualify → Enrich → Engage → Convert.',
    action: { label: 'View Leads', href: '/leads' },
    tips: ['Click "AI Qualify" to let Claude score a lead', '"Draft Outreach" generates personalized emails', 'Convert qualified leads to deals with one click'],
  },
  {
    id: 3, title: 'Work your Pipeline', icon: Kanban,
    description: 'Drag deals between stages. Each card shows weighted value, next step, and time-in-stage health.',
    action: { label: 'Open Pipeline', href: '/pipeline' },
    tips: ['Drag a deal to move it — a confirmation dialog checks stage gate criteria', 'Click any card to see full deal details with AI analysis', 'The AI auto-analyzes deals when you open them'],
  },
  {
    id: 4, title: 'Capture Meeting Intelligence', icon: MessageSquare,
    description: 'Paste meeting notes from Teams, Zoom, or plain text. AI extracts action items, stakeholder sentiments, and deal signals.',
    action: { label: 'Try Meeting Notes', href: '/' },
    tips: ['Click "Notes" in the top bar', 'Paste transcript from any source', 'AI auto-updates the deal conversation log'],
  },
  {
    id: 5, title: 'Ask Galent Anything', icon: Search,
    description: 'Use the conversational dashboard to ask natural language questions about your pipeline.',
    action: { label: 'Ask Galent', href: '/ask' },
    tips: ['Try: "What deals are most likely to close this month?"', 'Try: "Who are my top performing reps?"', 'Claude has full context of your pipeline data'],
  },
  {
    id: 6, title: 'Generate Documents', icon: FileText,
    description: 'AI generates SOW (Statement of Work) from deal context. Click "SOW" on any deal detail.',
    action: { label: 'View a Deal', href: '/pipeline' },
    tips: ['Open any deal and click the green "SOW" button', 'The document uses real deal data, stakeholders, and context', 'Copy to clipboard for editing in your document tool'],
  },
  {
    id: 7, title: 'Configure AI Agents', icon: Bot,
    description: 'View and configure the 5 AI agents: Deal Coach, Research, Outreach, Hygiene, Forecast.',
    action: { label: 'Agent Registry', href: '/agents' },
    tips: ['Each agent has editable system prompts', 'Set guardrails: approval requirements, blocked actions', 'Choose AI model per agent (Claude Sonnet, Opus, Haiku)'],
  },
  {
    id: 8, title: 'Discover Integrations', icon: Network,
    description: 'Connect any service — type its name and AI researches and creates the integration definition.',
    action: { label: 'Integrations', href: '/integrations' },
    tips: ['Click "Discover" and type any service name', 'AI generates: API actions, data types, auth method', 'One-click "Add to Platform" saves it'],
  },
];

export default function GuidePage() {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (id: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Welcome to Galent SalesPilot</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your AI-powered sales intelligence platform. Follow these {steps.length} steps to get started.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-2 flex-1 max-w-xs rounded-full bg-card border border-border overflow-hidden">
            <div className="h-full bg-[#7c3aed] rounded-full transition-all" style={{ width: `${(completedSteps.size / steps.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground g-metric">{completedSteps.size}/{steps.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map(step => {
          const isComplete = completedSteps.has(step.id);
          return (
            <div key={step.id} className={`g-surface g-elevated p-5 transition-all ${isComplete ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <button onClick={() => toggleStep(step.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#7c3aed]/10 text-[#7c3aed]'
                  }`}>
                  {isComplete ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">{step.id}</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="h-4 w-4 text-[#7c3aed]" />
                    <h3 className={`text-sm font-semibold ${isComplete ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{step.description}</p>

                  {!isComplete && (
                    <>
                      <div className="space-y-1 mb-3">
                        {step.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <span className="text-[#7c3aed]">•</span> {tip}
                          </div>
                        ))}
                      </div>
                      <Link href={step.action.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors">
                        {step.action.label} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
