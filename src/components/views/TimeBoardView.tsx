'use client';

import { useMemo } from 'react';
import { useOpportunities } from '@/lib/store';
import { Opportunity, Task } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  format, 
  isBefore, 
  isToday, 
  isTomorrow, 
  startOfDay, 
  endOfWeek, 
  isAfter, 
  addWeeks, 
  startOfWeek, 
  endOfDay,
  isValid,
  parseISO,
  addDays,
  subDays
} from 'date-fns';
import { CalendarClock, CheckSquare, Briefcase, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';

interface TimeBoardViewProps {
  onItemClick?: (id: string, type: 'opportunity' | 'task') => void;
}

type TimeBucket = 'Late' | 'Today' | 'Tomorrow' | 'This Week' | 'Next Week' | 'Future' | 'No Date';

const BUCKETS: TimeBucket[] = ['Late', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'Future', 'No Date'];

interface TimeBoardItem {
  id: string;
  type: 'opportunity' | 'task';
  title: string;
  subtitle?: string;
  date?: string;
  status?: string;
  owner: string;
  priority?: string; // For tasks
  value?: number; // For opportunities
  opportunityId?: string; // For tasks to link back
}

function DraggableCard({ item, bucket, onClick, getPriorityColor, formatter }: { 
  item: TimeBoardItem, 
  bucket: string, 
  onClick: () => void,
  getPriorityColor: (p?: string) => string,
  formatter: Intl.NumberFormat
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.type}-${item.id}`,
    data: { item, bucket }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging ? "opacity-50" : "")}>
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-md transition-all border-l-4",
          item.type === 'opportunity' ? "border-l-primary" : "border-l-orange-500"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {item.type === 'opportunity' ? (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 border-primary/20 text-primary">Opp</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 border-orange-500/20 text-orange-600">Task</Badge>
                )}
                {item.priority && (
                  <Badge variant="secondary" className={cn("text-[10px] px-1 py-0 h-5", getPriorityColor(item.priority))}>
                    {item.priority}
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">
                {item.title}
              </h4>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {item.subtitle}
          </div>

          <div className="flex items-center justify-between pt-2 border-t mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                 <AvatarFallback className="text-[10px]">{(item.owner || '?').substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[80px]">{item.owner || 'Unassigned'}</span>
            </div>
            
            {item.type === 'opportunity' && item.value && (
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                {formatter.format(item.value)}
              </span>
            )}
            
            {item.date && (
              <div className={cn(
                "text-xs flex items-center gap-1",
                bucket === 'Late' ? "text-red-600 font-medium" : "text-slate-500"
              )}>
                <CalendarClock className="h-3 w-3" />
                {format(parseISO(item.date), 'MMM d')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({ bucket, children, count, getBucketColor }: { 
  bucket: TimeBucket, 
  children: React.ReactNode, 
  count: number,
  getBucketColor: (b: TimeBucket) => string 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: bucket
  });

  return (
    <div ref={setNodeRef} className={cn("w-[300px] flex flex-col gap-3 shrink-0 rounded-lg transition-colors", isOver ? "bg-slate-100 dark:bg-slate-800/50" : "")}>
      <div className={cn("p-3 rounded-lg border font-semibold flex items-center justify-between", getBucketColor(bucket))}>
        <span className="flex items-center gap-2">
          {bucket === 'Late' && <AlertCircle className="h-4 w-4" />}
          {bucket}
        </span>
        <Badge variant="secondary" className="bg-white/50 dark:bg-black/20 text-inherit border-0">
          {count}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 min-h-[100px]">
        {children}
        {count === 0 && (
          <div className="h-24 border-2 border-dashed rounded-lg border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 text-sm italic">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

export function TimeBoardView({ onItemClick }: TimeBoardViewProps) {
  const { opportunities, updateOpportunity, filters } = useOpportunities();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<TimeBoardItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 1. Flatten all items (Opportunities + Tasks)
  const allItems = useMemo(() => {
    const items: TimeBoardItem[] = [];

    // Process Opportunities
    opportunities.forEach(opp => {
      // Apply filters
      if (filters.search && !opp.customerName.toLowerCase().includes(filters.search.toLowerCase()) && 
          !opp.opportunityName.toLowerCase().includes(filters.search.toLowerCase())) {
        return;
      }
      if (filters.status.length > 0 && !filters.status.includes(opp.status)) return;
      if (filters.primaryOwner.length > 0 && !filters.primaryOwner.includes(opp.primaryOwner)) return;
      if (filters.region.length > 0 && !filters.region.includes(opp.region)) return;
      if (filters.industry.length > 0 && !filters.industry.includes(opp.industry)) return;

      // Only "Open" opportunities (exclude Won/Lost for "close date" tracking usually, but let's keep all unless specified)
      // The prompt says "captures all open opportunities". So exclude Won/Lost.
      if (opp.status === 'Won' || opp.status === 'Lost') return;

      items.push({
        id: opp.id,
        type: 'opportunity',
        title: opp.opportunityName,
        subtitle: opp.customerName,
        date: opp.expectedCloseDate,
        status: opp.status,
        owner: opp.primaryOwner,
        value: opp.tcv
      });

      // Process Subtasks
      opp.subTasks.forEach(task => {
        if (task.status === 'complete') return; // Only open tasks

        items.push({
          id: task.id,
          type: 'task',
          title: task.name,
          subtitle: opp.opportunityName, // Show Opportunity Name as context
          date: task.dueDate,
          status: task.status,
          owner: task.owner,
          priority: task.priority,
          opportunityId: opp.id
        });
      });
    });

    return items;
  }, [opportunities, filters]);

  // 2. Group into buckets
  const columns = useMemo(() => {
    const cols: Record<TimeBucket, TimeBoardItem[]> = {
      'Late': [],
      'Today': [],
      'Tomorrow': [],
      'This Week': [],
      'Next Week': [],
      'Future': [],
      'No Date': []
    };

    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = startOfDay(new Date(now.setDate(now.getDate() + 1))); // careful with setDate mutation
    // Reset date for calculations
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(new Date(new Date().setDate(new Date().getDate() + 1)));
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 }); // Monday start
    const startOfNextWeek = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    const endOfNextWeek = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });

    allItems.forEach(item => {
      if (!item.date) {
        cols['No Date'].push(item);
        return;
      }

      const itemDate = parseISO(item.date);
      if (!isValid(itemDate)) {
        cols['No Date'].push(item);
        return;
      }

      // Check buckets strictly
      if (isBefore(itemDate, today)) {
        cols['Late'].push(item);
      } else if (isToday(itemDate)) {
        cols['Today'].push(item);
      } else if (isTomorrow(itemDate)) {
        cols['Tomorrow'].push(item);
      } else if (isBefore(itemDate, endOfThisWeek) || itemDate.getTime() === endOfThisWeek.getTime()) {
        // It is after tomorrow but before end of week
        // Note: isThisWeek() includes today and tomorrow, so we use explicit check
        cols['This Week'].push(item);
      } else if (
        (isAfter(itemDate, startOfNextWeek) || itemDate.getTime() === startOfNextWeek.getTime()) && 
        (isBefore(itemDate, endOfNextWeek) || itemDate.getTime() === endOfNextWeek.getTime())
      ) {
        cols['Next Week'].push(item);
      } else {
        cols['Future'].push(item);
      }
    });

    return cols;
  }, [allItems]);

  const getBucketColor = (bucket: TimeBucket) => {
    switch (bucket) {
      case 'Late': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      case 'Today': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300';
      case 'Tomorrow': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      default: return 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'High': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'Medium': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'Low': return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
    }
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveItem(event.active.data.current?.item as TimeBoardItem);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    const item = active.data.current?.item as TimeBoardItem;
    const bucket = over.id as TimeBucket;
    
    // Calculate new date based on bucket
    let newDate: Date | null = null;
    const now = new Date();
    
    switch (bucket) {
      case 'Late':
        // Move to yesterday if dragged to Late
        newDate = subDays(new Date(), 1);
        break;
      case 'Today':
        newDate = new Date();
        break;
      case 'Tomorrow':
        newDate = addDays(new Date(), 1);
        break;
      case 'This Week':
        // Set to Friday of current week
        newDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        // If today is weekend, move to next Friday? No, keep it simple.
        break;
      case 'Next Week':
        // Set to Monday of next week
        newDate = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
        break;
      case 'Future':
        // Set to 2 weeks from now
        newDate = addWeeks(new Date(), 2);
        break;
      case 'No Date':
        newDate = null;
        break;
    }

    const dateString = newDate ? newDate.toISOString() : undefined;

    if (item.type === 'opportunity') {
      // Update opportunity close date
      updateOpportunity(item.id, { 
        expectedCloseDate: dateString || '' // If No Date, empty string or null? Type says string.
      });
    } else if (item.type === 'task' && item.opportunityId) {
      // Find opportunity and update task
      const opportunity = opportunities.find(o => o.id === item.opportunityId);
      if (opportunity) {
        const updatedTasks = opportunity.subTasks.map(t => 
          t.id === item.id ? { ...t, dueDate: dateString || '' } : t
        );
        updateOpportunity(opportunity.id, { subTasks: updatedTasks });
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="h-full flex flex-col">
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="flex gap-4 h-full pb-4 min-w-max">
            {BUCKETS.map(bucket => (
              <DroppableColumn 
                key={bucket} 
                bucket={bucket} 
                count={columns[bucket].length} 
                getBucketColor={getBucketColor}
              >
                {columns[bucket].map(item => (
                  <DraggableCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    bucket={bucket}
                    onClick={() => {
                      if (onItemClick) {
                        onItemClick(item.opportunityId || item.id, item.type);
                      }
                    }}
                    getPriorityColor={getPriorityColor}
                    formatter={formatter}
                  />
                ))}
              </DroppableColumn>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        <DragOverlay>
          {activeItem ? (
             <Card 
               className={cn(
                 "cursor-grabbing shadow-xl border-l-4 w-[280px]",
                 activeItem.type === 'opportunity' ? "border-l-primary" : "border-l-orange-500"
               )}
             >
               <CardContent className="p-3 space-y-2">
                 <div className="flex items-start justify-between gap-2">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       {activeItem.type === 'opportunity' ? (
                         <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 border-primary/20 text-primary">Opp</Badge>
                       ) : (
                         <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 border-orange-500/20 text-orange-600">Task</Badge>
                       )}
                       {activeItem.priority && (
                         <Badge variant="secondary" className={cn("text-[10px] px-1 py-0 h-5", getPriorityColor(activeItem.priority))}>
                           {activeItem.priority}
                         </Badge>
                       )}
                     </div>
                     <h4 className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">
                       {activeItem.title}
                     </h4>
                   </div>
                 </div>
                 <div className="text-xs text-muted-foreground">{activeItem.subtitle}</div>
               </CardContent>
             </Card>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}