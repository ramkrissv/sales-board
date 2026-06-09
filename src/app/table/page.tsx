'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { format } from 'date-fns';

function TableContent() {
  const { opportunities, isLoading } = useOpportunities();
  const [search, setSearch] = useState('');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading data...</div>;
  }

  const filtered = opportunities.filter(o =>
    !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.opportunityName.toLowerCase().includes(search.toLowerCase()) || o.primaryOwner.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    'Discovery': 'text-blue-400', 'Qualification': 'text-amber-400', 'Proposal': 'text-purple-400',
    'Negotiation': 'text-emerald-400', 'Won': 'text-green-400', 'Lost': 'text-slate-500', 'On Hold': 'text-orange-400',
  };

  const handleExport = () => {
    const headers = ['Customer', 'Opportunity', 'Status', 'TCV', 'Owner', 'Industry', 'Region', 'Expected Close'];
    const rows = filtered.map(o => [o.customerName, o.opportunityName, o.status, o.tcv, o.primaryOwner, o.industry, o.region, o.expectedCloseDate]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pipeline.csv'; a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Pipeline Table</h1>
          <p className="text-sm text-slate-400 mt-1">{filtered.length} opportunities</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-[#111127] border border-[#2a2a4a] text-slate-400 hover:text-white hover:border-purple-500/30 transition-colors">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-[#111127] border border-[#2a2a4a] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/40" />
      </div>

      <div className="rounded-xl bg-[#111127] border border-[#2a2a4a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a4a]">
                {['Customer', 'Opportunity', 'Status', 'TCV', 'Margin', 'Owner', 'Close Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(opp => (
                <tr key={opp.id} className="border-b border-[#1a1a35] hover:bg-[#1a1a35] transition-colors cursor-pointer group">
                  <td className="px-4 py-3 text-white font-medium group-hover:text-purple-300 transition-colors">{opp.customerName}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{opp.opportunityName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${statusColors[opp.status]}`}>{opp.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white">{opp.tcv > 0 ? `$${(opp.tcv/1000).toFixed(0)}k` : '\u2014'}</td>
                  <td className="px-4 py-3 text-slate-400">{opp.margin ? `${opp.margin}%` : '\u2014'}</td>
                  <td className="px-4 py-3 text-slate-400">{opp.primaryOwner}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{format(new Date(opp.expectedCloseDate), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TablePage() {
  return (
    <OpportunityProvider>
      <TableContent />
    </OpportunityProvider>
  );
}
