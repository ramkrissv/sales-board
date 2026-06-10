'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  BarChart3, TrendingUp, Mail, Users, Target, Eye,
  ArrowUpRight, Clock, Sparkles, Plus, DollarSign,
  X, Trash2, Edit3, Play, Pause, CheckCircle, Calendar
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

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = trpc.campaign.list.useQuery();
  const createMutation = trpc.campaign.create.useMutation();
  const updateMutation = trpc.campaign.update.useMutation();
  const deleteMutation = trpc.campaign.delete.useMutation();
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Outbound' | 'ABM' | 'Inbound' | 'Partner' | 'Event'>('Outbound');
  const [formChannel, setFormChannel] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const resetForm = () => {
    setFormName(''); setFormType('Outbound'); setFormChannel(''); setFormTarget('');
    setFormStartDate(''); setFormOwner(''); setFormDescription('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!formName || !formChannel || !formTarget || !formStartDate) return;
    await createMutation.mutateAsync({
      name: formName, type: formType, channel: formChannel,
      target: formTarget, startDate: formStartDate,
      owner: formOwner, description: formDescription,
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
    if (selectedCampaign?.id === id) setSelectedCampaign(null);
  };

  const activeCampaigns = campaigns.filter((c: Campaign) => c.status === 'Active');
  const totalSent = campaigns.reduce((s: number, c: Campaign) => s + c.sent, 0);
  const totalOpened = campaigns.reduce((s: number, c: Campaign) => s + c.opened, 0);
  const totalReplied = campaigns.reduce((s: number, c: Campaign) => s + c.replied, 0);
  const totalPipeline = campaigns.reduce((s: number, c: Campaign) => s + c.pipeline, 0);
  const totalDeals = campaigns.reduce((s: number, c: Campaign) => s + c.deals, 0);
  const totalMeetings = campaigns.reduce((s: number, c: Campaign) => s + c.meetings, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const avgReplyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 1000) / 10 : 0;

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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campaign Analytics</h1>
          <p className="text-sm text-muted-foreground">{activeCampaigns.length} active campaigns · ${(totalPipeline/1e6).toFixed(1)}M pipeline generated</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors ripple">
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
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift card-enter">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              <span className="g-section-label">{kpi.label}</span>
            </div>
            <div className="g-kpi text-foreground animate-tick-up" style={{ fontSize: '20px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Campaign List */}
      <div className="g-surface g-elevated overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <span className="text-sm font-semibold text-foreground">Campaigns</span>
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
              return (
                <div key={campaign.id} className="group">
                  <button onClick={() => setSelectedCampaign(selectedCampaign?.id === campaign.id ? null : campaign)}
                    className="flex items-center gap-4 w-full px-5 py-4 hover:bg-card/50 transition-colors text-left">
                    {/* Type indicator */}
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: typeColors[campaign.type] || '#7c3aed' }} />
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
                    {/* Quick actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                  {/* Expanded detail */}
                  {selectedCampaign?.id === campaign.id && (
                    <div className="px-5 pb-4 pl-12 animate-flow-in">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <span className="g-section-label">Type</span>
                          <div className="text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors[campaign.type] }} />
                            {campaign.type}
                          </div>
                        </div>
                        <div>
                          <span className="g-section-label">Owner</span>
                          <div className="text-sm text-foreground mt-0.5">{campaign.owner || 'Unassigned'}</div>
                        </div>
                        <div>
                          <span className="g-section-label">Start Date</span>
                          <div className="text-sm text-foreground mt-0.5">{new Date(campaign.startDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                      {campaign.description && (
                        <p className="text-xs text-muted-foreground mt-3">{campaign.description}</p>
                      )}
                      {/* Mini funnel for this campaign */}
                      <div className="mt-3 flex items-end gap-1" style={{ height: '60px' }}>
                        {[
                          { label: 'Sent', value: campaign.sent, color: '#7c3aed' },
                          { label: 'Opened', value: campaign.opened, color: '#3b82f6' },
                          { label: 'Replied', value: campaign.replied, color: '#22c55e' },
                          { label: 'Meetings', value: campaign.meetings, color: '#f59e0b' },
                          { label: 'Deals', value: campaign.deals, color: '#10b981' },
                        ].map((step, i) => {
                          const maxVal = campaign.sent || 1;
                          const heightPct = Math.max(12, (step.value / maxVal) * 100);
                          return (
                            <div key={step.label} className="flex-1 flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-foreground g-metric">{step.value}</span>
                              <div className="w-full rounded-t animate-fill" style={{ height: `${heightPct}%`, backgroundColor: step.color + '25', borderBottom: `2px solid ${step.color}` }} />
                              <span className="text-[9px] text-muted-foreground">{step.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aggregate Funnel */}
      {campaigns.length > 0 && (
        <div className="g-surface g-elevated p-5">
          <div className="text-sm font-semibold text-foreground mb-4">Campaign Funnel (All Campaigns)</div>
          <div className="flex items-end gap-1" style={{ height: '120px' }}>
            {[
              { label: 'Sent', value: totalSent, color: '#7c3aed' },
              { label: 'Opened', value: totalOpened, color: '#3b82f6' },
              { label: 'Replied', value: totalReplied, color: '#22c55e' },
              { label: 'Meetings', value: totalMeetings, color: '#f59e0b' },
              { label: 'Deals', value: totalDeals, color: '#10b981' },
            ].map((step, i) => {
              const maxVal = totalSent || 1;
              const heightPct = Math.max(10, (step.value / maxVal) * 100);
              const nextVal = [totalOpened, totalReplied, totalMeetings, totalDeals][i];
              return (
                <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-foreground g-metric">{step.value}</span>
                  <div className="w-full rounded-t-lg reveal" style={{ height: `${heightPct}%`, backgroundColor: step.color + '30', borderBottom: `3px solid ${step.color}`, animationDelay: `${i * 0.08}s` }} />
                  <span className="text-[10px] text-muted-foreground">{step.label}</span>
                  {i < 4 && nextVal !== undefined && (
                    <span className="text-[9px] text-muted-foreground">{step.value > 0 ? Math.round((nextVal / step.value) * 100) : 0}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg g-surface g-elevated p-6 m-4 card-enter">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">New Campaign</h2>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
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
                  <label className="block text-[11px] text-muted-foreground mb-1">Channel *</label>
                  <input value={formChannel} onChange={e => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="Email + LinkedIn" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Target Audience *</label>
                  <input value={formTarget} onChange={e => setFormTarget(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="Enterprise CTOs" />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Start Date *</label>
                  <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Owner</label>
                  <input value={formOwner} onChange={e => setFormOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" placeholder="Sreeram" />
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
              <button onClick={handleCreate} disabled={!formName || !formChannel || !formTarget || !formStartDate || createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
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
