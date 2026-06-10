'use client';

import { useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import {
  X, DollarSign, Calendar, Users, CheckSquare, Percent,
  Globe, Briefcase, Tag, ExternalLink, Edit2, Save, Plus,
  Trash2, ChevronRight, Clock, Building2, Loader2, Sparkles,
  AlertTriangle, Zap, ArrowRight, Shield, TrendingUp,
  Mail, CalendarPlus, ArrowUpRight, FileText, MessageSquare,
  GitBranch,
} from 'lucide-react';
import { MeetingNotesModal } from './MeetingNotesModal';
import type { Status } from '@/lib/types';

interface DealDetailProps {
  opportunityId: string;
  onClose: () => void;
}

// Health Score Ring - SVG circle showing score 0-100 with color gradient
function HealthRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg width="64" height="64" className="transform -rotate-90">
        <circle cx="32" cy="32" r={radius} stroke="var(--g-line, #333)" strokeWidth="4" fill="none" />
        <circle cx="32" cy="32" r={radius} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="g-metric text-sm font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

// Win Probability Bar - animated progress bar
function WinProbabilityBar({ probability }: { probability: number }) {
  const color = probability >= 70 ? '#22c55e' : probability >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-foreground">Win Probability</span>
        <span className="g-metric text-sm font-bold text-foreground">{probability}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${probability}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function DealDetail({ opportunityId, onClose }: DealDetailProps) {
  const { opportunities, updateOpportunity, deleteOpportunity } = useOpportunities();
  const opp = opportunities.find(o => o.id === opportunityId);
  const [activeTab, setActiveTab] = useState<'details' | 'stakeholders' | 'tasks' | 'log' | 'documents'>('details');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [analysis, setAnalysis] = useState<any>(null);
  const [sowContent, setSowContent] = useState<string | null>(null);
  const [showStageSelector, setShowStageSelector] = useState(false);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  const analysisMutation = trpc.ai.analyzeDeal.useMutation();
  const sowMutation = trpc.ai.generateSOW.useMutation({
    onSuccess: (data) => {
      setSowContent(data.content);
      setActiveTab('documents');
    },
  });

  // Auto-analyze on open
  useEffect(() => {
    if (opp?.id && !analysis) {
      analysisMutation.mutate({ opportunityId: opp.id }, {
        onSuccess: (data) => setAnalysis(data),
      });
    }
  }, [opp?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stakeholder form state
  const [showStakeholderForm, setShowStakeholderForm] = useState(false);
  const [stakeholderForm, setStakeholderForm] = useState({
    name: '', title: '', email: '', phone: '', linkedInUrl: '',
    isPrimaryContact: false, isDecisionMaker: false,
  });

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    name: '', owner: '', dueDate: '', priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical', notes: '',
  });

  const utils = trpc.useUtils();
  const { data: engagementTypes = [] } = trpc.engagementType.list.useQuery();
  const { data: workflows = [] } = trpc.workflow.list.useQuery();
  const { data: stageTemplate } = trpc.ontology.getForStage.useQuery({
    stage: opp?.status || 'Discovery',
    engagementType: (opp as any)?.engagementType,
    serviceLine: opp?.serviceLine,
  }, { enabled: !!opp });

  const createStakeholderMutation = trpc.stakeholder.create.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
      setStakeholderForm({ name: '', title: '', email: '', phone: '', linkedInUrl: '', isPrimaryContact: false, isDecisionMaker: false });
      setShowStakeholderForm(false);
    },
  });

  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
      setTaskForm({ name: '', owner: '', dueDate: '', priority: 'Medium', notes: '' });
      setShowTaskForm(false);
    },
  });

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
    },
  });

  if (!opp) return null;

  const stakeholders = opp.customerStakeholders || [];
  const tasks = opp.subTasks || [];
  const completedTasks = tasks.filter(t => t.status === 'complete').length;

  const statusColors: Record<string, string> = {
    'Discovery': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Qualification': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Proposal': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'Negotiation': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Won': 'bg-green-500/15 text-green-400 border-green-500/30',
    'Lost': 'bg-red-500/15 text-red-400 border-red-500/30',
    'On Hold': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  };

  const handleSave = async () => {
    if (Object.keys(editForm).length > 0) {
      await updateOpportunity(opp.id, editForm);
    }
    setEditing(false);
    setEditForm({});
  };

  const handleDelete = async () => {
    if (confirm('Delete this opportunity? This cannot be undone.')) {
      await deleteOpportunity(opp.id);
      onClose();
    }
  };

  const handleCreateStakeholder = () => {
    if (!stakeholderForm.name || !stakeholderForm.title) return;
    createStakeholderMutation.mutate({
      opportunityId: opp.id,
      ...stakeholderForm,
    });
  };

  const handleCreateTask = () => {
    if (!taskForm.name || !taskForm.owner || !taskForm.dueDate) return;
    createTaskMutation.mutate({
      opportunityId: opp.id,
      ...taskForm,
    });
  };

  const handleToggleTaskStatus = (task: any) => {
    if (!task.id) return;
    updateTaskMutation.mutate({
      id: task.id,
      status: task.status === 'complete' ? 'pending' : 'complete',
    });
  };

  const handleStageChange = async (newStage: Status) => {
    await updateOpportunity(opp.id, { status: newStage });
    setShowStageSelector(false);
  };

  const handleCreateActionTask = (actionText: string) => {
    const today = new Date();
    const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    createTaskMutation.mutate({
      opportunityId: opp.id,
      name: actionText,
      owner: opp.primaryOwner || 'Unassigned',
      dueDate: dueDate.toISOString().split('T')[0],
      priority: 'High',
      notes: 'Auto-created from AI recommendation',
    });
  };

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'stakeholders' as const, label: `Stakeholders (${stakeholders.length})` },
    { id: 'tasks' as const, label: `Tasks (${completedTasks}/${tasks.length})` },
    { id: 'log' as const, label: 'Log' },
    { id: 'documents' as const, label: 'Documents' },
  ];

  const inputClasses = 'w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7B52FF]/20 focus:border-[#7B52FF]';

  const stageOptions: Status[] = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 pb-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col g-surface rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`g-chip border ${statusColors[opp.status] || ''}`}>{opp.status}</span>
              <span className="text-xs text-muted-foreground">{opp.id}</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground truncate">{opp.customerName}</h2>
            <p className="text-sm text-muted-foreground truncate">{opp.opportunityName}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {editing ? (
              <>
                <button onClick={handleSave} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"><Save className="h-4 w-4" /></button>
                <button onClick={() => { setEditing(false); setEditForm({}); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Edit2 className="h-4 w-4" /></button>
            )}
            {analysisMutation.isPending && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#7B52FF]/10 text-[#7B52FF] text-xs font-medium">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </div>
            )}
            <button
              onClick={() => sowMutation.mutate({ opportunityId: opp.id })}
              disabled={sowMutation.isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {sowMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              SOW
            </button>
            <button
              onClick={() => setShowMeetingNotes(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
            >
              <MessageSquare className="h-3 w-3" />
              Notes
            </button>
            <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* AI Analysis Card - always visible when available, visual layout */}
        {(analysis || analysisMutation.isPending) && (
          <div className="px-5 pt-4 pb-2">
            {analysisMutation.isPending && !analysis ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#7B52FF]/5 border border-[#7B52FF]/20">
                <Sparkles className="h-4 w-4 animate-spin text-[#7B52FF]" />
                <span className="text-sm text-muted-foreground">AI is analyzing this deal...</span>
              </div>
            ) : analysis && (
              <div className="p-4 rounded-xl bg-[#7B52FF]/5 border border-[#7B52FF]/20 space-y-4">
                {/* Top row: Health ring + Win probability + summary */}
                <div className="flex items-center gap-4">
                  <HealthRing score={analysis.healthScore} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#7B52FF]" />
                      <span className="text-xs font-semibold text-[#7B52FF] uppercase tracking-wider">AI Deal Intelligence</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
                    </div>
                    <WinProbabilityBar probability={analysis.winProbability} />
                  </div>
                </div>

                {/* Summary */}
                {analysis.summary && (
                  <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
                )}

                {/* Risk signals as colored badges */}
                {analysis.risks?.length > 0 && (
                  <div className="space-y-2">
                    <div className="g-section-label flex items-center gap-1.5">
                      <Shield className="h-3 w-3" /> Risk Signals
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.risks.map((r: any, i: number) => {
                        const severityStyles: Record<string, string> = {
                          critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
                          high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
                          medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                          low: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
                        };
                        return (
                          <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${severityStyles[r.severity] || severityStyles.medium}`}>
                            <AlertTriangle className="h-3 w-3" />
                            {r.message}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recommended actions as clickable buttons */}
                {analysis.actions?.length > 0 && (
                  <div className="space-y-2">
                    <div className="g-section-label flex items-center gap-1.5">
                      <Zap className="h-3 w-3" /> Recommended Actions
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {analysis.actions.map((a: any, i: number) => {
                        const priorityStyles: Record<string, string> = {
                          high: 'border-orange-500/30 hover:border-orange-500/50',
                          medium: 'border-amber-500/30 hover:border-amber-500/50',
                          low: 'border-blue-500/30 hover:border-blue-500/50',
                          critical: 'border-red-500/30 hover:border-red-500/50',
                        };
                        const borderStyle = priorityStyles[a.priority] || priorityStyles.medium;

                        return (
                          <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg bg-card border ${borderStyle} transition-all`}>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground">{a.action}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{a.reason}</div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Create task from action */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCreateActionTask(a.action); }}
                                disabled={createTaskMutation.isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#7B52FF]/15 text-[#7B52FF] text-[11px] font-medium hover:bg-[#7B52FF]/25 transition-colors disabled:opacity-50"
                                title="Create this as a task"
                              >
                                {createTaskMutation.isPending ? (
                                  <><Loader2 className="h-3 w-3 animate-spin" /> Creating...</>
                                ) : (
                                  <><CalendarPlus className="h-3 w-3" /> Create Task</>
                                )}
                              </button>
                              {/* Update stage if action mentions it */}
                              {(a.action.toLowerCase().includes('stage') || a.action.toLowerCase().includes('move') || a.action.toLowerCase().includes('advance')) && (
                                <button
                                  onClick={() => setShowStageSelector(true)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors"
                                  title="Change deal stage"
                                >
                                  <ArrowUpRight className="h-3 w-3" />
                                  Stage
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stage selector dropdown */}
                {showStageSelector && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                    <span className="text-xs text-muted-foreground">Move to:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {stageOptions.filter(s => s !== opp.status).map(stage => (
                        <button
                          key={stage}
                          onClick={() => handleStageChange(stage)}
                          className={`g-chip border ${statusColors[stage] || ''} hover:opacity-80 transition-opacity cursor-pointer`}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowStageSelector(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 px-5 border-b" style={{ borderColor: 'var(--g-line)' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#7B52FF] text-[#7B52FF]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* KPI Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">TCV</div>
                  <div className="g-kpi text-foreground text-lg">${opp.tcv > 0 ? opp.tcv.toLocaleString() : '\u2014'}</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Margin</div>
                  <div className="g-kpi text-foreground text-lg">{opp.margin ? `${opp.margin}%` : '\u2014'}</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="g-section-label mb-1">Close Date</div>
                  <div className="text-sm font-medium text-foreground">{format(new Date(opp.expectedCloseDate), 'MMM d, yyyy')}</div>
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Building2, label: 'Industry', value: opp.industry, field: 'industry' },
                  { icon: Globe, label: 'Region', value: opp.region, field: 'region' },
                  { icon: Briefcase, label: 'Service Line', value: opp.serviceLine || '\u2014', field: 'serviceLine' },
                  { icon: DollarSign, label: 'Billing Model', value: opp.billingModel || '\u2014', field: 'billingModel' },
                  { icon: Tag, label: 'Engagement Type', value: (opp as any).engagementType || '\u2014', field: 'engagementType' },
                  { icon: Clock, label: 'Duration', value: opp.dealDuration, field: 'dealDuration' },
                  { icon: Users, label: 'Owner', value: opp.primaryOwner, field: 'primaryOwner' },
                  { icon: Calendar, label: 'Start Date', value: format(new Date(opp.startDate), 'MMM d, yyyy'), field: 'startDate' },
                  { icon: Tag, label: 'Source', value: opp.source, field: 'source' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-[11px] text-muted-foreground">{item.label}</div>
                      {editing ? (
                        item.field === 'engagementType' ? (
                          <select
                            className="w-full px-2 py-1 text-sm bg-secondary border border-border rounded text-foreground"
                            defaultValue={item.value === '\u2014' ? '' : item.value}
                            onChange={e => setEditForm((f: any) => ({ ...f, engagementType: e.target.value }))}
                          >
                            <option value="">Select engagement type</option>
                            {engagementTypes.map((et: any) => (
                              <option key={et.code} value={et.name}>{et.name} ({et.code})</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="w-full px-2 py-1 text-sm bg-secondary border border-border rounded text-foreground"
                            defaultValue={item.value}
                            onChange={e => setEditForm((f: any) => ({ ...f, [item.field]: e.target.value }))}
                          />
                        )
                      ) : (
                        <div className="text-sm text-foreground">{item.value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {opp.customTags && opp.customTags.length > 0 && (
                <div>
                  <div className="g-section-label mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.customTags.map(tag => (
                      <span key={tag} className="g-chip bg-[#7B52FF]/10 text-[#7B52FF] border border-[#7B52FF]/20">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* POCs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="g-section-label mb-2">Sales POCs</div>
                  <div className="space-y-1">
                    {(opp.salesPOCs || []).map(poc => (
                      <div key={poc} className="text-sm text-foreground">{poc}</div>
                    ))}
                    {(!opp.salesPOCs || opp.salesPOCs.length === 0) && <div className="text-sm text-muted-foreground">{'\u2014'}</div>}
                  </div>
                </div>
                <div>
                  <div className="g-section-label mb-2">Presales POCs</div>
                  <div className="space-y-1">
                    {(opp.presalesPOCs || []).map(poc => (
                      <div key={poc} className="text-sm text-foreground">{poc}</div>
                    ))}
                    {(!opp.presalesPOCs || opp.presalesPOCs.length === 0) && <div className="text-sm text-muted-foreground">{'\u2014'}</div>}
                  </div>
                </div>
              </div>

              {/* Active Workflows */}
              {(() => {
                const activeWorkflows = (workflows as any[]).filter((w: any) =>
                  w.isActive && w.trigger?.type === 'deal_stage_change' &&
                  (!w.trigger?.config?.toStage || w.trigger.config.toStage === opp.status)
                );
                return activeWorkflows.length > 0 ? (
                  <div>
                    <div className="g-section-label mb-2">Active Workflows</div>
                    <div className="space-y-1.5">
                      {activeWorkflows.map((wf: any) => (
                        <div key={wf._id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                          <GitBranch className="h-3 w-3 text-[#7c3aed]" />
                          <span className="text-foreground">{wf.name}</span>
                          <span className="text-muted-foreground">&middot; {wf.actions?.length || 0} actions</span>
                          {wf.executionCount > 0 && <span className="text-muted-foreground">&middot; ran {wf.executionCount}x</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Stage Ontology: Requirements & Artifacts */}
              {stageTemplate && (
                <div className="space-y-3">
                  <div className="g-section-label">Stage: {opp.status} — Requirements &amp; Artifacts</div>

                  {/* Gate Criteria */}
                  {(stageTemplate as any).gateCriteria?.length > 0 && (
                    <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gate Criteria</div>
                      {(stageTemplate as any).gateCriteria.map((gate: any, i: number) => {
                        let met = false;
                        if (gate.field === 'tcv') met = (opp.tcv || 0) > 0;
                        else if (gate.field === 'margin') met = (opp.margin || 0) > 20;
                        else if (gate.field === 'industry') met = !!opp.industry;
                        else if (gate.field === 'billingModel') met = !!opp.billingModel || !!(opp as any).engagementType;
                        else if (gate.field === 'customerStakeholders') met = (opp.customerStakeholders || []).length > 0;
                        else if (gate.field === 'conversationLog') met = (opp.conversationLog || '').length > 50;

                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {met ? '\u2713' : '\u2717'}
                            </div>
                            <span className={met ? 'text-foreground' : 'text-muted-foreground'}>{gate.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Templates */}
                  {(stageTemplate as any).templates?.length > 0 && (
                    <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stage Artifacts</div>
                      {(stageTemplate as any).templates.map((tmpl: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`g-chip ${tmpl.required ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-500/10 text-muted-foreground'}`}>
                            {tmpl.required ? 'Required' : 'Optional'}
                          </span>
                          <span className="text-foreground">{tmpl.name}</span>
                          {tmpl.aiGenerable && <span className="g-chip bg-[#7c3aed]/10 text-[#7c3aed]">AI</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Roles */}
                  {(stageTemplate as any).roles?.length > 0 && (
                    <div className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Key Roles</div>
                      {(stageTemplate as any).roles.map((role: any, i: number) => (
                        <div key={i} className="text-xs">
                          <span className="font-medium text-foreground">{role.role}</span>
                          <span className="text-muted-foreground"> — {role.responsibility}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stakeholders' && (
            <div className="space-y-3">
              {stakeholders.length === 0 && !showStakeholderForm && <div className="text-center py-8 text-muted-foreground text-sm">No stakeholders added yet.</div>}
              {stakeholders.map((s, i) => (
                <div key={s.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="w-9 h-9 rounded-full bg-[#7B52FF]/15 flex items-center justify-center text-[#7B52FF] text-xs font-bold flex-shrink-0">
                    {s.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      {s.isDecisionMaker && <span className="g-chip bg-amber-500/10 text-amber-400 border border-amber-500/20">DM</span>}
                      {s.isPrimaryContact && <span className="g-chip bg-blue-500/10 text-blue-400 border border-blue-500/20">Primary</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.title}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.email && <div>{s.email}</div>}
                    {s.phone && <div>{s.phone}</div>}
                  </div>
                </div>
              ))}

              {/* Inline Stakeholder Form */}
              {showStakeholderForm && (
                <div className="p-4 rounded-lg bg-card border border-border space-y-3">
                  <div className="g-section-label">New Stakeholder</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className={inputClasses}
                      placeholder="Name *"
                      value={stakeholderForm.name}
                      onChange={e => setStakeholderForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      className={inputClasses}
                      placeholder="Title *"
                      value={stakeholderForm.title}
                      onChange={e => setStakeholderForm(f => ({ ...f, title: e.target.value }))}
                    />
                    <input
                      className={inputClasses}
                      placeholder="Email"
                      type="email"
                      value={stakeholderForm.email}
                      onChange={e => setStakeholderForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <input
                      className={inputClasses}
                      placeholder="Phone"
                      value={stakeholderForm.phone}
                      onChange={e => setStakeholderForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <input
                    className={inputClasses}
                    placeholder="LinkedIn URL"
                    value={stakeholderForm.linkedInUrl}
                    onChange={e => setStakeholderForm(f => ({ ...f, linkedInUrl: e.target.value }))}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stakeholderForm.isPrimaryContact}
                        onChange={e => setStakeholderForm(f => ({ ...f, isPrimaryContact: e.target.checked }))}
                        className="rounded border-border"
                      />
                      Primary Contact
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stakeholderForm.isDecisionMaker}
                        onChange={e => setStakeholderForm(f => ({ ...f, isDecisionMaker: e.target.checked }))}
                        className="rounded border-border"
                      />
                      Decision Maker
                    </label>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCreateStakeholder}
                      disabled={!stakeholderForm.name || !stakeholderForm.title || createStakeholderMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium bg-[#7B52FF] text-white rounded-lg hover:bg-[#6B42EF] disabled:opacity-50 transition-colors"
                    >
                      {createStakeholderMutation.isPending ? 'Adding...' : 'Add Stakeholder'}
                    </button>
                    <button
                      onClick={() => { setShowStakeholderForm(false); setStakeholderForm({ name: '', title: '', email: '', phone: '', linkedInUrl: '', isPrimaryContact: false, isDecisionMaker: false }); }}
                      className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {createStakeholderMutation.isError && (
                    <p className="text-xs text-red-400">{createStakeholderMutation.error.message}</p>
                  )}
                </div>
              )}

              {/* Add Stakeholder Button */}
              {!showStakeholderForm && (
                <button
                  onClick={() => setShowStakeholderForm(true)}
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-[#7B52FF]/40 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Stakeholder
                </button>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {tasks.length === 0 && !showTaskForm && <div className="text-center py-8 text-muted-foreground text-sm">No tasks added yet.</div>}
              {tasks.map((t, i) => {
                const isOverdue = t.status === 'pending' && new Date(t.dueDate) < new Date();
                const priorityColors: Record<string, string> = {
                  'Critical': 'text-red-400', 'High': 'text-orange-400', 'Medium': 'text-amber-400', 'Low': 'text-muted-foreground',
                };
                return (
                  <div key={t.id || i} className={`flex items-center gap-3 p-3 rounded-lg bg-card border ${isOverdue ? 'border-red-500/30' : 'border-border'}`}>
                    <button
                      onClick={() => handleToggleTaskStatus(t)}
                      disabled={updateTaskMutation.isPending}
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors cursor-pointer ${t.status === 'complete' ? 'bg-green-500/20 border-green-500' : 'border-muted-foreground hover:border-[#7B52FF]'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${t.status === 'complete' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.owner} · {format(new Date(t.dueDate), 'MMM d')}</div>
                    </div>
                    <span className={`text-[10px] font-medium ${priorityColors[t.priority] || ''}`}>{t.priority}</span>
                  </div>
                );
              })}

              {/* Inline Task Form */}
              {showTaskForm && (
                <div className="p-4 rounded-lg bg-card border border-border space-y-3">
                  <div className="g-section-label">New Task</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className={inputClasses}
                      placeholder="Task name *"
                      value={taskForm.name}
                      onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      className={inputClasses}
                      placeholder="Owner *"
                      value={taskForm.owner}
                      onChange={e => setTaskForm(f => ({ ...f, owner: e.target.value }))}
                    />
                    <input
                      className={inputClasses}
                      type="date"
                      value={taskForm.dueDate}
                      onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                    />
                    <select
                      className={inputClasses}
                      value={taskForm.priority}
                      onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as any }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <input
                    className={inputClasses}
                    placeholder="Notes (optional)"
                    value={taskForm.notes}
                    onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))}
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCreateTask}
                      disabled={!taskForm.name || !taskForm.owner || !taskForm.dueDate || createTaskMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium bg-[#7B52FF] text-white rounded-lg hover:bg-[#6B42EF] disabled:opacity-50 transition-colors"
                    >
                      {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
                    </button>
                    <button
                      onClick={() => { setShowTaskForm(false); setTaskForm({ name: '', owner: '', dueDate: '', priority: 'Medium', notes: '' }); }}
                      className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {createTaskMutation.isError && (
                    <p className="text-xs text-red-400">{createTaskMutation.error.message}</p>
                  )}
                </div>
              )}

              {/* Add Task Button */}
              {!showTaskForm && (
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-[#7B52FF]/40 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
              )}
            </div>
          )}

          {activeTab === 'log' && (
            <div>
              {opp.conversationLog ? (
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{opp.conversationLog}</div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No conversation log yet.</div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              {sowMutation.isPending && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-sm text-muted-foreground">Generating Statement of Work...</span>
                </div>
              )}
              {sowContent ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium text-foreground">Statement of Work</span>
                      <span className="g-chip bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI Generated</span>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(sowContent); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                    {sowContent}
                  </div>
                </div>
              ) : !sowMutation.isPending ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground mb-3">No documents generated yet.</p>
                  <button
                    onClick={() => sowMutation.mutate({ opportunityId: opp.id })}
                    className="px-4 py-2 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    Generate SOW
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <MeetingNotesModal
          isOpen={showMeetingNotes}
          onClose={() => setShowMeetingNotes(false)}
          opportunityId={opp.id}
          opportunityName={`${opp.customerName} — ${opp.opportunityName}`}
        />
      </div>
    </div>
  );
}
