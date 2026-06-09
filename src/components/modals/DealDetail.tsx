'use client';

import { useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  X, DollarSign, Calendar, Users, CheckSquare, Percent,
  Globe, Briefcase, Tag, ExternalLink, Edit2, Save, Plus,
  Trash2, ChevronRight, Clock, Building2, Loader2, Sparkles,
} from 'lucide-react';

interface DealDetailProps {
  opportunityId: string;
  onClose: () => void;
}

export function DealDetail({ opportunityId, onClose }: DealDetailProps) {
  const { opportunities, updateOpportunity, deleteOpportunity } = useOpportunities();
  const opp = opportunities.find(o => o.id === opportunityId);
  const [activeTab, setActiveTab] = useState<'details' | 'stakeholders' | 'tasks' | 'log'>('details');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [analysis, setAnalysis] = useState<any>(null);
  const analysisMutation = trpc.ai.analyzeDeal.useMutation();

  if (!opp) return null;

  const stakeholders = opp.customerStakeholders || [];
  const tasks = opp.subTasks || [];
  const completedTasks = tasks.filter(t => t.status === 'complete').length;

  const statusColors: Record<string, string> = {
    'Discovery': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Qualification': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Proposal': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'Negotiation': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Won': 'bg-green-500/15 text-green-400 border-green-500/30',
    'Lost': 'bg-red-500/15 text-red-400 border-red-500/30',
    'On Hold': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  };

  const handleSave = async () => {
    if (Object.keys(editForm).length > 0) {
      await updateOpportunity(opp.id, editForm);
    }
    setEditing(false);
    setEditForm({});
  };

  const handleDelete = async () => {
    if (confirm('Delete this opportunity? This cannot be undone.')) {
      await deleteOpportunity(opp.id);
      onClose();
    }
  };

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'stakeholders' as const, label: `Stakeholders (${stakeholders.length})` },
    { id: 'tasks' as const, label: `Tasks (${completedTasks}/${tasks.length})` },
    { id: 'log' as const, label: 'Log' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col g-surface rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`g-chip border ${statusColors[opp.status] || ''}`}>{opp.status}</span>
              <span className="text-xs text-muted-foreground">{opp.id}</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground truncate">{opp.customerName}</h2>
            <p className="text-sm text-muted-foreground truncate">{opp.opportunityName}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {editing ? (
              <>
                <button onClick={handleSave} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"><Save className="h-4 w-4" /></button>
                <button onClick={() => { setEditing(false); setEditForm({}); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Edit2 className="h-4 w-4" /></button>
            )}
            <button
              onClick={() => analysisMutation.mutate({ opportunityId: opp.id }, { onSuccess: (data) => setAnalysis(data) })}
              disabled={analysisMutation.isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#7B52FF]/10 text-[#7B52FF] text-xs font-medium hover:bg-[#7B52FF]/20 transition-colors disabled:opacity-50"
            >
              {analysisMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI Analyze
            </button>
            <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-5 border-b" style={{ borderColor: 'var(--g-line)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#7B52FF] text-[#7B52FF]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* AI Analysis Results */}
              {analysis && (
                <div className="p-4 rounded-xl bg-[#7B52FF]/5 border border-[#7B52FF]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#7B52FF]" />
                      <span className="text-sm font-medium text-foreground">AI Analysis</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs"><span className="text-muted-foreground">Health:</span> <span className="g-metric font-bold text-foreground">{analysis.healthScore}/100</span></div>
                      <div className="text-xs"><span className="text-muted-foreground">Win:</span> <span className="g-metric font-bold text-foreground">{analysis.winProbability}%</span></div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
                  {analysis.risks?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="g-section-label">Risks</div>
                      {analysis.risks.map((r: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={`g-chip ${r.severity === 'critical' ? 'bg-red-500/10 text-red-400' : r.severity === 'high' ? 'bg-orange-500/10 text-orange-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {r.severity}
                          </span>
                          <span className="text-foreground">{r.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.actions?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="g-section-label">Recommended Actions</div>
                      {analysis.actions.map((a: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="g-chip bg-[#7B52FF]/10 text-[#7B52FF]">{a.priority}</span>
                          <div><span className="text-foreground font-medium">{a.action}</span> <span className="text-muted-foreground">-- {a.reason}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* KPI Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">TCV</div>
                  <div className="g-kpi text-foreground text-lg">${opp.tcv > 0 ? opp.tcv.toLocaleString() : '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Margin</div>
                  <div className="g-kpi text-foreground text-lg">{opp.margin ? `${opp.margin}%` : '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Close Date</div>
                  <div className="text-sm font-medium text-foreground">{format(new Date(opp.expectedCloseDate), 'MMM d, yyyy')}</div>
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Building2, label: 'Industry', value: opp.industry, field: 'industry' },
                  { icon: Globe, label: 'Region', value: opp.region, field: 'region' },
                  { icon: Briefcase, label: 'Service Line', value: opp.serviceLine || '—', field: 'serviceLine' },
                  { icon: DollarSign, label: 'Billing Model', value: opp.billingModel || '—', field: 'billingModel' },
                  { icon: Clock, label: 'Duration', value: opp.dealDuration, field: 'dealDuration' },
                  { icon: Users, label: 'Owner', value: opp.primaryOwner, field: 'primaryOwner' },
                  { icon: Calendar, label: 'Start Date', value: format(new Date(opp.startDate), 'MMM d, yyyy'), field: 'startDate' },
                  { icon: Tag, label: 'Source', value: opp.source, field: 'source' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] text-muted-foreground">{item.label}</div>
                      {editing ? (
                        <input
                          className="w-full px-2 py-1 text-sm bg-secondary border border-border rounded text-foreground"
                          defaultValue={item.value}
                          onChange={e => setEditForm((f: any) => ({ ...f, [item.field]: e.target.value }))}
                        />
                      ) : (
                        <div className="text-sm text-foreground">{item.value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {opp.customTags && opp.customTags.length > 0 && (
                <div>
                  <div className="g-section-label mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.customTags.map(tag => (
                      <span key={tag} className="g-chip bg-[#7B52FF]/10 text-[#7B52FF] border border-[#7B52FF]/20">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* POCs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="g-section-label mb-2">Sales POCs</div>
                  <div className="space-y-1">
                    {(opp.salesPOCs || []).map(poc => (
                      <div key={poc} className="text-sm text-foreground">{poc}</div>
                    ))}
                    {(!opp.salesPOCs || opp.salesPOCs.length === 0) && <div className="text-sm text-muted-foreground">—</div>}
                  </div>
                </div>
                <div>
                  <div className="g-section-label mb-2">Presales POCs</div>
                  <div className="space-y-1">
                    {(opp.presalesPOCs || []).map(poc => (
                      <div key={poc} className="text-sm text-foreground">{poc}</div>
                    ))}
                    {(!opp.presalesPOCs || opp.presalesPOCs.length === 0) && <div className="text-sm text-muted-foreground">—</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stakeholders' && (
            <div className="space-y-3">
              {stakeholders.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No stakeholders added yet.</div>}
              {stakeholders.map((s, i) => (
                <div key={s.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="w-9 h-9 rounded-full bg-[#7B52FF]/15 flex items-center justify-center text-[#7B52FF] text-xs font-bold flex-shrink-0">
                    {s.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      {s.isDecisionMaker && <span className="g-chip bg-amber-500/10 text-amber-400 border border-amber-500/20">DM</span>}
                      {s.isPrimaryContact && <span className="g-chip bg-blue-500/10 text-blue-400 border border-blue-500/20">Primary</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.title}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.email && <div>{s.email}</div>}
                    {s.phone && <div>{s.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No tasks added yet.</div>}
              {tasks.map((t, i) => {
                const isOverdue = t.status === 'pending' && new Date(t.dueDate) < new Date();
                const priorityColors: Record<string, string> = {
                  'Critical': 'text-red-400', 'High': 'text-orange-400', 'Medium': 'text-amber-400', 'Low': 'text-muted-foreground',
                };
                return (
                  <div key={t.id || i} className={`flex items-center gap-3 p-3 rounded-lg bg-card border ${isOverdue ? 'border-red-500/30' : 'border-border'}`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${t.status === 'complete' ? 'bg-green-500/20 border-green-500' : 'border-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${t.status === 'complete' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.owner} · {format(new Date(t.dueDate), 'MMM d')}</div>
                    </div>
                    <span className={`text-[10px] font-medium ${priorityColors[t.priority] || ''}`}>{t.priority}</span>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'log' && (
            <div>
              {opp.conversationLog ? (
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{opp.conversationLog}</div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No conversation log yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
