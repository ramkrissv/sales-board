'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  FileSearch, FileText, Sparkles, Loader2, Plus, ChevronRight,
  Target, Clock, Users, DollarSign, BarChart3, ArrowRight,
  Zap, CheckSquare, AlertTriangle, Code, Layers, BookOpen,
  Mic, Upload, Clipboard
} from 'lucide-react';

// Pursuit data
const PURSUITS = [
  { id: 'P1', client: 'Jack Henry', name: 'Core banking ITSM — 124-req RFP', type: 'RFP', due: 'Jul 18', coverage: 86, sa: 'Sreeram + Ram', value: 2400000, status: 'Drafting', region: 'NA', reqs: 124, answered: 107 },
  { id: 'P2', client: 'Fannie Mae', name: 'GenAI platform — proactive proposal', type: 'Proactive', due: 'Jun 20', coverage: 92, sa: 'Sreeram + Ram', value: 1200000, status: 'In Review', region: 'NA', reqs: 45, answered: 41 },
  { id: 'P3', client: 'Transurban', name: 'AIOps managed operations RFI', type: 'RFI', due: 'Jul 02', coverage: 64, sa: 'Sreeram + Rehan', value: 900000, status: 'Parsing', region: 'APAC', reqs: 89, answered: 57 },
  { id: 'P4', client: 'TernStack', name: 'Inference governance pilot', type: 'Proactive', due: 'Jun 28', coverage: 71, sa: 'Sreeram', value: 400000, status: 'Solutioning', region: 'India', reqs: 32, answered: 23 },
];

const PROPOSAL_SECTIONS = [
  { id: 's1', title: 'Executive Summary', status: 'complete', aiReady: true },
  { id: 's2', title: 'Company Overview & Qualifications', status: 'complete', aiReady: true },
  { id: 's3', title: 'Understanding of Requirements', status: 'draft', aiReady: true },
  { id: 's4', title: 'Proposed Solution Architecture', status: 'draft', aiReady: true },
  { id: 's5', title: 'Implementation Approach', status: 'pending', aiReady: true },
  { id: 's6', title: 'Team & Resource Plan', status: 'pending', aiReady: true },
  { id: 's7', title: 'Timeline & Milestones', status: 'pending', aiReady: true },
  { id: 's8', title: 'Pricing & Commercial Terms', status: 'pending', aiReady: false },
  { id: 's9', title: 'Case Studies & References', status: 'pending', aiReady: true },
  { id: 's10', title: 'Compliance & Security', status: 'pending', aiReady: true },
];

const SA_BENCH = [
  { name: 'Sreeram', assignments: 3, availability: 'Busy', skills: ['AI/ML', 'Cloud', 'Architecture'], utilization: 95 },
  { name: 'Ram', assignments: 2, availability: 'Available', skills: ['Data', 'Analytics', 'AI'], utilization: 60 },
  { name: 'Rehan', assignments: 1, availability: 'Available', skills: ['DevSecOps', 'QA', 'Automation'], utilization: 40 },
  { name: 'Vijay', assignments: 2, availability: 'Partial', skills: ['Java', 'Architecture', 'Legacy'], utilization: 75 },
];

const TEMPLATES = [
  { title: 'AI Platform Capability Deck', type: 'Product', uses: 12 },
  { title: 'Cloud Migration Playbook', type: 'Technical', uses: 8 },
  { title: 'Healthcare Industry Brief', type: 'Industry', uses: 5 },
  { title: 'QA CoE Reference Architecture', type: 'Technical', uses: 7 },
  { title: 'Managed Services Pricing Template', type: 'Commercial', uses: 15 },
  { title: 'Financial Services Case Study', type: 'Case Study', uses: 9 },
  { title: 'Security & Compliance Matrix', type: 'Compliance', uses: 11 },
  { title: 'Team Composition Template', type: 'Commercial', uses: 14 },
];

type Tab = 'command' | 'pursuits' | 'studio' | 'solutioning' | 'templates';

export default function PresalesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('command');
  const [selectedPursuit, setSelectedPursuit] = useState<typeof PURSUITS[0] | null>(null);
  const [studioContent, setStudioContent] = useState<Record<string, string>>({});
  const [rfpInput, setRfpInput] = useState('');

  const chatMutation = trpc.ai.chat.useMutation();

  const tabs = [
    { id: 'command' as Tab, label: 'Command', icon: Target },
    { id: 'pursuits' as Tab, label: 'Pursuits', icon: BarChart3, badge: PURSUITS.length },
    { id: 'studio' as Tab, label: 'Studio', icon: FileText },
    { id: 'solutioning' as Tab, label: 'Solutioning', icon: Code },
    { id: 'templates' as Tab, label: 'Templates', icon: BookOpen },
  ];

  const totalPursuitValue = PURSUITS.reduce((s, p) => s + p.value, 0);
  const avgCoverage = Math.round(PURSUITS.reduce((s, p) => s + p.coverage, 0) / PURSUITS.length);

  const handleAIDraft = (sectionId: string, sectionTitle: string) => {
    const pursuit = selectedPursuit || PURSUITS[0];
    chatMutation.mutate({
      message: `Draft the "${sectionTitle}" section for a proposal to ${pursuit.client} for "${pursuit.name}". Make it professional, specific to their requirements, and about 200 words. Format with clear paragraphs.`,
      context: { page: 'presales-studio' },
    }, {
      onSuccess: (data) => {
        setStudioContent(prev => ({ ...prev, [sectionId]: data.response }));
      },
    });
  };

  const statusColors: Record<string, string> = {
    'Parsing': 'bg-blue-500/10 text-blue-400',
    'Solutioning': 'bg-purple-500/10 text-purple-400',
    'Drafting': 'bg-amber-500/10 text-amber-400',
    'In Review': 'bg-emerald-500/10 text-emerald-400',
    'Submitted': 'bg-green-500/10 text-green-400',
  };

  const typeColors: Record<string, string> = {
    'RFP': 'bg-red-500/10 text-red-400 border-red-500/20',
    'RFI': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Proactive': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Presales OS</h1>
          <p className="text-sm text-muted-foreground">RFP intake &rarr; Solutioning &rarr; Proposal &rarr; Pricing &rarr; Submit</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary border border-border w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.badge && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[10px]">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* COMMAND TAB */}
      {activeTab === 'command' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Active Pursuits', value: PURSUITS.length, icon: Target, color: '#7c3aed' },
              { label: 'Pursuit Value', value: `$${(totalPursuitValue/1e6).toFixed(1)}M`, icon: DollarSign, color: '#22c55e' },
              { label: 'Avg Coverage', value: `${avgCoverage}%`, icon: BarChart3, color: '#3b82f6' },
              { label: 'Due This Week', value: PURSUITS.filter(p => true).length, icon: Clock, color: '#f59e0b' },
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

          {/* Today's priorities */}
          <div className="g-surface g-elevated p-4">
            <div className="g-section-label mb-3 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Today in Presales</div>
            <div className="space-y-2">
              {PURSUITS.map(p => (
                <button key={p.id} onClick={() => { setSelectedPursuit(p); setActiveTab('pursuits'); }}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-card border border-border hover:border-[#7c3aed]/20 text-left transition-all">
                  <span className={`g-chip border ${typeColors[p.type] || ''}`}>{p.type}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{p.client}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16">
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span className="text-muted-foreground">Coverage</span>
                        <span className={`font-bold ${p.coverage >= 80 ? 'text-emerald-400' : p.coverage >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{p.coverage}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${p.coverage}%`, backgroundColor: p.coverage >= 80 ? '#22c55e' : p.coverage >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                    <span className={`g-chip ${statusColors[p.status] || ''}`}>{p.status}</span>
                    <span className="text-xs text-muted-foreground">Due {p.due}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PURSUITS TAB */}
      {activeTab === 'pursuits' && (
        <div className="space-y-4">
          {PURSUITS.map(p => (
            <div key={p.id} className={`g-surface g-elevated p-5 transition-all ${selectedPursuit?.id === p.id ? '!border-[#7c3aed]/40 ring-1 ring-[#7c3aed]/10' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`g-chip border ${typeColors[p.type] || ''}`}>{p.type}</span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{p.client}</div>
                    <div className="text-xs text-muted-foreground">{p.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="g-metric text-sm font-bold text-foreground">${(p.value/1000).toFixed(0)}k</span>
                  <span className={`g-chip ${statusColors[p.status] || ''}`}>{p.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="text-xs"><span className="text-muted-foreground">Due:</span> <span className="text-foreground">{p.due}</span></div>
                <div className="text-xs"><span className="text-muted-foreground">SA:</span> <span className="text-foreground">{p.sa}</span></div>
                <div className="text-xs"><span className="text-muted-foreground">Region:</span> <span className="text-foreground">{p.region}</span></div>
                <div className="text-xs"><span className="text-muted-foreground">Requirements:</span> <span className="text-foreground">{p.answered}/{p.reqs} answered</span></div>
              </div>

              {/* Coverage bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Coverage</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.coverage}%`, backgroundColor: p.coverage >= 80 ? '#22c55e' : p.coverage >= 60 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <span className={`text-xs font-bold ${p.coverage >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{p.coverage}%</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setSelectedPursuit(p); setActiveTab('studio'); }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors font-medium">
                  Open Studio
                </button>
                <button onClick={() => { setSelectedPursuit(p); setActiveTab('solutioning'); }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  Solutioning
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STUDIO TAB */}
      {activeTab === 'studio' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Proposal Studio</div>
              <div className="text-xs text-muted-foreground">{selectedPursuit ? `${selectedPursuit.client} — ${selectedPursuit.name}` : 'Select a pursuit first'}</div>
            </div>
            <div className="flex gap-2">
              <select className="px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground"
                value={selectedPursuit?.id || ''} onChange={e => setSelectedPursuit(PURSUITS.find(p => p.id === e.target.value) || null)}>
                <option value="">Select pursuit</option>
                {PURSUITS.map(p => <option key={p.id} value={p.id}>{p.client} — {p.type}</option>)}
              </select>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            {PROPOSAL_SECTIONS.map((sec, i) => {
              const sectionStatus: Record<string, string> = {
                complete: 'bg-emerald-500/10 text-emerald-400',
                draft: 'bg-amber-500/10 text-amber-400',
                pending: 'bg-secondary text-muted-foreground',
              };
              const content = studioContent[sec.id];

              return (
                <div key={sec.id} className="g-surface g-elevated p-4 reveal" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                      <span className="text-sm font-medium text-foreground">{sec.title}</span>
                      <span className={`g-chip ${sectionStatus[sec.status] || ''}`}>{sec.status}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {sec.aiReady && (
                        <button onClick={() => handleAIDraft(sec.id, sec.title)}
                          disabled={chatMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-medium hover:bg-[#7c3aed]/20 transition-colors disabled:opacity-50">
                          {chatMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          AI Draft
                        </button>
                      )}
                    </div>
                  </div>
                  {content && (
                    <div className="mt-3 p-3 rounded-lg bg-card border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SOLUTIONING TAB */}
      {activeTab === 'solutioning' && (
        <div className="space-y-4">
          <div className="text-sm font-semibold text-foreground">Solutioning</div>

          {/* Effort Estimator */}
          <div className="g-surface g-elevated p-5">
            <div className="g-section-label mb-3">Effort Estimator</div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { role: 'Solution Architect', weeks: 4, rate: 200 },
                { role: 'Sr. Developer', weeks: 12, rate: 165 },
                { role: 'Developer', weeks: 16, rate: 135 },
                { role: 'QA Engineer', weeks: 8, rate: 120 },
                { role: 'Project Manager', weeks: 16, rate: 175 },
              ].map(item => (
                <div key={item.role} className="p-3 rounded-lg bg-card border border-border text-center">
                  <div className="text-[10px] text-muted-foreground">{item.role}</div>
                  <div className="text-lg font-bold text-foreground g-metric">{item.weeks}w</div>
                  <div className="text-[10px] text-muted-foreground">${item.rate}/hr</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
              <span className="text-xs text-foreground font-medium">Total Estimated Effort</span>
              <span className="text-sm font-bold text-[#7c3aed] g-metric">56 person-weeks &middot; ~$890K</span>
            </div>
          </div>

          {/* SA Bench */}
          <div className="g-surface g-elevated p-5">
            <div className="g-section-label mb-3">SA Bench Allocation</div>
            <div className="space-y-2">
              {SA_BENCH.map(sa => (
                <div key={sa.name} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="w-8 h-8 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] text-xs font-bold">
                    {sa.name.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-foreground">{sa.name}</div>
                    <div className="flex gap-1 mt-0.5">
                      {sa.skills.map(s => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{s}</span>)}
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="text-foreground">{sa.utilization}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${sa.utilization}%`, backgroundColor: sa.utilization > 80 ? '#ef4444' : sa.utilization > 60 ? '#f59e0b' : '#22c55e' }} />
                    </div>
                  </div>
                  <span className={`g-chip ${sa.availability === 'Available' ? 'bg-emerald-500/10 text-emerald-400' : sa.availability === 'Partial' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                    {sa.availability}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Templates & Assets</div>
            <button className="px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors flex items-center gap-1">
              <Plus className="h-3 w-3" /> New Template
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TEMPLATES.map((t, i) => (
              <div key={i} className="p-4 rounded-xl g-surface g-elevated hover-lift hover-glow text-center">
                <FileText className="h-6 w-6 text-[#7c3aed] mx-auto mb-2 opacity-60" />
                <div className="text-xs font-semibold text-foreground">{t.title}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="g-chip bg-secondary text-muted-foreground">{t.type}</span>
                  <span className="text-[10px] text-muted-foreground">{t.uses} uses</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
