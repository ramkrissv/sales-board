'use client';

import { useState } from 'react';
import {
  Brain, Eye, Target, CheckSquare, ArrowRight, Zap, Shield, BarChart3,
  AlertTriangle, Mail, Calendar, FileText, Users, Clock, Loader2,
  ChevronRight, Play, Sparkles, TrendingUp, MessageSquare, Search,
  GitBranch, ExternalLink, RefreshCw, Copy, Check, DollarSign
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';

// ── Types ──

interface AgentRun {
  agentId: string;
  goal: string;
  reasoning: string[];
  toolCalls: { tool: string; params: any; result: any }[];
  finalAnswer: string;
  startedAt: string;
  completedAt: string;
}

interface AgentResultViewProps {
  result: AgentRun;
  onDealClick?: (dealId: string) => void;
  onAgentInvoke?: (agentId: string, goal: string) => void;
  onCreateTask?: (task: { name: string; oppId?: string }) => void;
  onClose?: () => void;
  compact?: boolean;
}

// ── Tool metadata ──
const TOOL_META: Record<string, { label: string; icon: any; color: string; verb: string }> = {
  list_opportunities: { label: 'Pipeline scan', icon: Eye, color: '#3b82f6', verb: 'Scanned' },
  get_opportunity: { label: 'Deal lookup', icon: Target, color: '#7c3aed', verb: 'Analyzed' },
  update_opportunity: { label: 'Deal update', icon: ArrowRight, color: '#f59e0b', verb: 'Updated' },
  create_task: { label: 'Task created', icon: CheckSquare, color: '#22c55e', verb: 'Created task' },
  complete_task: { label: 'Task completed', icon: CheckSquare, color: '#10b981', verb: 'Completed' },
  list_stakeholders: { label: 'Contact scan', icon: Users, color: '#8b5cf6', verb: 'Scanned contacts' },
  add_stakeholder: { label: 'Contact added', icon: Users, color: '#22c55e', verb: 'Added contact' },
  list_accounts: { label: 'Account scan', icon: Eye, color: '#3b82f6', verb: 'Scanned accounts' },
  get_account_360: { label: 'Account deep-dive', icon: Search, color: '#ec4899', verb: 'Analyzed account' },
  query_graph: { label: 'Graph query', icon: GitBranch, color: '#6366f1', verb: 'Queried graph' },
  get_similar_accounts: { label: 'Similar accounts', icon: Search, color: '#14b8a6', verb: 'Found similar' },
  generate_sow: { label: 'SOW generated', icon: FileText, color: '#10b981', verb: 'Generated SOW' },
  draft_outreach: { label: 'Email drafted', icon: Mail, color: '#22c55e', verb: 'Drafted email' },
  send_notification: { label: 'Alert sent', icon: Zap, color: '#ef4444', verb: 'Sent alert' },
  log_activity: { label: 'Activity logged', icon: Clock, color: '#71717a', verb: 'Logged' },
  get_forecast: { label: 'Forecast run', icon: BarChart3, color: '#06b6d4', verb: 'Forecasted' },
  qualify_lead: { label: 'Lead qualified', icon: Target, color: '#f97316', verb: 'Qualified' },
};

const AGENT_META: Record<string, { label: string; color: string; icon: any }> = {
  'deal-coach': { label: 'Deal Coach', color: '#7c3aed', icon: Brain },
  'research-agent': { label: 'Research', color: '#3b82f6', icon: Search },
  'outreach-agent': { label: 'Outreach', color: '#22c55e', icon: Mail },
  'hygiene-agent': { label: 'Hygiene', color: '#f59e0b', icon: Shield },
  'forecast-agent': { label: 'Forecast', color: '#06b6d4', icon: BarChart3 },
  'intake-processor': { label: 'Intake', color: '#8b5cf6', icon: Zap },
  'proposal-drafter': { label: 'Proposal', color: '#10b981', icon: FileText },
  'account-intelligence': { label: 'Intel', color: '#ec4899', icon: Eye },
  'competitive-intel': { label: 'Competitive', color: '#ef4444', icon: Shield },
  'growth-agent': { label: 'Growth', color: '#14b8a6', icon: TrendingUp },
  'enablement-agent': { label: 'Coach', color: '#f97316', icon: MessageSquare },
  'signal-processor': { label: 'Signals', color: '#6366f1', icon: Zap },
  'campaign-agent': { label: 'Campaign', color: '#e11d48', icon: Mail },
};

// ── Follow-up actions by agent ──
function getSuggestedFollowUps(agentId: string, finalAnswer: string): { agentId: string; label: string; goal: string }[] {
  const followUps: { agentId: string; label: string; goal: string }[] = [];

  if (agentId === 'deal-coach') {
    if (/competitor|competitive/i.test(finalAnswer)) {
      followUps.push({ agentId: 'competitive-intel', label: 'Deep competitive analysis', goal: 'Do a detailed competitive analysis on the competitors mentioned. Build battle cards.' });
    }
    if (/proposal|sow|document/i.test(finalAnswer)) {
      followUps.push({ agentId: 'proposal-drafter', label: 'Draft proposal', goal: 'Generate a proposal outline based on the deal context and recommended actions.' });
    }
    if (/stakeholder|decision.*maker|contact/i.test(finalAnswer)) {
      followUps.push({ agentId: 'account-intelligence', label: 'Enrich contacts', goal: 'Research the stakeholders and find key decision makers, their backgrounds, and engagement strategy.' });
    }
    followUps.push({ agentId: 'outreach-agent', label: 'Draft follow-up email', goal: 'Based on the analysis, draft a follow-up email to the key stakeholder.' });
  }

  if (agentId === 'account-intelligence') {
    followUps.push({ agentId: 'growth-agent', label: 'Find expansion plays', goal: 'Analyze this account for whitespace and cross-sell opportunities.' });
    followUps.push({ agentId: 'outreach-agent', label: 'Draft outreach', goal: 'Draft an outreach email to the key contact based on the account research.' });
  }

  if (agentId === 'competitive-intel') {
    followUps.push({ agentId: 'enablement-agent', label: 'Get coaching tips', goal: 'Based on the competitive landscape, provide objection handling and counter-positioning tips.' });
  }

  if (agentId === 'proposal-drafter') {
    followUps.push({ agentId: 'deal-coach', label: 'Review deal readiness', goal: 'Now that a proposal is drafted, assess if the deal is ready to advance to the next stage.' });
  }

  if (agentId === 'forecast-agent') {
    followUps.push({ agentId: 'deal-coach', label: 'Fix at-risk deals', goal: 'For the deals identified as slip risks, suggest specific recovery actions.' });
  }

  if (agentId === 'enablement-agent') {
    followUps.push({ agentId: 'outreach-agent', label: 'Draft response', goal: 'Based on the coaching tips, draft a response email incorporating the recommended positioning.' });
  }

  return followUps.slice(0, 3);
}

// ── Parse answer into structured items ──
interface ParsedItem {
  type: 'action' | 'insight' | 'risk' | 'positive' | 'header';
  text: string;
  dealName?: string;
  dealId?: string;
  amount?: string;
  taskable?: boolean;
}

function parseAnswer(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = text.split(/\n/).filter(l => l.trim().length > 3);

  for (const line of lines) {
    const trimmed = line.trim().replace(/\*\*/g, '').replace(/^[-•]\s*/, '');
    if (trimmed.length < 5) continue;

    const isNumbered = /^\d+[\.\)]\s/.test(trimmed);
    const cleanText = trimmed.replace(/^\d+[\.\)]\s*/, '');

    // Extract deal names and amounts
    const amountMatch = cleanText.match(/\$[\d,]+[kKmM]?/);
    const amount = amountMatch ? amountMatch[0] : undefined;

    // Classify
    const isRisk = /risk|overdue|stale|missing|urgent|critical|concern|slip|delay|blocked|warn/i.test(cleanText);
    const isPositive = /close|won|strong|healthy|ready|momentum|accelerat|confident|success|complete/i.test(cleanText);
    const isHeader = /^[A-Z\s]{4,}:?\s*$/.test(trimmed) || trimmed.startsWith('#');
    const isTaskable = /call|email|schedule|send|follow|meet|review|prepare|draft|create|update|contact|reach/i.test(cleanText);

    if (isHeader) {
      items.push({ type: 'header', text: cleanText.replace(/^#+\s*/, '') });
    } else if (isNumbered || cleanText.length > 10) {
      items.push({
        type: isRisk ? 'risk' : isPositive ? 'positive' : 'action',
        text: cleanText,
        amount,
        taskable: isTaskable,
      });
    }
  }

  return items;
}

// ── Component ──
export default function AgentResultView({
  result,
  onDealClick,
  onAgentInvoke,
  onCreateTask,
  onClose,
  compact = false,
}: AgentResultViewProps) {
  const [expandedTool, setExpandedTool] = useState<number | null>(null);
  const [createdTasks, setCreatedTasks] = useState<Set<number>>(new Set());
  const [followUpRunning, setFollowUpRunning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const agent = AGENT_META[result.agentId] || { label: result.agentId, color: '#7c3aed', icon: Brain };
  const AgentIcon = agent.icon;
  const parsedItems = parseAnswer(result.finalAnswer);
  const followUps = getSuggestedFollowUps(result.agentId, result.finalAnswer);
  const duration = result.startedAt && result.completedAt
    ? Math.round((new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()) / 1000)
    : null;

  // Extract deals mentioned in tool calls
  const mentionedDeals: { id: string; name: string; customer: string; tcv: number }[] = [];
  for (const call of result.toolCalls) {
    if (call.tool === 'get_opportunity' && call.result && !call.result.error) {
      const r = call.result;
      mentionedDeals.push({
        id: r.id || call.params?.opportunityId,
        name: r.opportunityName || r.name || '',
        customer: r.customerName || r.customer || '',
        tcv: r.tcv || 0,
      });
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result.finalAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTaskFromItem = (item: ParsedItem, index: number) => {
    onCreateTask?.({ name: item.text.slice(0, 100) });
    setCreatedTasks(prev => new Set(prev).add(index));
  };

  const handleFollowUp = (followUp: { agentId: string; label: string; goal: string }) => {
    setFollowUpRunning(followUp.agentId);
    onAgentInvoke?.(followUp.agentId, followUp.goal);
  };

  return (
    <div className="space-y-4 animate-flow-in">
      {/* ── Agent Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${agent.color}15` }}>
            <AgentIcon className="h-4.5 w-4.5" style={{ color: agent.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{agent.label}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{result.toolCalls.length} tool calls</span>
              {duration && <><span>·</span><span>{duration}s</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleCopy} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>
      </div>

      {/* ── Execution Chain (visual neural path) ── */}
      {result.toolCalls.length > 0 && (
        <div className="flex items-center gap-0.5 flex-wrap p-3 rounded-xl bg-card/50 border border-border">
          <Sparkles className="h-3 w-3 text-[#7c3aed] mr-1.5" />
          {result.toolCalls.map((call, i) => {
            const meta = TOOL_META[call.tool] || { label: call.tool, icon: GitBranch, color: '#71717a', verb: call.tool };
            const Icon = meta.icon;
            const isExpanded = expandedTool === i;
            const hasResult = call.result && !call.result?.error;

            return (
              <div key={i} className="flex items-center gap-0.5">
                <button
                  onClick={() => setExpandedTool(isExpanded ? null : i)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: `${meta.color}10`, color: meta.color }}
                >
                  <Icon className="h-3 w-3" />
                  <span>{meta.verb}</span>
                  {call.params?.opportunityId && (
                    <span className="opacity-60 truncate max-w-[60px]">{call.params.opportunityId.slice(0, 6)}</span>
                  )}
                </button>
                {i < result.toolCalls.length - 1 && (
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Expanded tool detail ── */}
      {expandedTool !== null && result.toolCalls[expandedTool] && (
        <div className="p-3 rounded-lg bg-card border border-border space-y-2 animate-flow-in">
          <div className="flex items-center justify-between">
            <code className="text-[10px] font-mono text-[#7c3aed]">{result.toolCalls[expandedTool].tool}</code>
            <button onClick={() => setExpandedTool(null)} className="text-[10px] text-muted-foreground">close</button>
          </div>
          {result.toolCalls[expandedTool].params && Object.keys(result.toolCalls[expandedTool].params).length > 0 && (
            <div className="text-[10px] text-muted-foreground">
              <span className="font-semibold">Input:</span>{' '}
              {Object.entries(result.toolCalls[expandedTool].params).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-card border border-border mr-1">
                  <span className="text-foreground">{k}:</span> <span>{String(v).slice(0, 40)}</span>
                </span>
              ))}
            </div>
          )}
          {result.toolCalls[expandedTool].result && (
            <div className="text-[10px] font-mono text-muted-foreground max-h-24 overflow-y-auto bg-background/50 p-2 rounded">
              {JSON.stringify(result.toolCalls[expandedTool].result, null, 1).slice(0, 500)}
            </div>
          )}
        </div>
      )}

      {/* ── Deals referenced (clickable cards) ── */}
      {mentionedDeals.length > 0 && !compact && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mentionedDeals.slice(0, 4).map(deal => (
            <button key={deal.id}
              onClick={() => onDealClick?.(deal.id)}
              className="flex-shrink-0 p-3 rounded-lg border border-border bg-card hover:border-[#7c3aed]/30 transition-all min-w-[160px] text-left group">
              <div className="text-xs font-semibold text-foreground group-hover:text-[#7c3aed] truncate">{deal.customer}</div>
              <div className="text-[10px] text-muted-foreground truncate">{deal.name}</div>
              {deal.tcv > 0 && (
                <div className="text-[10px] font-bold text-foreground mt-1">${(deal.tcv / 1000).toFixed(0)}k</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Parsed answer as interactive cards ── */}
      <div className="space-y-2">
        {parsedItems.map((item, i) => {
          if (item.type === 'header') {
            return (
              <div key={i} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3 mb-1">
                {item.text}
              </div>
            );
          }

          const isRisk = item.type === 'risk';
          const isPositive = item.type === 'positive';
          const isTaskCreated = createdTasks.has(i);

          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
              isRisk ? 'bg-red-500/5 border-red-500/15' :
              isPositive ? 'bg-emerald-500/5 border-emerald-500/15' :
              'bg-card border-border'
            } ${isTaskCreated ? 'opacity-60' : ''}`}>
              {/* Number / indicator */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                isRisk ? 'bg-red-500/15 text-red-400' :
                isPositive ? 'bg-emerald-500/15 text-emerald-400' :
                'bg-[#7c3aed]/10 text-[#7c3aed]'
              }`}>
                {isTaskCreated ? <Check className="h-3 w-3" /> :
                 isRisk ? <AlertTriangle className="h-3 w-3" /> :
                 isPositive ? <TrendingUp className="h-3 w-3" /> :
                 <span>{i + 1}</span>}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground leading-relaxed">{item.text}</div>
                {item.amount && (
                  <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold text-foreground bg-card border border-border rounded px-1.5 py-0.5">
                    <DollarSign className="h-2.5 w-2.5" />{item.amount.replace('$', '')}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.taskable && !isTaskCreated && (
                  <button
                    onClick={() => handleCreateTaskFromItem(item, i)}
                    className="p-1.5 rounded-md bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors"
                    title="Create task"
                  >
                    <CheckSquare className="h-3 w-3" />
                  </button>
                )}
                {item.dealId && onDealClick && (
                  <button
                    onClick={() => onDealClick(item.dealId!)}
                    className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    title="Open deal"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Follow-up agent chain (neural network) ── */}
      {followUps.length > 0 && onAgentInvoke && (
        <div className="p-3 rounded-xl border border-dashed border-[#7c3aed]/20 bg-[#7c3aed]/3 space-y-2">
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 text-[#7c3aed]" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Continue with</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {followUps.map(fu => {
              const fuMeta = AGENT_META[fu.agentId] || { label: fu.agentId, color: '#7c3aed', icon: Brain };
              const FuIcon = fuMeta.icon;
              const isRunning = followUpRunning === fu.agentId;
              return (
                <button key={fu.agentId}
                  onClick={() => handleFollowUp(fu)}
                  disabled={!!followUpRunning}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:border-[#7c3aed]/30 transition-all text-left disabled:opacity-50 group"
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${fuMeta.color}15` }}>
                    {isRunning ? <Loader2 className="h-3 w-3 animate-spin" style={{ color: fuMeta.color }} /> :
                     <FuIcon className="h-3 w-3" style={{ color: fuMeta.color }} />}
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-foreground group-hover:text-[#7c3aed]">{fu.label}</div>
                    <div className="text-[9px] text-muted-foreground">{fuMeta.label} agent</div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground ml-1" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
