'use client';

import { useMemo } from 'react';
import {
  Mail, MessageSquare, Calendar, DollarSign, Users, FileText,
  ArrowRight, AlertTriangle, CheckCircle, Sparkles, TrendingUp,
  Video, Zap, Globe, Phone, Clock,
} from 'lucide-react';

interface Signal {
  id: string;
  type: 'email' | 'meeting' | 'teams' | 'stage_change' | 'task' | 'signal' | 'deal_created' | 'stakeholder' | 'contract' | 'ai_insight';
  title: string;
  description: string;
  dealName?: string;
  dealId?: string;
  timestamp: Date;
  icon: any;
  color: string;
  dotColor: string;
}

interface RevenueSignalsTimelineProps {
  opportunities: any[];
  activities: any[];
  onDealClick: (id: string) => void;
}

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; dotColor: string }> = {
  email: { icon: Mail, color: 'text-blue-400', dotColor: 'bg-blue-500' },
  meeting: { icon: Video, color: 'text-purple-400', dotColor: 'bg-purple-500' },
  teams: { icon: MessageSquare, color: 'text-indigo-400', dotColor: 'bg-indigo-500' },
  stage_change: { icon: ArrowRight, color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  task: { icon: CheckCircle, color: 'text-green-400', dotColor: 'bg-green-500' },
  signal: { icon: Zap, color: 'text-amber-400', dotColor: 'bg-amber-500' },
  deal_created: { icon: DollarSign, color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  stakeholder: { icon: Users, color: 'text-cyan-400', dotColor: 'bg-cyan-500' },
  contract: { icon: FileText, color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  ai_insight: { icon: Sparkles, color: 'text-[#7c3aed]', dotColor: 'bg-[#7c3aed]' },
};

export default function RevenueSignalsTimeline({ opportunities, activities, onDealClick }: RevenueSignalsTimelineProps) {
  const signals = useMemo(() => {
    const items: Signal[] = [];

    // Convert activities to signals
    (activities || []).forEach((act: any) => {
      const config = TYPE_CONFIG[act.type] || TYPE_CONFIG.signal;
      const opp = opportunities.find(o => o.id === act.entityId);
      items.push({
        id: act._id || `act-${Math.random()}`,
        type: act.type,
        title: act.description,
        description: act.entityName || '',
        dealName: opp?.customerName || act.entityName,
        dealId: act.entityType === 'opportunity' ? act.entityId : undefined,
        timestamp: new Date(act.createdAt),
        icon: config.icon,
        color: config.color,
        dotColor: config.dotColor,
      });
    });

    // Generate AI-insight signals from deal data
    opportunities.forEach(opp => {
      const ageDays = (Date.now() - new Date(opp.updatedAt || opp.createdAt).getTime()) / 86400000;

      // Stale deal signals
      if (ageDays > 14 && !['Won', 'Lost'].includes(opp.status)) {
        items.push({
          id: `stale-${opp.id}`,
          type: 'ai_insight',
          title: `${opp.customerName} is going stale — ${Math.floor(ageDays)} days without activity`,
          description: `${opp.opportunityName} · ${opp.status} · $${((opp.tcv || 0) / 1000).toFixed(0)}k`,
          dealName: opp.customerName,
          dealId: opp.id,
          timestamp: new Date(opp.updatedAt || opp.createdAt),
          icon: AlertTriangle,
          color: 'text-amber-400',
          dotColor: 'bg-amber-500',
        });
      }

      // Ready to close signals
      if (opp.status === 'Negotiation' && opp.tcv > 0) {
        items.push({
          id: `close-${opp.id}`,
          type: 'ai_insight',
          title: `${opp.customerName} ready to close — $${((opp.tcv || 0) / 1000).toFixed(0)}k in Negotiation`,
          description: `Owner: ${opp.primaryOwner} · Close: ${new Date(opp.expectedCloseDate).toLocaleDateString()}`,
          dealName: opp.customerName,
          dealId: opp.id,
          timestamp: new Date(),
          icon: TrendingUp,
          color: 'text-emerald-400',
          dotColor: 'bg-emerald-500',
        });
      }
    });

    // Sort by timestamp descending
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
  }, [opportunities, activities]);

  if (signals.length === 0) {
    return (
      <div className="text-center py-6">
        <Globe className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-xs text-muted-foreground">No recent signals</p>
      </div>
    );
  }

  // Group by date
  const grouped = signals.reduce<Record<string, Signal[]>>((acc, signal) => {
    const dateKey = signal.timestamp.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(signal);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-[#7c3aed]" />
        </div>
        <span className="text-xs font-semibold text-foreground">Revenue Signals</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
        <span className="text-[10px] text-muted-foreground ml-auto">{signals.length} signals</span>
      </div>

      <div className="relative">
        {Object.entries(grouped).map(([date, dateSignals], gi) => (
          <div key={date} className="mb-4">
            {/* Date header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{date}</div>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Signals for this date */}
            <div className="relative ml-3">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/40" />
              <div className="space-y-2">
                {dateSignals.map((signal, i) => {
                  const Icon = signal.icon;
                  return (
                    <div key={signal.id} className="relative pl-7 group reveal" style={{ animationDelay: `${(gi * 3 + i) * 0.05}s` }}>
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ${signal.dotColor} ring-2 ring-background transition-transform group-hover:scale-125`} />

                      {/* Signal content */}
                      <div
                        className={`flex items-start gap-2 py-1.5 px-2 rounded-lg transition-colors ${signal.dealId ? 'cursor-pointer hover:bg-card/80' : ''}`}
                        onClick={() => signal.dealId && onDealClick(signal.dealId)}
                      >
                        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${signal.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-foreground leading-snug">{signal.title}</div>
                          {signal.description && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{signal.description}</div>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {getRelativeTime(signal.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
