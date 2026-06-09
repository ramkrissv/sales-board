'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { Stakeholder } from '@/lib/types';
import { useEffect } from 'react';

interface StakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stakeholder: Stakeholder) => void;
  initialData?: Stakeholder;
}

export function StakeholderModal({ isOpen, onClose, onSave, initialData }: StakeholderModalProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<Stakeholder>({
    defaultValues: {
      isPrimaryContact: false,
      isDecisionMaker: false
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({
          id: `stake-${Date.now()}`,
          name: '',
          title: '',
          linkedInUrl: '',
          email: '',
          phone: '',
          isPrimaryContact: false,
          isDecisionMaker: false,
          notes: ''
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = (data: Stakeholder) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Stakeholder' : 'Add Stakeholder'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedInUrl">LinkedIn URL</Label>
            <Input id="linkedInUrl" {...register("linkedInUrl")} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="flex items-center space-x-4 py-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isPrimaryContact" 
                checked={watch('isPrimaryContact')} 
                onCheckedChange={(checked) => setValue('isPrimaryContact', checked === true)} 
              />
              <Label htmlFor="isPrimaryContact">Primary Contact</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isDecisionMaker" 
                checked={watch('isDecisionMaker')} 
                onCheckedChange={(checked) => setValue('isDecisionMaker', checked === true)} 
              />
              <Label htmlFor="isDecisionMaker">Decision Maker</Label>
            </div>
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