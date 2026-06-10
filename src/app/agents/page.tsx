'use client';

import { useState } from 'react';
import {
  Bot, Shield, Sparkles, Zap, Play, Loader2, CheckSquare,
  AlertTriangle, Search, Clock, ArrowRight, Brain, Eye,
  Mail, Target, GitBranch, ChevronDown, ChevronRight,
  BarChart3, RefreshCw
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { DEFAULT_AGENT_CONFIGS, AVAILABLE_MODELS } from '@/lib/ai/config';
import type { AgentConfig } from '@/lib/ai/config';

export default function AgentsPage() {
  const [agents] = useState<AgentConfig[]>(DEFAULT_AGENT_CONFIGS);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'history'>('overview');
  const [runResult, setRunResult] = useState<any>(null);
  const [customGoal, setCustomGoal] = useState('');

  const runAgentMutation = trpc.harness.runAgent.useMutation({
    onSuccess: (data) => setRunResult(data),
  });
  const quickInvokeMutation = trpc.harness.quickInvoke.useMutation({
    onSuccess: (data) => setRunResult(data),
  });

  const agentIcons: Record<string, any> = {
    'deal-coach': Brain, 'research-agent': Search, 'outreach-agent': Mail,
    'hygiene-agent': Shield, 'forecast-agent': BarChart3,
  };
  const agentColors: Record<string, string> = {
    'deal-coach': '#7c3aed', 'research-agent': '#3b82f6', 'outreach-agent': '#22c55e',
    'hygiene-agent': '#f59e0b', 'forecast-agent': '#06b6d4',
  };

  const quickActions = [
    { id: 'analyze_pipeline', label: 'Analyze Pipeline', desc: 'Full pipeline health check with recommendations', agent: 'deal-coach', icon: BarChart3 },
    { id: 'find_at_risk_deals', label: 'Find At-Risk Deals', desc: 'Identify deals with missing DMs, stale activity, or $0 TCV', agent: 'deal-coach', icon: AlertTriangle },
    { id: 'suggest_next_steps', label: 'Suggest Next Steps', desc: 'AI recommends specific actions for each active deal', agent: 'deal-coach', icon: ArrowRight },
    { id: 'identify_stale_deals', label: 'Find Stale Deals', desc: 'Deals stuck in same stage for 14+ days', agent: 'hygiene-agent', icon: Clock },
  ];

  const handleRunAgent = (agentId: string, goal: string) => {
    setRunResult(null);
    runAgentMutation.mutate({ agentId, goal });
  };

  const handleQuickAction = (actionId: string) => {
    setRunResult(null);
    quickInvokeMutation.mutate({ action: actionId as any });
  };

  const isRunning = runAgentMutation.isPending || quickInvokeMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#7c3aed]" /> Agent Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.filter(a => a.isActive).length} active agents · {agents.length} total · Real Claude tool-calling
          </p>
        </div>
      </div>

      {/* Quick Actions — one-click agent invocations */}
      <div>
        <div className="g-section-label mb-2 flex items-center gap-1.5">
          <Zap className="h-3 w-3" /> Quick Actions
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(action => (
            <button key={action.id}
              onClick={() => handleQuickAction(action.id)}
              disabled={isRunning}
              className="p-4 rounded-xl g-surface g-elevated hover-lift hover-glow text-left transition-all disabled:opacity-50 group">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${agentColors[action.agent]}15` }}>
                  <action.icon className="h-4 w-4" style={{ color: agentColors[action.agent] }} />
                </div>
                {isRunning && <Loader2 className="h-3 w-3 animate-spin text-[#7c3aed] ml-auto" />}
              </div>
              <div className="text-xs font-semibold text-foreground group-hover:text-[#7c3aed] transition-colors">{action.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{action.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Agent Run Result — shows reasoning + tool calls */}
      {(runResult || isRunning) && (
        <div className="g-surface g-elevated p-5 space-y-4 ai-glow animate-flow-in">
          {isRunning ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/15 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-[#7c3aed] animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#7c3aed] animate-ping" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Agent is thinking...</div>
                <div className="text-xs text-muted-foreground">Observing platform state, reasoning, and planning actions</div>
              </div>
            </div>
          ) : runResult && (
            <>
              {/* Result header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                  <span className="text-sm font-semibold text-foreground">Agent: {runResult.agentId}</span>
                  <span className="g-chip bg-emerald-500/10 text-emerald-400">{runResult.toolCalls?.length || 0} tool calls</span>
                </div>
                <button onClick={() => setRunResult(null)} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>

              {/* Visual reasoning chain — compact timeline */}
              {runResult.toolCalls?.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {runResult.toolCalls.map((call: any, i: number) => {
                    const toolLabels: Record<string, { label: string; icon: any; color: string }> = {
                      list_opportunities: { label: 'Scanned pipeline', icon: Eye, color: '#3b82f6' },
                      get_opportunity: { label: `Checked ${call.params?.opportunityId || 'deal'}`, icon: Target, color: '#7c3aed' },
                      get_forecast: { label: 'Ran forecast', icon: BarChart3, color: '#06b6d4' },
                      create_task: { label: 'Created task', icon: CheckSquare, color: '#22c55e' },
                      complete_task: { label: 'Completed task', icon: CheckSquare, color: '#10b981' },
                      update_opportunity: { label: 'Updated deal', icon: ArrowRight, color: '#f59e0b' },
                      list_stakeholders: { label: 'Checked contacts', icon: Target, color: '#8b5cf6' },
                      send_notification: { label: 'Sent alert', icon: Zap, color: '#ef4444' },
                      list_accounts: { label: 'Scanned accounts', icon: Eye, color: '#3b82f6' },
                    };
                    const info = toolLabels[call.tool] || { label: call.tool, icon: GitBranch, color: '#71717a' };
                    const Icon = info.icon;
                    return (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium reveal"
                        style={{ backgroundColor: `${info.color}10`, color: info.color, animationDelay: `${i * 0.08}s` }}>
                        <Icon className="h-3 w-3" />
                        {info.label}
                        {i < runResult.toolCalls.length - 1 && <span className="text-muted-foreground ml-1">→</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Final answer — rendered as structured cards, not raw text */}
              {runResult.finalAnswer && (
                <div className="space-y-3">
                  {/* Parse numbered items from the answer */}
                  {runResult.finalAnswer.split(/\n/).filter((l: string) => l.trim()).map((line: string, i: number) => {
                    const trimmed = line.trim();
                    // Check if it's a numbered action step
                    const isNumbered = /^\d+[\.\)]\s/.test(trimmed);
                    const isHeader = trimmed.startsWith('**') || trimmed.startsWith('#');
                    const isDealMention = /\$[\d,]+[kKmM]?/.test(trimmed);
                    const isWarning = /risk|overdue|stale|missing|urgent|critical/i.test(trimmed);
                    const isPositive = /close|won|strong|healthy|ready/i.test(trimmed);

                    if (isNumbered) {
                      const text = trimmed.replace(/^\d+[\.\)]\s*/, '');
                      return (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-all reveal ${
                          isWarning ? 'bg-amber-500/5 border-amber-500/20' :
                          isPositive ? 'bg-emerald-500/5 border-emerald-500/20' :
                          'bg-card border-border'
                        }`} style={{ animationDelay: `${i * 0.06}s` }}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                            isWarning ? 'bg-amber-500/15 text-amber-400' :
                            isPositive ? 'bg-emerald-500/15 text-emerald-400' :
                            'bg-[#7c3aed]/10 text-[#7c3aed]'
                          }`}>
                            {trimmed.match(/^\d+/)?.[0]}
                          </div>
                          <div className="flex-1 text-sm text-foreground">{text.replace(/\*\*/g, '')}</div>
                        </div>
                      );
                    }

                    if (isHeader) {
                      return <div key={i} className="g-section-label mt-2">{trimmed.replace(/[#*]/g, '').trim()}</div>;
                    }

                    if (trimmed.length > 10) {
                      return <p key={i} className="text-sm text-foreground leading-relaxed">{trimmed.replace(/\*\*/g, '')}</p>;
                    }

                    return null;
                  })}
                </div>
              )}

              {/* Expand raw reasoning */}
              {runResult.reasoning?.length > 1 && (
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Raw reasoning ({runResult.reasoning.length} steps)</summary>
                  <div className="mt-2 p-2 rounded-lg bg-card border border-border font-mono text-muted-foreground max-h-32 overflow-y-auto text-[10px]">
                    {runResult.reasoning.map((r: string, i: number) => (
                      <div key={i} className="whitespace-pre-wrap mb-1">{r.slice(0, 200)}</div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* Custom Agent Invocation */}
      <div className="g-surface g-elevated p-4">
        <div className="g-section-label mb-2">Run Custom Agent Task</div>
        <div className="flex gap-2">
          <select className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground w-48"
            value={selectedAgent?.id || 'deal-coach'}
            onChange={e => setSelectedAgent(agents.find(a => a.id === e.target.value) || null)}>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input value={customGoal} onChange={e => setCustomGoal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && customGoal.trim() && handleRunAgent(selectedAgent?.id || 'deal-coach', customGoal)}
            placeholder="Describe what you want the agent to do..."
            className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
          <button
            onClick={() => customGoal.trim() && handleRunAgent(selectedAgent?.id || 'deal-coach', customGoal)}
            disabled={isRunning || !customGoal.trim()}
            className="px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run
          </button>
        </div>
      </div>

      {/* Agent Cards */}
      <div>
        <div className="g-section-label mb-2">Agent Fleet</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map(agent => {
            const Icon = agentIcons[agent.id] || Bot;
            const color = agentColors[agent.id] || '#7c3aed';
            const isSelected = selectedAgent?.id === agent.id;

            return (
              <div key={agent.id}
                className={`p-4 rounded-xl g-surface g-elevated hover-lift transition-all ${isSelected ? '!border-[#7c3aed]/40 ring-1 ring-[#7c3aed]/10' : ''}`}>
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{agent.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{agent.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-emerald-500 animate-pulse-live' : 'bg-zinc-500'}`} />
                    <span className="text-[10px] text-muted-foreground">{agent.isActive ? 'Live' : 'Off'}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-card border border-border text-center">
                    <div className="text-[10px] text-muted-foreground">Model</div>
                    <div className="text-[10px] font-semibold text-foreground truncate">{agent.modelConfig.displayName.split(' ').pop()}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border text-center">
                    <div className="text-[10px] text-muted-foreground">Tools</div>
                    <div className="text-[10px] font-semibold text-foreground">{agent.tools.length}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border text-center">
                    <div className="text-[10px] text-muted-foreground">Temp</div>
                    <div className="text-[10px] font-semibold text-foreground">{agent.modelConfig.temperature}</div>
                  </div>
                </div>

                {/* Guardrails */}
                <div className="space-y-1.5">
                  {agent.guardrails.requireApprovalFor.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                      <Shield className="h-3 w-3 flex-shrink-0" />
                      <span>Approval: {agent.guardrails.requireApprovalFor.join(', ')}</span>
                    </div>
                  )}
                  {agent.guardrails.blockedActions.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span>Blocked: {agent.guardrails.blockedActions.join(', ')}</span>
                    </div>
                  )}
                  {agent.schedule && (
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>Schedule: {agent.schedule}</span>
                    </div>
                  )}
                </div>

                {/* Run button */}
                <button
                  onClick={() => { setSelectedAgent(agent); setCustomGoal(''); }}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: `${color}10`, color }}>
                  <Play className="h-3 w-3" /> Invoke {agent.name.split(' ')[0]}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tools Reference */}
      <details>
        <summary className="g-section-label cursor-pointer hover:text-foreground">Platform Tools (17 available)</summary>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { name: 'list_opportunities', cat: 'Pipeline' }, { name: 'get_opportunity', cat: 'Pipeline' },
            { name: 'update_opportunity', cat: 'Pipeline' }, { name: 'create_task', cat: 'Pipeline' },
            { name: 'complete_task', cat: 'Pipeline' }, { name: 'list_stakeholders', cat: 'People' },
            { name: 'add_stakeholder', cat: 'People' }, { name: 'list_accounts', cat: 'Accounts' },
            { name: 'get_account_360', cat: 'Accounts' }, { name: 'query_graph', cat: 'Intelligence' },
            { name: 'get_similar_accounts', cat: 'Intelligence' }, { name: 'generate_sow', cat: 'Documents' },
            { name: 'draft_outreach', cat: 'Documents' }, { name: 'send_notification', cat: 'System' },
            { name: 'log_activity', cat: 'System' }, { name: 'get_forecast', cat: 'Intelligence' },
            { name: 'qualify_lead', cat: 'Leads' },
          ].map(tool => (
            <div key={tool.name} className="px-3 py-2 rounded-lg bg-card border border-border text-[10px]">
              <span className="font-mono text-[#7c3aed]">{tool.name}</span>
              <span className="text-muted-foreground ml-1.5">· {tool.cat}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
