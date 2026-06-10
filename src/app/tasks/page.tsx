'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import { CheckSquare, AlertTriangle, Search, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { DealDetail } from '@/components/modals/DealDetail';

function TasksContent() {
  const { opportunities, isLoading } = useOpportunities();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'complete' | 'overdue'>('all');
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', owner: '', dueDate: '', priority: 'Medium', oppId: '' });
  const [completedTaskSuggestion, setCompletedTaskSuggestion] = useState<{ taskName: string; oppId: string; customerName: string } | null>(null);

  const toggleMutation = trpc.task.update.useMutation({
    onSuccess: (data, variables) => {
      utils.opportunity.list.invalidate();
      // If task was completed, show AI suggestion for what's next
      if (variables.status === 'complete') {
        const task = allTasks.find(t => t.id === variables.id);
        if (task) {
          setCompletedTaskSuggestion({ taskName: task.name, oppId: task.oppId, customerName: task.customerName });
        }
      }
    },
  });
  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); setShowAddForm(false); setNewTask({ name: '', owner: '', dueDate: '', priority: 'Medium', oppId: '' }); },
  });
  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: () => utils.opportunity.list.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-card rounded animate-pulse" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const allTasks = opportunities.flatMap(opp =>
    (opp.subTasks || []).map(task => ({ ...task, customerName: opp.customerName, opportunityName: opp.opportunityName, oppId: opp.id }))
  );

  const filtered = allTasks.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.customerName.toLowerCase().includes(search.toLowerCase()) && !t.owner.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'pending') return t.status === 'pending';
    if (statusFilter === 'complete') return t.status === 'complete';
    if (statusFilter === 'overdue') return t.status === 'pending' && isPast(new Date(t.dueDate));
    return true;
  }).sort((a, b) => {
    // Overdue first, then by date
    const aOverdue = a.status === 'pending' && isPast(new Date(a.dueDate));
    const bOverdue = b.status === 'pending' && isPast(new Date(b.dueDate));
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const overdue = allTasks.filter(t => t.status === 'pending' && isPast(new Date(t.dueDate)));
  const pending = allTasks.filter(t => t.status === 'pending');
  const complete = allTasks.filter(t => t.status === 'complete');

  const priorityColors: Record<string, string> = {
    'Critical': 'text-red-400 bg-red-500/10',
    'High': 'text-orange-400 bg-orange-500/10',
    'Medium': 'text-amber-400 bg-amber-500/10',
    'Low': 'text-muted-foreground bg-zinc-500/10',
  };

  const handleToggle = (taskId: string, currentStatus: string) => {
    toggleMutation.mutate({
      id: taskId,
      status: currentStatus === 'complete' ? 'pending' : 'complete',
    });
  };

  const handleCreate = () => {
    if (!newTask.name || !newTask.owner || !newTask.dueDate || !newTask.oppId) return;
    createMutation.mutate({
      opportunityId: newTask.oppId,
      name: newTask.name,
      owner: newTask.owner,
      dueDate: new Date(newTask.dueDate).toISOString(),
      priority: newTask.priority as 'Low' | 'Medium' | 'High' | 'Critical',
    });
  };

  const handleDelete = (taskId: string) => {
    if (confirm('Delete this task?')) {
      deleteMutation.mutate({ id: taskId });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pending.length} pending{overdue.length > 0 && <> · <span className="text-red-400">{overdue.length} overdue</span></>} · {complete.length} complete
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="p-4 rounded-xl g-surface g-elevated space-y-3">
          <div className="g-section-label">New Task</div>
          <div className="grid grid-cols-2 gap-3">
            <input value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
              placeholder="Task name *" className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            <input value={newTask.owner} onChange={e => setNewTask(p => ({ ...p, owner: e.target.value }))}
              placeholder="Owner *" className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            <input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))}
              className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}
              className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
              {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <select value={newTask.oppId} onChange={e => setNewTask(p => ({ ...p, oppId: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40">
            <option value="">Select project *</option>
            {opportunities.map(o => <option key={o.id} value={o.id}>{o.customerName} — {o.opportunityName}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createMutation.isPending || !newTask.name || !newTask.oppId}
              className="px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, projects, owners..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
        </div>
        <div className="flex gap-1">
          {(['all', 'pending', 'overdue', 'complete'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                statusFilter === f ? 'bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/30' : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}>
              {f}{f === 'overdue' && overdue.length > 0 ? ` (${overdue.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map((task, i) => {
          const isOverdue = task.status === 'pending' && isPast(new Date(task.dueDate));
          const isToggling = toggleMutation.isPending && toggleMutation.variables?.id === task.id;
          return (
            <div
              key={task.id || i}
              className={`flex items-center gap-4 p-3.5 rounded-xl g-surface transition-all group ${
                task.status === 'complete' ? 'opacity-70' : ''
              } ${
                isOverdue ? '!border-red-500/30' : 'hover:!border-[#7c3aed]/20'
              }`}
            >
              {/* Checkbox — CLICKABLE */}
              <button
                onClick={() => task.id && handleToggle(task.id, task.status)}
                disabled={isToggling || !task.id}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  task.status === 'complete'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
                    : 'border-zinc-600 hover:border-[#7c3aed] hover:bg-[#7c3aed]/10'
                } ${isToggling ? 'opacity-50' : ''}`}
              >
                {isToggling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : task.status === 'complete' ? (
                  <CheckSquare className="h-3.5 w-3.5" />
                ) : null}
              </button>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${task.status === 'complete' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {task.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <button
                    onClick={() => setSelectedOppId(task.oppId)}
                    className="text-[#7c3aed] hover:text-[#6d28d9] hover:underline transition-colors"
                  >
                    {task.customerName}
                  </button>
                  {' · '}{task.owner}
                </div>
              </div>

              {/* Priority + Date + Delete */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`g-chip ${priorityColors[task.priority] || 'text-muted-foreground bg-zinc-500/10'}`}>
                  {task.priority}
                </span>
                <span className={`text-xs g-metric ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {format(new Date(task.dueDate), 'MMM d')}
                </span>
                <button
                  onClick={() => task.id && handleDelete(task.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {allTasks.length === 0 ? 'No tasks yet. Add your first task above.' : 'No tasks match your filter.'}
          </div>
        )}
      </div>

      {/* AI Suggestion after task completion — prominent banner */}
      {completedTaskSuggestion && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md">
          <div className="p-4 rounded-2xl g-surface g-elevated border border-[#7c3aed]/30 shadow-xl animate-flow-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--g-green-soft)] flex items-center justify-center shrink-0">
                <CheckSquare className="h-4 w-4 text-[var(--g-green)]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground animate-celebrate">Task Complete!</div>
                <div className="text-xs text-muted-foreground mt-0.5">{completedTaskSuggestion.taskName}</div>
                <div className="text-xs text-foreground mt-2">What&apos;s next for <span className="font-medium">{completedTaskSuggestion.customerName}</span>?</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setSelectedOppId(completedTaskSuggestion.oppId); setCompletedTaskSuggestion(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors">
                    <Sparkles className="h-3 w-3" /> Open Deal
                  </button>
                  <button onClick={() => { setShowAddForm(true); setNewTask(p => ({ ...p, oppId: completedTaskSuggestion.oppId })); setCompletedTaskSuggestion(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">
                    <Plus className="h-3 w-3" /> Add Follow-up
                  </button>
                  <button onClick={() => setCompletedTaskSuggestion(null)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deal Detail Modal */}
      {selectedOppId && (
        <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />
      )}
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
