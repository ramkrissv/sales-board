'use client';

import { useState } from 'react';
import { Bot, Shield, Palette, Bell } from 'lucide-react';
import { AVAILABLE_MODELS } from '@/lib/ai/config';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance' | 'notifications'>('ai');

  const tabs = [
    { id: 'ai' as const, label: 'AI & Agents', icon: Bot },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--g-line)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#7c3aed] text-[#7c3aed]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Default Model */}
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label">Default AI Model</div>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map(model => (
                <label key={model.model} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-[#7c3aed]/30 cursor-pointer transition-all">
                  <input type="radio" name="model" defaultChecked={model.isDefault} className="accent-[#7c3aed]" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{model.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">{model.provider} · {model.model}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {model.maxTokens} tokens · temp {model.temperature}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* API Keys */}
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label">API Keys</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Anthropic API Key</label>
                <input
                  type="password"
                  defaultValue="sk-ant-api03-****"
                  className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40"
                  readOnly
                />
                <p className="text-[11px] text-muted-foreground mt-1">Configured via environment variable</p>
              </div>
            </div>
          </div>

          {/* Global Guardrails */}
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label flex items-center gap-1.5"><Shield className="h-3 w-3" /> Global Guardrails</div>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="text-sm text-foreground">Require approval for external actions</div>
                  <div className="text-[11px] text-muted-foreground">Emails, stage changes, TCV modifications</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#7c3aed] h-4 w-4" />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="text-sm text-foreground">Log all agent actions</div>
                  <div className="text-[11px] text-muted-foreground">Full audit trail of AI decisions</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#7c3aed] h-4 w-4" />
              </label>
              <label className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="text-sm text-foreground">Enable auto-invoke agents</div>
                  <div className="text-[11px] text-muted-foreground">Agents can trigger on events without manual invocation</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#7c3aed] h-4 w-4" />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="g-surface g-elevated p-5 space-y-4">
          <div className="g-section-label">Theme</div>
          <p className="text-sm text-muted-foreground">
            Toggle between dark and light mode using the sun/moon icon in the sidebar.
          </p>
          <div className="g-section-label mt-4">Dot Grid Background</div>
          <p className="text-sm text-muted-foreground">
            The subtle dot grid pattern is part of the Galent design system and is always on.
          </p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="g-surface g-elevated p-5 space-y-4">
          <div className="g-section-label">Notification Preferences</div>
          <div className="space-y-3">
            {[
              { label: 'Deal stage changes', desc: 'When a deal moves to a new stage' },
              { label: 'Overdue tasks', desc: 'When tasks pass their due date' },
              { label: 'AI agent signals', desc: 'When agents detect risks or opportunities' },
              { label: 'Contract expiry reminders', desc: 'Before contracts expire' },
              { label: 'New deal assignments', desc: 'When deals are assigned to you' },
            ].map(pref => (
              <label key={pref.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="text-sm text-foreground">{pref.label}</div>
                  <div className="text-[11px] text-muted-foreground">{pref.desc}</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#7c3aed] h-4 w-4" />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
