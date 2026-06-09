'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { Task, Priority } from '@/lib/types';
import { useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialData?: Task;
  owners: string[];
}

export function TaskModal({ isOpen, onClose, onSave, initialData, owners }: TaskModalProps) {
  const { register, handleSubmit, reset, control } = useForm<Task>({
    defaultValues: {
      status: 'pending',
      priority: 'Medium'
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({
          id: `task-${Date.now()}`,
          name: '',
          owner: owners[0] || '',
          dueDate: new Date().toISOString(),
          status: 'pending',
          priority: 'Medium',
          notes: ''
        });
      }
    }
  }, [isOpen, initialData, reset, owners]);

  const onSubmit = (data: Task) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Task Name *</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Controller
                name="owner"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map(owner => (
                        <SelectItem key={owner} value={owner}>{owner}</SelectItem>
                      ))}
                      {/* Fallback if no owners passed or custom entry needed */}
                      {!owners.includes('Unassigned') && <SelectItem value="Unassigned">Unassigned</SelectItem>}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Controller
              name="dueDate"
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}