'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { useOpportunities } from '@/lib/store';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Status, Opportunity } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc/client';
import {
  ArrowRight, CheckCircle, XCircle, AlertTriangle, Sparkles,
  Loader2, Calendar, DollarSign, Users, FileText, Edit3
} from 'lucide-react';
import { format } from 'date-fns';

const COLUMNS: Status[] = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];

interface KanbanBoardProps {
  onCardClick?: (id: string) => void;
}

export function KanbanBoard({ onCardClick }: KanbanBoardProps) {
  const { opportunities, filteredOpportunities, updateOpportunity } = useOpportunities();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ oppId: string; oppName: string; customerName: string; fromStage: string; toStage: string } | null>(null);

  // Editable fields for the move dialog
  const [editTcv, setEditTcv] = useState('');
  const [editCloseDate, setEditCloseDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showEditFields, setShowEditFields] = useState(false);

  const { data: targetOntology } = trpc.ontology.getForStage.useQuery(
    { stage: pendingMove?.toStage || '' },
    { enabled: !!pendingMove }
  );

  // AI analysis on stage change
  const aiAnalysisMutation = trpc.ai.chat.useMutation();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const opportunity = pendingMove ? opportunities.find(o => o.id === pendingMove.oppId) : null;
  const gateResults = (targetOntology?.gateCriteria || []).map((gate: any) => {
    let met = false;
    if (!opportunity) return { ...gate, met };
    if (gate.field === 'tcv') met = (opportunity.tcv || 0) > 0;
    else if (gate.field === 'margin') met = (opportunity.margin || 0) >= 15;
    else if (gate.field === 'industry') met = !!opportunity.industry;
    else if (gate.field === 'billingModel') met = !!opportunity.billingModel || !!opportunity.engagementType;
    else if (gate.field === 'customerStakeholders') met = (opportunity.customerStakeholders || []).length > 0;
    else if (gate.field === 'conversationLog') met = (opportunity.conversationLog || '').length > 50;
    return { ...gate, met };
  });
  const allGatesMet = gateResults.length === 0 || gateResults.every((g: any) => g.met);
  const unmetGates = gateResults.filter((g: any) => !g.met);
  const metGates = gateResults.filter((g: any) => g.met);

  // Auto-run AI analysis when the confirmation dialog opens
  useEffect(() => {
    if (pendingMove && opportunity) {
      setAiAnalysis(null);
      setShowEditFields(false);
      setEditNotes('');
      setEditTcv(String(opportunity.tcv || 0));
      setEditCloseDate(opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), 'yyyy-MM-dd') : '');

      const stakeholders = opportunity.customerStakeholders || [];
      const tasks = opportunity.subTasks || [];
      aiAnalysisMutation.mutate({
        message: `I'm moving deal "${opportunity.customerName} — ${opportunity.opportunityName}" from ${pendingMove.fromStage} to ${pendingMove.toStage}.

Deal details: TCV $${(opportunity.tcv||0).toLocaleString()}, ${stakeholders.length} stakeholders, ${tasks.length} tasks (${tasks.filter((t:any)=>t.status==='complete').length} complete), close date ${opportunity.expectedCloseDate}.

Give me a brief (3-4 sentences) assessment of whether this deal is ready to move to ${pendingMove.toStage}. Highlight any risks or missing items. Be specific and actionable.`,
        context: { opportunityId: pendingMove.oppId, page: 'kanban-move' },
      }, {
        onSuccess: (data) => setAiAnalysis(data.response),
        onError: () => setAiAnalysis('AI analysis unavailable. Review the gate criteria below to decide.'),
      });
    }
  }, [pendingMove?.oppId, pendingMove?.toStage]); // eslint-disable-line

  const columns = useMemo(() => {
    const cols: Record<Status, Opportunity[]> = {
      Discovery: [], Qualification: [], Proposal: [], Negotiation: [], Won: [], Lost: [], 'On Hold': []
    };
    filteredOpportunities.forEach(opp => {
      if (cols[opp.status]) cols[opp.status].push(opp);
    });
    return cols;
  }, [filteredOpportunities]);

  const activeOpportunity = useMemo(() =>
    opportunities.find(o => o.id === activeId),
    [activeId, opportunities]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const onDragOver = () => {};

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) { setActiveId(null); return; }

    const activeId = active.id as string;
    const overId = over.id as string;
    const opportunity = opportunities.find(o => o.id === activeId);
    if (!opportunity) return;

    let newStatus: Status | null = null;
    if (over.data.current?.type === 'Column') newStatus = over.data.current.status as Status;
    else if (over.data.current?.type === 'Opportunity') {
      const overOpp = opportunities.find(o => o.id === overId);
      if (overOpp) newStatus = overOpp.status;
    }

    if (newStatus && newStatus !== opportunity.status) {
      setPendingMove({
        oppId: activeId,
        oppName: opportunity.opportunityName,
        customerName: opportunity.customerName,
        fromStage: opportunity.status,
        toStage: newStatus,
      });
    }
    setActiveId(null);
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;

    // Build updates object with any edited fields
    const updates: any = { status: pendingMove.toStage as Status };
    if (showEditFields) {
      const newTcv = Number(editTcv);
      if (!isNaN(newTcv) && newTcv !== (opportunity?.tcv || 0)) updates.tcv = newTcv;
      if (editCloseDate && editCloseDate !== format(new Date(opportunity?.expectedCloseDate || ''), 'yyyy-MM-dd')) {
        updates.expectedCloseDate = editCloseDate;
      }
    }
    if (editNotes.trim()) {
      const existing = opportunity?.conversationLog || '';
      updates.conversationLog = `${existing}\n\n[${format(new Date(), 'MMM d, yyyy')} — Stage move to ${pendingMove.toStage}]\n${editNotes.trim()}`.trim();
    }

    await updateOpportunity(pendingMove.oppId, updates);
    setPendingMove(null);
    setAiAnalysis(null);
    setEditNotes('');
    setShowEditFields(false);
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  };

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="flex gap-4 h-full pb-4 min-w-max">
            {COLUMNS.map(status => (
              <KanbanColumn key={status} status={status} opportunities={columns[status]} onCardClick={(id) => onCardClick?.(id)} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeOpportunity && (
              <div className="w-[300px] rotate-2 cursor-grabbing">
                <KanbanCard opportunity={activeOpportunity} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {/* ── Stage Change Confirmation Dialog ── */}
      {pendingMove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setPendingMove(null); setAiAnalysis(null); }} />
          <div className="relative w-full max-w-lg g-surface g-elevated rounded-2xl shadow-2xl overflow-hidden card-enter max-h-[85vh] overflow-y-auto">

            {/* Header with stage flow */}
            <div className="p-5 pb-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground mb-2">Move Deal</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-lg bg-secondary text-muted-foreground font-medium">{pendingMove.fromStage}</span>
                <ArrowRight className="h-4 w-4 text-[#7c3aed]" />
                <span className="px-3 py-1 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] font-semibold">{pendingMove.toStage}</span>
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-foreground">{pendingMove.customerName}</div>
                <div className="text-xs text-muted-foreground">{pendingMove.oppName}</div>
              </div>
            </div>

            {/* Deal snapshot */}
            {opportunity && (
              <div className="px-5 py-3 border-b border-border bg-secondary/30">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">TCV</div>
                    <div className="text-sm font-semibold text-foreground g-metric">${((opportunity.tcv || 0) / 1000).toFixed(0)}k</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Stakeholders</div>
                    <div className="text-sm font-semibold text-foreground">{(opportunity.customerStakeholders || []).length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</div>
                    <div className="text-sm font-semibold text-foreground">
                      {(opportunity.subTasks || []).filter((t: any) => t.status === 'complete').length}/{(opportunity.subTasks || []).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Close Date</div>
                    <div className="text-sm font-semibold text-foreground">
                      {opportunity.expectedCloseDate ? format(new Date(opportunity.expectedCloseDate), 'MMM d') : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* AI Analysis */}
              <div className="rounded-xl border border-[#7c3aed]/20 bg-[#7c3aed]/5 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
                  <span className="text-xs font-semibold text-[#7c3aed]">AI Analysis</span>
                </div>
                {aiAnalysisMutation.isPending ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-smooth-spin text-[#7c3aed]" />
                    Analyzing deal readiness...
                  </div>
                ) : aiAnalysis ? (
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                ) : null}
              </div>

              {/* Gate Criteria */}
              {gateResults.length > 0 && (
                <div className="space-y-2">
                  <div className="g-section-label">Stage Gate Criteria</div>
                  <div className="space-y-1.5">
                    {gateResults.map((gate: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs py-1">
                        {gate.met ? (
                          <CheckCircle className="h-4 w-4 text-[var(--g-green)] shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[var(--g-red)] shrink-0" />
                        )}
                        <span className={gate.met ? 'text-foreground' : 'text-[var(--g-red)]'}>{gate.description}</span>
                      </div>
                    ))}
                  </div>
                  {unmetGates.length > 0 && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-[var(--g-amber-soft)]">
                      <AlertTriangle className="h-3.5 w-3.5 text-[var(--g-amber)] shrink-0 mt-0.5" />
                      <span className="text-[11px] text-[var(--g-amber)]">
                        {unmetGates.length} gate{unmetGates.length > 1 ? 's' : ''} not met. You can still override, but this deal may not be ready.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Edit deal fields toggle */}
              <div>
                <button onClick={() => setShowEditFields(!showEditFields)}
                  className="flex items-center gap-1.5 text-xs text-[#7c3aed] hover:underline">
                  <Edit3 className="h-3 w-3" /> {showEditFields ? 'Hide' : 'Edit deal fields before moving'}
                </button>

                {showEditFields && (
                  <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-lg bg-card border border-border card-enter">
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">TCV ($)</label>
                      <input type="number" value={editTcv} onChange={e => setEditTcv(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground g-metric" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-muted-foreground mb-1">Expected Close</label>
                      <input type="date" value={editCloseDate} onChange={e => setEditCloseDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg text-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes for this stage transition */}
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Notes (optional — added to deal log)</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
                  placeholder="Why are you moving this deal? Key decisions, context..."
                  className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end p-5 pt-3 border-t border-border bg-secondary/20">
              <button
                onClick={() => { setPendingMove(null); setAiAnalysis(null); }}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMove}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  allGatesMet
                    ? 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white'
                    : 'bg-[var(--g-amber)] hover:opacity-90 text-white'
                }`}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                {allGatesMet ? `Move to ${pendingMove.toStage}` : `Override & Move to ${pendingMove.toStage}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
