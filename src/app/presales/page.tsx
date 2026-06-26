'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import type { Opportunity } from '@/lib/types';
import {
  PROPOSAL_TEMPLATES,
  SERVICE_DOMAINS,
  searchTemplates,
} from '@/lib/presales/proposal-templates';
import type { ProposalTemplate } from '@/lib/presales/proposal-templates';
import {
  Sparkles, Loader2, Send, FileText, Copy, Check,
  ChevronDown, ChevronUp, Pencil, Trash2, Plus,
  User, Bot, ArrowRight, RotateCcw, BookOpen,
  Users, Clock, AlertTriangle, Package, Info,
  Download, Eye, EyeOff, DollarSign, Calculator, Upload,
  Percent, Link2, Globe, Target, BarChart3,
  Briefcase, CheckCircle2, ChevronRight, Search,
  Settings, Cpu, ClipboardList, Layers, Calendar,
  Building2, TrendingUp, Zap, Shield
} from 'lucide-react';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import WorkshopsTabComponent from '@/components/workshop/WorkshopsTab';

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */
type SectionStatus = 'ai-draft' | 'edited' | 'approved';
type PresalesTab = 'command' | 'studio' | 'pricing' | 'solutioning' | 'workshops';

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  status: SectionStatus;
  order: number;
  executionModel?: string;
  effort?: number;
  phase?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  proposalContent?: { title: string; content: string } | null;
  quickActions?: string[];
}

interface PricingLineItem {
  id: string;
  role: string;
  count: number;
  geo: string;
  baseRate: number;
  hoursPerMonth: number;
}

interface SolutioningRole {
  id: string;
  role: string;
  weeks: number;
  rate: number;
}

interface TechRequirement {
  id: string;
  text: string;
  done: boolean;
}

interface PresalesScopeItem {
  id: string;
  title: string;
  description: string;
  workstream: string;
  executionModel: string;
  effort: number;
  phase: string;
  owner: string;
  aiGenerated: boolean;
}

const EXECUTION_MODELS = [
  { id: 'pod_squad', name: 'FDE Pod Squad', color: '#7c3aed' },
  { id: 'managed_capacity', name: 'Managed Capacity', color: '#3b82f6' },
  { id: 'outcome_based', name: 'Outcome-Based', color: '#22c55e' },
  { id: 'ai_stream', name: 'AI-Powered Stream', color: '#0A867F' },
  { id: 'hybrid', name: 'Hybrid Blend', color: '#f59e0b' },
];

const DEFAULT_WORKSTREAMS = [
  'Discovery & Assessment',
  'Architecture & Design',
  'Development & Build',
  'Testing & QA',
  'Deployment & DevOps',
  'Data & AI/ML',
  'Training & Enablement',
  'Program Management',
];

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */
const GEO_RATES: Record<string, { label: string; multiplier: number }> = {
  'us': { label: 'US (Onshore)', multiplier: 1.0 },
  'canada': { label: 'Canada', multiplier: 0.85 },
  'india': { label: 'India (Offshore)', multiplier: 0.35 },
  'latam': { label: 'Latin America (Nearshore)', multiplier: 0.55 },
  'europe': { label: 'Europe', multiplier: 0.90 },
  'apac': { label: 'APAC', multiplier: 0.45 },
};

const ROLES = [
  { role: 'Program Manager', baseRate: 130 },
  { role: 'Technical Architect', baseRate: 120 },
  { role: 'QA Architect', baseRate: 100 },
  { role: 'Data Architect', baseRate: 110 },
  { role: 'Sr Full Stack Engineer', baseRate: 95 },
  { role: 'Business Analyst', baseRate: 90 },
  { role: 'DevOps Engineer', baseRate: 95 },
  { role: 'QA Engineer', baseRate: 80 },
  { role: 'Delivery Manager', baseRate: 110 },
  { role: 'AI/ML Engineer', baseRate: 130 },
  { role: 'UX Designer', baseRate: 90 },
  { role: 'Scrum Master', baseRate: 100 },
];

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */
let msgCounter = 0;
function uid() { return `msg-${++msgCounter}-${Date.now()}`; }

function wordCount(text: string) { return text.split(/\s+/).filter(Boolean).length; }
function pageEstimate(words: number) { return Math.max(1, Math.ceil(words / 300)); }

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

const STATUS_STYLE: Record<SectionStatus, { label: string; bg: string; text: string }> = {
  'ai-draft': { label: 'AI Draft', bg: 'bg-[#7c3aed]/10', text: 'text-[#7c3aed]' },
  'edited':   { label: 'Edited',   bg: 'bg-amber-500/10',  text: 'text-amber-400' },
  'approved': { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
};

const TAB_CONFIG: { id: PresalesTab; label: string; icon: typeof Target }[] = [
  { id: 'command', label: 'Command', icon: Target },
  { id: 'studio', label: 'Studio', icon: Sparkles },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'solutioning', label: 'Solutioning', icon: Cpu },
  { id: 'workshops', label: 'Workshops', icon: ClipboardList },
];

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */
export default function PresalesPage() {
  /* ── Data ── */
  const { data: allOpportunities = [], isLoading } = trpc.opportunity.list.useQuery();
  const chatMutation = trpc.ai.chat.useMutation();
  const updateOppMutation = trpc.opportunity.update.useMutation();
  const utils = trpc.useUtils();

  const pursuits = useMemo(() =>
    (allOpportunities as Opportunity[]).filter(
      o => ['Proposal', 'Negotiation', 'Qualification'].includes(o.status)
    ), [allOpportunities]
  );

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<PresalesTab>('command');

  /* ── Selected deal (shared across all tabs) ── */
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const selectedDeal = useMemo(() =>
    pursuits.find(o => o.id === selectedDealId) ?? null,
    [pursuits, selectedDealId]
  );

  /* ── Proposal sections (per-deal tracking) ── */
  const [dealSections, setDealSections] = useState<Record<string, ProposalSection[]>>({});
  const sections = useMemo(() => (selectedDealId ? dealSections[selectedDealId] || [] : []), [dealSections, selectedDealId]);
  const setSections = useCallback((updater: ProposalSection[] | ((prev: ProposalSection[]) => ProposalSection[])) => {
    if (!selectedDealId) return;
    setDealSections(prev => ({
      ...prev,
      [selectedDealId]: typeof updater === 'function' ? updater(prev[selectedDealId] || []) : updater,
    }));
  }, [selectedDealId]);

  /* ── Template ── */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = useMemo(() =>
    PROPOSAL_TEMPLATES.find(t => t.id === selectedTemplateId) ?? null,
    [selectedTemplateId]
  );

  /* ── Section editing ── */
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  /* ── Conversation ── */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Template info panel ── */
  const [showTemplateInfo, setShowTemplateInfo] = useState(false);

  /* ── Brief/Full mode per section ── */
  const [sectionViewMode, setSectionViewMode] = useState<Record<string, 'brief' | 'full'>>({});

  /* ── Pending insert (Replace/Append dialog) ── */
  const [pendingInsert, setPendingInsert] = useState<{ sectionId: string; title: string; content: string } | null>(null);

  /* ── Refs for section auto-scroll ── */
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const proposalBodyRef = useRef<HTMLDivElement>(null);

  /* ── Pricing state ── */
  const [pricingDuration, setPricingDuration] = useState(12);
  const [pricingMargin, setPricingMargin] = useState(28);
  const [pricingLineItems, setPricingLineItems] = useState<PricingLineItem[]>([
    { id: '1', role: 'Program Manager', count: 1, geo: 'us', baseRate: 130, hoursPerMonth: 160 },
    { id: '2', role: 'Sr Full Stack Engineer', count: 2, geo: 'india', baseRate: 95, hoursPerMonth: 160 },
    { id: '3', role: 'QA Engineer', count: 1, geo: 'india', baseRate: 80, hoursPerMonth: 160 },
  ]);

  /* ── Solutioning state ── */
  const [solutionRoles, setSolutionRoles] = useState<SolutioningRole[]>([
    { id: 's1', role: 'Solution Architect', weeks: 4, rate: 120 },
    { id: 's2', role: 'Technical Lead', weeks: 8, rate: 95 },
  ]);
  const [saAssignment, setSaAssignment] = useState('');
  const [techRequirements, setTechRequirements] = useState<TechRequirement[]>([]);
  const [archNotes, setArchNotes] = useState('');
  const [newReqText, setNewReqText] = useState('');
  const [scopeItems, setScopeItems] = useState<PresalesScopeItem[]>([]);
  const [expandedWorkstream, setExpandedWorkstream] = useState<string | null>(null);
  const [showScopeAdd, setShowScopeAdd] = useState<string | null>(null);
  const [scopeForm, setScopeForm] = useState({ title: '', description: '', effort: 3, phase: 'P1', owner: '', executionModel: 'pod_squad' });
  const [generatingScope, setGeneratingScope] = useState(false);

  /* ── Command tab search ── */
  const [commandSearch, setCommandSearch] = useState('');

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ═══════════════════════════════════════════════════════
     Studio Logic (preserved from original)
     ═══════════════════════════════════════════════════════ */

  const initConversation = useCallback((deal: Opportunity) => {
    const greeting: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: `I'll help you build a proposal for **${deal.customerName}**.\n\nHere's what I know so far:\n- **Opportunity:** ${deal.opportunityName}\n- **TCV:** $${(deal.tcv || 0).toLocaleString()}\n- **Industry:** ${deal.industry}\n- **Duration:** ${deal.dealDuration}\n\nLet me start by understanding the requirements. **What is the primary business challenge ${deal.customerName} is trying to solve?**`,
      timestamp: new Date(),
      quickActions: ['Draft executive summary', 'Load a template first', 'Generate full proposal'],
    };
    setMessages([greeting]);
    setSelectedTemplateId(null);
    setShowTemplateInfo(false);
  }, []);

  const handleSelectDeal = useCallback((dealId: string, switchToTab?: PresalesTab) => {
    setSelectedDealId(dealId);
    const deal = (allOpportunities as Opportunity[]).find(o => o.id === dealId);
    if (deal) initConversation(deal);
    if (switchToTab) setActiveTab(switchToTab);
  }, [allOpportunities, initConversation]);

  /* ── Detect target section from content ── */
  const detectSection = useCallback((content: string): string | null => {
    const lower = content.toLowerCase();
    if (/executive summary|overview of our proposal|proposal overview/i.test(lower)) return 'executive summary';
    if (/scope of work|deliverables|in-scope|out-of-scope/i.test(lower)) return 'scope';
    if (/technical approach|methodology|architecture|solution design/i.test(lower)) return 'technical approach';
    if (/pricing|cost estimate|commercial|rate card|fee structure/i.test(lower)) return 'pricing';
    if (/timeline|milestones|project plan|phases|schedule/i.test(lower)) return 'timeline';
    if (/team|staffing|resources|personnel|org chart/i.test(lower)) return 'team';
    if (/risk|mitigation|assumptions|constraints/i.test(lower)) return 'risks';
    if (/case stud|success stor|reference|portfolio/i.test(lower)) return 'case studies';
    if (/terms|conditions|legal|warranty|sla/i.test(lower)) return 'terms';
    if (/about us|company overview|why us|our experience/i.test(lower)) return 'about us';
    if (/transition|onboarding|handover|knowledge transfer/i.test(lower)) return 'transition';
    if (/governance|reporting|communication|escalation/i.test(lower)) return 'governance';
    return null;
  }, []);

  const findMatchingSection = useCallback((title: string, content: string): ProposalSection | null => {
    const byTitle = sections.find(s => s.title.toLowerCase() === title.toLowerCase());
    if (byTitle) return byTitle;
    const detected = detectSection(content);
    if (detected) {
      const match = sections.find(s => s.title.toLowerCase().includes(detected) || detected.includes(s.title.toLowerCase()));
      if (match) return match;
    }
    const titleLower = title.toLowerCase();
    const fuzzy = sections.find(s =>
      s.title.toLowerCase().includes(titleLower) || titleLower.includes(s.title.toLowerCase())
    );
    return fuzzy || null;
  }, [sections, detectSection]);

  const scrollToSection = useCallback((sectionId: string) => {
    setTimeout(() => {
      const el = sectionRefs.current[sectionId];
      if (el && proposalBodyRef.current) {
        proposalBodyRef.current.scrollTo({
          top: el.offsetTop - proposalBodyRef.current.offsetTop - 12,
          behavior: 'smooth',
        });
      }
    }, 100);
  }, []);

  const addSection = useCallback((title: string, content: string) => {
    const matchingSection = findMatchingSection(title, content);
    if (matchingSection && matchingSection.content) {
      setPendingInsert({ sectionId: matchingSection.id, title: matchingSection.title, content });
      return;
    }
    if (matchingSection) {
      setSections(prev => prev.map(s =>
        s.id === matchingSection.id ? { ...s, content, status: 'ai-draft' as SectionStatus } : s
      ));
      scrollToSection(matchingSection.id);
      setMessages(prev => [...prev, {
        id: uid(), role: 'system',
        content: `"${matchingSection.title}" added to proposal`,
        timestamp: new Date(),
      }]);
      return;
    }
    const newId = uid();
    setSections(prev => [...prev, {
      id: newId, title, content,
      status: 'ai-draft' as SectionStatus,
      order: prev.length,
    }]);
    scrollToSection(newId);
    setMessages(prev => [...prev, {
      id: uid(), role: 'system',
      content: `"${title}" added to proposal`,
      timestamp: new Date(),
    }]);
  }, [findMatchingSection, scrollToSection, setSections]);

  const handlePendingReplace = useCallback(() => {
    if (!pendingInsert) return;
    setSections(prev => prev.map(s =>
      s.id === pendingInsert.sectionId ? { ...s, content: pendingInsert.content, status: 'ai-draft' as SectionStatus } : s
    ));
    scrollToSection(pendingInsert.sectionId);
    setMessages(prev => [...prev, {
      id: uid(), role: 'system',
      content: `"${pendingInsert.title}" replaced in proposal`,
      timestamp: new Date(),
    }]);
    setPendingInsert(null);
  }, [pendingInsert, scrollToSection, setSections]);

  const handlePendingAppend = useCallback(() => {
    if (!pendingInsert) return;
    setSections(prev => prev.map(s =>
      s.id === pendingInsert.sectionId ? { ...s, content: s.content + '\n\n' + pendingInsert.content, status: 'ai-draft' as SectionStatus } : s
    ));
    scrollToSection(pendingInsert.sectionId);
    setMessages(prev => [...prev, {
      id: uid(), role: 'system',
      content: `Content appended to "${pendingInsert.title}"`,
      timestamp: new Date(),
    }]);
    setPendingInsert(null);
  }, [pendingInsert, scrollToSection, setSections]);

  const moveSection = useCallback((id: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }, [setSections]);

  const removeSection = useCallback((id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  }, [setSections]);

  const approveSection = useCallback((id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
  }, [setSections]);

  const startEditSection = useCallback((id: string) => {
    const sec = sections.find(s => s.id === id);
    if (sec) {
      setEditingSectionId(id);
      setEditBuffer(sec.content);
    }
  }, [sections]);

  const saveEditSection = useCallback(() => {
    if (!editingSectionId) return;
    setSections(prev => prev.map(s =>
      s.id === editingSectionId ? { ...s, content: editBuffer, status: 'edited' } : s
    ));
    setEditingSectionId(null);
    setEditBuffer('');
  }, [editingSectionId, editBuffer, setSections]);

  const handleCopyAll = useCallback(() => {
    const fullText = sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [sections]);

  const exportPDF = useCallback(() => {
    const dealName = selectedDeal?.opportunityName || 'Proposal';
    const customerName = selectedDeal?.customerName || 'Customer';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const execModelLabel = (id: string) => EXECUTION_MODELS.find(m => m.id === id)?.name || id;
    const scopeSection = scopeItems.length > 0 ? `
      <div class="section" style="page-break-before: always;">
        <h2>Scope & Delivery Model</h2>
        <table style="width:100%; border-collapse:collapse; font-size:13px; margin-top:12px;">
          <thead><tr style="background:#f5f3ff; border-bottom:2px solid #7c3aed;">
            <th style="padding:8px; text-align:left;">Scope Item</th>
            <th style="padding:8px; text-align:left;">Workstream</th>
            <th style="padding:8px; text-align:center;">Delivery Model</th>
            <th style="padding:8px; text-align:center;">Phase</th>
            <th style="padding:8px; text-align:center;">Effort</th>
          </tr></thead>
          <tbody>${scopeItems.map(item => `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px 8px;"><strong>${item.title}</strong>${item.description ? `<br><span style="color:#888; font-size:11px;">${item.description}</span>` : ''}</td>
            <td style="padding:6px 8px; color:#666;">${item.workstream}</td>
            <td style="padding:6px 8px; text-align:center;">${execModelLabel(item.executionModel)}</td>
            <td style="padding:6px 8px; text-align:center; font-weight:600;">${item.phase}</td>
            <td style="padding:6px 8px; text-align:center;">${item.effort} pts</td>
          </tr>`).join('')}
          <tr style="border-top:2px solid #7c3aed; font-weight:600;">
            <td colspan="4" style="padding:8px; text-align:right;">Total Effort</td>
            <td style="padding:8px; text-align:center;">${scopeItems.reduce((s, i) => s + i.effort, 0)} pts</td>
          </tr></tbody>
        </table>
      </div>` : '';
    printWindow.document.write(`
      <html><head><title>${dealName} - Proposal</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; }
        h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
        h2 { color: #333; margin-top: 32px; }
        .section { page-break-inside: avoid; margin-bottom: 24px; }
        .meta { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; }
      </style></head><body>
      <h1>${dealName} — Proposal</h1>
      <p style="color:#666;">${customerName} · ${new Date().toLocaleDateString()}</p>
      ${sections.filter(s => s.content).map(s => {
        const modelTag = s.executionModel ? `<span class="meta" style="background:#f5f3ff; color:#7c3aed;">${execModelLabel(s.executionModel)}</span>` : '';
        const phaseTag = s.phase ? `<span class="meta" style="background:#eff6ff; color:#3b82f6;">${s.phase}</span>` : '';
        return `<div class="section"><h2>${s.title}${modelTag}${phaseTag}</h2><div>${s.content.replace(/\n/g, '<br>')}</div></div>`;
      }).join('')}
      ${scopeSection}
      <div class="footer">Generated by Galent SalesPilot · Confidential</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }, [selectedDeal, sections]);

  const exportDOCX = useCallback(async () => {
    const dealName = selectedDeal?.opportunityName || 'Proposal';
    const customerName = selectedDeal?.customerName || 'Customer';
    const execModelLabel2 = (id: string) => EXECUTION_MODELS.find(m => m.id === id)?.name || id;
    const scopeDocxParagraphs = scopeItems.length > 0 ? [
      new Paragraph({ text: 'Scope & Delivery Model', heading: HeadingLevel.HEADING_1, spacing: { before: 600 } }),
      ...scopeItems.map(item => new Paragraph({
        children: [
          new TextRun({ text: `${item.title}`, bold: true }),
          new TextRun({ text: ` — ${item.workstream} · ${execModelLabel2(item.executionModel)} · ${item.phase} · ${item.effort} pts`, color: '666666' }),
          ...(item.description ? [new TextRun({ text: `\n${item.description}`, break: 1 })] : []),
        ],
        spacing: { before: 100 },
      })),
      new Paragraph({
        children: [new TextRun({ text: `Total Effort: ${scopeItems.reduce((s, i) => s + i.effort, 0)} points`, bold: true })],
        spacing: { before: 200 },
      }),
    ] : [];
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: `${dealName} — Proposal`, bold: true, size: 48 })], heading: HeadingLevel.TITLE }),
          new Paragraph({ children: [new TextRun({ text: `${customerName} · ${new Date().toLocaleDateString()}`, color: '666666' })] }),
          ...sections.filter(s => s.content).flatMap(s => {
            const modelSuffix = s.executionModel ? ` [${execModelLabel2(s.executionModel)}]` : '';
            return [
              new Paragraph({ text: `${s.title}${modelSuffix}`, heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }),
              ...s.content.split('\n').filter(Boolean).map(line => new Paragraph({ text: line })),
            ];
          }),
          ...scopeDocxParagraphs,
          new Paragraph({ children: [new TextRun({ text: 'Generated by Galent SalesPilot · Confidential', color: '888888', size: 20 })], spacing: { before: 600 } }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${dealName.replace(/\s/g, '_')}_Proposal.docx`; a.click();
    URL.revokeObjectURL(url);
  }, [selectedDeal, sections]);

  const exportMarkdown = useCallback(() => {
    const execModelLabel3 = (id: string) => EXECUTION_MODELS.find(m => m.id === id)?.name || id;
    let md = sections.filter(s => s.content).map(s => {
      const tags = [s.executionModel && execModelLabel3(s.executionModel), s.phase].filter(Boolean).join(' · ');
      return `## ${s.title}${tags ? ` _[${tags}]_` : ''}\n\n${s.content}`;
    }).join('\n\n---\n\n');
    if (scopeItems.length > 0) {
      md += '\n\n---\n\n## Scope & Delivery Model\n\n| Item | Workstream | Model | Phase | Effort |\n|------|-----------|-------|-------|--------|\n';
      md += scopeItems.map(i => `| ${i.title} | ${i.workstream} | ${execModelLabel3(i.executionModel)} | ${i.phase} | ${i.effort} pts |`).join('\n');
      md += `\n\n**Total Effort:** ${scopeItems.reduce((s, i) => s + i.effort, 0)} points`;
    }
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  }, [sections, scopeItems]);

  const toggleSectionView = useCallback((sectionId: string) => {
    setSectionViewMode(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === 'brief' ? 'full' : 'brief',
    }));
  }, []);

  const getBriefContent = useCallback((content: string): string => {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    return sentences.slice(0, 3).join(' ').trim();
  }, []);

  const loadTemplate = useCallback((template: ProposalTemplate) => {
    setSelectedTemplateId(template.id);
    const templateSections: ProposalSection[] = template.sections.map((sec, i) => ({
      id: uid(),
      title: sec.title,
      content: '',
      status: 'ai-draft' as SectionStatus,
      order: i,
    }));
    setSections(templateSections);
    setShowTemplateInfo(true);
    setMessages(prev => [
      ...prev,
      {
        id: uid(),
        role: 'system',
        content: `Template loaded: "${template.name}" with ${template.sections.length} sections`,
        timestamp: new Date(),
      },
      {
        id: uid(),
        role: 'assistant',
        content: `I've loaded the **${template.name}** template with ${template.sections.length} sections. The proposal structure is ready on the right.\n\nI can now draft content for each section using the deal context. **Would you like me to start with the first section, or is there a specific section you'd like to tackle?**`,
        timestamp: new Date(),
        quickActions: ['Draft all sections', 'Start with executive summary', 'Tell me about the requirements first'],
      },
    ]);
  }, [setSections]);

  const extractProposalContent = useCallback((text: string): { title: string; content: string } | null => {
    const match = text.match(/^##\s+(.+?)\n\n([\s\S]+)/m);
    if (match) return { title: match[1].trim(), content: match[2].trim() };
    const match2 = text.match(/\*\*Section:\s*(.+?)\*\*\n\n([\s\S]+)/m);
    if (match2) return { title: match2[1].trim(), content: match2[2].trim() };
    if (wordCount(text) > 100) {
      const firstLine = text.split('\n')[0].replace(/[*#]/g, '').trim();
      const titleGuess = firstLine.length < 60 ? firstLine : 'Proposal Content';
      return { title: titleGuess, content: text };
    }
    return null;
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || !selectedDeal) return;
    const userMsg: ChatMessage = {
      id: uid(), role: 'user', content: text.trim(), timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    const stakeholderNames = selectedDeal.customerStakeholders
      ?.map(s => `${s.name} (${s.title})`)
      .join(', ') || 'Not specified';
    const existingSections = sections.filter(s => s.content).map(s => s.title).join(', ');
    const emptySections = sections.filter(s => !s.content).map(s => s.title).join(', ');
    let templateContext = '';
    if (selectedTemplate) {
      templateContext = `\nTemplate: ${selectedTemplate.name}\nTemplate AI Context: ${selectedTemplate.aiPromptContext}`;
    }

    const systemPrompt = `You are a proposal writing assistant in a conversational proposal builder. The user is building a proposal through dialogue with you.

Deal context:
- Customer: ${selectedDeal.customerName}
- Opportunity: ${selectedDeal.opportunityName}
- TCV: $${(selectedDeal.tcv || 0).toLocaleString()}
- Industry: ${selectedDeal.industry}
- Duration: ${selectedDeal.dealDuration}
- Region: ${selectedDeal.region}
- Service Line: ${selectedDeal.serviceLine ?? 'IT Services'}
- Billing Model: ${selectedDeal.billingModel ?? 'Time & Material'}
- Stakeholders: ${stakeholderNames}${templateContext}

Proposal progress:
- Sections with content: ${existingSections || 'None yet'}
- Empty sections needing content: ${emptySections || 'None'}

IMPORTANT INSTRUCTIONS:
- When drafting proposal section content, format it as: ## Section Title\n\n[content]
- Write polished, professional proposal content with specific details from the deal context
- When the user asks you to draft a section, write 200-400 words of actual proposal content
- When having a conversation (asking questions, discussing requirements), respond naturally without the ## format
- Ask clarifying questions to make the proposal more specific and compelling
- After generating content, suggest what to work on next
- Keep responses focused and helpful

Additional deal notes: ${(selectedDeal.conversationLog || '').slice(0, 600)}

User message: ${text.trim()}`;

    chatMutation.mutate(
      {
        message: systemPrompt,
        context: { opportunityId: selectedDeal.id, page: 'proposal-studio' },
      },
      {
        onSuccess: (data) => {
          const proposalContent = extractProposalContent(data.response);
          const quickActions = proposalContent
            ? ['Refine this', 'More detail', 'Make it shorter', 'Next section']
            : ['Draft executive summary', 'Add pricing section', 'Include case studies', 'Generate full proposal'];
          const aiMsg: ChatMessage = {
            id: uid(), role: 'assistant', content: data.response,
            timestamp: new Date(), proposalContent, quickActions,
          };
          setMessages(prev => [...prev, aiMsg]);
        },
        onError: () => {
          setMessages(prev => [...prev, {
            id: uid(), role: 'assistant',
            content: 'I encountered an error. Let me try again -- could you rephrase your request?',
            timestamp: new Date(),
          }]);
        },
      }
    );
  }, [selectedDeal, selectedTemplate, sections, chatMutation, extractProposalContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage]);

  const quickPrompts = [
    'Draft executive summary',
    'Add pricing section',
    'Include case studies',
    'Generate full proposal',
  ];

  /* ── Stats ── */
  const totalWords = sections.reduce((sum, s) => sum + wordCount(s.content), 0);
  const totalPages = pageEstimate(totalWords);
  const approvedCount = sections.filter(s => s.status === 'approved').length;

  const templatesByDomain = useMemo(() => {
    const map: Record<string, ProposalTemplate[]> = {};
    for (const domain of SERVICE_DOMAINS) {
      const templates = PROPOSAL_TEMPLATES.filter(t => t.domain === domain);
      if (templates.length > 0) map[domain] = templates;
    }
    return map;
  }, []);

  /* ═══════════════════════════════════════════════════════
     Pricing calculations
     ═══════════════════════════════════════════════════════ */
  const pricingCalcs = useMemo(() => {
    const lines = pricingLineItems.map(item => {
      const geoMultiplier = GEO_RATES[item.geo]?.multiplier || 1;
      const effectiveRate = item.baseRate * geoMultiplier;
      const monthlyPerPerson = effectiveRate * item.hoursPerMonth;
      const monthlyTotal = monthlyPerPerson * item.count;
      const totalCost = monthlyTotal * pricingDuration;
      return { ...item, effectiveRate, monthlyPerPerson, monthlyTotal, totalCost };
    });
    const totalMonthlyCost = lines.reduce((s, l) => s + l.monthlyTotal, 0);
    const totalCost = totalMonthlyCost * pricingDuration;
    const marginAmount = totalCost * (pricingMargin / 100);
    const totalWithMargin = totalCost + marginAmount;
    const totalHeadcount = pricingLineItems.reduce((s, l) => s + l.count, 0);
    const blendedRate = totalHeadcount > 0 ? totalMonthlyCost / totalHeadcount / 160 : 0;
    return { lines, totalMonthlyCost, totalCost, marginAmount, totalWithMargin, blendedRate, totalHeadcount };
  }, [pricingLineItems, pricingDuration, pricingMargin]);

  /* ── Solutioning effort calc ── */
  const effortTotal = useMemo(() => {
    return solutionRoles.reduce((sum, r) => sum + r.weeks * r.rate * 40, 0);
  }, [solutionRoles]);

  /* ═══════════════════════════════════════════════════════
     KPIs for Command tab
     ═══════════════════════════════════════════════════════ */
  const commandKPIs = useMemo(() => {
    const totalPipeline = pursuits.reduce((s, p) => s + (p.tcv || 0), 0);
    const avgDays = pursuits.length > 0
      ? Math.round(pursuits.reduce((s, p) => s + daysUntil(p.expectedCloseDate), 0) / pursuits.length)
      : 0;
    const proposalsInProgress = Object.keys(dealSections).filter(
      id => (dealSections[id] || []).some(s => s.content)
    ).length;
    return {
      dealsInPresales: pursuits.length,
      totalPipeline,
      avgDaysToClose: avgDays,
      proposalsInProgress,
    };
  }, [pursuits, dealSections]);

  /* ── Filtered deals for command tab ── */
  const filteredPursuits = useMemo(() => {
    if (!commandSearch) return pursuits;
    const q = commandSearch.toLowerCase();
    return pursuits.filter(p =>
      p.customerName.toLowerCase().includes(q) ||
      p.opportunityName.toLowerCase().includes(q) ||
      p.primaryOwner.toLowerCase().includes(q)
    );
  }, [pursuits, commandSearch]);

  /* ── Proposal readiness per deal ── */
  const getDealReadiness = useCallback((dealId: string) => {
    const ds = dealSections[dealId] || [];
    if (ds.length === 0) return { total: 0, drafted: 0, pct: 0 };
    const drafted = ds.filter(s => s.content).length;
    return { total: ds.length, drafted, pct: Math.round((drafted / ds.length) * 100) };
  }, [dealSections]);

  /* ── Apply pricing to deal ── */
  const applyPricingToDeal = useCallback(() => {
    if (!selectedDealId) return;
    // Auto-populate both TCV and Margin % from presales pricing
    updateOppMutation.mutate(
      { id: selectedDealId, tcv: Math.round(pricingCalcs.totalWithMargin), margin: pricingMargin } as any,
      { onSuccess: () => utils.opportunity.list.invalidate() }
    );
  }, [selectedDealId, pricingCalcs.totalWithMargin, pricingMargin, updateOppMutation, utils]);

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="max-w-[1600px] mx-auto space-y-4 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-[#7c3aed]" />
            Presales Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pipeline-integrated workspace for proposals, pricing, and solutioning
          </p>
        </div>

        {/* Presales flow tab bar */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40">
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
          <div className="w-px h-5 bg-border mx-1" />
          <Link href="/contracts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ClipboardList className="h-3.5 w-3.5" />
            Contracts
          </Link>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-[#7c3aed]" />
          <span className="ml-2 text-sm text-muted-foreground">Loading pipeline...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ═══════════════════════════════════════════════════════
             TAB 1: COMMAND
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'command' && (
            <div className="space-y-4">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Deals in Presales', value: commandKPIs.dealsInPresales.toString(), icon: Briefcase, color: '#7c3aed' },
                  { label: 'Total Pipeline Value', value: formatCurrency(commandKPIs.totalPipeline), icon: TrendingUp, color: '#3b82f6' },
                  { label: 'Avg Days to Close', value: `${commandKPIs.avgDaysToClose}d`, icon: Clock, color: '#f59e0b' },
                  { label: 'Proposals in Progress', value: commandKPIs.proposalsInProgress.toString(), icon: FileText, color: '#22c55e' },
                ].map(kpi => (
                  <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated">
                    <div className="flex items-center gap-2 mb-1">
                      <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                    </div>
                    <div className="text-xl font-display font-bold text-foreground">{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={commandSearch}
                    onChange={e => setCommandSearch(e.target.value)}
                    placeholder="Search deals..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {filteredPursuits.length} deal{filteredPursuits.length !== 1 ? 's' : ''} in active pipeline
                </span>
              </div>

              {/* Deal list */}
              {filteredPursuits.length === 0 ? (
                <div className="g-surface g-elevated p-12 text-center">
                  <Briefcase className="h-8 w-8 text-muted-foreground opacity-30 mx-auto mb-3" />
                  <div className="text-sm font-medium text-foreground mb-1">No presales deals found</div>
                  <div className="text-xs text-muted-foreground">
                    Active deals will appear here. Create a new opportunity to start a proposal.
                  </div>
                </div>
              ) : (
                <div className="g-surface g-elevated overflow-hidden rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Customer / Opportunity</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Stage</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground uppercase tracking-wider text-[10px]">TCV</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Owner</th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Close Date</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Days Left</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Proposal</th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Workshop</th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPursuits.map(deal => {
                        const days = daysUntil(deal.expectedCloseDate);
                        const readiness = getDealReadiness(deal.id);
                        const isSelected = deal.id === selectedDealId;
                        return (
                          <tr
                            key={deal.id}
                            className={`border-b border-border transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#7c3aed]/5' : 'hover:bg-card/50'
                            }`}
                            onClick={() => setSelectedDealId(deal.id)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] text-[10px] font-bold shrink-0">
                                  {deal.customerName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground">{deal.customerName}</div>
                                  <div className="text-[10px] text-muted-foreground">{deal.opportunityName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                deal.status === 'Proposal'
                                  ? 'bg-blue-500/10 text-blue-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${deal.status === 'Proposal' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                                {deal.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-foreground">
                              {formatCurrency(deal.tcv || 0)}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{deal.primaryOwner}</td>
                            <td className="px-3 py-3 text-muted-foreground">
                              {new Date(deal.expectedCloseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                days <= 7 ? 'bg-red-500/10 text-red-400' :
                                days <= 30 ? 'bg-amber-500/10 text-amber-400' :
                                'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {days}d
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {readiness.total > 0 ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-[#7c3aed] transition-all"
                                      style={{ width: `${readiness.pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{readiness.pct}%</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">--</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {(deal as any).workshopId ? (
                                <a href={`/workshop/${(deal as any).workshopId}`} onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-[#0A867F]/10 text-[#0A867F] hover:bg-[#0A867F]/20 transition-colors">
                                  <Sparkles className="h-2.5 w-2.5" /> Open
                                </a>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {/* Smart action: route based on deal stage */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const tab: PresalesTab = deal.status === 'Qualification' ? 'solutioning'
                                      : deal.status === 'Proposal' ? 'studio'
                                      : deal.status === 'Negotiation' ? 'pricing'
                                      : 'studio';
                                    handleSelectDeal(deal.id, tab);
                                  }}
                                  className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors flex items-center gap-1"
                                  title={`Go to ${deal.status === 'Qualification' ? 'Solutioning' : deal.status === 'Proposal' ? 'Studio' : 'Pricing'}`}
                                >
                                  <ArrowRight className="h-2.5 w-2.5" />
                                  {deal.status === 'Qualification' ? 'Scope' : deal.status === 'Proposal' ? 'Draft' : 'Price'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSelectDeal(deal.id, 'studio'); }}
                                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors"
                                  title="Open Studio"
                                >
                                  <Sparkles className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSelectDeal(deal.id, 'pricing'); }}
                                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                  title="View Pricing"
                                >
                                  <DollarSign className="h-3 w-3" />
                                </button>
                                <Link
                                  href="/contracts"
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  title="Create Contract"
                                >
                                  <ClipboardList className="h-3 w-3" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
             TAB 2: STUDIO (conversational proposal builder)
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'studio' && (
            <>
              {/* Deal selector */}
              <div className="flex items-center gap-3">
                <select
                  className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground min-w-[300px] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                  value={selectedDealId ?? ''}
                  onChange={e => {
                    if (e.target.value) handleSelectDeal(e.target.value);
                    else setSelectedDealId(null);
                  }}
                >
                  <option value="">Select a deal...</option>
                  {pursuits.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.customerName} -- {p.opportunityName} (${((p.tcv || 0) / 1000).toFixed(0)}k)
                    </option>
                  ))}
                </select>

                {selectedDeal && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                    <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
                    <span className="text-[10px] font-medium text-foreground">{selectedDeal.status}</span>
                    <span className="text-[10px] text-muted-foreground">{selectedDeal.industry}</span>
                    <span className="text-[10px] text-muted-foreground">&middot; {formatCurrency(selectedDeal.tcv || 0)}</span>
                  </div>
                )}
              </div>

              {/* No deal selected */}
              {!selectedDeal && (
                <div className="g-surface g-elevated p-16 text-center">
                  <Sparkles className="h-10 w-10 text-[#7c3aed] mx-auto mb-4 opacity-40" />
                  <div className="text-sm font-medium text-foreground mb-2">Select a deal to start building a proposal</div>
                  <div className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
                    Choose from your active pipeline deals to start or continue a proposal.
                    The AI will guide you through building a professional proposal through conversation.
                  </div>
                  {pursuits.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {pursuits.slice(0, 4).map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectDeal(p.id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg g-surface border border-border hover:border-[#7c3aed]/30 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-md bg-[#7c3aed]/10 flex items-center justify-center text-[#7c3aed] text-[10px] font-bold">
                            {p.customerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-medium text-foreground">{p.customerName}</div>
                            <div className="text-[10px] text-muted-foreground">${((p.tcv || 0) / 1000).toFixed(0)}k &middot; {p.status}</div>
                          </div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                  {pursuits.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      No active deals found. Create a new opportunity first.
                    </div>
                  )}
                </div>
              )}

              {/* Main Studio panels */}
              {selectedDeal && (
                <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>

                  {/* ──────────── LEFT: Conversation Panel (40%) ──────────── */}
                  <div className="w-[40%] shrink-0 flex flex-col g-surface g-elevated overflow-hidden">
                    {/* Chat header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                        </div>
                        <span className="text-xs font-semibold text-foreground">Proposal AI</span>
                        <span className="text-[10px] text-muted-foreground">for {selectedDeal.customerName}</span>
                      </div>
                      <button
                        onClick={() => initConversation(selectedDeal)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground border border-border hover:border-[#7c3aed]/20 transition-colors"
                        title="Reset conversation"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    </div>

                    {/* Chat messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                      {messages.map(msg => (
                        <div key={msg.id}>
                          {msg.role === 'system' && (
                            <div className="flex justify-center my-2">
                              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                                {msg.content}
                              </span>
                            </div>
                          )}
                          {msg.role === 'user' && (
                            <div className="flex justify-end">
                              <div className="max-w-[85%] flex items-start gap-2">
                                <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-[#7c3aed] text-white text-xs leading-relaxed">
                                  {msg.content}
                                </div>
                                <div className="w-6 h-6 rounded-full bg-[#7c3aed]/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <User className="h-3 w-3 text-[#7c3aed]" />
                                </div>
                              </div>
                            </div>
                          )}
                          {msg.role === 'assistant' && (
                            <div className="flex justify-start">
                              <div className="max-w-[90%] flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#7c3aed]/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                                </div>
                                <div className="space-y-2 flex-1 min-w-0">
                                  <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border text-xs text-foreground leading-relaxed">
                                    {msg.content.split('\n').map((line, li) => (
                                      <span key={li}>
                                        {line.split(/(\*\*.*?\*\*)/).map((part, pi) =>
                                          part.startsWith('**') && part.endsWith('**')
                                            ? <strong key={pi} className="font-semibold">{part.slice(2, -2)}</strong>
                                            : <span key={pi}>{part}</span>
                                        )}
                                        {li < msg.content.split('\n').length - 1 && <br />}
                                      </span>
                                    ))}
                                  </div>
                                  {msg.proposalContent && (
                                    <div className="rounded-xl border-l-[3px] border-l-[#7c3aed] bg-card border border-border overflow-hidden">
                                      <div className="px-3.5 py-2.5 border-b border-border bg-[#7c3aed]/5 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <FileText className="h-3 w-3 text-[#7c3aed]" />
                                          <span className="text-[10px] font-semibold text-foreground">{msg.proposalContent.title}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{wordCount(msg.proposalContent.content)} words</span>
                                      </div>
                                      <div className="px-3.5 py-2.5 text-[11px] text-muted-foreground leading-relaxed max-h-32 overflow-y-auto">
                                        {msg.proposalContent.content.slice(0, 300)}
                                        {msg.proposalContent.content.length > 300 && '...'}
                                      </div>
                                      <div className="px-3.5 py-2 border-t border-border">
                                        <button
                                          onClick={() => addSection(msg.proposalContent!.title, msg.proposalContent!.content)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] transition-colors"
                                        >
                                          <Plus className="h-3 w-3" />
                                          Add to Proposal
                                          <ArrowRight className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {msg.quickActions && msg.quickActions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {msg.quickActions.map(action => (
                                        <button
                                          key={action}
                                          onClick={() => sendMessage(action)}
                                          disabled={chatMutation.isPending}
                                          className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-border text-muted-foreground hover:text-[#7c3aed] hover:border-[#7c3aed]/30 hover:bg-[#7c3aed]/5 transition-colors disabled:opacity-40"
                                        >
                                          {action}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {chatMutation.isPending && (
                        <div className="flex justify-start">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#7c3aed]/10 flex items-center justify-center shrink-0">
                              <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                            </div>
                            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border">
                              <div className="flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin text-[#7c3aed]" />
                                <span className="text-[10px] text-muted-foreground">Thinking...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Quick prompts */}
                    <div className="px-4 py-2 border-t border-border flex gap-1.5 overflow-x-auto">
                      {quickPrompts.map(prompt => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt)}
                          disabled={chatMutation.isPending}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground hover:text-[#7c3aed] hover:bg-[#7c3aed]/5 transition-colors whitespace-nowrap disabled:opacity-40 shrink-0"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    {/* Input bar */}
                    <div className="px-4 py-3 border-t border-border bg-card/50">
                      <div className="flex items-end gap-2">
                        <textarea
                          ref={inputRef}
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Describe requirements, ask for a section draft, or refine content..."
                          rows={1}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30 max-h-24"
                          style={{ minHeight: '36px' }}
                        />
                        <button
                          onClick={() => sendMessage(inputValue)}
                          disabled={!inputValue.trim() || chatMutation.isPending}
                          className="w-9 h-9 rounded-xl bg-[#7c3aed] text-white flex items-center justify-center hover:bg-[#6d28d9] transition-colors disabled:opacity-40 shrink-0"
                        >
                          {chatMutation.isPending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Send className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ──────────── RIGHT: Live Proposal Document (60%) ──────────── */}
                  <div className="flex-1 flex flex-col g-surface g-elevated overflow-hidden">
                    {/* Proposal header */}
                    <div className="px-5 py-3 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#7c3aed]" />
                          <span className="text-xs font-semibold text-foreground">
                            {selectedDeal.customerName} Proposal
                          </span>
                          {sections.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {sections.length} sections &middot; {totalWords.toLocaleString()} words &middot; ~{totalPages} {totalPages === 1 ? 'page' : 'pages'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {sections.length > 0 && (
                            <>
                              <span className="text-[10px] text-muted-foreground">
                                {approvedCount}/{sections.length} approved
                              </span>
                              <button
                                onClick={exportPDF}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <FileText className="h-3 w-3" /> PDF
                              </button>
                              <button
                                onClick={exportDOCX}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Download className="h-3 w-3" /> DOCX
                              </button>
                              <button
                                onClick={exportMarkdown}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copiedMarkdown ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                {copiedMarkdown ? 'Copied!' : 'Markdown'}
                              </button>
                              <button
                                onClick={handleCopyAll}
                                disabled={sections.length === 0}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                              >
                                {copiedAll ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                {copiedAll ? 'Copied!' : 'Copy All'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Template selector */}
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                        <select
                          className="flex-1 px-2 py-1.5 text-[10px] bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                          value={selectedTemplateId ?? ''}
                          onChange={e => {
                            const tmpl = PROPOSAL_TEMPLATES.find(t => t.id === e.target.value);
                            if (tmpl) loadTemplate(tmpl);
                          }}
                        >
                          <option value="">Load template ({PROPOSAL_TEMPLATES.length}+ templates)...</option>
                          {Object.entries(templatesByDomain).map(([domain, templates]) => (
                            <optgroup key={domain} label={domain}>
                              {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.complexity})</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        {selectedTemplate && (
                          <button
                            onClick={() => setShowTemplateInfo(!showTemplateInfo)}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium border transition-colors ${
                              showTemplateInfo
                                ? 'border-[#7c3aed]/20 bg-[#7c3aed]/5 text-[#7c3aed]'
                                : 'border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Info className="h-3 w-3" /> Template Info
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Template info panel (collapsible) */}
                    {showTemplateInfo && selectedTemplate && (
                      <div className="px-5 py-3 border-b border-border bg-[#7c3aed]/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">
                            {selectedTemplate.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {selectedTemplate.tcvRange} &middot; {selectedTemplate.durationRange}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-[10px]">
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Users className="h-3 w-3" /> Typical Team
                            </div>
                            <div className="space-y-0.5">
                              {selectedTemplate.typicalTeam.map(t => (
                                <div key={t.role} className="text-foreground">
                                  {t.count}x {t.role} <span className="text-muted-foreground">({t.geo})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Package className="h-3 w-3" /> Deliverables
                            </div>
                            <div className="space-y-0.5">
                              {selectedTemplate.deliverables.slice(0, 5).map(d => (
                                <div key={d} className="text-foreground">{d}</div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <AlertTriangle className="h-3 w-3" /> Risks
                            </div>
                            <div className="space-y-0.5">
                              {selectedTemplate.risks.slice(0, 4).map(r => (
                                <div key={r} className="text-foreground">{r}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pending insert dialog (Replace/Append) */}
                    {pendingInsert && (
                      <div className="px-5 py-3 border-b border-border bg-amber-500/5 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs font-medium text-foreground">
                            &ldquo;{pendingInsert.title}&rdquo; already has content
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePendingReplace}
                            className="px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] transition-colors"
                          >
                            Replace
                          </button>
                          <button
                            onClick={handlePendingAppend}
                            className="px-3 py-1.5 rounded-lg border border-[#7c3aed]/30 text-[#7c3aed] text-[10px] font-medium hover:bg-[#7c3aed]/5 transition-colors"
                          >
                            Append
                          </button>
                          <button
                            onClick={() => setPendingInsert(null)}
                            className="px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Proposal body */}
                    <div ref={proposalBodyRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                      {sections.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <FileText className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
                          <div className="text-sm font-medium text-foreground mb-1">Proposal will build here</div>
                          <div className="text-xs text-muted-foreground max-w-sm">
                            Start a conversation on the left. As the AI drafts content, click &quot;Add to Proposal&quot; to build up your document. Or load a template to get started with a structure.
                          </div>
                        </div>
                      )}

                      {sections.map((section, idx) => {
                        const statusInfo = STATUS_STYLE[section.status];
                        const isEditing = editingSectionId === section.id;
                        const viewMode = sectionViewMode[section.id] || 'full';
                        const isBrief = viewMode === 'brief';

                        return (
                          <div
                            key={section.id}
                            ref={el => { sectionRefs.current[section.id] = el; }}
                            className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-[#7c3aed]/20"
                          >
                            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-secondary/30">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-mono w-5">{idx + 1}.</span>
                                <span className="text-xs font-semibold text-foreground">{section.title}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                                  {statusInfo.label}
                                </span>
                                {/* Execution model + effort */}
                                <select value={section.executionModel || ''} onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, executionModel: e.target.value } : s))}
                                  className="px-1.5 py-0.5 text-[9px] bg-transparent border border-border rounded text-muted-foreground">
                                  <option value="">Delivery model</option>
                                  <option value="pod_squad">Pod Squad</option>
                                  <option value="managed_capacity">Managed Capacity</option>
                                  <option value="outcome_based">Outcome-Based</option>
                                  <option value="ai_stream">AI-Powered</option>
                                  <option value="hybrid">Hybrid</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1">
                                {section.content && !isEditing && (
                                  <>
                                    <button
                                      onClick={() => toggleSectionView(section.id)}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                      title={isBrief ? 'Show full content' : 'Show brief'}
                                    >
                                      {isBrief ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                    </button>
                                    <button
                                      onClick={() => moveSection(section.id, 'up')}
                                      disabled={idx === 0}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20"
                                      title="Move up"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => moveSection(section.id, 'down')}
                                      disabled={idx === sections.length - 1}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-20"
                                      title="Move down"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => startEditSection(section.id)}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    {section.status !== 'approved' && (
                                      <button
                                        onClick={() => approveSection(section.id)}
                                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                        title="Approve"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                                <button
                                  onClick={() => removeSection(section.id)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Remove"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="px-4 py-3">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editBuffer}
                                    onChange={e => setEditBuffer(e.target.value)}
                                    className="w-full h-48 px-3 py-2.5 rounded-lg bg-secondary border border-[#7c3aed]/20 text-xs text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={saveEditSection}
                                      className="px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => { setEditingSectionId(null); setEditBuffer(''); }}
                                      className="px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <span className="text-[10px] text-muted-foreground ml-auto">
                                      {wordCount(editBuffer)} words
                                    </span>
                                  </div>
                                </div>
                              ) : section.content ? (
                                <div>
                                  <div
                                    className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap cursor-pointer"
                                    onClick={() => startEditSection(section.id)}
                                    title="Click to edit"
                                  >
                                    {isBrief ? getBriefContent(section.content) : section.content}
                                  </div>
                                  {isBrief && section.content.length > getBriefContent(section.content).length && (
                                    <button
                                      onClick={() => toggleSectionView(section.id)}
                                      className="text-[10px] text-[#7c3aed] hover:underline mt-1"
                                    >
                                      Show full content
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-between py-4">
                                  <span className="text-[10px] text-muted-foreground italic">No content yet</span>
                                  <button
                                    onClick={() => sendMessage(`Draft the "${section.title}" section`)}
                                    disabled={chatMutation.isPending}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors disabled:opacity-40"
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    Ask AI to draft
                                  </button>
                                </div>
                              )}
                            </div>

                            {section.content && !isEditing && (
                              <div className="px-4 py-1.5 border-t border-border bg-secondary/20 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground">
                                  {wordCount(section.content)} words
                                </span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(section.content)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Copy section
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Proposal footer stats */}
                    {sections.length > 0 && (
                      <div className="px-5 py-2.5 border-t border-border flex items-center justify-between bg-card/50">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-muted-foreground">{sections.length} sections</span>
                          <span className="text-[10px] text-muted-foreground">{totalWords.toLocaleString()} words</span>
                          <span className="text-[10px] text-muted-foreground">~{totalPages} {totalPages === 1 ? 'page' : 'pages'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            {Object.entries(STATUS_STYLE).map(([status, info]) => {
                              const count = sections.filter(s => s.status === status).length;
                              if (count === 0) return null;
                              return (
                                <span key={status} className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${info.bg} ${info.text}`}>
                                  {count} {info.label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
             TAB 3: PRICING
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'pricing' && (
            <div className="space-y-4">
              {/* Deal context bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground min-w-[300px] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                  value={selectedDealId ?? ''}
                  onChange={e => {
                    if (e.target.value) setSelectedDealId(e.target.value);
                    else setSelectedDealId(null);
                  }}
                >
                  <option value="">Select a deal for pricing...</option>
                  {pursuits.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.customerName} -- {p.opportunityName} ({formatCurrency(p.tcv || 0)})
                    </option>
                  ))}
                </select>

                {selectedDeal && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                    <Building2 className="h-3 w-3 text-[#7c3aed]" />
                    <span className="text-[10px] font-medium text-foreground">{selectedDeal.customerName}</span>
                    <span className="text-[10px] text-muted-foreground">Current TCV: {formatCurrency(selectedDeal.tcv || 0)}</span>
                  </div>
                )}

                <Link
                  href="/pricing"
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Full Pricing Engine <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Config row */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="g-surface g-elevated p-3 rounded-xl">
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Duration (months)</label>
                  <input
                    type="number" value={pricingDuration}
                    onChange={e => setPricingDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                    min={1} max={60}
                  />
                </div>
                <div className="g-surface g-elevated p-3 rounded-xl">
                  <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Margin %</label>
                  <input
                    type="number" value={pricingMargin}
                    onChange={e => setPricingMargin(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                    min={0} max={80}
                  />
                </div>
                <div className="g-surface g-elevated p-3 rounded-xl flex items-end">
                  {selectedDeal && (
                    <button
                      onClick={applyPricingToDeal}
                      disabled={updateOppMutation.isPending}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {updateOppMutation.isPending ? 'Applying...' : `Apply to Deal (${formatCurrency(pricingCalcs.totalWithMargin)})`}
                    </button>
                  )}
                  {!selectedDeal && (
                    <div className="w-full text-center text-[10px] text-muted-foreground py-2">
                      Select a deal to apply pricing
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Contract Value', value: formatCurrency(pricingCalcs.totalWithMargin), icon: DollarSign, color: '#7c3aed' },
                  { label: 'Monthly Run Rate', value: formatCurrency(pricingCalcs.totalMonthlyCost), icon: Calculator, color: '#3b82f6' },
                  { label: 'Blended Rate', value: `$${pricingCalcs.blendedRate.toFixed(0)}/hr`, icon: Percent, color: '#22c55e' },
                  { label: 'Total Headcount', value: `${pricingCalcs.totalHeadcount}`, icon: Users, color: '#f59e0b' },
                ].map(kpi => (
                  <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated">
                    <div className="flex items-center gap-2 mb-1">
                      <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                    </div>
                    <div className="text-xl font-display font-bold text-foreground">{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Team composition table */}
              <div className="g-surface g-elevated overflow-hidden rounded-xl">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <span className="text-sm font-semibold text-foreground font-display">Team Composition</span>
                  <button
                    onClick={() => setPricingLineItems(prev => [...prev, {
                      id: String(Date.now()), role: 'Sr Full Stack Engineer', count: 1, geo: 'india', baseRate: 95, hoursPerMonth: 160,
                    }])}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Role
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Count</th>
                      <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Geo</th>
                      <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Base Rate</th>
                      <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Effective</th>
                      <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Monthly</th>
                      <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingCalcs.lines.map(line => (
                      <tr key={line.id} className="border-b border-border hover:bg-card/50">
                        <td className="px-4 py-2">
                          <select
                            value={line.role}
                            onChange={e => {
                              const roleData = ROLES.find(r => r.role === e.target.value);
                              setPricingLineItems(prev => prev.map(l =>
                                l.id === line.id ? { ...l, role: e.target.value, baseRate: roleData?.baseRate || l.baseRate } : l
                              ));
                            }}
                            className="px-2 py-1 text-xs bg-transparent border border-border rounded text-foreground"
                          >
                            {ROLES.map(r => <option key={r.role} value={r.role}>{r.role}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number" value={line.count}
                            onChange={e => setPricingLineItems(prev => prev.map(l => l.id === line.id ? { ...l, count: Number(e.target.value) } : l))}
                            className="w-14 px-2 py-1 text-xs text-center bg-transparent border border-border rounded text-foreground"
                            min={1}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={line.geo}
                            onChange={e => setPricingLineItems(prev => prev.map(l => l.id === line.id ? { ...l, geo: e.target.value } : l))}
                            className="px-2 py-1 text-xs bg-transparent border border-border rounded text-foreground"
                          >
                            {Object.entries(GEO_RATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">${line.baseRate}/hr</td>
                        <td className="px-3 py-2 text-right font-medium text-foreground">${line.effectiveRate.toFixed(0)}/hr</td>
                        <td className="px-3 py-2 text-right text-foreground">{formatCurrency(line.monthlyTotal)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(line.totalCost)}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setPricingLineItems(prev => prev.filter(l => l.id !== line.id))}
                            className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-foreground">Subtotal (Cost)</td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold text-foreground">{formatCurrency(pricingCalcs.totalMonthlyCost)}/mo</td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold text-foreground">{formatCurrency(pricingCalcs.totalCost)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-4 py-1.5 text-xs text-muted-foreground">Margin ({pricingMargin}%)</td>
                      <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{formatCurrency(pricingCalcs.marginAmount / pricingDuration)}/mo</td>
                      <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{formatCurrency(pricingCalcs.marginAmount)}</td>
                      <td></td>
                    </tr>
                    <tr className="border-t-2 border-[#7c3aed]/20">
                      <td colSpan={5} className="px-4 py-3 text-sm font-bold text-foreground font-display">Total Contract Value</td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-foreground">{formatCurrency(pricingCalcs.totalWithMargin / pricingDuration)}/mo</td>
                      <td className="px-3 py-3 text-right text-lg font-bold text-[#7c3aed] font-display">{formatCurrency(pricingCalcs.totalWithMargin)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pricing export row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const rows = [
                      ['Role', 'Count', 'Geo', 'Base Rate', 'Effective Rate', 'Monthly', 'Total'],
                      ...pricingCalcs.lines.map(l => [l.role, l.count, GEO_RATES[l.geo]?.label || l.geo, `$${l.baseRate}`, `$${l.effectiveRate.toFixed(0)}`, `$${l.monthlyTotal.toFixed(0)}`, `$${l.totalCost.toFixed(0)}`]),
                      [],
                      ['Subtotal', '', '', '', '', `$${pricingCalcs.totalMonthlyCost.toFixed(0)}`, `$${pricingCalcs.totalCost.toFixed(0)}`],
                      [`Margin (${pricingMargin}%)`, '', '', '', '', '', `$${pricingCalcs.marginAmount.toFixed(0)}`],
                      ['Total Contract Value', '', '', '', '', '', `$${pricingCalcs.totalWithMargin.toFixed(0)}`],
                    ];
                    const csv = rows.map(r => (r as any[]).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `pricing-${selectedDeal?.customerName || 'estimate'}.csv`; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs text-foreground hover:bg-secondary transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
             TAB 4: SOLUTIONING
             ═══════════════════════════════════════════════════════ */}
          {activeTab === 'solutioning' && (
            <div className="space-y-4">
              {/* Deal context bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground min-w-[300px] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                  value={selectedDealId ?? ''}
                  onChange={e => {
                    if (e.target.value) setSelectedDealId(e.target.value);
                    else setSelectedDealId(null);
                  }}
                >
                  <option value="">Select a deal for solutioning...</option>
                  {pursuits.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.customerName} -- {p.opportunityName} ({formatCurrency(p.tcv || 0)})
                    </option>
                  ))}
                </select>

                {selectedDeal && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                    <Building2 className="h-3 w-3 text-[#7c3aed]" />
                    <span className="text-[10px] font-medium text-foreground">{selectedDeal.customerName}</span>
                    <span className="text-[10px] text-muted-foreground">{selectedDeal.industry} &middot; {selectedDeal.region}</span>
                  </div>
                )}
              </div>

              {!selectedDeal && (
                <div className="g-surface g-elevated p-12 text-center">
                  <Cpu className="h-8 w-8 text-muted-foreground opacity-30 mx-auto mb-3" />
                  <div className="text-sm font-medium text-foreground mb-1">Select a deal for solutioning</div>
                  <div className="text-xs text-muted-foreground">
                    Effort estimation, SA assignment, and technical requirements will appear here.
                  </div>
                </div>
              )}

              {selectedDeal && (
                <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Effort Estimator */}
                  <div className="g-surface g-elevated rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-[#7c3aed]" />
                        <span className="text-sm font-semibold text-foreground font-display">Effort Estimator</span>
                      </div>
                      <div className="text-xs font-medium text-[#7c3aed]">
                        Total: {formatCurrency(effortTotal)}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                            <th className="pb-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Weeks</th>
                            <th className="pb-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rate/hr</th>
                            <th className="pb-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cost</th>
                            <th className="pb-2 w-6"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {solutionRoles.map(sr => (
                            <tr key={sr.id} className="border-b border-border">
                              <td className="py-2">
                                <input
                                  type="text" value={sr.role}
                                  onChange={e => setSolutionRoles(prev => prev.map(r => r.id === sr.id ? { ...r, role: e.target.value } : r))}
                                  className="w-full px-2 py-1 text-xs bg-transparent border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                                />
                              </td>
                              <td className="py-2 text-center">
                                <input
                                  type="number" value={sr.weeks}
                                  onChange={e => setSolutionRoles(prev => prev.map(r => r.id === sr.id ? { ...r, weeks: Number(e.target.value) } : r))}
                                  className="w-14 px-2 py-1 text-xs text-center bg-transparent border border-border rounded text-foreground"
                                  min={1}
                                />
                              </td>
                              <td className="py-2 text-right">
                                <input
                                  type="number" value={sr.rate}
                                  onChange={e => setSolutionRoles(prev => prev.map(r => r.id === sr.id ? { ...r, rate: Number(e.target.value) } : r))}
                                  className="w-16 px-2 py-1 text-xs text-right bg-transparent border border-border rounded text-foreground"
                                  min={0}
                                />
                              </td>
                              <td className="py-2 text-right font-medium text-foreground">
                                {formatCurrency(sr.weeks * sr.rate * 40)}
                              </td>
                              <td className="py-2">
                                <button
                                  onClick={() => setSolutionRoles(prev => prev.filter(r => r.id !== sr.id))}
                                  className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button
                        onClick={() => setSolutionRoles(prev => [...prev, { id: uid(), role: 'New Role', weeks: 4, rate: 95 }])}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add Role
                      </button>
                      {scopeItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">Scope Builder: {scopeItems.length} items across {new Set(scopeItems.map(i => i.workstream)).size} workstreams</span>
                            <span className="font-medium text-[#7c3aed]">{scopeItems.reduce((s, i) => s + i.effort, 0)} effort pts</span>
                          </div>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {['P1', 'P2', 'P3'].map(p => {
                              const ct = scopeItems.filter(i => i.phase === p).length;
                              return ct > 0 ? (
                                <span key={p} className={`text-[9px] px-1.5 py-0.5 rounded-full ${p === 'P1' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : p === 'P2' ? 'bg-blue-500/10 text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                                  {p}: {ct}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SA Assignment */}
                  <div className="g-surface g-elevated rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#7c3aed]" />
                      <span className="text-sm font-semibold text-foreground font-display">SA Assignment</span>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Assigned Solution Architect</label>
                        <input
                          type="text" value={saAssignment}
                          onChange={e => setSaAssignment(e.target.value)}
                          placeholder="Enter SA name..."
                          className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Deal Presales POCs</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedDeal.presalesPOCs || []).length > 0 ? (
                            selectedDeal.presalesPOCs.map(poc => (
                              <span key={poc} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-medium">
                                <User className="h-3 w-3" /> {poc}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No presales POCs assigned</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Customer Stakeholders</label>
                        <div className="space-y-1">
                          {(selectedDeal.customerStakeholders || []).map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-[10px]">
                              <div className={`w-1.5 h-1.5 rounded-full ${s.isDecisionMaker ? 'bg-[#7c3aed]' : 'bg-muted-foreground'}`} />
                              <span className="text-foreground font-medium">{s.name}</span>
                              <span className="text-muted-foreground">{s.title}</span>
                              {s.isDecisionMaker && <span className="text-[9px] text-[#7c3aed] font-medium">DM</span>}
                            </div>
                          ))}
                          {(selectedDeal.customerStakeholders || []).length === 0 && (
                            <span className="text-[10px] text-muted-foreground">No stakeholders recorded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technical Requirements Checklist */}
                  <div className="g-surface g-elevated rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#7c3aed]" />
                        <span className="text-sm font-semibold text-foreground font-display">Technical Requirements</span>
                      </div>
                      {techRequirements.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {techRequirements.filter(r => r.done).length}/{techRequirements.length} complete
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      {techRequirements.map(req => (
                        <div
                          key={req.id}
                          className="flex items-center gap-2 group"
                        >
                          <button
                            onClick={() => setTechRequirements(prev => prev.map(r =>
                              r.id === req.id ? { ...r, done: !r.done } : r
                            ))}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              req.done
                                ? 'bg-[#7c3aed] border-[#7c3aed] text-white'
                                : 'border-border hover:border-[#7c3aed]/30'
                            }`}
                          >
                            {req.done && <Check className="h-2.5 w-2.5" />}
                          </button>
                          <span className={`text-xs flex-1 ${req.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {req.text}
                          </span>
                          <button
                            onClick={() => setTechRequirements(prev => prev.filter(r => r.id !== req.id))}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text" value={newReqText}
                          onChange={e => setNewReqText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newReqText.trim()) {
                              setTechRequirements(prev => [...prev, { id: uid(), text: newReqText.trim(), done: false }]);
                              setNewReqText('');
                            }
                          }}
                          placeholder="Add requirement (Enter to add)..."
                          className="flex-1 px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                        />
                        <button
                          onClick={() => {
                            if (newReqText.trim()) {
                              setTechRequirements(prev => [...prev, { id: uid(), text: newReqText.trim(), done: false }]);
                              setNewReqText('');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] text-xs hover:bg-[#7c3aed]/20 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Architecture Notes */}
                  <div className="g-surface g-elevated rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#7c3aed]" />
                      <span className="text-sm font-semibold text-foreground font-display">Architecture Notes</span>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={archNotes}
                        onChange={e => setArchNotes(e.target.value)}
                        placeholder={`Architecture decisions, technology stack, integration points for ${selectedDeal.customerName}...`}
                        rows={10}
                        className="w-full px-3 py-2.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {wordCount(archNotes)} words
                        </span>
                        <button
                          onClick={() => {
                            if (archNotes.trim()) {
                              navigator.clipboard.writeText(archNotes);
                            }
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Copy notes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════
                   SCOPE BUILDER (full-width below the grid)
                   ═══════════════════════════════════════════════════════ */}
                <div className="g-surface g-elevated rounded-xl overflow-hidden mt-4">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-[#7c3aed]" />
                      <span className="text-sm font-semibold text-foreground font-display">Scope Builder</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] font-medium">
                        {scopeItems.length} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {scopeItems.length > 0 && (
                        <>
                        <span className="text-[10px] font-medium text-[#7c3aed]">
                          Total: {scopeItems.reduce((s, i) => s + i.effort, 0)} pts
                        </span>
                        <button
                          onClick={() => {
                            // Group scope items by workstream and create proposal sections
                            const grouped: Record<string, PresalesScopeItem[]> = {};
                            scopeItems.forEach(item => {
                              if (!grouped[item.workstream]) grouped[item.workstream] = [];
                              grouped[item.workstream].push(item);
                            });
                            const newSections: ProposalSection[] = Object.entries(grouped).map(([ws, items], idx) => {
                              const model = EXECUTION_MODELS.find(m => m.id === items[0].executionModel);
                              const totalEffort = items.reduce((s, i) => s + i.effort, 0);
                              const content = `## ${ws}\n\n**Delivery Model:** ${model?.name || 'TBD'}\n**Total Effort:** ${totalEffort} points\n\n### Scope Items\n${items.map((it, i) => `${i + 1}. **${it.title}** (${it.phase}, ${it.effort} pts)\n   ${it.description}`).join('\n')}`;
                              return {
                                id: uid(),
                                title: ws,
                                content,
                                status: 'ai-draft' as SectionStatus,
                                order: idx,
                                executionModel: items[0].executionModel,
                                effort: totalEffort,
                                phase: items[0].phase,
                              };
                            });
                            setSections(prev => [...prev, ...newSections]);
                            setActiveTab('studio');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#7c3aed]/30 text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors"
                        >
                          <ArrowRight className="h-3 w-3" /> Push to Studio
                        </button>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          if (!selectedDeal || generatingScope) return;
                          setGeneratingScope(true);
                          try {
                            const result = await chatMutation.mutateAsync({
                              message: `Generate scope items for this deal as a JSON array. Each item: {"title":"...","description":"...","workstream":"...","executionModel":"pod_squad|managed_capacity|outcome_based|ai_stream|hybrid","effort":1-10,"phase":"P1|P2|P3","owner":""}. Workstreams: ${DEFAULT_WORKSTREAMS.join(', ')}. Deal: ${selectedDeal.customerName} - ${selectedDeal.opportunityName}. Service: ${selectedDeal.serviceLine || 'General'}. Requirements: ${techRequirements.map(r => r.text).join('; ') || 'None listed'}. Architecture notes: ${archNotes || 'None'}. Return ONLY a JSON array of 6-10 scope items.`,
                              context: { page: 'workshop-create', opportunityId: selectedDeal.id },
                            });
                            const cleaned = (result.response || '').replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
                            const match = cleaned.match(/\[[\s\S]*\]/);
                            if (match) {
                              const items = JSON.parse(match[0]);
                              const newItems: PresalesScopeItem[] = items.map((item: any) => ({
                                id: uid(),
                                title: item.title || 'Untitled',
                                description: item.description || '',
                                workstream: DEFAULT_WORKSTREAMS.includes(item.workstream) ? item.workstream : 'Development & Build',
                                executionModel: item.executionModel || 'pod_squad',
                                effort: Math.min(10, Math.max(1, item.effort || 3)),
                                phase: ['P1', 'P2', 'P3'].includes(item.phase) ? item.phase : 'P1',
                                owner: item.owner || '',
                                aiGenerated: true,
                              }));
                              setScopeItems(prev => [...prev, ...newItems]);
                            }
                          } catch { /* ignore */ }
                          setGeneratingScope(false);
                        }}
                        disabled={generatingScope}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
                      >
                        {generatingScope ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        AI Generate Scope
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    {DEFAULT_WORKSTREAMS.map(ws => {
                      const wsItems = scopeItems.filter(i => i.workstream === ws);
                      if (wsItems.length === 0 && expandedWorkstream !== ws) return null;
                      const isExpanded = expandedWorkstream === ws;
                      const wsEffort = wsItems.reduce((s, i) => s + i.effort, 0);
                      const wsModel = wsItems.length > 0 ? EXECUTION_MODELS.find(m => m.id === wsItems[0].executionModel) : null;

                      return (
                        <div key={ws} className="border border-border rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedWorkstream(isExpanded ? null : ws)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wsModel?.color || '#9DB0C6' }} />
                              <span className="text-xs font-medium text-foreground">{ws}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{wsItems.length}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-medium text-muted-foreground">{wsEffort} pts</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border">
                              {wsItems.map(item => (
                                <div key={item.id} className="px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors group">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-foreground">{item.title}</span>
                                        {item.aiGenerated && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">AI</span>
                                        )}
                                      </div>
                                      {item.description && (
                                        <p className="text-[10px] text-muted-foreground line-clamp-2">{item.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <select
                                        value={item.executionModel}
                                        onChange={e => setScopeItems(prev => prev.map(i => i.id === item.id ? { ...i, executionModel: e.target.value } : i))}
                                        className="text-[10px] px-2 py-1 bg-transparent border border-border rounded text-foreground focus:outline-none"
                                      >
                                        {EXECUTION_MODELS.map(m => (
                                          <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                      </select>
                                      <select
                                        value={item.phase}
                                        onChange={e => setScopeItems(prev => prev.map(i => i.id === item.id ? { ...i, phase: e.target.value } : i))}
                                        className="text-[10px] px-2 py-1 bg-transparent border border-border rounded text-foreground focus:outline-none w-14"
                                      >
                                        <option value="P1">P1</option>
                                        <option value="P2">P2</option>
                                        <option value="P3">P3</option>
                                      </select>
                                      <input
                                        type="number" value={item.effort} min={1} max={10}
                                        onChange={e => setScopeItems(prev => prev.map(i => i.id === item.id ? { ...i, effort: Number(e.target.value) } : i))}
                                        className="w-12 text-[10px] px-2 py-1 text-center bg-transparent border border-border rounded text-foreground"
                                      />
                                      <button
                                        onClick={() => setScopeItems(prev => prev.filter(i => i.id !== item.id))}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-all"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Add scope item inline */}
                              {showScopeAdd === ws ? (
                                <div className="px-4 py-3 border-t border-border bg-muted/10 space-y-2">
                                  <input
                                    type="text" value={scopeForm.title}
                                    onChange={e => setScopeForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Scope item title..."
                                    className="w-full px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                                  />
                                  <textarea
                                    value={scopeForm.description}
                                    onChange={e => setScopeForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Description..."
                                    rows={2}
                                    className="w-full px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed]/30"
                                  />
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={scopeForm.executionModel}
                                      onChange={e => setScopeForm(f => ({ ...f, executionModel: e.target.value }))}
                                      className="text-[10px] px-2 py-1.5 bg-card border border-border rounded text-foreground"
                                    >
                                      {EXECUTION_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <select
                                      value={scopeForm.phase}
                                      onChange={e => setScopeForm(f => ({ ...f, phase: e.target.value }))}
                                      className="text-[10px] px-2 py-1.5 bg-card border border-border rounded text-foreground w-14"
                                    >
                                      <option value="P1">P1</option>
                                      <option value="P2">P2</option>
                                      <option value="P3">P3</option>
                                    </select>
                                    <input
                                      type="number" value={scopeForm.effort} min={1} max={10}
                                      onChange={e => setScopeForm(f => ({ ...f, effort: Number(e.target.value) }))}
                                      className="w-12 text-[10px] px-2 py-1.5 text-center bg-card border border-border rounded text-foreground"
                                    />
                                    <button
                                      onClick={() => {
                                        if (scopeForm.title.trim()) {
                                          setScopeItems(prev => [...prev, {
                                            id: uid(),
                                            title: scopeForm.title.trim(),
                                            description: scopeForm.description.trim(),
                                            workstream: ws,
                                            executionModel: scopeForm.executionModel,
                                            effort: scopeForm.effort,
                                            phase: scopeForm.phase,
                                            owner: scopeForm.owner,
                                            aiGenerated: false,
                                          }]);
                                          setScopeForm({ title: '', description: '', effort: 3, phase: 'P1', owner: '', executionModel: 'pod_squad' });
                                          setShowScopeAdd(null);
                                        }
                                      }}
                                      className="px-3 py-1.5 text-[10px] rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => setShowScopeAdd(null)}
                                      className="px-3 py-1.5 text-[10px] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowScopeAdd(ws)}
                                  className="w-full flex items-center gap-1.5 px-4 py-2 text-[10px] text-[#7c3aed] hover:bg-[#7c3aed]/5 transition-colors"
                                >
                                  <Plus className="h-3 w-3" /> Add scope item
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Empty state / Add to any workstream */}
                    {scopeItems.length === 0 && (
                      <div className="text-center py-8">
                        <Target className="h-6 w-6 text-muted-foreground opacity-30 mx-auto mb-2" />
                        <div className="text-xs text-muted-foreground mb-3">No scope items yet</div>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {DEFAULT_WORKSTREAMS.slice(0, 4).map(ws => (
                            <button
                              key={ws}
                              onClick={() => { setExpandedWorkstream(ws); setShowScopeAdd(ws); }}
                              className="text-[10px] px-2.5 py-1 rounded-full border border-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#7c3aed]/5 transition-colors"
                            >
                              + {ws}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scope Summary */}
                    {scopeItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          {['P1', 'P2', 'P3'].map(phase => {
                            const phaseItems = scopeItems.filter(i => i.phase === phase);
                            return phaseItems.length > 0 ? (
                              <div key={phase} className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-mono font-bold ${phase === 'P1' ? 'text-[#7c3aed]' : phase === 'P2' ? 'text-[#3b82f6]' : 'text-muted-foreground'}`}>{phase}</span>
                                <span className="text-[10px] text-muted-foreground">{phaseItems.length} items, {phaseItems.reduce((s, i) => s + i.effort, 0)} pts</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          {EXECUTION_MODELS.map(m => {
                            const count = scopeItems.filter(i => i.executionModel === m.id).length;
                            return count > 0 ? (
                              <span key={m.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                {m.name}: {count}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═════ WORKSHOPS TAB ═════ */}
      {activeTab === 'workshops' && (
        <WorkshopsTabComponent />
      )}
    </div>
  );
}

// WorkshopsTab extracted to src/components/workshop/WorkshopsTab.tsx
