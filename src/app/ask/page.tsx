'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import { Sparkles, Send, Loader2, BarChart3, TrendingUp, Users, DollarSign, AlertTriangle, Target, Clock, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GenUI, parseToGenUI } from '@/components/ai/GenUI';
import { DealDetail } from '@/components/modals/DealDetail';

function renderMiniChart(text: string): React.ReactElement | null {
  // Detect patterns like "Stage: Number" repeated
  const patterns = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*[:=]\s*(\d+)/g);
  if (!patterns || patterns.length < 3) return null;

  const data = patterns.map(p => {
    const match = p.match(/(.+?)\s*[:=]\s*(\d+)/);
    return match ? { label: match[1].trim(), value: parseInt(match[2]) } : null;
  }).filter(Boolean) as { label: string; value: number }[];

  if (data.length < 3) return null;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="mt-3 p-3 rounded-lg bg-card border border-border">
      <div className="flex items-end gap-2" style={{ height: '80px' }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-foreground g-metric">{d.value}</span>
            <div className="w-full rounded-t-md bg-[#7c3aed]/20" style={{ height: `${(d.value / max) * 60}px` }} />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AskContent() {
  const { opportunities, refreshOpportunities } = useOpportunities();
  const router = useRouter();
  const utils = trpc.useUtils();
  const createTaskMutation = trpc.task.create.useMutation();
  const createOppMutation = trpc.opportunity.create.useMutation({
    onSuccess: (data: any) => {
      utils.opportunity.list.invalidate();
      refreshOpportunities();
      setActionFeedback(`Opportunity created: ${data.customerName || 'New Deal'} — click to open`);
      setSelectedOppId(data.id);
      setTimeout(() => setActionFeedback(null), 5000);
    },
    onError: (err) => { setActionFeedback(`Error creating opportunity: ${err.message}`); setTimeout(() => setActionFeedback(null), 5000); },
  });
  const createAccountMutation = trpc.account.create.useMutation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: string; content: string; timestamp: Date }[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [pendingDeal, setPendingDeal] = useState<any>(null); // Confirmation state

  const handleGenUIAction = (action: string, data?: any) => {
    if (action === 'open_deal' && data?.id) { setSelectedOppId(data.id); return; }
    const label = (action || '').toLowerCase();
    if (label.includes('schedule') || label.includes('create') || label.includes('review') || label.includes('update') || label.includes('call') || label.includes('send') || label.includes('draft') || label.includes('push') || label.includes('focus')) {
      createTaskMutation.mutate({
        opportunityId: data?.oppId || data?.id || '',
        name: action,
        owner: 'Sreeram',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        priority: 'High' as const,
      }, {
        onSuccess: () => { setActionFeedback(`Task created: "${action}"`); setTimeout(() => setActionFeedback(null), 3000); },
        onError: () => { setActionFeedback(`Noted: "${action}"`); setTimeout(() => setActionFeedback(null), 3000); },
      });
      return;
    }
    if (label.includes('pipeline')) { router.push('/pipeline'); }
    else if (label.includes('task')) { router.push('/tasks'); }
    else if (label.includes('forecast')) { router.push('/forecasting'); }
    else { setActionFeedback(`Action: "${action}"`); setTimeout(() => setActionFeedback(null), 3000); }
  };

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setResults(prev => [...prev, { type: 'answer', content: data.response, timestamp: new Date() }]);
      // Check if AI response contains a deal creation JSON
      tryExtractAndCreateDeal(data.response);
    },
  });

  // Detect deal creation intent from AI response — show confirmation, don't auto-create
  const tryExtractAndCreateDeal = (response: string) => {
    try {
      const match = response.match(/\{[\s\S]*?"customerName"[\s\S]*?\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        if (data.customerName && data._action === 'create_opportunity') {
          // Show confirmation card instead of auto-creating
          setPendingDeal({
            customerName: data.customerName || '',
            opportunityName: data.opportunityName || `${data.customerName} — New Opportunity`,
            primaryOwner: data.primaryOwner || data.salesRep || '',
            serviceLine: data.serviceLine || '',
            tcv: data.tcv || 0,
            stakeholders: data.stakeholders || [],
          });
        }
      }
    } catch {} // Not a deal creation response — that's fine
  };

  // Confirmed — actually create the opportunity
  const handleConfirmCreate = () => {
    if (!pendingDeal) return;
    const accountExists = opportunities.some(o => o.customerName.toLowerCase() === (pendingDeal.customerName || '').toLowerCase());
    if (!accountExists && pendingDeal.customerName) {
      createAccountMutation.mutate({ companyName: pendingDeal.customerName } as any);
    }
    createOppMutation.mutate({
      customerName: pendingDeal.customerName || 'New Lead',
      opportunityName: pendingDeal.opportunityName || `${pendingDeal.customerName} — New Opportunity`,
      status: 'Discovery',
      tcv: pendingDeal.tcv || 0,
      dealDuration: '12 months',
      expectedCloseDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      startDate: new Date().toISOString(),
      primaryOwner: pendingDeal.primaryOwner || 'Unassigned',
      industry: '',
      region: 'North America',
      source: 'Ask Galent',
      serviceLine: pendingDeal.serviceLine || undefined,
    } as any);
    setPendingDeal(null);
  };

  const handleAsk = () => {
    if (!query.trim()) return;

    // Detect create/new opportunity intent — add special instruction to AI
    const lower = query.toLowerCase();
    const isCreateIntent = /\b(new|create|add|log|register)\b.*\b(opportunity|deal|opp|lead|engagement|project)\b/i.test(lower)
      || /\b(opportunity|deal)\b.*\b(with|for|from)\b/i.test(lower);

    // Add context about the pipeline + workshops to the query
    const dealsWithWorkshops = opportunities.filter((o: any) => o.workshopId);
    const workshopContext = dealsWithWorkshops.length > 0
      ? `\nDeals with active workshops (${dealsWithWorkshops.length}): ${dealsWithWorkshops.map((o: any) => `${o.customerName} (${o.status}, workshop: ${o.workshopId})`).join(', ')}. You can reference workshop assessments, findings, and scope when answering questions about these deals.`
      : '';
    const context = `Current pipeline data: ${opportunities.length} total opportunities. By stage: ${
      ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(s =>
        `${s}: ${opportunities.filter(o => o.status === s).length}`
      ).join(', ')
    }. Total TCV: $${opportunities.reduce((s, o) => s + (o.tcv || 0), 0).toLocaleString()}. Top accounts: ${
      [...new Set(opportunities.map(o => o.customerName))].slice(0, 5).join(', ')
    }.${workshopContext}`;

    const createInstruction = isCreateIntent ? `\n\nIMPORTANT: The user wants to CREATE a new opportunity. Extract all fields from their message and include this JSON in your response (in addition to a friendly confirmation):
{"_action":"create_opportunity","customerName":"<company>","opportunityName":"<company — description>","primaryOwner":"<sales rep if mentioned>","serviceLine":"<if mentioned>","tcv":0,"status":"Discovery","stakeholders":[{"name":"<if mentioned>","role":"<if mentioned>"}]}
Make sure to populate as many fields as possible from the user's message.` : '';

    setResults(prev => [...prev, { type: 'question', content: query, timestamp: new Date() }]);
    chatMutation.mutate({
      message: `${query}\n\nContext: ${context}${createInstruction}`,
      context: { page: 'conversational-dashboard' }
    });
    setQuery('');
  };

  // Quick questions
  const quickQuestions = [
    { icon: DollarSign, q: 'What is my total pipeline value by stage?', color: 'text-[#7c3aed]' },
    { icon: TrendingUp, q: 'Which deals are most likely to close this month?', color: 'text-emerald-400' },
    { icon: AlertTriangle, q: 'Which deals are at risk and why?', color: 'text-red-400' },
    { icon: Users, q: 'Who are my top performing sales reps?', color: 'text-blue-400' },
    { icon: Target, q: 'What is the weighted forecast for this quarter?', color: 'text-amber-400' },
    { icon: Clock, q: 'Which deals have been stuck in the same stage for over 2 weeks?', color: 'text-orange-400' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Ask Galent</h1>
        <p className="text-sm text-muted-foreground mt-1">Ask anything about your pipeline in natural language</p>
      </div>

      {/* Quick questions */}
      {results.length === 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickQuestions.map((qq, i) => (
            <button key={i} onClick={() => { setQuery(qq.q); }}
              className="p-4 rounded-xl g-surface g-elevated text-left hover:!border-[#7c3aed]/30 transition-all group">
              <qq.icon className={`h-5 w-5 ${qq.color} mb-2`} />
              <div className="text-sm text-foreground group-hover:text-[#7c3aed] transition-colors">{qq.q}</div>
            </button>
          ))}
        </div>
      )}

      {/* Conversation */}
      <div className="space-y-4">
        {results.map((result, i) => (
          <div key={i} className={`flex ${result.type === 'question' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
              result.type === 'question'
                ? 'bg-[#7c3aed] text-white rounded-tr-sm'
                : 'g-surface text-foreground rounded-tl-sm'
            }`}>
              {result.type === 'answer' ? (
                <>
                  <GenUI blocks={parseToGenUI(result.content, opportunities)} onAction={handleGenUIAction} />
                  {renderMiniChart(result.content)}
                </>
              ) : (
                <span className="whitespace-pre-wrap">{result.content}</span>
              )}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-xl g-surface text-sm text-muted-foreground rounded-tl-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#7c3aed]" />
              Analyzing your pipeline...
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Card — appears when AI detects deal creation intent */}
      {pendingDeal && (
        <div className="p-5 rounded-xl bg-[#7c3aed]/5 border-2 border-[#7c3aed]/30 space-y-4 animate-flow-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#7c3aed]" />
            <span className="text-sm font-semibold text-[#7c3aed]">Confirm Opportunity Creation</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Customer Name</label>
              <input value={pendingDeal.customerName}
                onChange={e => setPendingDeal((p: any) => ({ ...p, customerName: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sales Rep / Owner</label>
              <input value={pendingDeal.primaryOwner}
                onChange={e => setPendingDeal((p: any) => ({ ...p, primaryOwner: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Opportunity Name</label>
              <input value={pendingDeal.opportunityName}
                onChange={e => setPendingDeal((p: any) => ({ ...p, opportunityName: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Service Line</label>
              <select value={pendingDeal.serviceLine}
                onChange={e => setPendingDeal((p: any) => ({ ...p, serviceLine: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
                <option value="">Select...</option>
                {['Legacy Modernization', 'Data & AI', 'Testing & QA', 'Managed Services / SRE', 'Cloud & Infrastructure', 'Staffing'].map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. TCV ($)</label>
              <input type="number" value={pendingDeal.tcv || ''}
                onChange={e => setPendingDeal((p: any) => ({ ...p, tcv: Number(e.target.value) }))}
                placeholder="0"
                className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
          </div>
          {/* Stakeholders extracted */}
          {pendingDeal.stakeholders?.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="text-[10px] uppercase tracking-wider font-semibold">Stakeholders: </span>
              {pendingDeal.stakeholders.map((s: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px]">
                  <Users className="h-2.5 w-2.5" /> {s.name}{s.role ? ` (${s.role})` : ''}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleConfirmCreate}
              disabled={!pendingDeal.customerName || createOppMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
              {createOppMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Confirm & Create Opportunity
            </button>
            <button onClick={() => setPendingDeal(null)}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {actionFeedback && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--g-green-soft)] border border-[var(--g-green)]/20 text-xs text-[var(--g-green)] animate-flow-in">
          <CheckCircle className="h-3.5 w-3.5" /> {actionFeedback}
        </div>
      )}

      <div className="sticky bottom-4">
        <div className="flex items-center gap-2 p-2 rounded-xl g-surface g-elevated">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="Ask about your pipeline, deals, forecasting..."
            className="flex-1 px-3 py-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <button onClick={handleAsk} disabled={chatMutation.isPending || !query.trim()}
            className="p-2 rounded-lg bg-[#7c3aed] text-white disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function AskPage() {
  return (
    <OpportunityProvider>
      <AskContent />
    </OpportunityProvider>
  );
}
