'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { useState } from 'react';
import { Search, Crown, UserCheck, ExternalLink, Plus, X, Trash2 } from 'lucide-react';
import { DealDetail } from '@/components/modals/DealDetail';
import { trpc } from '@/lib/trpc/client';

function StakeholdersContent() {
  const { opportunities, isLoading } = useOpportunities();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'decision_maker' | 'primary'>('all');
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const createMutation = trpc.stakeholder.create.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
    },
  });

  const deleteMutation = trpc.stakeholder.delete.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
    },
  });

  const updateMutation = trpc.stakeholder.update.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="h-10 w-full max-w-sm bg-card rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const allStakeholders = opportunities.flatMap(opp =>
    (opp.customerStakeholders || []).map((s: any) => ({ ...s, customerName: opp.customerName, opportunityName: opp.opportunityName, oppId: opp.id }))
  );

  const filtered = allStakeholders.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.customerName.toLowerCase().includes(search.toLowerCase()) && !(s.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter === 'decision_maker') return s.isDecisionMaker;
    if (roleFilter === 'primary') return s.isPrimaryContact;
    return true;
  });

  const decisionMakers = allStakeholders.filter(s => s.isDecisionMaker);
  const primaryContacts = allStakeholders.filter(s => s.isPrimaryContact);

  const handleToggleDM = (stakeholder: any) => {
    if (!stakeholder._id && !stakeholder.id) return;
    const sid = stakeholder._id || stakeholder.id;
    updateMutation.mutate({ id: sid, isDecisionMaker: !stakeholder.isDecisionMaker });
  };

  const handleTogglePrimary = (stakeholder: any) => {
    if (!stakeholder._id && !stakeholder.id) return;
    const sid = stakeholder._id || stakeholder.id;
    updateMutation.mutate({ id: sid, isPrimaryContact: !stakeholder.isPrimaryContact });
  };

  const handleDelete = (stakeholder: any) => {
    if (!stakeholder._id && !stakeholder.id) return;
    const sid = stakeholder._id || stakeholder.id;
    if (!confirm('Delete this contact?')) return;
    deleteMutation.mutate({ id: sid });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allStakeholders.length} contacts · {decisionMakers.length} decision makers · {primaryContacts.length} primary contacts
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {showAddForm && (
        <AddContactForm
          opportunities={opportunities}
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => setShowAddForm(false),
            });
          }}
          isPending={createMutation.isPending}
          onClose={() => setShowAddForm(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-9 pr-3 py-2 text-sm g-surface g-elevated rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40"
          />
        </div>
        <div className="flex gap-1">
          {([['all', 'All'], ['decision_maker', 'Decision Makers'], ['primary', 'Primary Contacts']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRoleFilter(val as 'all' | 'decision_maker' | 'primary')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                roleFilter === val ? 'bg-[#7c3aed]/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((person: any, i: number) => (
          <div key={person._id || person.id || i} className="group p-4 rounded-xl g-surface g-elevated hover:border-purple-500/20 transition-all relative">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full bg-[#7c3aed]/20 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0 cursor-pointer"
                onClick={() => setSelectedOppId(person.oppId)}
              >
                {person.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-purple-400 transition-colors"
                    onClick={() => setSelectedOppId(person.oppId)}
                  >
                    {person.name}
                  </span>
                  <button
                    onClick={() => handleToggleDM(person)}
                    disabled={updateMutation.isPending}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                      person.isDecisionMaker
                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-zinc-800/50 text-zinc-500 hover:bg-amber-500/10 hover:text-amber-400'
                    }`}
                    title={person.isDecisionMaker ? 'Remove Decision Maker' : 'Set as Decision Maker'}
                  >
                    <Crown className="h-2.5 w-2.5" /> DM
                  </button>
                  <button
                    onClick={() => handleTogglePrimary(person)}
                    disabled={updateMutation.isPending}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                      person.isPrimaryContact
                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                        : 'bg-zinc-800/50 text-zinc-500 hover:bg-blue-500/10 hover:text-blue-400'
                    }`}
                    title={person.isPrimaryContact ? 'Remove Primary Contact' : 'Set as Primary Contact'}
                  >
                    <UserCheck className="h-2.5 w-2.5" /> Primary
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">{person.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <button
                    onClick={() => setSelectedOppId(person.oppId)}
                    className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                  >
                    {person.customerName} &middot; {person.opportunityName}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0 items-end">
                {person.email && <span className="text-[11px] text-muted-foreground">{person.email}</span>}
                {person.phone && <span className="text-[11px] text-muted-foreground">{person.phone}</span>}
                {person.linkedInUrl && (
                  <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <button
                onClick={() => handleDelete(person)}
                disabled={deleteMutation.isPending}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete contact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">
            {allStakeholders.length === 0 ? (
              <>
                <p>No contacts yet. Add your first contact.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Contact
                </button>
              </>
            ) : (
              <p>No stakeholders match your filter.</p>
            )}
          </div>
        )}
      </div>

      {/* Deal Detail Modal */}
      {selectedOppId && (
        <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />
      )}
    </div>
  );
}

/* ─── Add Contact Form ─── */
function AddContactForm({
  opportunities,
  onSubmit,
  isPending,
  onClose,
}: {
  opportunities: any[];
  onSubmit: (data: any) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    linkedInUrl: '',
    isPrimaryContact: false,
    isDecisionMaker: false,
    opportunityId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.title || !form.opportunityId) return;
    const payload: any = {
      name: form.name,
      title: form.title,
      opportunityId: form.opportunityId,
      isPrimaryContact: form.isPrimaryContact,
      isDecisionMaker: form.isDecisionMaker,
    };
    if (form.email) payload.email = form.email;
    if (form.phone) payload.phone = form.phone;
    if (form.linkedInUrl) payload.linkedInUrl = form.linkedInUrl;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-xl g-surface g-elevated space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">New Contact</h2>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            placeholder="Full name"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            placeholder="e.g. VP of Engineering"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            placeholder="email@company.com"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">LinkedIn URL</label>
          <input
            type="url"
            value={form.linkedInUrl}
            onChange={e => setForm({ ...form, linkedInUrl: e.target.value })}
            className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            placeholder="https://linkedin.com/in/..."
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
            {opportunities.map(opp => (
              <option key={opp.id} value={opp.id}>
                {opp.customerName} - {opp.opportunityName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPrimaryContact}
              onChange={e => setForm({ ...form, isPrimaryContact: e.target.checked })}
              className="rounded border-border"
            />
            Primary Contact
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDecisionMaker}
              onChange={e => setForm({ ...form, isDecisionMaker: e.target.checked })}
              className="rounded border-border"
            />
            Decision Maker
          </label>
        </div>
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
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? 'Adding...' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}

export default function StakeholdersPage() {
  return (
    <OpportunityProvider>
      <StakeholdersContent />
    </OpportunityProvider>
  );
}
