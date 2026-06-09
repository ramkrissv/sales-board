import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOpportunities } from '@/lib/store';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, DollarSign, Clock, Users, Briefcase, Globe, Tag, CheckSquare, ExternalLink, Trash2, Edit2, Save, X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Opportunity, Stakeholder, Task, ResourceLink } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { StakeholderModal } from './StakeholderModal';
import { TaskModal } from './TaskModal';
import { FileText, Folder, Link as LinkIcon } from 'lucide-react';

import { MultiTagInput } from '@/components/ui/multi-tag-input';
import { ComboboxCustom } from '@/components/ui/combobox-custom';

interface OpportunityModalProps {
  opportunityId: string;
  onClose: () => void;
}

export function OpportunityModal({ opportunityId, onClose }: OpportunityModalProps) {
  const { opportunities, updateOpportunity, deleteOpportunity } = useOpportunities();
  const opportunity = opportunities.find(o => o.id === opportunityId);
  const [activeTab, setActiveTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Sub-modals state
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | undefined>(undefined);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Resource Link State
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkType, setNewLinkType] = useState<'file' | 'folder' | 'link'>('link');

  // Log state
  const [logNote, setLogNote] = useState('');

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Partial<Opportunity>>({
    shouldUnregister: false, // Keep form values when switching tabs
  });

  useEffect(() => {
    if (opportunity) {
      reset(opportunity);
    }
  }, [opportunity, reset]);

  if (!opportunity) return null;

  const onSubmit = (data: Partial<Opportunity>) => {
    updateOpportunity(opportunityId, data);
    setIsEditing(false);
    toast({
      title: "Changes Saved",
      description: "Opportunity details have been updated.",
    });
  };

  const handleDiscard = () => {
    reset(opportunity);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this opportunity?')) {
      deleteOpportunity(opportunityId);
      onClose();
      toast({
        title: "Opportunity Deleted",
        variant: "destructive",
      });
    }
  };

  // Stakeholder Handlers
  const handleAddStakeholder = (stakeholder: Stakeholder) => {
    const newStakeholders = [...opportunity.customerStakeholders, stakeholder];
    updateOpportunity(opportunityId, { customerStakeholders: newStakeholders });
    toast({ title: "Stakeholder Added" });
  };

  const handleUpdateStakeholder = (stakeholder: Stakeholder) => {
    const newStakeholders = opportunity.customerStakeholders.map(s => 
      s.id === stakeholder.id ? stakeholder : s
    );
    updateOpportunity(opportunityId, { customerStakeholders: newStakeholders });
    toast({ title: "Stakeholder Updated" });
  };

  const handleDeleteStakeholder = (id: string) => {
    if (confirm('Remove this stakeholder?')) {
      const newStakeholders = opportunity.customerStakeholders.filter(s => s.id !== id);
      updateOpportunity(opportunityId, { customerStakeholders: newStakeholders });
    }
  };

  const openEditStakeholder = (stakeholder: Stakeholder) => {
    setEditingStakeholder(stakeholder);
    setIsStakeholderModalOpen(true);
  };

  // Task Handlers
  const handleAddTask = (task: Task) => {
    const newTasks = [...opportunity.subTasks, task];
    updateOpportunity(opportunityId, { subTasks: newTasks });
    toast({ title: "Task Added" });
  };

  const handleUpdateTask = (task: Task) => {
    const newTasks = opportunity.subTasks.map(t => 
      t.id === task.id ? task : t
    );
    updateOpportunity(opportunityId, { subTasks: newTasks });
    toast({ title: "Task Updated" });
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Delete this task?')) {
      const newTasks = opportunity.subTasks.filter(t => t.id !== id);
      updateOpportunity(opportunityId, { subTasks: newTasks });
    }
  };

  const toggleTaskStatus = (task: Task) => {
    handleUpdateTask({
      ...task,
      status: task.status === 'complete' ? 'pending' : 'complete'
    });
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  // Resource Handlers
  const handleAddResource = () => {
    if (!newLinkUrl || !newLinkTitle) return;

    const newResource: ResourceLink = {
      id: `res-${Date.now()}`,
      title: newLinkTitle,
      url: newLinkUrl,
      type: newLinkType,
      addedBy: 'Current User',
      addedAt: new Date().toISOString()
    };

    const newResources = [...(opportunity.resourceLinks || []), newResource];
    updateOpportunity(opportunityId, { resourceLinks: newResources });
    
    setNewLinkUrl('');
    setNewLinkTitle('');
    setNewLinkType('link');
    toast({ title: "Resource Added" });
  };

  const handleDeleteResource = (id: string) => {
    if (confirm('Remove this resource?')) {
      const newResources = opportunity.resourceLinks?.filter(r => r.id !== id) || [];
      updateOpportunity(opportunityId, { resourceLinks: newResources });
    }
  };

  // Log Handlers
  const handleAddLogEntry = () => {
    if (!logNote.trim()) return;
    
    const timestamp = new Date().toISOString();
    const entryHeader = `📝 NOTE | ${format(new Date(timestamp), 'yyyy-MM-dd HH:mm')} | User`;
    const newEntry = `\n\n${entryHeader}\n${logNote}`;
    
    updateOpportunity(opportunityId, {
      conversationLog: (opportunity.conversationLog || '') + newEntry,
      activityLog: [
        { timestamp, action: 'Note added to conversation log', user: 'User' },
        ...opportunity.activityLog
      ]
    });
    
    setLogNote('');
    toast({ title: "Note Added" });
  };

  const addTemplate = (type: string) => {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
    let template = '';
    
    switch (type) {
      case 'email':
        template = `📧 EMAIL | ${timestamp} | From: [Name] | To: [Name] | Subject: [Subject]\n\nBody:\n`;
        break;
      case 'call':
        template = `📞 CALL | ${timestamp} | Duration: 30min\nAttendees: \n\nDiscussion:\n`;
        break;
      case 'copilot':
        template = `🤖 COPILOT SUMMARY | ${timestamp}\n\nKey Points:\n- \n- \n`;
        break;
    }
    
    setLogNote(prev => prev + template);
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full h-full sm:h-[90vh] sm:max-w-4xl flex flex-col p-0 gap-0 overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-4 md:p-6 pb-4 border-b shrink-0 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {opportunity.id}
                  </span>
                  {isEditing ? (
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="h-7 w-[140px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Discovery">Discovery</SelectItem>
                            <SelectItem value="Qualification">Qualification</SelectItem>
                            <SelectItem value="Proposal">Proposal</SelectItem>
                            <SelectItem value="Negotiation">Negotiation</SelectItem>
                            <SelectItem value="Won">Won</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <StatusBadge status={opportunity.status} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={handleDiscard}>
                        <X className="h-4 w-4 mr-2" />
                        Discard
                      </Button>
                      <Button size="sm" type="submit">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-2 mt-2">
                   <Input {...register("opportunityName", { required: true })} className="text-lg font-bold" />
                   <Input {...register("customerName", { required: true })} className="text-sm text-muted-foreground" />
                </div>
              ) : (
                <>
                  <DialogTitle className="text-2xl font-bold line-clamp-1">{opportunity.opportunityName}</DialogTitle>
                  <DialogDescription className="text-base text-slate-600 dark:text-slate-400">
                    {opportunity.customerName}
                  </DialogDescription>
                </>
              )}
              
              {/* Audit Trail Info */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t border-slate-200 dark:border-slate-700" data-testid="audit-trail-info">
                {opportunity.createdBy && (
                  <span>
                    Created by <span className="font-medium text-foreground">{opportunity.createdBy}</span>
                    {opportunity.createdAt && (
                      <> on {format(new Date(opportunity.createdAt), 'MMM d, yyyy')}</>
                    )}
                  </span>
                )}
                {opportunity.updatedBy && (
                  <span>
                    Last updated by <span className="font-medium text-foreground">{opportunity.updatedBy}</span>
                    {opportunity.updatedAt && (
                      <> on {format(new Date(opportunity.updatedAt), 'MMM d, yyyy \'at\' h:mm a')}</>
                    )}
                  </span>
                )}
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 border-b shrink-0 bg-slate-50/30 dark:bg-slate-900/30">
                <TabsList className="bg-transparent h-12 p-0 space-x-6 w-full justify-start overflow-x-auto">
                  <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                    Basic Info & Team
                  </TabsTrigger>
                  <TabsTrigger value="financial" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                    Financial Details
                  </TabsTrigger>
                  <TabsTrigger value="stakeholders" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                    Stakeholders ({opportunity.customerStakeholders.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                    Sub-Tasks ({opportunity.subTasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                    Resources ({opportunity.resourceLinks?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="log" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                    Log
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                    Activity
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 md:p-6">
                  <TabsContent value="basic" className="m-0 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Customer Name</Label>
                        {isEditing ? (
                          <Input {...register("customerName")} />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900">{opportunity.customerName}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Opportunity Name</Label>
                        {isEditing ? (
                          <Input {...register("opportunityName")} />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900">{opportunity.opportunityName}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        {isEditing ? (
                          <Controller
                            name="industry"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                                  <SelectItem value="Financial Services">Financial Services</SelectItem>
                                  <SelectItem value="Technology">Technology</SelectItem>
                                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                  <SelectItem value="Retail">Retail</SelectItem>
                                  <SelectItem value="Professional Services">Professional Services</SelectItem>
                                  <SelectItem value="Hospitality">Hospitality</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                             <Briefcase className="h-4 w-4 text-muted-foreground" />
                             {opportunity.industry}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Service Line</Label>
                        {isEditing ? (
                          <Controller
                            name="serviceLine"
                            control={control}
                            defaultValue="IT Services"
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select service line" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="IT Services">IT Services</SelectItem>
                                  <SelectItem value="Staffing">Staffing</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                             <Briefcase className="h-4 w-4 text-muted-foreground" />
                             {opportunity.serviceLine || 'IT Services'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Region</Label>
                        {isEditing ? (
                          <Controller
                            name="region"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="North America">North America</SelectItem>
                                  <SelectItem value="Europe">Europe</SelectItem>
                                  <SelectItem value="APAC">APAC</SelectItem>
                                  <SelectItem value="Latin America">Latin America</SelectItem>
                                  <SelectItem value="Middle East">Middle East</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                             <Globe className="h-4 w-4 text-muted-foreground" />
                             {opportunity.region}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Client Type</Label>
                        {isEditing ? (
                          <Controller
                            name="clientType"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value || 'New'}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select client type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="New">New</SelectItem>
                                  <SelectItem value="Existing">Existing</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900">
                            {opportunity.clientType || 'New'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Opportunity Type</Label>
                        {isEditing ? (
                          <Controller
                            name="opportunityType"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value || 'New Deal'}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select opportunity type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="New Deal">New Deal</SelectItem>
                                  <SelectItem value="Upsell">Upsell</SelectItem>
                                  <SelectItem value="Cross-sell">Cross-sell</SelectItem>
                                  <SelectItem value="Renewal">Renewal</SelectItem>
                                  <SelectItem value="Enhancement">Enhancement</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900">
                            {opportunity.opportunityType || 'New Deal'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Source</Label>
                        {isEditing ? (
                          <Input {...register("source")} />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900">{opportunity.source}</div>
                        )}
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Tags</Label>
                        {isEditing ? (
                           <div className="p-2 border rounded-md border-dashed bg-slate-50/50">
                             <p className="text-xs text-muted-foreground">Tag editing coming soon</p>
                             <div className="flex flex-wrap gap-2 mt-2">
                              {opportunity.customTags.map(tag => (
                                <Badge key={tag} variant="secondary" className="px-2 py-1">
                                  {tag}
                                </Badge>
                              ))}
                             </div>
                           </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {opportunity.customTags.map(tag => (
                              <Badge key={tag} variant="secondary" className="px-2 py-1">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            <Button variant="outline" size="sm" className="h-6 text-xs border-dashed">
                              + Add Tag
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="financial" className="m-0 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Total Contract Value (TCV)</Label>
                        {isEditing ? (
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input 
                              type="number" 
                              className="pl-7" 
                              {...register("tcv", { valueAsNumber: true })} 
                            />
                          </div>
                        ) : (
                          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <DollarSign className="h-6 w-6 text-muted-foreground" />
                            {formatter.format(opportunity.tcv).replace('$', '')}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Deal Margin %</Label>
                        {isEditing ? (
                          <div className="relative">
                            <Input 
                              type="number"
                              min="0"
                              max="100" 
                              className="pr-7" 
                              {...register("margin", { valueAsNumber: true })} 
                            />
                            <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <div className="text-xl font-medium flex items-center gap-2">
                            <span className="text-muted-foreground">%</span>
                            {opportunity.margin ? `${opportunity.margin}%` : '-'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Billing Model</Label>
                        {isEditing ? (
                          <Controller
                            name="billingModel"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select billing model" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Time & Material">Time & Material</SelectItem>
                                  <SelectItem value="Fixed Price">Fixed Price</SelectItem>
                                  <SelectItem value="Retainer">Retainer</SelectItem>
                                  <SelectItem value="Milestone-based">Milestone-based</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900">
                            {opportunity.billingModel || '-'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Deal Duration</Label>
                        {isEditing ? (
                          <Controller
                            name="dealDuration"
                            control={control}
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3 months">3 months</SelectItem>
                                  <SelectItem value="6 months">6 months</SelectItem>
                                  <SelectItem value="1 year">1 year</SelectItem>
                                  <SelectItem value="2 years">2 years</SelectItem>
                                  <SelectItem value="3+ years">3+ years</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        ) : (
                          <div className="text-xl font-medium flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            {opportunity.dealDuration}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Close Date</Label>
                        {isEditing ? (
                           <Controller
                            name="expectedCloseDate"
                            control={control}
                            render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(opportunity.expectedCloseDate), 'MMMM d, yyyy')}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                         {isEditing ? (
                           <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          />
                        ) : (
                          <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(opportunity.startDate), 'MMMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="stakeholders" className="m-0">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Customer Stakeholders</h3>
                        <Button size="sm" onClick={() => { setEditingStakeholder(undefined); setIsStakeholderModalOpen(true); }} type="button">
                          <Users className="h-4 w-4 mr-2" /> Add Stakeholder
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        {opportunity.customerStakeholders.map(stakeholder => (
                          <div key={stakeholder.id} className="border rounded-lg p-4 flex justify-between items-start bg-white dark:bg-slate-950 group">
                            <div className="flex gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{stakeholder.name.substring(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{stakeholder.name}</h4>
                                  {stakeholder.isPrimaryContact && <span title="Primary Contact">⭐</span>}
                                  {stakeholder.isDecisionMaker && <span title="Decision Maker">👑</span>}
                                </div>
                                <p className="text-sm text-muted-foreground">{stakeholder.title}</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  {stakeholder.email && <span>{stakeholder.email}</span>}
                                  {stakeholder.phone && <span>{stakeholder.phone}</span>}
                                  {stakeholder.linkedInUrl && (
                                    <a href={stakeholder.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                                      <ExternalLink className="h-3 w-3 mr-1" /> LinkedIn
                                    </a>
                                  )}
                                </div>
                                {stakeholder.notes && (
                                  <p className="mt-2 text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded text-slate-600 dark:text-slate-400">
                                    {stakeholder.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" onClick={() => openEditStakeholder(stakeholder)} type="button">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteStakeholder(stakeholder.id)} type="button">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="resources" className="m-0">
                    <div className="p-4 md:p-6 space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Add New Resource</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-1">
                            <Select value={newLinkType} onValueChange={(v: any) => setNewLinkType(v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="link">Web Link</SelectItem>
                                <SelectItem value="file">File (SharePoint/Drive)</SelectItem>
                                <SelectItem value="folder">Folder</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-1">
                            <Input 
                              placeholder="Title" 
                              value={newLinkTitle}
                              onChange={(e) => setNewLinkTitle(e.target.value)}
                            />
                          </div>
                          <div className="md:col-span-2 flex gap-2">
                            <Input 
                              placeholder="URL (https://...)" 
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              className="flex-1"
                            />
                            <Button onClick={handleAddResource}>Add</Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Resources</h3>
                        <div className="space-y-2">
                          {!opportunity.resourceLinks || opportunity.resourceLinks.length === 0 ? (
                            <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                              No resources added yet. Add links to SharePoint, Teams, or Drive folders.
                            </div>
                          ) : (
                            opportunity.resourceLinks.map((resource) => (
                              <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-slate-800 border flex items-center justify-center text-primary">
                                    {resource.type === 'folder' ? <Folder className="h-5 w-5" /> : 
                                     resource.type === 'file' ? <FileText className="h-5 w-5" /> : 
                                     <LinkIcon className="h-5 w-5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline hover:text-primary truncate block">
                                      {resource.title}
                                    </a>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <span>Added by {resource.addedBy}</span>
                                      <span>•</span>
                                      <span>{format(new Date(resource.addedAt), 'MMM d, yyyy')}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteResource(resource.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" asChild>
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="log" className="m-0">
                    <div className="space-y-4">
                       <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                         <Textarea 
                           placeholder="Type notes here..." 
                           className="mb-2 bg-white dark:bg-slate-950" 
                           rows={4} 
                           value={logNote}
                           onChange={(e) => setLogNote(e.target.value)}
                         />
                         <div className="flex gap-2">
                           <Button size="sm" variant="outline" type="button" onClick={() => addTemplate('email')}>Email Log</Button>
                           <Button size="sm" variant="outline" type="button" onClick={() => addTemplate('call')}>Call Log</Button>
                           <Button size="sm" variant="outline" type="button" onClick={() => addTemplate('copilot')}>Generic Note</Button>
                           <div className="flex-1"></div>
                           <Button size="sm" type="button" onClick={handleAddLogEntry}>Add Entry</Button>
                         </div>
                       </div>
                       
                       <div className="whitespace-pre-wrap font-mono text-sm p-4 bg-white dark:bg-slate-950 border rounded-lg">
                         {opportunity.conversationLog}
                       </div>
                    </div>
                  </TabsContent>

                  {/* Add other tab contents as placeholders for now */}
                  <TabsContent value="team" className="m-0">
                    <div className="p-6 space-y-6">
                       <div className="space-y-2">
                          <Label>Sales POCs</Label>
                          {isEditing ? (
                            <Controller
                              name="salesPOCs"
                              control={control}
                              render={({ field }) => (
                                <MultiTagInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Add Sales POC..."
                                />
                              )}
                            />
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {opportunity.salesPOCs?.map(poc => (
                                <Badge key={poc} variant="outline" className="bg-slate-50">{poc}</Badge>
                              ))}
                              {(!opportunity.salesPOCs || opportunity.salesPOCs.length === 0) && (
                                <span className="text-muted-foreground text-sm italic">No Sales POCs assigned</span>
                              )}
                            </div>
                          )}
                        </div>

                       <div className="space-y-2">
                          <Label>Presales POCs</Label>
                          {isEditing ? (
                            <Controller
                              name="presalesPOCs"
                              control={control}
                              render={({ field }) => (
                                <MultiTagInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Add Presales POC..."
                                />
                              )}
                            />
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {opportunity.presalesPOCs?.map(poc => (
                                <Badge key={poc} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{poc}</Badge>
                              ))}
                              {(!opportunity.presalesPOCs || opportunity.presalesPOCs.length === 0) && (
                                <span className="text-muted-foreground text-sm italic">No Presales POCs assigned</span>
                              )}
                            </div>
                          )}
                        </div>

                       <div className="space-y-2">
                          <Label>Primary Owner</Label>
                          {isEditing ? (
                            <Controller
                              name="primaryOwner"
                              control={control}
                              rules={{ required: true }}
                              render={({ field }) => {
                                const salesPOCs = control._formValues.salesPOCs || opportunity.salesPOCs || [];
                                const presalesPOCs = control._formValues.presalesPOCs || opportunity.presalesPOCs || [];
                                
                                const options = [
                                  ...salesPOCs.map((poc: string) => ({ value: poc, label: poc, group: 'Sales POCs' })),
                                  ...presalesPOCs.map((poc: string) => ({ value: poc, label: poc, group: 'Presales POCs' }))
                                ];

                                return (
                                  <ComboboxCustom
                                    options={options}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select or type owner name..."
                                    emptyText="No matching owner found."
                                  />
                                );
                              }}
                            />
                          ) : (
                            <div className="p-2 border rounded-md bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {opportunity.primaryOwner.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              {opportunity.primaryOwner}
                            </div>
                          )}
                        </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="tasks" className="m-0">
                     <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Tasks</h3>
                        <Button size="sm" onClick={() => { setEditingTask(undefined); setIsTaskModalOpen(true); }} type="button">
                          <Plus className="h-4 w-4 mr-2" /> Add Task
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {opportunity.subTasks.map(task => (
                          <div key={task.id} className="border rounded-lg p-3 flex items-center gap-3 bg-white dark:bg-slate-950 group">
                            <div 
                              className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer ${task.status === 'complete' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-primary'}`}
                              onClick={() => toggleTaskStatus(task)}
                            >
                              {task.status === 'complete' && <CheckSquare className="h-3 w-3" />}
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium text-sm ${task.status === 'complete' ? 'line-through text-muted-foreground' : ''}`}>{task.name}</div>
                              <div className="text-xs text-muted-foreground">Due: {format(new Date(task.dueDate), 'MMM d')} • Owner: {task.owner}</div>
                            </div>
                            <Badge variant="outline" className={cn(
                              task.priority === 'High' && "text-orange-600 border-orange-200 bg-orange-50",
                              task.priority === 'Critical' && "text-red-600 border-red-200 bg-red-50"
                            )}>{task.priority}</Badge>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTask(task)} type="button">
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteTask(task.id)} type="button">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                     </div>
                  </TabsContent>
                  <TabsContent value="activity" className="m-0">
                    <div className="space-y-4">
                      {opportunity.activityLog.map((log, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="text-muted-foreground w-32 shrink-0 text-xs py-1">
                            {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                          </div>
                          <div>
                            <div className="font-medium">{log.action}</div>
                            {log.user && <div className="text-xs text-muted-foreground">by {log.user}</div>}
                          </div>
                        </div>
                      ))}
                      {opportunity.activityLog.length === 0 && <div className="text-muted-foreground italic">No activity recorded</div>}
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>
      
      <StakeholderModal 
        isOpen={isStakeholderModalOpen} 
        onClose={() => setIsStakeholderModalOpen(false)} 
        onSave={editingStakeholder ? handleUpdateStakeholder : handleAddStakeholder}
        initialData={editingStakeholder}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={editingTask ? handleUpdateTask : handleAddTask}
        initialData={editingTask}
        owners={[opportunity.primaryOwner, ...opportunity.presalesPOCs]}
      />
    </>
  );
}
