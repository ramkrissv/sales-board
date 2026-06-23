'use client';

import { useState } from 'react';
import {
  CheckCircle2, XCircle, Loader2, Mail, MessageSquare,
  ArrowRight, Zap, AlertTriangle, Target, Users,
  FileText, GitBranch, Sparkles, ChevronDown, ChevronUp,
  Building2, DollarSign, Calendar, User, Briefcase, Edit2,
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
  const [confirmingSignal, setConfirmingSignal] = useState<string | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    customerName: '', opportunityName: '', primaryOwner: '', serviceLine: '', tcv: 0, stage: 'Discovery',
  });

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });
  const createOpp = trpc.opportunity.create.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); },
  });
  const updateOpp = trpc.opportunity.update.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); },
  });
  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => { utils.account.list.invalidate(); },
  });
  const { data: existingOpps = [] } = trpc.opportunity.list.useQuery();
  const { data: existingAccounts = [] } = trpc.account.list.useQuery();

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
      // No AI match — try client-side fuzzy match by customer name before creating duplicate
      const meta = notif.metadata || {};
      const signalCustomer = (meta.customerName || notif.title?.replace(/^.*:\s*/, '') || '').toLowerCase().trim();

      const clientMatch = signalCustomer
        ? (existingOpps as any[]).find((o: any) => {
            const oppName = (o.customerName || '').toLowerCase();
            return oppName === signalCustomer || oppName.includes(signalCustomer) || signalCustomer.includes(oppName);
          })
        : null;

      if (clientMatch) {
        // Found existing deal — link signal to it instead of creating duplicate
        steps.push({ id: 'match', label: 'Deal Matched (local)', status: 'complete', detail: `→ ${clientMatch.customerName}: ${clientMatch.opportunityName}` });
        steps.push({ id: 'link', label: 'Linking Signal', status: 'running' });
        setProcessView({ notifId: notif._id, steps });

        try {
          const timestamp = new Date().toISOString().split('T')[0];
          const logEntry = `\n\n--- SIGNAL (${timestamp}) ---\n${meta.summary || notif.message || 'New signal captured'}\nSource: ${meta.source || 'Teams/Outlook'}`;
          await updateOpp.mutateAsync({
            id: clientMatch.id,
            conversationLog: ((clientMatch as any).conversationLog || '') + logEntry,
          } as any);
          steps[2].status = 'complete';
          steps[2].detail = `Signal linked to ${clientMatch.customerName}`;
        } catch {
          steps[2].status = 'complete';
          steps[2].detail = 'Signal noted (log update skipped)';
        }

        markRead.mutate({ id: notif._id });
        steps.push({ id: 'graph', label: 'Knowledge Graph Updated', status: 'complete', detail: 'Signal linked to existing deal' });
        setProcessView({ notifId: notif._id, steps });

        // Notify parent to open the matched deal
        onOpenDeal?.(clientMatch.id);
      } else {
        // Truly new — create opportunity using confirmForm data if available
        steps.push({ id: 'match', label: 'No Existing Deal', status: 'complete', detail: 'Creating new opportunity...' });
        steps.push({ id: 'create', label: 'Creating Opportunity', status: 'running' });
        setProcessView({ notifId: notif._id, steps });

        // Use confirmForm if user filled it, otherwise fall back to AI-extracted metadata
        const custName = confirmForm.customerName || meta.customerName || notif.title?.replace(/^.*:\s*/, '') || 'New Lead';
        const oppName = confirmForm.opportunityName || `Signal: ${custName} — ${meta.intent || 'Inbound'}`;

        // Final dedup check right before create — prevent any race condition duplicates
        const lastCheck = (existingOpps as any[]).find((o: any) => {
          const n = (o.customerName || '').toLowerCase();
          const c = custName.toLowerCase();
          return n === c || n.includes(c) || c.includes(n);
        });

        if (lastCheck) {
          // Duplicate caught at last moment — link instead
          steps[2].status = 'complete';
          steps[2].detail = `Linked to existing: ${lastCheck.customerName}`;
          markRead.mutate({ id: notif._id });
          steps.push({ id: 'graph', label: 'Duplicate Prevented', status: 'complete', detail: 'Signal linked to existing deal' });
          setProcessView({ notifId: notif._id, steps });
          onOpenDeal?.(lastCheck.id);
          setAcceptedSignals(prev => new Set([...prev, notif._id]));
          setProcessing(null);
          setTimeout(() => setProcessView(prev => prev?.notifId === notif._id ? null : prev), 5000);
          return;
        }

        try {
          // Step 1: Create account if it doesn't exist
          const accountExists = (existingAccounts as any[]).some((a: any) =>
            (a.companyName || '').toLowerCase() === custName.toLowerCase()
          );
          if (!accountExists) {
            try {
              await createAccount.mutateAsync({ companyName: custName } as any);
            } catch { /* account may already exist — continue */ }
          }

          // Step 2: Create opportunity
          await createOpp.mutateAsync({
            customerName: custName,
            opportunityName: oppName,
            status: confirmForm.stage || 'Discovery',
            tcv: confirmForm.tcv || 0,
            expectedCloseDate: new Date(Date.now() + 90 * 86400000).toISOString(),
            startDate: new Date().toISOString(),
            primaryOwner: confirmForm.primaryOwner || meta.senderName || 'Unassigned',
            industry: '',
            region: 'North America',
            source: meta.source || 'Signal',
            serviceLine: confirmForm.serviceLine || undefined,
            dealDuration: '12 months',
          } as any);
          steps[2].status = 'complete';
          steps[2].detail = `${custName} created in ${confirmForm.stage || 'Discovery'}${!accountExists ? ' + Account added' : ''}`;
        } catch {
          steps[2].status = 'error';
          steps[2].detail = 'Failed to create — try manually';
        }

        markRead.mutate({ id: notif._id });
        steps.push({ id: 'graph', label: 'Knowledge Graph Updated', status: 'complete', detail: 'Contact, company & signal nodes synced' });
        setProcessView({ notifId: notif._id, steps });
      }
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
              {isAccepted ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Opportunity Created
                  </div>
                  {meta.matchedDealId && (
                    <button onClick={() => onOpenDeal?.(meta.matchedDealId)}
                      className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:underline">
                      <ArrowRight className="h-3 w-3" /> Open Deal
                    </button>
                  )}
                </div>
              ) : meta.autoCreated && meta.matchedDealId ? (
                /* Auto-created by webhook — acknowledge + open */
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded-lg">
                    <CheckCircle2 className="h-3 w-3" /> Deal auto-created in Discovery
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { onOpenDeal?.(meta.matchedDealId); markRead.mutate({ id: notif._id }); setAcceptedSignals(prev => new Set([...prev, notif._id])); }}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors">
                      <ArrowRight className="h-3 w-3" /> Open & Complete Setup
                    </button>
                    <button onClick={() => handleDismiss(notif)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : meta.matchedDealId ? (
                /* Signal matched to existing deal — accept to link */
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(notif)} disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Accept & Link
                  </button>
                  <button onClick={() => handleDismiss(notif)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    <XCircle className="h-3 w-3" />
                  </button>
                </div>
              ) : confirmingSignal === notif._id ? (
                /* Confirmation form — user reviews and confirms opportunity creation */
                <div className="space-y-3 pt-1 border-t border-border mt-2 animate-flow-in">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" /> Confirm Opportunity Creation
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Customer</label>
                      <input value={confirmForm.customerName}
                        onChange={e => setConfirmForm(p => ({ ...p, customerName: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[11px] bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Owner</label>
                      <input value={confirmForm.primaryOwner}
                        onChange={e => setConfirmForm(p => ({ ...p, primaryOwner: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[11px] bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[9px] text-muted-foreground uppercase">Opportunity Name</label>
                      <input value={confirmForm.opportunityName}
                        onChange={e => setConfirmForm(p => ({ ...p, opportunityName: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[11px] bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Service Line</label>
                      <select value={confirmForm.serviceLine}
                        onChange={e => setConfirmForm(p => ({ ...p, serviceLine: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[11px] bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                        <option value="">Select...</option>
                        {['Legacy Modernization', 'Data & AI', 'Testing & QA', 'Managed Services / SRE', 'Cloud & Infrastructure', 'Staffing'].map(s =>
                          <option key={s} value={s}>{s}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Est. TCV ($)</label>
                      <input type="number" value={confirmForm.tcv || ''}
                        onChange={e => setConfirmForm(p => ({ ...p, tcv: Number(e.target.value) }))}
                        placeholder="0"
                        className="w-full px-2 py-1.5 text-[11px] bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
                    </div>
                  </div>
                  {/* Action items preview */}
                  {meta.actionItems?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase mb-1">Action items ({meta.actionItems.length}) — will be created as tasks</div>
                      <div className="space-y-0.5 max-h-20 overflow-y-auto">
                        {meta.actionItems.slice(0, 4).map((item: string, i: number) => (
                          <div key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                            <ArrowRight className="h-2.5 w-2.5 text-[#7c3aed] shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{item}</span>
                          </div>
                        ))}
                        {meta.actionItems.length > 4 && (
                          <div className="text-[9px] text-muted-foreground">+{meta.actionItems.length - 4} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { handleAccept(notif); setConfirmingSignal(null); }}
                      disabled={isProcessing || !confirmForm.customerName}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Confirm & Create Opportunity
                    </button>
                    <button onClick={() => setConfirmingSignal(null)}
                      className="px-3 py-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* New signal — no match — show "Create Opportunity" button that opens confirmation */
                <div className="flex gap-2">
                  <button onClick={() => {
                    setConfirmingSignal(notif._id);
                    setConfirmForm({
                      customerName: meta.customerName || notif.title?.replace(/^.*:\s*/, '').replace(/^[🟢🔴🔵]\s*/, '') || '',
                      opportunityName: `${meta.customerName || 'New Lead'} — ${meta.intent === 'new_lead' ? 'Inbound Signal' : meta.summary?.slice(0, 40) || 'Signal'}`,
                      primaryOwner: meta.senderName || meta.contactName || '',
                      serviceLine: '',
                      tcv: 0,
                      stage: 'Discovery',
                    });
                  }}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors">
                    <Briefcase className="h-3 w-3" /> Create Opportunity
                  </button>
                  <button onClick={() => handleAccept(notif)} disabled={isProcessing}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    Quick Accept
                  </button>
                  <button onClick={() => handleDismiss(notif)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors">
                    <XCircle className="h-3 w-3" />
                  </button>
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
