'use client';

import { useState } from 'react';
import {
  Bot, Shield, Sparkles, Zap, Play, Loader2, CheckSquare,
  AlertTriangle, Search, Clock, ArrowRight, Brain, Eye,
  Mail, Target, GitBranch, ChevronDown, ChevronRight,
  BarChart3, RefreshCw, FileText, Globe, TrendingUp,
  GraduationCap, Radio, Megaphone
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { DEFAULT_AGENT_CONFIGS, AVAILABLE_MODELS } from '@/lib/ai/config';
import type { AgentConfig } from '@/lib/ai/config';
import AgentResultView from '@/components/ai/AgentResultView';
import WorkflowRunner from '@/components/ai/WorkflowRunner';
import AutonomousMode from '@/components/ai/AutonomousMode';
import SalesPlaybook from '@/components/ai/SalesPlaybook';

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
    'intake-processor': Globe, 'proposal-drafter': FileText,
    'account-intelligence': Eye, 'competitive-intel': Target,
    'growth-agent': TrendingUp, 'enablement-agent': GraduationCap,
    'signal-processor': Radio, 'campaign-agent': Megaphone,
  };
  const agentColors: Record<string, string> = {
    'deal-coach': '#7c3aed', 'research-agent': '#3b82f6', 'outreach-agent': '#22c55e',
    'hygiene-agent': '#f59e0b', 'forecast-agent': '#06b6d4',
    'intake-processor': '#8b5cf6', 'proposal-drafter': '#10b981',
    'account-intelligence': '#ec4899', 'competitive-intel': '#ef4444',
    'growth-agent': '#14b8a6', 'enablement-agent': '#f97316',
    'signal-processor': '#6366f1', 'campaign-agent': '#e11d48',
  };

  const quickActions = [
    { id: 'analyze_pipeline', label: 'Analyze Pipeline', desc: 'Full pipeline health check with recommendations', agent: 'deal-coach', icon: BarChart3 },
    { id: 'find_at_risk_deals', label: 'Find At-Risk Deals', desc: 'Identify deals with missing DMs, stale activity, or $0 TCV', agent: 'deal-coach', icon: AlertTriangle },
    { id: 'suggest_next_steps', label: 'Suggest Next Steps', desc: 'AI recommends specific actions for each active deal', agent: 'deal-coach', icon: ArrowRight },
    { id: 'identify_stale_deals', label: 'Find Stale Deals', desc: 'Deals stuck in same stage for 14+ days', agent: 'hygiene-agent', icon: Clock },
    { id: 'competitive_scan', label: 'Competitive Scan', desc: 'Find competitor mentions across all deals', agent: 'competitive-intel', icon: Shield },
    { id: 'draft_proposals', label: 'Check Proposals', desc: 'Identify deals missing proposal artifacts', agent: 'proposal-drafter', icon: FileText },
    { id: 'enrich_accounts', label: 'Enrich Accounts', desc: 'Find missing data and expansion opportunities', agent: 'account-intelligence', icon: Search },
    { id: 'process_intake', label: 'Process Queue', desc: 'Review deals needing follow-up from recent activity', agent: 'intake-processor', icon: Zap },
    { id: 'whitespace_analysis', label: 'Growth Map', desc: 'Identify whitespace and expansion plays across accounts', agent: 'growth-agent', icon: TrendingUp },
    { id: 'coaching_tips', label: 'Sales Coaching', desc: 'Get deal-specific coaching and objection handling tips', agent: 'enablement-agent', icon: GraduationCap },
    { id: 'process_signals', label: 'Process Signals', desc: 'Ingest and classify signals from Teams, Outlook, voice', agent: 'signal-processor', icon: Radio },
    { id: 'campaign_insights', label: 'Campaign Review', desc: 'Analyze outreach campaigns and optimize sequences', agent: 'campaign-agent', icon: Megaphone },
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

      {/* Autonomous Mode — AI auto-executes with approval queue */}
      <div className="g-surface g-elevated p-5">
        <AutonomousMode />
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

      {/* Agent Run Result */}
      {(runResult || isRunning) && (
        <div className="g-surface g-elevated p-5 ai-glow animate-flow-in">
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
            <AgentResultView
              result={runResult}
              onClose={() => setRunResult(null)}
              onAgentInvoke={(agentId, goal) => handleRunAgent(agentId, goal)}
              onCreateTask={(task) => {
                // Could wire to trpc.task.create here
                setRunResult((prev: any) => prev);
              }}
            />
          )}
        </div>
      )}

      {/* Composable Workflows — multi-agent coordination */}
      <div className="g-surface g-elevated p-5">
        <WorkflowRunner />
      </div>

      {/* Sales Playbooks — stage-by-stage guided plays */}
      <div className="g-surface g-elevated p-5">
        <SalesPlaybook />
      </div>

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

      {/* Execution History — reads from telemetry */}
      <div className="g-surface g-elevated p-4">
        <div className="g-section-label mb-2 flex items-center justify-between">
          <span>AI Execution Telemetry</span>
          <span className="text-[9px] font-mono text-muted-foreground">{new Date().toISOString().slice(0, 10)}</span>
        </div>
        <AgentTelemetry />
      </div>

      {/* Platform Evals */}
      <div className="g-surface g-elevated p-4">
        <div className="g-section-label mb-2">Platform Evals</div>
        <EvalRunner />
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

function AgentTelemetry() {
  const { data: metricsData } = trpc.harness.getMetrics.useQuery();
  const { data: tracesData } = trpc.harness.getTraces.useQuery({ limit: 20 });

  const metrics = metricsData?.metrics || {};
  const traces = tracesData?.traces || [];
  const totalCalls = (metrics as any)?._totalCalls || 0;

  const metricEntries = Object.entries(metrics).filter(([k]) => !k.startsWith('_')).sort((a: any, b: any) => (b[1]?.calls || 0) - (a[1]?.calls || 0));

  return (
    <div className="space-y-3">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-lg font-bold text-[#7c3aed] font-display">{totalCalls}</div>
          <div className="text-[9px] text-muted-foreground">AI Calls Today</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-lg font-bold text-[#0FB5AD] font-display">{metricEntries.length}</div>
          <div className="text-[9px] text-muted-foreground">Active Assists</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-lg font-bold text-foreground font-display">{traces.length}</div>
          <div className="text-[9px] text-muted-foreground">Recent Traces</div>
        </div>
      </div>

      {/* Metrics by assist */}
      {metricEntries.length > 0 && (
        <div className="space-y-1">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Assist Metrics</div>
          {metricEntries.slice(0, 8).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card/50">
              <span className="text-[10px] font-mono text-[#7c3aed] flex-1 truncate">{key}</span>
              <span className="text-[9px] text-muted-foreground">{val.calls} calls</span>
              <span className="text-[9px] text-emerald-400">{val.successes}✓</span>
              {val.errors > 0 && <span className="text-[9px] text-red-400">{val.errors}✗</span>}
              <span className="text-[9px] text-muted-foreground">{val.avgLatencyMs}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent traces */}
      {traces.length > 0 && (
        <details>
          <summary className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground">
            Recent Traces ({traces.length})
          </summary>
          <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto">
            {traces.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded text-[9px] hover:bg-card/50">
                <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="font-mono text-[#7c3aed] w-32 truncate">{t.assist}</span>
                <span className="text-muted-foreground w-20 truncate">{t.model?.split('-').pop()}</span>
                <span className="text-muted-foreground">{t.latencyMs}ms</span>
                <span className="text-muted-foreground ml-auto">{new Date(t.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {totalCalls === 0 && traces.length === 0 && (
        <div className="text-center py-4 text-[10px] text-muted-foreground">
          No AI calls logged today. Invoke an agent or use any AI feature to see telemetry here.
        </div>
      )}
    </div>
  );
}

function EvalRunner() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const runEval = trpc.harness.runEval.useMutation();

  const suites = [
    { id: 'gateway' as const, label: 'AI Gateway', desc: 'Rate limits, sandbox, token budgets', color: '#7c3aed' },
    { id: 'telemetry' as const, label: 'Telemetry', desc: 'Trace logging, metrics aggregation', color: '#3b82f6' },
    { id: 'config' as const, label: 'Config', desc: 'Config files valid and loaded', color: '#f59e0b' },
    { id: 'workshop' as const, label: 'Workshop', desc: 'Scoring math, constants, AI registry', color: '#0FB5AD' },
  ];

  const handleRun = (suite: 'gateway' | 'telemetry' | 'config' | 'workshop') => {
    setRunning(suite);
    runEval.mutate({ suite }, {
      onSuccess: (data) => { setResults(prev => ({ ...prev, [suite]: data })); setRunning(null); },
      onError: () => setRunning(null),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {suites.map(s => {
          const r = results[s.id];
          return (
            <button key={s.id} onClick={() => handleRun(s.id)} disabled={running !== null}
              className="p-3 rounded-lg border border-border text-left hover:border-opacity-60 transition-all disabled:opacity-50"
              style={{ borderColor: r ? (r.score === 100 ? '#22c55e30' : '#f59e0b30') : `${s.color}20` }}>
              <div className="flex items-center gap-2 mb-1">
                {running === s.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: s.color }} />
                ) : r ? (
                  <div className={`text-sm font-bold font-display ${r.score === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{r.score}%</div>
                ) : (
                  <Play className="h-3.5 w-3.5" style={{ color: s.color }} />
                )}
                <span className="text-[10px] font-semibold text-foreground">{s.label}</span>
              </div>
              <div className="text-[9px] text-muted-foreground">{s.desc}</div>
              {r && (
                <div className="text-[9px] mt-1" style={{ color: r.score === 100 ? '#22c55e' : '#f59e0b' }}>
                  {r.passed}/{r.total} passed
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detailed results */}
      {Object.entries(results).map(([suite, data]: [string, any]) => (
        <details key={suite} open={data.score < 100}>
          <summary className="text-[9px] font-mono uppercase tracking-wider cursor-pointer hover:text-foreground" style={{ color: data.score === 100 ? '#22c55e' : '#f59e0b' }}>
            {suite}: {data.passed}/{data.total} ({data.score}%)
          </summary>
          <div className="mt-1 space-y-0.5">
            {data.results.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded text-[9px] hover:bg-card/50">
                <span className={`w-1.5 h-1.5 rounded-full ${r.pass ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="font-mono text-foreground w-48 truncate">{r.name}</span>
                <span className="text-muted-foreground truncate">{r.detail}</span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
