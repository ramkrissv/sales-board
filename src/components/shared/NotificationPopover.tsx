'use client';

import { Bell, Check, Clock, MessageSquare, AlertTriangle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, subMinutes, subHours } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: Date;
  read: boolean;
  type: 'info' | 'warning' | 'success';
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Task Overdue',
    description: 'Technical Discovery Call for Acme Corp was due yesterday.',
    time: subHours(new Date(), 2),
    read: false,
    type: 'warning'
  },
  {
    id: '2',
    title: 'New Comment',
    description: 'Sreeram mentioned you in "Enterprise AI Testing Platform".',
    time: subHours(new Date(), 5),
    read: false,
    type: 'info'
  },
  {
    id: '3',
    title: 'Deal Won!',
    description: 'Retail Giants Co deal has been closed successfully.',
    time: subHours(new Date(), 24),
    read: true,
    type: 'success'
  },
  {
    id: '4',
    title: 'Status Update',
    description: 'TechFlow Inc moved to Discovery stage.',
    time: subHours(new Date(), 48),
    read: true,
    type: 'info'
  }
];

export function NotificationPopover() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-950" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className="font-semibold">Notifications</div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 text-xs" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          <div className="divide-y">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                onClick={() => markRead(notification.id)}
              >
                <div className="flex gap-3 items-start">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    notification.type === 'warning' ? 'bg-orange-500' :
                    notification.type === 'success' ? 'bg-green-500' :
                    'bg-blue-500'
                  }`} />
                  <div className="space-y-1">
                    <p className={`text-sm leading-none ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      {format(notification.time, 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}