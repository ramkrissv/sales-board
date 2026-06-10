'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { X, Sparkles, Loader2, CheckSquare, AlertTriangle, ArrowRight, MessageSquare } from 'lucide-react';

interface MeetingNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId?: string;
  opportunityName?: string;
}

export function MeetingNotesModal({ isOpen, onClose, opportunityId, opportunityName }: MeetingNotesModalProps) {
  const utils = trpc.useUtils();
  const [source, setSource] = useState<'teams' | 'zoom' | 'google_meet' | 'notes' | 'email'>('notes');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState('');
  const [result, setResult] = useState<any>(null);

  const processMutation = trpc.ai.processTranscript.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.opportunity.list.invalidate();
    },
  });

  if (!isOpen) return null;

  const handleProcess = () => {
    if (!content.trim() || !title.trim()) return;
    processMutation.mutate({
      opportunityId,
      source,
      title: title.trim(),
      content: content.trim(),
      date,
      participants: participants.split(',').map(p => p.trim()).filter(Boolean),
    });
  };

  const sentimentColors: Record<string, string> = {
    positive: 'text-emerald-400 bg-emerald-500/10',
    neutral: 'text-zinc-400 bg-zinc-500/10',
    negative: 'text-red-400 bg-red-500/10',
    cautious: 'text-amber-400 bg-amber-500/10',
  };

  const intentColors: Record<string, string> = {
    strong: 'text-emerald-400',
    moderate: 'text-amber-400',
    weak: 'text-orange-400',
    unclear: 'text-zinc-400',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-6 pb-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col g-surface rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-[#7c3aed]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Meeting Intelligence</h2>
              {opportunityName && <p className="text-xs text-muted-foreground">{opportunityName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!result ? (
            <>
              {/* Input Form */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Source</label>
                  <select value={source} onChange={e => setSource(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground">
                    <option value="notes">Meeting Notes</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="email">Email Thread</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Meeting Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Q3 Strategy Call with CTO"
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground" />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Participants (comma-separated)</label>
                <input value={participants} onChange={e => setParticipants(e.target.value)} placeholder="e.g., Sarah Chen, Michael Chang, Sreeram"
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground" />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Transcript / Notes</label>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Paste meeting transcript, notes, or email thread here..."
                  rows={10}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-y font-mono" />
                <p className="text-[10px] text-muted-foreground mt-1">AI will extract action items, stakeholder insights, deal signals, and next steps.</p>
              </div>

              <button onClick={handleProcess} disabled={processMutation.isPending || !content.trim() || !title.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors disabled:opacity-50 w-full justify-center">
                {processMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing with AI...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Extract Intelligence</>
                )}
              </button>
            </>
          ) : (
            <>
              {/* AI Results */}
              <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                  <span className="text-sm font-medium text-foreground">AI Summary</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
              </div>

              {/* Deal Signals */}
              {result.dealSignals && (
                <div className="g-surface p-4 space-y-3">
                  <div className="g-section-label">Deal Signals</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Buying Intent</span>
                      <span className={`g-chip ${intentColors[result.dealSignals.buyingIntent] || ''}`}>{result.dealSignals.buyingIntent}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Budget</span>
                      <span className={`g-chip ${result.dealSignals.budgetMentioned ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 bg-zinc-500/10'}`}>
                        {result.dealSignals.budgetMentioned ? 'Mentioned' : 'Not discussed'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Timeline</span>
                      <span className={`g-chip ${result.dealSignals.timelineMentioned ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-400 bg-zinc-500/10'}`}>
                        {result.dealSignals.timelineMentioned ? 'Mentioned' : 'Not discussed'}
                      </span>
                    </div>
                  </div>
                  {result.dealSignals.competitorsMentioned?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Competitors: </span>
                      {result.dealSignals.competitorsMentioned.map((c: string) => (
                        <span key={c} className="g-chip bg-red-500/10 text-red-400 mr-1">{c}</span>
                      ))}
                    </div>
                  )}
                  {result.dealSignals.objections?.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Objections:</span>
                      {result.dealSignals.objections.map((o: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-orange-400">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {o}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Items */}
              {result.actionItems?.length > 0 && (
                <div className="g-surface p-4 space-y-2">
                  <div className="g-section-label">Action Items ({result.actionItems.length})</div>
                  {result.actionItems.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-card border border-border">
                      <CheckSquare className="h-3.5 w-3.5 text-[#7c3aed] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-foreground">{item.task}</div>
                        <div className="text-[10px] text-muted-foreground">{item.owner} &middot; {item.dueDate}</div>
                      </div>
                      <span className={`g-chip ${item.priority === 'High' ? 'text-orange-400 bg-orange-500/10' : item.priority === 'Medium' ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-400 bg-zinc-500/10'}`}>
                        {item.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stakeholder Insights */}
              {result.stakeholderInsights?.length > 0 && (
                <div className="g-surface p-4 space-y-2">
                  <div className="g-section-label">Stakeholder Insights ({result.stakeholderInsights.length})</div>
                  {result.stakeholderInsights.map((person: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-card border border-border">
                      <div className="w-8 h-8 rounded-full bg-[#7c3aed]/15 flex items-center justify-center text-[#7c3aed] text-[10px] font-bold flex-shrink-0">
                        {person.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{person.name}</span>
                          {person.isDecisionMaker && <span className="g-chip bg-amber-500/10 text-amber-400">DM</span>}
                          <span className={`g-chip ${sentimentColors[person.sentiment] || ''}`}>{person.sentiment}</span>
                        </div>
                        {person.title && <div className="text-[10px] text-muted-foreground">{person.title}</div>}
                        {person.keyQuote && <div className="text-[10px] text-muted-foreground italic mt-1">&ldquo;{person.keyQuote}&rdquo;</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Next Steps */}
              {result.dealSignals?.nextSteps?.length > 0 && (
                <div className="g-surface p-4 space-y-2">
                  <div className="g-section-label">Next Steps</div>
                  {result.dealSignals.nextSteps.map((step: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <ArrowRight className="h-3 w-3 text-[#7c3aed] flex-shrink-0" /> {step}
                    </div>
                  ))}
                </div>
              )}

              {/* Status */}
              {opportunityId && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Conversation log updated for this project. Action items and insights extracted.
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setResult(null); setContent(''); setTitle(''); }}
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs hover:text-foreground transition-colors">
                  Process Another
                </button>
                <button onClick={onClose}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium">
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
