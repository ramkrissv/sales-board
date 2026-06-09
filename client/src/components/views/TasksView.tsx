import { useOpportunities } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Circle, Clock, Search, Filter, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

export function TasksView() {
  const { opportunities, updateOpportunity } = useOpportunities();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'complete'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');

  // Flatten tasks with opportunity context
  const allTasks = opportunities.flatMap(opp => 
    opp.subTasks.map(task => ({
      ...task,
      opportunityId: opp.id,
      opportunityName: opp.opportunityName,
      customerName: opp.customerName
    }))
  );

  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.opportunityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const toggleTaskStatus = (opportunityId: string, taskId: string, currentStatus: 'pending' | 'complete') => {
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (!opportunity) return;

    const newTasks = opportunity.subTasks.map(t => 
      t.id === taskId ? { ...t, status: currentStatus === 'pending' ? 'complete' : 'pending' } : t
    );

    updateOpportunity(opportunityId, { subTasks: newTasks as any });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900';
      case 'Medium': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900';
      case 'Low': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage open tasks across all opportunities
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="py-4 px-6 border-b bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Showing {filteredTasks.length} tasks
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No tasks found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={`${task.opportunityId}-${task.id}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-full",
                          task.status === 'complete' 
                            ? "text-green-500 hover:text-green-600" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                        onClick={() => toggleTaskStatus(task.opportunityId, task.id, task.status)}
                      >
                        {task.status === 'complete' ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {task.name}
                      </div>
                      {task.notes && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {task.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{task.opportunityName}</div>
                      <div className="text-xs text-muted-foreground">{task.customerName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-medium text-slate-600 dark:text-slate-400">
                          {task.owner.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <span className="text-sm">{task.owner}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "flex items-center gap-2 text-sm",
                        isAfter(new Date(), parseISO(task.dueDate)) && task.status !== 'complete' ? "text-red-500 font-medium" : "text-slate-600 dark:text-slate-400"
                      )}>
                        <Clock className="h-3.5 w-3.5" />
                        {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal border", getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       {/* Currently using simple link/button, could open modal in future */}
                       <Button variant="ghost" size="sm" asChild>
                          {/* Placeholder for opening opp modal */}
                          <span className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            View Opp
                          </span>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
