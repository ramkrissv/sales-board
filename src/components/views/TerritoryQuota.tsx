'use client';

import { useState, useMemo } from 'react';
import {
  MapPin, Target, DollarSign, Users, TrendingUp, Plus, Edit2, Save,
  X, BarChart3, CheckCircle, AlertTriangle, Percent,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Territory {
  id: string;
  name: string;
  region: string;
  owner: string;
  quota: number; // annual quota in $
  accounts: string[];
}

interface TerritoryQuotaProps {
  opportunities: any[];
  accounts: any[];
}

const DEFAULT_TERRITORIES: Territory[] = [
  { id: 't1', name: 'Northeast', region: 'North America', owner: 'Sreeram', quota: 2000000, accounts: [] },
  { id: 't2', name: 'Southeast', region: 'North America', owner: 'Ashwin', quota: 1500000, accounts: [] },
  { id: 't3', name: 'West Coast', region: 'North America', owner: 'Chris Wascak', quota: 1800000, accounts: [] },
  { id: 't4', name: 'EMEA', region: 'Europe', owner: 'Admin User', quota: 1200000, accounts: [] },
];

const COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

export default function TerritoryQuota({ opportunities, accounts }: TerritoryQuotaProps) {
  const [territories, setTerritories] = useState<Territory[]>(DEFAULT_TERRITORIES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', owner: '', quota: 0, region: '' });
  const [showAdd, setShowAdd] = useState(false);

  const metrics = useMemo(() => {
    return territories.map(t => {
      // Find opportunities owned by this territory's owner
      const ownerOpps = opportunities.filter(o => o.primaryOwner === t.owner);
      const activeOpps = ownerOpps.filter(o => !['Won', 'Lost'].includes(o.status));
      const wonOpps = ownerOpps.filter(o => o.status === 'Won');
      const pipeline = activeOpps.reduce((s, o) => s + (o.tcv || 0), 0);
      const closed = wonOpps.reduce((s, o) => s + (o.tcv || 0), 0);
      const attainment = t.quota > 0 ? Math.round((closed / t.quota) * 100) : 0;
      const pacing = t.quota > 0 ? Math.round(((closed + pipeline * 0.5) / t.quota) * 100) : 0;
      const gap = Math.max(0, t.quota - closed);

      return { ...t, pipeline, closed, attainment, pacing, gap, activeCount: activeOpps.length, wonCount: wonOpps.length };
    });
  }, [territories, opportunities]);

  const totalQuota = territories.reduce((s, t) => s + t.quota, 0);
  const totalClosed = metrics.reduce((s, m) => s + m.closed, 0);
  const totalPipeline = metrics.reduce((s, m) => s + m.pipeline, 0);
  const overallAttainment = totalQuota > 0 ? Math.round((totalClosed / totalQuota) * 100) : 0;

  const startEdit = (t: Territory) => {
    setEditingId(t.id);
    setEditForm({ name: t.name, owner: t.owner, quota: t.quota, region: t.region });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setTerritories(prev => prev.map(t =>
      t.id === editingId ? { ...t, ...editForm } : t
    ));
    setEditingId(null);
  };

  const addTerritory = () => {
    const newT: Territory = {
      id: `t-${Date.now()}`,
      name: editForm.name || 'New Territory',
      region: editForm.region || 'North America',
      owner: editForm.owner || 'Unassigned',
      quota: editForm.quota || 1000000,
      accounts: [],
    };
    setTerritories(prev => [...prev, newT]);
    setShowAdd(false);
    setEditForm({ name: '', owner: '', quota: 0, region: '' });
  };

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Total Quota</div>
          <div className="text-lg font-bold text-foreground">${(totalQuota / 1e6).toFixed(1)}M</div>
        </div>
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Closed Revenue</div>
          <div className="text-lg font-bold text-emerald-400">${(totalClosed / 1e6).toFixed(1)}M</div>
        </div>
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Active Pipeline</div>
          <div className="text-lg font-bold text-[#7c3aed]">${(totalPipeline / 1e6).toFixed(1)}M</div>
        </div>
        <div className="p-4 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Attainment</div>
          <div className={`text-lg font-bold ${overallAttainment >= 80 ? 'text-emerald-400' : overallAttainment >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {overallAttainment}%
          </div>
        </div>
      </div>

      {/* Attainment chart */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quota Attainment by Territory</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metrics}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 8, fontSize: 10 }}
              formatter={(v: any) => [`$${(Number(v) / 1000).toFixed(0)}k`]} />
            <Bar dataKey="closed" stackId="a" fill="#22c55e" name="Closed" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pipeline" stackId="a" fill="#7c3aed" name="Pipeline" radius={[4, 4, 0, 0]} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Territory cards */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Territories ({territories.length})</div>
        <button onClick={() => { setShowAdd(true); setEditForm({ name: '', owner: '', quota: 1000000, region: 'North America' }); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9]">
          <Plus className="h-3 w-3" /> Add Territory
        </button>
      </div>

      {showAdd && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2 animate-flow-in">
          <div className="grid grid-cols-2 gap-2">
            <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Territory name"
              className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            <input value={editForm.owner} onChange={e => setEditForm(p => ({ ...p, owner: e.target.value }))} placeholder="Owner"
              className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            <input type="number" value={editForm.quota} onChange={e => setEditForm(p => ({ ...p, quota: Number(e.target.value) }))} placeholder="Annual quota ($)"
              className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            <select value={editForm.region} onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))}
              className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground">
              <option value="North America">North America</option>
              <option value="Europe">Europe</option>
              <option value="APAC">APAC</option>
              <option value="Latin America">Latin America</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1 text-[10px] text-muted-foreground">Cancel</button>
            <button onClick={addTerritory} className="px-3 py-1 text-[10px] rounded-lg bg-[#7c3aed] text-white">Create</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {metrics.map(m => (
          <div key={m.id} className="p-4 rounded-xl bg-card border border-border">
            {editingId === m.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="px-2 py-1 text-xs bg-secondary border border-border rounded-lg text-foreground" />
                  <input value={editForm.owner} onChange={e => setEditForm(p => ({ ...p, owner: e.target.value }))}
                    className="px-2 py-1 text-xs bg-secondary border border-border rounded-lg text-foreground" />
                  <input type="number" value={editForm.quota} onChange={e => setEditForm(p => ({ ...p, quota: Number(e.target.value) }))}
                    className="px-2 py-1 text-xs bg-secondary border border-border rounded-lg text-foreground" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                  <button onClick={saveEdit} className="p-1 text-emerald-400"><Save className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#7c3aed]" />
                    <span className="text-xs font-semibold text-foreground">{m.name}</span>
                    <span className="text-[9px] text-muted-foreground">{m.region}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Owner: {m.owner} · {m.activeCount} active · {m.wonCount} won
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center shrink-0">
                  <div>
                    <div className="text-[8px] text-muted-foreground uppercase">Quota</div>
                    <div className="text-xs font-bold text-foreground">${(m.quota / 1000).toFixed(0)}k</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-muted-foreground uppercase">Closed</div>
                    <div className="text-xs font-bold text-emerald-400">${(m.closed / 1000).toFixed(0)}k</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-muted-foreground uppercase">Gap</div>
                    <div className="text-xs font-bold text-amber-400">${(m.gap / 1000).toFixed(0)}k</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-muted-foreground uppercase">Attain</div>
                    <div className={`text-xs font-bold ${m.attainment >= 80 ? 'text-emerald-400' : m.attainment >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {m.attainment}%
                    </div>
                  </div>
                </div>
                {/* Pacing bar */}
                <div className="w-24 shrink-0">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(100, m.pacing)}%`,
                      backgroundColor: m.pacing >= 80 ? '#22c55e' : m.pacing >= 50 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                  <div className="text-[8px] text-muted-foreground text-center mt-0.5">{m.pacing}% pacing</div>
                </div>
                <button onClick={() => startEdit(m)} className="p-1.5 rounded text-muted-foreground hover:text-foreground">
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
