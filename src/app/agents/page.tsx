'use client';

import { useState } from 'react';
import { Bot, Shield } from 'lucide-react';
import { DEFAULT_AGENT_CONFIGS, AVAILABLE_MODELS } from '@/lib/ai/config';
import type { AgentConfig } from '@/lib/ai/config';

export default function AgentsPage() {
  const [agents] = useState<AgentConfig[]>(DEFAULT_AGENT_CONFIGS);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Agent Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.filter(a => a.isActive).length} active agents · {agents.length} total
          </p>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={`p-5 rounded-xl g-surface g-elevated text-left transition-all hover:border-[#7c3aed]/30 ${
              selectedAgent?.id === agent.id ? 'border-[#7c3aed]/50 ring-1 ring-[#7c3aed]/20' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-[#7c3aed]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">{agent.id}</div>
                </div>
              </div>
              <span className={`g-chip border ${agent.isActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'}`}>
                {agent.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Model: {agent.modelConfig.displayName}</span>
              <span>·</span>
              <span>{agent.tools.length} tools</span>
              {agent.schedule && <><span>·</span><span>Scheduled</span></>}
            </div>
          </button>
        ))}
      </div>

      {/* Agent detail panel */}
      {selectedAgent && (
        <div className="g-surface g-elevated p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{selectedAgent.name} Configuration</h2>
            <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground text-sm">
              Close
            </button>
          </div>

          {/* Model Selection */}
          <div>
            <div className="g-section-label mb-2">AI Model</div>
            <div className="grid grid-cols-3 gap-2">
              {AVAILABLE_MODELS.filter(m => m.provider === 'anthropic').map(model => (
                <div
                  key={model.model}
                  className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                    selectedAgent.modelConfig.model === model.model
                      ? 'border-[#7c3aed]/50 bg-[#7c3aed]/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-[#7c3aed]/30'
                  }`}
                >
                  <div className="font-medium">{model.displayName}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Max {model.maxTokens} tokens · Temp {model.temperature}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="g-section-label">System Prompt</div>
              <button
                onClick={() => setEditingPrompt(!editingPrompt)}
                className="text-xs text-[#7c3aed] hover:text-[#6B42EF]"
              >
                {editingPrompt ? 'Save' : 'Edit'}
              </button>
            </div>
            {editingPrompt ? (
              <textarea
                className="w-full h-40 px-3 py-2 text-xs font-mono bg-card border border-border rounded-lg text-foreground resize-none focus:outline-none focus:border-[#7c3aed]/40"
                defaultValue={selectedAgent.systemPrompt}
              />
            ) : (
              <pre className="text-xs text-muted-foreground bg-card border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-40">
                {selectedAgent.systemPrompt}
              </pre>
            )}
          </div>

          {/* Guardrails */}
          <div>
            <div className="g-section-label mb-2 flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Guardrails
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="text-[11px] text-muted-foreground">Max Actions/Min</div>
                <div className="text-sm font-medium text-foreground g-metric">{selectedAgent.guardrails.maxActionsPerMinute}</div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="text-[11px] text-muted-foreground">Token Budget/Day</div>
                <div className="text-sm font-medium text-foreground g-metric">{(selectedAgent.guardrails.maxTokenBudgetPerDay / 1000).toFixed(0)}k</div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="text-[11px] text-muted-foreground">Deterministic Mode</div>
                <div className="text-sm font-medium text-foreground">{selectedAgent.guardrails.deterministicMode ? 'Yes (temp=0)' : 'No'}</div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="text-[11px] text-muted-foreground">Auto Invoke</div>
                <div className="text-sm font-medium text-foreground">{selectedAgent.autoInvoke ? 'Yes' : 'Manual only'}</div>
              </div>
            </div>
          </div>

          {/* Requires Approval */}
          {selectedAgent.guardrails.requireApprovalFor.length > 0 && (
            <div>
              <div className="g-section-label mb-2">Requires Human Approval</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedAgent.guardrails.requireApprovalFor.map(action => (
                  <span key={action} className="g-chip bg-amber-500/10 text-amber-400 border border-amber-500/20">{action}</span>
                ))}
              </div>
            </div>
          )}

          {/* Blocked Actions */}
          {selectedAgent.guardrails.blockedActions.length > 0 && (
            <div>
              <div className="g-section-label mb-2">Blocked Actions</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedAgent.guardrails.blockedActions.map(action => (
                  <span key={action} className="g-chip bg-red-500/10 text-red-400 border border-red-500/20">{action}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tools */}
          <div>
            <div className="g-section-label mb-2">Available Tools</div>
            <div className="flex flex-wrap gap-1.5">
              {selectedAgent.tools.map(tool => (
                <span key={tool} className="g-chip bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20">{tool}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
