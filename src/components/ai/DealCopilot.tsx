'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { GenUI, parseToGenUI } from '@/components/ai/GenUI';
import {
  Sparkles, X, Send, Bot, User, Loader2, ChevronDown,
  Maximize2, Minimize2, Lightbulb, Zap, Target, MessageCircle,
} from 'lucide-react';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DealCopilotProps {
  /** Currently viewed deal ID (from deal detail modal, etc.) */
  activeDealId?: string | null;
  /** Currently viewed deal name for display */
  activeDealName?: string | null;
}

/** Context-aware quick prompts based on current page */
function getContextPrompts(page: string, dealName?: string | null): { label: string; prompt: string; icon: any }[] {
  if (dealName) {
    return [
      { label: 'Deal strategy', prompt: `What's the best strategy to advance ${dealName}?`, icon: Target },
      { label: 'Risk analysis', prompt: `What are the risks for ${dealName} and how do I mitigate them?`, icon: Zap },
      { label: 'Next actions', prompt: `What are the immediate next actions for ${dealName}?`, icon: Lightbulb },
    ];
  }
  if (page.includes('pipeline')) {
    return [
      { label: 'Focus today', prompt: 'Which deals should I focus on today and why?', icon: Target },
      { label: 'At-risk deals', prompt: 'Which deals are at risk and what actions should I take?', icon: Zap },
      { label: 'Pipeline health', prompt: 'Give me a quick pipeline health check with action items', icon: Lightbulb },
    ];
  }
  if (page.includes('accounts')) {
    return [
      { label: 'Top accounts', prompt: 'Which accounts have the highest growth potential?', icon: Target },
      { label: 'Expansion opps', prompt: 'Where are the cross-sell and upsell opportunities?', icon: Zap },
      { label: 'Engagement gaps', prompt: 'Which accounts have engagement gaps I should address?', icon: Lightbulb },
    ];
  }
  if (page.includes('presales') || page.includes('pricing')) {
    return [
      { label: 'Win strategy', prompt: 'What pricing strategy will maximize our win rate?', icon: Target },
      { label: 'Proposal tips', prompt: 'How should I structure the current proposals for maximum impact?', icon: Zap },
      { label: 'Competitive edge', prompt: 'What competitive advantages should I highlight?', icon: Lightbulb },
    ];
  }
  // Default (home, tasks, etc.)
  return [
    { label: 'Today\'s focus', prompt: 'What should I focus on today?', icon: Target },
    { label: 'Quick wins', prompt: 'Which deals are closest to closing and what do they need?', icon: Zap },
    { label: 'Pipeline summary', prompt: 'Give me a 30-second pipeline summary', icon: Lightbulb },
  ];
}

export function DealCopilot({ activeDealId, activeDealName }: DealCopilotProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Skip on login/plugin pages
  if (pathname === '/login' || pathname.startsWith('/plugins/') || pathname.startsWith('/teams/') || pathname.startsWith('/auth/')) {
    return null;
  }

  const contextPrompts = getContextPrompts(pathname, activeDealName);
  const contextLabel = activeDealName
    ? `Focused: ${activeDealName}`
    : pathname.includes('pipeline')
      ? 'Pipeline Context'
      : pathname.includes('accounts')
        ? 'Accounts Context'
        : 'General';

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }]);
      setThinking(false);
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      }]);
      setThinking(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  // Reset messages when deal context changes
  useEffect(() => {
    if (activeDealId) {
      setMessages([]);
    }
  }, [activeDealId]);

  const handleSend = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    }]);
    setThinking(true);
    setInput('');

    chatMutation.mutate({
      message: msg,
      context: {
        opportunityId: activeDealId || undefined,
        page: pathname,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Floating button (always visible when panel is closed) ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[70] group"
        title="Open Deal Copilot"
      >
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-[#7c3aed] opacity-20 animate-ping" style={{ animationDuration: '3s' }} />
          {/* Button */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#5B4FE9] shadow-lg shadow-[#7c3aed]/30 flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          {/* Context badge */}
          {activeDealName && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <MessageCircle className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
      </button>
    );
  }

  // ── Minimized bar ──
  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-xl cursor-pointer hover:border-[#7c3aed]/40 transition-all"
        onClick={() => setMinimized(false)}>
        <div className="w-6 h-6 rounded-full bg-[#7c3aed]/20 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
        </div>
        <span className="text-xs font-medium text-foreground">Copilot</span>
        {thinking && <Loader2 className="h-3 w-3 text-[#7c3aed] animate-spin" />}
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <button onClick={(e) => { e.stopPropagation(); setOpen(false); setMinimized(false); }}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // ── Full panel ──
  return (
    <div className="fixed bottom-6 right-6 z-[70] w-[380px] max-h-[560px] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 25px 50px -12px rgba(124,58,237,0.15), 0 0 0 1px rgba(124,58,237,0.05)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#5B4FE9] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 animate-pulse" style={{ borderColor: 'var(--g-bg)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">Deal Copilot</div>
          <div className="text-[10px] text-emerald-500 font-medium truncate">{contextLabel}</div>
        </div>
        <button onClick={() => setMinimized(true)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Minimize">
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[380px]">
        {messages.length === 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center mb-3">
                <Bot className="h-6 w-6 text-[#7c3aed]" />
              </div>
              <div className="text-sm font-medium text-foreground">What can I help with?</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {activeDealName ? `Context: ${activeDealName}` : 'I have full pipeline context'}
              </div>
            </div>
            <div className="space-y-1.5">
              {contextPrompts.map(q => (
                <button
                  key={q.label}
                  onClick={() => handleSend(q.prompt)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left bg-secondary/40 border border-border/50 hover:border-[#7c3aed]/30 hover:bg-[#7c3aed]/5 transition-all"
                >
                  <q.icon className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                  <span className="text-foreground">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-[#7c3aed]/15 text-[#7c3aed]' : 'bg-secondary text-muted-foreground'
            }`}>
              {msg.role === 'assistant' ? <Sparkles className="h-3 w-3" /> : <User className="h-3 w-3" />}
            </div>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#7c3aed] text-white rounded-tr-sm'
                : 'bg-secondary/50 border border-border/50 text-foreground rounded-tl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <GenUI blocks={parseToGenUI(msg.content)} onAction={() => {}} />
              ) : msg.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center">
              <Loader2 className="h-3 w-3 text-[#7c3aed] animate-spin" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-[13px] text-muted-foreground rounded-tl-sm">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeDealName ? `Ask about ${activeDealName}...` : 'Ask about your pipeline...'}
            className="flex-1 px-3 py-2 text-sm bg-secondary/30 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || thinking}
            className="p-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
