'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Magnet, Plus, Sparkles, Brain, Globe, Mail, ArrowRightCircle,
  XCircle, Loader2, ChevronRight, Building2, User, Tag, Zap,
  X, Send, Copy, Edit3, Check, Mic, MessageSquarePlus, ListFilter,
} from 'lucide-react';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';

/* ── stage / type / source colour maps ── */
const stageConfig: Record<string, { color: string; bg: string; label: string }> = {
  signal:       { color: 'text-zinc-400',   bg: 'bg-zinc-500/15',    label: 'Signal' },
  qualify:      { color: 'text-blue-400',   bg: 'bg-blue-500/15',    label: 'Qualify' },
  enrich:       { color: 'text-amber-400',  bg: 'bg-amber-500/15',   label: 'Enrich' },
  engage:       { color: 'text-purple-400', bg: 'bg-purple-500/15',  label: 'Engage' },
  convert:      { color: 'text-emerald-400',bg: 'bg-emerald-500/15', label: 'Convert' },
  converted:    { color: 'text-emerald-400',bg: 'bg-emerald-500/15', label: 'Converted' },
  disqualified: { color: 'text-red-400',    bg: 'bg-red-500/15',     label: 'Disqualified' },
};

const typeConfig: Record<string, { color: string; label: string }> = {
  product:  { color: 'bg-blue-500/15 text-blue-400',    label: 'Product' },
  services: { color: 'bg-purple-500/15 text-purple-400', label: 'Services' },
  combined: { color: 'bg-emerald-500/15 text-emerald-400', label: 'Combined' },
};

const sourceConfig: Record<string, string> = {
  inbound: 'bg-green-500/15 text-green-400',
  outbound: 'bg-blue-500/15 text-blue-400',
  referral: 'bg-amber-500/15 text-amber-400',
  event: 'bg-pink-500/15 text-pink-400',
  ai_detected: 'bg-purple-500/15 text-purple-400',
  partner: 'bg-cyan-500/15 text-cyan-400',
};

const PIPELINE_STAGES = ['signal', 'qualify', 'enrich', 'engage', 'convert'] as const;

/* ── Quick capture chip templates ── */
const QUICK_CHIPS = [
  { label: 'Conference meeting', prefix: 'Met someone at a conference. ' },
  { label: 'Referral from...', prefix: 'Got a referral from a colleague. ' },
  { label: 'Inbound inquiry', prefix: 'Received an inbound inquiry. ' },
  { label: 'Cold outreach response', prefix: 'Got a response to our cold outreach. ' },
];

/* ── AI Extraction prompt ── */
const EXTRACT_PROMPT = `You are a lead data extraction assistant. Extract structured lead data from the user's natural language description. Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "company": "string — company name",
  "contactName": "string — full name of the contact",
  "contactTitle": "string — job title",
  "contactEmail": "string — email address or empty string",
  "productInterest": ["array of product interests mentioned"],
  "serviceInterest": ["array of service interests mentioned"],
  "estimatedValue": number or null,
  "source": "one of: inbound, outbound, referral, event, ai_detected, partner",
  "industry": "string — industry if mentioned or best guess",
  "notes": "string — any additional context not captured above",
  "type": "one of: product, services, combined — infer from interests"
}

Rules:
- If a field is not mentioned, use empty string or empty array as appropriate
- For estimatedValue, parse "$500K" as 500000, "$2M" as 2000000, etc. Use null if not mentioned.
- For source, infer from context: "conference" / "event" / "tradeshow" = "event", "referred by" = "referral", "reached out to us" = "inbound", "cold email reply" = "outbound"
- Be generous with productInterest and serviceInterest — extract all technology/service keywords mentioned
- Return ONLY the JSON object, nothing else.

User text:`;

/* ── Extracted lead shape ── */
interface ExtractedLead {
  company: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  productInterest: string[];
  serviceInterest: string[];
  estimatedValue: number | null;
  source: string;
  industry: string;
  notes: string;
  type: string;
}

/* ── Score Ring ── */
function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(score, 100) / 100;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-zinc-700/40" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="fill-foreground text-[10px] font-bold">{score}</text>
    </svg>
  );
}

/* ── Main Page ── */
export default function LeadsPage() {
  const utils = trpc.useUtils();
  const { data: leads = [], isLoading } = trpc.lead.list.useQuery(undefined);
  const createMutation = trpc.lead.create.useMutation({ onSuccess: () => utils.lead.list.invalidate() });
  const qualifyMutation = trpc.lead.qualify.useMutation({ onSuccess: () => utils.lead.list.invalidate() });
  const enrichMutation = trpc.lead.enrich.useMutation({ onSuccess: () => utils.lead.list.invalidate() });
  const draftMutation = trpc.lead.draftOutreach.useMutation({ onSuccess: () => utils.lead.list.invalidate() });
  const convertMutation = trpc.lead.convertToOpportunity.useMutation({ onSuccess: () => utils.lead.list.invalidate() });
  const disqualifyMutation = trpc.lead.disqualify.useMutation({ onSuccess: () => utils.lead.list.invalidate() });
  const updateMutation = trpc.lead.update.useMutation({ onSuccess: () => utils.lead.list.invalidate() });
  const aiChatMutation = trpc.ai.chat.useMutation();

  /* ── Mode toggle ── */
  const [activeMode, setActiveMode] = useState<'capture' | 'pipeline'>('capture');

  /* ── Capture mode state ── */
  const [captureText, setCaptureText] = useState('');
  const [extractedLead, setExtractedLead] = useState<ExtractedLead | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Pipeline mode state (existing) ── */
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [outreachModal, setOutreachModal] = useState<{ lead: any; draft: string; editing: boolean } | null>(null);
  const [editedDraft, setEditedDraft] = useState('');
  const [copied, setCopied] = useState(false);

  // Add lead form state (legacy, kept for pipeline mode)
  const [form, setForm] = useState({
    company: '', contactName: '', contactTitle: '', contactEmail: '',
    source: 'inbound' as const, type: 'product' as const,
    productInterest: '' , serviceInterest: '', estimatedValue: '',
    notes: '', industry: '',
  });

  const filtered = (leads as any[]).filter((l: any) =>
    typeFilter === 'all' || l.type === typeFilter
  );

  // Stage counts
  const stageCounts: Record<string, number> = {};
  for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
  (leads as any[]).forEach((l: any) => {
    if (stageCounts[l.stage] !== undefined) stageCounts[l.stage]++;
  });
  const totalActive = (leads as any[]).filter((l: any) => l.stage !== 'disqualified' && l.stage !== 'converted').length;
  const qualifiedCount = (leads as any[]).filter((l: any) => ['qualify', 'enrich', 'engage', 'convert'].includes(l.stage)).length;
  const engagedCount = (leads as any[]).filter((l: any) => ['engage', 'convert'].includes(l.stage)).length;
  const convertedCount = (leads as any[]).filter((l: any) => l.stage === 'converted').length;

  /* ── AI Extraction ── */
  async function handleExtract() {
    if (!captureText.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractedLead(null);
    try {
      const result = await aiChatMutation.mutateAsync({
        message: `${EXTRACT_PROMPT}\n\n${captureText}`,
        context: { page: 'leads' },
      });
      const raw = (result as any).response || '';
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned) as ExtractedLead;
      setExtractedLead(parsed);
    } catch (e: any) {
      console.error('AI extraction failed:', e);
      setExtractError(e?.message || 'Failed to extract lead data. Please try again or add more detail.');
    }
    setIsExtracting(false);
  }

  /* ── Save extracted lead ── */
  async function handleSaveExtracted() {
    if (!extractedLead) return;
    try {
      await createMutation.mutateAsync({
        company: extractedLead.company,
        contactName: extractedLead.contactName,
        contactTitle: extractedLead.contactTitle,
        contactEmail: extractedLead.contactEmail,
        source: (extractedLead.source || 'inbound') as any,
        type: (extractedLead.type || 'product') as any,
        productInterest: extractedLead.productInterest || [],
        serviceInterest: extractedLead.serviceInterest || [],
        estimatedValue: extractedLead.estimatedValue || undefined,
        notes: extractedLead.notes || undefined,
        industry: extractedLead.industry || undefined,
        tags: [],
      });
      setActionSuccess('Lead created successfully from AI capture!');
      setTimeout(() => setActionSuccess(null), 4000);
      // Reset capture state
      setCaptureText('');
      setExtractedLead(null);
      setShowVoice(false);
    } catch (e: any) {
      setActionError(e?.message || 'Failed to create lead');
      setTimeout(() => setActionError(null), 6000);
    }
  }

  /* ── Voice transcript handler ── */
  function handleVoiceTranscript(transcript: string) {
    setCaptureText(prev => prev ? `${prev}\n${transcript}` : transcript);
    setShowVoice(false);
    // Auto-focus the textarea
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  /* ── Quick chip handler ── */
  function handleQuickChip(prefix: string) {
    setCaptureText(prefix);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = prefix.length;
        textareaRef.current.selectionEnd = prefix.length;
      }
    }, 50);
  }

  /* ── Pipeline mode actions (existing) ── */
  async function handleAiAction(leadId: string, action: string) {
    setProcessingId(leadId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const actionLabels: Record<string, string> = {
        qualify: 'AI Qualification complete',
        enrich: 'Company enrichment complete',
        draft: 'Outreach draft generated',
        convert: 'Converted to opportunity',
      };
      if (action === 'qualify') await qualifyMutation.mutateAsync({ id: leadId });
      else if (action === 'enrich') await enrichMutation.mutateAsync({ id: leadId });
      else if (action === 'draft') {
        const result = await draftMutation.mutateAsync({ id: leadId });
        // Open the outreach modal with the generated draft
        const lead = (leads as any[]).find((l: any) => (l._id?.toString?.() ?? l._id) === leadId);
        if (result && (result as any).outreachDraft) {
          setOutreachModal({ lead, draft: (result as any).outreachDraft, editing: false });
          setEditedDraft((result as any).outreachDraft);
        }
      }
      else if (action === 'convert') await convertMutation.mutateAsync({ id: leadId });
      setActionSuccess(actionLabels[action] || 'Action complete');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      const msg = e?.message || 'Action failed — check that ANTHROPIC_API_KEY is set in .env.local';
      setActionError(msg);
      setTimeout(() => setActionError(null), 6000);
    }
    setProcessingId(null);
  }

  async function handleSubmitLead(e: React.FormEvent) {
    e.preventDefault();
    await createMutation.mutateAsync({
      company: form.company,
      contactName: form.contactName,
      contactTitle: form.contactTitle,
      contactEmail: form.contactEmail,
      source: form.source,
      type: form.type,
      productInterest: form.productInterest ? form.productInterest.split(',').map(s => s.trim()).filter(Boolean) : [],
      serviceInterest: form.serviceInterest ? form.serviceInterest.split(',').map(s => s.trim()).filter(Boolean) : [],
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      notes: form.notes || undefined,
      industry: form.industry || undefined,
      tags: [],
    });
    setForm({ company: '', contactName: '', contactTitle: '', contactEmail: '', source: 'inbound', type: 'product', productInterest: '', serviceInterest: '', estimatedValue: '', notes: '', industry: '' });
    setShowAddForm(false);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading leads...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-emerald-500 flex items-center justify-center">
            <Magnet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Lead Generation</h1>
            <p className="text-sm text-muted-foreground">AI-powered pipeline: Signal, Qualify, Enrich, Engage, Convert</p>
          </div>
        </div>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border w-fit">
        <button
          onClick={() => setActiveMode('capture')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeMode === 'capture'
              ? 'bg-[#7c3aed] text-white shadow-lg shadow-purple-600/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Capture
        </button>
        <button
          onClick={() => setActiveMode('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeMode === 'pipeline'
              ? 'bg-[#7c3aed] text-white shadow-lg shadow-purple-600/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ListFilter className="h-4 w-4" />
          Pipeline
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{totalActive}</span>
        </button>
      </div>

      {/* Toast notifications */}
      {actionSuccess && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-[var(--g-green-soft)] border border-[var(--g-green)]/30 text-sm text-[var(--g-green)] font-medium flex items-center gap-2 animate-flow-in shadow-lg">
          <Sparkles className="h-4 w-4" /> {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-[var(--g-red-soft)] border border-[var(--g-red)]/30 text-sm text-[var(--g-red)] font-medium flex items-center gap-2 animate-flow-in shadow-lg max-w-md">
          <XCircle className="h-4 w-4 shrink-0" /> {actionError}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODE 1: CAPTURE — Conversational Lead Capture ──────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeMode === 'capture' && (
        <div className="space-y-5">
          {/* Conversational input card */}
          <div className="rounded-2xl g-surface g-elevated overflow-hidden">
            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                <span className="text-sm font-semibold text-foreground">Describe the lead naturally</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Tell the AI about a new lead in your own words. Include names, companies, interests, budget — anything you know. The AI will structure it for you.
              </p>

              {/* Quick capture chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleQuickChip(chip.prefix)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors border border-[#7c3aed]/20"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat-like text input */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && captureText.trim()) {
                      handleExtract();
                    }
                  }}
                  placeholder={`"Met Sarah Chen, VP Engineering at Acme Corp at the AWS re:Invent conference. They're looking to modernize their legacy Java apps to cloud-native. Budget around $500K, timeline Q1 2027. She gave me her card - sarah.chen@acme.com"`}
                  rows={4}
                  className="w-full px-4 py-3 pr-24 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/60 resize-y focus:outline-none focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/20 transition-all leading-relaxed"
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                  <button
                    onClick={() => setShowVoice(!showVoice)}
                    className={`p-2 rounded-lg transition-colors ${
                      showVoice
                        ? 'bg-[#7c3aed] text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                    title="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={!captureText.trim() || isExtracting}
                    className="px-3 py-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isExtracting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isExtracting ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-muted-foreground">
                  {captureText.trim() ? `${captureText.trim().split(/\s+/).length} words` : ''}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {String.fromCodePoint(8984)}+Enter to extract
                </span>
              </div>
            </div>

            {/* Voice recorder panel */}
            {showVoice && (
              <div className="px-6 pb-5 border-t border-border/50 mt-2 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="h-3.5 w-3.5 text-[#7c3aed]" />
                  <span className="text-xs font-medium text-foreground">Voice Capture</span>
                  <span className="text-[10px] text-muted-foreground">Record and the transcript will be added to the description above</span>
                </div>
                <VoiceRecorder
                  onTranscript={handleVoiceTranscript}
                  isProcessing={isExtracting}
                />
              </div>
            )}
          </div>

          {/* Extraction error */}
          {extractError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-3 flex items-start gap-3">
              <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">Extraction failed</p>
                <p className="text-xs text-red-400/70 mt-0.5">{extractError}</p>
              </div>
            </div>
          )}

          {/* ── Extracted Lead Preview Card ── */}
          {extractedLead && (
            <div className="rounded-2xl g-surface g-elevated overflow-hidden border border-[#7c3aed]/20">
              <div className="px-6 py-4 border-b border-border/50 bg-[#7c3aed]/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                    <span className="text-sm font-semibold text-foreground">AI-Extracted Lead Preview</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/15 text-[#7c3aed] font-medium">
                    Review & edit before saving
                  </span>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Editable fields in a clean grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Company</label>
                    <input
                      value={extractedLead.company}
                      onChange={(e) => setExtractedLead({ ...extractedLead, company: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                  </div>

                  {/* Contact Name */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Contact Name</label>
                    <input
                      value={extractedLead.contactName}
                      onChange={(e) => setExtractedLead({ ...extractedLead, contactName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Title</label>
                    <input
                      value={extractedLead.contactTitle}
                      onChange={(e) => setExtractedLead({ ...extractedLead, contactTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      type="email"
                      value={extractedLead.contactEmail}
                      onChange={(e) => setExtractedLead({ ...extractedLead, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Source</label>
                    <select
                      value={extractedLead.source}
                      onChange={(e) => setExtractedLead({ ...extractedLead, source: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    >
                      <option value="inbound">Inbound</option>
                      <option value="outbound">Outbound</option>
                      <option value="referral">Referral</option>
                      <option value="event">Event</option>
                      <option value="ai_detected">AI Detected</option>
                      <option value="partner">Partner</option>
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Type</label>
                    <select
                      value={extractedLead.type}
                      onChange={(e) => setExtractedLead({ ...extractedLead, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    >
                      <option value="product">Product</option>
                      <option value="services">Services</option>
                      <option value="combined">Combined</option>
                    </select>
                  </div>

                  {/* Estimated Value */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Estimated Value ($)</label>
                    <input
                      type="number"
                      value={extractedLead.estimatedValue ?? ''}
                      onChange={(e) => setExtractedLead({ ...extractedLead, estimatedValue: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Industry</label>
                    <input
                      value={extractedLead.industry}
                      onChange={(e) => setExtractedLead({ ...extractedLead, industry: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                  </div>
                </div>

                {/* Interests (displayed as editable tags) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Product Interests</label>
                    <input
                      value={extractedLead.productInterest.join(', ')}
                      onChange={(e) => setExtractedLead({ ...extractedLead, productInterest: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Comma-separated"
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                    {extractedLead.productInterest.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {extractedLead.productInterest.map((p) => (
                          <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Service Interests</label>
                    <input
                      value={extractedLead.serviceInterest.join(', ')}
                      onChange={(e) => setExtractedLead({ ...extractedLead, serviceInterest: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Comma-separated"
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/50"
                    />
                    {extractedLead.serviceInterest.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {extractedLead.serviceInterest.map((s) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {extractedLead.notes && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Notes</label>
                    <textarea
                      value={extractedLead.notes}
                      onChange={(e) => setExtractedLead({ ...extractedLead, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-[#7c3aed]/50 resize-y"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveExtracted}
                    disabled={createMutation.isPending || !extractedLead.company || !extractedLead.contactName}
                    className="px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-purple-600/20"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {createMutation.isPending ? 'Creating...' : 'Create Lead'}
                  </button>
                  <button
                    onClick={() => handleExtract()}
                    disabled={isExtracting}
                    className="px-4 py-2.5 rounded-xl g-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Re-extract
                  </button>
                  <button
                    onClick={() => { setExtractedLead(null); setCaptureText(''); }}
                    className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recent leads quick view */}
          {(leads as any[]).length > 0 && !extractedLead && (
            <div className="rounded-xl g-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] tracking-wide uppercase text-muted-foreground g-section-label">Recent Leads</span>
                <button onClick={() => setActiveMode('pipeline')} className="text-[11px] text-[#7c3aed] hover:underline flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                {(leads as any[]).slice(0, 3).map((lead: any) => {
                  const stage = stageConfig[lead.stage] || stageConfig.signal;
                  return (
                    <div key={lead._id?.toString?.() ?? lead._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-card/50 transition-colors">
                      <ScoreRing score={lead.score || 0} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{lead.company}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${stage.bg} ${stage.color}`}>{stage.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{lead.contactName}</span>
                      </div>
                      {lead.estimatedValue && (
                        <span className="text-xs text-muted-foreground font-mono">${(lead.estimatedValue / 1000).toFixed(0)}k</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODE 2: PIPELINE — Existing Lead List ─────────────── */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeMode === 'pipeline' && (
        <div className="space-y-6">
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Leads', value: totalActive, color: 'text-foreground' },
              { label: 'Qualified', value: qualifiedCount, color: 'text-blue-400' },
              { label: 'Engaged', value: engagedCount, color: 'text-purple-400' },
              { label: 'Converted', value: convertedCount, color: 'text-emerald-400' },
            ].map(k => (
              <div key={k.label} className="rounded-xl g-surface px-4 py-3">
                <div className="text-[11px] tracking-wide uppercase text-muted-foreground g-section-label">{k.label}</div>
                <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* ── Pipeline Funnel ── */}
          <div className="rounded-xl g-surface p-4">
            <div className="text-[11px] tracking-wide uppercase text-muted-foreground mb-3 g-section-label">Pipeline Funnel</div>
            <div className="flex items-end gap-2 h-24">
              {PIPELINE_STAGES.map((s, i) => {
                const count = stageCounts[s] || 0;
                const maxCount = Math.max(...Object.values(stageCounts), 1);
                const heightPct = Math.max(20, (count / maxCount) * 100);
                const cfg = stageConfig[s];
                return (
                  <div key={s} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-xs font-bold ${cfg.color}`}>{count}</span>
                    <div className="w-full relative flex items-end justify-center" style={{ height: '60px' }}>
                      <div className={`w-full rounded-t-lg transition-all duration-700 ${cfg.bg}`}
                        style={{ height: `${heightPct}%`, minHeight: '8px' }} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{cfg.label}</span>
                      {i < PIPELINE_STAGES.length - 1 && <ChevronRight className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Filters + Add button ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {['all', 'product', 'services', 'combined'].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    typeFilter === t ? 'bg-[#7c3aed] text-white' : 'g-surface text-muted-foreground hover:text-foreground'
                  }`}>
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">{filtered.length} leads</span>
            </div>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium flex items-center gap-2 transition-colors">
              <Plus className="h-4 w-4" /> Add Lead
            </button>
          </div>

          {/* ── Add Lead Form ── */}
          {showAddForm && (
            <form onSubmit={handleSubmitLead} className="rounded-xl g-surface p-5 space-y-4">
              <div className="text-sm font-medium text-foreground">New Lead</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <input placeholder="Company *" required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <input placeholder="Contact Name *" required value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <input placeholder="Title" value={form.contactTitle} onChange={e => setForm(f => ({ ...f, contactTitle: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <input placeholder="Email *" type="email" required value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as any }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-purple-500/50">
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                  <option value="referral">Referral</option>
                  <option value="event">Event</option>
                  <option value="ai_detected">AI Detected</option>
                  <option value="partner">Partner</option>
                </select>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-purple-500/50">
                  <option value="product">Product</option>
                  <option value="services">Services</option>
                  <option value="combined">Combined</option>
                </select>
                <input placeholder="Product Interest (comma-sep)" value={form.productInterest} onChange={e => setForm(f => ({ ...f, productInterest: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <input placeholder="Service Interest (comma-sep)" value={form.serviceInterest} onChange={e => setForm(f => ({ ...f, serviceInterest: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <input placeholder="Estimated Value ($)" type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <input placeholder="Industry" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
                <input placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="col-span-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create Lead'}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg g-surface text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ── Lead Cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((lead: any) => {
              const id = lead._id?.toString?.() ?? lead._id;
              const isProcessing = processingId === id;
              const isExpanded = expandedId === id;
              const stage = stageConfig[lead.stage] || stageConfig.signal;
              const tp = typeConfig[lead.type] || typeConfig.product;
              const src = sourceConfig[lead.source] || 'bg-zinc-500/15 text-zinc-400';

              // Determine the AI action for this stage
              let aiAction: { label: string; icon: any; action: string; aiGlow: boolean } | null = null;
              if (lead.stage === 'signal') aiAction = { label: 'AI Qualify', icon: Brain, action: 'qualify', aiGlow: true };
              else if (lead.stage === 'qualify') aiAction = { label: 'AI Enrich', icon: Globe, action: 'enrich', aiGlow: true };
              else if (lead.stage === 'enrich') aiAction = { label: 'Draft Outreach', icon: Mail, action: 'draft', aiGlow: true };
              else if (lead.stage === 'engage') aiAction = { label: 'Convert to Project', icon: ArrowRightCircle, action: 'convert', aiGlow: false };

              return (
                <div key={id} className="rounded-xl g-surface g-elevated overflow-hidden transition-all duration-300">
                  <div className="px-5 py-4">
                    {/* Top row: company + badges */}
                    <div className="flex items-start gap-3">
                      <ScoreRing score={lead.score || 0} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">{lead.company}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tp.color}`}>{tp.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stage.bg} ${stage.color}`}>{stage.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${src}`}>{lead.source}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{lead.contactName}</span>
                          {lead.contactTitle && <span className="text-zinc-600">- {lead.contactTitle}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{lead.contactEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interests */}
                    {(lead.productInterest?.length > 0 || lead.serviceInterest?.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {lead.productInterest?.map((p: string) => (
                          <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{p}</span>
                        ))}
                        {lead.serviceInterest?.map((s: string) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{s}</span>
                        ))}
                      </div>
                    )}

                    {/* AI Qualification reasoning */}
                    {lead.aiQualification?.reasoning && (
                      <div className="mt-3 p-2 rounded-lg bg-card/50 border border-border/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="h-3 w-3 text-purple-400" />
                          <span className="text-[10px] uppercase tracking-wide text-purple-400 font-medium">AI Assessment</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{lead.aiQualification.reasoning}</p>
                        <div className="flex gap-3 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">ICP: <span className="text-foreground font-medium">{lead.aiQualification.icpFit}</span></span>
                          <span className="text-[10px] text-muted-foreground">Budget: <span className="text-foreground font-medium">{lead.aiQualification.budgetSignal}</span></span>
                          <span className="text-[10px] text-muted-foreground">Timing: <span className="text-foreground font-medium">{lead.aiQualification.timing}</span></span>
                        </div>
                      </div>
                    )}

                    {/* Enrichment data */}
                    {lead.enrichedAt && (
                      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                        {lead.industry && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.industry}</span>}
                        {lead.employeeCount && <span>{lead.employeeCount.toLocaleString()} employees</span>}
                        {lead.annualRevenue && <span>${(lead.annualRevenue / 1000000).toFixed(1)}M revenue</span>}
                        {lead.techStack?.length > 0 && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{lead.techStack.join(', ')}</span>}
                      </div>
                    )}

                    {/* Outreach draft preview */}
                    {lead.outreachDraft && (
                      <div className="mt-3">
                        <button onClick={() => setExpandedId(isExpanded ? null : id)}
                          className="text-[10px] uppercase tracking-wide text-purple-400 font-medium flex items-center gap-1 hover:text-purple-300 transition-colors">
                          <Mail className="h-3 w-3" />
                          {isExpanded ? 'Hide' : 'View'} Outreach Draft
                        </button>
                        {isExpanded && (
                          <div className="mt-2 p-3 rounded-lg bg-card/60 border border-purple-500/20 text-xs text-muted-foreground whitespace-pre-wrap">
                            {lead.outreachDraft}
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => {
                                updateMutation.mutate({ id, outreachStatus: 'sent' } as any);
                              }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors">
                                Approve &amp; Send
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Converted badge */}
                    {lead.stage === 'converted' && lead.convertedToOpportunityId && (
                      <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                        <ArrowRightCircle className="h-3.5 w-3.5" />
                        Converted to {lead.convertedToOpportunityId}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      {aiAction && lead.stage !== 'converted' && lead.stage !== 'disqualified' && (
                        <button
                          onClick={() => handleAiAction(id, aiAction!.action)}
                          disabled={isProcessing}
                          className={`px-3 py-1.5 rounded-lg text-white text-[11px] font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                            aiAction.aiGlow
                              ? 'bg-[#7c3aed] hover:bg-[#6d28d9] shadow-purple-600/20'
                              : 'bg-emerald-600 hover:bg-emerald-500'
                          } ${isProcessing && aiAction.aiGlow ? 'shadow-lg shadow-purple-500/40 animate-pulse' : ''}`}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <aiAction.icon className="h-3.5 w-3.5" />
                          )}
                          {isProcessing ? 'Processing...' : aiAction.label}
                        </button>
                      )}
                      {lead.stage !== 'converted' && lead.stage !== 'disqualified' && (
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for disqualification:');
                            if (reason) disqualifyMutation.mutate({ id, reason });
                          }}
                          className="px-3 py-1.5 rounded-lg g-surface text-[11px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5" /> Disqualify
                        </button>
                      )}
                    </div>

                    {/* Tags */}
                    {lead.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {lead.tags.map((t: string) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Zap className="h-10 w-10 mb-3 text-zinc-600" />
              <p className="text-sm">No leads found. Add one to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Outreach Draft Modal ── */}
      {outreachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOutreachModal(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl g-surface g-elevated shadow-2xl flex flex-col card-enter">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-foreground font-display">Outreach Draft</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  To: {outreachModal.lead?.contactName} ({outreachModal.lead?.contactEmail}) · {outreachModal.lead?.company}
                </p>
              </div>
              <button onClick={() => setOutreachModal(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Email preview / editor */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Subject line */}
              <div className="mb-4">
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Subject</label>
                <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-foreground">
                  Re: {outreachModal.lead?.company} — {(outreachModal.lead?.productInterest || outreachModal.lead?.serviceInterest || ['Partnership'])[0]}
                </div>
              </div>

              {/* Recipients */}
              <div className="flex gap-4 mb-4 text-xs">
                <div>
                  <span className="text-muted-foreground">To: </span>
                  <span className="text-foreground">{outreachModal.lead?.contactName} &lt;{outreachModal.lead?.contactEmail}&gt;</span>
                </div>
                <div>
                  <span className="text-muted-foreground">From: </span>
                  <span className="text-foreground">Galent Sales Team</span>
                </div>
              </div>

              {/* Email body */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Body</label>
                  <button onClick={() => { setOutreachModal({ ...outreachModal, editing: !outreachModal.editing }); if (!outreachModal.editing) setEditedDraft(outreachModal.draft); }}
                    className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:underline">
                    <Edit3 className="h-3 w-3" /> {outreachModal.editing ? 'Preview' : 'Edit'}
                  </button>
                </div>
                {outreachModal.editing ? (
                  <textarea value={editedDraft} onChange={e => setEditedDraft(e.target.value)} rows={12}
                    className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl text-foreground leading-relaxed resize-y font-sans focus:outline-none focus:border-[#7c3aed]/40" />
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {outreachModal.editing ? editedDraft : outreachModal.draft}
                  </div>
                )}
              </div>

              {/* AI suggestions */}
              <div className="p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                  <span className="text-[10px] font-semibold text-[#7c3aed]">AI Notes</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This email is personalized for {outreachModal.lead?.contactName} ({outreachModal.lead?.contactTitle}) at {outreachModal.lead?.company}.
                  {outreachModal.lead?.aiQualification?.reasoning && ` AI Assessment: ${outreachModal.lead.aiQualification.reasoning}`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-secondary/20">
              <button onClick={() => {
                navigator.clipboard.writeText(outreachModal.editing ? editedDraft : outreachModal.draft);
                setCopied(true); setTimeout(() => setCopied(false), 2000);
              }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="h-3.5 w-3.5 text-[var(--g-green)]" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setOutreachModal(null)}
                  className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={() => {
                  const leadId = outreachModal.lead?._id?.toString?.() ?? outreachModal.lead?._id;
                  if (leadId) updateMutation.mutate({ id: leadId, outreachStatus: 'sent' } as any);
                  setOutreachModal(null);
                  setActionSuccess('Outreach approved & sent');
                  setTimeout(() => setActionSuccess(null), 3000);
                }}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs rounded-lg bg-[var(--g-green)] text-white font-medium hover:opacity-90 transition-colors">
                  <Send className="h-3.5 w-3.5" /> Approve & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
