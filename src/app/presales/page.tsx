'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { Opportunity } from '@/lib/types';
import {
  PROPOSAL_TEMPLATES,
  SERVICE_DOMAINS,
} from '@/lib/presales/proposal-templates';
import type { ProposalTemplate } from '@/lib/presales/proposal-templates';
import {
  Sparkles, Loader2, Send, FileText, Copy, Check,
  ChevronDown, ChevronUp, Pencil, Trash2, Plus,
  User, Bot, ArrowRight, RotateCcw, BookOpen,
  Users, Clock, AlertTriangle, Package, Info,
  Download, Eye, EyeOff
} from 'lucide-react';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

/* ─── Types ─── */
type SectionStatus = 'ai-draft' | 'edited' | 'approved';

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  status: SectionStatus;
  order: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  proposalContent?: { title: string; content: string } | null;
  quickActions?: string[];
}

/* ─── Helpers ─── */
let msgCounter = 0;
function uid() { return `msg-${++msgCounter}-${Date.now()}`; }

function wordCount(text: string) { return text.split(/\s+/).filter(Boolean).length; }
function pageEstimate(words: number) { return Math.max(1, Math.ceil(words / 300)); }

const STATUS_STYLE: Record<SectionStatus, { label: string; bg: string; text: string }> = {
  'ai-draft': { label: 'AI Draft', bg: 'bg-[#7c3aed]/10', text: 'text-[#7c3aed]' },
  'edited':   { label: 'Edited',   bg: 'bg-amber-500/10',  text: 'text-amber-400' },
  'approved': { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
};

/* ─── Main Component ─── */
export default function PresalesPage() {
  /* ── Deal data ── */
  const { data: allOpportunities = [], isLoading } = trpc.opportunity.list.useQuery();
  const chatMutation = trpc.ai.chat.useMutation();

  const pursuits = useMemo(() =>
    (allOpportunities as Opportunity[]).filter(
      o => o.status === 'Proposal' || o.status === 'Negotiation'
    ), [allOpportunities]
  );

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const selectedDeal = useMemo(() =>
    pursuits.find(o => o.id === selectedDealId) ?? null,
    [pursuits, selectedDealId]
  );

  /* ── Template ── */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = useMemo(() =>
    PROPOSAL_TEMPLATES.find(t => t.id === selectedTemplateId) ?? null,
    [selectedTemplateId]
  );

  /* ── Proposal sections ── */
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);

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

  /* ── Copied markdown state ── */
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── When deal changes, reset conversation ── */
  const initConversation = useCallback((deal: Opportunity) => {
    const greeting: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: `I'll help you build a proposal for **${deal.customerName}**.\n\nHere's what I know so far:\n- **Opportunity:** ${deal.opportunityName}\n- **TCV:** $${(deal.tcv || 0).toLocaleString()}\n- **Industry:** ${deal.industry}\n- **Duration:** ${deal.dealDuration}\n\nLet me start by understanding the requirements. **What is the primary business challenge ${deal.customerName} is trying to solve?**`,
      timestamp: new Date(),
      quickActions: ['Draft executive summary', 'Load a template first', 'Generate full proposal'],
    };
    setMessages([greeting]);
    setSections([]);
    setSelectedTemplateId(null);
    setShowTemplateInfo(false);
  }, []);

  const handleSelectDeal = useCallback((dealId: string) => {
    setSelectedDealId(dealId);
    const deal = (allOpportunities as Opportunity[]).find(o => o.id === dealId);
    if (deal) initConversation(deal);
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

  /* ── Find matching section by detected keyword or title ── */
  const findMatchingSection = useCallback((title: string, content: string): ProposalSection | null => {
    // First try exact title match
    const byTitle = sections.find(s => s.title.toLowerCase() === title.toLowerCase());
    if (byTitle) return byTitle;

    // Then try keyword detection from content
    const detected = detectSection(content);
    if (detected) {
      const match = sections.find(s => s.title.toLowerCase().includes(detected) || detected.includes(s.title.toLowerCase()));
      if (match) return match;
    }

    // Try fuzzy title match (partial overlap)
    const titleLower = title.toLowerCase();
    const fuzzy = sections.find(s =>
      s.title.toLowerCase().includes(titleLower) || titleLower.includes(s.title.toLowerCase())
    );
    return fuzzy || null;
  }, [sections, detectSection]);

  /* ── Scroll to section ── */
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

  /* ── Add section to proposal (smart placement) ── */
  const addSection = useCallback((title: string, content: string) => {
    const matchingSection = findMatchingSection(title, content);

    // If matching section exists AND already has content, show Replace/Append dialog
    if (matchingSection && matchingSection.content) {
      setPendingInsert({ sectionId: matchingSection.id, title: matchingSection.title, content });
      return;
    }

    // If matching section exists but is empty (template placeholder), fill it in
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

    // No match — add as new section
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
  }, [findMatchingSection, scrollToSection]);

  /* ── Handle Replace/Append for pending insert ── */
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
  }, [pendingInsert, scrollToSection]);

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
  }, [pendingInsert, scrollToSection]);

  /* ── Move section ── */
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
  }, []);

  /* ── Remove section ── */
  const removeSection = useCallback((id: string) => {
    setSections(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
  }, []);

  /* ── Approve section ── */
  const approveSection = useCallback((id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
  }, []);

  /* ── Start editing section ── */
  const startEditSection = useCallback((id: string) => {
    const sec = sections.find(s => s.id === id);
    if (sec) {
      setEditingSectionId(id);
      setEditBuffer(sec.content);
    }
  }, [sections]);

  /* ── Save edit ── */
  const saveEditSection = useCallback(() => {
    if (!editingSectionId) return;
    setSections(prev => prev.map(s =>
      s.id === editingSectionId ? { ...s, content: editBuffer, status: 'edited' } : s
    ));
    setEditingSectionId(null);
    setEditBuffer('');
  }, [editingSectionId, editBuffer]);

  /* ── Copy all ── */
  const handleCopyAll = useCallback(() => {
    const fullText = sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [sections]);

  /* ── Export: PDF ── */
  const exportPDF = useCallback(() => {
    const dealName = selectedDeal?.opportunityName || 'Proposal';
    const customerName = selectedDeal?.customerName || 'Customer';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${dealName} - Proposal</title>
      <style>
        body { font-family: 'Inter', system-ui, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; }
        h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
        h2 { color: #333; margin-top: 32px; }
        .section { page-break-inside: avoid; margin-bottom: 24px; }
        .footer { text-align: center; color: #888; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; }
      </style></head><body>
      <h1>${dealName} — Proposal</h1>
      <p style="color:#666;">${customerName} · ${new Date().toLocaleDateString()}</p>
      ${sections.filter(s => s.content).map(s => `<div class="section"><h2>${s.title}</h2><div>${s.content.replace(/\n/g, '<br>')}</div></div>`).join('')}
      <div class="footer">Generated by Galent SalesPilot · Confidential</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }, [selectedDeal, sections]);

  /* ── Export: DOCX ── */
  const exportDOCX = useCallback(async () => {
    const dealName = selectedDeal?.opportunityName || 'Proposal';
    const customerName = selectedDeal?.customerName || 'Customer';
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: `${dealName} — Proposal`, bold: true, size: 48 })], heading: HeadingLevel.TITLE }),
          new Paragraph({ children: [new TextRun({ text: `${customerName} · ${new Date().toLocaleDateString()}`, color: '666666' })] }),
          ...sections.filter(s => s.content).flatMap(s => [
            new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }),
            ...s.content.split('\n').filter(Boolean).map(line => new Paragraph({ text: line })),
          ]),
          new Paragraph({ children: [new TextRun({ text: 'Generated by Galent SalesPilot · Confidential', color: '888888', size: 20 })], spacing: { before: 600 } }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${dealName.replace(/\s/g, '_')}_Proposal.docx`; a.click();
    URL.revokeObjectURL(url);
  }, [selectedDeal, sections]);

  /* ── Export: Markdown ── */
  const exportMarkdown = useCallback(() => {
    const md = sections.filter(s => s.content).map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  }, [sections]);

  /* ── Brief/Full toggle ── */
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

  /* ── Load template sections ── */
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
  }, []);

  /* ── Extract proposal content from AI response ── */
  const extractProposalContent = useCallback((text: string): { title: string; content: string } | null => {
    // Check for ## Section Title pattern
    const match = text.match(/^##\s+(.+?)\n\n([\s\S]+)/m);
    if (match) {
      return { title: match[1].trim(), content: match[2].trim() };
    }
    // Check for **Section: Title** pattern
    const match2 = text.match(/\*\*Section:\s*(.+?)\*\*\n\n([\s\S]+)/m);
    if (match2) {
      return { title: match2[1].trim(), content: match2[2].trim() };
    }
    // If the response is long enough and looks like proposal content (>100 words), treat it as generic content
    if (wordCount(text) > 100) {
      const firstLine = text.split('\n')[0].replace(/[*#]/g, '').trim();
      const titleGuess = firstLine.length < 60 ? firstLine : 'Proposal Content';
      return { title: titleGuess, content: text };
    }
    return null;
  }, []);

  /* ── Send message ── */
  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || !selectedDeal) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Build context for the AI
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
            id: uid(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            proposalContent,
            quickActions,
          };
          setMessages(prev => [...prev, aiMsg]);
        },
        onError: () => {
          setMessages(prev => [...prev, {
            id: uid(),
            role: 'assistant',
            content: 'I encountered an error. Let me try again -- could you rephrase your request?',
            timestamp: new Date(),
          }]);
        },
      }
    );
  }, [selectedDeal, selectedTemplate, sections, chatMutation, extractProposalContent]);

  /* ── Handle Enter key ── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage]);

  /* ── Quick prompts ── */
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

  /* ── Grouped templates ── */
  const templatesByDomain = useMemo(() => {
    const map: Record<string, ProposalTemplate[]> = {};
    for (const domain of SERVICE_DOMAINS) {
      const templates = PROPOSAL_TEMPLATES.filter(t => t.domain === domain);
      if (templates.length > 0) map[domain] = templates;
    }
    return map;
  }, []);

  /* ─── Render ─── */
  return (
    <div className="max-w-[1600px] mx-auto space-y-4 pb-8">
      {/* ── Header & Deal Selector ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-display font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#7c3aed]" />
            Proposal Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build proposals through conversation with AI
          </p>
        </div>

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
            </div>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-[#7c3aed]" />
          <span className="ml-2 text-sm text-muted-foreground">Loading pipeline...</span>
        </div>
      )}

      {/* ── No deal selected ── */}
      {!isLoading && !selectedDeal && (
        <div className="g-surface g-elevated p-16 text-center">
          <Sparkles className="h-10 w-10 text-[#7c3aed] mx-auto mb-4 opacity-40" />
          <div className="text-sm font-medium text-foreground mb-2">Select a deal to start building a proposal</div>
          <div className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
            Choose from your active pursuits in Proposal or Negotiation stage.
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
          {pursuits.length === 0 && !isLoading && (
            <div className="text-xs text-muted-foreground">
              No deals in Proposal or Negotiation stage found.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN: Conversation + Proposal panels
         ═══════════════════════════════════════════════════════ */}
      {selectedDeal && (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 160px)' }}>

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
                  {/* System message */}
                  {msg.role === 'system' && (
                    <div className="flex justify-center my-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                        {msg.content}
                      </span>
                    </div>
                  )}

                  {/* User message */}
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

                  {/* Assistant message */}
                  {msg.role === 'assistant' && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#7c3aed]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                        </div>
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* Regular message content */}
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

                          {/* Proposal content card */}
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

                          {/* Quick actions */}
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

              {/* Typing indicator */}
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
                  <option value="">Load template...</option>
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
                    {/* Section header */}
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono w-5">{idx + 1}.</span>
                        <span className="text-xs font-semibold text-foreground">{section.title}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
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

                    {/* Section content */}
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

                    {/* Section footer */}
                    {section.content && !isEditing && (
                      <div className="px-4 py-1.5 border-t border-border bg-secondary/20 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {wordCount(section.content)} words
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(section.content);
                          }}
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
                  <span className="text-[10px] text-muted-foreground">
                    {sections.length} sections
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {totalWords.toLocaleString()} words
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ~{totalPages} {totalPages === 1 ? 'page' : 'pages'}
                  </span>
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
    </div>
  );
}
