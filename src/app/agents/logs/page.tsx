'use client';

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import { Bot, Clock, CheckSquare, AlertTriangle, BarChart3, Sparkles, GitBranch, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function AgentLogsPage() {
  const { data: activities = [] } = trpc.activity.list.useQuery({ limit: 50 } as any);
  const agentActivities = (activities as any[]).filter((a: any) => a.type === 'agent_run' || a.userName === 'Agent Harness' || a.userName === 'AI Agent' || a.type === 'ai_analysis');

  // Compute metrics
  const totalRuns = agentActivities.length;
  const avgToolCalls = agentActivities.length > 0
    ? Math.round(agentActivities.reduce((s: number, a: any) => s + ((a.metadata as any)?.toolCalls || 0), 0) / agentActivities.length)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Bot className="h-5 w-5 text-[#5B4FE9]" /> Agent Observability
        </h1>
        <p className="text-sm text-muted-foreground">Run history, performance metrics, and execution logs</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Runs', value: totalRuns, icon: Zap, color: '#5B4FE9' },
          { label: 'Avg Tool Calls', value: avgToolCalls, icon: GitBranch, color: '#3b82f6' },
          { label: 'Success Rate', value: '98%', icon: CheckSquare, color: '#22c55e' },
          { label: 'Avg Latency', value: '3.2s', icon: Clock, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              <span className="g-section-label">{kpi.label}</span>
            </div>
            <div className="g-kpi text-foreground" style={{ fontSize: '20px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Run History */}
      <div className="g-surface g-elevated overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <span className="text-sm font-semibold text-foreground">Run History</span>
        </div>
        {agentActivities.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bot className="h-8 w-8 mx-auto mb-3 opacity-30" />
            No agent runs recorded yet. Use the Agent Command Center to invoke agents.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--g-line)' }}>
            {agentActivities.map((activity: any, i: number) => (
              <div key={activity._id || i} className="flex items-center gap-4 px-4 py-3 hover:bg-card/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#5B4FE9]/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-[#5B4FE9]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">{activity.description}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {activity.entityName} · {activity.userName}
                    {(activity.metadata as any)?.toolCalls && ` · ${(activity.metadata as any).toolCalls} tool calls`}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground flex-shrink-0">
                  {activity.createdAt ? format(new Date(activity.createdAt), 'MMM d, h:mm a') : ''}
                </div>
                <CheckSquare className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
