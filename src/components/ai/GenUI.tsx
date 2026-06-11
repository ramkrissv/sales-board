'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare, ArrowRight, AlertTriangle, Target, DollarSign,
  Users, Calendar, Sparkles, TrendingUp, BarChart3, Clock,
  Mail, Phone, FileText, Loader2, Zap, Eye
} from 'lucide-react';

// GenUI component types that AI can generate
export type GenUIBlock =
  | { type: 'text'; content: string }
  | { type: 'heading'; content: string; level?: 1 | 2 | 3 }
  | { type: 'metric_card'; label: string; value: string; change?: string; changeDir?: 'up' | 'down'; color?: string }
  | { type: 'metric_row'; metrics: { label: string; value: string; color?: string }[] }
  | { type: 'deal_card'; id: string; customer: string; name: string; stage: string; tcv: number; owner: string; risk?: string }
  | { type: 'deal_list'; deals: { id: string; customer: string; stage: string; tcv: number; owner: string; action?: string }[] }
  | { type: 'action_button'; label: string; action: string; variant?: 'primary' | 'secondary' | 'warning' | 'success'; data?: any }
  | { type: 'action_row'; actions: { label: string; action: string; variant?: string; data?: any }[] }
  | { type: 'warning'; message: string; severity?: 'low' | 'medium' | 'high' | 'critical' }
  | { type: 'success'; message: string }
  | { type: 'progress_bar'; label: string; value: number; max: number; color?: string }
  | { type: 'stage_flow'; stages: { name: string; count: number; tcv: number; active?: boolean }[] }
  | { type: 'contact_card'; name: string; title: string; email?: string; role?: string }
  | { type: 'task_list'; tasks: { name: string; owner: string; due: string; priority: string; done?: boolean }[] }
  | { type: 'divider' }
  | { type: 'insight'; content: string; category?: string };

interface GenUIProps {
  blocks: GenUIBlock[];
  onAction?: (action: string, data?: any) => void;
}

const iconMap: Record<string, any> = {
  deal: Target, money: DollarSign, user: Users, calendar: Calendar,
  task: CheckSquare, trend: TrendingUp, chart: BarChart3, clock: Clock,
  mail: Mail, file: FileText, alert: AlertTriangle, sparkle: Sparkles,
};

export function GenUI({ blocks, onAction }: GenUIProps) {
  const handleAction = (action: string, data?: any) => {
    if (onAction) onAction(action, data);
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text':
            return <p key={i} className="text-sm text-foreground leading-relaxed">{block.content}</p>;

          case 'heading': {
            const Tag = block.level === 1 ? 'h1' : block.level === 3 ? 'h3' : 'h2';
            const sizes = { 1: 'text-lg', 2: 'text-sm', 3: 'text-xs' };
            return <Tag key={i} className={`font-semibold text-foreground ${sizes[block.level || 2]}`}>{block.content}</Tag>;
          }

          case 'metric_card':
            return (
              <div key={i} className="p-3 rounded-xl g-surface g-elevated hover-lift inline-block mr-2">
                <div className="g-section-label mb-1">{block.label}</div>
                <div className="g-kpi text-foreground" style={{ fontSize: '20px', color: block.color }}>{block.value}</div>
                {block.change && (
                  <span className={`text-[10px] font-medium ${block.changeDir === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {block.changeDir === 'up' ? '\u2191' : '\u2193'} {block.change}
                  </span>
                )}
              </div>
            );

          case 'metric_row':
            return (
              <div key={i} className="grid grid-cols-4 gap-2">
                {block.metrics.map((m, j) => (
                  <div key={j} className="p-3 rounded-lg g-surface g-elevated text-center hover-lift">
                    <div className="g-section-label mb-1">{m.label}</div>
                    <div className="text-lg font-bold text-foreground" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            );

          case 'deal_card':
            return (
              <button key={i} onClick={() => handleAction('open_deal', { id: block.id })}
                className="w-full p-3 rounded-xl g-surface g-elevated hover-glow text-left transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{block.customer}</div>
                    <div className="text-xs text-muted-foreground">{block.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="g-metric text-sm font-bold">${(block.tcv/1000).toFixed(0)}k</span>
                    <span className="g-chip bg-[#5B4FE9]/10 text-[#5B4FE9]">{block.stage}</span>
                  </div>
                </div>
                {block.risk && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
                    <AlertTriangle className="h-3 w-3" /> {block.risk}
                  </div>
                )}
              </button>
            );

          case 'deal_list':
            return (
              <div key={i} className="space-y-1.5">
                {block.deals.map((deal, j) => (
                  <button key={j} onClick={() => handleAction('open_deal', { id: deal.id })}
                    className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-card border border-border hover:border-[#5B4FE9]/20 text-left transition-all text-xs reveal"
                    style={{ animationDelay: `${j * 0.05}s` }}>
                    <span className="font-medium text-foreground flex-1">{deal.customer}</span>
                    <span className="g-chip bg-secondary text-muted-foreground">{deal.stage}</span>
                    <span className="g-metric text-foreground">${(deal.tcv/1000).toFixed(0)}k</span>
                    <span className="text-muted-foreground">{deal.owner}</span>
                    {deal.action && (
                      <button onClick={(e) => { e.stopPropagation(); handleAction(deal.action!, deal); }}
                        className="px-2 py-0.5 rounded bg-[#5B4FE9]/10 text-[#5B4FE9] text-[10px] hover:bg-[#5B4FE9]/20">
                        Act
                      </button>
                    )}
                  </button>
                ))}
              </div>
            );

          case 'action_button': {
            const variants: Record<string, string> = {
              primary: 'bg-[#5B4FE9] text-white hover:bg-[#4A3ED4]',
              secondary: 'bg-card border border-border text-foreground hover:border-[#5B4FE9]/30',
              warning: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
              success: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
            };
            return (
              <button key={i} onClick={() => handleAction(block.action, block.data)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${variants[block.variant || 'primary']}`}>
                {block.label}
              </button>
            );
          }

          case 'action_row':
            return (
              <div key={i} className="flex flex-wrap gap-2">
                {block.actions.map((a, j) => (
                  <button key={j} onClick={() => handleAction(a.action, a.data)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      a.variant === 'warning' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' :
                      a.variant === 'success' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' :
                      'bg-[#5B4FE9]/10 text-[#5B4FE9] hover:bg-[#5B4FE9]/20'
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            );

          case 'warning': {
            const sevColors: Record<string, string> = {
              critical: 'bg-red-500/10 border-red-500/20 text-red-400',
              high: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
              medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
              low: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
            };
            return (
              <div key={i} className={`p-3 rounded-lg border flex items-start gap-2 text-xs ${sevColors[block.severity || 'medium']}`}>
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{block.message}</span>
              </div>
            );
          }

          case 'success':
            return (
              <div key={i} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
                <CheckSquare className="h-3.5 w-3.5" /> {block.message}
              </div>
            );

          case 'progress_bar': {
            const pct = Math.min(100, (block.value / block.max) * 100);
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{block.label}</span>
                  <span className="g-metric text-foreground">{block.value}/{block.max}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: block.color || '#5B4FE9' }} />
                </div>
              </div>
            );
          }

          case 'stage_flow':
            return (
              <div key={i} className="flex items-center gap-1">
                {block.stages.map((s, j) => (
                  <div key={j} className={`flex-1 p-2 rounded-lg text-center transition-all ${s.active ? 'bg-[#5B4FE9]/10 border border-[#5B4FE9]/30' : 'bg-card border border-border'}`}>
                    <div className={`text-lg font-bold ${s.active ? 'text-[#5B4FE9]' : 'text-foreground'}`}>{s.count}</div>
                    <div className="text-[9px] text-muted-foreground">{s.name}</div>
                    <div className="text-[9px] text-muted-foreground">${(s.tcv/1000).toFixed(0)}k</div>
                  </div>
                ))}
              </div>
            );

          case 'task_list':
            return (
              <div key={i} className="space-y-1">
                {block.tasks.map((t, j) => (
                  <div key={j} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${t.done ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-card border-border'}`}>
                    <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${t.done ? 'bg-emerald-500/20 border-emerald-500' : 'border-muted-foreground'}`} />
                    <span className={`flex-1 ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.name}</span>
                    <span className="text-muted-foreground">{t.owner}</span>
                    <span className="text-muted-foreground">{t.due}</span>
                  </div>
                ))}
              </div>
            );

          case 'contact_card':
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="w-9 h-9 rounded-full bg-[#5B4FE9]/10 flex items-center justify-center text-[#5B4FE9] text-xs font-bold">
                  {block.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{block.name}</div>
                  <div className="text-xs text-muted-foreground">{block.title}</div>
                </div>
                {block.role && <span className="ml-auto g-chip bg-amber-500/10 text-amber-400">{block.role}</span>}
              </div>
            );

          case 'insight':
            return (
              <div key={i} className="p-3 rounded-lg bg-[#5B4FE9]/5 border border-[#5B4FE9]/20 flex items-start gap-2 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#5B4FE9] mt-0.5 flex-shrink-0" />
                <div>
                  {block.category && <span className="g-chip bg-[#5B4FE9]/10 text-[#5B4FE9] mr-1">{block.category}</span>}
                  <span className="text-foreground">{block.content}</span>
                </div>
              </div>
            );

          case 'divider':
            return <hr key={i} className="border-border" />;

          default:
            return null;
        }
      })}
    </div>
  );
}

/**
 * Parse AI text response into GenUI blocks.
 * Looks for structured patterns in the text and converts to rich components.
 */
export function parseToGenUI(text: string, opportunities?: any[]): GenUIBlock[] {
  const blocks: GenUIBlock[] = [];
  // Strip all markdown formatting before parsing
  const cleanText = text
    .replace(/#{1,4}\s*/g, '')           // Remove ## headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // Remove **bold**
    .replace(/\*([^*]+)\*/g, '$1')       // Remove *italic*
    .replace(/^---+$/gm, '')             // Remove horizontal rules
    .replace(/^-\s+/gm, '• ')           // Convert - bullets to •
    .replace(/🔴|🟡|🟢|⚠️|✅|❌|📊|📈|📉|💰|🎯|⏰/g, '') // Remove emoji
    .replace(/\n{3,}/g, '\n\n');         // Collapse multiple newlines
  const lines = cleanText.split('\n').filter(l => l.trim());
  const actionItems: { label: string; action: string; data?: any }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty, skip decorative lines
    if (trimmed.length < 3) continue;
    if (/^[-=_]{3,}$/.test(trimmed)) continue;
    if (/^NEXT ACTIONS|^IMMEDIATE|^CRITICAL|^HEALTH SCORE|^KEY RISKS/i.test(trimmed)) continue; // Skip section headers

    // KEY METRIC / Track metric — render as highlighted insight
    if (/key metric|track (this|today)|immediate win/i.test(trimmed)) {
      blocks.push({ type: 'insight', content: trimmed.replace(/\*\*/g, '').replace(/^KEY METRIC[:\s]*/i, ''), category: 'Key Metric' });
      continue;
    }

    // Headers
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      blocks.push({ type: 'heading', content: trimmed.replace(/\*\*/g, ''), level: 2 });
      continue;
    }
    if (trimmed.startsWith('###')) {
      blocks.push({ type: 'heading', content: trimmed.replace(/^#+\s*/, ''), level: 3 });
      continue;
    }

    // Numbered action items — the main content
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/\*\*/g, '');
      const isWarning = /risk|overdue|stale|missing|urgent|critical|block|slip/i.test(content);
      const isAction = /call|schedule|review|push|address|focus|submit|send|prepare|draft|update|follow/i.test(content);

      // Check if it mentions a known deal
      const matchedDeal = opportunities?.find(o => content.toLowerCase().includes(o.customerName.toLowerCase()));

      if (matchedDeal) {
        // Render as deal card
        blocks.push({
          type: 'deal_card',
          id: matchedDeal.id,
          customer: matchedDeal.customerName,
          name: content,
          stage: matchedDeal.status,
          tcv: matchedDeal.tcv || 0,
          owner: matchedDeal.primaryOwner,
          risk: isWarning ? 'Needs attention' : undefined,
        });

        // Also collect as an action
        if (isAction) {
          actionItems.push({ label: content.slice(0, 60), action: content, data: { id: matchedDeal.id, oppId: matchedDeal.id } });
        }
      } else if (isWarning) {
        blocks.push({ type: 'warning', message: content, severity: /critical|urgent/i.test(content) ? 'high' : 'medium' });
        if (isAction) actionItems.push({ label: content.slice(0, 60), action: content });
      } else {
        // Regular numbered step — render as text
        blocks.push({ type: 'text', content: `${trimmed.match(/^\d+/)?.[0]}. ${content}` });
        if (isAction) actionItems.push({ label: content.slice(0, 60), action: content });
      }
      continue;
    }

    // Dollar amounts / percentages in standalone lines — render as metrics
    const dollarMatch = trimmed.match(/\$[\d,.]+[kKmM]?/g);
    const pctMatch = trimmed.match(/\d+%/);
    if (dollarMatch && dollarMatch.length >= 2 && trimmed.length < 120) {
      blocks.push({ type: 'text', content: trimmed.replace(/\*\*/g, '') });
      continue;
    }

    // Pipeline stage summary line
    if (/by stage|discovery.*qualification|pipeline.*\$/i.test(trimmed)) {
      blocks.push({ type: 'insight', content: trimmed.replace(/\*\*/g, ''), category: 'Pipeline' });
      continue;
    }

    // Regular text
    blocks.push({ type: 'text', content: trimmed.replace(/\*\*/g, '') });
  }

  // Append action row if we collected actionable items
  if (actionItems.length > 0) {
    blocks.push({
      type: 'action_row',
      actions: actionItems.slice(0, 4).map(a => ({
        label: a.label,
        action: a.action,
        data: a.data,
        variant: a.data?.id ? 'primary' : undefined,
      })),
    });
  }

  return blocks;
}
