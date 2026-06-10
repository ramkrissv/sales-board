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
      updateOpportunity(activeId, { status: newStatus });
      // Open deal detail for editing after stage change
      if (onCardClick) {
        setTimeout(() => onCardClick(activeId), 300);
      }
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
    </div>
  );
}