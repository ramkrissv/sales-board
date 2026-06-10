'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  FileText, FolderOpen, Users, Sparkles, Plus, Send, Loader2,
  Download, Eye, Calendar, User, CheckCircle2, Clock, AlertCircle,
  FileSearch, Presentation, Shield, BarChart3
} from 'lucide-react';

type RFPStatus = 'draft' | 'in_progress' | 'submitted' | 'won' | 'lost';
type TabKey = 'rfp' | 'artifacts' | 'bench' | 'drafter';

interface RFP {
  id: string;
  title: string;
  customer: string;
  dueDate: string;
  status: RFPStatus;
  assignedTo: string;
  type: 'RFP' | 'RFI';
}

const statusConfig: Record<RFPStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-400', icon: FileText },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-amber-500/10 text-amber-400', icon: AlertCircle },
  won: { label: 'Won', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  lost: { label: 'Lost', color: 'bg-red-500/10 text-red-400', icon: AlertCircle },
};

const artifactTypeColors: Record<string, string> = {
  Technical: 'bg-blue-500/10 text-blue-400',
  Commercial: 'bg-emerald-500/10 text-emerald-400',
  Industry: 'bg-amber-500/10 text-amber-400',
  Product: 'bg-purple-500/10 text-purple-400',
};

const tabs: { key: TabKey; label: string; icon: typeof FileSearch }[] = [
  { key: 'rfp', label: 'RFP Tracker', icon: FileSearch },
  { key: 'artifacts', label: 'Artifacts', icon: FolderOpen },
  { key: 'bench', label: 'SA Bench', icon: Users },
  { key: 'drafter', label: 'AI Drafter', icon: Sparkles },
];

export default function PresalesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('rfp');
  const [showNewRFP, setShowNewRFP] = useState(false);

  const [rfps, setRfps] = useState<RFP[]>([
    { id: '1', title: 'Cloud Migration Assessment', customer: 'Wells Fargo', dueDate: '2026-07-15', status: 'in_progress', assignedTo: 'Sreeram', type: 'RFP' },
    { id: '2', title: 'AI Platform POC Requirements', customer: 'Fannie Mae', dueDate: '2026-07-01', status: 'draft', assignedTo: 'Ram', type: 'RFI' },
    { id: '3', title: 'DevSecOps Pipeline Setup', customer: 'Brightspeed', dueDate: '2026-06-25', status: 'submitted', assignedTo: 'Rehan', type: 'RFP' },
  ]);

  const artifacts = [
    { title: 'AI Platform Capability Deck', type: 'Product', updatedAt: '2026-06-01' },
    { title: 'Cloud Migration Playbook', type: 'Technical', updatedAt: '2026-05-15' },
    { title: 'Healthcare Industry Solution Brief', type: 'Industry', updatedAt: '2026-05-20' },
    { title: 'QA CoE Reference Architecture', type: 'Technical', updatedAt: '2026-04-10' },
    { title: 'Managed Services Pricing Template', type: 'Commercial', updatedAt: '2026-06-05' },
    { title: 'Financial Services Case Study', type: 'Industry', updatedAt: '2026-05-01' },
  ];

  const saBench = [
    { name: 'Sreeram', assignments: 3, availability: 'Busy' as const, skills: ['AI/ML', 'Cloud', 'Architecture'] },
    { name: 'Ram', assignments: 2, availability: 'Available' as const, skills: ['Data', 'Analytics', 'AI'] },
    { name: 'Rehan Hanif', assignments: 1, availability: 'Available' as const, skills: ['DevSecOps', 'QA', 'Automation'] },
    { name: 'Vijay', assignments: 2, availability: 'Partial' as const, skills: ['Java', 'Architecture', 'Legacy'] },
  ];

  // New RFP form state
  const [newTitle, setNewTitle] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newType, setNewType] = useState<'RFP' | 'RFI'>('RFP');
  const [newAssignedTo, setNewAssignedTo] = useState('');

  // AI Drafter state
  const [rfpRequirements, setRfpRequirements] = useState('');
  const [draftResponse, setDraftResponse] = useState('');

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setDraftResponse(data.response);
    },
    onError: (error) => {
      setDraftResponse(`Error: ${error.message}`);
    },
  });

  const handleAddRFP = () => {
    if (!newTitle.trim() || !newCustomer.trim()) return;
    const rfp: RFP = {
      id: String(Date.now()),
      title: newTitle.trim(),
      customer: newCustomer.trim(),
      dueDate: newDueDate || '2026-08-01',
      status: 'draft',
      assignedTo: newAssignedTo || 'Unassigned',
      type: newType,
    };
    setRfps(prev => [...prev, rfp]);
    setNewTitle('');
    setNewCustomer('');
    setNewDueDate('');
    setNewAssignedTo('');
    setShowNewRFP(false);
  };

  const handleDraftResponse = () => {
    if (!rfpRequirements.trim()) return;
    setDraftResponse('');
    chatMutation.mutate({
      message: `You are helping draft a presales RFP/RFI response. Based on the following requirements, draft a professional, specific, and compelling response. Be concise and action-oriented.\n\nREQUIREMENTS:\n${rfpRequirements}`,
      context: { page: 'presales-drafter' },
    });
  };

  const availabilityColor = (a: string) => {
    if (a === 'Available') return 'bg-emerald-500/10 text-emerald-400';
    if (a === 'Partial') return 'bg-amber-500/10 text-amber-400';
    return 'bg-red-500/10 text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Presales Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          RFP tracking, artifacts library, SA bench, and AI-assisted response drafting.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-all ${
              activeTab === tab.key
                ? 'bg-card shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* RFP Tracker Tab */}
      {activeTab === 'rfp' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">RFP/RFI Tracker</h2>
            <button
              onClick={() => setShowNewRFP(!showNewRFP)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New RFP
            </button>
          </div>

          {/* New RFP Form */}
          {showNewRFP && (
            <div className="g-surface g-elevated p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Add New RFP/RFI</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40"
                />
                <input
                  type="text"
                  placeholder="Customer"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40"
                />
                <input
                  type="date"
                  placeholder="Due Date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40"
                />
                <input
                  type="text"
                  placeholder="Assign to SA"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'RFP' | 'RFI')}
                  className="px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40"
                >
                  <option value="RFP">RFP</option>
                  <option value="RFI">RFI</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddRFP}
                    className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowNewRFP(false)}
                    className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground text-sm hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RFP Table */}
          <div className="g-surface g-elevated overflow-hidden rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--g-line)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned SA</th>
                </tr>
              </thead>
              <tbody>
                {rfps.map((rfp) => {
                  const sc = statusConfig[rfp.status];
                  const StatusIcon = sc.icon;
                  const isOverdue = new Date(rfp.dueDate) < new Date() && rfp.status !== 'won' && rfp.status !== 'lost' && rfp.status !== 'submitted';
                  return (
                    <tr key={rfp.id} className="border-b last:border-b-0 hover:bg-secondary/50 transition-colors" style={{ borderColor: 'var(--g-line)' }}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#7c3aed]/10 text-[#7c3aed]">
                          {rfp.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{rfp.title}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{rfp.customer}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                          <Calendar className="h-3 w-3" />
                          {rfp.dueDate}
                          {isOverdue && <span className="text-[10px] font-medium text-red-400 ml-1">OVERDUE</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-sm text-foreground">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {rfp.assignedTo}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Artifacts Tab */}
      {activeTab === 'artifacts' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Presales Artifacts Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artifacts.map((artifact, i) => {
              const typeColor = artifactTypeColors[artifact.type] || 'bg-zinc-500/10 text-zinc-400';
              const TypeIcon = artifact.type === 'Technical' ? Shield
                : artifact.type === 'Commercial' ? BarChart3
                : artifact.type === 'Industry' ? Presentation
                : Sparkles;
              return (
                <div key={i} className="g-surface g-elevated p-4 space-y-3 hover:border-[#7c3aed]/20 transition-colors" style={{ borderRadius: '0.75rem' }}>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="h-5 w-5 text-[#7c3aed]" />
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${typeColor}`}>
                      {artifact.type}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{artifact.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Updated {artifact.updatedAt}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Eye className="h-3 w-3" /> View
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SA Bench Tab */}
      {activeTab === 'bench' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Solution Architect Bench</h2>
          <div className="g-surface g-elevated overflow-hidden rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--g-line)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">SA Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignments</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Availability</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Skills</th>
                </tr>
              </thead>
              <tbody>
                {saBench.map((sa, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-secondary/50 transition-colors" style={{ borderColor: 'var(--g-line)' }}>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <div className="w-7 h-7 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-xs font-semibold text-[#7c3aed]">
                          {sa.name.charAt(0)}
                        </div>
                        {sa.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sa.assignments} active</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${availabilityColor(sa.availability)}`}>
                        {sa.availability}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sa.skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 rounded bg-secondary text-xs text-muted-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Drafter Tab */}
      {activeTab === 'drafter' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">AI Response Drafter</h2>
          <p className="text-sm text-muted-foreground">
            Paste RFP/RFI requirements below and let AI draft a professional response.
          </p>

          <div className="g-surface g-elevated p-4 space-y-4" style={{ borderRadius: '0.75rem' }}>
            <textarea
              value={rfpRequirements}
              onChange={(e) => setRfpRequirements(e.target.value)}
              placeholder="Paste RFP/RFI requirements here...&#10;&#10;Example: The vendor must demonstrate capability in cloud-native application development, including containerization, CI/CD pipelines, and Kubernetes orchestration for a Fortune 500 financial services client."
              rows={6}
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40 resize-none"
            />
            <button
              onClick={handleDraftResponse}
              disabled={!rfpRequirements.trim() || chatMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
            >
              {chatMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Drafting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> AI Draft Response
                </>
              )}
            </button>
          </div>

          {/* Draft Output */}
          {draftResponse && (
            <div className="g-surface g-elevated p-4 space-y-3" style={{ borderRadius: '0.75rem' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                <h3 className="text-sm font-semibold text-foreground">AI Drafted Response</h3>
              </div>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-card border border-border rounded-lg p-4">
                {draftResponse}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
