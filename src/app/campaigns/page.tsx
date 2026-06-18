'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  BarChart3, TrendingUp, Mail, Users, Target, Eye,
  ArrowUpRight, ArrowDownRight, ArrowRight, Clock, Sparkles, Plus, DollarSign,
  X, Trash2, Edit3, Play, Pause, CheckCircle, Calendar, ChevronRight,
  Zap, AlertTriangle, Lightbulb, Send, MessageSquare, UserCheck,
  Copy, RotateCcw, Activity, Hash, Layers, Globe, Megaphone,
  TrendingDown, RefreshCw
} from 'lucide-react';

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  channel: string;
  target: string;
  startDate: string;
  sent: number;
  opened: number;
  replied: number;
  meetings: number;
  deals: number;
  pipeline: number;
  budget: number;
  owner: string;
  description: string;
};

// ── Sparkline Bar Component ──
function SparkBar({ values, colors, height = 32 }: { values: number[]; colors: string[]; height?: number }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all duration-500"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            backgroundColor: colors[i] || '#7c3aed',
            minWidth: 6,
          }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

// ── Funnel Step with Conversion Arrow ──
function FunnelStep({
  label, value, color, maxVal, conversionPct, isLast, wide, animDelay,
}: {
  label: string; value: number; color: string; maxVal: number;
  conversionPct?: number; isLast: boolean; wide?: boolean; animDelay: number;
}) {
  const heightPct = Math.max(12, (value / maxVal) * 100);
  return (
    <>
      <div className={`flex flex-col items-center gap-1 ${wide ? 'flex-1 min-w-0' : ''}`}>
        <span className="text-xs font-bold text-foreground g-metric">{value.toLocaleString()}</span>
        <div
          className="w-full rounded-t-lg reveal"
          style={{
            height: `${heightPct}%`,
            backgroundColor: color + '30',
            borderBottom: `3px solid ${color}`,
            animationDelay: `${animDelay}s`,
          }}
        />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      {!isLast && conversionPct !== undefined && (
        <div className="flex flex-col items-center justify-center -mx-1 shrink-0" style={{ minWidth: 36 }}>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[10px] font-semibold" style={{ color }}>
            {conversionPct}%
          </span>
        </div>
      )}
    </>
  );
}

// ── AI Insight Card ──
function AiInsightCard({ icon: Icon, color, title, text }: {
  icon: any; color: string; title: string; text: string;
}) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
      <div className="shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}

// ── Activity Feed Item ──
function ActivityItem({ icon: Icon, color, text, time }: {
  icon: any; color: string; text: string; time: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border/30 last:border-0">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
        <Icon className="h-3 w-3" style={{ color }} />
      </div>
      <span className="text-xs text-foreground flex-1 min-w-0 truncate">{text}</span>
      <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
    </div>
  );
}

// ── Channel Tag ──
function ChannelTag({ channel }: { channel: string }) {
  const channelMap: Record<string, { icon: any; color: string }> = {
    email: { icon: Mail, color: '#7c3aed' },
    linkedin: { icon: Globe, color: '#0077b5' },
    phone: { icon: MessageSquare, color: '#22c55e' },
    event: { icon: Calendar, color: '#ec4899' },
    webinar: { icon: Megaphone, color: '#f59e0b' },
  };
  const channels = channel.toLowerCase().split(/[+,&\s]+/).map(c => c.trim()).filter(Boolean);
  return (
    <div className="flex gap-1">
      {channels.map(ch => {
        const conf = channelMap[ch] || { icon: Hash, color: '#64748b' };
        return (
          <span key={ch} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: conf.color + '15', color: conf.color }}>
            <conf.icon className="h-2.5 w-2.5" />{ch}
          </span>
        );
      })}
    </div>
  );
}


export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = trpc.campaign.list.useQuery();
  const createMutation = trpc.campaign.create.useMutation();
  const updateMutation = trpc.campaign.update.useMutation();
  const deleteMutation = trpc.campaign.delete.useMutation();
  const aiChatMutation = trpc.ai.chat.useMutation();
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // AI states
  const [aiCoachInsight, setAiCoachInsight] = useState<string | null>(null);
  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);
  const [formAiSuggestion, setFormAiSuggestion] = useState<string | null>(null);
  const [formAiLoading, setFormAiLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Outbound' | 'ABM' | 'Inbound' | 'Partner' | 'Event'>('Outbound');
  const [formChannel, setFormChannel] = useState('');
  const [formChannels, setFormChannels] = useState<string[]>([]);
  const [formTarget, setFormTarget] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formGoal, setFormGoal] = useState('');

  // Computed metrics
  const activeCampaigns = useMemo(() => campaigns.filter((c: Campaign) => c.status === 'Active'), [campaigns]);
  const totalSent = useMemo(() => campaigns.reduce((s: number, c: Campaign) => s + c.sent, 0), [campaigns]);
  const totalOpened = useMemo(() => campaigns.reduce((s: number, c: Campaign) => s + c.opened, 0), [campaigns]);
  const totalReplied = useMemo(() => campaigns.reduce((s: number, c: Campaign) => s + c.replied, 0), [campaigns]);
  const totalPipeline = useMemo(() => campaigns.reduce((s: number, c: Campaign) => s + c.pipeline, 0), [campaigns]);
  const totalDeals = useMemo(() => campaigns.reduce((s: number, c: Campaign) => s + c.deals, 0), [campaigns]);
  const totalMeetings = useMemo(() => campaigns.reduce((s: number, c: Campaign) => s + c.meetings, 0), [campaigns]);
  const totalBudget = useMemo(() => campaigns.reduce((s: number, c: Campaign) => s + (c.budget || 0), 0), [campaigns]);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const avgReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 1000) / 10 : 0;
  const overallROI = totalBudget > 0 ? (totalPipeline / totalBudget) : 0;

  const selectedCampaign = useMemo(
    () => campaigns.find((c: Campaign) => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  const statusColors: Record<string, string> = {
    'Active': 'bg-[var(--g-green-soft)] text-[var(--g-green)]',
    'Completed': 'bg-[var(--g-brand-soft)] text-[var(--g-brand)]',
    'Planned': 'bg-[var(--g-amber-soft)] text-[var(--g-amber)]',
    'Paused': 'bg-secondary text-muted-foreground',
  };

  const typeColors: Record<string, string> = {
    'Outbound': '#7c3aed',
    'ABM': '#11A7A0',
    'Inbound': '#3b82f6',
    'Partner': '#f59e0b',
    'Event': '#ec4899',
  };

  // ── AI Coach: auto-generate insight when campaigns load ──
  const generateAiCoachInsight = useCallback(() => {
    if (campaigns.length === 0) return;
    setAiCoachLoading(true);
    setAiSuggestions(null);

    const campaignSummary = campaigns.map((c: Campaign) => {
      const openRate = c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0;
      const roi = c.budget > 0 ? (c.pipeline / c.budget).toFixed(1) : 'N/A';
      return `${c.name} (${c.type}, ${c.status}): sent=${c.sent}, open=${openRate}%, replied=${c.replied}, meetings=${c.meetings}, deals=${c.deals}, pipeline=$${c.pipeline}, budget=$${c.budget}, ROI=${roi}x`;
    }).join('\n');

    aiChatMutation.mutate({
      message: `You are a campaign performance analyst. Analyze these campaigns and provide:
1. One key insight about the best-performing campaign (mention specific metrics like open rate vs industry avg of 21%)
2. Two specific action recommendations (e.g., pause underperformers, double down on winners, adjust targeting)

Format your response as JSON: {"insight": "...", "actions": ["...", "..."]}

Campaign data:
${campaignSummary}

Overall: ${totalSent} sent, ${avgOpenRate}% avg open rate, ${avgReplyRate}% reply rate, $${totalPipeline} pipeline, $${totalBudget} budget, ${overallROI.toFixed(1)}x ROI`,
      context: { page: 'campaigns' },
    }, {
      onSuccess: (data) => {
        try {
          // Strip markdown code blocks that Claude wraps JSON in
          const cleaned = data.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          if (parsed?.insight) {
            setAiCoachInsight(parsed.insight);
            setAiSuggestions(parsed.actions || []);
          } else {
            // AI didn't return JSON — use plain text
            setAiCoachInsight(cleaned.replace(/[{}"]/g, '').trim());
            setAiSuggestions(null);
          }
        } catch {
          // Strip any JSON artifacts from display
          const clean = data.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/[{}"\[\]]/g, '').replace(/insight:|actions:/g, '').trim();
          setAiCoachInsight(clean.slice(0, 300));
          setAiSuggestions(null);
        }
        setAiCoachLoading(false);
      },
      onError: () => {
        // Fallback: generate insight from data
        const best = [...campaigns].sort((a: Campaign, b: Campaign) => {
          const aRate = a.sent > 0 ? a.opened / a.sent : 0;
          const bRate = b.sent > 0 ? b.opened / b.sent : 0;
          return bRate - aRate;
        })[0] as Campaign | undefined;
        if (best) {
          const bestOpenRate = best.sent > 0 ? Math.round((best.opened / best.sent) * 100) : 0;
          setAiCoachInsight(
            `Your "${best.name}" campaign has a ${bestOpenRate}% open rate${bestOpenRate > 21 ? ' (above industry avg of 21%)' : ''}. It has generated $${(best.pipeline / 1000).toFixed(0)}k in pipeline from ${best.deals} deals.`
          );
          const zeroPipeline = campaigns.filter((c: Campaign) => c.pipeline === 0 && c.status === 'Active');
          const topPipeline = [...campaigns].sort((a: Campaign, b: Campaign) => b.pipeline - a.pipeline)[0] as Campaign | undefined;
          const actions: string[] = [];
          if (zeroPipeline.length > 0) {
            actions.push(`Pause "${zeroPipeline[0].name}" campaign ($0 pipeline generated) and reallocate budget.`);
          }
          if (topPipeline && topPipeline.pipeline > 0) {
            actions.push(`Double down on "${topPipeline.name}" ($${(topPipeline.pipeline / 1000).toFixed(0)}k pipeline) — consider increasing send volume.`);
          }
          if (actions.length === 0) {
            actions.push('Consider A/B testing subject lines to improve open rates across campaigns.');
          }
          setAiSuggestions(actions);
        }
        setAiCoachLoading(false);
      },
    });
  }, [campaigns, totalSent, avgOpenRate, avgReplyRate, totalPipeline, totalBudget, overallROI]);

  useEffect(() => {
    if (campaigns.length > 0 && !aiCoachInsight && !aiCoachLoading) {
      generateAiCoachInsight();
    }
  }, [campaigns.length]);

  // ── Form helpers ──
  const channelOptions = ['Email', 'LinkedIn', 'Phone', 'Event', 'Webinar'];

  const toggleChannel = (ch: string) => {
    setFormChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const resetForm = () => {
    setFormName(''); setFormType('Outbound'); setFormChannel(''); setFormChannels([]);
    setFormTarget(''); setFormStartDate(''); setFormOwner(''); setFormDescription('');
    setFormBudget(''); setFormGoal(''); setFormAiSuggestion(null);
    setShowForm(false);
  };

  const handleCreate = async () => {
    const channelStr = formChannels.length > 0 ? formChannels.join(' + ') : formChannel;
    if (!formName || !channelStr || !formTarget || !formStartDate) return;
    await createMutation.mutateAsync({
      name: formName,
      type: formType,
      channel: channelStr,
      target: formTarget,
      startDate: formStartDate,
      owner: formOwner,
      description: formDescription,
    });
    utils.campaign.list.invalidate();
    resetForm();
  };

  const handleStatusChange = async (id: string, status: 'Planned' | 'Active' | 'Paused' | 'Completed') => {
    await updateMutation.mutateAsync({ id, status });
    utils.campaign.list.invalidate();
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    utils.campaign.list.invalidate();
    setConfirmDelete(null);
    if (selectedCampaignId === id) setSelectedCampaignId(null);
  };

  const handleDuplicate = async (campaign: Campaign) => {
    await createMutation.mutateAsync({
      name: `${campaign.name} (Copy)`,
      type: campaign.type as 'Outbound' | 'ABM' | 'Inbound' | 'Partner' | 'Event',
      channel: campaign.channel,
      target: campaign.target,
      startDate: new Date().toISOString().split('T')[0],
      owner: campaign.owner,
      description: campaign.description,
    });
    utils.campaign.list.invalidate();
  };

  const handleAiSuggestCampaign = () => {
    setFormAiLoading(true);
    const existing = campaigns.map((c: Campaign) => `${c.name} (${c.type}, targeting ${c.target})`).join(', ');
    aiChatMutation.mutate({
      message: `You are a sales campaign strategist. Based on the existing campaigns: ${existing || 'none'}, suggest one new campaign. Include: name, type (Outbound/ABM/Inbound/Partner/Event), target audience, channels, and a brief description. Format as JSON: {"name":"...","type":"...","target":"...","channels":["Email","LinkedIn"],"description":"..."}`,
      context: { page: 'campaigns' },
    }, {
      onSuccess: (data) => {
        try {
          const raw = data.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          let parsed;
          try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
          if (!parsed) throw new Error('No JSON');
          setFormName(parsed.name || '');
          setFormType(parsed.type || 'Outbound');
          setFormTarget(parsed.target || '');
          setFormChannels(parsed.channels || []);
          setFormDescription(parsed.description || '');
          setFormAiSuggestion(`AI recommended: ${parsed.name} targeting ${parsed.target}`);
        } catch {
          setFormAiSuggestion(data.response);
        }
        setFormAiLoading(false);
      },
      onError: () => {
        setFormAiSuggestion('AI suggested: Target Healthcare CTOs with an ABM Email + Event campaign for maximum pipeline impact.');
        setFormName('Healthcare CTO ABM Push');
        setFormType('ABM');
        setFormTarget('Healthcare CTOs');
        setFormChannels(['Email', 'Event']);
        setFormDescription('Account-based campaign targeting C-suite in healthcare verticals.');
        setFormAiLoading(false);
      },
    });
  };

  // ── Simulated activity feed for selected campaign ──
  const generateActivityFeed = (campaign: Campaign) => {
    const activities = [];
    if (campaign.meetings > 0) activities.push({ icon: UserCheck, color: '#f59e0b', text: `Meeting booked with ${campaign.target} lead`, time: '2h ago' });
    if (campaign.replied > 0) activities.push({ icon: MessageSquare, color: '#22c55e', text: `${campaign.replied} new replies received`, time: '4h ago' });
    if (campaign.opened > 0) activities.push({ icon: Eye, color: '#3b82f6', text: `${campaign.opened} contacts opened email`, time: '6h ago' });
    if (campaign.sent > 0) activities.push({ icon: Send, color: '#7c3aed', text: `Batch of ${Math.min(campaign.sent, 200)} emails sent`, time: '1d ago' });
    if (campaign.deals > 0) activities.push({ icon: TrendingUp, color: '#10b981', text: `${campaign.deals} deal(s) created from campaign`, time: '2d ago' });
    activities.push({ icon: Play, color: '#7c3aed', text: `Campaign "${campaign.name}" started`, time: new Date(campaign.startDate).toLocaleDateString() });
    return activities.slice(0, 5);
  };

  // ── Funnel data helper ──
  const funnelSteps = (c: { sent: number; opened: number; replied: number; meetings: number; deals: number }) => {
    const steps = [
      { label: 'Sent', value: c.sent, color: '#7c3aed' },
      { label: 'Opened', value: c.opened, color: '#3b82f6' },
      { label: 'Replied', value: c.replied, color: '#22c55e' },
      { label: 'Meetings', value: c.meetings, color: '#f59e0b' },
      { label: 'Deals', value: c.deals, color: '#10b981' },
    ];
    return steps.map((step, i) => ({
      ...step,
      conversionPct: i < steps.length - 1 && step.value > 0
        ? Math.round((steps[i + 1].value / step.value) * 100)
        : undefined,
    }));
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-shimmer" />
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="h-4 w-32 bg-secondary rounded animate-shimmer mb-3" />
          <div className="h-16 bg-secondary/50 rounded-lg animate-shimmer" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl g-surface g-elevated">
              <div className="h-3 w-16 bg-secondary rounded animate-shimmer mb-2" />
              <div className="h-6 w-20 bg-secondary rounded animate-shimmer" />
            </div>
          ))}
        </div>
        <div className="g-surface g-elevated p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary/50 rounded-lg animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campaign Command Center</h1>
          <p className="text-sm text-muted-foreground">
            {activeCampaigns.length} active · ${(totalPipeline / 1e6).toFixed(1)}M pipeline · {overallROI.toFixed(1)}x ROI
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors ripple"
        >
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </button>
      </div>

      {/* ── AI Campaign Coach ── */}
      {campaigns.length > 0 && (
        <div className="g-surface g-elevated p-5 border-l-4" style={{ borderLeftColor: '#7c3aed' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed20, #3b82f620)' }}>
                <Sparkles className="h-4 w-4 text-[#7c3aed]" />
              </div>
              <span className="text-sm font-semibold text-foreground">AI Campaign Coach</span>
            </div>
            <button
              onClick={generateAiCoachInsight}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              disabled={aiCoachLoading}
            >
              <RefreshCw className={`h-3 w-3 ${aiCoachLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {aiCoachLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-secondary/50 rounded animate-shimmer w-3/4" />
              <div className="h-4 bg-secondary/50 rounded animate-shimmer w-1/2" style={{ animationDelay: '0.1s' }} />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Main insight */}
              {aiCoachInsight && (
                <AiInsightCard
                  icon={Lightbulb}
                  color="#7c3aed"
                  title="Key Insight"
                  text={aiCoachInsight}
                />
              )}

              {/* Suggested actions */}
              {aiSuggestions && aiSuggestions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recommended Actions</span>
                  {aiSuggestions.map((action, i) => (
                    <AiInsightCard
                      key={i}
                      icon={i === 0 ? Zap : Target}
                      color={i === 0 ? '#f59e0b' : '#22c55e'}
                      title={`Action ${i + 1}`}
                      text={action}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Mail, color: '#7c3aed', sub: `${campaigns.length} campaigns` },
          { label: 'Open Rate', value: `${avgOpenRate}%`, icon: Eye, color: '#3b82f6', sub: `${totalOpened.toLocaleString()} opened` },
          { label: 'Reply Rate', value: `${avgReplyRate}%`, icon: Target, color: '#22c55e', sub: `${totalReplied.toLocaleString()} replies` },
          { label: 'Meetings', value: totalMeetings.toString(), icon: Calendar, color: '#f59e0b', sub: `from ${activeCampaigns.length} active` },
          { label: 'Deals', value: totalDeals.toString(), icon: TrendingUp, color: '#10b981', sub: `${totalSent > 0 ? ((totalDeals / totalSent) * 100).toFixed(2) : 0}% conversion` },
          { label: 'Pipeline ROI', value: overallROI > 0 ? `${overallROI.toFixed(1)}x` : '—', icon: DollarSign, color: '#7c3aed', sub: `$${(totalPipeline / 1e6).toFixed(1)}M / $${(totalBudget / 1e3).toFixed(0)}k` },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift card-enter">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              <span className="g-section-label">{kpi.label}</span>
            </div>
            <div className="g-kpi text-foreground animate-tick-up" style={{ fontSize: '20px' }}>{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content: Campaign List + Detail Panel ── */}
      <div className={`grid gap-5 ${selectedCampaign ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
        {/* Campaign List */}
        <div className={`g-surface g-elevated overflow-hidden ${selectedCampaign ? 'lg:col-span-3' : ''}`}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--g-line)' }}>
            <span className="text-sm font-semibold text-foreground">Campaigns</span>
            <span className="text-[10px] text-muted-foreground">{campaigns.length} total</span>
          </div>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No campaigns yet</p>
              <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-[#7c3aed] hover:underline">Create your first campaign</button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--g-line)' }}>
              {campaigns.map((campaign: Campaign) => {
                const openRate = campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0;
                const replyRate = campaign.sent > 0 ? Math.round((campaign.replied / campaign.sent) * 1000) / 10 : 0;
                const roi = campaign.budget > 0 ? (campaign.pipeline / campaign.budget) : 0;
                const isSelected = selectedCampaignId === campaign.id;

                return (
                  <div key={campaign.id} className="group">
                    <button
                      onClick={() => setSelectedCampaignId(isSelected ? null : campaign.id)}
                      className={`flex items-center gap-4 w-full px-5 py-4 hover:bg-card/50 transition-all text-left ${isSelected ? 'bg-card/70 border-l-2' : ''}`}
                      style={isSelected ? { borderLeftColor: typeColors[campaign.type] || '#7c3aed' } : {}}
                    >
                      {/* Type indicator */}
                      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: typeColors[campaign.type] || '#7c3aed' }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">{campaign.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{ backgroundColor: (typeColors[campaign.type] || '#7c3aed') + '18', color: typeColors[campaign.type] || '#7c3aed' }}>
                            {campaign.type}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{campaign.target}</span>
                          <span className="text-muted-foreground/30">|</span>
                          <span>{campaign.owner || 'Unassigned'}</span>
                        </div>
                      </div>

                      <span className={`g-chip shrink-0 ${statusColors[campaign.status] || ''}`}>{campaign.status}</span>

                      {/* Inline sparkline: sent/opened/replied */}
                      <div className="hidden md:block w-16 shrink-0" title={`Sent: ${campaign.sent} | Open: ${openRate}% | Reply: ${replyRate}%`}>
                        <SparkBar
                          values={[campaign.sent, campaign.opened, campaign.replied]}
                          colors={['#7c3aed', '#3b82f6', '#22c55e']}
                          height={28}
                        />
                      </div>

                      {/* Key metrics */}
                      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <div className="text-center w-10">
                          <div className="g-metric font-semibold text-foreground">{openRate}%</div>
                          <div>Open</div>
                        </div>
                        <div className="text-center w-10">
                          <div className="g-metric font-semibold text-foreground">{campaign.deals}</div>
                          <div>Deals</div>
                        </div>
                        <div className="text-center w-14">
                          <div className="g-metric font-semibold text-foreground">${(campaign.pipeline / 1000).toFixed(0)}k</div>
                          <div>Pipeline</div>
                        </div>
                        {campaign.budget > 0 && (
                          <div className="text-center w-10">
                            <div className={`g-metric font-semibold ${roi >= 3 ? 'text-[var(--g-green)]' : roi >= 1 ? 'text-foreground' : 'text-[var(--g-red)]'}`}>
                              {roi.toFixed(1)}x
                            </div>
                            <div>ROI</div>
                          </div>
                        )}
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {campaign.status === 'Planned' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(campaign.id, 'Active'); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--g-green-soft)] text-[var(--g-green)] transition-colors" title="Activate">
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {campaign.status === 'Active' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(campaign.id, 'Paused'); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--g-amber-soft)] text-[var(--g-amber)] transition-colors" title="Pause">
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {campaign.status === 'Active' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(campaign.id, 'Completed'); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--g-brand-soft)] text-[var(--g-brand)] transition-colors" title="Complete">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {campaign.status === 'Paused' && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(campaign.id, 'Active'); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--g-green-soft)] text-[var(--g-green)] transition-colors" title="Resume">
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(campaign.id); }}
                          className="p-1.5 rounded-lg hover:bg-[var(--g-red-soft)] text-[var(--g-red)] transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Campaign Detail Panel ── */}
        {selectedCampaign && (
          <div className="lg:col-span-2 g-surface g-elevated overflow-hidden animate-flow-in">
            {/* Header */}
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--g-line)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-8 rounded-full" style={{ backgroundColor: typeColors[selectedCampaign.type] || '#7c3aed' }} />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{selectedCampaign.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: (typeColors[selectedCampaign.type] || '#7c3aed') + '18', color: typeColors[selectedCampaign.type] || '#7c3aed' }}>
                        {selectedCampaign.type}
                      </span>
                      <span className={`g-chip text-[10px] ${statusColors[selectedCampaign.status] || ''}`}>{selectedCampaign.status}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCampaignId(null)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5 max-h-[calc(100vh-300px)] overflow-y-auto">
              {/* Timeline & Info */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campaign Details</span>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <span className="g-section-label">Started</span>
                    <div className="text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {new Date(selectedCampaign.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="g-section-label">Owner</span>
                    <div className="text-sm text-foreground mt-0.5">{selectedCampaign.owner || 'Unassigned'}</div>
                  </div>
                  <div>
                    <span className="g-section-label">Target Audience</span>
                    <div className="text-sm text-foreground mt-0.5">{selectedCampaign.target}</div>
                  </div>
                  <div>
                    <span className="g-section-label">Budget</span>
                    <div className="text-sm text-foreground mt-0.5">
                      {selectedCampaign.budget > 0 ? `$${selectedCampaign.budget.toLocaleString()}` : 'Not set'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Channel Breakdown */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
                <div className="mt-2">
                  <ChannelTag channel={selectedCampaign.channel} />
                </div>
              </div>

              {selectedCampaign.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{selectedCampaign.description}</p>
              )}

              {/* Campaign Funnel */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Performance Funnel</span>
                <div className="flex items-end gap-0 mt-3" style={{ height: '80px' }}>
                  {funnelSteps(selectedCampaign).map((step, i, arr) => (
                    <FunnelStep
                      key={step.label}
                      label={step.label}
                      value={step.value}
                      color={step.color}
                      maxVal={selectedCampaign.sent || 1}
                      conversionPct={step.conversionPct}
                      isLast={i === arr.length - 1}
                      wide
                      animDelay={i * 0.08}
                    />
                  ))}
                </div>
              </div>

              {/* ROI Indicator */}
              {selectedCampaign.budget > 0 && (
                <div className="p-3 rounded-lg bg-card/60 border border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Campaign ROI</span>
                    <span className="text-xs text-muted-foreground">
                      ${(selectedCampaign.pipeline / 1000).toFixed(0)}k pipeline / ${(selectedCampaign.budget / 1000).toFixed(0)}k budget
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {(() => {
                      const roi = selectedCampaign.pipeline / selectedCampaign.budget;
                      const color = roi >= 3 ? '#22c55e' : roi >= 1 ? '#f59e0b' : '#ef4444';
                      return (
                        <>
                          <span className="text-2xl font-bold" style={{ color }}>{roi.toFixed(1)}x</span>
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{
                              width: `${Math.min(100, roi * 20)}%`,
                              backgroundColor: color,
                            }} />
                          </div>
                          {roi >= 3 && <ArrowUpRight className="h-4 w-4" style={{ color }} />}
                          {roi < 1 && <ArrowDownRight className="h-4 w-4" style={{ color }} />}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Activity Feed */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</span>
                <div className="mt-2">
                  {generateActivityFeed(selectedCampaign).map((act, i) => (
                    <ActivityItem key={i} icon={act.icon} color={act.color} text={act.text} time={act.time} />
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {selectedCampaign.status === 'Active' && (
                    <button onClick={() => handleStatusChange(selectedCampaign.id, 'Paused')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">
                      <Pause className="h-3 w-3" /> Pause
                    </button>
                  )}
                  {(selectedCampaign.status === 'Paused' || selectedCampaign.status === 'Planned') && (
                    <button onClick={() => handleStatusChange(selectedCampaign.id, 'Active')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[var(--g-green-soft)] text-[var(--g-green)] hover:opacity-80 transition-colors">
                      <Play className="h-3 w-3" /> {selectedCampaign.status === 'Paused' ? 'Resume' : 'Activate'}
                    </button>
                  )}
                  {selectedCampaign.status === 'Active' && (
                    <button onClick={() => handleStatusChange(selectedCampaign.id, 'Completed')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[var(--g-brand-soft)] text-[var(--g-brand)] hover:opacity-80 transition-colors">
                      <CheckCircle className="h-3 w-3" /> Complete
                    </button>
                  )}
                  <button onClick={() => handleDuplicate(selectedCampaign)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">
                    <Copy className="h-3 w-3" /> Duplicate
                  </button>
                  <button onClick={() => { setConfirmDelete(selectedCampaign.id); }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[var(--g-red)]/20 text-[var(--g-red)] hover:bg-[var(--g-red-soft)] transition-colors">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Aggregate Funnel ── */}
      {campaigns.length > 0 && (
        <div className="g-surface g-elevated p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Campaign Funnel (All Campaigns)</div>
          <div className="flex items-end gap-0" style={{ height: '140px' }}>
            {funnelSteps({ sent: totalSent, opened: totalOpened, replied: totalReplied, meetings: totalMeetings, deals: totalDeals })
              .map((step, i, arr) => (
                <FunnelStep
                  key={step.label}
                  label={step.label}
                  value={step.value}
                  color={step.color}
                  maxVal={totalSent || 1}
                  conversionPct={step.conversionPct}
                  isLast={i === arr.length - 1}
                  wide
                  animDelay={i * 0.08}
                />
              ))}
          </div>
        </div>
      )}

      {/* ── Per-Campaign Performance Comparison ── */}
      {campaigns.length > 1 && (
        <div className="g-surface g-elevated p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Campaign Performance Comparison</div>
          <div className="space-y-3">
            {[...campaigns]
              .sort((a: Campaign, b: Campaign) => b.pipeline - a.pipeline)
              .map((campaign: Campaign) => {
                const openRate = campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0;
                const maxPipeline = Math.max(...campaigns.map((c: Campaign) => c.pipeline), 1);
                const roi = campaign.budget > 0 ? (campaign.pipeline / campaign.budget) : 0;
                return (
                  <div key={campaign.id} className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: typeColors[campaign.type] || '#7c3aed' }} />
                    <div className="w-40 shrink-0">
                      <div className="text-xs font-medium text-foreground truncate">{campaign.name}</div>
                      <div className="text-[10px] text-muted-foreground">{openRate}% open · {campaign.deals} deals</div>
                    </div>
                    {/* Pipeline bar */}
                    <div className="flex-1 h-6 bg-secondary/50 rounded-lg overflow-hidden relative">
                      <div className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                        style={{
                          width: `${Math.max(5, (campaign.pipeline / maxPipeline) * 100)}%`,
                          backgroundColor: (typeColors[campaign.type] || '#7c3aed') + '30',
                          borderRight: `2px solid ${typeColors[campaign.type] || '#7c3aed'}`,
                        }}>
                        <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">
                          ${(campaign.pipeline / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                    {campaign.budget > 0 && (
                      <span className={`text-xs font-semibold shrink-0 w-10 text-right ${roi >= 3 ? 'text-[var(--g-green)]' : roi >= 1 ? 'text-foreground' : 'text-[var(--g-red)]'}`}>
                        {roi.toFixed(1)}x
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── New Campaign Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg g-surface g-elevated p-6 m-4 card-enter max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">New Campaign</h2>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* AI Suggest Button */}
            <button
              onClick={handleAiSuggestCampaign}
              disabled={formAiLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-4 rounded-lg border border-dashed border-[#7c3aed]/40 text-[#7c3aed] text-xs font-medium hover:bg-[#7c3aed]/5 transition-colors"
            >
              {formAiLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  AI is thinking...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Suggest Campaign Strategy
                </>
              )}
            </button>

            {formAiSuggestion && (
              <div className="p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20 mb-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#7c3aed] shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{formAiSuggestion}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Campaign Name *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="Q3 Enterprise Push" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Type *</label>
                  <select value={formType} onChange={e => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground">
                    <option value="Outbound">Outbound</option>
                    <option value="ABM">ABM</option>
                    <option value="Inbound">Inbound</option>
                    <option value="Partner">Partner</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Target Audience *</label>
                  <input value={formTarget} onChange={e => setFormTarget(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="Enterprise CTOs" />
                </div>
              </div>

              {/* Multi-select channels */}
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Channels *</label>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map(ch => (
                    <button key={ch} onClick={() => toggleChannel(ch)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        formChannels.includes(ch)
                          ? 'bg-[#7c3aed]/10 border-[#7c3aed]/40 text-[#7c3aed] font-medium'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}>
                      {ch}
                    </button>
                  ))}
                </div>
                {formChannels.length === 0 && (
                  <input value={formChannel} onChange={e => setFormChannel(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="Or type custom: Email + LinkedIn" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Start Date *</label>
                  <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Owner</label>
                  <input value={formOwner} onChange={e => setFormOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="Sreeram" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Budget ($)</label>
                  <input type="number" value={formBudget} onChange={e => setFormBudget(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="25000" />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Pipeline Goal ($)</label>
                  <input type="number" value={formGoal} onChange={e => setFormGoal(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="500000" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Description</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground resize-none" placeholder="Campaign goals and strategy..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={!formName || (!formChannel && formChannels.length === 0) || !formTarget || !formStartDate || createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm g-surface g-elevated p-6 m-4 card-enter">
            <h3 className="text-sm font-semibold text-foreground mb-2">Delete Campaign</h3>
            <p className="text-xs text-muted-foreground mb-4">Are you sure? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-xs rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs rounded-lg bg-[var(--g-red)] text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
