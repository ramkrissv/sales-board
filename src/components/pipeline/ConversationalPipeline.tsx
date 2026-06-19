'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useOpportunities } from '@/lib/store';
import {
  MessageCircle, Send, Sparkles, Loader2, X, ChevronUp,
  ArrowRight, Check, AlertTriangle, Zap,
} from 'lucide-react';

interface PendingAction {
  id: string;
  type: 'move_stage' | 'update_tcv' | 'set_close_date' | 'add_task' | 'general';
  description: string;
  dealId?: string;
  dealName?: string;
  params?: Record<string, any>;
  confirmed: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: PendingAction[];
  timestamp: Date;
}

const SUGGESTIONS = [
  'Move Stellantis to Negotiation',
  'Show me deals closing this month',
  'What needs attention today?',
  'Set TCV for Acme to $500k',
  'Which deals are stale?',
];

export function ConversationalPipeline({ onDealClick }: { onDealClick: (id: string) => void }) {
  const { opportunities, refreshOpportunities } = useOpportunities();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.ai.chat.useMutation();
  const updateOppMutation = trpc.opportunity.update.useMutation();

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Parse AI response to extract actions ──
  function parseActions(response: string, userMessage: string): PendingAction[] {
    const actions: PendingAction[] = [];
    const lowerMsg = userMessage.toLowerCase();
    const lowerResp = response.toLowerCase();

    // Match deal names from opportunities
    for (const opp of opportunities) {
      const name = opp.customerName.toLowerCase();
      const oppName = opp.opportunityName.toLowerCase();

      // Stage move detection
      const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
      for (const stage of stages) {
        if (lowerMsg.includes(name) && lowerMsg.includes(stage.toLowerCase()) &&
            (lowerMsg.includes('move') || lowerMsg.includes('advance') || lowerMsg.includes('change') || lowerMsg.includes('set stage'))) {
          actions.push({
            id: `action-${Date.now()}-${opp.id}`,
            type: 'move_stage',
            description: `Move ${opp.customerName} to ${stage}`,
            dealId: opp.id,
            dealName: opp.customerName,
            params: { status: stage },
            confirmed: false,
          });
        }
      }

      // TCV update detection
      const tcvMatch = lowerMsg.match(/(?:set|update|change)\s+(?:tcv|value|amount)\s+(?:for\s+)?(?:.*?)(?:to\s+)?\$?([\d,]+)k?/i)
        || lowerMsg.match(/\$?([\d,]+)k?\s+(?:for|to)\s+/i);
      if (tcvMatch && (lowerMsg.includes(name) || lowerMsg.includes(oppName))) {
        let amount = parseInt(tcvMatch[1].replace(/,/g, ''));
        if (lowerMsg.includes('k') && amount < 10000) amount *= 1000;
        actions.push({
          id: `action-${Date.now()}-tcv-${opp.id}`,
          type: 'update_tcv',
          description: `Update ${opp.customerName} TCV to $${amount.toLocaleString()}`,
          dealId: opp.id,
          dealName: opp.customerName,
          params: { tcv: amount },
          confirmed: false,
        });
      }
    }

    return actions;
  }

  // ── Execute a confirmed action ──
  async function executeAction(action: PendingAction) {
    if (!action.dealId || action.confirmed) return;
    setExecutingAction(action.id);

    try {
      if (action.type === 'move_stage') {
        await updateOppMutation.mutateAsync({
          id: action.dealId,
          status: action.params?.status,
        });
      } else if (action.type === 'update_tcv') {
        await updateOppMutation.mutateAsync({
          id: action.dealId,
          tcv: action.params?.tcv,
        });
      }

      // Mark action as confirmed
      setMessages(prev => prev.map(msg => ({
        ...msg,
        actions: msg.actions?.map(a =>
          a.id === action.id ? { ...a, confirmed: true } : a
        ),
      })));

      // Refresh pipeline data
      refreshOpportunities();

      // Add success message
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Done! ${action.description}`,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Failed: ${err.message}`,
        timestamp: new Date(),
      }]);
    }
    setExecutingAction(null);
  }

  // ── Send message ──
  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || processing) return;

    setInput('');
    setProcessing(true);

    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    }]);

    try {
      const result = await chatMutation.mutateAsync({
        message: msg + '\n\nContext: The user is on the Pipeline kanban board. They may want to move deals, update values, or get quick insights. Be very concise — max 2-3 sentences. If they want to take an action (move deal, update TCV, etc.), confirm what you understood.',
        context: { page: 'pipeline-chat' },
      });

      const actions = parseActions(result.response, msg);

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        actions: actions.length > 0 ? actions : undefined,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    }

    setProcessing(false);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setExpanded(false);
    }
  };

  // ── Collapsed bar ──
  if (!expanded) {
    return (
      <div className="fixed bottom-0 left-0 right-0 md:left-52 z-30">
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-lg hover:border-[#7c3aed]/30 hover:shadow-xl transition-all group"
            style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
          >
            <div className="w-8 h-8 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center group-hover:bg-[#7c3aed]/20 transition-colors">
              <MessageCircle className="h-4 w-4 text-[#7c3aed]" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1 text-left">
              Type a command... <span className="text-[10px] opacity-60">"Move Stellantis to Negotiation"</span>
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-[#7c3aed]" />
              AI Pipeline
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded chat panel ──
  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-52 z-30">
      <div className="max-w-6xl mx-auto px-4 pb-4">
        <div className="rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 -8px 40px rgba(124,58,237,0.1)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: 'var(--g-line)' }}>
            <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center">
              <MessageCircle className="h-3.5 w-3.5 text-[#7c3aed]" />
            </div>
            <span className="text-xs font-semibold text-foreground flex-1">Pipeline Command Bar</span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-[#7c3aed]" />
              AI-powered
            </div>
            <button onClick={() => setExpanded(false)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages (scrollable, max height) */}
          <div className="max-h-[280px] overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 py-1">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleSend(s)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] bg-secondary/50 border border-border/50 text-muted-foreground hover:text-foreground hover:border-[#7c3aed]/30 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id}>
                <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#7c3aed] text-white rounded-tr-sm'
                      : 'bg-secondary/50 text-foreground rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>

                {/* Action cards */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 space-y-1.5 ml-2">
                    {msg.actions.map(action => (
                      <div key={action.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                          action.confirmed
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-card border-[#7c3aed]/20 text-foreground hover:border-[#7c3aed]/40'
                        }`}>
                        {action.confirmed ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                        )}
                        <span className="flex-1">{action.description}</span>
                        {!action.confirmed && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => executeAction(action)}
                              disabled={executingAction === action.id}
                              className="px-2.5 py-1 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {executingAction === action.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>Execute</>
                              )}
                            </button>
                            {action.dealId && (
                              <button
                                onClick={() => onDealClick(action.dealId!)}
                                className="px-2 py-1 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                              >
                                View
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {processing && (
              <div className="flex gap-2">
                <div className="px-3 py-2 rounded-xl bg-secondary/50 text-[13px] text-muted-foreground rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 text-[#7c3aed] animate-spin" />
                  Processing...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a pipeline command..."
              className="flex-1 px-3 py-2 text-sm bg-secondary/30 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40 transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || processing}
              className="p-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white transition-colors disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
