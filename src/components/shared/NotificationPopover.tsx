'use client';

import { Bell } from "lucide-react";
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
  'contract_expiry': 'bg-red-500',
  'deal_assignment': 'bg-blue-500',
  'system': 'bg-zinc-400',
};

export function NotificationPopover() {
  const utils = trpc.useUtils();
  const { data: notifications = [] } = trpc.notification.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: unreadCount = 0 } = trpc.notification.getUnreadCount.useQuery(undefined, { refetchInterval: 15000 });

  // Notifications auto-refresh via polling (refetchInterval above)
  // Socket.IO real-time available when using custom server.ts
  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
          <div className="font-semibold text-sm">Notifications</div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          <div className="divide-y">
            {(notifications as any[]).length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            )}
            {(notifications as any[]).map((notif: any) => (
              <div
                key={notif._id}
                className={`p-4 hover:bg-secondary/50 cursor-pointer transition-colors ${!notif.read ? 'bg-[var(--g-brand-soft)]' : ''}`}
                onClick={() => {
                  if (!notif.read) markRead.mutate({ id: notif._id });
                }}
              >
                <div className="flex gap-3 items-start">
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${notif.read ? 'bg-transparent' : (typeColors[notif.type] || 'bg-zinc-400')}`} />
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className={`text-sm leading-none ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      {notif.createdAt ? timeAgo(notif.createdAt) : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
