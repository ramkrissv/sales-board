'use client';

import { useState, useRef } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import {
  Mic, MessageSquare, Mail, Upload, FileText, Sparkles,
  Loader2, CheckSquare, ArrowRight, Target, Users, Plus,
  Phone, Video, Globe, Clock, AlertTriangle, Zap
} from 'lucide-react';
import Link from 'next/link';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';

type Channel = 'voice' | 'teams_transcript' | 'teams_chat' | 'outlook_email' | 'desktop_notes';

const channels = [
  { id: 'voice' as Channel, label: 'Voice / Audio', icon: Mic, description: 'Upload voice note or recording', color: '#7c3aed' },
  { id: 'teams_transcript' as Channel, label: 'Teams Meeting', icon: Video, description: 'Paste Teams meeting transcript', color: '#3b82f6' },
  { id: 'teams_chat' as Channel, label: 'Teams Chat', icon: MessageSquare, description: 'Paste Teams chat thread', color: '#06b6d4' },
  { id: 'outlook_email' as Channel, label: 'Outlook Email', icon: Mail, description: 'Paste email or thread', color: '#f59e0b' },
  { id: 'desktop_notes' as Channel, label: 'Quick Notes', icon: FileText, description: 'Type or paste notes', color: '#22c55e' },
];

function IntakeContent() {
  const { opportunities } = useOpportunities();
  const utils = trpc.useUtils();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [participants, setParticipants] = useState('');
  const [linkedDealId, setLinkedDealId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [recentIntakes, setRecentIntakes] = useState<any[]>([]);

  const processMutation = trpc.ai.processIntake.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setRecentIntakes(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 10));
      utils.opportunity.list.invalidate();
    },
  });

  const createTaskMutation = trpc.task.create.useMutation({ onSuccess: () => utils.opportunity.list.invalidate() });
  const createStakeholderMutation = trpc.stakeholder.create.useMutation({ onSuccess: () => utils.opportunity.list.invalidate() });

  const handleProcess = () => {
    if (!content.trim() || !selectedChannel) return;
    processMutation.mutate({
      channel: selectedChannel,
      content: content.trim(),
      subject: subject || undefined,
      sender: sender || undefined,
      participants: participants ? participants.split(',').map(p => p.trim()) : undefined,
      existingDealId: linkedDealId || undefined,
    });
  };

  const activityMutation = trpc.activity.create.useMutation();
  const updateOppMutation = trpc.opportunity.update.useMutation({ onSuccess: () => utils.opportunity.list.invalidate() });

  const [actionsDone, setActionsDone] = useState<Set<number>>(new Set());

  const handleAction = (action: any, index?: number) => {
    const dealId = result?.matchedDealId;
    const dealName = result?.matchedDealName || result?.extractedData?.customerName || 'Deal';

    // Mark action as done visually
    if (index !== undefined) setActionsDone(prev => new Set(prev).add(index));

    if (action.type === 'add_task' || action.type === 'create_task') {
      if (dealId) {
        createTaskMutation.mutate({
          opportunityId: dealId,
          name: action.description || action.data?.name || 'Task from intake',
          owner: sender || 'Unassigned',
          dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
          priority: 'High' as const,
        });
      }
      // Log to activity feed
      activityMutation.mutate({
        type: 'task_created', entityType: 'opportunity', entityId: dealId || 'intake',
        entityName: dealName, description: `Task created: ${action.description}`,
      });
    }

    if (action.type === 'add_stakeholder') {
      if (dealId && result?.extractedData?.contactName) {
        createStakeholderMutation.mutate({
          opportunityId: dealId,
          name: result.extractedData.contactName,
          title: result.extractedData.contactTitle || '',
          email: result.extractedData.contactEmail || undefined,
        });
        activityMutation.mutate({
          type: 'stakeholder_added', entityType: 'opportunity', entityId: dealId,
          entityName: dealName, description: `Contact added: ${result.extractedData.contactName}`,
        });
      }
    }

    if (action.type === 'log_notes' || action.type === 'log_activity') {
      // Append to deal's conversation log
      if (dealId) {
        const logText = action.description || result?.summary || '';
        updateOppMutation.mutate({
          id: dealId,
          conversationLog: logText, // The server appends, or we send the full text
        } as any);
      }
      activityMutation.mutate({
        type: 'deal_updated', entityType: 'opportunity', entityId: dealId || 'intake',
        entityName: dealName, description: action.description || 'Notes logged from intake',
      });
    }

    if (action.type === 'update_deal' && dealId) {
      const updates: any = {};
      if (result?.extractedData?.tcv) updates.tcv = result.extractedData.tcv;
      if (result?.extractedData?.status) updates.status = result.extractedData.status;
      if (Object.keys(updates).length > 0) {
        updateOppMutation.mutate({ id: dealId, ...updates } as any);
        activityMutation.mutate({
          type: 'deal_updated', entityType: 'opportunity', entityId: dealId,
          entityName: dealName, description: `Deal updated from intake: ${Object.keys(updates).join(', ')}`,
        });
      }
    }

    if (action.type === 'create_deal') {
      // Would need to open NewDealModal or navigate — for now log activity
      activityMutation.mutate({
        type: 'deal_created', entityType: 'opportunity', entityId: 'intake',
        entityName: result?.extractedData?.customerName || 'New deal',
        description: `New deal suggested from intake: ${result?.extractedData?.opportunityName || action.description}`,
      });
    }
  };

  const reset = () => {
    setSelectedChannel(null);
    setContent('');
    setSubject('');
    setSender('');
    setParticipants('');
    setLinkedDealId('');
    setResult(null);
  };

  const sentimentColors: Record<string, string> = {
    positive: 'text-emerald-400 bg-emerald-500/10',
    neutral: 'text-muted-foreground bg-secondary',
    negative: 'text-red-400 bg-red-500/10',
    urgent: 'text-amber-400 bg-amber-500/10',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-5 w-5 text-[#7c3aed]" /> Pulse
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Capture signals from any channel — AI routes them to deals — AI extracts and routes automatically
        </p>
      </div>

      {!result ? (
        <>
          {/* Channel selector */}
          {!selectedChannel ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {channels.map(ch => (
                <button key={ch.id} onClick={() => setSelectedChannel(ch.id)}
                  className="p-4 rounded-xl g-surface g-elevated hover-lift hover-glow text-center transition-all">
                  <ch.icon className="h-6 w-6 mx-auto mb-2" style={{ color: ch.color }} />
                  <div className="text-xs font-semibold text-foreground">{ch.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{ch.description}</div>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Selected channel header */}
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedChannel(null)} className="text-muted-foreground hover:text-foreground text-sm">&larr; Back</button>
                <div className="flex items-center gap-2">
                  {(() => { const ch = channels.find(c => c.id === selectedChannel)!; return <ch.icon className="h-4 w-4" style={{ color: ch.color }} />; })()}
                  <span className="text-sm font-semibold text-foreground">{channels.find(c => c.id === selectedChannel)?.label}</span>
                </div>
              </div>

              {/* Context fields */}
              <div className="grid grid-cols-2 gap-3">
                {(selectedChannel === 'outlook_email' || selectedChannel === 'teams_chat') && (
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject / Thread title"
                    className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground" />
                )}
                <input value={sender} onChange={e => setSender(e.target.value)} placeholder="From / Speaker"
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground" />
                {selectedChannel !== 'desktop_notes' && (
                  <input value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Participants (comma-separated)"
                    className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground" />
                )}
                <select value={linkedDealId} onChange={e => setLinkedDealId(e.target.value)}
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground">
                  <option value="">Auto-detect deal (or select)</option>
                  {opportunities.filter(o => !['Won','Lost'].includes(o.status)).map(o => (
                    <option key={o.id} value={o.id}>{o.customerName} — {o.opportunityName}</option>
                  ))}
                </select>
              </div>

              {/* Voice recorder (for voice channel) */}
              {selectedChannel === 'voice' && (
                <VoiceRecorder
                  onTranscript={(transcript) => {
                    setContent(transcript);
                  }}
                  isProcessing={processMutation.isPending}
                />
              )}

              {/* Content area */}
              {selectedChannel !== 'voice' && <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder={
                  selectedChannel === 'teams_transcript' ? 'Paste the Teams meeting transcript here...' :
                  selectedChannel === 'teams_chat' ? 'Paste the Teams chat thread here...' :
                  selectedChannel === 'outlook_email' ? 'Paste the email or email thread here...' :
                  'Type your notes, observations, or update...'
                }
                rows={8}
                className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-y font-mono" />}

              <button onClick={handleProcess} disabled={processMutation.isPending || !content.trim()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors disabled:opacity-50 w-full justify-center">
                {processMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> AI is processing your {channels.find(c => c.id === selectedChannel)?.label.toLowerCase()}...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Process with AI</>
                )}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          {/* AI Results */}
          <div className="space-y-4">
            {/* Intent + Confidence */}
            <div className="flex items-center gap-3">
              <span className={`g-chip ${result.confidence >= 80 ? 'bg-emerald-500/10 text-emerald-400' : result.confidence >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                {result.confidence}% confidence
              </span>
              <span className="g-chip bg-[#7c3aed]/10 text-[#7c3aed] capitalize">{(result.intent || '').replace('_', ' ')}</span>
              {result.matchedDealName && (
                <span className="g-chip bg-blue-500/10 text-blue-400 flex items-center gap-1">
                  <Target className="h-3 w-3" /> {result.matchedDealName}
                </span>
              )}
              {result.extractedData?.sentiment && (
                <span className={`g-chip ${sentimentColors[result.extractedData.sentiment] || ''}`}>{result.extractedData.sentiment}</span>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                <span className="text-sm font-semibold text-foreground">AI Summary</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
            </div>

            {/* Extracted Data */}
            <div className="grid grid-cols-2 gap-3">
              {result.extractedData?.customerName && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Customer</div>
                  <div className="text-sm text-foreground">{result.extractedData.customerName}</div>
                </div>
              )}
              {result.extractedData?.contactName && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Contact</div>
                  <div className="text-sm text-foreground">{result.extractedData.contactName} {result.extractedData.contactTitle ? `(${result.extractedData.contactTitle})` : ''}</div>
                </div>
              )}
              {result.extractedData?.tcv && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Value Mentioned</div>
                  <div className="text-sm text-foreground g-metric">${result.extractedData.tcv.toLocaleString()}</div>
                </div>
              )}
              {result.extractedData?.timeline && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Timeline</div>
                  <div className="text-sm text-foreground">{result.extractedData.timeline}</div>
                </div>
              )}
            </div>

            {/* Key Insights */}
            {result.extractedData?.keyInsights?.length > 0 && (
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="g-section-label mb-2">Key Insights</div>
                {result.extractedData.keyInsights.map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-foreground mb-1">
                    <Sparkles className="h-3 w-3 text-[#7c3aed] mt-0.5 flex-shrink-0" /> {insight}
                  </div>
                ))}
              </div>
            )}

            {/* Next Steps */}
            {result.extractedData?.nextSteps?.length > 0 && (
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="g-section-label mb-2">Next Steps</div>
                {result.extractedData.nextSteps.map((step: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs mb-1">
                    <ArrowRight className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-foreground flex-1">{step}</span>
                    {result.matchedDealId && (
                      <button onClick={() => handleAction({ type: 'add_task', description: step })}
                        className="px-2 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] hover:bg-[#7c3aed]/20 flex-shrink-0">
                        + Task
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Suggested Actions */}
            {result.suggestedActions?.length > 0 && (
              <div className="space-y-2">
                <div className="g-section-label">Suggested Actions</div>
                {result.suggestedActions.map((action: any, i: number) => {
                  const isDone = actionsDone.has(i);
                  return (
                    <button key={i} onClick={() => !isDone && handleAction(action, i)}
                      disabled={isDone}
                      className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all ${isDone ? 'bg-emerald-500/5 border border-emerald-500/20 opacity-70' : 'g-surface hover-glow'}`}>
                      {isDone ? <CheckSquare className="h-4 w-4 text-emerald-400 flex-shrink-0" /> : <Zap className="h-4 w-4 text-[#7c3aed] flex-shrink-0" />}
                      <div className="flex-1">
                        <div className={`text-xs font-medium capitalize ${isDone ? 'text-emerald-400 line-through' : 'text-foreground'}`}>{action.type.replace(/_/g, ' ')}</div>
                        <div className="text-[11px] text-muted-foreground">{action.description}</div>
                      </div>
                      {isDone ? <span className="text-[10px] text-emerald-400">Done</span> : <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Auto-logged confirmation */}
            {result.confidence >= 80 && result.matchedDealId && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
                <CheckSquare className="h-3.5 w-3.5" />
                Auto-logged to {result.matchedDealName || 'matched deal'} (confidence {result.confidence}%)
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">
                New Intake
              </button>
              {result.matchedDealId && (
                <Link href={`/deal-room`} className="flex-1 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium text-center hover:bg-[#6d28d9] transition-colors">
                  Open in Deal Room
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {/* Recent Intakes */}
      {recentIntakes.length > 0 && !result && (
        <div>
          <div className="g-section-label mb-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Recent Intakes
          </div>
          <div className="space-y-1.5">
            {recentIntakes.map((intake: any) => (
              <div key={intake.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border text-xs">
                <span className={`g-chip ${intake.confidence >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {intake.channel?.replace('_', ' ')}
                </span>
                <span className="text-foreground truncate flex-1">{intake.summary?.slice(0, 80)}</span>
                {intake.matchedDealName && <span className="text-muted-foreground">&rarr; {intake.matchedDealName}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntakePage() {
  return (
    <OpportunityProvider>
      <IntakeContent />
    </OpportunityProvider>
  );
}
