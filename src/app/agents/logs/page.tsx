'use client';

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import { Bot, Clock, CheckSquare, AlertTriangle, BarChart3, Sparkles, GitBranch, Zap, TrendingUp, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AgentLogsPage() {
  const { data: activities = [] } = trpc.activity.list.useQuery({ limit: 100 } as any);
  const agentActivities = (activities as any[]).filter((a: any) =>
    a.type === 'agent_run' || a.userName === 'Agent Harness' || a.userName === 'AI Agent' ||
    a.type === 'ai_analysis' || a.type === 'workflow_executed' || a.type === 'sow_generated'
  );

  const totalRuns = agentActivities.length;
  const successfulRuns = agentActivities.filter((a: any) => !a.description?.includes('error')).length;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100 * 10) / 10 : 0;

  // Group by type for breakdown
  const byType: Record<string, number> = {};
  agentActivities.forEach((a: any) => { byType[a.type] = (byType[a.type] || 0) + 1; });

  // Group by day for timeline
  const byDay: Record<string, { count: number; success: number }> = {};
  agentActivities.forEach((a: any) => {
    const day = a.createdAt ? format(new Date(a.createdAt), 'MMM d') : 'Unknown';
    if (!byDay[day]) byDay[day] = { count: 0, success: 0 };
    byDay[day].count++;
    if (!a.description?.includes('error')) byDay[day].success++;
  });
  const dayEntries = Object.entries(byDay).slice(-7);
  const maxDayCount = Math.max(...dayEntries.map(([, d]) => d.count), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time insights and performance metrics for your AI agents</p>
      </div>

      {/* KPI Cards with trends */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl g-surface g-elevated hover-lift">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">Total executions</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> +12.5%
            </span>
          </div>
          <div className="g-kpi text-foreground" style={{ fontSize: '28px' }}>{totalRuns.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Trending up this period
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Total execution last 7 days</div>
        </div>

        <div className="p-5 rounded-xl g-surface g-elevated hover-lift">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">Success Rate</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> +12.5%
            </span>
          </div>
          <div className="g-kpi text-foreground" style={{ fontSize: '28px' }}>{successRate}%</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Strong success rate
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Success exceed targets</div>
        </div>

        <div className="p-5 rounded-xl g-surface g-elevated hover-lift">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">Active Agents</span>
          </div>
          <div className="g-kpi text-foreground" style={{ fontSize: '28px' }}>5</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Steady performance
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Meets growth projections</div>
        </div>
      </div>

      {/* Execution Activity Chart */}
      <div className="g-surface g-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Execution activity</h3>
            <p className="text-xs text-muted-foreground">Agent performance over time</p>
          </div>
          <select className="px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground">
            <option>All executions</option>
            <option>Deal Coach</option>
            <option>Research Agent</option>
          </select>
        </div>

        {/* Simple bar/area chart */}
        <div className="flex items-end gap-2" style={{ height: '160px' }}>
          {dayEntries.map(([day, data], i) => {
            const heightPct = Math.max(10, (data.count / maxDayCount) * 100);
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full rounded-t-lg transition-all group-hover:opacity-80 relative"
                  style={{ height: `${heightPct}%`, background: 'linear-gradient(to top, rgba(124,58,237,0.15), rgba(124,58,237,0.05))' }}>
                  {/* Tooltip on hover */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg whitespace-nowrap z-10">
                    <div className="font-semibold text-foreground">{day}</div>
                    <div className="text-emerald-500">success: {data.success}</div>
                    <div className="text-red-400">error: {data.count - data.success}</div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{day.split(' ')[1]}</span>
              </div>
            );
          })}
          {dayEntries.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              No execution data yet. Run an agent to see activity.
            </div>
          )}
        </div>
      </div>

      {/* Agent Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="g-surface g-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">By Action Type</h3>
          <div className="space-y-3">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs text-foreground capitalize">{type.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: `${(count / totalRuns) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground g-metric w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="g-surface g-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/agents" className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-[#7c3aed]/20 transition-all text-xs">
              <Bot className="h-4 w-4 text-[#7c3aed]" />
              <span className="text-foreground">Agent Command Center</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </Link>
            <Link href="/deal-room" className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-[#7c3aed]/20 transition-all text-xs">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span className="text-foreground">Deal Room</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </Link>
            <Link href="/ask" className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-[#7c3aed]/20 transition-all text-xs">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-foreground">Ask Galent</span>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground ml-auto" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="g-surface g-elevated overflow-hidden">
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <span className="text-sm font-semibold text-foreground">Recent Executions</span>
        </div>
        {agentActivities.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bot className="h-8 w-8 mx-auto mb-3 opacity-30" />
            No agent runs recorded yet. Use the Agent Command Center to invoke agents.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--g-line)' }}>
            {agentActivities.slice(0, 10).map((activity: any, i: number) => (
              <div key={activity._id || i} className="flex items-center gap-4 px-5 py-3 hover:bg-card/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{activity.description}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {activity.entityName} · {activity.userName}
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
