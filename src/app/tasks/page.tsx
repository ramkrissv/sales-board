'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { useState } from 'react';
import { CheckSquare, AlertTriangle, Search } from 'lucide-react';
import { format, isPast } from 'date-fns';

function TasksContent() {
  const { opportunities, isLoading } = useOpportunities();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'complete' | 'overdue'>('all');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading tasks...</div>;
  }

  const allTasks = opportunities.flatMap(opp =>
    (opp.subTasks || []).map(task => ({ ...task, customerName: opp.customerName, opportunityName: opp.opportunityName, oppId: opp.id }))
  );

  const filtered = allTasks.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'pending') return t.status === 'pending';
    if (statusFilter === 'complete') return t.status === 'complete';
    if (statusFilter === 'overdue') return t.status === 'pending' && isPast(new Date(t.dueDate));
    return true;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const overdue = allTasks.filter(t => t.status === 'pending' && isPast(new Date(t.dueDate)));
  const pending = allTasks.filter(t => t.status === 'pending');
  const complete = allTasks.filter(t => t.status === 'complete');

  const priorityColors: Record<string, string> = {
    'Critical': 'text-red-400 bg-red-500/10',
    'High': 'text-orange-400 bg-orange-500/10',
    'Medium': 'text-amber-400 bg-amber-500/10',
    'Low': 'text-muted-foreground bg-slate-500/10',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} pending{overdue.length > 0 && <> · <span className="text-red-400">{overdue.length} overdue</span></>} · {complete.length} complete
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'overdue', 'complete'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                statusFilter === f ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map((task, i) => {
          const isOverdue = task.status === 'pending' && isPast(new Date(task.dueDate));
          return (
            <div
              key={task.id || i}
              className={`flex items-center gap-4 p-3 rounded-xl bg-card border transition-all ${
                isOverdue ? 'border-red-500/30' : 'border-border hover:border-purple-500/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                task.status === 'complete' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600'
              }`}>
                {task.status === 'complete' && <CheckSquare className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${task.status === 'complete' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {task.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {task.customerName} · {task.owner}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority] || 'text-muted-foreground bg-slate-500/10'}`}>
                  {task.priority}
                </span>
                <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {format(new Date(task.dueDate), 'MMM d')}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No tasks match your filter.</div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <OpportunityProvider>
      <TasksContent />
    </OpportunityProvider>
  );
}
