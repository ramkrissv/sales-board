'use client';

import { useState } from 'react';
import {
  CheckCircle2, XCircle, Loader2, Mail, MessageSquare,
  ArrowRight, Zap, AlertTriangle, Target, Users,
  FileText, GitBranch, Sparkles
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

const sourceConfig: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  'teams-chat': { icon: MessageSquare, label: 'Teams Chat', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  'teams-channel': { icon: MessageSquare, label: 'Teams Channel', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  'outlook': { icon: Mail, label: 'Outlook', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

const urgencyStyles: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-500',
};

interface SignalCardsProps {
  onAccept?: (notif: any, result: any) => void;
  onOpenDeal?: (dealId: string) => void;
}

export default function SignalCards({ onAccept, onOpenDeal }: SignalCardsProps) {
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.notification.list.useQuery(undefined, { refetchInterval: 15000 });
  const [processing, setProcessing] = useState<string | null>(null);
  const [acceptedSignals, setAcceptedSignals] = useState<Set<string>>(new Set());
  const [processView, setProcessView] = useState<{ notifId: string; steps: ProcessStep[] } | null>(null);

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });
  const createOpp = trpc.opportunity.create.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); },
  });

  // Filter to only unread signal notifications
  const signals = (notifications as any[]).filter(
    (n: any) => !n.read &&
      (['ai_signal', 'teams_signal', 'outlook_signal'].includes(n.type) ||
       n.metadata?.status === 'pending_acceptance')
  );

  if (signals.length === 0) return null;

  const handleAccept = async (notif: any) => {
    setProcessing(notif._id);

    // Start GenUI process view
    const steps: ProcessStep[] = [
      { id: 'signal', label: 'Signal Captured', status: 'complete', detail: notif.metadata?.summary || notif.message },
    ];

    if (notif.metadata?.matchedDealId) {
      steps.push({ id: 'match', label: 'Deal Matched', status: 'complete', detail: `→ ${notif.metadata.matchedDealName}` });
      steps.push({ id: 'accept', label: 'Accepting Signal', status: 'running' });
      setProcessView({ notifId: notif._id, steps });

      // Mark as read
      markRead.mutate({ id: notif._id });
      await new Promise(r => setTimeout(r, 600));

      steps[2].status = 'complete';
      steps[2].detail = 'Signal linked to deal';

      // Add graph + task steps
      if (notif.metadata?.actionItems?.length) {
        steps.push({ id: 'tasks', label: `${notif.metadata.actionItems.length} Tasks Created`, status: 'complete', detail: notif.metadata.actionItems.slice(0, 2).join(', ') });
      }
      steps.push({ id: 'graph', label: 'Knowledge Graph Updated', status: 'complete', detail: 'Contact & signal nodes synced' });
      setProcessView({ notifId: notif._id, steps });
    } else {
      // No matched deal — create opportunity
      steps.push({ id: 'match', label: 'No Deal Match', status: 'complete', detail: 'Creating new opportunity...' });
      steps.push({ id: 'create', label: 'Creating Opportunity', status: 'running' });
      setProcessView({ notifId: notif._id, steps });

      const meta = notif.metadata || {};
      try {
        await createOpp.mutateAsync({
          customerName: meta.customerName || notif.title?.replace(/^.*:\s*/, '') || 'New Lead',
          opportunityName: `Signal: ${meta.customerName || 'New Lead'} — ${meta.intent || 'Inbound'}`,
          status: 'Discovery',
          tcv: 0,
          expectedCloseDate: new Date(Date.now() + 90 * 86400000).toISOString(),
          startDate: new Date().toISOString(),
          primaryOwner: meta.senderName || 'Unassigned',
          industry: '',
          region: 'North America',
          source: meta.source || 'Signal',
          dealDuration: '12 months',
        } as any);
        steps[2].status = 'complete';
        steps[2].detail = 'Opportunity created in Discovery stage';
      } catch {
        steps[2].status = 'error';
        steps[2].detail = 'Failed to create — try manually';
      }

      markRead.mutate({ id: notif._id });
      steps.push({ id: 'graph', label: 'Knowledge Graph Updated', status: 'complete', detail: 'Contact, company & signal nodes synced' });
      setProcessView({ notifId: notif._id, steps });
    }

    setAcceptedSignals(prev => new Set([...prev, notif._id]));
    setProcessing(null);

    // Auto-close process view after 5s
    setTimeout(() => {
      setProcessView(prev => prev?.notifId === notif._id ? null : prev);
    }, 5000);
  };

  const handleDismiss = (notif: any) => {
    markRead.mutate({ id: notif._id });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
        </div>
        <span className="text-sm font-semibold text-foreground">Incoming Signals</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">{signals.length}</span>
      </div>

      {/* Process View — GenUI after Accept */}
      {processView && (
        <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 space-y-3 animate-flow-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
            <span className="text-xs font-semibold text-[#7c3aed] uppercase tracking-wider">Processing Signal</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
          </div>
          <div className="space-y-2">
            {processView.steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {step.status === 'complete' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {step.status === 'running' && <Loader2 className="h-4 w-4 text-[#7c3aed] animate-spin" />}
                  {step.status === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
                  {step.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-border" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">{step.label}</div>
                  {step.detail && <div className="text-[10px] text-muted-foreground truncate">{step.detail}</div>}
                </div>
              </div>
            ))}
          </div>
          {/* Action buttons after processing */}
          {processView.steps.every(s => s.status !== 'running') && (
            <div className="flex gap-2 pt-1">
              {processView.steps.find(s => s.id === 'match')?.detail?.includes('→') && (
                <button
                  onClick={() => {
                    const matchedId = signals.find(s => s._id === processView.notifId)?.metadata?.matchedDealId;
                    if (matchedId) onOpenDeal?.(matchedId);
                    setProcessView(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors"
                >
                  <Target className="h-3 w-3" /> Open Deal
                </button>
              )}
              <button onClick={() => setProcessView(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Signal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {signals.slice(0, 4).map((notif: any) => {
          const meta = notif.metadata || {};
          const src = sourceConfig[meta.source] || { icon: Zap, label: meta.source || 'Signal', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
          const Icon = src.icon;
          const isAccepted = acceptedSignals.has(notif._id);
          const isProcessing = processing === notif._id;

          return (
            <div key={notif._id}
              className={`p-4 rounded-xl g-surface border border-border ${urgencyStyles[meta.urgency] || 'border-l-zinc-500'} border-l-[3px] transition-all hover:border-border/80 ${isAccepted ? 'opacity-60' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`shrink-0 p-1.5 rounded-lg border ${src.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{notif.title}</div>
                    <div className="text-[10px] text-muted-foreground">{src.label}</div>
                  </div>
                </div>
                {meta.urgency === 'high' && (
                  <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">Urgent</span>
                )}
              </div>

              {/* Summary */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{meta.summary || notif.message}</p>

              {/* Metadata badges */}
              <div className="flex gap-1 flex-wrap mb-3">
                {meta.intent && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{meta.intent?.replace('_', ' ')}</span>
                )}
                {meta.sentiment && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    meta.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                    meta.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-500/10 text-muted-foreground'
                  }`}>{meta.sentiment}</span>
                )}
                {meta.matchedDealName && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">→ {meta.matchedDealName}</span>
                )}
              </div>

              {/* Action buttons */}
              {!isAccepted ? (
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(notif)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    {meta.matchedDealId ? 'Accept' : 'Accept & Create Opp'}
                  </button>
                  <button onClick={() => handleDismiss(notif)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    <XCircle className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Accepted
                </div>
              )}
            </div>
          );
        })}
      </div>

      {signals.length > 4 && (
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground">+{signals.length - 4} more signals in notifications</span>
        </div>
      )}
    </div>
  );
}

interface ProcessStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  detail?: string;
}
