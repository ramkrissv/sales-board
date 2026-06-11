'use client';

import { useState, useRef, useEffect } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import {
  Send, Sparkles, Loader2, CheckSquare, Users, FileText,
  DollarSign, ArrowRight, Plus, Calendar, MessageSquare,
  Bot, Zap, Target, Shield, X, ChevronDown, Search
} from 'lucide-react';
import { DealDetail } from '@/components/modals/DealDetail';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: { label: string; type: string; data?: any; icon?: any }[];
  form?: 'task' | 'stakeholder' | 'stage' | 'tcv' | null;
  dealContext?: any;
  timestamp: Date;
}

// ── Inline Task Form ──
function TaskForm({ deal, onSubmit, onCancel }: { deal: any; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState(deal?.primaryOwner || '');
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3 card-enter">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CheckSquare className="h-3.5 w-3.5 text-[#7c3aed]" /> New Task
        </span>
        <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name *"
        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" autoFocus />
      <div className="grid grid-cols-3 gap-2">
        <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner"
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
        <select value={priority} onChange={e => setPriority(e.target.value as any)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground">
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button onClick={() => name.trim() && onSubmit({ name, owner, dueDate, priority })} disabled={!name.trim()}
          className="px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50">Create Task</button>
      </div>
    </div>
  );
}

// ── Inline Stakeholder Form ──
function StakeholderForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [isDecisionMaker, setIsDecisionMaker] = useState(false);

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3 card-enter">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-[#11A7A0]" /> New Stakeholder
        </span>
        <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name *"
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" autoFocus />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title / Role *"
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
        <label className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer">
          <input type="checkbox" checked={isDecisionMaker} onChange={e => setIsDecisionMaker(e.target.checked)}
            className="rounded border-border" />
          Decision Maker
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button onClick={() => name.trim() && title.trim() && onSubmit({ name, title, email, isDecisionMaker })} disabled={!name.trim() || !title.trim()}
          className="px-3 py-1.5 text-xs rounded-lg bg-[#11A7A0] text-white font-medium hover:bg-[#0E8C86] transition-colors disabled:opacity-50">Add Stakeholder</button>
      </div>
    </div>
  );
}

// ── Stage Change Form ──
function StageForm({ deal, onSubmit, onCancel }: { deal: any; onSubmit: (stage: string) => void; onCancel: () => void }) {
  const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const currentIdx = stages.indexOf(deal.status);

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3 card-enter">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <ArrowRight className="h-3.5 w-3.5 text-[#7c3aed]" /> Change Stage
        </span>
        <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        Current stage: <span className="font-semibold text-foreground">{deal.status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stages.map((stage, i) => (
          <button key={stage} onClick={() => stage !== deal.status && onSubmit(stage)} disabled={stage === deal.status}
            className={`px-3 py-2 text-xs rounded-lg border transition-colors text-center
              ${stage === deal.status
                ? 'bg-[#7c3aed]/10 border-[#7c3aed]/30 text-[#7c3aed] font-semibold'
                : i > currentIdx
                  ? 'border-border text-foreground hover:border-[#7c3aed]/30 hover:bg-[#7c3aed]/5'
                  : 'border-border text-muted-foreground hover:border-border hover:bg-secondary'
              }`}>
            {stage}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ── TCV Update Form ──
function TcvForm({ deal, onSubmit, onCancel }: { deal: any; onSubmit: (tcv: number) => void; onCancel: () => void }) {
  const [tcv, setTcv] = useState(String(deal?.tcv || 0));

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3 card-enter">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-[var(--g-green)]" /> Update Deal Value
        </span>
        <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">$</span>
        <input type="number" value={tcv} onChange={e => setTcv(e.target.value)} placeholder="0"
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground g-metric" autoFocus />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        <button onClick={() => onSubmit(Number(tcv))}
          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--g-green)] text-white font-medium hover:opacity-90 transition-colors">Update TCV</button>
      </div>
    </div>
  );
}

function DealRoomContent() {
  const { opportunities, updateOpportunity } = useOpportunities();
  const utils = trpc.useUtils();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [showDealDetail, setShowDealDetail] = useState(false);
  const [activeForm, setActiveForm] = useState<'task' | 'stakeholder' | 'stage' | 'tcv' | null>(null);
  const [showDealPicker, setShowDealPicker] = useState(false);
  const [dealSearch, setDealSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.ai.chat.useMutation();
  const createTaskMutation = trpc.task.create.useMutation({ onSuccess: () => utils.opportunity.list.invalidate() });
  const createStakeholderMutation = trpc.stakeholder.create.useMutation({ onSuccess: () => utils.opportunity.list.invalidate() });
  const sowMutation = trpc.ai.generateSOW.useMutation();

  const activeDeal = activeDealId ? opportunities.find(o => o.id === activeDealId) : null;
  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const filteredDeals = activeDeals.filter(d =>
    !dealSearch || d.customerName.toLowerCase().includes(dealSearch.toLowerCase()) || d.opportunityName.toLowerCase().includes(dealSearch.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeForm]);

  // Initialize with welcome
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome to the Deal Room. Select a deal to start working, or ask me anything about your pipeline.',
        actions: [
          { label: 'Review my pipeline', type: 'review', icon: Zap },
        ],
        timestamp: new Date(),
      }]);
    }
  }, []); // eslint-disable-line

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: `msg-${Date.now()}-${Math.random()}`, timestamp: new Date() }]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMsg });

    // Build context for Claude
    let context = '';
    if (activeDeal) {
      const tasks = activeDeal.subTasks || [];
      const stakeholders = activeDeal.customerStakeholders || [];
      context = `ACTIVE DEAL: ${activeDeal.customerName} — ${activeDeal.opportunityName}
Stage: ${activeDeal.status} | TCV: $${(activeDeal.tcv||0).toLocaleString()} | Margin: ${activeDeal.margin||'N/A'}%
Owner: ${activeDeal.primaryOwner} | Close: ${activeDeal.expectedCloseDate} | Duration: ${activeDeal.dealDuration}
Stakeholders (${stakeholders.length}): ${stakeholders.map((s: any) => `${s.name} (${s.title})${s.isDecisionMaker?' [DM]':''}`).join(', ') || 'None'}
Tasks (${tasks.filter((t: any)=>t.status==='complete').length}/${tasks.length}): ${tasks.slice(0,5).map((t: any) => `${t.status==='complete'?'\u2713':'\u25CB'} ${t.name}`).join(', ')}
Log: ${(activeDeal.conversationLog||'').slice(0,300)}`;
    }

    chatMutation.mutate(
      {
        message: `${userMsg}\n\nContext: ${context}\n\nIMPORTANT: After your response, suggest 2-3 specific NEXT ACTIONS the user can take. Format each action as: [ACTION: label | type | details]. Types: create_task, add_stakeholder, change_stage, generate_sow, schedule_meeting, send_followup, update_tcv, view_deal. Be specific to this deal.`,
        context: activeDealId ? { opportunityId: activeDealId, page: 'deal-room' } : { page: 'deal-room' },
      },
      {
        onSuccess: (data) => {
          const responseText = data.response;
          const actionRegex = /\[ACTION:\s*([^|]+)\|\s*([^|]+)\|\s*([^\]]+)\]/g;
          const actions: ChatMessage['actions'] = [];
          let cleanText = responseText;
          let match;
          while ((match = actionRegex.exec(responseText)) !== null) {
            const label = match[1].trim();
            const type = match[2].trim();
            const icons: Record<string, any> = {
              create_task: CheckSquare, add_stakeholder: Users, change_stage: ArrowRight,
              generate_sow: FileText, schedule_meeting: Calendar, send_followup: MessageSquare,
              update_tcv: DollarSign, view_deal: Target,
            };
            actions.push({ label, type, icon: icons[type] || Zap });
            cleanText = cleanText.replace(match[0], '');
          }

          addMessage({
            role: 'assistant',
            content: cleanText.trim(),
            actions: actions.length > 0 ? actions : undefined,
            dealContext: activeDeal,
          });
        },
        onError: (error) => {
          addMessage({ role: 'assistant', content: `I encountered an error: ${error.message}. Please try again.` });
        },
      }
    );
  };

  const handleAction = async (action: NonNullable<ChatMessage['actions']>[0]) => {
    switch (action.type) {
      case 'review':
        setInput('Give me a quick pipeline review — what needs attention today?');
        setTimeout(handleSend, 100);
        break;

      case 'analyze':
        if (activeDealId) {
          setInput('Analyze this deal in detail — health score, risks, next steps, and what I should do today.');
          setTimeout(handleSend, 100);
        }
        break;

      case 'prompt_task':
      case 'create_task':
        setActiveForm('task');
        break;

      case 'prompt_stakeholder':
      case 'add_stakeholder':
        setActiveForm('stakeholder');
        break;

      case 'prompt_stage':
      case 'change_stage':
        setActiveForm('stage');
        break;

      case 'update_tcv':
        setActiveForm('tcv');
        break;

      case 'generate_sow':
        if (activeDealId) {
          addMessage({ role: 'system', content: 'Generating Statement of Work...' });
          sowMutation.mutate({ opportunityId: activeDealId }, {
            onSuccess: (data) => {
              addMessage({
                role: 'assistant',
                content: `SOW generated for ${activeDeal?.customerName}:\n\n${data.content.slice(0, 500)}...\n\n*(Full document available in deal detail)*`,
                actions: [
                  { label: 'View full details', type: 'view_deal', icon: FileText },
                ],
              });
            },
          });
        }
        break;

      case 'view_deal':
        if (activeDealId) setShowDealDetail(true);
        break;

      case 'dismiss':
        break;

      case 'send_followup':
      case 'schedule_meeting':
        // These are task-like actions — create a task for them
        if (activeDealId) {
          createTaskMutation.mutate({
            opportunityId: activeDealId,
            name: action.label || action.data || `${action.type} for ${activeDeal?.customerName}`,
            owner: activeDeal?.primaryOwner || 'Unassigned',
            dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
            priority: 'High' as const,
          });
          addMessage({ role: 'system', content: `Task created: "${action.label || action.type}"` });
        }
        break;

      default:
        // For any unrecognized action, create a task from it
        if (activeDealId && action.label) {
          createTaskMutation.mutate({
            opportunityId: activeDealId,
            name: action.label,
            owner: activeDeal?.primaryOwner || 'Unassigned',
            dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
            priority: 'High' as const,
          });
          addMessage({ role: 'system', content: `Task created: "${action.label}"` });
        } else {
          setInput(action.label);
          setTimeout(handleSend, 100);
        }
    }
  };

  const handleTaskSubmit = (data: any) => {
    if (activeDealId) {
      createTaskMutation.mutate({
        opportunityId: activeDealId,
        name: data.name,
        owner: data.owner || activeDeal?.primaryOwner || 'Unassigned',
        dueDate: new Date(data.dueDate).toISOString(),
        priority: data.priority,
      });
      addMessage({ role: 'system', content: `Task created: "${data.name}" (${data.priority} priority, due ${format(new Date(data.dueDate), 'MMM d')})` });
      setActiveForm(null);
    }
  };

  const handleStakeholderSubmit = (data: any) => {
    if (activeDealId) {
      createStakeholderMutation.mutate({
        opportunityId: activeDealId,
        name: data.name,
        title: data.title,
        email: data.email || undefined,
        isDecisionMaker: data.isDecisionMaker,
      });
      addMessage({ role: 'system', content: `Stakeholder added: ${data.name} (${data.title})${data.isDecisionMaker ? ' — Decision Maker' : ''}` });
      setActiveForm(null);
    }
  };

  const handleStageSubmit = async (stage: string) => {
    if (activeDealId) {
      await updateOpportunity(activeDealId, { status: stage as any });
      addMessage({ role: 'system', content: `Stage updated: ${activeDeal?.status} → ${stage}` });
      setActiveForm(null);
    }
  };

  const handleTcvSubmit = async (tcv: number) => {
    if (activeDealId) {
      await updateOpportunity(activeDealId, { tcv });
      addMessage({ role: 'system', content: `Deal value updated to $${tcv.toLocaleString()}` });
      setActiveForm(null);
    }
  };

  const selectDeal = (id: string) => {
    setActiveDealId(id);
    setShowDealPicker(false);
    setDealSearch('');
    const deal = opportunities.find(o => o.id === id);
    if (deal) {
      addMessage({ role: 'system', content: `Now working on: ${deal.customerName} — ${deal.opportunityName}` });
      addMessage({
        role: 'assistant',
        content: `I'm focused on **${deal.customerName}** (${deal.status}, $${(deal.tcv || 0).toLocaleString()}).\n\n${deal.customerStakeholders?.length || 0} stakeholders · ${deal.subTasks?.length || 0} tasks · ${deal.dealDuration || '—'}\n\nWhat would you like to do?`,
        actions: [
          { label: 'Analyze this deal', type: 'analyze', icon: Sparkles },
          { label: 'Add a task', type: 'prompt_task', icon: CheckSquare },
          { label: 'Add stakeholder', type: 'prompt_stakeholder', icon: Users },
          { label: 'Generate SOW', type: 'generate_sow', icon: FileText },
        ],
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
            <Bot className="h-4.5 w-4.5 text-[#7c3aed]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Deal Room</h1>
            {activeDeal ? (
              <p className="text-xs text-muted-foreground">
                {activeDeal.customerName} · <span className="text-foreground">{activeDeal.status}</span> · ${(activeDeal.tcv || 0).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Conversational deal management</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Participants */}
          {activeDeal && (
            <div className="flex items-center gap-1 mr-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#7c3aed]/20 border-2 border-card flex items-center justify-center text-[8px] font-bold text-[#7c3aed]" title="You">SR</div>
                <div className="w-6 h-6 rounded-full bg-[#11A7A0]/20 border-2 border-card flex items-center justify-center text-[8px] font-bold text-[#11A7A0]" title="AI Assistant">AI</div>
                {(activeDeal.customerStakeholders || []).slice(0, 2).map((s: any, i: number) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[8px] font-bold text-muted-foreground" title={s.name}>
                    {s.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground ml-1">
                {2 + (activeDeal.customerStakeholders || []).length} in room
              </span>
            </div>
          )}

          {/* Deal picker */}
          <div className="relative">
            <button onClick={() => setShowDealPicker(!showDealPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">
              <Target className="h-3.5 w-3.5 text-[#7c3aed]" />
              {activeDeal ? 'Switch Deal' : 'Select Deal'}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showDealPicker && (
              <div className="absolute right-0 top-full mt-1 w-80 z-50 g-surface g-elevated rounded-xl overflow-hidden card-enter">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input value={dealSearch} onChange={e => setDealSearch(e.target.value)} placeholder="Search deals..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground" autoFocus />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
                  {filteredDeals.slice(0, 12).map(deal => (
                    <button key={deal.id} onClick={() => selectDeal(deal.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-secondary/50 transition-colors ${deal.id === activeDealId ? 'bg-[#7c3aed]/5' : ''}`}>
                      <div className="text-xs font-medium text-foreground">{deal.customerName}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {deal.status} · ${(deal.tcv / 1000).toFixed(0)}k · {deal.primaryOwner}
                      </div>
                    </button>
                  ))}
                  {filteredDeals.length === 0 && (
                    <div className="px-3 py-6 text-xs text-muted-foreground text-center">No deals found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {activeDeal && (
            <button onClick={() => setShowDealDetail(true)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              Full Details
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-2">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'system' ? 'justify-center' : ''}`}>
            {msg.role === 'system' ? (
              <div className="text-[11px] text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full animate-flow-in">
                {msg.content}
              </div>
            ) : (
              <div className={`max-w-[85%] space-y-3`}>
                {/* Message bubble */}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#7c3aed] text-white rounded-br-sm'
                    : 'bg-card border border-border text-foreground rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                      <span className="text-[10px] text-muted-foreground font-medium">Galent AI</span>
                    </div>
                  )}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>

                {/* Action buttons — spaced out, not crammed */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pl-1">
                    {msg.actions.map((action, i) => {
                      const Icon = action.icon || Zap;
                      return (
                        <button key={i} onClick={() => handleAction(action)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium bg-card border border-border hover:border-[#7c3aed]/30 hover:bg-[#7c3aed]/5 transition-all text-foreground text-left">
                          <Icon className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                          <span className="truncate">{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Inline forms */}
        {activeForm === 'task' && activeDeal && (
          <TaskForm deal={activeDeal} onSubmit={handleTaskSubmit} onCancel={() => setActiveForm(null)} />
        )}
        {activeForm === 'stakeholder' && activeDealId && (
          <StakeholderForm onSubmit={handleStakeholderSubmit} onCancel={() => setActiveForm(null)} />
        )}
        {activeForm === 'stage' && activeDeal && (
          <StageForm deal={activeDeal} onSubmit={handleStageSubmit} onCancel={() => setActiveForm(null)} />
        )}
        {activeForm === 'tcv' && activeDeal && (
          <TcvForm deal={activeDeal} onSubmit={handleTcvSubmit} onCancel={() => setActiveForm(null)} />
        )}

        {(chatMutation.isPending || sowMutation.isPending) && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-card border border-border text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-smooth-spin text-[#7c3aed]" />
              {sowMutation.isPending ? 'Generating SOW...' : 'Thinking...'}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick action bar when deal is active */}
      {activeDeal && !activeForm && (
        <div className="flex items-center gap-1.5 py-2 mt-2 border-t border-border overflow-x-auto">
          <span className="text-[10px] text-muted-foreground shrink-0 mr-1">Quick:</span>
          {[
            { label: 'Task', icon: CheckSquare, type: 'prompt_task' },
            { label: 'Stakeholder', icon: Users, type: 'prompt_stakeholder' },
            { label: 'Stage', icon: ArrowRight, type: 'prompt_stage' },
            { label: 'TCV', icon: DollarSign, type: 'update_tcv' },
            { label: 'SOW', icon: FileText, type: 'generate_sow' },
            { label: 'Analyze', icon: Sparkles, type: 'analyze' },
          ].map(q => (
            <button key={q.type} onClick={() => handleAction({ label: q.label, type: q.type, icon: q.icon })}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0">
              <q.icon className="h-3 w-3" /> {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-2 pb-1">
        <div className="flex items-center gap-2 p-1.5 rounded-xl g-surface border border-border">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={activeDeal ? `Message about ${activeDeal.customerName}...` : 'Ask about your pipeline...'}
            className="flex-1 px-3 py-2.5 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <button onClick={handleSend} disabled={chatMutation.isPending || !input.trim()}
            className="p-2.5 rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Deal Detail Modal */}
      {showDealDetail && activeDealId && (
        <DealDetail opportunityId={activeDealId} onClose={() => setShowDealDetail(false)} />
      )}
    </div>
  );
}

export default function DealRoomPage() {
  return (
    <OpportunityProvider>
      <DealRoomContent />
    </OpportunityProvider>
  );
}
