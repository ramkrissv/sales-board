'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Mic, Upload, Loader2, Sparkles, Users, AlertTriangle,
  CheckCircle, Clock, TrendingUp, Quote, ChevronDown, ChevronUp,
  Video, MessageSquare, FileText, Calendar,
} from 'lucide-react';

interface MeetingIntelligenceProps {
  opportunityId: string;
  customerName: string;
}

interface MeetingRecord {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  actionItems: { task: string; owner: string; dueDate: string; priority: string }[];
  stakeholderInsights: { name: string; title: string; sentiment: string; keyQuote: string; isDecisionMaker: boolean }[];
  dealSignals: {
    buyingIntent: string;
    budgetMentioned: boolean;
    timelineMentioned: boolean;
    competitorsMentioned: string[];
    objections: string[];
    nextSteps: string[];
  };
}

const SOURCE_OPTIONS = [
  { value: 'teams', label: 'Teams', icon: Video },
  { value: 'zoom', label: 'Zoom', icon: Video },
  { value: 'google_meet', label: 'Google Meet', icon: Video },
  { value: 'notes', label: 'Notes', icon: FileText },
  { value: 'email', label: 'Email', icon: MessageSquare },
] as const;

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    positive: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    neutral: { color: 'text-slate-400', bg: 'bg-slate-500/10' },
    negative: { color: 'text-red-400', bg: 'bg-red-500/10' },
    cautious: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  };
  const c = config[sentiment] || config.neutral;
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.color} font-medium`}>{sentiment}</span>;
}

function IntentBadge({ intent }: { intent: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    strong: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Strong Intent' },
    moderate: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Moderate Intent' },
    weak: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Weak Intent' },
    unclear: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Unclear' },
  };
  const c = config[intent] || config.unclear;
  return (
    <span className={`text-[10px] px-2 py-1 rounded-lg ${c.bg} ${c.color} font-semibold flex items-center gap-1`}>
      <TrendingUp className="h-3 w-3" /> {c.label}
    </span>
  );
}

export default function MeetingIntelligence({ opportunityId, customerName }: MeetingIntelligenceProps) {
  const [showInput, setShowInput] = useState(false);
  const [source, setSource] = useState<string>('teams');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);

  const processMutation = trpc.ai.processTranscript.useMutation({
    onSuccess: (data: any) => {
      const record: MeetingRecord = {
        id: `meeting-${Date.now()}`,
        title: title || `${source} meeting`,
        source,
        date: new Date().toISOString(),
        summary: data.summary || '',
        actionItems: data.actionItems || [],
        stakeholderInsights: data.stakeholderInsights || [],
        dealSignals: data.dealSignals || { buyingIntent: 'unclear', budgetMentioned: false, timelineMentioned: false, competitorsMentioned: [], objections: [], nextSteps: [] },
      };
      setMeetings(prev => [record, ...prev]);
      setShowInput(false);
      setTitle('');
      setContent('');
    },
  });

  const handleProcess = () => {
    if (!content.trim()) return;
    processMutation.mutate({
      opportunityId,
      source: source as any,
      title: title || `${customerName} meeting`,
      content: content.trim(),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center">
            <Mic className="h-3.5 w-3.5 text-[#7c3aed]" />
          </div>
          <span className="text-xs font-semibold text-foreground">Meeting Intelligence</span>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] transition-colors"
        >
          <Upload className="h-3 w-3" />
          Process Meeting
        </button>
      </div>

      {/* Input form */}
      {showInput && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3 animate-flow-in">
          <div className="flex gap-2">
            {SOURCE_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setSource(s.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  source === s.value
                    ? 'bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/30'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}>
                <s.icon className="h-3 w-3" />
                {s.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Meeting title (optional)"
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste transcript, notes, or key discussion points..."
            rows={5}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              AI will extract: action items, stakeholder insights, deal signals, sentiment
            </span>
            <div className="flex gap-2">
              <button onClick={() => setShowInput(false)} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={handleProcess}
                disabled={!content.trim() || processMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
              >
                {processMutation.isPending ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="h-3 w-3" /> Analyze</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting records */}
      {meetings.length > 0 ? (
        <div className="space-y-3">
          {meetings.map(meeting => {
            const isExpanded = expandedMeeting === meeting.id;
            return (
              <div key={meeting.id} className="rounded-xl bg-card border border-border overflow-hidden transition-all">
                {/* Meeting header */}
                <button
                  onClick={() => setExpandedMeeting(isExpanded ? null : meeting.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center shrink-0">
                    <Video className="h-4 w-4 text-[#7c3aed]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{meeting.title}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{meeting.source}</span>
                      <span>·</span>
                      <span>{new Date(meeting.date).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{meeting.actionItems.length} actions</span>
                    </div>
                  </div>
                  <IntentBadge intent={meeting.dealSignals.buyingIntent} />
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'var(--g-line)' }}>
                    {/* Summary */}
                    <div className="pt-3">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</div>
                      <p className="text-xs text-foreground leading-relaxed">{meeting.summary}</p>
                    </div>

                    {/* Deal signals grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className={`p-2 rounded-lg text-center ${meeting.dealSignals.budgetMentioned ? 'bg-emerald-500/10' : 'bg-secondary/30'}`}>
                        <div className="text-[9px] text-muted-foreground uppercase">Budget</div>
                        <div className={`text-[10px] font-semibold ${meeting.dealSignals.budgetMentioned ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {meeting.dealSignals.budgetMentioned ? 'Mentioned' : 'Not mentioned'}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg text-center ${meeting.dealSignals.timelineMentioned ? 'bg-emerald-500/10' : 'bg-secondary/30'}`}>
                        <div className="text-[9px] text-muted-foreground uppercase">Timeline</div>
                        <div className={`text-[10px] font-semibold ${meeting.dealSignals.timelineMentioned ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {meeting.dealSignals.timelineMentioned ? 'Mentioned' : 'Not mentioned'}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg text-center ${meeting.dealSignals.competitorsMentioned.length > 0 ? 'bg-amber-500/10' : 'bg-secondary/30'}`}>
                        <div className="text-[9px] text-muted-foreground uppercase">Competitors</div>
                        <div className={`text-[10px] font-semibold ${meeting.dealSignals.competitorsMentioned.length > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                          {meeting.dealSignals.competitorsMentioned.length > 0 ? meeting.dealSignals.competitorsMentioned.join(', ') : 'None'}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg text-center ${meeting.dealSignals.objections.length > 0 ? 'bg-red-500/10' : 'bg-secondary/30'}`}>
                        <div className="text-[9px] text-muted-foreground uppercase">Objections</div>
                        <div className={`text-[10px] font-semibold ${meeting.dealSignals.objections.length > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {meeting.dealSignals.objections.length || 'None'}
                        </div>
                      </div>
                    </div>

                    {/* Action items */}
                    {meeting.actionItems.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CheckCircle className="h-3 w-3 text-emerald-400" /> Action Items
                        </div>
                        <div className="space-y-1.5">
                          {meeting.actionItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                item.priority === 'High' ? 'bg-red-400' : item.priority === 'Medium' ? 'bg-amber-400' : 'bg-blue-400'
                              }`} />
                              <span className="flex-1 text-foreground">{item.task}</span>
                              <span className="text-muted-foreground">{item.owner}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> {item.dueDate}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stakeholder insights */}
                    {meeting.stakeholderInsights.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-blue-400" /> Stakeholder Insights
                        </div>
                        <div className="space-y-2">
                          {meeting.stakeholderInsights.map((sh, i) => (
                            <div key={i} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-medium text-foreground">{sh.name}</span>
                                {sh.title && <span className="text-[10px] text-muted-foreground">({sh.title})</span>}
                                <SentimentBadge sentiment={sh.sentiment} />
                                {sh.isDecisionMaker && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] font-medium">DM</span>
                                )}
                              </div>
                              {sh.keyQuote && (
                                <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground italic">
                                  <Quote className="h-3 w-3 shrink-0 mt-0.5 text-[#7c3aed]" />
                                  {sh.keyQuote}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next steps from meeting */}
                    {meeting.dealSignals.nextSteps.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3 text-[#7c3aed]" /> Agreed Next Steps
                        </div>
                        <div className="space-y-1">
                          {meeting.dealSignals.nextSteps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                              <span className="w-4 h-4 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed]">{i + 1}</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !showInput ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center mx-auto mb-3">
            <Mic className="h-6 w-6 text-[#7c3aed] opacity-50" />
          </div>
          <p className="text-xs text-muted-foreground mb-2">No meeting intelligence yet</p>
          <p className="text-[10px] text-muted-foreground">Process a meeting transcript to extract action items, stakeholder insights, and deal signals</p>
        </div>
      ) : null}
    </div>
  );
}
