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
  GitBranch, Copy,
} from 'lucide-react';
import Link from 'next/link';
import { MeetingNotesModal } from './MeetingNotesModal';
import { DealLifecycle } from '@/components/views/DealLifecycle';
import { Target } from 'lucide-react';
import type { Status } from '@/lib/types';
import DealPilotActions from '@/components/ai/DealPilotActions';

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
  const [activeTab, setActiveTab] = useState<'details' | 'stakeholders' | 'tasks' | 'log' | 'documents' | 'pricing' | 'presales' | 'contracts'>('details');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [analysis, setAnalysis] = useState<any>(null);
  const [sowContent, setSowContent] = useState<string | null>(null);
  const [showStageSelector, setShowStageSelector] = useState(false);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [contractType, setContractType] = useState('SOW');
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

  const createContractMutation = trpc.contract.create.useMutation({
    onSuccess: () => { utils.contract.list.invalidate(); setShowCreateContract(false); },
  });

  const createFollowOnMutation = trpc.opportunity.create.useMutation({
    onSuccess: (newOpp: any) => {
      utils.opportunity.list.invalidate();
      if (opp) {
        updateOpportunity(opp.id, { childOpportunityIds: [...((opp as any).childOpportunityIds || []), newOpp.id] } as any);
      }
    },
  });

  // Approval workflow
  const { data: approvals = [] } = trpc.approval.getForEntity.useQuery(
    { entityType: 'opportunity', entityId: opp?.id || '' },
    { enabled: !!opp }
  );
  const pendingApproval = (approvals as any[]).find((a: any) => a.status === 'pending');
  const requestApprovalMutation = trpc.approval.requestApproval.useMutation({
    onSuccess: () => utils.approval.getForEntity.invalidate(),
  });
  const approveMutation = trpc.approval.approve.useMutation({
    onSuccess: () => utils.approval.getForEntity.invalidate(),
  });

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

  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  const handleCreateActionTask = (actionText: string, type: 'task' | 'meeting' | 'followup' | 'escalation' = 'task') => {
    const today = new Date();
    const dueDays = type === 'meeting' ? 2 : type === 'followup' ? 1 : type === 'escalation' ? 1 : 5;
    const dueDate = new Date(today.getTime() + dueDays * 24 * 60 * 60 * 1000);
    const prefix = type === 'meeting' ? 'Meeting: ' : type === 'followup' ? 'Follow-up: ' : type === 'escalation' ? 'Escalation: ' : '';
    const taskName = actionText.startsWith(prefix) ? actionText : `${prefix}${actionText}`;

    createTaskMutation.mutate({
      opportunityId: opp.id,
      name: taskName,
      owner: opp.primaryOwner || 'Unassigned',
      dueDate: dueDate.toISOString().split('T')[0],
      priority: type === 'escalation' ? 'Critical' : 'High',
      notes: `Auto-created from AI recommendation on ${today.toLocaleDateString()}`,
    }, {
      onSuccess: () => {
        // Mark this action as completed
        setCompletedActions(prev => new Set([...prev, actionText]));
        // Log activity
        try {
          const Activity = (window as any).__activityLog;
          // Activity is logged server-side via the task creation mutation
        } catch {}
      },
    });
  };

  const tabs = [
    { id: 'details' as const, label: 'Details' },
    { id: 'stakeholders' as const, label: `Stakeholders (${stakeholders.length})` },
    { id: 'tasks' as const, label: `Tasks (${completedTasks}/${tasks.length})` },
    { id: 'pricing' as const, label: 'Pricing' },
    { id: 'presales' as const, label: 'Presales' },
    { id: 'contracts' as const, label: 'Contracts' },
    { id: 'documents' as const, label: 'Docs' },
    { id: 'log' as const, label: 'Log' },
  ];

  const inputClasses = 'w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 focus:border-[#5B4FE9]';

  const stageOptions: Status[] = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col g-surface rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`g-chip border ${statusColors[opp.status] || ''}`}>{opp.status}</span>
              <span className="text-xs text-muted-foreground">{opp.id}</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground truncate">{opp.customerName}</h2>
            <p className="text-sm text-muted-foreground truncate">{opp.opportunityName}</p>

            {/* Revenue indicator for Won deals */}
            {opp.status === 'Won' && opp.tcv > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs mt-1.5 w-fit">
                <DollarSign className="h-3 w-3" />
                Active engagement: ~${((opp.tcv || 0) / 12 / 1000).toFixed(0)}k/month revenue
              </div>
            )}

            {/* Lifecycle Phase */}
            <div className="flex items-center gap-0.5 mt-1">
              {['opportunity', 'deal', 'engagement', 'delivery', 'closed'].map((phase, i) => {
                const currentIdx = ['opportunity', 'deal', 'engagement', 'delivery', 'closed'].indexOf((opp as any).lifecyclePhase || 'opportunity');
                const isActive = i === currentIdx;
                const isPast = i < currentIdx;
                const colors = ['#3b82f6', '#5B4FE9', '#f59e0b', '#22c55e', '#10b981'];
                return (
                  <button key={phase} onClick={() => updateOpportunity(opp.id, { lifecyclePhase: phase } as any)}
                    className="flex items-center gap-0.5" title={`Set as ${phase}`}>
                    <div className={`w-2 h-2 rounded-full transition-all ${isActive ? 'scale-125' : ''}`}
                      style={{ backgroundColor: isPast || isActive ? colors[i] : 'var(--g-line)' }} />
                    {i < 4 && <div className="w-4 h-0.5" style={{ backgroundColor: isPast ? colors[i] : 'var(--g-line)' }} />}
                  </button>
                );
              })}
              <span className="text-[10px] text-muted-foreground ml-2 capitalize">{(opp as any).lifecyclePhase || 'opportunity'}</span>
            </div>

            {/* Lifecycle Actions */}
            <div className="flex gap-1.5 mt-2">
              <button onClick={() => setShowCreateContract(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors">
                <FileText className="h-3 w-3" /> Create Contract
              </button>
              <button onClick={() => {
                const year = new Date().getFullYear();
                const id = `OPP-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
                createFollowOnMutation.mutate({
                  id,
                  customerName: opp.customerName,
                  opportunityName: `${opp.opportunityName} — Follow-on`,
                  status: 'Discovery',
                  tcv: 0,
                  dealDuration: opp.dealDuration,
                  expectedCloseDate: new Date(Date.now() + 90*24*60*60*1000).toISOString(),
                  startDate: new Date().toISOString(),
                  primaryOwner: opp.primaryOwner,
                  industry: opp.industry,
                  region: opp.region,
                  source: opp.source,
                  salesPOCs: opp.salesPOCs || [],
                  presalesPOCs: opp.presalesPOCs || [],
                  customTags: [],
                  conversationLog: '',
                  activityLog: [],
                  parentOpportunityId: opp.id,
                  lifecyclePhase: 'opportunity',
                } as any);
              }}
                disabled={createFollowOnMutation.isPending}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 transition-colors">
                <Plus className="h-3 w-3" /> Follow-on Deal
              </button>
            </div>

            {/* Create Contract Inline Form */}
            {showCreateContract && (
              <div className="p-3 rounded-lg bg-card border border-border space-y-2 mt-2">
                <div className="g-section-label">Create Contract from Deal</div>
                <select defaultValue="SOW" onChange={e => setContractType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-secondary border border-border rounded text-foreground">
                  <option value="MSA">MSA</option>
                  <option value="SOW">SOW</option>
                  <option value="NDA">NDA</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => createContractMutation.mutate({
                    opportunityId: opp.id,
                    type: contractType || 'SOW',
                    title: `${opp.customerName} — ${contractType || 'SOW'}`,
                    value: opp.tcv || 0,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
                    engagementType: (opp as any).engagementType || opp.billingModel || 'Time & Material',
                    status: 'draft',
                  } as any)}
                    disabled={createContractMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-[#5B4FE9] text-white rounded-lg hover:bg-[#4A3ED4] transition-colors disabled:opacity-50">
                    {createContractMutation.isPending ? 'Creating...' : 'Create Contract'}
                  </button>
                  <button onClick={() => setShowCreateContract(false)}
                    className="px-3 py-1.5 text-xs border border-border text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#5B4FE9]/10 text-[#5B4FE9] text-xs font-medium">
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
            {opp.tcv >= 500000 && !pendingApproval && (
              <button
                onClick={() => requestApprovalMutation.mutate({
                  entityType: 'opportunity', entityId: opp.id, entityName: `${opp.customerName} — ${opp.opportunityName}`,
                  reason: `TCV $${opp.tcv.toLocaleString()} requires executive approval`,
                  roles: opp.tcv >= 1000000 ? ['CSO', 'CFO', 'CEO'] : ['CSO', 'CFO'],
                })}
                disabled={requestApprovalMutation.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                <Shield className="h-3 w-3" /> Request Approval
              </button>
            )}
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
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#5B4FE9]/5 border border-[#5B4FE9]/20">
                <Sparkles className="h-4 w-4 animate-spin text-[#5B4FE9]" />
                <span className="text-sm text-muted-foreground">AI is analyzing this deal...</span>
              </div>
            ) : analysis && (
              <div className="p-4 rounded-xl bg-[#5B4FE9]/5 border border-[#5B4FE9]/20 space-y-4">
                {/* Top row: Health ring + Win probability + summary */}
                <div className="flex items-center gap-4">
                  <HealthRing score={analysis.healthScore} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[#5B4FE9]" />
                      <span className="text-xs font-semibold text-[#5B4FE9] uppercase tracking-wider">AI Deal Intelligence</span>
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
                        const isCompleted = completedActions.has(a.action);
                        const priorityStyles: Record<string, string> = {
                          high: 'border-orange-500/30 hover:border-orange-500/50',
                          medium: 'border-amber-500/30 hover:border-amber-500/50',
                          low: 'border-blue-500/30 hover:border-blue-500/50',
                          critical: 'border-red-500/30 hover:border-red-500/50',
                        };
                        const borderStyle = isCompleted ? 'border-[var(--g-green)]/30 bg-[var(--g-green-soft)]' : (priorityStyles[a.priority] || priorityStyles.medium);

                        return (
                          <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg bg-card border ${borderStyle} transition-all ${isCompleted ? 'opacity-75' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${isCompleted ? 'text-[var(--g-green)] line-through' : 'text-foreground'}`}>
                                {isCompleted && <span className="inline-flex items-center gap-1 mr-1 no-underline"><CheckSquare className="h-3 w-3" /></span>}
                                {a.action}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {isCompleted ? 'Task created — view in Tasks tab' : a.reason}
                              </div>
                            </div>
                            {!isCompleted && (
                            <div className="flex flex-wrap items-center gap-1 flex-shrink-0">
                              {/* Task button — always shown */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCreateActionTask(a.action, 'task'); }}
                                disabled={createTaskMutation.isPending}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#7c3aed]/12 text-[#7c3aed] text-[10px] font-medium hover:bg-[#7c3aed]/20 transition-colors disabled:opacity-50"
                              >
                                {createTaskMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
                                Task
                              </button>
                              {/* Meeting button — for schedule/call/contact actions */}
                              {(a.action.toLowerCase().includes('meeting') || a.action.toLowerCase().includes('schedule') || a.action.toLowerCase().includes('call') || a.action.toLowerCase().includes('contact') || a.action.toLowerCase().includes('map') || a.action.toLowerCase().includes('intro')) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCreateActionTask(a.action, 'meeting'); }}
                                  disabled={createTaskMutation.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/12 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 transition-colors"
                                >
                                  <CalendarPlus className="h-3 w-3" /> Meeting
                                </button>
                              )}
                              {/* Follow-up button — for email/followup actions */}
                              {(a.action.toLowerCase().includes('email') || a.action.toLowerCase().includes('follow') || a.action.toLowerCase().includes('reach') || a.action.toLowerCase().includes('send') || a.action.toLowerCase().includes('document')) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCreateActionTask(a.action, 'followup'); }}
                                  disabled={createTaskMutation.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/12 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors"
                                >
                                  <Mail className="h-3 w-3" /> Follow-up
                                </button>
                              )}
                              {/* Stage change actions */}
                              {(a.action.toLowerCase().includes('stage') || a.action.toLowerCase().includes('move') || a.action.toLowerCase().includes('advance') || a.action.toLowerCase().includes('progress')) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowStageSelector(true); }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/12 text-amber-400 text-[10px] font-medium hover:bg-amber-500/20 transition-colors"
                                >
                                  <ArrowUpRight className="h-3 w-3" /> Stage
                                </button>
                              )}
                              {/* Escalation actions */}
                              {(a.action.toLowerCase().includes('escalat') || a.action.toLowerCase().includes('approval') || a.action.toLowerCase().includes('executive') || a.action.toLowerCase().includes('leadership') || a.action.toLowerCase().includes('assign') || a.action.toLowerCase().includes('presales')) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCreateActionTask(a.action, 'escalation'); }}
                                  disabled={createTaskMutation.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/12 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors"
                                >
                                  <Shield className="h-3 w-3" /> Escalate
                                </button>
                              )}
                            </div>
                            )}
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
                  ? 'border-[#5B4FE9] text-[#5B4FE9]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pilot Actions — stage-aware agent triggers */}
        <div className="px-5 pt-3">
          <DealPilotActions
            opportunityId={opp.id}
            dealStage={opp.status}
            customerName={opp.customerName}
            onResult={(result) => {
              if (result?.finalAnswer) {
                setAnalysis((prev: any) => ({
                  ...prev,
                  summary: result.finalAnswer,
                  agentId: result.agentId,
                }));
              }
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Deal Lifecycle Timeline */}
              <DealLifecycle opportunity={opp} />

              {/* Approval Chain */}
              {pendingApproval && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                  <div className="g-section-label text-amber-500">Approval Chain</div>
                  {(pendingApproval as any).approvalChain.map((step: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        step.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                        step.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-500'
                      }`}>
                        {step.status === 'approved' ? '\u2713' : step.status === 'rejected' ? '\u2717' : i + 1}
                      </span>
                      <span className="font-medium text-foreground">{step.role}</span>
                      <span className="text-muted-foreground">&mdash; {step.name}</span>
                      {step.status === 'pending' && (
                        <button onClick={() => approveMutation.mutate({ approvalId: (pendingApproval as any)._id, role: step.role })}
                          className="ml-auto px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] hover:bg-emerald-500/20">
                          Approve
                        </button>
                      )}
                      {step.status !== 'pending' && (
                        <span className={`ml-auto text-[10px] ${step.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {step.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

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

              {/* Linked Entities */}
              <div className="space-y-2">
                <div className="g-section-label">Linked Entities</div>

                {/* Linked contracts */}
                <Link href="/contracts" className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-xs hover:border-[#5B4FE9]/30 transition-all">
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-foreground">View Contracts</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
                </Link>

                {/* Parent opportunity */}
                {(opp as any).parentOpportunityId && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-xs w-full text-left">
                    <ArrowRight className="h-3.5 w-3.5 text-blue-400 rotate-180" />
                    <span className="text-foreground">Parent: {(opp as any).parentOpportunityId}</span>
                  </div>
                )}

                {/* Child opportunities */}
                {(opp as any).childOpportunityIds?.length > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <ArrowRight className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-foreground">{(opp as any).childOpportunityIds.length} follow-on deal(s)</span>
                  </div>
                )}

                {/* Converted from lead */}
                {(opp as any).convertedFromLeadId && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-muted-foreground">Converted from lead</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {opp.customTags && opp.customTags.length > 0 && (
                <div>
                  <div className="g-section-label mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.customTags.map(tag => (
                      <span key={tag} className="g-chip bg-[#5B4FE9]/10 text-[#5B4FE9] border border-[#5B4FE9]/20">{tag}</span>
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
                          <GitBranch className="h-3 w-3 text-[#5B4FE9]" />
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
                          {tmpl.aiGenerable && <span className="g-chip bg-[#5B4FE9]/10 text-[#5B4FE9]">AI</span>}
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
                  <div className="w-9 h-9 rounded-full bg-[#5B4FE9]/15 flex items-center justify-center text-[#5B4FE9] text-xs font-bold flex-shrink-0">
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
                      className="px-3 py-1.5 text-xs font-medium bg-[#5B4FE9] text-white rounded-lg hover:bg-[#4A3ED4] disabled:opacity-50 transition-colors"
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

              {/* AI Warning: No Decision Maker */}
              {stakeholders.length > 0 && !stakeholders.some(s => s.isDecisionMaker) && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>No decision maker identified. Deals without a DM have 40% lower win rates.</span>
                </div>
              )}

              {/* Add Stakeholder Button */}
              {!showStakeholderForm && (
                <button
                  onClick={() => setShowStakeholderForm(true)}
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-[#5B4FE9]/40 transition-colors text-sm"
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
                      className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-colors cursor-pointer ${t.status === 'complete' ? 'bg-green-500/20 border-green-500' : 'border-muted-foreground hover:border-[#5B4FE9]'}`}
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
                      className="px-3 py-1.5 text-xs font-medium bg-[#5B4FE9] text-white rounded-lg hover:bg-[#4A3ED4] disabled:opacity-50 transition-colors"
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
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-[#5B4FE9]/40 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
              )}

              {/* AI: All tasks complete */}
              {tasks.length > 0 && tasks.every(t => t.status === 'complete') && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
                  <CheckSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>All tasks complete! Consider moving to the next stage or generating a SOW.</span>
                </div>
              )}
              {/* AI: Overdue tasks warning */}
              {tasks.filter(t => t.status === 'pending').length > 0 && tasks.some(t => t.status === 'pending' && new Date(t.dueDate) < new Date()) && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{tasks.filter(t => t.status === 'pending' && new Date(t.dueDate) < new Date()).length} overdue task{tasks.filter(t => t.status === 'pending' && new Date(t.dueDate) < new Date()).length > 1 ? 's' : ''} — these block deal progress.</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'log' && (
            <div>
              {opp.conversationLog ? (
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{opp.conversationLog}</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center py-8 text-muted-foreground text-sm">No conversation log yet.</div>
                  <div className="p-3 rounded-lg bg-[#5B4FE9]/5 border border-[#5B4FE9]/20 flex items-center gap-2 text-xs text-[#5B4FE9]">
                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>No conversation log yet. Use the &quot;Notes&quot; button to capture meeting intel — AI will extract insights automatically.</span>
                  </div>
                </div>
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

          {/* ── Pricing Tab ── */}
          {activeTab === 'pricing' && (
            <DealPricingTab opportunity={opp} onSwitchTab={(tab) => setActiveTab(tab as any)} />
          )}

          {/* ── Presales Tab ── */}
          {activeTab === 'presales' && (
            <DealPresalesTab opportunity={opp} onSwitchTab={(tab) => setActiveTab(tab as any)} />
          )}

          {/* ── Contracts Tab ── */}
          {activeTab === 'contracts' && (
            <DealContractsTab opportunity={opp} onSwitchTab={(tab) => setActiveTab(tab as any)} />
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

// ── Pricing Tab Component ──
function DealPricingTab({ opportunity, onSwitchTab }: { opportunity: any; onSwitchTab?: (tab: string) => void }) {
  const updateOpp = trpc.opportunity.update.useMutation();
  const utils = trpc.useUtils();
  const GEO_RATES: Record<string, { label: string; multiplier: number }> = {
    us: { label: 'US (Onshore)', multiplier: 1.0 },
    india: { label: 'India (Offshore)', multiplier: 0.35 },
    latam: { label: 'LATAM (Nearshore)', multiplier: 0.55 },
  };
  const ROLES = [
    { role: 'Program Manager', baseRate: 130 },
    { role: 'Technical Architect', baseRate: 120 },
    { role: 'Sr Full Stack Engineer', baseRate: 95 },
    { role: 'QA Engineer', baseRate: 80 },
    { role: 'DevOps Engineer', baseRate: 95 },
    { role: 'AI/ML Engineer', baseRate: 130 },
    { role: 'Business Analyst', baseRate: 90 },
    { role: 'UX Designer', baseRate: 90 },
  ];

  const [lines, setLines] = useState([
    { id: '1', role: 'Program Manager', count: 1, geo: 'us', rate: 130 },
    { id: '2', role: 'Sr Full Stack Engineer', count: 2, geo: 'india', rate: 95 },
  ]);
  const [margin, setMargin] = useState(opportunity.margin || 28);
  const [duration, setDuration] = useState(parseInt(opportunity.dealDuration) || 12);

  const totalMonthly = lines.reduce((s, l) => s + l.rate * (GEO_RATES[l.geo]?.multiplier || 1) * l.count * 160, 0);
  const totalCost = totalMonthly * duration;
  const tcv = totalCost * (1 + margin / 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Pricing Estimate</span>
        <Link href="/pricing" className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1">
          Full Pricing Engine <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-[10px] text-muted-foreground">TCV</div>
          <div className="text-sm font-bold text-foreground g-metric">${(tcv / 1000).toFixed(0)}k</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-[10px] text-muted-foreground">Monthly</div>
          <div className="text-sm font-bold text-foreground g-metric">${(totalMonthly / 1000).toFixed(0)}k</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-[10px] text-muted-foreground">Margin</div>
          <div className="text-sm font-bold text-foreground g-metric">{margin}%</div>
        </div>
      </div>

      {/* Team composition */}
      <div className="space-y-2">
        <span className="g-section-label">Team Composition</span>
        {lines.map((line, i) => (
          <div key={line.id} className="flex items-center gap-2 text-xs">
            <select value={line.role} onChange={e => {
              const role = ROLES.find(r => r.role === e.target.value);
              const next = [...lines]; next[i] = { ...line, role: e.target.value, rate: role?.baseRate || line.rate }; setLines(next);
            }} className="flex-1 px-2 py-1.5 bg-card border border-border rounded-lg text-foreground">
              {ROLES.map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
            </select>
            <input type="number" value={line.count} onChange={e => { const next = [...lines]; next[i] = { ...line, count: Number(e.target.value) }; setLines(next); }}
              className="w-12 px-2 py-1.5 bg-card border border-border rounded-lg text-foreground text-center" min={1} />
            <select value={line.geo} onChange={e => { const next = [...lines]; next[i] = { ...line, geo: e.target.value }; setLines(next); }}
              className="w-24 px-2 py-1.5 bg-card border border-border rounded-lg text-foreground">
              {Object.entries(GEO_RATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="text-muted-foreground w-16 text-right">${(line.rate * (GEO_RATES[line.geo]?.multiplier || 1)).toFixed(0)}/hr</span>
            <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-[var(--g-red)]">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button onClick={() => setLines([...lines, { id: String(Date.now()), role: 'Sr Full Stack Engineer', count: 1, geo: 'india', rate: 95 }])}
          className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Add Role
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1">Duration (months)</label>
          <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={1} max={60}
            className="w-full px-2 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground" />
        </div>
        <div>
          <label className="block text-[10px] text-muted-foreground mb-1">Margin %</label>
          <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))} min={0} max={80}
            className="w-full px-2 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground" />
        </div>
      </div>

      {/* Cross-tab actions */}
      <div className="pt-3 border-t border-border space-y-2">
        {Math.round(tcv) !== (opportunity.tcv || 0) && (
          <button onClick={() => {
            updateOpp.mutate({ id: opportunity.id, tcv: Math.round(tcv), margin } as any, {
              onSuccess: () => utils.opportunity.list.invalidate(),
            });
          }} disabled={updateOpp.isPending}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
            <DollarSign className="h-3 w-3" /> {updateOpp.isPending ? 'Updating...' : `Apply $${(tcv/1000).toFixed(0)}k TCV to Deal`}
          </button>
        )}
        <div className="flex gap-2">
          {onSwitchTab && (
            <>
              <button onClick={() => onSwitchTab('presales')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <FileText className="h-3 w-3" /> Build Proposal
              </button>
              <button onClick={() => onSwitchTab('contracts')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <FileText className="h-3 w-3" /> Create Contract
              </button>
            </>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground text-center">
          Team: {lines.reduce((s, l) => s + l.count, 0)} resources · {lines.filter(l => l.geo === 'us').reduce((s,l) => s + l.count, 0)} onshore · {lines.filter(l => l.geo !== 'us').reduce((s,l) => s + l.count, 0)} offshore
        </div>
      </div>
    </div>
  );
}

// ── Presales Tab Component ──
function DealPresalesTab({ opportunity, onSwitchTab }: { opportunity: any; onSwitchTab?: (tab: string) => void }) {
  const chatMutation = trpc.ai.chat.useMutation();
  const [proposalSections, setProposalSections] = useState<Record<string, string>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const stakeholders = opportunity.customerStakeholders || [];
  const tasks = opportunity.subTasks || [];

  const SECTIONS = [
    { id: 'exec_summary', label: 'Executive Summary', prompt: `Write a professional Executive Summary (3-4 paragraphs) for a proposal to ${opportunity.customerName} for "${opportunity.opportunityName}". Include: business challenge, proposed solution, expected outcomes, and why Galent is the right partner. TCV: $${(opportunity.tcv||0).toLocaleString()}, Duration: ${opportunity.dealDuration}, Industry: ${opportunity.industry}. Write the actual proposal text, NOT instructions.` },
    { id: 'scope', label: 'Scope of Work', prompt: `Write the Scope of Work section for ${opportunity.customerName}'s "${opportunity.opportunityName}" project. Include: in-scope deliverables (5-8 bullet points), out-of-scope items, key milestones, and acceptance criteria. Industry: ${opportunity.industry}. Write actual proposal content.` },
    { id: 'approach', label: 'Technical Approach', prompt: `Write the Technical Approach section for ${opportunity.customerName}'s "${opportunity.opportunityName}". Describe the methodology, technology stack, architecture considerations, and implementation phases. Industry: ${opportunity.industry}. Write actual proposal content, not advice.` },
    { id: 'team', label: 'Team & Resources', prompt: `Write the Team & Resources section proposing a team for ${opportunity.customerName}'s "${opportunity.opportunityName}" (${opportunity.dealDuration}). Include role descriptions, responsibilities, and a team org chart in text form. Stakeholders: ${stakeholders.map((s:any) => s.name+' ('+s.title+')').join(', ')||'TBD'}. Write actual proposal content.` },
    { id: 'timeline', label: 'Timeline & Milestones', prompt: `Write a Timeline & Milestones section for ${opportunity.customerName}'s "${opportunity.opportunityName}" project (${opportunity.dealDuration}). Include 4-6 phases with start/end dates, key milestones, and deliverables per phase. Write as actual proposal content.` },
    { id: 'pricing', label: 'Pricing Summary', prompt: `Write a Pricing Summary section for ${opportunity.customerName}'s "${opportunity.opportunityName}". TCV: $${(opportunity.tcv||0).toLocaleString()}, Duration: ${opportunity.dealDuration}, Margin: ${opportunity.margin||28}%. Include pricing structure, payment terms, and any assumptions. Write as actual proposal content.` },
    { id: 'assumptions', label: 'Assumptions & Risks', prompt: `Write Assumptions & Risks for ${opportunity.customerName}'s "${opportunity.opportunityName}". List 5-6 key assumptions and 4-5 risks with mitigation strategies. Industry: ${opportunity.industry}. Write as actual proposal content.` },
    { id: 'terms', label: 'Terms & Conditions', prompt: `Write standard Terms & Conditions for a ${opportunity.dealDuration} engagement with ${opportunity.customerName}. Include: payment terms, IP ownership, confidentiality, change management, termination, and warranty. Write as actual proposal content.` },
  ];

  const handleGenerateSection = async (sectionId: string) => {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    setProposalSections(p => ({ ...p, [sectionId]: '..generating..' }));
    setExpandedSection(sectionId);
    try {
      const result = await chatMutation.mutateAsync({
        message: section.prompt,
        context: { opportunityId: opportunity.id, page: 'presales-proposal' },
      });
      setProposalSections(p => ({ ...p, [sectionId]: result.response }));
    } catch {
      setProposalSections(p => ({ ...p, [sectionId]: 'Generation failed — check API key' }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Deal lifecycle flow indicator */}
      <div className="flex items-center gap-1 text-[10px]">
        {['Presales', 'Pricing', 'Contracts'].map((step, i) => (
          <button key={step} onClick={() => onSwitchTab?.(step.toLowerCase())}
            className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-colors ${
              step === 'Presales' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}>
            {step} {step === 'Presales' && '●'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Proposal Studio</span>
        <Link href="/presales" className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1">
          Full Presales OS <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Stage readiness */}
      <div className="p-3 rounded-lg bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground">Proposal Readiness</span>
          <span className="text-xs text-muted-foreground">
            {Object.keys(proposalSections).length}/{SECTIONS.length} sections
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-[#7c3aed] transition-all"
            style={{ width: `${(Object.keys(proposalSections).length / SECTIONS.length) * 100}%` }} />
        </div>
      </div>

      {/* Proposal sections */}
      <div className="space-y-2">
        <span className="g-section-label">Proposal Sections</span>
        {SECTIONS.map(section => {
          const content = proposalSections[section.id];
          const isGenerating = content === '..generating..';
          return (
            <div key={section.id} className="rounded-lg bg-card border border-border overflow-hidden">
              <button onClick={() => content && !isGenerating ? setExpandedSection(expandedSection === section.id ? null : section.id) : handleGenerateSection(section.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2">
                  {content && !isGenerating ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--g-green-soft)] flex items-center justify-center">
                      <CheckSquare className="h-3 w-3 text-[var(--g-green)]" />
                    </div>
                  ) : isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#7c3aed]" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground">{section.label}</span>
                </div>
                {!content && !isGenerating ? (
                  <span className="flex items-center gap-1 text-[10px] text-[#7c3aed] font-medium">
                    <Sparkles className="h-3 w-3" /> AI Draft
                  </span>
                ) : content && !isGenerating ? (
                  <span className="text-[10px] text-[var(--g-green)]">{expandedSection === section.id ? 'Collapse' : 'View'}</span>
                ) : null}
              </button>
              {expandedSection === section.id && content && !isGenerating && (
                <div className="px-3 pb-3 border-t border-border/50">
                  <div className="text-[11px] text-foreground mt-2 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                    {content}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { navigator.clipboard.writeText(content); }}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button onClick={() => handleGenerateSection(section.id)}
                      className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Contracts Tab Component ──
function DealContractsTab({ opportunity, onSwitchTab }: { opportunity: any; onSwitchTab?: (tab: string) => void }) {
  const { data: contracts = [] } = trpc.contract.list.useQuery();
  const createMutation = trpc.contract.create.useMutation();
  const utils = trpc.useUtils();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'SOW', value: opportunity.tcv || 0, startDate: '', endDate: '' });

  // Filter contracts for this opportunity
  const dealContracts = (contracts as any[]).filter((c: any) => c.opportunityId === opportunity.id);

  const handleCreate = async () => {
    if (!form.title) return;
    await createMutation.mutateAsync({
      title: form.title,
      type: form.type,
      value: Number(form.value),
      opportunityId: opportunity.id,
      customerName: opportunity.customerName,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    } as any);
    utils.contract.list.invalidate();
    setShowCreateForm(false);
    setForm({ title: '', type: 'SOW', value: opportunity.tcv || 0, startDate: '', endDate: '' });
  };

  return (
    <div className="space-y-4">
      {/* Deal lifecycle flow indicator */}
      <div className="flex items-center gap-1 text-[10px]">
        {['Presales', 'Pricing', 'Contracts'].map((step) => (
          <button key={step} onClick={() => onSwitchTab?.(step.toLowerCase())}
            className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-colors ${
              step === 'Contracts' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}>
            {step} {step === 'Contracts' && '●'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Contracts</span>
        <div className="flex items-center gap-2">
          <Link href="/contracts" className="text-[10px] text-muted-foreground hover:underline">View All</Link>
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1 text-[10px] text-[#7c3aed] font-medium hover:underline">
            <Plus className="h-3 w-3" /> New Contract
          </button>
        </div>
      </div>

      {/* Deal context */}
      <div className="p-2 rounded-lg bg-secondary/50 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{opportunity.customerName} · {opportunity.status} · {opportunity.dealDuration}</span>
        <span className="font-semibold text-foreground">${((opportunity.tcv || 0) / 1000).toFixed(0)}k TCV</span>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="p-3 rounded-lg bg-card border border-border space-y-2 animate-flow-in">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="Contract title *" className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground" />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground">
              {['SOW', 'MSA', 'NDA', 'Change Order', 'Amendment'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))}
              placeholder="Value" className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground" />
            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
              className="px-2 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={handleCreate} disabled={!form.title || createMutation.isPending}
              className="px-3 py-1 text-[10px] rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Contract list */}
      {dealContracts.length > 0 ? (
        <div className="space-y-2">
          {dealContracts.map((contract: any) => (
            <div key={contract._id} className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{contract.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {contract.type} · ${((contract.value || 0) / 1000).toFixed(0)}k
                  {contract.status && <span className="ml-2">{contract.status}</span>}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                contract.status === 'active' ? 'bg-[var(--g-green-soft)] text-[var(--g-green)]'
                : contract.status === 'pending_approval' ? 'bg-[var(--g-amber-soft)] text-[var(--g-amber)]'
                : 'bg-secondary text-muted-foreground'
              }`}>{contract.status || 'draft'}</span>
            </div>
          ))}
        </div>
      ) : !showCreateForm ? (
        <div className="text-center py-6">
          <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-xs text-muted-foreground mb-2">No contracts for this deal yet.</p>
          <button onClick={() => setShowCreateForm(true)}
            className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1 mx-auto">
            <Plus className="h-3 w-3" /> Create First Contract
          </button>
        </div>
      ) : null}
    </div>
  );
}
