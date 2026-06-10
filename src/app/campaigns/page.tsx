'use client';

import { useState } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import {
  BarChart3, TrendingUp, Mail, Users, Target, Eye,
  ArrowUpRight, Clock, Sparkles, Plus, DollarSign
} from 'lucide-react';

// Campaign data (in-memory for now — will be DB-backed later)
const CAMPAIGNS = [
  { id: 'c1', name: 'Q3 AI Platform Push', type: 'Outbound', status: 'Active', channel: 'Email + LinkedIn', startDate: '2026-05-01', target: 'Enterprise CTO/CIO', sent: 342, opened: 218, replied: 34, meetings: 12, deals: 4, pipeline: 1800000 },
  { id: 'c2', name: 'Healthcare Modernization', type: 'ABM', status: 'Active', channel: 'Multi-channel', startDate: '2026-04-15', target: 'Healthcare IT Leaders', sent: 156, opened: 98, replied: 22, meetings: 8, deals: 3, pipeline: 950000 },
  { id: 'c3', name: 'Cloud Migration Webinar Follow-up', type: 'Inbound', status: 'Completed', channel: 'Email', startDate: '2026-03-10', target: 'Webinar Attendees', sent: 89, opened: 67, replied: 18, meetings: 6, deals: 2, pipeline: 420000 },
  { id: 'c4', name: 'Financial Services Expansion', type: 'ABM', status: 'Active', channel: 'Email + Events', startDate: '2026-05-20', target: 'FS Decision Makers', sent: 210, opened: 142, replied: 28, meetings: 10, deals: 5, pipeline: 2100000 },
  { id: 'c5', name: 'Partner Channel Activation', type: 'Partner', status: 'Planned', channel: 'Partner referral', startDate: '2026-06-15', target: 'Partner network', sent: 0, opened: 0, replied: 0, meetings: 0, deals: 0, pipeline: 0 },
];

function CampaignContent() {
  const { opportunities } = useOpportunities();
  const [selectedCampaign, setSelectedCampaign] = useState<typeof CAMPAIGNS[0] | null>(null);

  const activeCampaigns = CAMPAIGNS.filter(c => c.status === 'Active');
  const totalSent = CAMPAIGNS.reduce((s, c) => s + c.sent, 0);
  const totalOpened = CAMPAIGNS.reduce((s, c) => s + c.opened, 0);
  const totalReplied = CAMPAIGNS.reduce((s, c) => s + c.replied, 0);
  const totalPipeline = CAMPAIGNS.reduce((s, c) => s + c.pipeline, 0);
  const totalDeals = CAMPAIGNS.reduce((s, c) => s + c.deals, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const avgReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 1000) / 10 : 0;

  const statusColors: Record<string, string> = {
    'Active': 'bg-emerald-500/10 text-emerald-400',
    'Completed': 'bg-blue-500/10 text-blue-400',
    'Planned': 'bg-amber-500/10 text-amber-400',
    'Paused': 'bg-zinc-500/10 text-zinc-400',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campaign Analytics</h1>
          <p className="text-sm text-muted-foreground">{activeCampaigns.length} active campaigns · ${(totalPipeline/1e6).toFixed(1)}M pipeline generated</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors">
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Mail, color: '#7c3aed' },
          { label: 'Open Rate', value: `${avgOpenRate}%`, icon: Eye, color: '#3b82f6' },
          { label: 'Reply Rate', value: `${avgReplyRate}%`, icon: Target, color: '#22c55e' },
          { label: 'Deals Created', value: totalDeals.toString(), icon: TrendingUp, color: '#f59e0b' },
          { label: 'Pipeline', value: `$${(totalPipeline/1e6).toFixed(1)}M`, icon: DollarSign, color: '#10b981' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              <span className="g-section-label">{kpi.label}</span>
            </div>
            <div className="g-kpi text-foreground" style={{ fontSize: '20px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Campaign List */}
      <div className="g-surface g-elevated overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <span className="text-sm font-semibold text-foreground">Campaigns</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--g-line)' }}>
          {CAMPAIGNS.map(campaign => {
            const openRate = campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0;
            const replyRate = campaign.sent > 0 ? Math.round((campaign.replied / campaign.sent) * 1000) / 10 : 0;
            return (
              <button key={campaign.id} onClick={() => setSelectedCampaign(selectedCampaign?.id === campaign.id ? null : campaign)}
                className="flex items-center gap-4 w-full px-5 py-4 hover:bg-card/50 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{campaign.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{campaign.channel} · {campaign.target}</div>
                </div>
                <span className={`g-chip ${statusColors[campaign.status] || ''}`}>{campaign.status}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="text-center"><div className="g-metric font-semibold text-foreground">{campaign.sent}</div><div>Sent</div></div>
                  <div className="text-center"><div className="g-metric font-semibold text-foreground">{openRate}%</div><div>Open</div></div>
                  <div className="text-center"><div className="g-metric font-semibold text-foreground">{replyRate}%</div><div>Reply</div></div>
                  <div className="text-center"><div className="g-metric font-semibold text-foreground">{campaign.deals}</div><div>Deals</div></div>
                  <div className="text-center"><div className="g-metric font-semibold text-foreground">${(campaign.pipeline/1000).toFixed(0)}k</div><div>Pipeline</div></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campaign Funnel */}
      <div className="g-surface g-elevated p-5">
        <div className="text-sm font-semibold text-foreground mb-4">Campaign Funnel (All Campaigns)</div>
        <div className="flex items-end gap-1" style={{ height: '120px' }}>
          {[
            { label: 'Sent', value: totalSent, color: '#7c3aed' },
            { label: 'Opened', value: totalOpened, color: '#3b82f6' },
            { label: 'Replied', value: totalReplied, color: '#22c55e' },
            { label: 'Meetings', value: CAMPAIGNS.reduce((s, c) => s + c.meetings, 0), color: '#f59e0b' },
            { label: 'Deals', value: totalDeals, color: '#10b981' },
          ].map((step, i) => {
            const maxVal = totalSent || 1;
            const heightPct = Math.max(10, (step.value / maxVal) * 100);
            return (
              <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-foreground g-metric">{step.value}</span>
                <div className="w-full rounded-t-lg reveal" style={{ height: `${heightPct}%`, backgroundColor: step.color + '30', borderBottom: `3px solid ${step.color}`, animationDelay: `${i * 0.08}s` }} />
                <span className="text-[10px] text-muted-foreground">{step.label}</span>
                {i < 4 && <span className="text-[9px] text-muted-foreground">{'\u2192'} {step.value > 0 ? Math.round(([totalOpened, totalReplied, CAMPAIGNS.reduce((s,c)=>s+c.meetings,0), totalDeals][i] / step.value) * 100) : 0}%</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <OpportunityProvider>
      <CampaignContent />
    </OpportunityProvider>
  );
}
