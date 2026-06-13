'use client';

import { useState } from 'react';
import { Search, FileText, Shield, MessageSquare, Brain, Loader2, Sparkles, Mail, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

interface DealPilotActionsProps {
  opportunityId: string;
  dealStage: string;
  customerName: string;
  onResult?: (result: any) => void;
}

interface PilotAction {
  id: string;
  label: string;
  icon: any;
  agentId: string;
  goal: string;
  color: string;
}

function getActionsForStage(stage: string, customerName: string): PilotAction[] {
  const common: PilotAction[] = [
    {
      id: 'next-steps',
      label: 'Next Steps',
      icon: Brain,
      agentId: 'deal-coach',
      goal: `Analyze this deal and suggest the top 3 specific next steps the rep should take. Be actionable — include who to contact, what to say, and by when.`,
      color: '#7c3aed',
    },
  ];

  const stageActions: Record<string, PilotAction[]> = {
    'Discovery': [
      { id: 'research', label: 'Research Account', icon: Search, agentId: 'account-intelligence', goal: `Research ${customerName}. Find company size, industry position, tech stack, recent news, and key decision makers. Identify expansion signals.`, color: '#ec4899' },
      { id: 'find-dm', label: 'Find Decision Maker', icon: TrendingUp, agentId: 'deal-coach', goal: `Analyze the stakeholders for this deal. Identify who the decision maker likely is based on titles and roles. If no DM exists, suggest who to map.`, color: '#3b82f6' },
    ],
    'Qualification': [
      { id: 'research', label: 'Research Account', icon: Search, agentId: 'account-intelligence', goal: `Research ${customerName}. Find company size, industry position, tech stack, recent news, and key decision makers.`, color: '#ec4899' },
      { id: 'competitive', label: 'Competitive Intel', icon: Shield, agentId: 'competitive-intel', goal: `Scan this deal for competitor mentions. Build a battle card with our differentiators vs likely competitors for ${customerName}.`, color: '#ef4444' },
    ],
    'Proposal': [
      { id: 'proposal', label: 'Draft Proposal', icon: FileText, agentId: 'proposal-drafter', goal: `Generate a proposal outline for this deal with ${customerName}. Include executive summary, scope, deliverables, timeline, and pricing structure.`, color: '#10b981' },
      { id: 'competitive', label: 'Competitive Intel', icon: Shield, agentId: 'competitive-intel', goal: `Scan this deal for competitor mentions. Build a battle card with differentiators for ${customerName}.`, color: '#ef4444' },
    ],
    'Negotiation': [
      { id: 'coach', label: 'Coach Me', icon: MessageSquare, agentId: 'enablement-agent', goal: `This deal with ${customerName} is in Negotiation. Provide coaching: objection handling tips, pricing negotiation tactics, and how to drive to close.`, color: '#f97316' },
      { id: 'followup', label: 'Draft Follow-up', icon: Mail, agentId: 'outreach-agent', goal: `Draft a follow-up email for the negotiation with ${customerName}. Reference the deal context, address likely concerns, and propose next steps.`, color: '#22c55e' },
    ],
  };

  return [...(stageActions[stage] || stageActions['Qualification'] || []), ...common];
}

export default function DealPilotActions({ opportunityId, dealStage, customerName, onResult }: DealPilotActionsProps) {
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const runAgentMutation = trpc.harness.runAgent.useMutation({
    onSuccess: (data) => {
      setRunningAction(null);
      onResult?.(data);
    },
    onError: () => setRunningAction(null),
  });

  const actions = getActionsForStage(dealStage, customerName);

  const handleAction = (action: PilotAction) => {
    setRunningAction(action.id);
    runAgentMutation.mutate({
      agentId: action.agentId,
      goal: action.goal,
      opportunityId,
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 mr-1">
        <Sparkles className="h-3 w-3 text-[#7c3aed]" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pilot</span>
      </div>
      {actions.map(action => {
        const isRunning = runningAction === action.id;
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={!!runningAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border border-border hover:border-[#7c3aed]/30 disabled:opacity-50"
            style={{ backgroundColor: `${action.color}08` }}
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: action.color }} />
            ) : (
              <Icon className="h-3 w-3" style={{ color: action.color }} />
            )}
            <span className="text-foreground">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
