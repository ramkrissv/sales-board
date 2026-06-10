'use client';

import { useState, useRef, useEffect } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import {
  Send, Sparkles, Loader2, CheckSquare, Users, FileText,
  DollarSign, ArrowRight, Plus, Calendar, MessageSquare,
  Bot, Zap, Target, Shield
} from 'lucide-react';
import { DealDetail } from '@/components/modals/DealDetail';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: { label: string; type: string; data?: any; icon?: any }[];
  dealContext?: any;
  timestamp: Date;
}

function DealRoomContent() {
  const { opportunities, updateOpportunity } = useOpportunities();
  const utils = trpc.useUtils();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [showDealDetail, setShowDealDetail] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.ai.chat.useMutation();
  const createTaskMutation = trpc.task.create.useMutation({ onSuccess: () => utils.opportunity.list.invalidate() });
  const createStakeholderMutation = trpc.stakeholder.create.useMutation({ onSuccess: () => utils.opportunity.list.invalidate() });
  const sowMutation = trpc.ai.generateSOW.useMutation();

  const activeDeal = activeDealId ? opportunities.find(o => o.id === activeDealId) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome to the Deal Room. I can help you manage any deal from start to finish. What would you like to do?',
        actions: [
          { label: 'Start a new deal', type: 'new_deal', icon: Plus },
          { label: 'Work on an existing deal', type: 'select_deal', icon: Target },
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
          // Parse actions from response
          const responseText = data.response;
          const actionRegex = /\[ACTION:\s*([^|]+)\|\s*([^|]+)\|\s*([^\]]+)\]/g;
          const actions: ChatMessage['actions'] = [];
          let cleanText = responseText;
          let match;
          while ((match = actionRegex.exec(responseText)) !== null) {
            const label = match[1].trim();
            const type = match[2].trim();
            const details = match[3].trim();
            const icons: Record<string, any> = {
              create_task: CheckSquare, add_stakeholder: Users, change_stage: ArrowRight,
              generate_sow: FileText, schedule_meeting: Calendar, send_followup: MessageSquare,
              update_tcv: DollarSign, view_deal: Target,
            };
            actions.push({ label, type, data: details, icon: icons[type] || Zap });
            cleanText = cleanText.replace(match[0], '');
          }

          addMessage({
            role: 'assistant',
            content: cleanText.trim(),
            actions: actions.length > 0 ? actions : [
              { label: 'View deal details', type: 'view_deal', icon: Target },
              { label: 'Add a task', type: 'prompt_task', icon: CheckSquare },
              { label: 'Change stage', type: 'prompt_stage', icon: ArrowRight },
            ],
            dealContext: activeDeal,
          });
        },
        onError: (error) => {
          addMessage({ role: 'assistant', content: `Error: ${error.message}` });
        },
      }
    );
  };

  const handleAction = async (action: NonNullable<ChatMessage['actions']>[0]) => {
    switch (action.type) {
      case 'new_deal':
        addMessage({ role: 'system', content: 'Starting new deal creation...' });
        addMessage({
          role: 'assistant',
          content: 'Let\'s create a new deal. Tell me the customer name and what the opportunity is about, and I\'ll set it up.',
          actions: [],
        });
        break;

      case 'select_deal':
        addMessage({
          role: 'assistant',
          content: 'Which deal would you like to work on?',
          actions: opportunities.filter(o => !['Won','Lost'].includes(o.status)).slice(0, 8).map(o => ({
            label: `${o.customerName} — ${o.status} ${o.tcv > 0 ? `$${(o.tcv/1000).toFixed(0)}k` : ''}`,
            type: 'set_deal',
            data: o.id,
            icon: Target,
          })),
        });
        break;

      case 'set_deal':
        setActiveDealId(action.data);
        const deal = opportunities.find(o => o.id === action.data);
        if (deal) {
          addMessage({ role: 'system', content: `Now working on: ${deal.customerName} — ${deal.opportunityName}` });
          addMessage({
            role: 'assistant',
            content: `I'm now focused on the **${deal.customerName}** deal (${deal.status}, $${(deal.tcv||0).toLocaleString()}). What would you like to do?`,
            actions: [
              { label: 'Analyze this deal', type: 'analyze', icon: Sparkles },
              { label: 'Add a task', type: 'prompt_task', icon: CheckSquare },
              { label: 'Add stakeholder', type: 'prompt_stakeholder', icon: Users },
              { label: 'Generate SOW', type: 'generate_sow', icon: FileText },
              { label: 'Move to next stage', type: 'prompt_stage', icon: ArrowRight },
              { label: 'View full details', type: 'view_deal', icon: Target },
            ],
          });
        }
        break;

      case 'review':
        setInput('Give me a quick pipeline review — what needs attention today?');
        setTimeout(handleSend, 100);
        break;

      case 'analyze':
        if (activeDealId) {
          addMessage({ role: 'system', content: 'Running AI analysis...' });
          setInput('Analyze this deal in detail — health score, risks, next steps, and what I should do today.');
          setTimeout(handleSend, 100);
        }
        break;

      case 'prompt_task':
        addMessage({
          role: 'assistant',
          content: 'What task do you need to create? Describe it and I\'ll suggest the right format.',
          actions: activeDeal ? [
            { label: `Follow up with ${(activeDeal.customerStakeholders||[])[0]?.name || 'customer'}`, type: 'create_task_quick', data: `Follow up with ${(activeDeal.customerStakeholders||[])[0]?.name || 'customer contact'}`, icon: CheckSquare },
            { label: 'Schedule internal review', type: 'create_task_quick', data: 'Schedule internal deal review meeting', icon: Calendar },
            { label: 'Prepare proposal deck', type: 'create_task_quick', data: 'Prepare proposal presentation deck', icon: FileText },
          ] : [],
        });
        break;

      case 'create_task_quick':
      case 'create_task':
        if (activeDealId) {
          const taskName = action.data || action.label;
          createTaskMutation.mutate({
            opportunityId: activeDealId,
            name: taskName,
            owner: activeDeal?.primaryOwner || 'Unassigned',
            dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            priority: 'High' as const,
          });
          addMessage({ role: 'system', content: `Task created: "${taskName}"` });
        }
        break;

      case 'prompt_stakeholder':
        addMessage({
          role: 'assistant',
          content: 'Who do you want to add? Give me their name and title, and whether they\'re a decision maker.',
          actions: [],
        });
        break;

      case 'prompt_stage':
        if (activeDeal) {
          const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'];
          const currentIdx = stages.indexOf(activeDeal.status);
          const nextStage = currentIdx < stages.length - 1 ? stages[currentIdx + 1] : null;
          addMessage({
            role: 'assistant',
            content: nextStage
              ? `Current stage: **${activeDeal.status}**. Move to **${nextStage}**?`
              : `This deal is already in ${activeDeal.status}.`,
            actions: nextStage ? [
              { label: `Move to ${nextStage}`, type: 'change_stage', data: nextStage, icon: ArrowRight },
              { label: 'Keep current stage', type: 'dismiss', icon: Target },
            ] : [],
          });
        }
        break;

      case 'change_stage':
        if (activeDealId && action.data) {
          await updateOpportunity(activeDealId, { status: action.data });
          addMessage({ role: 'system', content: `Stage updated to: ${action.data}` });
          addMessage({
            role: 'assistant',
            content: `Done! ${activeDeal?.customerName} is now in **${action.data}**. What's next?`,
            actions: [
              { label: 'Add tasks for this stage', type: 'prompt_task', icon: CheckSquare },
              { label: 'Generate SOW', type: 'generate_sow', icon: FileText },
              { label: 'Continue working', type: 'analyze', icon: Sparkles },
            ],
          });
        }
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
                  { label: 'View full SOW', type: 'view_deal', icon: FileText },
                  { label: 'Create review task', type: 'create_task_quick', data: 'Review generated SOW', icon: CheckSquare },
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

      default:
        setInput(action.label);
        setTimeout(handleSend, 100);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#7c3aed]" /> Deal Room
          </h1>
          {activeDeal && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Working on: <span className="text-foreground font-medium">{activeDeal.customerName}</span> · {activeDeal.status} · ${(activeDeal.tcv||0).toLocaleString()}
            </p>
          )}
        </div>
        {activeDeal && (
          <button onClick={() => setShowDealDetail(true)}
            className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            View Details
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'system' ? 'justify-center' : ''}`}>
            {msg.role === 'system' ? (
              <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">{msg.content}</div>
            ) : (
              <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? '' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#7c3aed] text-white rounded-tr-sm'
                    : 'g-surface text-foreground rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' && <Sparkles className="h-3.5 w-3.5 text-[#7c3aed] inline mr-1.5" />}
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
                {/* Action buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-1">
                    {msg.actions.map((action, i) => {
                      const Icon = action.icon || Zap;
                      return (
                        <button key={i} onClick={() => handleAction(action)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium g-surface hover-glow transition-all text-foreground">
                          <Icon className="h-3 w-3 text-[#7c3aed]" />
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {(chatMutation.isPending || sowMutation.isPending) && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl g-surface text-sm flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-[#7c3aed]" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex items-center gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={activeDeal ? `Message about ${activeDeal.customerName}...` : 'Start a conversation about your deals...'}
          className="flex-1 px-4 py-3 text-sm g-surface rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20" />
        <button onClick={handleSend} disabled={chatMutation.isPending || !input.trim()}
          className="p-3 rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
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
