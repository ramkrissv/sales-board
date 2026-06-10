'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

const STATUSES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
const INDUSTRIES = ['Healthcare', 'Financial Services', 'Hospitality', 'Professional Services', 'Manufacturing', 'Retail', 'Technology', 'Other'];
const REGIONS = ['North America', 'Europe', 'APAC', 'Latin America', 'Middle East'];
const SERVICE_LINES = ['IT Services', 'Staffing'];
const BILLING_MODELS = ['Time & Material', 'Fixed Price', 'Retainer', 'Milestone-based'];

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewDealModal({ isOpen, onClose }: NewDealModalProps) {
  const utils = trpc.useUtils();
  const { data: accounts = [] } = trpc.account.list.useQuery();
  const createMutation = trpc.opportunity.create.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
      onClose();
      setForm(defaultForm);
    },
  });

  const defaultForm = {
    customerName: '',
    opportunityName: '',
    status: 'Discovery',
    tcv: 0,
    dealDuration: '12 months',
    expectedCloseDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    primaryOwner: '',
    industry: 'Technology',
    region: 'North America',
    source: 'Direct',
    serviceLine: 'IT Services',
    billingModel: 'Time & Material',
    margin: 28,
    accountId: '',
  };

  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.customerName || !form.opportunityName || !form.primaryOwner) {
      setError('Customer name, opportunity name, and owner are required.');
      return;
    }

    const year = new Date().getFullYear();
    const id = `OPP-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    try {
      await createMutation.mutateAsync({
        id,
        customerName: form.customerName,
        opportunityName: form.opportunityName,
        status: form.status,
        tcv: Number(form.tcv) || 0,
        dealDuration: form.dealDuration,
        expectedCloseDate: new Date(form.expectedCloseDate).toISOString(),
        startDate: new Date(form.startDate).toISOString(),
        primaryOwner: form.primaryOwner,
        industry: form.industry,
        region: form.region,
        source: form.source,
        serviceLine: form.serviceLine,
        billingModel: form.billingModel,
        margin: Number(form.margin) || 0,
        salesPOCs: [],
        presalesPOCs: [],
        customTags: [],
        conversationLog: '',
        activityLog: [],
        ...(form.accountId ? { accountId: form.accountId } : {}),
      } as any);
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity');
    }
  };

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-card border-b border-border rounded-t-2xl">
          <h2 className="text-lg font-semibold text-foreground">New Opportunity</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
          )}

          {/* Customer + Opportunity */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Customer Name *</label>
              <input value={form.customerName} onChange={e => update('customerName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                placeholder="e.g., Acme Corp" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Opportunity Name *</label>
              <input value={form.opportunityName} onChange={e => update('opportunityName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                placeholder="e.g., AI Platform Deployment" />
            </div>
          </div>

          {/* Owner + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Primary Owner *</label>
              <input value={form.primaryOwner} onChange={e => update('primaryOwner', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                placeholder="e.g., Sreeram" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Status</label>
              <select value={form.status} onChange={e => update('status', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* TCV + Margin */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">TCV ($)</label>
              <input type="number" value={form.tcv} onChange={e => update('tcv', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Margin %</label>
              <input type="number" value={form.margin} onChange={e => update('margin', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                min={0} max={100} />
            </div>
          </div>

          {/* Industry + Region */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Industry</label>
              <select value={form.industry} onChange={e => update('industry', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Region</label>
              <select value={form.region} onChange={e => update('region', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Service Line + Billing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Service Line</label>
              <select value={form.serviceLine} onChange={e => update('serviceLine', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                {SERVICE_LINES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Billing Model</label>
              <select value={form.billingModel} onChange={e => update('billingModel', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                {BILLING_MODELS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Expected Close</label>
              <input type="date" value={form.expectedCloseDate} onChange={e => update('expectedCloseDate', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Duration</label>
              <select value={form.dealDuration} onChange={e => update('dealDuration', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                {['3 months', '6 months', '12 months', '1 year', '2 years', '3+ years'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Source + Account */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Source</label>
              <input value={form.source} onChange={e => update('source', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                placeholder="e.g., Direct, Partner, Referral" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Account</label>
              <select value={form.accountId} onChange={e => update('accountId', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40">
                <option value="">No account</option>
                {accounts.map((a: any) => <option key={a._id} value={a._id}>{a.companyName}</option>)}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
