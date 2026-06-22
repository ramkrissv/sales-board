'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Sparkles, Loader2, Zap, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

const STATUSES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
const INDUSTRIES = ['Healthcare', 'Financial Services', 'Hospitality', 'Professional Services', 'Manufacturing', 'Retail', 'Technology', 'Energy', 'Telecom', 'Government', 'Other'];
const REGIONS = ['North America', 'Europe', 'APAC', 'Latin America', 'Middle East'];
const SERVICE_LINES = ['Legacy Modernization', 'Data & AI', 'Testing & QA', 'Managed Services / SRE', 'Cloud & Infrastructure', 'Staffing'];

const DEAL_CLASSIFICATIONS = [
  { code: 'NN', label: 'New-New', description: 'New client, new engagement', color: 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/30' },
  { code: 'EN', label: 'Existing-New', description: 'Existing client, new service', color: 'bg-[#11A7A0]/10 text-[#11A7A0] border-[#11A7A0]/30' },
  { code: 'EE', label: 'Existing-Existing', description: 'Existing client, renewal/expand', color: 'bg-[var(--g-green)]/10 text-[var(--g-green)] border-[var(--g-green)]/30' },
];

// Lifecycle Phase removed — Stage field is sufficient for deal progression

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewDealModal({ isOpen, onClose }: NewDealModalProps) {
  const utils = trpc.useUtils();
  const { data: accounts = [] } = trpc.account.list.useQuery();
  const { data: engagementTypes = [] } = trpc.engagementType.list.useQuery();
  const aiSuggestMutation = trpc.ai.chat.useMutation();
  const createMutation = trpc.opportunity.create.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); onClose(); setForm(defaultForm); setAiSuggestions(null); },
  });

  const defaultForm = {
    customerName: '',
    opportunityName: '',
    status: 'Discovery',
    tcv: 0,
    dealDuration: '12 months',
    expectedCloseDate: '',
    startDate: new Date().toISOString().split('T')[0],
    primaryOwner: 'Sreeram',
    industry: '',
    region: 'North America',
    source: 'Direct',
    serviceLine: '',
    engagementType: '',
    pricingModel: '',
    margin: 28,
    accountId: '',
    dealClassification: 'NN',
    clientType: 'New',
  };

  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiCreateMode, setAiCreateMode] = useState(true);
  const [aiCreateText, setAiCreateText] = useState('');
  const aiCreateMutation = trpc.ai.chat.useMutation();

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Auto-set classification when customer name matches existing accounts
  useEffect(() => {
    if (form.customerName && accounts.length > 0) {
      const match = accounts.find((a: any) => a.companyName?.toLowerCase() === form.customerName.toLowerCase());
      if (match) {
        update('clientType', 'Existing');
        update('dealClassification', 'EN'); // Existing client, assume new service
        if ((match as any)._id) update('accountId', (match as any)._id);
      } else {
        update('clientType', 'New');
        update('dealClassification', 'NN');
      }
    }
  }, [form.customerName]); // eslint-disable-line

  const selectedET = useMemo(
    () => engagementTypes.find((et: any) => et.name === form.engagementType),
    [engagementTypes, form.engagementType]
  );

  // Set default close date 90 days out
  useEffect(() => {
    if (!form.expectedCloseDate) {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      update('expectedCloseDate', d.toISOString().split('T')[0]);
    }
  }, []); // eslint-disable-line

  // AI Assist — suggest fields based on customer name and opportunity
  const handleAiAssist = () => {
    if (!form.customerName) return;
    setShowAiPanel(true);
    aiSuggestMutation.mutate({
      message: `For a sales opportunity at "${form.customerName}" named "${form.opportunityName || 'TBD'}":
1. Suggest the most likely industry
2. Suggest a service line (IT Services, AI & Data, Cloud, Application Dev, Managed Services, Staffing, Consulting)
3. Suggest a TCV range based on the company size (if known)
4. Suggest the right lifecycle phase (opportunity/pursuit/deal)
5. Suggest 2-3 tags/categories
6. Suggest a realistic close date (months from now)

Return as JSON: { industry, serviceLine, suggestedTcv, phase, tags, closeMonths, reasoning }`,
      context: { page: 'new-deal-assist' },
    }, {
      onSuccess: (data) => {
        try {
          const json = data.response.match(/\{[\s\S]*\}/)?.[0];
          if (json) setAiSuggestions(JSON.parse(json));
          else setAiSuggestions({ reasoning: data.response });
        } catch {
          setAiSuggestions({ reasoning: data.response });
        }
      },
    });
  };

  const applyAiSuggestion = (field: string, value: any) => {
    update(field, value);
  };

  // AI Create — describe deal in natural language, AI fills all fields
  const handleAiCreate = () => {
    if (!aiCreateText.trim()) return;
    aiCreateMutation.mutate({
      message: `Extract opportunity details from this description. Fill in as many fields as possible.

"${aiCreateText}"

Return JSON only:
{"customerName":"","opportunityName":"","industry":"","region":"North America","serviceLine":"","tcv":0,"status":"Discovery","source":"Direct","primaryOwner":"","dealDuration":"12 months","margin":28,"dealClassification":"NN","reasoning":"1 sentence why"}`,
      context: { page: 'ai-create-deal' },
    }, {
      onSuccess: (data) => {
        try {
          const raw = data.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          let parsed;
          try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
          if (parsed) {
            if (parsed.customerName) update('customerName', parsed.customerName);
            if (parsed.opportunityName) update('opportunityName', parsed.opportunityName);
            if (parsed.industry) update('industry', parsed.industry);
            if (parsed.region) update('region', parsed.region);
            if (parsed.serviceLine) update('serviceLine', parsed.serviceLine);
            if (parsed.tcv) update('tcv', parsed.tcv);
            if (parsed.status) update('status', parsed.status);
            if (parsed.source) update('source', parsed.source);
            if (parsed.primaryOwner) update('primaryOwner', parsed.primaryOwner);
            if (parsed.dealDuration) update('dealDuration', parsed.dealDuration);
            if (parsed.margin) update('margin', parsed.margin);
            if (parsed.dealClassification) update('dealClassification', parsed.dealClassification);
            setAiSuggestions({ reasoning: parsed.reasoning || 'Fields populated from your description.' });
            setShowAiPanel(true);
            setAiCreateMode(false);
          }
        } catch {
          setError('Could not parse AI response. Try being more specific.');
        }
      },
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.customerName || !form.opportunityName || !form.primaryOwner) {
      setError('Customer name, opportunity name, and owner are required.');
      return;
    }

    const year = new Date().getFullYear();
    const prefix = form.dealClassification || 'NN';
    const id = `${prefix}-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    try {
      await createMutation.mutateAsync({
        id,
        customerName: form.customerName,
        opportunityName: form.opportunityName,
        status: form.status,
        tcv: Number(form.tcv) || 0,
        dealDuration: form.dealDuration,
        expectedCloseDate: new Date(form.expectedCloseDate).toISOString(),
        startDate: new Date(form.startDate).toISOString(),
        primaryOwner: form.primaryOwner,
        industry: form.industry || 'Technology',
        region: form.region,
        source: form.source,
        serviceLine: form.serviceLine || 'IT Services',
        billingModel: form.engagementType || undefined,
        engagementType: form.engagementType || undefined,
        margin: Number(form.margin) || 0,
        salesPOCs: [],
        presalesPOCs: [],
        customTags: [],
        conversationLog: '',
        activityLog: [],
        ...(form.accountId ? { accountId: form.accountId } : {}),
        // lifecyclePhase derived from stage, not a separate field
        clientType: form.clientType || 'New',
      } as any);
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl card-enter">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card border-b border-border rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-foreground font-display">New Opportunity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Create and classify a new pipeline entry</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleAiAssist} disabled={!form.customerName || aiSuggestMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] font-medium hover:bg-[#7c3aed]/20 transition-colors disabled:opacity-50" title="AI will suggest fields based on customer name">
              {aiSuggestMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI Assist
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-[var(--g-red-soft)] border border-[var(--g-red)]/30 text-[var(--g-red)] text-sm">{error}</div>
          )}

          {/* AI Create Mode — natural language input */}
          {aiCreateMode && (
            <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                <span className="text-sm font-semibold text-[#7c3aed]">AI Create</span>
                <span className="text-[10px] text-muted-foreground">Describe the opportunity and AI fills the form</span>
              </div>
              <textarea
                value={aiCreateText}
                onChange={e => setAiCreateText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40 resize-none"
                placeholder="e.g., New opportunity with HNI — Matt Baker wants agentforce consulting, 1-2 people team, potential $150k, 6 month engagement..."
              />
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleAiCreate}
                  disabled={!aiCreateText.trim() || aiCreateMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
                  {aiCreateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {aiCreateMutation.isPending ? 'Extracting...' : 'Create with AI'}
                </button>
                <button type="button" onClick={() => setAiCreateMode(false)}
                  className="text-xs text-muted-foreground hover:text-foreground">
                  Skip — use form
                </button>
              </div>
            </div>
          )}

          {/* AI Suggestions Banner */}
          {aiSuggestions && showAiPanel && (
            <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 space-y-2 animate-flow-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
                  <span className="text-xs font-semibold text-[#7c3aed]">AI Suggestions</span>
                </div>
                <button onClick={() => setShowAiPanel(false)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
              </div>
              {aiSuggestions.reasoning && <p className="text-xs text-muted-foreground">{aiSuggestions.reasoning}</p>}
              <div className="flex flex-wrap gap-1.5">
                {aiSuggestions.industry && (
                  <button type="button" onClick={() => applyAiSuggestion('industry', aiSuggestions.industry)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg bg-card border border-border text-foreground hover:border-[#7c3aed]/30 transition-colors">
                    <Zap className="h-2.5 w-2.5 text-[#7c3aed]" /> Industry: {aiSuggestions.industry}
                  </button>
                )}
                {aiSuggestions.serviceLine && (
                  <button type="button" onClick={() => applyAiSuggestion('serviceLine', aiSuggestions.serviceLine)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg bg-card border border-border text-foreground hover:border-[#7c3aed]/30 transition-colors">
                    <Zap className="h-2.5 w-2.5 text-[#7c3aed]" /> Service: {aiSuggestions.serviceLine}
                  </button>
                )}
                {aiSuggestions.suggestedTcv && (
                  <button type="button" onClick={() => applyAiSuggestion('tcv', aiSuggestions.suggestedTcv)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg bg-card border border-border text-foreground hover:border-[#7c3aed]/30 transition-colors">
                    <Zap className="h-2.5 w-2.5 text-[#7c3aed]" /> TCV: ${(aiSuggestions.suggestedTcv/1000).toFixed(0)}k
                  </button>
                )}
                {/* Lifecycle phase removed — stage is sufficient */}
              </div>
            </div>
          )}

          {/* Deal Classification — EE / EN / NN */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Deal Classification</label>
            <div className="grid grid-cols-3 gap-2">
              {DEAL_CLASSIFICATIONS.map(cls => (
                <button key={cls.code} type="button" onClick={() => update('dealClassification', cls.code)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.dealClassification === cls.code ? cls.color + ' border' : 'bg-card border-border hover:border-[#7c3aed]/20'
                  }`}>
                  <div className="text-sm font-bold">{cls.code}</div>
                  <div className="text-[10px] font-medium mt-0.5">{cls.label}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{cls.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Customer + Opportunity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Customer / Account *</label>
              <input value={form.customerName} onChange={e => update('customerName', e.target.value)} list="account-list"
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40"
                placeholder="Company name" />
              <datalist id="account-list">
                {accounts.map((a: any) => <option key={a._id} value={a.companyName} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Opportunity Name *</label>
              <input value={form.opportunityName} onChange={e => update('opportunityName', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40"
                placeholder="e.g., AI Platform Deployment" />
            </div>
          </div>

          {/* Owner + Stage + Classification indicator */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Owner *</label>
              <input value={form.primaryOwner} onChange={e => update('primaryOwner', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40"
                placeholder="e.g., Sreeram" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Stage</label>
              <select value={form.status} onChange={e => update('status', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Source</label>
              <select value={form.source} onChange={e => update('source', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                {['Direct', 'Partner', 'Referral', 'Inbound', 'Event', 'Campaign'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* TCV + Margin + Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">TCV ($)</label>
              <input type="number" value={form.tcv} onChange={e => update('tcv', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40 g-metric"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Margin %</label>
              <input type="number" value={form.margin} onChange={e => update('margin', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40"
                min={0} max={100} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Duration</label>
              <select value={form.dealDuration} onChange={e => update('dealDuration', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                {['3 months', '6 months', '9 months', '12 months', '18 months', '24 months', '36 months'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Industry + Region + Service Line */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Industry</label>
              <select value={form.industry} onChange={e => update('industry', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Region</label>
              <select value={form.region} onChange={e => update('region', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Service Line</label>
              <select value={form.serviceLine} onChange={e => update('serviceLine', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                <option value="">Select service</option>
                {SERVICE_LINES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Engagement Type + Account */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Engagement Type</label>
              <select value={form.engagementType} onChange={e => update('engagementType', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                <option value="">Select type</option>
                <option value="Fixed Price">Fixed Price</option>
                <option value="T&M">T&M</option>
                <option value="Product Licensing">Product Licensing</option>
                <option value="Outcome-Based">Outcome-Based</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Account</label>
              <select value={form.accountId} onChange={e => update('accountId', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                <option value="">No account linked</option>
                {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.companyName}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Expected Close</label>
              <input type="date" value={form.expectedCloseDate} onChange={e => update('expectedCloseDate', e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-between items-center pt-3 border-t border-border">
            <div className="text-[10px] text-muted-foreground">
              ID: <span className="font-mono text-foreground">{form.dealClassification}-{new Date().getFullYear()}-****</span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors disabled:opacity-50">
                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {createMutation.isPending ? 'Creating...' : 'Create Opportunity'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
