'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { useState, useMemo, useCallback } from 'react';
import {
  Search, Crown, UserCheck, ExternalLink, Plus, X, Trash2, Sparkles,
  Loader2, Shield, Target, Eye, Building2, Mail, Phone, ChevronDown,
  ChevronRight, Edit3, Check, ArrowUpDown, Users, MessageSquare,
  CheckSquare, Square, AlertTriangle, Zap, TrendingUp, Heart,
} from 'lucide-react';
import { DealDetail } from '@/components/modals/DealDetail';
import { trpc } from '@/lib/trpc/client';

/* ─── Types ─── */
type SortKey = 'name' | 'company' | 'recent';

interface ContactEntry {
  _id?: string;
  id?: string;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  notes?: string;
  isPrimaryContact: boolean;
  isDecisionMaker: boolean;
  customerName: string;
  opportunityName: string;
  oppId: string;
  category: string;
  dealStatus: string;
  dealTcv: number;
  createdAt?: string;
}

/* ─── AI Intelligence Helpers ─── */
function getEngagementSummary(contact: ContactEntry): string {
  const parts: string[] = [];
  if (contact.isDecisionMaker) parts.push('Key decision maker with budget authority');
  if (contact.isPrimaryContact) parts.push('Primary point of contact for this engagement');
  const cat = contact.category;
  if (cat === 'executive') parts.push('C-level executive who can champion the deal at the board level');
  else if (cat === 'champion') parts.push('Director-level champion who can drive internal consensus');
  else if (cat === 'influencer') parts.push('Technical influencer who shapes evaluation criteria');
  else if (cat === 'gatekeeper') parts.push('Gatekeeper who controls procurement/compliance processes');
  else if (cat === 'end_user') parts.push('End user whose adoption drives long-term value realization');
  if (parts.length === 0) parts.push('Contact linked to active opportunity');
  return parts.join('. ') + '.';
}

function getRecommendedApproach(contact: ContactEntry): string {
  const cat = contact.category;
  if (cat === 'executive') return 'Lead with business outcomes and ROI. Schedule executive briefings. Share industry benchmarks and peer references.';
  if (cat === 'champion') return 'Equip with internal selling materials. Provide competitive battle cards. Schedule regular alignment calls.';
  if (cat === 'influencer') return 'Focus on technical deep-dives and proof of concept. Address architecture and integration concerns. Provide detailed documentation.';
  if (cat === 'gatekeeper') return 'Proactively share compliance certifications, security posture, and procurement-friendly pricing structures.';
  if (cat === 'end_user') return 'Offer hands-on demos and trial access. Gather feedback on workflows. Show how the solution simplifies their daily work.';
  return 'Build rapport through regular touchpoints. Identify their priorities and tailor messaging accordingly.';
}

function getRelationshipStrength(contact: ContactEntry): { label: string; color: string; pct: number } {
  let score = 1;
  if (contact.email) score++;
  if (contact.phone) score++;
  if (contact.linkedInUrl) score++;
  if (contact.isPrimaryContact) score++;
  if (contact.isDecisionMaker) score++;
  if (contact.notes) score++;
  if (score >= 6) return { label: 'Strong', color: 'var(--g-green)', pct: 90 };
  if (score >= 4) return { label: 'Moderate', color: 'var(--g-amber)', pct: 60 };
  return { label: 'Developing', color: 'var(--g-red)', pct: 30 };
}

/* ─── Categorize Contact ─── */
function categorizeContact(title: string, isDM: boolean): string {
  const t = (title || '').toLowerCase();
  if (isDM || /\b(ceo|cto|cfo|cio|coo|svp|evp|president|chief|vp of|vice president|managing director)\b/.test(t)) return 'executive';
  if (/\b(director|head of|senior director|general manager)\b/.test(t)) return 'champion';
  if (/\b(manager|lead|principal|senior|architect|partner)\b/.test(t)) return 'influencer';
  if (/\b(procurement|legal|compliance|audit|risk)\b/.test(t)) return 'gatekeeper';
  if (/\b(analyst|engineer|developer|designer|specialist|consultant|coordinator)\b/.test(t)) return 'end_user';
  return 'other';
}

const ROLE_CATEGORIES = [
  { id: 'all', label: 'All', icon: Users, color: '' },
  { id: 'executive', label: 'Executives', icon: Crown, color: 'text-[var(--g-amber)] bg-[var(--g-amber-soft)]' },
  { id: 'champion', label: 'Champions', icon: Shield, color: 'text-[#7c3aed] bg-[#7c3aed]/10' },
  { id: 'influencer', label: 'Influencers', icon: Zap, color: 'text-[#11A7A0] bg-[#11A7A0]/10' },
  { id: 'gatekeeper', label: 'Gatekeepers', icon: AlertTriangle, color: 'text-[var(--g-red)] bg-[var(--g-red-soft)]' },
  { id: 'end_user', label: 'End Users', icon: Target, color: 'text-blue-400 bg-blue-500/10' },
  { id: 'decision_maker', label: 'Decision Makers', icon: Crown, color: 'text-[var(--g-green)] bg-[var(--g-green-soft)]' },
];

/* ─── Main Content ─── */
function StakeholdersContent() {
  const { opportunities, isLoading } = useOpportunities();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const createMutation = trpc.stakeholder.create.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); },
  });
  const deleteMutation = trpc.stakeholder.delete.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); },
  });
  const updateMutation = trpc.stakeholder.update.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
      setEditingId(null);
      setEditForm({});
    },
  });

  /* ─── Derive contacts ─── */
  const allStakeholders: ContactEntry[] = useMemo(() =>
    opportunities.flatMap(opp =>
      (opp.customerStakeholders || []).map((s: any) => ({
        ...s,
        customerName: opp.customerName,
        opportunityName: opp.opportunityName,
        oppId: opp.id,
        category: categorizeContact(s.title || '', s.isDecisionMaker),
        dealStatus: opp.status,
        dealTcv: opp.tcv,
      }))
    ), [opportunities]);

  const filtered = useMemo(() => {
    let list = allStakeholders.filter(s => {
      if (search) {
        const q = search.toLowerCase();
        const match = s.name.toLowerCase().includes(q)
          || s.customerName.toLowerCase().includes(q)
          || (s.title || '').toLowerCase().includes(q)
          || (s.email || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (roleFilter === 'decision_maker') return s.isDecisionMaker;
      if (roleFilter !== 'all') return s.category === roleFilter;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'company') return a.customerName.localeCompare(b.customerName);
      // recent: reverse by createdAt if available
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return list;
  }, [allStakeholders, search, roleFilter, sortBy]);

  const decisionMakers = useMemo(() => allStakeholders.filter(s => s.isDecisionMaker), [allStakeholders]);
  const primaryContacts = useMemo(() => allStakeholders.filter(s => s.isPrimaryContact), [allStakeholders]);

  /* ─── Helpers ─── */
  const sid = (s: ContactEntry) => s._id || s.id || '';

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    setEditingId(null);
    setEditForm({});
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => sid(s))));
    }
  }, [selectedIds, filtered]);

  const startEdit = useCallback((contact: ContactEntry) => {
    const id = sid(contact);
    setEditingId(id);
    setEditForm({
      name: contact.name || '',
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedInUrl: contact.linkedInUrl || '',
      notes: contact.notes || '',
    });
  }, []);

  const saveEdit = useCallback((contact: ContactEntry) => {
    const id = sid(contact);
    if (!id) return;
    const payload: any = { id };
    if (editForm.name && editForm.name !== contact.name) payload.name = editForm.name;
    if (editForm.title && editForm.title !== contact.title) payload.title = editForm.title;
    if (editForm.email !== undefined) payload.email = editForm.email;
    if (editForm.phone !== undefined) payload.phone = editForm.phone;
    if (editForm.linkedInUrl !== undefined) payload.linkedInUrl = editForm.linkedInUrl;
    if (editForm.notes !== undefined) payload.notes = editForm.notes;
    updateMutation.mutate(payload);
  }, [editForm, updateMutation]);

  const handleToggleDM = useCallback((contact: ContactEntry) => {
    const id = sid(contact);
    if (!id) return;
    updateMutation.mutate({ id, isDecisionMaker: !contact.isDecisionMaker });
  }, [updateMutation]);

  const handleTogglePrimary = useCallback((contact: ContactEntry) => {
    const id = sid(contact);
    if (!id) return;
    updateMutation.mutate({ id, isPrimaryContact: !contact.isPrimaryContact });
  }, [updateMutation]);

  const handleDelete = useCallback((contact: ContactEntry) => {
    const id = sid(contact);
    if (!id) return;
    deleteMutation.mutate({ id });
    setDeleteConfirmId(null);
    if (expandedId === id) setExpandedId(null);
  }, [deleteMutation, expandedId]);

  const handleBulkDelete = useCallback(() => {
    if (!confirm(`Delete ${selectedIds.size} contacts? This cannot be undone.`)) return;
    selectedIds.forEach(id => deleteMutation.mutate({ id }));
    setSelectedIds(new Set());
  }, [selectedIds, deleteMutation]);

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="h-10 w-full max-w-sm bg-card rounded-lg animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-display">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allStakeholders.length} contacts · {decisionMakers.length} decision makers · {primaryContacts.length} primary
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

      {/* Add Form */}
      {showAddForm && (
        <AddContactForm
          opportunities={opportunities}
          onSubmit={(data) => {
            createMutation.mutate(data, { onSuccess: () => setShowAddForm(false) });
          }}
          isPending={createMutation.isPending}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, title, company, email..."
            className="w-full pl-9 pr-3 py-2 text-sm g-surface g-elevated rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/40"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {ROLE_CATEGORIES.map(cat => {
            const count = cat.id === 'all' ? allStakeholders.length
              : cat.id === 'decision_maker' ? decisionMakers.length
              : allStakeholders.filter(s => s.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setRoleFilter(cat.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  roleFilter === cat.id
                    ? 'bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/30'
                    : 'text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                {cat.label} {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort + Bulk Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
              title={selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-[#7c3aed]" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
          )}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Delete Selected
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          {(['name', 'company', 'recent'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                sortBy === key
                  ? 'bg-[#7c3aed]/15 text-[#7c3aed]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {key === 'name' ? 'Name' : key === 'company' ? 'Company' : 'Recently Added'}
            </button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <div className="space-y-1">
        {filtered.map((person, i) => {
          const personId = sid(person);
          const isExpanded = expandedId === personId;
          const isEditing = editingId === personId;
          const isSelected = selectedIds.has(personId);
          const catMeta = ROLE_CATEGORIES.find(c => c.id === person.category);
          const relationship = getRelationshipStrength(person);

          return (
            <div key={personId || i}>
              {/* Contact Row */}
              <div
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                  i % 2 === 0 ? 'bg-card/50' : 'bg-card/30'
                } ${isExpanded ? 'g-surface g-elevated border-[#7c3aed]/20' : 'hover:bg-card/80'} ${
                  isSelected ? 'ring-1 ring-[#7c3aed]/30' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(personId); }}
                  className="p-0.5 rounded text-muted-foreground hover:text-[#7c3aed] transition-colors flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-[#7c3aed]" />
                  ) : (
                    <Square className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>

                {/* Expand Arrow + Avatar */}
                <div
                  className="flex items-center gap-2 flex-shrink-0"
                  onClick={() => toggleExpand(personId)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[#7c3aed]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <div className="w-9 h-9 rounded-full bg-[#7c3aed]/15 flex items-center justify-center text-[#7c3aed] text-xs font-bold">
                    {person.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                </div>

                {/* Name + Title */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleExpand(personId)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {person.name}
                    </span>
                    {catMeta && catMeta.id !== 'all' && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${catMeta.color}`}>
                        {catMeta.label.replace(/s$/, '')}
                      </span>
                    )}
                    {person.isDecisionMaker && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-[var(--g-amber-soft)] text-[var(--g-amber)] flex items-center gap-0.5">
                        <Crown className="h-2.5 w-2.5" /> DM
                      </span>
                    )}
                    {person.isPrimaryContact && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400 flex items-center gap-0.5">
                        <UserCheck className="h-2.5 w-2.5" /> Primary
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{person.title}</div>
                </div>

                {/* Company */}
                <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 min-w-[120px]">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{person.customerName}</span>
                </div>

                {/* Relationship indicator */}
                <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 min-w-[80px]">
                  <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${relationship.pct}%`, backgroundColor: relationship.color }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{relationship.label}</span>
                </div>

                {/* Quick contact info */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {person.email && (
                    <a href={`mailto:${person.email}`} onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={person.email}>
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {person.phone && (
                    <a href={`tel:${person.phone}`} onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={person.phone}>
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {person.linkedInUrl && (
                    <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-[#7c3aed] transition-colors" title="LinkedIn">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Expanded Contact Detail */}
              {isExpanded && (
                <div className="ml-[52px] mr-4 mb-2 mt-0 p-5 rounded-b-xl g-surface border border-t-0 space-y-5" style={{ borderColor: 'var(--g-line)' }}>
                  {/* Profile Section */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-[#7c3aed]/15 flex items-center justify-center text-[#7c3aed] text-xl font-bold">
                        {person.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              value={editForm.name || ''}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="text-base font-semibold text-foreground bg-transparent border-b border-[#7c3aed]/30 focus:outline-none focus:border-[#7c3aed] w-full font-display"
                              placeholder="Full name"
                            />
                            <input
                              value={editForm.title || ''}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                              className="text-sm text-muted-foreground bg-transparent border-b border-border focus:outline-none focus:border-[#7c3aed]/40 w-full"
                              placeholder="Title"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="text-base font-semibold text-foreground font-display">{person.name}</div>
                            <div className="text-sm text-muted-foreground">{person.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {person.customerName}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(person)}
                            disabled={updateMutation.isPending}
                            className="px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors flex items-center gap-1"
                          >
                            {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditForm({}); }}
                            className="px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(person)}
                            className="px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="h-3 w-3" /> Edit
                          </button>
                          {deleteConfirmId === personId ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-red-400">Delete?</span>
                              <button
                                onClick={() => handleDelete(person)}
                                disabled={deleteMutation.isPending}
                                className="px-2 py-1 text-[10px] rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                              >
                                {deleteMutation.isPending ? 'Deleting...' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-[10px] rounded text-muted-foreground hover:bg-secondary transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(personId)}
                              className="px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contact Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Email</label>
                          <input
                            value={editForm.email || ''}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs g-surface rounded-lg text-foreground border border-border focus:outline-none focus:border-[#7c3aed]/40"
                            placeholder="email@company.com"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Phone</label>
                          <input
                            value={editForm.phone || ''}
                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs g-surface rounded-lg text-foreground border border-border focus:outline-none focus:border-[#7c3aed]/40"
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">LinkedIn</label>
                          <input
                            value={editForm.linkedInUrl || ''}
                            onChange={e => setEditForm({ ...editForm, linkedInUrl: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs g-surface rounded-lg text-foreground border border-border focus:outline-none focus:border-[#7c3aed]/40"
                            placeholder="https://linkedin.com/in/..."
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label>
                          <input
                            value={editForm.notes || ''}
                            onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs g-surface rounded-lg text-foreground border border-border focus:outline-none focus:border-[#7c3aed]/40"
                            placeholder="Internal notes..."
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</span>
                          <div className="text-xs text-foreground mt-0.5">
                            {person.email ? (
                              <a href={`mailto:${person.email}`} className="hover:text-[#7c3aed] transition-colors">{person.email}</a>
                            ) : <span className="text-muted-foreground italic">Not set</span>}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</span>
                          <div className="text-xs text-foreground mt-0.5">
                            {person.phone ? (
                              <a href={`tel:${person.phone}`} className="hover:text-[#7c3aed] transition-colors">{person.phone}</a>
                            ) : <span className="text-muted-foreground italic">Not set</span>}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">LinkedIn</span>
                          <div className="text-xs text-foreground mt-0.5">
                            {person.linkedInUrl ? (
                              <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#7c3aed] transition-colors flex items-center gap-1">
                                Profile <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : <span className="text-muted-foreground italic">Not set</span>}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</span>
                          <div className="text-xs text-foreground mt-0.5">
                            {person.notes || <span className="text-muted-foreground italic">None</span>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Role Classification + Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleDM(person)}
                      disabled={updateMutation.isPending}
                      className={`text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border ${
                        person.isDecisionMaker
                          ? 'bg-[var(--g-amber-soft)] text-[var(--g-amber)] border-[var(--g-amber)]/20'
                          : 'bg-secondary/50 text-muted-foreground border-border hover:text-[var(--g-amber)] hover:border-[var(--g-amber)]/20'
                      }`}
                    >
                      <Crown className="h-3 w-3" /> {person.isDecisionMaker ? 'Decision Maker' : 'Set as Decision Maker'}
                    </button>
                    <button
                      onClick={() => handleTogglePrimary(person)}
                      disabled={updateMutation.isPending}
                      className={`text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border ${
                        person.isPrimaryContact
                          ? 'bg-blue-500/10 text-blue-400 border-blue-400/20'
                          : 'bg-secondary/50 text-muted-foreground border-border hover:text-blue-400 hover:border-blue-400/20'
                      }`}
                    >
                      <UserCheck className="h-3 w-3" /> {person.isPrimaryContact ? 'Primary Contact' : 'Set as Primary'}
                    </button>
                    {catMeta && catMeta.id !== 'all' && (
                      <span className={`text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-transparent ${catMeta.color}`}>
                        <Target className="h-3 w-3" /> {catMeta.label.replace(/s$/, '')}
                      </span>
                    )}
                  </div>

                  {/* AI Contact Intelligence */}
                  <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/10 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                      <span className="text-xs font-semibold text-[#7c3aed] uppercase tracking-wider">AI Contact Intelligence</span>
                    </div>

                    {/* Relationship Strength */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3" /> Relationship Strength
                        </span>
                        <span className="text-xs font-medium" style={{ color: relationship.color }}>{relationship.label}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${relationship.pct}%`, backgroundColor: relationship.color }}
                        />
                      </div>
                    </div>

                    {/* Engagement Summary */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                        <MessageSquare className="h-3 w-3" /> Engagement Summary
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">{getEngagementSummary(person)}</p>
                    </div>

                    {/* Recommended Approach */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                        <TrendingUp className="h-3 w-3" /> Recommended Approach
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">{getRecommendedApproach(person)}</p>
                    </div>
                  </div>

                  {/* Linked Opportunity */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Linked Opportunity</span>
                    <button
                      onClick={() => setSelectedOppId(person.oppId)}
                      className="w-full text-left p-3 rounded-lg bg-card/50 hover:bg-card transition-colors border border-border group/deal"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-foreground">{person.opportunityName}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Building2 className="h-2.5 w-2.5" /> {person.customerName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">{person.dealStatus}</span>
                          {person.dealTcv > 0 && (
                            <span className="text-[10px] text-muted-foreground">${(person.dealTcv / 1000).toFixed(0)}k</span>
                          )}
                          <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover/deal:text-[#7c3aed] transition-colors" />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {allStakeholders.length === 0 ? (
              <>
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p>No contacts yet. Add your first contact to get started.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Contact
                </button>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p>No contacts match your search or filter.</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Deal Detail Modal (secondary) */}
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
    notes: '',
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
    if (form.notes) payload.notes = form.notes;
    onSubmit(payload);
  };

  const inputClass = 'w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/40 border border-border';

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-xl g-surface g-elevated space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground font-display">New Contact</h2>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Full name" required />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Title *</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. VP of Engineering" required />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="email@company.com" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="+1 (555) 000-0000" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">LinkedIn URL</label>
          <input type="url" value={form.linkedInUrl} onChange={e => setForm({ ...form, linkedInUrl: e.target.value })} className={inputClass} placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Opportunity *</label>
          <select
            value={form.opportunityId}
            onChange={e => setForm({ ...form, opportunityId: e.target.value })}
            className={inputClass}
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
        <div className="md:col-span-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className={`${inputClass} resize-none`}
            rows={2}
            placeholder="Internal notes about this contact..."
          />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={form.isPrimaryContact}
              onChange={e => setForm({ ...form, isPrimaryContact: e.target.checked })}
              className="rounded border-border accent-[#7c3aed]"
            />
            Primary Contact
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={form.isDecisionMaker}
              onChange={e => setForm({ ...form, isDecisionMaker: e.target.checked })}
              className="rounded border-border accent-[#7c3aed]"
            />
            Decision Maker
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
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
          className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...</> : <><Plus className="h-3.5 w-3.5" /> Add Contact</>}
        </button>
      </div>
    </form>
  );
}

/* ─── Page Export ─── */
export default function StakeholdersPage() {
  return (
    <OpportunityProvider>
      <StakeholdersContent />
    </OpportunityProvider>
  );
}
