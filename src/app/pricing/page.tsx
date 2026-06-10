'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { DollarSign, Plus, Trash2, Calculator, Download, Link2, Globe, Users, Percent } from 'lucide-react';

// Geo rate cards — US onshore and India offshore from Galent rate card
const GEO_RATES: Record<string, { label: string; multiplier: number }> = {
  'us': { label: 'US (Onshore)', multiplier: 1.0 },
  'canada': { label: 'Canada', multiplier: 0.85 },
  'india': { label: 'India (Offshore)', multiplier: 0.35 },
  'latam': { label: 'Latin America (Nearshore)', multiplier: 0.55 },
  'europe': { label: 'Europe', multiplier: 0.90 },
  'apac': { label: 'APAC', multiplier: 0.45 },
};

// Roles with US base rates and India rates from actual Galent pricing
const ROLES = [
  { role: 'Program Manager', baseRate: 130, indiaRate: 0 },
  { role: 'Technical Architect', baseRate: 120, indiaRate: 50 },
  { role: 'QA Architect', baseRate: 100, indiaRate: 35 },
  { role: 'Data Architect', baseRate: 110, indiaRate: 40 },
  { role: 'Sr Full Stack Engineer', baseRate: 95, indiaRate: 30 },
  { role: 'Business Analyst', baseRate: 90, indiaRate: 35 },
  { role: 'DevOps Engineer', baseRate: 95, indiaRate: 35 },
  { role: 'QA Engineer', baseRate: 80, indiaRate: 26 },
  { role: 'Delivery Manager', baseRate: 110, indiaRate: 40 },
  { role: 'AI/ML Engineer', baseRate: 130, indiaRate: 45 },
  { role: 'UX Designer', baseRate: 90, indiaRate: 30 },
  { role: 'Scrum Master', baseRate: 100, indiaRate: 35 },
];

// Cost structure from Galent rate card
const COST_PARAMS = {
  usdToInr: 85,
  hrsPerMonth: 160,
  contingencyPct: 0.10,
  sgaPct: 0.05,
  seatCostPerHr: 2,
  pcAssetMonthly: 80,
  tePct: 0.04,
};

interface LineItem {
  id: string;
  role: string;
  count: number;
  geo: string;
  baseRate: number;
  hoursPerMonth: number;
}

function PricingContent() {
  const { opportunities } = useOpportunities();
  const { data: engagementTypes = [] } = trpc.engagementType.list.useQuery();
  const updateOppMutation = trpc.opportunity.update.useMutation();

  const [engType, setEngType] = useState('');
  const [duration, setDuration] = useState(12); // months
  const [margin, setMargin] = useState(28); // percent
  const [linkedOppId, setLinkedOppId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', role: 'Project Manager', count: 1, geo: 'us', baseRate: 175, hoursPerMonth: 160 },
    { id: '2', role: 'Senior Developer', count: 2, geo: 'india', baseRate: 165, hoursPerMonth: 160 },
    { id: '3', role: 'QA Engineer', count: 1, geo: 'india', baseRate: 120, hoursPerMonth: 160 },
  ]);

  const addLine = () => {
    setLineItems(prev => [...prev, {
      id: String(Date.now()),
      role: 'Developer',
      count: 1,
      geo: 'india',
      baseRate: 135,
      hoursPerMonth: 160,
    }]);
  };

  const removeLine = (id: string) => {
    setLineItems(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: any) => {
    setLineItems(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      // Update base rate when role changes
      if (field === 'role') {
        const roleData = ROLES.find(r => r.role === value);
        if (roleData) updated.baseRate = roleData.baseRate;
      }
      return updated;
    }));
  };

  // Calculate pricing
  const calculations = useMemo(() => {
    const lines = lineItems.map(item => {
      const geoMultiplier = GEO_RATES[item.geo]?.multiplier || 1;
      const effectiveRate = item.baseRate * geoMultiplier;
      const monthlyPerPerson = effectiveRate * item.hoursPerMonth;
      const monthlyTotal = monthlyPerPerson * item.count;
      const totalCost = monthlyTotal * duration;
      return { ...item, effectiveRate, monthlyPerPerson, monthlyTotal, totalCost };
    });

    const totalMonthlyCost = lines.reduce((s, l) => s + l.monthlyTotal, 0);
    const totalCost = totalMonthlyCost * duration;
    const marginAmount = totalCost * (margin / 100);
    const totalWithMargin = totalCost + marginAmount;
    const blendedRate = lineItems.reduce((s, l) => s + l.count, 0) > 0
      ? totalMonthlyCost / lineItems.reduce((s, l) => s + l.count, 0) / 160
      : 0;
    const totalHeadcount = lineItems.reduce((s, l) => s + l.count, 0);

    return { lines, totalMonthlyCost, totalCost, marginAmount, totalWithMargin, blendedRate, totalHeadcount };
  }, [lineItems, duration, margin]);

  const linkToOpp = () => {
    if (!linkedOppId) return;
    updateOppMutation.mutate({ id: linkedOppId, tcv: Math.round(calculations.totalWithMargin) } as any);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pricing Engine</h1>
          <p className="text-sm text-muted-foreground">Build pricing for deals based on team, geo, and engagement type</p>
        </div>
      </div>

      {/* Config Row */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Engagement Type</label>
          <select value={engType} onChange={e => setEngType(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground">
            <option value="">Select type</option>
            {engagementTypes.map((et: any) => (
              <option key={et.code} value={et.name}>{et.name} ({et.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Duration (months)</label>
          <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" min={1} max={60} />
        </div>
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Margin %</label>
          <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" min={0} max={80} />
        </div>
        <div>
          <label className="block text-[11px] text-muted-foreground mb-1">Link to Deal</label>
          <select value={linkedOppId} onChange={e => setLinkedOppId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground">
            <option value="">None</option>
            {opportunities.map(o => <option key={o.id} value={o.id}>{o.customerName} — {o.opportunityName}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Contract Value', value: `$${(calculations.totalWithMargin/1000).toFixed(0)}k`, icon: DollarSign, color: '#7c3aed' },
          { label: 'Monthly Run Rate', value: `$${(calculations.totalMonthlyCost/1000).toFixed(0)}k`, icon: Calculator, color: '#3b82f6' },
          { label: 'Blended Rate', value: `$${calculations.blendedRate.toFixed(0)}/hr`, icon: Percent, color: '#22c55e' },
          { label: 'Total Headcount', value: `${calculations.totalHeadcount}`, icon: Users, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              <span className="g-section-label">{kpi.label}</span>
            </div>
            <div className="g-kpi text-foreground" style={{ fontSize: '20px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Line Items Table */}
      <div className="g-surface g-elevated overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <span className="text-sm font-semibold text-foreground">Team Composition</span>
          <button onClick={addLine} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors">
            <Plus className="h-3 w-3" /> Add Role
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--g-line)' }}>
              <th className="px-4 py-2 text-left g-section-label">Role</th>
              <th className="px-4 py-2 text-center g-section-label">Count</th>
              <th className="px-4 py-2 text-left g-section-label">Geo</th>
              <th className="px-4 py-2 text-right g-section-label">Base Rate</th>
              <th className="px-4 py-2 text-right g-section-label">Effective</th>
              <th className="px-4 py-2 text-right g-section-label">Monthly</th>
              <th className="px-4 py-2 text-right g-section-label">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {calculations.lines.map((line) => (
              <tr key={line.id} className="border-b hover:bg-card/50" style={{ borderColor: 'var(--g-line)' }}>
                <td className="px-4 py-2">
                  <select value={line.role} onChange={e => updateLine(line.id, 'role', e.target.value)}
                    className="px-2 py-1 text-xs bg-transparent border border-border rounded text-foreground">
                    {ROLES.map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="number" value={line.count} onChange={e => updateLine(line.id, 'count', Number(e.target.value))}
                    className="w-14 px-2 py-1 text-xs text-center bg-transparent border border-border rounded text-foreground" min={1} />
                </td>
                <td className="px-4 py-2">
                  <select value={line.geo} onChange={e => updateLine(line.id, 'geo', e.target.value)}
                    className="px-2 py-1 text-xs bg-transparent border border-border rounded text-foreground">
                    {Object.entries(GEO_RATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-right g-metric text-muted-foreground">${line.baseRate}/hr</td>
                <td className="px-4 py-2 text-right g-metric text-foreground">${line.effectiveRate.toFixed(0)}/hr</td>
                <td className="px-4 py-2 text-right g-metric text-foreground">${(line.monthlyTotal/1000).toFixed(1)}k</td>
                <td className="px-4 py-2 text-right g-metric font-semibold text-foreground">${(line.totalCost/1000).toFixed(0)}k</td>
                <td className="px-4 py-2">
                  <button onClick={() => removeLine(line.id)} className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t" style={{ borderColor: 'var(--g-line)' }}>
              <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-foreground">Subtotal (Cost)</td>
              <td className="px-4 py-3 text-right g-metric font-semibold text-foreground">${(calculations.totalMonthlyCost/1000).toFixed(1)}k/mo</td>
              <td className="px-4 py-3 text-right g-metric font-semibold text-foreground">${(calculations.totalCost/1000).toFixed(0)}k</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-sm text-muted-foreground">Margin ({margin}%)</td>
              <td className="px-4 py-2 text-right g-metric text-muted-foreground">${(calculations.marginAmount/duration/1000).toFixed(1)}k/mo</td>
              <td className="px-4 py-2 text-right g-metric text-muted-foreground">${(calculations.marginAmount/1000).toFixed(0)}k</td>
              <td></td>
            </tr>
            <tr className="border-t" style={{ borderColor: 'var(--g-line)' }}>
              <td colSpan={5} className="px-4 py-3 text-sm font-bold text-foreground">Total Contract Value</td>
              <td className="px-4 py-3 text-right g-metric font-bold text-foreground">${((calculations.totalWithMargin/duration)/1000).toFixed(1)}k/mo</td>
              <td className="px-4 py-3 text-right g-metric font-bold text-[#7c3aed]" style={{ fontSize: '16px' }}>${(calculations.totalWithMargin/1000).toFixed(0)}k</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {linkedOppId && (
          <button onClick={linkToOpp} disabled={updateOppMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
            <Link2 className="h-4 w-4" /> Update Deal TCV (${(calculations.totalWithMargin/1000).toFixed(0)}k)
          </button>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <OpportunityProvider>
      <PricingContent />
    </OpportunityProvider>
  );
}
