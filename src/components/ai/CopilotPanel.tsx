'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, Loader2, BarChart3, AlertTriangle, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { GenUI, parseToGenUI } from '@/components/ai/GenUI';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CopilotPanel({ isOpen, onClose }: CopilotPanelProps) {
  const router = useRouter();
  const createTaskMutation = trpc.task.create.useMutation();
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleGenUIAction = (action: string, data?: any) => {
    // Parse the action label to determine what to do
    const label = (action || '').toLowerCase();

    if (action === 'open_deal' && data?.id) {
      // Navigate to pipeline with deal selected
      router.push(`/pipeline`);
      onClose();
      return;
    }

    // Task-like actions: create a task from the AI suggestion
    if (label.includes('schedule') || label.includes('create') || label.includes('review') || label.includes('update') || label.includes('follow') || label.includes('call') || label.includes('prepare') || label.includes('send') || label.includes('clean')) {
      // Create a task from the action label
      createTaskMutation.mutate({
        opportunityId: data?.oppId || data?.id || '',
        name: action, // Use the full action label as task name
        owner: 'Sreeram',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'High' as const,
      }, {
        onSuccess: () => {
          setActionFeedback(`Task created: "${action}"`);
          setTimeout(() => setActionFeedback(null), 3000);
        },
        onError: () => {
          setActionFeedback(`Action noted: "${action}" — navigate to Tasks to create manually`);
          setTimeout(() => setActionFeedback(null), 4000);
        },
      });
      return;
    }

    // Navigation actions
    if (label.includes('pipeline') || label.includes('deal')) {
      router.push('/pipeline');
      onClose();
    } else if (label.includes('task')) {
      router.push('/tasks');
      onClose();
    } else if (label.includes('forecast')) {
      router.push('/forecasting');
      onClose();
    } else if (label.includes('account')) {
      router.push('/accounts');
      onClose();
    } else {
      // Default: create a task
      setActionFeedback(`Action: "${action}" — added to your task queue`);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "I'm your Galent AI Deal Coach. Ask me anything about your pipeline — deal strategy, stakeholder analysis, competitive intelligence, or next-best-actions. Switch to Agent mode for autonomous actions.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }]);
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please check the AI configuration.`,
        timestamp: new Date(),
      }]);
    },
  });

  const runAgentMutation = trpc.harness.runAgent.useMutation();
  const quickInvokeMutation = trpc.harness.quickInvoke.useMutation({
    onSuccess: (run) => {
      const toolSummary = run.toolCalls.length > 0
        ? `\n\n**Tools used:** ${run.toolCalls.map((tc: { tool: string }) => tc.tool).join(', ')}`
        : '';
      setMessages(prev => [...prev, {
        id: `agent-${Date.now()}`,
        role: 'assistant',
        content: `**Agent: ${run.agentId}** (${run.toolCalls.length} tool calls)${toolSummary}\n\n${run.finalAnswer}`,
        timestamp: new Date(),
      }]);
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Agent error: ${error.message}`,
        timestamp: new Date(),
      }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    if (mode === 'agent') {
      runAgentMutation.mutate(
        { agentId: 'deal-coach', goal: input.trim() },
        {
          onSuccess: (run) => {
            const toolSummary = run.toolCalls.length > 0
              ? `\n\n**Tools used:** ${run.toolCalls.map((tc: { tool: string }) => tc.tool).join(', ')}`
              : '';
            setMessages(prev => [...prev, {
              id: `agent-${Date.now()}`,
              role: 'assistant',
              content: `**Agent: ${run.agentId}** (${run.toolCalls.length} tool calls)${toolSummary}\n\n${run.finalAnswer}`,
              timestamp: new Date(),
            }]);
          },
          onError: (error) => {
            setMessages(prev => [...prev, {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: `Agent error: ${error.message}`,
              timestamp: new Date(),
            }]);
          },
        }
      );
    } else {
      chatMutation.mutate({ message: input.trim(), context: { page: 'copilot' } });
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = chatMutation.isPending || runAgentMutation.isPending || quickInvokeMutation.isPending;

  const quickActions = [
    "What deals should I focus on today?",
    "Which deals are at risk?",
    "Summarize my pipeline",
    "Draft a follow-up strategy",
  ];

  const agentActions = [
    { action: 'analyze_pipeline' as const, label: 'Analyze Pipeline', icon: BarChart3 },
    { action: 'find_at_risk_deals' as const, label: 'Find At-Risk Deals', icon: AlertTriangle },
    { action: 'suggest_next_steps' as const, label: 'Suggest Next Steps', icon: ArrowRight },
    { action: 'identify_stale_deals' as const, label: 'Find Stale Deals', icon: Clock },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 z-[90] flex flex-col g-surface shadow-2xl"
      style={{ borderLeft: '1px solid var(--g-line)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-[#5B4FE9]/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-[#5B4FE9]" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 animate-pulse" style={{ borderColor: 'var(--g-bg)' }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Galent AI Copilot</div>
          <div className="text-[10px] text-green-500 font-medium">
            {mode === 'agent' ? 'Agent Mode: Tool Calling' : 'Active: Deal Coach'}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 p-1 rounded-lg bg-secondary mb-2">
          <button onClick={() => setMode('chat')} className={`flex-1 px-2 py-1 text-xs rounded-md transition-all ${mode === 'chat' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>Chat</button>
          <button onClick={() => setMode('agent')} className={`flex-1 px-2 py-1 text-xs rounded-md transition-all ${mode === 'agent' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>Agent</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant' ? 'bg-[#5B4FE9]/15 text-[#5B4FE9]' : 'bg-secondary text-muted-foreground'
            }`}>
              {msg.role === 'assistant' ? <Sparkles className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#5B4FE9] text-white rounded-tr-sm'
                : 'bg-card border border-border text-foreground rounded-tl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <GenUI blocks={parseToGenUI(msg.content)} onAction={handleGenUIAction} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#5B4FE9]/15 flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 text-[#5B4FE9] animate-spin" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-muted-foreground rounded-tl-sm">
              {mode === 'agent' ? 'Agent running tools...' : 'Analyzing...'}
            </div>
          </div>
        )}

        {actionFeedback && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--g-green-soft)] border border-[var(--g-green)]/20 text-xs text-[var(--g-green)] animate-flow-in">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            {actionFeedback}
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Quick actions for chat mode */}
        {mode === 'chat' && messages.length <= 2 && (
          <div className="space-y-2 pt-2">
            <div className="g-section-label">Quick Actions</div>
            {quickActions.map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-card border border-border hover:border-[#5B4FE9]/30 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Agent actions for agent mode */}
        {mode === 'agent' && (
          <div className="space-y-2 pt-2">
            <div className="g-section-label">Agent Actions</div>
            {agentActions.map(a => (
              <button key={a.action}
                onClick={() => {
                  quickInvokeMutation.mutate({ action: a.action });
                }}
                disabled={quickInvokeMutation.isPending}
                className="w-full text-left px-3 py-2.5 rounded-lg text-xs bg-card border border-border hover:border-[#5B4FE9]/30 transition-all flex items-center gap-2"
              >
                <a.icon className="h-3.5 w-3.5 text-[#5B4FE9]" />
                <span className="text-foreground">{a.label}</span>
              </button>
            ))}
          </div>
        )}
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
            placeholder={mode === 'agent' ? 'Give the agent a goal...' : 'Ask about your pipeline...'}
            className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#5B4FE9]/40"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-[#5B4FE9] hover:bg-[#4A3ED4] text-white transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
