'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  BookOpen, ChevronRight, ChevronDown, CheckCircle, Circle,
  Play, Sparkles, Loader2, Target, Users, FileText, Mail,
  Shield, Brain, Calendar, DollarSign, TrendingUp, Phone,
  Zap, BarChart3,
} from 'lucide-react';

interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  tips: string[];
  completed: boolean;
}

interface Playbook {
  id: string;
  name: string;
  stage: string;
  description: string;
  steps: PlaybookStep[];
  industry?: string;
}

const PLAYBOOKS: Playbook[] = [
  {
    id: 'discovery',
    name: 'Discovery Playbook',
    stage: 'Discovery',
    description: 'First engagement — research, qualify, and identify decision makers',
    steps: [
      { id: 'd1', title: 'Account Research', description: 'Use AI to research company, industry position, tech stack, and recent news', icon: Brain, tips: ['Run Account Intelligence agent', 'Check LinkedIn for key contacts', 'Review annual reports if public'], completed: false },
      { id: 'd2', title: 'Identify Stakeholders', description: 'Map key decision makers, influencers, and champions', icon: Users, tips: ['Find at least 1 DM and 1 champion', 'Get org chart from LinkedIn', 'Tag roles in stakeholder tab'], completed: false },
      { id: 'd3', title: 'Qualify Opportunity', description: 'Validate BANT: Budget, Authority, Need, Timeline', icon: Target, tips: ['Ask directly about budget range', 'Confirm decision-making process', 'Understand their timeline/urgency'], completed: false },
      { id: 'd4', title: 'Schedule Discovery Call', description: 'Book a meeting to understand requirements and pain points', icon: Calendar, tips: ['Send personalized invite', 'Prepare discovery questions', 'Research competitor landscape first'], completed: false },
      { id: 'd5', title: 'Document & Advance', description: 'Log findings and move to Qualification if criteria met', icon: FileText, tips: ['Update conversation log', 'Set TCV estimate', 'Create follow-up tasks'], completed: false },
    ],
  },
  {
    id: 'qualification',
    name: 'Qualification Playbook',
    stage: 'Qualification',
    description: 'Deepen engagement — technical validation and competitive positioning',
    steps: [
      { id: 'q1', title: 'Technical Discovery', description: 'Understand current state, pain points, and technical requirements', icon: Brain, tips: ['Map existing tech stack', 'Identify integration points', 'Document non-functional requirements'], completed: false },
      { id: 'q2', title: 'Competitive Intelligence', description: 'Run competitive analysis to understand alternatives being evaluated', icon: Shield, tips: ['Run Competitive Intel agent', 'Prepare battle cards', 'Identify our differentiators'], completed: false },
      { id: 'q3', title: 'Solution Design', description: 'Outline approach, team composition, and high-level architecture', icon: FileText, tips: ['Draft technical approach doc', 'Size the team', 'Identify key risks early'], completed: false },
      { id: 'q4', title: 'Business Case', description: 'Build ROI model and value proposition tailored to their context', icon: DollarSign, tips: ['Quantify cost savings', 'Show time-to-value', 'Include case studies from same industry'], completed: false },
      { id: 'q5', title: 'Champion Alignment', description: 'Ensure internal champion is aligned and can navigate procurement', icon: Users, tips: ['Coach your champion on internal pitch', 'Provide executive summary docs', 'Align on next steps together'], completed: false },
    ],
  },
  {
    id: 'proposal',
    name: 'Proposal Playbook',
    stage: 'Proposal',
    description: 'Formalize the offer — proposal, pricing, and solutioning',
    steps: [
      { id: 'p1', title: 'Draft Proposal', description: 'Create comprehensive proposal with scope, deliverables, timeline', icon: FileText, tips: ['Use AI Proposal Drafter', 'Include executive summary', 'Be specific on deliverables'], completed: false },
      { id: 'p2', title: 'Pricing Strategy', description: 'Build pricing model with appropriate margins and billing structure', icon: DollarSign, tips: ['Consider geo-mix for rate optimization', 'Target 30%+ margin', 'Offer flexible billing models'], completed: false },
      { id: 'p3', title: 'Solution Architecture', description: 'Detail the technical approach, tools, and team structure', icon: Brain, tips: ['Include team org chart', 'Show phased delivery plan', 'Address technical risks'], completed: false },
      { id: 'p4', title: 'Internal Review', description: 'Get proposal reviewed by solution lead and pricing approved', icon: Shield, tips: ['Run through pricing approval workflow', 'Get technical sign-off', 'Review T&C with legal'], completed: false },
      { id: 'p5', title: 'Present & Iterate', description: 'Present proposal, gather feedback, and refine', icon: Mail, tips: ['Schedule formal presentation', 'Prepare for objections', 'Have follow-up email ready'], completed: false },
    ],
  },
  {
    id: 'negotiation',
    name: 'Negotiation Playbook',
    stage: 'Negotiation',
    description: 'Close the deal — negotiate terms, handle objections, get signed',
    steps: [
      { id: 'n1', title: 'Objection Handling', description: 'Address remaining concerns and blockers systematically', icon: Shield, tips: ['Use Enablement Agent for coaching', 'Prepare FAQ doc', 'Address procurement concerns proactively'], completed: false },
      { id: 'n2', title: 'Final Pricing', description: 'Finalize pricing, discounts, and payment terms', icon: DollarSign, tips: ['Know your walk-away price', 'Bundle value, don\'t just discount', 'Get CFO approval for discounts >10%'], completed: false },
      { id: 'n3', title: 'Contract Preparation', description: 'Draft SOW, MSA, and other legal documents', icon: FileText, tips: ['Generate SOW with AI', 'Create contract in Contracts tab', 'Pre-negotiate standard T&C'], completed: false },
      { id: 'n4', title: 'Executive Alignment', description: 'Ensure executive sponsors on both sides are aligned', icon: Users, tips: ['Schedule exec-to-exec call if needed', 'Confirm decision timeline', 'Remove any remaining blockers'], completed: false },
      { id: 'n5', title: 'Close & Transition', description: 'Get signed contract and plan delivery kickoff', icon: TrendingUp, tips: ['Send final closing email', 'Plan transition to delivery team', 'Schedule kickoff within 1 week'], completed: false },
    ],
  },
];

export default function SalesPlaybook() {
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeCoaching, setActiveCoaching] = useState<string | null>(null);
  const [coachingResult, setCoachingResult] = useState<string | null>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const getCoaching = (step: PlaybookStep, playbook: Playbook) => {
    setActiveCoaching(step.id);
    setCoachingResult(null);
    chatMutation.mutate(
      {
        message: `I need specific coaching for this sales playbook step:

Playbook: ${playbook.name} (${playbook.stage} stage)
Step: ${step.title}
Description: ${step.description}

Give me:
1. A clear checklist of 5 specific actions to complete this step
2. Common mistakes to avoid
3. One killer tip that top performers use

Be concise — max 150 words total. No markdown formatting.`,
        context: { page: 'playbook-coaching' },
      },
      {
        onSuccess: (data) => setCoachingResult(data.response),
        onError: () => setCoachingResult('Unable to get coaching — check AI configuration.'),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/15 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-[#7c3aed]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Sales Playbooks</div>
          <div className="text-[10px] text-muted-foreground">Stage-by-stage guided plays with AI coaching</div>
        </div>
      </div>

      {/* Playbook cards */}
      <div className="space-y-3">
        {PLAYBOOKS.map(playbook => {
          const isExpanded = expandedPlaybook === playbook.id;
          const stepsCompleted = playbook.steps.filter(s => completedSteps.has(s.id)).length;
          const progress = Math.round((stepsCompleted / playbook.steps.length) * 100);
          const stageColors: Record<string, string> = {
            Discovery: '#3b82f6', Qualification: '#f59e0b', Proposal: '#7c3aed', Negotiation: '#22c55e',
          };
          const color = stageColors[playbook.stage] || '#7c3aed';

          return (
            <div key={playbook.id} className="rounded-xl bg-card border border-border overflow-hidden transition-all">
              {/* Playbook header */}
              <button
                onClick={() => setExpandedPlaybook(isExpanded ? null : playbook.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <BookOpen className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{playbook.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{playbook.description}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Progress ring */}
                  <div className="relative w-10 h-10">
                    <svg width="40" height="40" className="transform -rotate-90">
                      <circle cx="20" cy="20" r="16" stroke="var(--g-line)" strokeWidth="3" fill="none" />
                      <circle cx="20" cy="20" r="16" stroke={color} strokeWidth="3" fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 16}
                        strokeDashoffset={2 * Math.PI * 16 * (1 - progress / 100)}
                        className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                      {stepsCompleted}/{playbook.steps.length}
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded steps */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--g-line)' }}>
                  {playbook.steps.map((step, i) => {
                    const isCompleted = completedSteps.has(step.id);
                    const isCoaching = activeCoaching === step.id;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="pt-2">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button onClick={() => toggleStep(step.id)} className="mt-0.5 shrink-0">
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-emerald-400" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {step.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{step.description}</div>

                            {/* Tips */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {step.tips.map((tip, j) => (
                                <span key={j} className="text-[9px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">
                                  {tip}
                                </span>
                              ))}
                            </div>

                            {/* AI coaching result */}
                            {isCoaching && coachingResult && (
                              <div className="mt-2 p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20 text-xs text-foreground leading-relaxed animate-flow-in">
                                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#7c3aed] mb-1.5">
                                  <Sparkles className="h-3 w-3" /> AI Coaching
                                </div>
                                {coachingResult}
                              </div>
                            )}
                          </div>

                          {/* Coach button */}
                          <button
                            onClick={() => getCoaching(step, playbook)}
                            disabled={chatMutation.isPending}
                            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-[#7c3aed] hover:bg-[#7c3aed]/5 transition-colors"
                            title="Get AI coaching for this step"
                          >
                            {chatMutation.isPending && activeCoaching === step.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7c3aed]" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
