import { Search, Plus, SlidersHorizontal, Settings, LayoutDashboard, Kanban, Table as TableIcon, GanttChartSquare, CheckSquare, Users, CalendarClock, LogOut } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOpportunities } from '@/lib/store';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '../shared/ThemeToggle';
import { NotificationPopover } from '../shared/NotificationPopover';

import galentLogo from '@/assets/galent-logo.svg';

interface HeaderProps {
  toggleFilters: () => void;
  isFiltersOpen: boolean;
  onNewOpportunity: () => void;
}

export function Header({ toggleFilters, isFiltersOpen, onNewOpportunity }: HeaderProps) {
  const { filters, setFilters } = useOpportunities();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const userInitials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
    : 'U';
  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.email || 'User';

  const getViewName = (path: string) => {
    switch (path) {
      case '/': return 'Kanban Board';
      case '/timeline': return 'Timeline';
      case '/schedule': return 'Schedule Board';
      case '/table': return 'List View';
      case '/dashboard': return 'Dashboard';
      case '/tasks': return 'All Tasks';
      case '/stakeholders': return 'Stakeholders';
      default: return 'Kanban Board';
    }
  };

  const getViewIcon = (path: string) => {
    switch (path) {
      case '/': return <Kanban className="mr-2 h-4 w-4" />;
      case '/timeline': return <GanttChartSquare className="mr-2 h-4 w-4" />;
      case '/schedule': return <CalendarClock className="mr-2 h-4 w-4" />;
      case '/table': return <TableIcon className="mr-2 h-4 w-4" />;
      case '/dashboard': return <LayoutDashboard className="mr-2 h-4 w-4" />;
      case '/tasks': return <CheckSquare className="mr-2 h-4 w-4" />;
      case '/stakeholders': return <Users className="mr-2 h-4 w-4" />;
      default: return <Kanban className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <header className="h-16 border-b bg-white dark:bg-slate-950 flex items-center px-4 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <img src={galentLogo} alt="Galent" className="h-8" />
          <span className="hidden md:inline text-slate-900 dark:text-slate-100">Sales Pipeline <span className="text-primary font-normal">Tracker</span></span>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[40px] md:min-w-[160px] px-2 md:px-4 justify-center md:justify-start">
              {getViewIcon(location)}
              <span className="hidden md:inline">{getViewName(location)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuItem onClick={() => setLocation('/')}>
              <Kanban className="mr-2 h-4 w-4" />
              Kanban Board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/timeline')}>
              <GanttChartSquare className="mr-2 h-4 w-4" />
              Timeline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/schedule')}>
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule Board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/table')}>
              <TableIcon className="mr-2 h-4 w-4" />
              List View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation('/tasks')}>
              <CheckSquare className="mr-2 h-4 w-4" />
              All Tasks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation('/stakeholders')}>
              <Users className="mr-2 h-4 w-4" />
              Stakeholders
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3 flex-1 max-w-xl mx-4">
        <div className="relative flex-1 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities, customers..."
            className="pl-9 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant={isFiltersOpen ? "secondary" : "ghost"} 
          size="icon" 
          onClick={toggleFilters}
          className="relative"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
        
        <NotificationPopover />

        <div className="hidden md:block">
          <ThemeToggle />
        </div>
        
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Settings className="h-5 w-5" />
        </Button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />

        <Button onClick={onNewOpportunity} className="gap-2 px-2 md:px-4">
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">New Opportunity</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 ml-2 cursor-pointer" data-testid="button-user-menu">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-[#7c3aed] text-white text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/api/logout" className="cursor-pointer" data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
