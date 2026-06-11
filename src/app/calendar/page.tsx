'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { DealDetail } from '@/components/modals/DealDetail';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Kanban, Table as TableIcon, TrendingUp, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';

const VIEW_MODES = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'timeline', label: 'Timeline', icon: TrendingUp, href: '/timeline' },
  { id: 'schedule', label: 'Schedule', icon: Clock, href: '/schedule' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

function CalendarContent() {
  const { opportunities } = useOpportunities();
  const pathname = usePathname();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showSyncConfig, setShowSyncConfig] = useState(false);

  // Collect all events (deal close dates + task due dates)
  const events = useMemo(() => {
    const evts: { date: Date; type: 'deal' | 'task'; title: string; subtitle: string; oppId?: string }[] = [];

    opportunities.forEach(opp => {
      // Deal close date
      if (opp.expectedCloseDate) {
        evts.push({
          date: new Date(opp.expectedCloseDate),
          type: 'deal',
          title: opp.customerName,
          subtitle: `${opp.status} · $${(opp.tcv / 1000).toFixed(0)}k`,
          oppId: opp.id,
        });
      }

      // Task due dates
      (opp.subTasks || []).forEach(task => {
        if (task.dueDate) {
          evts.push({
            date: new Date(task.dueDate),
            type: 'task',
            title: task.name,
            subtitle: `${task.owner} · ${task.priority}`,
            oppId: opp.id,
          });
        }
      });
    });

    return evts;
  }, [opportunities]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with weekday
  const startDay = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startDay).fill(null), ...days];

  const selectedEvents = selectedDate
    ? events.filter(e => isSameDay(e.date, selectedDate))
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* View Mode Tab Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit mb-6">
        {VIEW_MODES.map(mode => {
          const isActive = pathname === mode.href;
          return (
            <Link key={mode.id} href={mode.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <mode.icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#7c3aed]' : ''}`} />
              {mode.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-foreground w-36 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
            className="ml-2 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Today
          </button>
          <button onClick={() => setShowSyncConfig(!showSyncConfig)}
            className="ml-2 px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] font-medium hover:bg-[#7c3aed]/20 transition-colors">
            Sync Calendar
          </button>
        </div>
      </div>

      {/* Calendar Sync Configuration */}
      {showSyncConfig && (
        <div className="p-4 rounded-xl g-surface g-elevated space-y-3 animate-flow-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Calendar Sync</span>
            <button onClick={() => setShowSyncConfig(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <p className="text-xs text-muted-foreground">Connect your calendar to sync deal meetings, close dates, and task deadlines.</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'outlook', label: 'Outlook 365', color: '#0078d4' },
              { id: 'google', label: 'Google Calendar', color: '#4285f4' },
              { id: 'apple', label: 'Apple Calendar', color: '#333' },
            ].map(p => (
              <button key={p.id} onClick={() => {
                if (typeof window !== 'undefined') localStorage.setItem('calendar_sync_provider', p.id);
              }}
                className="p-3 rounded-lg border border-border text-center text-xs hover:border-[#7c3aed]/30 transition-colors">
                <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ backgroundColor: p.color + '20' }} />
                <div className="font-medium text-foreground">{p.label}</div>
              </button>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20 text-xs text-muted-foreground">
            <span className="text-[#7c3aed] font-medium">Setup: </span>
            Configure your calendar provider in <a href="/integrations" className="text-[#7c3aed] hover:underline">Integrations</a> with App Password or OAuth. Calendar sync uses the same credentials.
          </div>
        </div>
      )}

      <div className="g-surface g-elevated p-4 rounded-xl border border-border">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center text-[11px] font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} className="h-20" />;
            const dayEvents = events.filter(e => isSameDay(e.date, day));
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`h-20 p-1.5 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-[#7c3aed]/10 border border-[#7c3aed]/30'
                    : isToday
                      ? 'bg-card border border-border'
                      : 'hover:bg-card/50 border border-transparent'
                }`}
              >
                <div
                  className={`text-xs font-medium ${isToday ? 'text-[#7c3aed]' : 'text-foreground'}`}
                >
                  {format(day, 'd')}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((evt, j) => (
                    <div
                      key={j}
                      className={`text-[9px] px-1 py-0.5 rounded truncate ${
                        evt.type === 'deal'
                          ? 'bg-[#7c3aed]/10 text-[#7c3aed]'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-muted-foreground">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
          <span>Deal close dates</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Task due dates</span>
        </div>
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="g-surface g-elevated p-4 rounded-xl border border-border">
          <div className="g-section-label mb-3">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((evt, i) => (
                <button
                  key={i}
                  onClick={() => evt.oppId && setSelectedOppId(evt.oppId)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover-glow transition-all w-full text-left"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      evt.type === 'deal' ? 'bg-[#7c3aed]' : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{evt.title}</div>
                    <div className="text-xs text-muted-foreground">{evt.subtitle}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {evt.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <OpportunityProvider>
      <CalendarContent />
    </OpportunityProvider>
  );
}
