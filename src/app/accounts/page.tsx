'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Search, Plus, Pencil, Trash2, X, Building2, Globe, MapPin,
  Users, DollarSign, ChevronDown, ChevronUp,
} from 'lucide-react';

const ACCOUNT_TYPES = ['Strategic', 'Enterprise', 'Mid-Market', 'SMB'] as const;

const typeBadgeColor: Record<string, string> = {
  Strategic: 'bg-purple-500/15 text-purple-400',
  Enterprise: 'bg-blue-500/15 text-blue-400',
  'Mid-Market': 'bg-amber-500/15 text-amber-400',
  SMB: 'bg-emerald-500/15 text-emerald-400',
};

const emptyForm = {
  companyName: '',
  website: '',
  industry: '',
  accountType: '' as string,
  description: '',
  employeeCount: '',
  annualRevenue: '',
  hqLocation: '',
  techStack: '',
};

export default function AccountsPage() {
  const utils = trpc.useUtils();
  const { data: accounts = [], isLoading } = trpc.account.list.useQuery();

  const createMutation = trpc.account.create.useMutation({ onSuccess: () => { utils.account.list.invalidate(); setShowForm(false); setForm(emptyForm); } });
  const updateMutation = trpc.account.update.useMutation({ onSuccess: () => { utils.account.list.invalidate(); utils.account.getById.invalidate(); setEditingId(null); setForm(emptyForm); } });
  const deleteMutation = trpc.account.delete.useMutation({ onSuccess: () => { utils.account.list.invalidate(); setExpandedId(null); } });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = accounts.filter((a: any) => {
    const matchesSearch = !search || a.companyName?.toLowerCase().includes(search.toLowerCase()) || a.industry?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || a.accountType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      companyName: form.companyName,
      website: form.website || undefined,
      industry: form.industry || undefined,
      description: form.description || undefined,
      accountType: form.accountType || undefined,
      hqLocation: form.hqLocation || undefined,
      employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
      annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
      techStack: form.techStack ? form.techStack.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (account: any) => {
    setEditingId(account._id);
    setForm({
      companyName: account.companyName || '',
      website: account.website || '',
      industry: account.industry || '',
      accountType: account.accountType || '',
      description: account.description || '',
      employeeCount: account.employeeCount?.toString() || '',
      annualRevenue: account.annualRevenue?.toString() || '',
      hqLocation: account.hqLocation || '',
      techStack: (account.techStack || []).join(', '),
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading accounts...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Account 360</h1>
          <p className="text-sm text-muted-foreground mt-1">{accounts.length} accounts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> New Account
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
        >
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* New / Edit Form */}
      {showForm && (
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-foreground">{editingId ? 'Edit Account' : 'New Account'}</span>
            <button onClick={cancelForm} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Company Name *</label>
                <input value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} required
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Website</label>
                <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" placeholder="https://acme.com" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Industry</label>
                <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" placeholder="Technology" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Account Type</label>
                <select value={form.accountType} onChange={e => setForm(p => ({ ...p, accountType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                  <option value="">Select type</option>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">HQ Location</label>
                <input value={form.hqLocation} onChange={e => setForm(p => ({ ...p, hqLocation: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" placeholder="San Francisco, CA" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Employee Count</label>
                <input type="number" value={form.employeeCount} onChange={e => setForm(p => ({ ...p, employeeCount: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" placeholder="500" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Annual Revenue ($)</label>
                <input type="number" value={form.annualRevenue} onChange={e => setForm(p => ({ ...p, annualRevenue: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" placeholder="10000000" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Tech Stack (comma-separated)</label>
                <input value={form.techStack} onChange={e => setForm(p => ({ ...p, techStack: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" placeholder="React, AWS, Python" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 resize-none" placeholder="Brief description..." />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={cancelForm} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50">
                {editingId ? 'Update Account' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account List */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-xl g-surface g-elevated text-center text-muted-foreground text-sm">
          {accounts.length === 0 ? 'No accounts yet. Create your first account above.' : 'No accounts match your filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((account: any) => (
            <AccountRow
              key={account._id}
              account={account}
              expanded={expandedId === account._id}
              onToggle={() => setExpandedId(expandedId === account._id ? null : account._id)}
              onEdit={() => startEdit(account)}
              onDelete={() => { if (confirm('Delete this account?')) deleteMutation.mutate({ id: account._id }); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountRow({ account, expanded, onToggle, onEdit, onDelete }: {
  account: any; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { data: detail, isLoading } = trpc.account.getById.useQuery(
    { id: account._id },
    { enabled: expanded }
  );

  const opportunities = detail?.opportunities || [];
  const dealCount = opportunities.length;
  const totalTcv = opportunities.reduce((s: number, o: any) => s + (o.tcv || 0), 0);

  return (
    <div className="rounded-xl g-surface g-elevated overflow-hidden">
      {/* Summary row */}
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/50 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{account.companyName}</span>
            {account.accountType && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[account.accountType] || 'bg-zinc-500/15 text-zinc-400'}`}>
                {account.accountType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {account.industry && <span>{account.industry}</span>}
            {expanded && dealCount > 0 && <span>{dealCount} deals</span>}
            {expanded && totalTcv > 0 && <span>${(totalTcv / 1000).toFixed(0)}k TCV</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account.accountHealth != null && (
            <div className="text-xs text-muted-foreground">
              Health: <span className={account.accountHealth >= 70 ? 'text-emerald-400' : account.accountHealth >= 40 ? 'text-amber-400' : 'text-red-400'}>{account.accountHealth}%</span>
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-border">
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground text-center">Loading account details...</div>
          ) : (
            <div className="mt-4 space-y-5">
              {/* Account Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {account.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" /> <a href={account.website} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline truncate">{account.website}</a>
                  </div>
                )}
                {account.hqLocation && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {account.hqLocation}
                  </div>
                )}
                {account.employeeCount != null && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {account.employeeCount.toLocaleString()} employees
                  </div>
                )}
                {account.annualRevenue != null && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" /> ${(account.annualRevenue / 1e6).toFixed(1)}M revenue
                  </div>
                )}
              </div>

              {/* Tech stack */}
              {account.techStack && account.techStack.length > 0 && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground g-section-label">Tech Stack</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {account.techStack.map((t: string) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 g-chip">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {account.description && (
                <p className="text-sm text-muted-foreground">{account.description}</p>
              )}

              {/* Linked Opportunities */}
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground g-section-label">Linked Opportunities ({opportunities.length})</span>
                {opportunities.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No opportunities linked to this account.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {opportunities.map((opp: any) => (
                      <div key={opp._id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50">
                        <div>
                          <span className="text-sm text-foreground">{opp.opportunityName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{opp.customerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{opp.status}</span>
                          <span className="text-xs font-medium text-foreground">${(opp.tcv / 1000).toFixed(0)}k</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
