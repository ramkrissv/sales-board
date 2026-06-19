'use client';

import { useState } from 'react';
import {
  Brain, Search, Mail, Shield, BarChart3, FileText, TrendingUp,
  MessageSquare, Zap, Eye, Loader2, CheckCircle2, XCircle, SkipForward,
  ChevronRight, Play, Sparkles, GitBranch, ArrowDown
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import AgentResultView from './AgentResultView';

const AGENT_META: Record<string, { label: string; color: string; icon: any }> = {
  'deal-coach': { label: 'Deal Coach', color: '#7c3aed', icon: Brain },
  'research-agent': { label: 'Research', color: '#3b82f6', icon: Search },
  'outreach-agent': { label: 'Outreach', color: '#22c55e', icon: Mail },
  'hygiene-agent': { label: 'Hygiene', color: '#f59e0b', icon: Shield },
  'forecast-agent': { label: 'Forecast', color: '#06b6d4', icon: BarChart3 },
  'intake-processor': { label: 'Intake', color: '#8b5cf6', icon: Zap },
  'proposal-drafter': { label: 'Proposal', color: '#10b981', icon: FileText },
  'account-intelligence': { label: 'Intel', color: '#ec4899', icon: Eye },
  'competitive-intel': { label: 'Competitive', color: '#ef4444', icon: Shield },
  'growth-agent': { label: 'Growth', color: '#14b8a6', icon: TrendingUp },
  'enablement-agent': { label: 'Coach', color: '#f97316', icon: MessageSquare },
  'signal-processor': { label: 'Signals', color: '#6366f1', icon: Zap },
  'campaign-agent': { label: 'Campaign', color: '#e11d48', icon: Mail },
};

// Stage → recommended workflow mapping
const STAGE_WORKFLOWS: Record<string, string[]> = {
  'Discovery': ['new-lead-enrichment', 'deal-deep-dive'],
  'Qualification': ['deal-deep-dive', 'new-lead-enrichment'],
  'Proposal': ['proposal-accelerator', 'deal-deep-dive'],
  'Negotiation': ['deal-rescue', 'proposal-accelerator'],
  'Won': ['growth-play'],
  'Lost': ['deal-rescue'],
  'On Hold': ['deal-rescue', 'pipeline-health'],
};

interface WorkflowRunnerProps {
  opportunityId?: string;
  customerName?: string;
  dealStage?: string;
  onDealClick?: (dealId: string) => void;
}

export default function WorkflowRunner({ opportunityId, customerName, dealStage, onDealClick }: WorkflowRunnerProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const { data: allWorkflows = [] } = trpc.harness.getWorkflows.useQuery();
  const runWorkflowMutation = trpc.harness.runWorkflow.useMutation();

  // Filter and sort workflows by stage relevance
  const recommended = STAGE_WORKFLOWS[dealStage || ''] || [];
  const workflows = [...allWorkflows].sort((a: any, b: any) => {
    const aIdx = recommended.indexOf(a.id);
    const bIdx = recommended.indexOf(b.id);
    if (aIdx >= 0 && bIdx < 0) return -1;
    if (bIdx >= 0 && aIdx < 0) return 1;
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    return 0;
  });
  const [activeRun, setActiveRun] = useState<any>(null);

  const [runError, setRunError] = useState<string | null>(null);

  const handleRunWorkflow = (workflowId: string) => {
    setActiveRun(null);
    setExpandedStep(null);
    setRunError(null);
    runWorkflowMutation.mutate(
      { workflowId, opportunityId, customerName },
      {
        onSuccess: (data) => setActiveRun(data),
        onError: (err) => setRunError(err.message || 'Workflow failed — try again'),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Workflow Selector */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-3.5 w-3.5 text-[#7c3aed]" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Agent Workflows</span>
      </div>

      {!activeRun && !runWorkflowMutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {workflows.map((wf: any) => {
            const isRecommended = recommended.includes(wf.id);
            return (
            <button key={wf.id}
              onClick={() => handleRunWorkflow(wf.id)}
              className={`p-3 rounded-xl border transition-all text-left group ${
                isRecommended ? 'border-[#7c3aed]/30 bg-[#7c3aed]/5 hover:border-[#7c3aed]/50' : 'border-border bg-card hover:border-[#7c3aed]/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
                <span className="text-xs font-semibold text-foreground group-hover:text-[#7c3aed]">{wf.name}</span>
                {isRecommended && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/15 text-[#7c3aed] font-medium">Suggested</span>}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{wf.description}</p>
              <div className="flex items-center gap-1 mt-2">
                {wf.steps.map((s: any, i: number) => {
                  const meta = AGENT_META[s.agentId] || { label: s.agentId, color: '#7c3aed', icon: Brain };
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="flex items-center gap-0.5">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${meta.color}15` }}>
                        <Icon className="h-2.5 w-2.5" style={{ color: meta.color }} />
                      </div>
                      {i < wf.steps.length - 1 && <ChevronRight className="h-2 w-2 text-muted-foreground/40" />}
                    </div>
                  );
                })}
                <span className="text-[9px] text-muted-foreground ml-1">{wf.stepCount} agents</span>
              </div>
            </button>
          );
          })}
        </div>
      )}

      {/* Running State */}
      {runWorkflowMutation.isPending && !activeRun && (
        <div className="p-4 rounded-xl border border-[#7c3aed]/20 bg-[#7c3aed]/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/15 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-[#7c3aed] animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#7c3aed] animate-ping" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Workflow running...</div>
              <div className="text-xs text-muted-foreground">Agents executing — this may take 15-30 seconds</div>
            </div>
            <button onClick={() => runWorkflowMutation.reset()}
              className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Error State */}
      {runError && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
          <span className="text-xs text-red-400">{runError}</span>
          <button onClick={() => setRunError(null)} className="text-[10px] text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}

      {/* Workflow Result — Visual Pipeline */}
      {activeRun && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#7c3aed]" />
              <span className="text-sm font-semibold text-foreground">{activeRun.workflowName}</span>
              <span className="g-chip bg-emerald-500/10 text-emerald-400 text-[10px]">
                {activeRun.steps.filter((s: any) => s.status === 'completed').length}/{activeRun.steps.length} completed
              </span>
            </div>
            <button onClick={() => { setActiveRun(null); setExpandedStep(null); }}
              className="text-[10px] text-muted-foreground hover:text-foreground">New workflow</button>
          </div>

          {activeRun.steps.map((step: any, i: number) => {
            const meta = AGENT_META[step.agentId] || { label: step.agentId, color: '#7c3aed', icon: Brain };
            const Icon = meta.icon;
            const isExpanded = expandedStep === i;
            const StatusIcon = step.status === 'completed' ? CheckCircle2 :
                               step.status === 'failed' ? XCircle :
                               step.status === 'skipped' ? SkipForward :
                               step.status === 'running' ? Loader2 : Play;
            const statusColor = step.status === 'completed' ? 'text-emerald-400' :
                                step.status === 'failed' ? 'text-red-400' :
                                step.status === 'skipped' ? 'text-zinc-400' :
                                'text-[#7c3aed]';

            return (
              <div key={i}>
                {/* Step */}
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : i)}
                  disabled={!step.result}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isExpanded ? 'border-[#7c3aed]/30 bg-[#7c3aed]/5' :
                    step.status === 'completed' ? 'border-border bg-card hover:border-[#7c3aed]/20' :
                    step.status === 'skipped' ? 'border-border bg-card/50 opacity-50' :
                    'border-border bg-card'
                  }`}
                >
                  {/* Agent icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                    <Icon className="h-4 w-4" style={{ color: meta.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{meta.label}</div>
                    {step.result?.finalAnswer && (
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {step.result.finalAnswer.split('\n')[0]?.slice(0, 80)}...
                      </div>
                    )}
                    {step.status === 'skipped' && (
                      <div className="text-[10px] text-muted-foreground">Skipped (condition not met)</div>
                    )}
                  </div>

                  {/* Status + stats */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {step.result && (
                      <span className="text-[9px] text-muted-foreground">{step.result.toolCalls?.length || 0} tools</span>
                    )}
                    <StatusIcon className={`h-4 w-4 ${statusColor} ${step.status === 'running' ? 'animate-spin' : ''}`} />
                  </div>
                </button>

                {/* Expanded result */}
                {isExpanded && step.result && (
                  <div className="ml-4 mt-2 mb-2 p-3 rounded-lg border border-border bg-card">
                    <AgentResultView
                      result={step.result}
                      compact
                      onDealClick={onDealClick}
                    />
                  </div>
                )}

                {/* Connector arrow */}
                {i < activeRun.steps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-3 w-3 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
