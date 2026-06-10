'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  FileText, Search, Plus, ChevronDown, ChevronRight, Clock,
  CheckCircle2, AlertTriangle, DollarSign, Filter, X, Trash2,
  ShieldCheck, Send,
} from 'lucide-react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { DealDetail } from '@/components/modals/DealDetail';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  expired: 'bg-red-500/10 text-red-400 border-red-500/20',
  terminated: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const TYPE_COLORS: Record<string, string> = {
  MSA: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  SOW: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  NDA: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  Amendment: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Renewal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const ALL_STATUSES = ['draft', 'review', 'approved', 'active', 'expired', 'terminated'] as const;

function formatCurrency(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(d: string | Date) {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ContractsContent() {
  const utils = trpc.useUtils();
  const { data: contracts = [], isLoading } = trpc.contract.list.useQuery();
  const { data: engagementTypes = [] } = trpc.engagementType.list.useQuery();
  const { data: expiring = [] } = trpc.contract.getExpiring.useQuery({ days: 60 });
  const { opportunities } = useOpportunities();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [engFilter, setEngFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const deleteMutation = trpc.contract.delete.useMutation({
    onSuccess: () => {
      utils.contract.list.invalidate();
      utils.contract.getExpiring.invalidate();
    },
  });

  const updateMutation = trpc.contract.update.useMutation({
    onSuccess: () => {
      utils.contract.list.invalidate();
      utils.contract.getExpiring.invalidate();
    },
  });

  const requestApprovalMutation = trpc.contract.requestApproval.useMutation({
    onSuccess: () => {
      utils.contract.list.invalidate();
    },
  });

  const approveMutation = trpc.contract.approve.useMutation({
    onSuccess: () => {
      utils.contract.list.invalidate();
      utils.contract.getExpiring.invalidate();
    },
  });

  function getOppName(oppId: string) {
    const opp = opportunities.find(o => o.id === oppId);
    return opp ? `${opp.customerName} - ${opp.opportunityName}` : oppId;
  }

  const handleDelete = (contractId: string) => {
    if (!confirm('Delete this contract? This action cannot be undone.')) return;
    deleteMutation.mutate({ id: contractId });
    if (expandedId === contractId) setExpandedId(null);
  };

  const handleStatusChange = (contractId: string, newStatus: string) => {
    updateMutation.mutate({ id: contractId, status: newStatus as any });
  };

  const handleRequestApproval = (contractId: string) => {
    const name = prompt('Approver name:');
    if (!name) return;
    const userId = prompt('Approver user ID (email):');
    if (!userId) return;
    requestApprovalMutation.mutate({ contractId, userId, name });
  };

  const handleApprove = (contractId: string, userId: string, status: 'approved' | 'rejected') => {
    const notes = status === 'rejected' ? (prompt('Rejection reason:') || '') : '';
    approveMutation.mutate({ contractId, userId, status, notes });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
        <div className="h-12 bg-card rounded-lg animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activeContracts = contracts.filter((c: any) => c.status === 'active');
  const pendingApproval = contracts.filter((c: any) => c.status === 'review');
  const totalValue = activeContracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

  const filtered = contracts.filter((c: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !(c.opportunityId || '').toLowerCase().includes(q)) return false;
    }
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (engFilter !== 'all' && c.engagementType !== engFilter) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-400" />
            Contracts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contracts.length} contracts across {engagementTypes.length} engagement types
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Contract
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Active</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{activeContracts.length}</div>
        </div>
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Expiring Soon</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{expiring.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">within 60 days</div>
        </div>
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Pending Approval</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{pendingApproval.length}</div>
        </div>
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Active Value</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</div>
        </div>
      </div>

      {/* Expiring Soon Banner */}
      {expiring.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Contracts Expiring Within 60 Days</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiring.map((c: any) => (
              <button
                key={c._id}
                onClick={() => setExpandedId(c._id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
              >
                {c.title} ({daysUntil(c.endDate)}d left)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full pl-9 pr-3 py-2 text-sm g-surface g-elevated rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40"
          />
        </div>

        <div className="flex gap-1 items-center">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg g-surface g-elevated text-foreground border border-transparent focus:outline-none focus:border-purple-500/40"
          >
            <option value="all">All Types</option>
            {['MSA', 'SOW', 'NDA', 'Amendment', 'Renewal'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg g-surface g-elevated text-foreground border border-transparent focus:outline-none focus:border-purple-500/40"
          >
            <option value="all">All Status</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={engFilter}
            onChange={e => setEngFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg g-surface g-elevated text-foreground border border-transparent focus:outline-none focus:border-purple-500/40"
          >
            <option value="all">All Engagements</option>
            {engagementTypes.map((et: any) => (
              <option key={et.code} value={et.code}>{et.name}</option>
            ))}
          </select>
          {(typeFilter !== 'all' || statusFilter !== 'all' || engFilter !== 'all') && (
            <button
              onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setEngFilter('all'); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Clear filters"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* New Contract Form */}
      {showNewForm && (
        <NewContractForm
          engagementTypes={engagementTypes}
          opportunities={opportunities}
          onClose={() => setShowNewForm(false)}
        />
      )}

      {/* Contract List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            {contracts.length === 0 ? (
              <>
                <p className="text-sm">No contracts yet. Create your first contract.</p>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> New Contract
                </button>
              </>
            ) : (
              <>
                <p className="text-sm">No contracts match your filters.</p>
                <p className="text-xs mt-1">Try adjusting your search or filters.</p>
              </>
            )}
          </div>
        ) : (
          filtered.map((contract: any) => {
            const isExpanded = expandedId === contract._id;
            const daysLeft = contract.endDate ? daysUntil(contract.endDate) : null;
            return (
              <div key={contract._id} className="group rounded-xl g-surface g-elevated transition-all hover:border-purple-500/20">
                {/* Row */}
                <div className="flex items-center">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : contract._id)}
                    className="flex-1 flex items-center gap-4 p-4 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{contract.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_COLORS[contract.type] || ''}`}>
                          {contract.type}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[contract.status] || ''}`}>
                          {contract.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{contract.engagementType}</span>
                        {contract.opportunityId && (
                          <>
                            <span>|</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); setSelectedOppId(contract.opportunityId); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSelectedOppId(contract.opportunityId); } }}
                              className="text-purple-400 hover:text-purple-300 hover:underline cursor-pointer"
                            >
                              {getOppName(contract.opportunityId)}
                            </span>
                          </>
                        )}
                        <span>|</span>
                        <span>{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
                        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 && (
                          <>
                            <span>|</span>
                            <span className="text-amber-400">{daysLeft}d remaining</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(contract.value)}</div>
                      {contract.pricingModel && (
                        <div className="text-[11px] text-muted-foreground">{contract.pricingModel}</div>
                      )}
                    </div>
                  </button>

                  {/* Delete button on hover */}
                  <button
                    onClick={() => handleDelete(contract._id)}
                    disabled={deleteMutation.isPending}
                    className="mr-4 p-1.5 rounded-lg text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                    title="Delete contract"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/30 space-y-4">
                    {/* Actions Bar */}
                    <div className="flex items-center gap-3 pt-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <select
                          value={contract.status}
                          onChange={e => handleStatusChange(contract._id, e.target.value)}
                          disabled={updateMutation.isPending}
                          className="px-2 py-1 text-xs rounded-lg g-surface text-foreground border border-border focus:outline-none focus:border-purple-500/40"
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>

                      {(contract.status === 'draft' || contract.status === 'review') && (
                        <button
                          onClick={() => handleRequestApproval(contract._id)}
                          disabled={requestApprovalMutation.isPending}
                          className="px-3 py-1.5 text-xs rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                          {requestApprovalMutation.isPending ? 'Sending...' : 'Request Approval'}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(contract._id)}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-50 ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>

                    {/* Signatories */}
                    {contract.signatories?.length > 0 && (
                      <div>
                        <div className="g-section-label mb-2">Signatories</div>
                        <div className="flex flex-wrap gap-2">
                          {contract.signatories.map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30 text-xs">
                              <div className={`w-2 h-2 rounded-full ${s.status === 'signed' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                              <span className="text-foreground">{s.name}</span>
                              <span className="text-muted-foreground">({s.title})</span>
                              {s.signedAt && (
                                <span className="text-emerald-400 text-[10px]">Signed {formatDate(s.signedAt)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approval Chain */}
                    {contract.approvals?.length > 0 && (
                      <div>
                        <div className="g-section-label mb-2">Approval Chain</div>
                        <div className="flex flex-wrap gap-2">
                          {contract.approvals.map((a: any, i: number) => (
                            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                              a.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              a.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                              'bg-zinc-800/50 border-zinc-700/30 text-zinc-400'
                            }`}>
                              <span className="font-medium">{a.name}</span>
                              <span className="g-chip">{a.status}</span>
                              {a.date && <span className="text-[10px]">{formatDate(a.date)}</span>}
                              {a.notes && <span className="text-[10px] italic">{a.notes}</span>}
                              {a.status === 'pending' && (
                                <div className="flex gap-1 ml-1">
                                  <button
                                    onClick={() => handleApprove(contract._id, a.userId, 'approved')}
                                    disabled={approveMutation.isPending}
                                    className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    title="Approve"
                                  >
                                    <ShieldCheck className="h-3 w-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleApprove(contract._id, a.userId, 'rejected')}
                                    disabled={approveMutation.isPending}
                                    className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Terms */}
                    {contract.terms && (
                      <div>
                        <div className="g-section-label mb-2">Terms</div>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{contract.terms}</p>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      {contract.autoRenew && <span className="g-chip">Auto-renew</span>}
                      {contract.renewalReminderDays && (
                        <span>Reminder: {contract.renewalReminderDays}d before expiry</span>
                      )}
                      {contract.createdBy && <span>Created by: {contract.createdBy}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Deal Detail Modal */}
      {selectedOppId && (
        <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />
      )}
    </div>
  );
}

export default function ContractsPage() {
  return (
    <OpportunityProvider>
      <ContractsContent />
    </OpportunityProvider>
  );
}

/* ─── New Contract Form ─── */
function NewContractForm({ engagementTypes, opportunities, onClose }: { engagementTypes: any[]; opportunities: any[]; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMutation = trpc.contract.create.useMutation({
    onSuccess: () => {
      utils.contract.list.invalidate();
      utils.contract.getExpiring.invalidate();
      onClose();
    },
  });

  const [form, setForm] = useState({
    title: '',
    type: 'SOW' as const,
    opportunityId: '',
    engagementType: '',
    pricingModel: '',
    value: 0,
    startDate: '',
    endDate: '',
    autoRenew: false,
    renewalReminderDays: 60,
    terms: '',
  });

  const selectedEng = engagementTypes.find((et: any) => et.code === form.engagementType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.opportunityId || !form.engagementType || !form.startDate || !form.endDate) return;
    createMutation.mutate({
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-xl g-surface g-elevated space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">New Contract</h2>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            placeholder="Contract title"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Opportunity *</label>
          <select
            value={form.opportunityId}
            onChange={e => setForm({ ...form, opportunityId: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            required
          >
            <option value="">Select opportunity...</option>
            {opportunities.map((opp: any) => (
              <option key={opp.id} value={opp.id}>
                {opp.customerName} - {opp.opportunityName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Type *</label>
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value as any })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
          >
            {['MSA', 'SOW', 'NDA', 'Amendment', 'Renewal'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Engagement Type *</label>
          <select
            value={form.engagementType}
            onChange={e => setForm({ ...form, engagementType: e.target.value, pricingModel: '' })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            required
          >
            <option value="">Select...</option>
            {engagementTypes.map((et: any) => (
              <option key={et.code} value={et.code}>{et.name} ({et.code})</option>
            ))}
          </select>
        </div>
        {selectedEng && selectedEng.pricingModels?.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pricing Model</label>
            <select
              value={form.pricingModel}
              onChange={e => setForm({ ...form, pricingModel: e.target.value })}
              className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            >
              <option value="">Select...</option>
              {selectedEng.pricingModels.map((pm: string) => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Value ($)</label>
          <input
            type="number"
            value={form.value}
            onChange={e => setForm({ ...form, value: Number(e.target.value) })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            min={0}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Start Date *</label>
          <input
            type="date"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">End Date *</label>
          <input
            type="date"
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoRenew}
              onChange={e => setForm({ ...form, autoRenew: e.target.checked })}
              className="rounded border-border"
            />
            Auto-renew
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Terms / Notes</label>
        <textarea
          value={form.terms}
          onChange={e => setForm({ ...form, terms: e.target.value })}
          className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border h-20 resize-none"
          placeholder="Key terms, conditions, or notes..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Contract'}
        </button>
      </div>
    </form>
  );
}
