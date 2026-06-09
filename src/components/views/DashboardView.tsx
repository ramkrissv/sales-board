'use client';

import { useOpportunities } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, Treemap, FunnelChart, Funnel, LabelList } from 'recharts';
import { format, parseISO, isBefore, isAfter, startOfDay, subMonths } from 'date-fns';
import { DollarSign, Trophy, Clock, AlertCircle, TrendingUp, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];

const CustomizedTreemapContent = (props: any) => {
  const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {width > 50 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="bold"
        >
          {name}
        </text>
      )}
      {width > 50 && height > 50 && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 16}
          textAnchor="middle"
          fill="#fff"
          fontSize={10}
        >
          {props.value} Deals
        </text>
      )}
    </g>
  );
};

// Custom Funnel Component
const CustomFunnel = ({ data, dataKey, formatter }: { data: any[], dataKey: string, formatter?: (val: number) => string }) => {
  const maxValue = Math.max(...data.map(d => d[dataKey]));
  
  return (
    <div className="flex flex-col justify-center h-full w-full py-4 space-y-4">
      {/* Background Funnel Shape (Visual Effect) */}
      <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-5">
         <div className="w-[80%] h-full bg-slate-400" style={{ clipPath: 'polygon(0 0, 100% 0, 65% 100%, 35% 100%)' }}></div>
      </div>

      {data.map((item, index) => {
        const percent = (item[dataKey] / maxValue) * 100;
        // Ensure minimum width for visibility
        const width = Math.max(percent, 10);
        
        return (
          <div key={item.name} className="relative z-10 flex items-center w-full group">
            {/* Label (Left) */}
            <div className="w-[30%] text-right pr-4">
              <span className="text-xs font-medium text-muted-foreground truncate block" title={item.name}>
                {item.name}
              </span>
            </div>
            
            {/* Bar (Center) */}
            <div className="flex-1 flex justify-center items-center px-2">
              <div 
                className="h-8 rounded-full flex items-center justify-center relative shadow-sm transition-all duration-500 ease-in-out group-hover:scale-105"
                style={{ 
                  width: `${width}%`, 
                  backgroundColor: item.fill || COLORS[index % COLORS.length] 
                }}
              >
                 {/* Icon or visual element could go here */}
              </div>
            </div>
            
            {/* Value (Right) */}
            <div className="w-[20%] text-left pl-2">
               <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block">
                 {formatter ? formatter(item[dataKey]) : item[dataKey]}
               </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function DashboardView() {
  const { opportunities } = useOpportunities();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date()
  });

  // Filter opportunities based on date range (using created date or expected close date as proxy for general filtering)
  const filteredOpportunities = opportunities.filter(opp => {
    if (!dateRange?.from) return true;
    const oppDate = new Date(opp.createdAt);
    const from = dateRange.from;
    const to = dateRange.to || new Date();
    return (isAfter(oppDate, from) || oppDate.getTime() === from.getTime()) && 
           (isBefore(oppDate, to) || oppDate.getTime() === to.getTime());
  });

  // 1. Summary Stats Calculations
  const totalTCV = filteredOpportunities.reduce((sum, o) => sum + o.tcv, 0);
  const wonOpp = filteredOpportunities.filter(o => o.status === 'Won');
  const lostOpp = filteredOpportunities.filter(o => o.status === 'Lost');
  const winRate = (wonOpp.length / (wonOpp.length + lostOpp.length || 1)) * 100;

  // Average Deal Duration (approximate calculation based on string parsing)
  const durationMap: Record<string, number> = {
    '3 months': 3, '6 months': 6, '1 year': 12, '2 years': 24, '3+ years': 36
  };
  const totalDurationMonths = filteredOpportunities.reduce((sum, o) => sum + (durationMap[o.dealDuration] || 12), 0);
  const avgDuration = filteredOpportunities.length ? (totalDurationMonths / filteredOpportunities.length).toFixed(1) : 0;

  // Overdue Tasks
  const today = startOfDay(new Date());
  const overdueTasksCount = filteredOpportunities.reduce((count, opp) => {
    return count + opp.subTasks.filter(t => t.status !== 'complete' && isBefore(parseISO(t.dueDate), today)).length;
  }, 0);

  // 2. Charts Data Preparation

  // Sales Funnel Data
  const FUNNEL_STATUSES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation'];
  
  const funnelRawData = filteredOpportunities.reduce((acc, opp) => {
    if (FUNNEL_STATUSES.includes(opp.status)) {
      if (!acc[opp.status]) acc[opp.status] = { count: 0, value: 0 };
      acc[opp.status].count += 1;
      acc[opp.status].value += opp.tcv;
    }
    return acc;
  }, {} as Record<string, { count: number, value: number }>);

  const funnelData = FUNNEL_STATUSES.map(status => ({
    name: status,
    count: funnelRawData[status]?.count || 0,
    value: funnelRawData[status]?.value || 0,
    fill: COLORS[FUNNEL_STATUSES.indexOf(status) % COLORS.length]
  })).filter(item => item.count > 0); // Optional: hide empty stages or keep them? Keeping them is usually better for funnel structure, but recharts funnel might look weird if empty. Let's keep non-zero for now or all if preferred. Let's keep all for structure but 0 size might be an issue.
  // Actually recharts funnel with 0 value might be invisible. Let's filter if 0? No, funnel implies stages.
  // Let's just map all and let recharts handle it.
  
  // Pipeline by Status (Horizontal Bar)
  const statusData = Object.entries(
    filteredOpportunities.reduce((acc, opp) => {
      acc[opp.status] = (acc[opp.status] || 0) + opp.tcv;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Opportunities by Owner (Pie)
  const ownerData = Object.entries(
    filteredOpportunities.reduce((acc, opp) => {
      acc[opp.primaryOwner] = (acc[opp.primaryOwner] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Expected Closes by Month (Bar)
  const closeDateData = Object.entries(
    filteredOpportunities.reduce((acc, opp) => {
      const month = format(parseISO(opp.expectedCloseDate), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + opp.tcv;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // TCV Trend Over Time (Line Chart) - Mocked based on filtered data creation dates
  // In a real app, this would be historical snapshots. Here we'll simulate accumulation.
  const sortedByDate = [...filteredOpportunities].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let runningTotal = 0;
  const trendData = sortedByDate.map(opp => {
    runningTotal += opp.tcv;
    return {
      date: format(new Date(opp.createdAt), 'MMM d'),
      value: runningTotal
    };
  });
  // Downsample for chart readability if too many points
  const displayTrendData = trendData.filter((_, i) => i % Math.ceil(trendData.length / 10) === 0 || i === trendData.length - 1);


  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Filters Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
           <Filter className="h-5 w-5 text-muted-foreground" />
           <h2 className="font-semibold text-lg">Dashboard Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={() => setDateRange(undefined)}>Clear</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatter.format(totalTCV)}</div>
            <p className="text-xs text-muted-foreground">Across {filteredOpportunities.length} deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{wonOpp.length} Won / {lostOpp.length} Lost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration} mo</div>
            <p className="text-xs text-muted-foreground">Estimated time to close</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasksCount}</div>
            <p className="text-xs text-muted-foreground">Tasks needing attention</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
             <TrendingUp className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{filteredOpportunities.length - wonOpp.length - lostOpp.length}</div>
             <p className="text-xs text-muted-foreground">Currently open</p>
           </CardContent>
        </Card>
      </div>

      {/* Funnel Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sales Funnel (by Count)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] relative">
            <CustomFunnel 
              data={funnelData} 
              dataKey="count" 
            />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sales Funnel (by Value)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] relative">
            <CustomFunnel 
              data={funnelData} 
              dataKey="value" 
              formatter={(val) => formatter.format(val)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Pipeline by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 40, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(val) => formatter.format(val)} fontSize={12} />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                <Tooltip formatter={(value) => formatter.format(value as number)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                   {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>TCV Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayTrendData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="date" fontSize={12} />
                   <YAxis tickFormatter={(val) => formatter.format(val)} fontSize={12} width={50} />
                   <Tooltip formatter={(value) => formatter.format(value as number)} />
                   <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Opportunities by Owner</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={ownerData}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
                content={<CustomizedTreemapContent />}
              >
                <Tooltip />
              </Treemap>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Expected Revenue (Next 6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closeDateData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(value) => formatter.format(value)} />
                <Tooltip formatter={(value) => formatter.format(value as number)} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
