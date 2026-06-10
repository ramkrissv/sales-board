'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  GitBranch, Plus, X, Play, Pause, ChevronDown, ChevronRight,
  Zap, Clock, AlertTriangle, Bot, User, Activity, CheckCircle2,
} from 'lucide-react';

const TRIGGER_TYPES = [
  { value: 'deal_stage_change', label: 'Deal Stage Change' },
  { value: 'deal_created', label: 'Deal Created' },
  { value: 'task_overdue', label: 'Task Overdue' },
  { value: 'schedule', label: 'Scheduled' },
  { value: 'manual', label: 'Manual' },
] as const;

const ACTION_TYPES = [
  { value: 'create_task', label: 'Create Task' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'change_stage', label: 'Change Stage' },
  { value: 'invoke_agent', label: 'Invoke Agent' },
  { value: 'assign_owner', label: 'Assign Owner' },
] as const;

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  deal_stage_change: Activity,
  deal_created: Plus,
  task_overdue: AlertTriangle,
  schedule: Clock,
  manual: User,
};

const sampleWorkflows = [
  {
    name: 'Discovery Checklist',
    description: 'Automatically create onboarding tasks when a new deal is created',
    mode: 'manual' as const,
    trigger: { type: 'deal_created' as const, config: {} },
    actions: [
      { type: 'create_task' as const, config: { taskName: 'Research company', priority: 'High' } },
      { type: 'create_task' as const, config: { taskName: 'Identify stakeholders', priority: 'High' } },
      { type: 'create_task' as const, config: { taskName: 'Schedule intro call', priority: 'Medium' } },
    ],
    conditions: [],
  },
  {
    name: 'Stale Deal Alert',
    description: 'Send notification when a deal has been inactive for more than 14 days',
    mode: 'agentic' as const,
    trigger: { type: 'schedule' as const, config: { frequency: 'daily' } },
    actions: [
      { type: 'send_notification' as const, config: { message: 'Deal inactive for 14+ days', channel: 'email' } },
    ],
    conditions: [{ field: 'lastActivity', operator: 'older_than', value: '14d' }],
  },
  {
    name: 'Win Handoff',
    description: 'Create handoff tasks when a deal moves to Won stage',
    mode: 'manual' as const,
    trigger: { type: 'deal_stage_change' as const, config: { fromStage: 'Negotiation', toStage: 'Won' } },
    actions: [
      { type: 'create_task' as const, config: { taskName: 'Legal review', priority: 'Critical' } },
      { type: 'create_task' as const, config: { taskName: 'Delivery kickoff', priority: 'High' } },
    ],
    conditions: [],
  },
];

export default function WorkflowsPage() {
  const { data: workflows = [], isLoading } = trpc.workflow.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.workflow.create.useMutation({
    onSuccess: () => {
      utils.workflow.list.invalidate();
      setShowForm(false);
      resetForm();
    },
  });
  const updateMutation = trpc.workflow.update.useMutation({
    onSuccess: () => utils.workflow.list.invalidate(),
  });
  const deleteMutation = trpc.workflow.delete.useMutation({
    onSuccess: () => {
      utils.workflow.list.invalidate();
      setExpandedId(null);
    },
  });
  const toggleMutation = trpc.workflow.toggleActive.useMutation({
    onSuccess: () => utils.workflow.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMode, setFormMode] = useState<'manual' | 'agentic'>('manual');
  const [formTriggerType, setFormTriggerType] = useState<string>('deal_created');
  const [formFromStage, setFormFromStage] = useState('');
  const [formToStage, setFormToStage] = useState('');
  const [formFrequency, setFormFrequency] = useState('daily');
  const [formActions, setFormActions] = useState<string[]>(['create_task']);

  function resetForm() {
    setFormName('');
    setFormDesc('');
    setFormMode('manual');
    setFormTriggerType('deal_created');
    setFormFromStage('');
    setFormToStage('');
    setFormFrequency('daily');
    setFormActions(['create_task']);
  }

  // Seed sample workflows on first load if empty
  useEffect(() => {
    if (!isLoading && workflows.length === 0 && !seeded) {
      setSeeded(true);
      sampleWorkflows.forEach((wf) => {
        createMutation.mutate(wf);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, workflows.length, seeded]);

  function buildTrigger() {
    const config: Record<string, string> = {};
    if (formTriggerType === 'deal_stage_change') {
      if (formFromStage) config.fromStage = formFromStage;
      if (formToStage) config.toStage = formToStage;
    }
    if (formTriggerType === 'schedule') {
      config.frequency = formFrequency;
    }
    return { type: formTriggerType as any, config };
  }

  function buildActions() {
    return formActions.map((a) => ({ type: a as any, config: {} }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || formActions.length === 0) return;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formName,
        description: formDesc,
        mode: formMode,
        trigger: buildTrigger(),
        actions: buildActions(),
      });
      setEditingId(null);
      setShowForm(false);
      resetForm();
    } else {
      createMutation.mutate({
        name: formName,
        description: formDesc,
        mode: formMode,
        trigger: buildTrigger(),
        actions: buildActions(),
        conditions: [],
      });
    }
  }

  function startEdit(wf: any) {
    setEditingId(wf._id);
    setFormName(wf.name);
    setFormDesc(wf.description || '');
    setFormMode(wf.mode || 'manual');
    setFormTriggerType(wf.trigger?.type || 'deal_created');
    setFormFromStage(wf.trigger?.config?.fromStage || '');
    setFormToStage(wf.trigger?.config?.toStage || '');
    setFormFrequency(wf.trigger?.config?.frequency || 'daily');
    setFormActions((wf.actions || []).map((a: any) => a.type));
    setShowForm(true);
    setExpandedId(null);
  }

  function toggleAction(actionType: string) {
    setFormActions((prev) =>
      prev.includes(actionType)
        ? prev.filter((a) => a !== actionType)
        : [...prev, actionType]
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-card rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-purple-400" />
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {workflows.length} workflows &middot; {workflows.filter((w: any) => w.isActive).length} active
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingId) {
              setShowForm(false);
              resetForm();
            } else {
              setEditingId(null);
              resetForm();
              setShowForm(true);
            }
          }}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium flex items-center gap-2 transition-colors"
        >
          {showForm && !editingId ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm && !editingId ? 'Cancel' : 'New Workflow'}
        </button>
      </div>

      {/* New/Edit Workflow Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-xl g-surface g-elevated space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {editingId ? 'Edit Workflow' : 'New Workflow'}
            </h2>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border"
                placeholder="Workflow name"
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Mode</label>
              <div className="flex gap-2">
                {(['manual', 'agentic'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormMode(m)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      formMode === m
                        ? 'border-purple-500/40 bg-purple-600/20 text-purple-400'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m === 'manual' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40 border border-border h-16 resize-none"
              placeholder="What does this workflow do?"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trigger Type *</label>
            <select
              value={formTriggerType}
              onChange={(e) => setFormTriggerType(e.target.value)}
              className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Conditional trigger config */}
          {formTriggerType === 'deal_stage_change' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From Stage</label>
                <select
                  value={formFromStage}
                  onChange={(e) => setFormFromStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
                >
                  <option value="">Any</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To Stage</label>
                <select
                  value={formToStage}
                  onChange={(e) => setFormToStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
                >
                  <option value="">Any</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {formTriggerType === 'schedule' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
              <select
                value={formFrequency}
                onChange={(e) => setFormFrequency(e.target.value)}
                className="w-full px-3 py-2 text-sm g-surface rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 border border-border"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Actions *</label>
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => toggleAction(a.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    formActions.includes(a.value)
                      ? 'border-purple-500/40 bg-purple-600/20 text-purple-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {formActions.length === 0 && (
              <p className="text-[11px] text-red-400 mt-1">Select at least one action</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
              className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingId ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </form>
      )}

      {/* Workflow List */}
      <div className="space-y-2">
        {workflows.length === 0 && !createMutation.isPending ? (
          <div className="text-center py-16 text-muted-foreground">
            <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No workflows yet. Create your first workflow.</p>
            <p className="text-xs mt-1">Automate repetitive tasks across your pipeline.</p>
            <button
              onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> New Workflow
            </button>
          </div>
        ) : (
          workflows.map((wf: any) => {
            const isExpanded = expandedId === wf._id;
            const TriggerIcon = TRIGGER_ICONS[wf.trigger?.type] || Zap;
            return (
              <div key={wf._id} className="rounded-xl g-surface g-elevated transition-all hover:border-purple-500/20">
                {/* Row */}
                <div className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : wf._id)}
                    className="flex items-center gap-4 flex-1 text-left min-w-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}

                    <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center flex-shrink-0">
                      <TriggerIcon className="h-4 w-4 text-purple-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{wf.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          wf.mode === 'agentic'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'
                        }`}>
                          {wf.mode === 'agentic' ? '🤖 Agentic' : 'Manual'}
                        </span>
                      </div>
                      {wf.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{wf.description}</div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{wf.executionCount || 0} runs</div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        {wf.successRate ?? 100}%
                      </div>
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMutation.mutate({ id: wf._id });
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        wf.isActive ? 'bg-emerald-500' : 'bg-zinc-600'
                      }`}
                      title={wf.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        wf.isActive ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/30 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="g-section-label mb-2">Trigger</div>
                        <div className="p-3 rounded-lg bg-card border border-border">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <TriggerIcon className="h-4 w-4 text-purple-400" />
                            {TRIGGER_TYPES.find((t) => t.value === wf.trigger?.type)?.label || wf.trigger?.type}
                          </div>
                          {wf.trigger?.config && Object.keys(wf.trigger.config).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(wf.trigger.config).map(([key, val]) => (
                                <div key={key} className="text-xs text-muted-foreground">
                                  <span className="text-zinc-400">{key}:</span> {String(val)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="g-section-label mb-2">Actions ({(wf.actions || []).length})</div>
                        <div className="space-y-1">
                          {(wf.actions || []).map((action: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg bg-card border border-border text-xs text-foreground flex items-center gap-2">
                              <Zap className="h-3 w-3 text-amber-400" />
                              {ACTION_TYPES.find((a) => a.value === action.type)?.label || action.type}
                              {action.config?.taskName && (
                                <span className="text-muted-foreground">- {action.config.taskName}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {wf.conditions && wf.conditions.length > 0 && (
                      <div>
                        <div className="g-section-label mb-2">Conditions</div>
                        <div className="space-y-1">
                          {wf.conditions.map((cond: any, i: number) => (
                            <div key={i} className="text-xs text-muted-foreground p-2 rounded-lg bg-card border border-border">
                              {cond.field} {cond.operator} {String(cond.value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => startEdit(wf)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-purple-500/30 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this workflow?')) {
                            deleteMutation.mutate({ id: wf._id });
                          }
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-border text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                      >
                        Delete
                      </button>
                      {wf.lastExecutedAt && (
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          Last run: {new Date(wf.lastExecutedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
