'use client';

import { Badge } from '@/components/ui/badge';
import { Status } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, string> = {
  Discovery: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  Qualification: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  Proposal: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  Negotiation: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  Won: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  Lost: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  'On Hold': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium border shadow-none', statusConfig[status], className)}
    >
      {status}
    </Badge>
  );
}