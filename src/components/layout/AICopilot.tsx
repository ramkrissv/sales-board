'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Bot, Search, Sparkles, FileText, Send } from 'lucide-react';

const agentModes = [
  { id: 'deal-coach', label: 'Deal Coach', icon: Bot },
  { id: 'research', label: 'Research Agent', icon: Search },
  { id: 'insights', label: 'Live Insights', icon: Sparkles },
  { id: 'log', label: 'Activity Log', icon: FileText },
];

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AICopilot({ isOpen, onClose }: AICopilotProps) {
  const [activeMode, setActiveMode] = useState('deal-coach');

  if (!isOpen) return null;

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 z-40 flex flex-col shadow-xl shadow-purple-500/5">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
            <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-950" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Copilot</div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
            Active: Deal Coach
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Agent Mode Switcher */}
      <div className="p-3 space-y-1">
        {agentModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeMode === mode.id
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
            )}
          >
            <mode.icon className="h-4 w-4" />
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {activeMode === 'deal-coach' && (
          <>
            <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Strategic Insight
            </div>
            <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Pipeline Analysis</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Your pipeline is healthy with 31 active opportunities. Consider focusing on the 3 deals in Negotiation stage — they have the highest near-term close probability.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recommended Actions
            </div>
            <div className="space-y-2">
              <button className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <span>Review at-risk deals</span>
                <span className="text-slate-400">→</span>
              </button>
              <button className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <span>Draft follow-up emails</span>
                <span className="text-slate-400">→</span>
              </button>
            </div>
          </>
        )}

        {activeMode === 'insights' && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Live insights will appear here as agents detect signals across your pipeline.</p>
          </div>
        )}

        {activeMode === 'research' && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Research Agent is idle. Select a deal or account to activate research.</p>
          </div>
        )}

        {activeMode === 'log' && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Activity log will show all agent and human actions here.</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="relative">
          <input
            type="text"
            placeholder="Ask AI Copilot..."
            className="w-full pl-4 pr-10 py-2.5 text-sm bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition-colors">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
