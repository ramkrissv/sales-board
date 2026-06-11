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
  const { opportunities } = useOpportunities();
  const router = useRouter();
  const createTaskMutation = trpc.task.create.useMutation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: string; content: string; timestamp: Date }[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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
    },
  });

  const handleAsk = () => {
    if (!query.trim()) return;

    // Add context about the pipeline to the query
    const context = `Current pipeline data: ${opportunities.length} total opportunities. By stage: ${
      ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(s =>
        `${s}: ${opportunities.filter(o => o.status === s).length}`
      ).join(', ')
    }. Total TCV: $${opportunities.reduce((s, o) => s + (o.tcv || 0), 0).toLocaleString()}. Top accounts: ${
      [...new Set(opportunities.map(o => o.customerName))].slice(0, 5).join(', ')
    }.`;

    setResults(prev => [...prev, { type: 'question', content: query, timestamp: new Date() }]);
    chatMutation.mutate({
      message: `${query}\n\nContext: ${context}`,
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
