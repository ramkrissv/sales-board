'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Database, Megaphone, Mail, Calendar, MessageSquare, HardDrive,
  CheckCircle2, XCircle, AlertCircle, Settings, Power, PowerOff, ChevronDown, ChevronUp,
  Sparkles, Search, X, Loader2, Globe, Shield, ArrowRight, Plus,
  FolderKanban, BarChart3, DollarSign, Users, Code2, Box,
} from 'lucide-react';

const typeIcons: Record<string, any> = {
  crm: Database,
  marketing: Megaphone,
  email: Mail,
  calendar: Calendar,
  messaging: MessageSquare,
  storage: HardDrive,
  project_management: FolderKanban,
  analytics: BarChart3,
  finance: DollarSign,
  hr: Users,
  devtools: Code2,
  other: Box,
};

const typeBadgeColor: Record<string, string> = {
  crm: 'bg-blue-500/15 text-blue-400',
  marketing: 'bg-purple-500/15 text-purple-400',
  email: 'bg-amber-500/15 text-amber-400',
  calendar: 'bg-emerald-500/15 text-emerald-400',
  messaging: 'bg-pink-500/15 text-pink-400',
  storage: 'bg-cyan-500/15 text-cyan-400',
  project_management: 'bg-orange-500/15 text-orange-400',
  analytics: 'bg-indigo-500/15 text-indigo-400',
  finance: 'bg-green-500/15 text-green-400',
  hr: 'bg-rose-500/15 text-rose-400',
  devtools: 'bg-slate-500/15 text-slate-400',
  other: 'bg-zinc-500/15 text-zinc-400',
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  connected: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-zinc-500', label: 'Disconnected' },
  error: { icon: AlertCircle, color: 'text-red-400', label: 'Error' },
};

const directionBadge: Record<string, string> = {
  read: 'bg-blue-500/15 text-blue-400',
  write: 'bg-orange-500/15 text-orange-400',
  both: 'bg-purple-500/15 text-purple-400',
};

export default function IntegrationsPage() {
  const utils = trpc.useUtils();
  const { data: integrations = [], isLoading } = trpc.integration.list.useQuery();
  const connectMutation = trpc.integration.connect.useMutation({ onSuccess: () => utils.integration.list.invalidate() });
  const disconnectMutation = trpc.integration.disconnect.useMutation({ onSuccess: () => utils.integration.list.invalidate() });
  const discoverMutation = trpc.integration.discover.useMutation();
  const addDiscoveredMutation = trpc.integration.addDiscovered.useMutation({
    onSuccess: () => {
      utils.integration.list.invalidate();
      setDiscoveredResult(null);
      setDiscoverInput('');
      setShowDiscoverModal(false);
    },
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [discoverInput, setDiscoverInput] = useState('');
  const [discoveredResult, setDiscoveredResult] = useState<any>(null);

  const handleDiscover = async () => {
    if (!discoverInput.trim()) return;
    setDiscoveredResult(null);
    const result = await discoverMutation.mutateAsync({ serviceName: discoverInput.trim() });
    setDiscoveredResult(result);
  };

  const handleAddDiscovered = () => {
    if (!discoveredResult) return;
    addDiscoveredMutation.mutate({
      name: discoveredResult.name,
      type: discoveredResult.type || 'other',
      description: discoveredResult.description || '',
      website: discoveredResult.website,
      authMethod: discoveredResult.authMethod,
      availableActions: discoveredResult.availableActions,
      category: discoveredResult.category,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading integrations...</div>;
  }

  const connected = integrations.filter((i: any) => i.status === 'connected').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">{connected} of {integrations.length} connected</p>
        </div>
        <button
          onClick={() => setShowDiscoverModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Discover
        </button>
      </div>

      {/* Discover Modal */}
      {showDiscoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowDiscoverModal(false); setDiscoveredResult(null); setDiscoverInput(''); }} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl g-surface border border-border shadow-2xl">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Discover New Integration</h2>
                    <p className="text-xs text-muted-foreground">Can&apos;t find a service? Let AI discover it for you</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowDiscoverModal(false); setDiscoveredResult(null); setDiscoverInput(''); }}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Search input */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">What service do you want to integrate?</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={discoverInput}
                      onChange={e => setDiscoverInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleDiscover(); }}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-500/40 placeholder:text-muted-foreground"
                      placeholder="e.g., Salesforce, Jira, Slack, HubSpot..."
                      disabled={discoverMutation.isPending}
                    />
                  </div>
                  <button
                    onClick={handleDiscover}
                    disabled={!discoverInput.trim() || discoverMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    Discover
                  </button>
                </div>
              </div>

              {/* How it works */}
              {!discoveredResult && !discoverMutation.isPending && (
                <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-4">
                  <p className="text-xs font-medium text-purple-400 mb-3">How it works</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { step: '1', text: 'Type any service name' },
                      { step: '2', text: 'AI researches the service' },
                      { step: '3', text: 'Review integration details' },
                      { step: '4', text: 'Add it to your platform' },
                    ].map(s => (
                      <div key={s.step} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0">{s.step}</span>
                        <span className="text-xs text-muted-foreground">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {discoverMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                  <p className="text-sm text-muted-foreground">AI is researching <span className="text-foreground font-medium">{discoverInput}</span>...</p>
                </div>
              )}

              {/* Error state */}
              {discoverMutation.isError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-sm text-red-400">Failed to discover integration. Please try again.</p>
                </div>
              )}

              {/* Discovered result */}
              {discoveredResult && !discoverMutation.isPending && (
                <div className="rounded-xl border border-purple-500/20 overflow-hidden" style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.08)' }}>
                  <div className="bg-purple-500/5 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                        {(() => { const Icon = typeIcons[discoveredResult.type] || Box; return <Icon className="h-5 w-5 text-purple-400" />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{discoveredResult.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[discoveredResult.type] || typeBadgeColor.other}`}>
                            {discoveredResult.type}
                          </span>
                          {discoveredResult.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-500/15 text-zinc-400">
                              {discoveredResult.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{discoveredResult.description}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {discoveredResult.website && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              {discoveredResult.website}
                            </span>
                          )}
                          {discoveredResult.authMethod && (
                            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                              <Shield className="h-3 w-3" />
                              {discoveredResult.authMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {discoveredResult.availableActions && discoveredResult.availableActions.length > 0 && (
                    <div className="px-5 py-3 border-t border-border">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Available Actions</span>
                      <div className="mt-2 space-y-1.5">
                        {discoveredResult.availableActions.map((action: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-foreground">{action.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${directionBadge[action.direction] || directionBadge.both}`}>
                              {action.direction}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">{action.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data types */}
                  {discoveredResult.availableDataTypes && discoveredResult.availableDataTypes.length > 0 && (
                    <div className="px-5 py-3 border-t border-border">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Available Data Types</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {discoveredResult.availableDataTypes.map((dt: string, i: number) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                            {dt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error from parse */}
                  {discoveredResult.error && (
                    <div className="px-5 py-3 border-t border-border">
                      <p className="text-xs text-amber-400">{discoveredResult.error}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                    <button
                      onClick={() => { setDiscoveredResult(null); setDiscoverInput(''); }}
                      className="px-4 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddDiscovered}
                      disabled={addDiscoveredMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {addDiscoveredMutation.isPending ? 'Adding...' : 'Add to Platform'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                      {integration.createdBy === 'ai-discovery' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-500/15 text-purple-400 flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI
                        </span>
                      )}
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
