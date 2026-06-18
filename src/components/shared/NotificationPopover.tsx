'use client';

import { useState } from 'react';
import { Bell, CheckCircle2, XCircle, Plus, ArrowRight, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from '@/lib/trpc/client';

function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const typeColors: Record<string, string> = {
  'deal_stage_change': 'bg-emerald-500',
  'deal_created': 'bg-blue-500',
  'deal_won': 'bg-emerald-400',
  'deal_lost': 'bg-red-500',
  'overdue_task': 'bg-orange-500',
  'ai_signal': 'bg-purple-500',
  'teams_signal': 'bg-indigo-500',
  'outlook_signal': 'bg-blue-500',
  'contract_expiry': 'bg-red-500',
  'deal_assignment': 'bg-blue-500',
  'system': 'bg-zinc-400',
};

const sourceLabels: Record<string, string> = {
  'teams-chat': '💬 Teams',
  'teams-channel': '📢 Teams Channel',
  'outlook': '📧 Outlook',
};

function isSignalNotification(notif: any): boolean {
  return ['ai_signal', 'teams_signal', 'outlook_signal'].includes(notif.type) ||
    notif.metadata?.status === 'pending_acceptance';
}

export function NotificationPopover() {
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.notification.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: unreadCount = 0 } = trpc.notification.getUnreadCount.useQuery(undefined, { refetchInterval: 15000 });
  const [processing, setProcessing] = useState<string | null>(null);

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });
  const createOpp = trpc.opportunity.create.useMutation({
    onSuccess: () => { utils.opportunity.list.invalidate(); },
  });

  const handleAcceptSignal = async (notif: any) => {
    setProcessing(notif._id);
    // Mark as read
    markRead.mutate({ id: notif._id });

    // If there's a matched deal, just accept (already logged)
    if (notif.metadata?.matchedDealId) {
      setProcessing(null);
      return;
    }

    // No matched deal — create new opportunity from signal
    const meta = notif.metadata || {};
    try {
      await createOpp.mutateAsync({
        customerName: meta.customerName || notif.title?.replace(/^.*:\s*/, '') || 'New Lead',
        opportunityName: `Signal: ${meta.customerName || 'New Lead'} — ${meta.intent || 'Inbound'}`,
        status: 'Discovery',
        tcv: 0,
        expectedCloseDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        startDate: new Date().toISOString(),
        primaryOwner: meta.senderName || 'Unassigned',
        industry: '',
        region: 'North America',
        source: meta.source || 'Signal',
        dealDuration: '12 months',
      } as any);
    } catch { /* best effort */ }
    setProcessing(null);
  };

  const handleDismissSignal = (notif: any) => {
    markRead.mutate({ id: notif._id });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'animate-bounce-soft' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-[#7c3aed] text-white text-[9px] font-bold flex items-center justify-center px-0.5 animate-pulse-live">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
          <div className="font-semibold text-sm">Notifications</div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 text-xs" onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {(notifications as any[]).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
            )}
            {(notifications as any[]).map((notif: any) => {
              const isSignal = isSignalNotification(notif);
              const meta = notif.metadata || {};
              const source = sourceLabels[meta.source] || meta.source || '';
              const isProcessing = processing === notif._id;

              return (
                <div key={notif._id}
                  className={`p-4 transition-colors ${!notif.read ? 'bg-[var(--g-brand-soft)]' : ''}`}>
                  <div className="flex gap-3 items-start">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${notif.read ? 'bg-transparent' : (typeColors[notif.type] || 'bg-zinc-400')}`} />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>

                      {/* Signal metadata badges */}
                      {isSignal && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {source && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{source}</span>}
                          {meta.intent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{meta.intent?.replace('_', ' ')}</span>}
                          {meta.urgency && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            meta.urgency === 'high' ? 'bg-red-500/10 text-red-400' : meta.urgency === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-500/10 text-muted-foreground'
                          }`}>{meta.urgency}</span>}
                          {meta.matchedDealName && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">→ {meta.matchedDealName}</span>}
                        </div>
                      )}

                      {/* Action buttons for signals */}
                      {isSignal && !notif.read && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={(e) => { e.stopPropagation(); handleAcceptSignal(notif); }}
                            disabled={isProcessing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            {meta.matchedDealId ? 'Accept' : 'Accept & Create Opp'}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDismissSignal(notif); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:bg-secondary transition-colors">
                            <XCircle className="h-3 w-3" /> Dismiss
                          </button>
                        </div>
                      )}

                      {/* Accepted state */}
                      {isSignal && notif.read && meta.status === 'accepted' && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Accepted
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground pt-0.5">
                        {notif.createdAt ? timeAgo(notif.createdAt) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
