'use client';

import { useMemo, useState } from 'react';
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

const COLUMNS: Status[] = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];

interface KanbanBoardProps {
  onCardClick?: (id: string) => void;
}

export function KanbanBoard({ onCardClick }: KanbanBoardProps) {
  const { opportunities, filteredOpportunities, updateOpportunity } = useOpportunities();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ oppId: string; oppName: string; customerName: string; fromStage: string; toStage: string } | null>(null);

  const columns = useMemo(() => {
    const cols: Record<Status, Opportunity[]> = {
      Discovery: [],
      Qualification: [],
      Proposal: [],
      Negotiation: [],
      Won: [],
      Lost: [],
      'On Hold': []
    };

    filteredOpportunities.forEach(opp => {
      if (cols[opp.status]) {
        cols[opp.status].push(opp);
      }
    });

    return cols;
  }, [filteredOpportunities]);

  const activeOpportunity = useMemo(() => 
    opportunities.find(o => o.id === activeId), 
    [activeId, opportunities]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Prevent accidental drags
      },
    })
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragOver = (event: DragOverEvent) => {
    // We can implement optimistic updates here for smoother UX
    // But for now, we'll just handle logic in DragEnd
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the dropped opportunity
    const opportunity = opportunities.find(o => o.id === activeId);
    if (!opportunity) return;

    // Determine the new status
    // If dropped on a column (over.data.current.type === 'Column')
    // Or dropped on a card in a column
    let newStatus: Status | null = null;

    if (over.data.current?.type === 'Column') {
      newStatus = over.data.current.status as Status;
    } else if (over.data.current?.type === 'Opportunity') {
      const overOpportunity = opportunities.find(o => o.id === overId);
      if (overOpportunity) {
        newStatus = overOpportunity.status;
      }
    }

    if (newStatus && newStatus !== opportunity.status) {
      // Show confirmation dialog instead of instant move
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

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  const handleCardClick = (id: string) => {
    if (onCardClick) {
      onCardClick(id);
    }
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
              <KanbanColumn
                key={status}
                status={status}
                opportunities={columns[status]}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeOpportunity && (
              <div className="w-[300px] rotate-2 cursor-grabbing">
                <KanbanCard 
                  opportunity={activeOpportunity} 
                  onClick={() => {}} 
                />
              </div>
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {/* Stage Change Confirmation Dialog */}
      {pendingMove && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPendingMove(null)} />
          <div className="relative w-full max-w-md g-surface g-elevated rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Move Deal?</h3>
            <p className="text-sm text-muted-foreground">
              Move <span className="font-medium text-foreground">{pendingMove.customerName}</span> from{' '}
              <span className="g-chip bg-secondary text-muted-foreground">{pendingMove.fromStage}</span>{' → '}
              <span className="g-chip bg-[#7c3aed]/10 text-[#7c3aed]">{pendingMove.toStage}</span>?
            </p>
            <p className="text-xs text-muted-foreground">{pendingMove.oppName}</p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setPendingMove(null)}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateOpportunity(pendingMove.oppId, { status: pendingMove.toStage as Status });
                  if (onCardClick) setTimeout(() => onCardClick(pendingMove.oppId), 300);
                  setPendingMove(null);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}