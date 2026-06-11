'use client';

import { useState, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { Opportunity } from '@/lib/types';
import {
  FileText, Sparkles, Loader2, ChevronRight,
  Target, Clock, Users, DollarSign, BarChart3,
  Zap, CheckCircle2, Copy, RotateCcw, Pencil,
  ArrowRight, Check, ExternalLink, Layers
} from 'lucide-react';

/* ─── Proposal Sections ─── */
const SECTIONS = [
  { id: 'exec_summary',  title: 'Executive Summary',         icon: Target },
  { id: 'scope',         title: 'Scope of Work',             icon: Layers },
  { id: 'approach',      title: 'Proposed Approach',         icon: Zap },
  { id: 'architecture',  title: 'Solution Architecture',     icon: BarChart3 },
  { id: 'team',          title: 'Team & Resources',          icon: Users },
  { id: 'timeline',      title: 'Timeline & Milestones',     icon: Clock },
  { id: 'pricing',       title: 'Pricing & Commercial Terms', icon: DollarSign },
  { id: 'risks',         title: 'Risks & Mitigations',       icon: Target },
  { id: 'case_studies',  title: 'Case Studies & References',  icon: FileText },
  { id: 'terms',         title: 'Terms & Conditions',         icon: CheckCircle2 },
] as const;

type SectionId = typeof SECTIONS[number]['id'];
type Tab = 'pursuits' | 'studio' | 'solutioning';

/* ─── Effort roles for Solutioning ─── */
const EFFORT_ROLES = [
  { role: 'Solution Architect', weeks: 4, rate: 200 },
  { role: 'Sr. Developer',     weeks: 12, rate: 165 },
  { role: 'Developer',         weeks: 16, rate: 135 },
  { role: 'QA Engineer',       weeks: 8, rate: 120 },
  { role: 'Project Manager',   weeks: 16, rate: 175 },
];

export default function PresalesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pursuits');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('exec_summary');
  const [sectionContent, setSectionContent] = useState<Record<string, Record<string, string>>>({});
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [draftingSection, setDraftingSection] = useState<string | null>(null);

  /* ─── Data ─── */
  const { data: allOpportunities = [], isLoading } = trpc.opportunity.list.useQuery();
  const chatMutation = trpc.ai.chat.useMutation();

  /* Only Proposal / Negotiation stage deals are presales-relevant */
  const pursuits = useMemo(() =>
    (allOpportunities as Opportunity[]).filter(
      o => o.status === 'Proposal' || o.status === 'Negotiation'
    ),
    [allOpportunities]
  );

  const selectedDeal = useMemo(() =>
    pursuits.find(o => o.id === selectedDealId) ?? null,
    [pursuits, selectedDealId]
  );

  /* Per-deal section content */
  const dealContent = selectedDealId ? (sectionContent[selectedDealId] ?? {}) : {};
  const currentContent = dealContent[activeSection] ?? '';

  const draftedCount = selectedDealId
    ? Object.keys(sectionContent[selectedDealId] ?? {}).length
    : 0;
  const progressPct = Math.round((draftedCount / SECTIONS.length) * 100);

  /* ─── Helpers ─── */
  const selectDeal = useCallback((id: string) => {
    setSelectedDealId(id);
    setActiveSection('exec_summary');
    setEditingSection(null);
    setActiveTab('studio');
  }, []);

  const setSectionText = useCallback((dealId: string, sectionId: string, text: string) => {
    setSectionContent(prev => ({
      ...prev,
      [dealId]: { ...(prev[dealId] ?? {}), [sectionId]: text },
    }));
  }, []);

  const handleAIDraft = useCallback((sectionId: SectionId) => {
    if (!selectedDeal) return;
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;

    setDraftingSection(sectionId);
    setActiveSection(sectionId);
    setEditingSection(null);

    const stakeholderNames = selectedDeal.customerStakeholders
      ?.map(s => `${s.name} (${s.title})`)
      .join(', ') || 'Not specified';

    const prompt = `Write the actual proposal section content for ${selectedDeal.customerName}, NOT coaching advice or instructions. This is the "${section.title}" section.

Deal context:
- Customer: ${selectedDeal.customerName}
- Opportunity: ${selectedDeal.opportunityName}
- TCV: $${selectedDeal.tcv?.toLocaleString() ?? 'TBD'}
- Industry: ${selectedDeal.industry}
- Duration: ${selectedDeal.dealDuration}
- Region: ${selectedDeal.region}
- Service Line: ${selectedDeal.serviceLine ?? 'IT Services'}
- Billing Model: ${selectedDeal.billingModel ?? 'Time & Material'}
- Stakeholders: ${stakeholderNames}
- Additional context: ${(selectedDeal.conversationLog || '').slice(0, 800)}

Write 200-350 words of polished, professional proposal content for this section. Use specific details from the deal context above. Format with clear paragraphs. Do NOT include section headers or titles — just the body content.`;

    chatMutation.mutate(
      { message: prompt, context: { page: 'presales-studio', opportunityId: selectedDeal.id } },
      {
        onSuccess: (data) => {
          setSectionText(selectedDeal.id, sectionId, data.response);
          setDraftingSection(null);
        },
        onError: () => {
          setDraftingSection(null);
        },
      }
    );
  }, [selectedDeal, chatMutation, setSectionText]);

  const handleCopy = useCallback((text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  const handleStartEdit = useCallback((sectionId: string, text: string) => {
    setEditingSection(sectionId);
    setEditBuffer(text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingSection && selectedDealId) {
      setSectionText(selectedDealId, editingSection, editBuffer);
      setEditingSection(null);
      setEditBuffer('');
    }
  }, [editingSection, selectedDealId, editBuffer, setSectionText]);

  /* ─── KPI Aggregations ─── */
  const totalPursuitValue = pursuits.reduce((s, p) => s + (p.tcv || 0), 0);
  const negotiationCount = pursuits.filter(p => p.status === 'Negotiation').length;

  const totalEffortCost = EFFORT_ROLES.reduce((s, r) => s + r.weeks * r.rate * 40, 0);

  /* ─── Tab config ─── */
  const tabs: { id: Tab; label: string; icon: typeof Target; badge?: number }[] = [
    { id: 'pursuits', label: 'Pursuits', icon: BarChart3, badge: pursuits.length },
    { id: 'studio', label: 'Studio', icon: FileText },
    { id: 'solutioning', label: 'Solutioning', icon: Layers },
  ];

  /* ─── Render ─── */
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold text-foreground">Presales OS</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pursue &rarr; Solution &rarr; Propose &rarr; Win
          </p>
        </div>
        {selectedDeal && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
            <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
            <span className="text-xs font-medium text-foreground">{selectedDeal.customerName}</span>
            <span className="text-xs text-muted-foreground">{selectedDeal.opportunityName}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary border border-border w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-semibold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PURSUITS TAB
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'pursuits' && (
        <div className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Active Pursuits', value: String(pursuits.length), icon: Target, color: '#7c3aed' },
              { label: 'Pursuit Value', value: `$${(totalPursuitValue / 1e6).toFixed(1)}M`, icon: DollarSign, color: '#22c55e' },
              { label: 'In Negotiation', value: String(negotiationCount), icon: BarChart3, color: '#3b82f6' },
              { label: 'Proposals Due', value: String(pursuits.filter(p => {
                const close = new Date(p.expectedCloseDate);
                const now = new Date();
                const diff = (close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                return diff <= 30 && diff >= 0;
              }).length), icon: Clock, color: '#f59e0b' },
            ].map(kpi => (
              <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                </div>
                <div className="text-xl font-bold text-foreground font-display">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#7c3aed]" />
              <span className="ml-2 text-sm text-muted-foreground">Loading pipeline...</span>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && pursuits.length === 0 && (
            <div className="g-surface g-elevated p-12 text-center">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <div className="text-sm font-medium text-foreground mb-1">No active pursuits</div>
              <div className="text-xs text-muted-foreground">
                Deals in Proposal or Negotiation stages will appear here.
              </div>
            </div>
          )}

          {/* Pursuit cards */}
          {pursuits.map((deal, i) => {
            const dealDrafted = Object.keys(sectionContent[deal.id] ?? {}).length;
            const pct = Math.round((dealDrafted / SECTIONS.length) * 100);
            const closeDate = new Date(deal.expectedCloseDate);
            const daysLeft = Math.ceil((closeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={deal.id}
                className={`g-surface g-elevated p-5 transition-all cursor-pointer ${
                  selectedDealId === deal.id
                    ? '!border-[#7c3aed]/40 ring-1 ring-[#7c3aed]/10'
                    : 'hover:border-[#7c3aed]/20'
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => selectDeal(deal.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] text-xs font-bold">
                      {deal.customerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{deal.customerName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{deal.opportunityName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground font-display">
                      ${((deal.tcv || 0) / 1000).toFixed(0)}k
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      deal.status === 'Negotiation'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {deal.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Industry</span>
                    <div className="text-foreground mt-0.5">{deal.industry}</div>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Duration</span>
                    <div className="text-foreground mt-0.5">{deal.dealDuration}</div>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Owner</span>
                    <div className="text-foreground mt-0.5">{deal.primaryOwner}</div>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Close Date</span>
                    <div className={`mt-0.5 font-medium ${daysLeft <= 14 ? 'text-red-400' : daysLeft <= 30 ? 'text-amber-400' : 'text-foreground'}`}>
                      {closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {daysLeft > 0 && <span className="text-muted-foreground font-normal ml-1">({daysLeft}d)</span>}
                    </div>
                  </div>
                </div>

                {/* Proposal progress */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">Proposal</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#7c3aed',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground w-12 text-right">
                    {dealDrafted}/{SECTIONS.length}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STUDIO TAB
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'studio' && (
        <div className="space-y-4">
          {/* Deal selector bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground min-w-[280px]"
                value={selectedDealId ?? ''}
                onChange={e => {
                  if (e.target.value) selectDeal(e.target.value);
                  else setSelectedDealId(null);
                }}
              >
                <option value="">Select an opportunity...</option>
                {pursuits.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.customerName} — {p.opportunityName}
                  </option>
                ))}
              </select>
              {selectedDeal && (
                <span className="text-xs text-muted-foreground">
                  ${((selectedDeal.tcv || 0) / 1000).toFixed(0)}k &middot; {selectedDeal.status} &middot; {selectedDeal.industry}
                </span>
              )}
            </div>
            {selectedDealId && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-32 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[#7c3aed]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground">
                    {draftedCount}/{SECTIONS.length} sections
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* No deal selected */}
          {!selectedDeal && (
            <div className="g-surface g-elevated p-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-30" />
              <div className="text-sm font-medium text-foreground mb-1">Select an opportunity to begin</div>
              <div className="text-xs text-muted-foreground mb-4">
                Choose from your active pursuits to start drafting a proposal.
              </div>
              <button
                onClick={() => setActiveTab('pursuits')}
                className="px-4 py-2 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors font-medium inline-flex items-center gap-1.5"
              >
                View Pursuits <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Studio editor layout */}
          {selectedDeal && (
            <div className="flex gap-4" style={{ minHeight: '65vh' }}>
              {/* Left: Section navigator */}
              <div className="w-64 shrink-0 space-y-1">
                {SECTIONS.map((sec, i) => {
                  const hasDraft = !!(sectionContent[selectedDeal.id]?.[sec.id]);
                  const isActive = activeSection === sec.id;
                  const isDrafting = draftingSection === sec.id;

                  return (
                    <button
                      key={sec.id}
                      onClick={() => { setActiveSection(sec.id); setEditingSection(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isActive
                          ? 'bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-foreground'
                          : 'hover:bg-card text-muted-foreground hover:text-foreground border border-transparent'
                      }`}
                    >
                      <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <sec.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#7c3aed]' : ''}`} />
                      <span className="text-xs font-medium flex-1 truncate">{sec.title}</span>
                      {isDrafting && <Loader2 className="h-3 w-3 animate-spin text-[#7c3aed] shrink-0" />}
                      {hasDraft && !isDrafting && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}

                {/* Draft All button */}
                <div className="pt-3 mt-3 border-t border-border">
                  <button
                    onClick={() => {
                      const undrafted = SECTIONS.filter(s => !(sectionContent[selectedDeal.id]?.[s.id]));
                      if (undrafted.length > 0) handleAIDraft(undrafted[0].id);
                    }}
                    disabled={chatMutation.isPending || draftedCount === SECTIONS.length}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-40"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {draftedCount === SECTIONS.length ? 'All Sections Drafted' : 'AI Draft Next Section'}
                  </button>
                </div>
              </div>

              {/* Right: Content area */}
              <div className="flex-1 g-surface g-elevated p-6 overflow-auto">
                {(() => {
                  const sec = SECTIONS.find(s => s.id === activeSection)!;
                  const content = sectionContent[selectedDeal.id]?.[activeSection] ?? '';
                  const isDrafting = draftingSection === activeSection;
                  const isEditing = editingSection === activeSection;

                  return (
                    <div className="space-y-4">
                      {/* Section header */}
                      <div className="flex items-center justify-between pb-4 border-b border-border">
                        <div>
                          <h2 className="text-base font-display font-semibold text-foreground">{sec.title}</h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedDeal.customerName} &middot; {selectedDeal.opportunityName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {content && !isEditing && (
                            <>
                              <button
                                onClick={() => handleCopy(content, activeSection)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copiedSection === activeSection ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                {copiedSection === activeSection ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                onClick={() => handleStartEdit(activeSection, content)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                              <button
                                onClick={() => handleAIDraft(activeSection)}
                                disabled={chatMutation.isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                              >
                                <RotateCcw className="h-3 w-3" /> Regenerate
                              </button>
                            </>
                          )}
                          {!content && !isDrafting && (
                            <button
                              onClick={() => handleAIDraft(activeSection)}
                              disabled={chatMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-40"
                            >
                              {chatMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                              AI Draft
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content body */}
                      {isDrafting && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <Loader2 className="h-6 w-6 animate-spin text-[#7c3aed] mb-3" />
                          <div className="text-sm text-foreground font-medium">Drafting {sec.title}...</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Using deal context for {selectedDeal.customerName}
                          </div>
                        </div>
                      )}

                      {!isDrafting && !content && !isEditing && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <sec.icon className="h-8 w-8 text-muted-foreground opacity-20 mb-3" />
                          <div className="text-sm text-muted-foreground mb-1">No content yet</div>
                          <div className="text-xs text-muted-foreground">
                            Click &quot;AI Draft&quot; to generate this section using deal context, or start typing.
                          </div>
                        </div>
                      )}

                      {isEditing && (
                        <div className="space-y-3">
                          <textarea
                            value={editBuffer}
                            onChange={e => setEditBuffer(e.target.value)}
                            className="w-full h-[400px] p-4 rounded-lg bg-card border border-[#7c3aed]/20 text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                            placeholder="Write your proposal content here..."
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => { setEditingSection(null); setEditBuffer(''); }}
                              className="px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {editBuffer.split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                        </div>
                      )}

                      {!isDrafting && content && !isEditing && (
                        <div className="prose-sm">
                          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {content}
                          </div>
                          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {content.split(/\s+/).filter(Boolean).length} words
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              AI-generated &middot; Review before use
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SOLUTIONING TAB
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'solutioning' && (
        <div className="space-y-5">
          {/* Deal context */}
          {selectedDeal ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
              <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
              <span className="text-xs font-medium text-foreground">{selectedDeal.customerName}</span>
              <span className="text-xs text-muted-foreground">{selectedDeal.opportunityName}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                TCV: ${((selectedDeal.tcv || 0) / 1000).toFixed(0)}k
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-secondary border border-border text-center">
              <span className="text-xs text-muted-foreground">Select a pursuit to see deal-specific solutioning.</span>
            </div>
          )}

          {/* Effort Estimator */}
          <div className="g-surface g-elevated p-6">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Effort Estimator
            </div>
            <div className="grid grid-cols-5 gap-3">
              {EFFORT_ROLES.map(item => (
                <div key={item.role} className="p-4 rounded-lg bg-card border border-border text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">{item.role}</div>
                  <div className="text-xl font-bold text-foreground font-display">{item.weeks}w</div>
                  <div className="text-[10px] text-muted-foreground mt-1">${item.rate}/hr</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between p-4 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
              <span className="text-xs text-foreground font-medium">Total Estimated Effort</span>
              <span className="text-sm font-bold text-[#7c3aed] font-display">
                {EFFORT_ROLES.reduce((s, r) => s + r.weeks, 0)} person-weeks &middot; ~${(totalEffortCost / 1000).toFixed(0)}K
              </span>
            </div>
          </div>

          {/* Team Composition */}
          <div className="g-surface g-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Team Composition
              </div>
              <a
                href="/pricing"
                className="flex items-center gap-1 text-[10px] text-[#7c3aed] font-medium hover:underline"
              >
                Detailed Pricing <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="space-y-2">
              {EFFORT_ROLES.map(role => {
                const costTotal = role.weeks * role.rate * 40;
                const pctOfTotal = Math.round((costTotal / totalEffortCost) * 100);

                return (
                  <div key={role.role} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                    <div className="w-8 h-8 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] text-[10px] font-bold">
                      {role.role.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">{role.role}</div>
                      <div className="text-[10px] text-muted-foreground">{role.weeks} weeks @ ${role.rate}/hr</div>
                    </div>
                    <div className="w-24">
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#7c3aed]"
                          style={{ width: `${pctOfTotal}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground w-16 text-right font-display">
                      ${(costTotal / 1000).toFixed(0)}K
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Link to pricing page */}
          <div className="flex justify-center">
            <a
              href="/pricing"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border hover:border-[#7c3aed]/20 transition-colors"
            >
              <DollarSign className="h-4 w-4 text-[#7c3aed]" />
              <span className="text-xs font-medium text-foreground">Open Full Pricing Calculator</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
