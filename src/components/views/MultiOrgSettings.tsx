'use client';

import { useState } from 'react';
import {
  Building2, Palette, Globe, Lock, Plus, Save, Users,
  CheckCircle, Shield, Eye, Settings, Copy,
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  domain: string;
  brandColor: string;
  logoUrl: string;
  tenantId: string;
  userCount: number;
  plan: 'starter' | 'professional' | 'enterprise';
  isActive: boolean;
}

const DEFAULT_ORGS: Organization[] = [
  {
    id: 'org-1',
    name: 'Galent Inc.',
    domain: 'galent.ai',
    brandColor: '#7c3aed',
    logoUrl: '/galent-logo.svg',
    tenantId: 'e4de6474-5383-4849-a7f2-8d9620ea93e1',
    userCount: 12,
    plan: 'enterprise',
    isActive: true,
  },
];

const PLAN_BADGES: Record<string, string> = {
  starter: 'bg-slate-500/10 text-slate-400',
  professional: 'bg-blue-500/10 text-blue-400',
  enterprise: 'bg-[#7c3aed]/10 text-[#7c3aed]',
};

export default function MultiOrgSettings() {
  const [orgs, setOrgs] = useState<Organization[]>(DEFAULT_ORGS);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [brandColor, setBrandColor] = useState('#7c3aed');
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');

  const addOrg = () => {
    if (!orgName) return;
    setOrgs(prev => [...prev, {
      id: `org-${Date.now()}`,
      name: orgName,
      domain: orgDomain || `${orgName.toLowerCase().replace(/\s+/g, '')}.salespilot.app`,
      brandColor,
      logoUrl: '',
      tenantId: crypto.randomUUID ? crypto.randomUUID() : `tenant-${Date.now()}`,
      userCount: 0,
      plan: 'starter',
      isActive: true,
    }]);
    setShowAdd(false);
    setOrgName('');
    setOrgDomain('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#7c3aed]" />
            Multi-Organization Management
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Tenant isolation, custom branding, and domain configuration
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9]">
          <Plus className="h-3 w-3" /> Add Organization
        </button>
      </div>

      {/* Add org form */}
      {showAdd && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3 animate-flow-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Organization Name</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corp" className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Custom Domain</label>
              <input value={orgDomain} onChange={e => setOrgDomain(e.target.value)}
                placeholder="acme.salespilot.app" className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Brand Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <span className="text-xs font-mono text-foreground">{brandColor}</span>
              <div className="w-24 h-8 rounded-lg" style={{ backgroundColor: brandColor }} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-[10px] text-muted-foreground">Cancel</button>
            <button onClick={addOrg} disabled={!orgName} className="px-3 py-1.5 text-[10px] rounded-lg bg-[#7c3aed] text-white font-medium disabled:opacity-50">
              Create Organization
            </button>
          </div>
        </div>
      )}

      {/* Org cards */}
      <div className="space-y-3">
        {orgs.map(org => (
          <div key={org.id} className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              {/* Brand color swatch */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: org.brandColor + '20' }}>
                <Building2 className="h-5 w-5" style={{ color: org.brandColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{org.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${PLAN_BADGES[org.plan]}`}>
                    {org.plan}
                  </span>
                  {org.isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> {org.domain}</span>
                  <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {org.userCount} users</span>
                  <span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Tenant: {org.tenantId.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Branding preview */}
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: org.brandColor }} />
                  <span className="text-[9px] font-mono text-muted-foreground">{org.brandColor}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${org.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {org.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
              {[
                { icon: Shield, label: 'Data Isolation', status: true },
                { icon: Palette, label: 'Custom Branding', status: true },
                { icon: Globe, label: 'Custom Domain', status: !!org.domain },
                { icon: Lock, label: 'SSO/SAML', status: org.plan === 'enterprise' },
              ].map(feature => (
                <div key={feature.label} className="flex items-center gap-1.5 text-[9px]">
                  {feature.status ? (
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-border" />
                  )}
                  <span className={feature.status ? 'text-foreground' : 'text-muted-foreground'}>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* White-label info */}
      <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
        <div className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider mb-2">White-Label Features</div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-foreground">
          <div className="flex items-center gap-1.5"><Palette className="h-3 w-3 text-[#7c3aed]" /> Custom logo, colors, fonts</div>
          <div className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-[#7c3aed]" /> Custom domain (CNAME)</div>
          <div className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-[#7c3aed]" /> Complete tenant data isolation</div>
          <div className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-[#7c3aed]" /> Per-org API keys & rate limits</div>
          <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-[#7c3aed]" /> Org-scoped user management</div>
          <div className="flex items-center gap-1.5"><Eye className="h-3 w-3 text-[#7c3aed]" /> Branded email templates</div>
        </div>
      </div>
    </div>
  );
}
