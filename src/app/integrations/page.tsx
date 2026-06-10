'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Database, Megaphone, Mail, Calendar, MessageSquare, HardDrive,
  CheckCircle2, XCircle, AlertCircle, Settings, Power, PowerOff, ChevronDown, ChevronUp,
} from 'lucide-react';

const typeIcons: Record<string, any> = {
  crm: Database,
  marketing: Megaphone,
  email: Mail,
  calendar: Calendar,
  messaging: MessageSquare,
  storage: HardDrive,
};

const typeBadgeColor: Record<string, string> = {
  crm: 'bg-blue-500/15 text-blue-400',
  marketing: 'bg-purple-500/15 text-purple-400',
  email: 'bg-amber-500/15 text-amber-400',
  calendar: 'bg-emerald-500/15 text-emerald-400',
  messaging: 'bg-pink-500/15 text-pink-400',
  storage: 'bg-cyan-500/15 text-cyan-400',
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  connected: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-zinc-500', label: 'Disconnected' },
  error: { icon: AlertCircle, color: 'text-red-400', label: 'Error' },
};

export default function IntegrationsPage() {
  const utils = trpc.useUtils();
  const { data: integrations = [], isLoading } = trpc.integration.list.useQuery();
  const connectMutation = trpc.integration.connect.useMutation({ onSuccess: () => utils.integration.list.invalidate() });
  const disconnectMutation = trpc.integration.disconnect.useMutation({ onSuccess: () => utils.integration.list.invalidate() });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading integrations...</div>;
  }

  const connected = integrations.filter((i: any) => i.status === 'connected').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">{connected} of {integrations.length} connected</p>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration: any) => {
          const Icon = typeIcons[integration.type] || Database;
          const status = statusConfig[integration.status] || statusConfig.disconnected;
          const StatusIcon = status.icon;
          const isExpanded = expandedId === integration._id;
          const isConnected = integration.status === 'connected';

          return (
            <div key={integration._id} className="rounded-xl g-surface g-elevated overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{integration.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[integration.type] || 'bg-zinc-500/15 text-zinc-400'}`}>
                        {integration.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{integration.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                        <span className={`text-xs ${status.color}`}>{status.label}</span>
                      </div>
                      {integration.lastSyncAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Last sync: {new Date(integration.lastSyncAt).toLocaleDateString()}
                        </span>
                      )}
                      {isConnected && integration.syncHealth != null && (
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${integration.syncHealth >= 70 ? 'bg-emerald-500' : integration.syncHealth >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${integration.syncHealth}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{integration.syncHealth}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setExpandedId(isExpanded ? null : integration._id);
                        setConfigForm({ apiKey: '', connectionUrl: '' });
                      }}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                      title="Configure"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                    </button>
                    {isConnected ? (
                      <button
                        onClick={() => disconnectMutation.mutate({ id: integration._id })}
                        disabled={disconnectMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                        title="Disconnect"
                      >
                        <PowerOff className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => connectMutation.mutate({ id: integration._id })}
                        disabled={connectMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                        title="Connect"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Config panel */}
              {isExpanded && (
                <div className="px-5 pb-4 border-t border-border pt-4">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground g-section-label">Configuration</span>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                      <input
                        type="password"
                        value={configForm.apiKey || ''}
                        onChange={e => setConfigForm(p => ({ ...p, apiKey: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                        placeholder="Enter API key..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Connection URL</label>
                      <input
                        value={configForm.connectionUrl || ''}
                        onChange={e => setConfigForm(p => ({ ...p, connectionUrl: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40"
                        placeholder="https://api.example.com"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setExpandedId(null)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          connectMutation.mutate({ id: integration._id, config: configForm });
                          setExpandedId(null);
                        }}
                        disabled={connectMutation.isPending}
                        className="px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        Save & Connect
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
