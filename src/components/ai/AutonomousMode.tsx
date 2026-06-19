'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Zap, Shield, Loader2, CheckCircle, XCircle, Clock, Play,
  Pause, AlertTriangle, ArrowRight, Sparkles, ChevronDown, ChevronUp,
  RefreshCw, Eye, Settings,
} from 'lucide-react';

interface QueueItem {
  id: string;
  type: 'low_risk' | 'high_risk';
  action: string;
  description: string;
  dealName?: string;
  dealId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'executing';
  confidence: number;
  agent: string;
  createdAt: Date;
}

interface AutonomousModeProps {
  onDealClick?: (id: string) => void;
}

// Simulated autonomous actions that would be detected by agents
const LOW_RISK_ACTIONS = [
  { action: 'log_activity', description: 'Log follow-up note for stale deals', agent: 'hygiene-agent' },
  { action: 'send_notification', description: 'Send reminder for overdue tasks', agent: 'hygiene-agent' },
  { action: 'update_tags', description: 'Auto-tag deals by industry pattern', agent: 'hygiene-agent' },
  { action: 'enrich_data', description: 'Fill missing deal metadata from context', agent: 'research-agent' },
];

const HIGH_RISK_ACTIONS = [
  { action: 'change_stage', description: 'Move deal to next stage based on gate criteria', agent: 'deal-coach' },
  { action: 'update_tcv', description: 'Update TCV based on proposal pricing', agent: 'deal-coach' },
  { action: 'create_task', description: 'Create action items from meeting notes', agent: 'deal-coach' },
  { action: 'send_email', description: 'Send follow-up email to stakeholder', agent: 'outreach-agent' },
];

export default function AutonomousMode({ onDealClick }: AutonomousModeProps) {
  const [enabled, setEnabled] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState({ executed: 0, pending: 0, rejected: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [autoApproveThreshold, setAutoApproveThreshold] = useState(90); // confidence % for auto-approve
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const quickInvokeMutation = trpc.harness.quickInvoke.useMutation();

  // Simulate discovering actions when autonomous mode is enabled
  useEffect(() => {
    if (!enabled || queue.length > 0) return;

    // Generate sample queue items from opportunities
    const sampleQueue: QueueItem[] = [
      ...LOW_RISK_ACTIONS.map((a, i) => ({
        id: `auto-low-${i}-${Date.now()}`,
        type: 'low_risk' as const,
        action: a.action,
        description: a.description,
        status: 'pending' as const,
        confidence: 85 + Math.floor(Math.random() * 15),
        agent: a.agent,
        createdAt: new Date(Date.now() - i * 300000),
      })),
      ...HIGH_RISK_ACTIONS.map((a, i) => ({
        id: `auto-high-${i}-${Date.now()}`,
        type: 'high_risk' as const,
        action: a.action,
        description: a.description,
        status: 'pending' as const,
        confidence: 65 + Math.floor(Math.random() * 25),
        agent: a.agent,
        createdAt: new Date(Date.now() - i * 600000),
      })),
    ];

    setQueue(sampleQueue);
    updateStats(sampleQueue);
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateStats(q: QueueItem[]) {
    setStats({
      executed: q.filter(i => i.status === 'executed').length,
      pending: q.filter(i => i.status === 'pending').length,
      rejected: q.filter(i => i.status === 'rejected').length,
    });
  }

  // Auto-execute low-risk items above threshold
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      setQueue(prev => {
        const updated = prev.map(item => {
          if (item.status === 'pending' && item.type === 'low_risk' && item.confidence >= autoApproveThreshold) {
            return { ...item, status: 'executed' as const };
          }
          return item;
        });
        updateStats(updated);
        return updated;
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [enabled, autoApproveThreshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = (id: string) => {
    setQueue(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, status: 'executing' as const } : item
      );
      // Simulate execution delay
      setTimeout(() => {
        setQueue(p => {
          const final = p.map(item =>
            item.id === id ? { ...item, status: 'executed' as const } : item
          );
          updateStats(final);
          return final;
        });
      }, 1500);
      return updated;
    });
  };

  const handleReject = (id: string) => {
    setQueue(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, status: 'rejected' as const } : item
      );
      updateStats(updated);
      return updated;
    });
  };

  const handleApproveAll = () => {
    setQueue(prev => {
      const updated = prev.map(item =>
        item.status === 'pending' ? { ...item, status: 'executed' as const } : item
      );
      updateStats(updated);
      return updated;
    });
  };

  const handleScan = () => {
    quickInvokeMutation.mutate({ action: 'find_at_risk_deals' as any });
  };

  const pendingItems = queue.filter(i => i.status === 'pending');
  const executedItems = queue.filter(i => i.status === 'executed');
  const highRiskPending = pendingItems.filter(i => i.type === 'high_risk');

  return (
    <div className="space-y-4">
      {/* Toggle header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            enabled ? 'bg-emerald-500/15' : 'bg-secondary'
          }`}>
            <Zap className={`h-5 w-5 ${enabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              Autonomous Mode
              {enabled && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium animate-pulse">ACTIVE</span>}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {enabled
                ? `${stats.executed} executed · ${stats.pending} pending approval · ${stats.rejected} rejected`
                : 'AI auto-executes low-risk actions, queues high-risk for approval'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-secondary border border-border'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3 animate-flow-in">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Autonomous Settings</div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-foreground flex-1">Auto-approve confidence threshold</label>
            <div className="flex items-center gap-2">
              <input type="range" min={50} max={100} value={autoApproveThreshold}
                onChange={e => setAutoApproveThreshold(Number(e.target.value))}
                className="w-24 accent-[#7c3aed]" />
              <span className="text-xs font-mono text-foreground w-8">{autoApproveThreshold}%</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Low-risk actions with confidence above {autoApproveThreshold}% will auto-execute. High-risk actions always require approval.
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[9px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Auto: log_activity, send_notification, update_tags, enrich_data</span>
            <span className="text-[9px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">Approval: change_stage, update_tcv, create_task, send_email</span>
          </div>
        </div>
      )}

      {!enabled && (
        <div className="p-6 rounded-xl bg-card border border-border text-center">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-xs text-muted-foreground mb-3">Enable autonomous mode to let AI agents continuously monitor and act on your pipeline</p>
          <button onClick={handleScan} disabled={quickInvokeMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors mx-auto disabled:opacity-50">
            {quickInvokeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Run One-Time Scan
          </button>
        </div>
      )}

      {/* Approval queue */}
      {enabled && highRiskPending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Approval Queue ({highRiskPending.length})
            </div>
            <button onClick={handleApproveAll}
              className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Approve All
            </button>
          </div>
          {highRiskPending.map(item => (
            <div key={item.id} className="p-3 rounded-xl bg-card border border-amber-500/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{item.description}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="font-mono">{item.agent}</span>
                  <span>·</span>
                  <span>{item.confidence}% confidence</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.status === 'executing' ? (
                  <Loader2 className="h-4 w-4 text-[#7c3aed] animate-spin" />
                ) : (
                  <>
                    <button onClick={() => handleApprove(item.id)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Approve">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleReject(item.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Reject">
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execution log */}
      {enabled && executedItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3" /> Auto-Executed ({executedItems.length})
          </div>
          {executedItems.slice(0, 6).map(item => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 text-xs">
              <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-foreground flex-1">{item.description}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{item.agent}</span>
              <span className="text-[10px] text-emerald-400">{item.confidence}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
