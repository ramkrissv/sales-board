'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOpportunities } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Opportunity, Status, Industry, Region } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { ComboboxCustom } from '@/components/ui/combobox-custom';
import { MultiTagInput } from '@/components/ui/multi-tag-input';

interface CreateOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOpportunityModal({ isOpen, onClose }: CreateOpportunityModalProps) {
  const { addOpportunity, opportunities } = useOpportunities();
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();
  
  // Auto-generate ID (OPP-YYYY-NNNN)
  const currentYear = new Date().getFullYear();
  
  // Find max sequence number for current year
  const maxSeq = opportunities
    .filter(o => o.id.startsWith(`OPP-${currentYear}-`))
    .map(o => {
      const parts = o.id.split('-');
      // Handle potential malformed IDs gracefully
      if (parts.length >= 3) {
        return parseInt(parts[2], 10) || 0;
      }
      return 0;
    })
    .reduce((max, current) => Math.max(max, current), 0);
    
  const nextId = `OPP-${currentYear}-${String(maxSeq + 1).padStart(4, '0')}`;
  
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<Opportunity>({
    defaultValues: {
      id: nextId,
      status: 'Discovery',
      tcv: 0,
      dealDuration: '1 year',
      expectedCloseDate: new Date().toISOString(),
      startDate: new Date().toISOString(),
      salesPOCs: [],
      presalesPOCs: [],
      customerStakeholders: [],
      subTasks: [],
      resourceLinks: [],
      conversationLog: '',
      customTags: [],
      activityLog: []
    }
  });

  const onSubmit = async (data: Opportunity) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addOpportunity({
      ...data,
      id: nextId, // Ensure ID is set
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activityLog: [{
        timestamp: new Date().toISOString(),
        action: 'Opportunity created',
        user: 'Current User'
      }]
    });
    
    toast({
      title: "Opportunity Created",
      description: `${data.opportunityName} has been added to your pipeline.`,
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full sm:h-[90vh] sm:max-w-4xl flex flex-col p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <DialogHeader className="p-4 md:p-6 pb-4 border-b shrink-0 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle>Create New Opportunity</DialogTitle>
            <DialogDescription>
              Enter the details for the new presales opportunity.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b shrink-0">
              <TabsList className="bg-transparent h-12 p-0 space-x-6 w-full justify-start">
                <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                  Basic Info & Team
                </TabsTrigger>
                <TabsTrigger value="financial" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0">
                  Financial Details
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 md:p-6">
                <TabsContent value="basic" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="id">Opportunity ID</Label>
                      <Input id="id" value={nextId} disabled className="bg-slate-100 dark:bg-slate-800" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">Status *</Label>
                      <Controller
                        name="status"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Discovery">Discovery</SelectItem>
                              <SelectItem value="Qualification">Qualification</SelectItem>
                              <SelectItem value="Proposal">Proposal</SelectItem>
                              <SelectItem value="Negotiation">Negotiation</SelectItem>
                              <SelectItem value="On Hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input id="customerName" {...register("customerName", { required: true })} placeholder="e.g. Acme Corp" />
                      {errors.customerName && <span className="text-xs text-red-500">Customer name is required</span>}
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="opportunityName">Opportunity Name *</Label>
                      <Input id="opportunityName" {...register("opportunityName", { required: true })} placeholder="e.g. Enterprise AI Platform" />
                      {errors.opportunityName && <span className="text-xs text-red-500">Opportunity name is required</span>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="serviceLine">Service Line</Label>
                      <Controller
                        name="serviceLine"
                        control={control}
                        defaultValue="Legacy Modernization"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service line" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Legacy Modernization">Legacy Modernization</SelectItem>
                              <SelectItem value="Data & AI">Data & AI</SelectItem>
                              <SelectItem value="Testing & QA">Testing & QA</SelectItem>
                              <SelectItem value="Managed Services / SRE">Managed Services / SRE</SelectItem>
                              <SelectItem value="Cloud & Infrastructure">Cloud & Infrastructure</SelectItem>
                              <SelectItem value="Staffing">Staffing</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
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
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="clientType">Client Type</Label>
                      <Controller
                        name="clientType"
                        control={control}
                        defaultValue="New"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="opportunityType">Opportunity Type</Label>
                      <Controller
                        name="opportunityType"
                        control={control}
                        defaultValue="New Deal"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </div>

                    <div className="col-span-1 sm:col-span-2 mt-4 border-t pt-4">
                      <h4 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Team & Ownership</h4>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="salesPOCs">Sales POCs</Label>
                          <Controller
                            name="salesPOCs"
                            control={control}
                            render={({ field }) => (
                              <MultiTagInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Type name and press Enter..."
                              />
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="presalesPOCs">Presales POCs</Label>
                          <Controller
                            name="presalesPOCs"
                            control={control}
                            render={({ field }) => (
                              <MultiTagInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Type name and press Enter..."
                              />
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="primaryOwner">Primary Owner *</Label>
                          <Controller
                            name="primaryOwner"
                            control={control}
                            rules={{ required: true }}
                            render={({ field }) => {
                              const salesPOCs = control._formValues.salesPOCs || [];
                              const presalesPOCs = control._formValues.presalesPOCs || [];
                              
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
                          {errors.primaryOwner && <span className="text-xs text-red-500">Primary owner is required</span>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="source">Lead Source</Label>
                          <Input id="source" {...register("source")} placeholder="e.g. Inbound, Event, Referral" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="m-0 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="tcv">Total Contract Value (TCV)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input 
                          id="tcv" 
                          type="number" 
                          className="pl-7" 
                          {...register("tcv", { valueAsNumber: true })} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="margin">Deal Margin %</Label>
                      <div className="relative">
                        <Input 
                          id="margin" 
                          type="number" 
                          min="0"
                          max="100"
                          className="pr-7" 
                          {...register("margin", { valueAsNumber: true })} 
                        />
                        <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billingModel">Billing Model</Label>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dealDuration">Deal Duration</Label>
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
                    </div>

                    <div className="space-y-2">
                      <Label>Expected Close Date</Label>
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
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Opportunity
              </Button>
            </div>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}
