'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { useState } from 'react';
import { Search, Crown, UserCheck, ExternalLink } from 'lucide-react';

function StakeholdersContent() {
  const { opportunities, isLoading } = useOpportunities();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'decision_maker' | 'primary'>('all');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading stakeholders...</div>;
  }

  const allStakeholders = opportunities.flatMap(opp =>
    (opp.customerStakeholders || []).map(s => ({ ...s, customerName: opp.customerName, opportunityName: opp.opportunityName, oppId: opp.id }))
  );

  const filtered = allStakeholders.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.customerName.toLowerCase().includes(search.toLowerCase()) && !(s.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter === 'decision_maker') return s.isDecisionMaker;
    if (roleFilter === 'primary') return s.isPrimaryContact;
    return true;
  });

  const decisionMakers = allStakeholders.filter(s => s.isDecisionMaker);
  const primaryContacts = allStakeholders.filter(s => s.isPrimaryContact);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {allStakeholders.length} contacts · {decisionMakers.length} decision makers · {primaryContacts.length} primary contacts
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            className="w-full pl-9 pr-3 py-2 text-sm g-surface g-elevated rounded-lg text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/40"
          />
        </div>
        <div className="flex gap-1">
          {([['all', 'All'], ['decision_maker', 'Decision Makers'], ['primary', 'Primary Contacts']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRoleFilter(val as 'all' | 'decision_maker' | 'primary')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                roleFilter === val ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((person, i) => (
          <div key={person.id || i} className="p-4 rounded-xl g-surface g-elevated hover:border-purple-500/20 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">
                {person.name.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{person.name}</span>
                  {person.isDecisionMaker && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
                      <Crown className="h-2.5 w-2.5" /> DM
                    </span>
                  )}
                  {person.isPrimaryContact && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 flex items-center gap-1">
                      <UserCheck className="h-2.5 w-2.5" /> Primary
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{person.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{person.customerName} · {person.opportunityName}</div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {person.email && <span className="text-[11px] text-muted-foreground">{person.email}</span>}
                {person.linkedInUrl && (
                  <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                    LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">No stakeholders match your filter.</div>
        )}
      </div>
    </div>
  );
}

export default function StakeholdersPage() {
  return (
    <OpportunityProvider>
      <StakeholdersContent />
    </OpportunityProvider>
  );
}
