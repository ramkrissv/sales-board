import { useOpportunities } from '@/lib/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download, ListTodo } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Papa from 'papaparse';

interface TableViewProps {
  onRowClick?: (id: string) => void;
}

export function TableView({ onRowClick }: TableViewProps) {
  const { opportunities, deleteOpportunity } = useOpportunities();

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const handleExportCSV = () => {
    const csvData = opportunities.map(opp => ({
      ID: opp.id,
      'Customer Name': opp.customerName,
      'Opportunity Name': opp.opportunityName,
      Status: opp.status,
      TCV: opp.tcv,
      'Deal Duration': opp.dealDuration,
      'Primary Owner': opp.primaryOwner,
      'Expected Close Date': format(new Date(opp.expectedCloseDate), 'yyyy-MM-dd'),
      'Tasks Complete': `${opp.subTasks.filter(t => t.status === 'complete').length}/${opp.subTasks.length}`,
      'Start Date': format(new Date(opp.startDate), 'yyyy-MM-dd'),
      Industry: opp.industry,
      Region: opp.region,
      'Service Line': opp.serviceLine || 'IT Services',
      'Billing Model': opp.billingModel || '',
      'Margin %': opp.margin || '',
      Source: opp.source
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `opportunities_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>
      
      <div className="rounded-md border bg-white dark:bg-slate-900 animate-in fade-in duration-500 overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Opportunity Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value (TCV)</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Service Line</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Expected Close</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.map((opportunity) => {
              const completedTasks = opportunity.subTasks.filter(t => t.status === 'complete').length;
              const totalTasks = opportunity.subTasks.length;
              
              return (
                <TableRow 
                  key={opportunity.id} 
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => onRowClick && onRowClick(opportunity.id)}
                >
                  <TableCell className="font-medium">{opportunity.opportunityName}</TableCell>
                  <TableCell>{opportunity.customerName}</TableCell>
                  <TableCell>
                    <StatusBadge status={opportunity.status} />
                  </TableCell>
                  <TableCell>{formatter.format(opportunity.tcv)}</TableCell>
                  <TableCell>{opportunity.margin ? `${opportunity.margin}%` : '-'}</TableCell>
                  <TableCell>{opportunity.serviceLine || 'IT Services'}</TableCell>
                  <TableCell>{opportunity.primaryOwner}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{completedTasks}/{totalTasks}</span>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(opportunity.expectedCloseDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(opportunity.id)}>
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onRowClick && onRowClick(opportunity.id)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteOpportunity(opportunity.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
