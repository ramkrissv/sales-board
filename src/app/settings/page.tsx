'use client';

import { useState, useEffect } from 'react';
import {
  Bot, Shield, Palette, Bell, Check, Puzzle, Copy, Download,
  ExternalLink, Mail, Video, Mic, Globe, FolderOpen, CheckCircle2,
  ArrowRight, Zap, Terminal, Code2, Server, Lock, Loader2, Smartphone,
  AlertTriangle
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AVAILABLE_MODELS, DEFAULT_AGENT_CONFIGS } from '@/lib/ai/config';
import { trpc } from '@/lib/trpc/client';

// ── Plugin definitions ──
interface PluginDef {
  id: string;
  name: string;
  icon: any;
  status: 'available' | 'coming_soon';
  description: string;
  downloadUrl?: string;
  downloadLabel?: string;
  installGuide?: string;
  setupSteps: string[];
  configFields: { key: string; label: string; placeholder: string }[];
  apiEndpoint: string;
  docsUrl: string;
  features?: string[];
}

const PLUGINS: PluginDef[] = [
  {
    id: 'outlook',
    name: 'Outlook Add-in',
    icon: Mail,
    status: 'available',
    description: 'Add a "Send to Galent" button in Outlook. Forwards emails to Signal for AI processing.',
    downloadUrl: '/plugins/outlook/manifest.xml',
    downloadLabel: 'Download Manifest (XML)',
    installGuide: 'Upload to admin.microsoft.com → Settings → Integrated apps → Upload custom apps',
    features: ['One-click "Send to Galent" from any email', 'AI extracts deal signals, contacts, action items', 'Auto-logs email threads to deal conversation', 'CC tracking for sent emails'],
    setupSteps: ['Download the manifest XML below', 'Go to admin.microsoft.com → Settings → Integrated apps', 'Click "Upload custom apps" and select the manifest', 'Assign to users or your entire organization', 'Users will see "SalesPilot" in their Outlook sidebar'],
    configFields: [
      { key: 'clientId', label: 'Azure AD Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'tenantId', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    ],
    apiEndpoint: '/api/trpc/ai.processIntake',
    docsUrl: 'https://learn.microsoft.com/en-us/office/dev/add-ins/',
  },
  {
    id: 'teams',
    name: 'Teams App',
    icon: Video,
    status: 'available',
    description: 'Capture meeting transcripts and chat messages. Bot posts deal updates to channels.',
    downloadUrl: '/plugins/teams/SalesPilot-Teams.zip',
    downloadLabel: 'Download App Package (ZIP)',
    installGuide: 'Teams → Apps → Manage your apps → Upload an app → Submit to your org',
    features: ['Auto-capture meeting transcripts', 'Chat message signal extraction', 'Deal update notifications in channels', 'Embedded SalesPilot tab in Teams'],
    setupSteps: ['Download the Teams app manifest below', 'Go to Teams Admin Center → Manage apps', 'Click "Upload new app" and select the manifest', 'Create a Bot registration in Azure Bot Service', 'Set messaging endpoint to your Galent webhook URL', 'Configure which channels to monitor'],
    configFields: [
      { key: 'botId', label: 'Bot ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'botSecret', label: 'Bot Secret', placeholder: '••••••••••' },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://your-galent.com/api/webhooks/teams' },
    ],
    apiEndpoint: '/api/webhooks/teams',
    docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/bots/',
  },
  {
    id: 'voice',
    name: 'Voice AI (Pipecat)',
    icon: Mic,
    status: 'available',
    description: 'Real-time voice AI assistant. Speak naturally, AI transcribes and processes deal updates.',
    features: ['Natural language voice input', 'Real-time speech-to-text (Deepgram)', 'AI processes and creates deal updates', 'Voice-to-lead capture'],
    setupSteps: ['Deploy the Pipecat Python server', 'Configure Deepgram API key for STT', 'Set the Pipecat server URL below'],
    configFields: [
      { key: 'pipecatUrl', label: 'Pipecat Server URL', placeholder: 'ws://localhost:8765' },
      { key: 'deepgramKey', label: 'Deepgram API Key', placeholder: 'dg-xxxxxxxxxxxx' },
    ],
    apiEndpoint: 'WebSocket',
    docsUrl: 'https://docs.pipecat.ai/',
  },
  {
    id: 'salesforce',
    name: 'Salesforce Sync',
    icon: Globe,
    status: 'coming_soon',
    description: 'Bidirectional sync between Galent and Salesforce. Deals, contacts, and activities flow both ways.',
    features: ['Bidirectional opportunity sync', 'Contact and account mapping', 'Activity log synchronization', 'Custom field mapping'],
    setupSteps: ['Create a Connected App in Salesforce Setup', 'Enable OAuth 2.0 with API access', 'Set callback URL to your Galent instance', 'Map Salesforce objects to Galent entities'],
    configFields: [
      { key: 'sfInstanceUrl', label: 'Salesforce Instance URL', placeholder: 'https://yourorg.salesforce.com' },
      { key: 'sfClientId', label: 'Connected App Client ID', placeholder: 'xxxxxxxxxxxx' },
      { key: 'sfClientSecret', label: 'Client Secret', placeholder: '••••••••••' },
    ],
    apiEndpoint: '/api/integrations/salesforce/sync',
    docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
  },
  {
    id: 'sharepoint',
    name: 'SharePoint Connector',
    icon: FolderOpen,
    status: 'available',
    description: 'Sync proposal documents, SOWs, and contracts to SharePoint. Auto-organize by deal.',
    features: ['Auto-upload proposals and SOWs', 'Organize by deal/account folders', 'Version tracking and sync status', 'Document library mapping'],
    setupSteps: ['Configure SharePoint site URL', 'Set up authentication (App Password or OAuth)', 'Map document libraries to deal stages', 'Enable auto-sync for generated proposals'],
    configFields: [
      { key: 'siteUrl', label: 'SharePoint Site URL', placeholder: 'https://yourcompany.sharepoint.com/sites/Sales' },
      { key: 'clientId', label: 'App Client ID (or use email auth)', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'email', label: 'Email (alternative auth)', placeholder: 'you@company.com' },
      { key: 'appPassword', label: 'App Password', placeholder: 'xxxx-xxxx-xxxx-xxxx' },
      { key: 'docLibrary', label: 'Document Library', placeholder: 'Shared Documents/Sales' },
    ],
    apiEndpoint: '/api/integrations/sharepoint',
    docsUrl: 'https://learn.microsoft.com/en-us/sharepoint/',
  },
];

// ── MCP Tool definitions for display ──
const MCP_TOOLS = [
  { name: 'list_opportunities', description: 'List all opportunities with stage, TCV, owner', category: 'Pipeline' },
  { name: 'get_opportunity', description: 'Get detailed opportunity with stakeholders and tasks', category: 'Pipeline' },
  { name: 'update_opportunity', description: 'Update opportunity fields', category: 'Pipeline' },
  { name: 'create_task', description: 'Create a task for an opportunity', category: 'Pipeline' },
  { name: 'complete_task', description: 'Mark a task as completed', category: 'Pipeline' },
  { name: 'list_stakeholders', description: 'List stakeholders for an opportunity', category: 'People' },
  { name: 'add_stakeholder', description: 'Add a stakeholder to an opportunity', category: 'People' },
  { name: 'list_accounts', description: 'List all accounts', category: 'Accounts' },
  { name: 'get_account_360', description: 'Full account view with deals and contacts', category: 'Accounts' },
  { name: 'query_knowledge_graph', description: 'Query relationships in the knowledge graph', category: 'Intelligence' },
  { name: 'get_forecast', description: 'Pipeline forecast with weighted values', category: 'Intelligence' },
  { name: 'search_deals', description: 'Search deals by name, customer, or keyword', category: 'Search' },
  { name: 'log_activity', description: 'Log activity to a deal conversation', category: 'System' },
  { name: 'send_notification', description: 'Send a notification', category: 'System' },
  { name: 'invoke_agent', description: 'Invoke any of the 13 AI agents', category: 'Agents' },
];

type TabId = 'ai' | 'plugins' | 'mcp' | 'security' | 'appearance' | 'notifications';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('ai');
  const [saved, setSaved] = useState(false);
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [pluginConfigs, setPluginConfigs] = useState<Record<string, Record<string, string>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const { data: session } = useSession();

  // 2FA state
  const [tfaStatus, setTfaStatus] = useState<'checking' | 'off' | 'on' | 'setup'>('checking');
  const [tfaQr, setTfaQr] = useState('');
  const [tfaSecret, setTfaSecret] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaError, setTfaError] = useState('');
  const [mcpCopied, setMcpCopied] = useState<string | null>(null);

  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Load plugin configs from localStorage
  useEffect(() => {
    const saved: Record<string, Record<string, string>> = {};
    PLUGINS.forEach(plugin => {
      const raw = localStorage.getItem(`plugin_config_${plugin.id}`);
      if (raw) {
        try { saved[plugin.id] = JSON.parse(raw); } catch { /* ignore */ }
      }
    });
    if (Object.keys(saved).length > 0) setPluginConfigs(saved);
  }, []);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'ai', label: 'AI & Agents', icon: Bot },
    { id: 'plugins', label: 'Plugins', icon: Puzzle },
    { id: 'mcp', label: 'MCP Tools', icon: Terminal },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const currentModel = settings?.aiModel ?? 'claude-sonnet-4-6';
  const guardrails = settings?.guardrails ?? { requireApproval: true, logActions: true, autoInvoke: true };
  const notifications = settings?.notifications ?? {
    dealStageChanges: true, overdueTasks: true, aiSignals: true,
    contractExpiry: true, dealAssignments: true,
  };

  const handleModelChange = (model: string) => updateMutation.mutate({ aiModel: model });
  const handleGuardrailChange = (key: keyof typeof guardrails, value: boolean) => {
    updateMutation.mutate({ guardrails: { ...guardrails, [key]: value } });
  };
  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    updateMutation.mutate({ notifications: { ...notifications, [key]: value } });
  };
  const handlePluginSave = (pluginId: string, pluginName: string) => {
    const config = pluginConfigs[pluginId] || {};
    localStorage.setItem(`plugin_config_${pluginId}`, JSON.stringify(config));
    setToast(`${pluginName} configuration saved`);
    setTimeout(() => setToast(null), 3000);
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMcpCopied(label);
    setTimeout(() => setMcpCopied(null), 2000);
  };

  const notificationKeys: { key: keyof typeof notifications; label: string; desc: string }[] = [
    { key: 'dealStageChanges', label: 'Deal stage changes', desc: 'When a deal moves to a new stage' },
    { key: 'overdueTasks', label: 'Overdue tasks', desc: 'When tasks pass their due date' },
    { key: 'aiSignals', label: 'AI agent signals', desc: 'When agents detect risks or opportunities' },
    { key: 'contractExpiry', label: 'Contract expiry reminders', desc: 'Before contracts expire' },
    { key: 'dealAssignments', label: 'New deal assignments', desc: 'When deals are assigned to you' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading settings...</div>
      </div>
    );
  }

  // MCP config JSON for Claude Desktop / Cursor
  const mcpBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://salespilot.galent.ai';
  const mcpConfigJson = JSON.stringify({
    mcpServers: {
      'galent-salespilot': {
        url: `${mcpBaseUrl}/api/mcp`,
        transport: 'streamable-http',
        headers: {
          Authorization: 'Bearer YOUR_MCP_API_KEY',
        },
      },
    },
  }, null, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
            <Check className="h-3.5 w-3.5" /> Saved
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--g-line)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'border-[#7c3aed] text-[#7c3aed]' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── AI & Agents Tab ─── */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label">Default AI Model</div>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map(model => (
                <label key={model.model} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-[#7c3aed]/30 cursor-pointer transition-all">
                  <input type="radio" name="model" checked={currentModel === model.model}
                    onChange={() => handleModelChange(model.model)} className="accent-[#7c3aed]" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{model.displayName}</div>
                    <div className="text-[11px] text-muted-foreground">{model.provider} · {model.model}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{model.maxTokens} tokens · temp {model.temperature}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label">API Keys</div>
            <div>
              <label className="text-xs text-muted-foreground">Anthropic API Key</label>
              <input type="password" defaultValue="sk-ant-api03-****" readOnly
                className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
              <p className="text-[11px] text-muted-foreground mt-1">Configured via environment variable</p>
            </div>
          </div>

          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label flex items-center gap-1.5"><Shield className="h-3 w-3" /> Global Guardrails</div>
            <div className="space-y-3">
              {[
                { key: 'requireApproval' as const, label: 'Require approval for external actions', desc: 'Emails, stage changes, TCV modifications' },
                { key: 'logActions' as const, label: 'Log all agent actions', desc: 'Full audit trail of AI decisions' },
                { key: 'autoInvoke' as const, label: 'Enable auto-invoke agents', desc: 'Agents can trigger on events without manual invocation' },
              ].map(g => (
                <label key={g.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <div className="text-sm text-foreground">{g.label}</div>
                    <div className="text-[11px] text-muted-foreground">{g.desc}</div>
                  </div>
                  <input type="checkbox" checked={guardrails[g.key]}
                    onChange={e => handleGuardrailChange(g.key, e.target.checked)} className="accent-[#7c3aed] h-4 w-4" />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Plugins Tab ─── */}
      {activeTab === 'plugins' && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 g-surface g-elevated">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#7c3aed]" />
              <span className="text-xs text-muted-foreground">{PLUGINS.filter(p => p.status === 'available').length} available</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">
                {PLUGINS.filter(p => { const c = pluginConfigs[p.id]; return c && Object.values(c).some(v => v.length > 0); }).length} configured
              </span>
            </div>
          </div>

          {PLUGINS.map(plugin => {
            const isExpanded = expandedPlugin === plugin.id;
            const isSoon = plugin.status === 'coming_soon';
            return (
              <div key={plugin.id} className={`g-surface g-elevated overflow-hidden ${isSoon ? 'opacity-70' : ''}`}>
                <button onClick={() => setExpandedPlugin(isExpanded ? null : plugin.id)}
                  className="flex items-center gap-4 w-full p-5 text-left hover:bg-card/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center flex-shrink-0">
                    <plugin.icon className="h-5 w-5 text-[#7c3aed]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{plugin.name}</span>
                      <span className={`g-chip ${isSoon ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {isSoon ? 'Coming Soon' : 'Available'}
                      </span>
                      {pluginConfigs[plugin.id] && Object.values(pluginConfigs[plugin.id]).some(v => v.length > 0) && (
                        <span className="g-chip bg-blue-500/10 text-blue-400">Configured</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{plugin.description}</p>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: 'var(--g-line)' }}>
                    {plugin.downloadUrl && (
                      <div className="mt-4 p-4 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-foreground">Install Package</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{plugin.installGuide}</div>
                          </div>
                          <a href={plugin.downloadUrl} download
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors">
                            <Download className="h-4 w-4" /> {plugin.downloadLabel}
                          </a>
                        </div>
                      </div>
                    )}

                    {plugin.features && (
                      <div className="mt-4">
                        <div className="g-section-label mb-2">Capabilities</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {plugin.features.map((feat, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="text-foreground">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="g-section-label mb-2">Setup Steps</div>
                      <div className="space-y-1.5">
                        {plugin.setupSteps.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                            <span className="text-foreground">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="g-section-label mb-2">Configuration</div>
                      <div className="space-y-2">
                        {plugin.configFields.map(field => (
                          <div key={field.key}>
                            <label className="text-xs text-muted-foreground">{field.label}</label>
                            <input value={pluginConfigs[plugin.id]?.[field.key] || ''}
                              onChange={e => setPluginConfigs(prev => ({ ...prev, [plugin.id]: { ...prev[plugin.id], [field.key]: e.target.value } }))}
                              placeholder={field.placeholder}
                              className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                      <span className="text-xs text-muted-foreground">API Endpoint:</span>
                      <code className="text-xs font-mono text-foreground flex-1">{plugin.apiEndpoint}</code>
                      <button onClick={() => copyToClipboard(plugin.apiEndpoint, plugin.id)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={() => handlePluginSave(plugin.id, plugin.name)}
                        className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors">
                        Save Configuration
                      </button>
                      <a href={plugin.docsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#7c3aed] hover:underline ml-auto">
                        <ExternalLink className="h-3 w-3" /> Documentation
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MCP Tools Tab ─── */}
      {activeTab === 'mcp' && (
        <div className="space-y-6">
          {/* MCP Header */}
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-[#7c3aed]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">MCP Server</div>
                <div className="text-xs text-muted-foreground">
                  Expose Galent SalesPilot as an MCP server. Connect from Claude Desktop, Cursor, VS Code, or any MCP client.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
              <span className="text-xs text-muted-foreground">Endpoint:</span>
              <code className="text-xs font-mono text-foreground flex-1">{mcpBaseUrl}/api/mcp</code>
              <button onClick={() => copyToClipboard(`${mcpBaseUrl}/api/mcp`, 'endpoint')}
                className="p-1 rounded text-muted-foreground hover:text-foreground">
                {mcpCopied === 'endpoint' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="g-chip bg-emerald-500/10 text-emerald-400">{MCP_TOOLS.length} tools</span>
              <span className="g-chip bg-blue-500/10 text-blue-400">{DEFAULT_AGENT_CONFIGS.length} agents</span>
              <span className="g-chip bg-purple-500/10 text-purple-400">JSON-RPC 2.0</span>
            </div>
          </div>

          {/* Client Config */}
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="g-section-label flex items-center gap-1.5"><Code2 className="h-3 w-3" /> Client Configuration</div>
              <button onClick={() => copyToClipboard(mcpConfigJson, 'config')}
                className="flex items-center gap-1.5 text-xs text-[#7c3aed] hover:underline">
                {mcpCopied === 'config' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {mcpCopied === 'config' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this to your Claude Desktop config (<code className="font-mono text-foreground">claude_desktop_config.json</code>) or Cursor MCP settings:
            </p>
            <pre className="p-4 rounded-lg bg-card border border-border text-xs font-mono text-foreground overflow-x-auto whitespace-pre">
              {mcpConfigJson}
            </pre>
          </div>

          {/* Available Tools */}
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label">Available Tools ({MCP_TOOLS.length})</div>
            <div className="space-y-1">
              {Object.entries(
                MCP_TOOLS.reduce((acc, tool) => {
                  (acc[tool.category] = acc[tool.category] || []).push(tool);
                  return acc;
                }, {} as Record<string, typeof MCP_TOOLS>)
              ).map(([category, tools]) => (
                <div key={category}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-1.5">{category}</div>
                  <div className="space-y-1">
                    {tools.map(tool => (
                      <div key={tool.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-[#7c3aed]/20 transition-colors">
                        <code className="text-xs font-mono text-[#7c3aed] min-w-[160px]">{tool.name}</code>
                        <span className="text-xs text-muted-foreground">{tool.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agents available via MCP */}
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label">Agents (invocable via <code className="font-mono text-[#7c3aed]">invoke_agent</code>)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {DEFAULT_AGENT_CONFIGS.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-foreground">{agent.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{agent.id}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{agent.tools.length} tools</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Appearance Tab ─── */}
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

      {/* ─── Notifications Tab ─── */}
      {activeTab === 'notifications' && (
        <div className="g-surface g-elevated p-5 space-y-4">
          <div className="g-section-label">Notification Preferences</div>
          <div className="space-y-3">
            {notificationKeys.map(pref => (
              <label key={String(pref.key)} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <div className="text-sm text-foreground">{pref.label}</div>
                  <div className="text-[11px] text-muted-foreground">{pref.desc}</div>
                </div>
                <input type="checkbox" checked={notifications[pref.key]}
                  onChange={e => handleNotificationChange(pref.key, e.target.checked)} className="accent-[#7c3aed] h-4 w-4" />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ─── Security Tab (2FA) ─── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-[#7c3aed]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Two-Factor Authentication (TOTP)</div>
                <div className="text-xs text-muted-foreground">
                  Add an extra layer of security with an authenticator app (Google Authenticator, Microsoft Authenticator)
                </div>
              </div>
            </div>

            <SecurityTFA email={session?.user?.email || ''} />
          </div>

          <div className="g-surface g-elevated p-5 space-y-4">
            <div className="g-section-label">Microsoft MFA (Azure AD)</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your organization uses Azure AD, MFA can also be enforced at the identity provider level.
              This is configured by your IT admin in Microsoft Entra → Per-user MFA or Conditional Access policies.
              When enabled, users are prompted by Microsoft before the OAuth token reaches SalesPilot.
            </p>
            <a href="https://account.activedirectory.windowsazure.com/usermanagement/multifactorverification.aspx"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#7c3aed] hover:underline">
              <ExternalLink className="h-3 w-3" /> Open Microsoft MFA Portal (admin)
            </a>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4 z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Security 2FA Component ──
function SecurityTFA({ email }: { email: string }) {
  const [status, setStatus] = useState<'checking' | 'off' | 'on' | 'setup'>('checking');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) return;
    fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', email }),
    }).then(r => r.json()).then(d => setStatus(d.hasTotp ? 'on' : 'off')).catch(() => setStatus('off'));
  }, [email]);

  const handleSetup = async () => {
    setLoading(true);
    const res = await fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup', email }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.alreadyEnabled) { setStatus('on'); return; }
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setStatus('setup');
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true); setError('');
    const res = await fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', email, token: code }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.valid) { setStatus('on'); } else { setError('Invalid code. Try again.'); setCode(''); }
  };

  const handleDisable = async () => {
    if (!confirm('Disable 2FA? You will no longer be prompted for a code on login.')) return;
    await fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disable', email }),
    });
    setStatus('off');
    setQrCode(''); setSecret(''); setCode('');
  };

  if (status === 'checking') {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking 2FA status...</div>;
  }

  if (status === 'on') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-foreground">2FA is enabled</div>
            <div className="text-xs text-muted-foreground">You'll be prompted for an authenticator code on each login</div>
          </div>
        </div>
        <button onClick={handleDisable} className="text-xs text-red-400 hover:underline">Disable 2FA</button>
      </div>
    );
  }

  if (status === 'setup') {
    return (
      <div className="space-y-4">
        <div className="text-sm text-foreground">Scan this QR code with your authenticator app:</div>
        {qrCode && <img src={qrCode} alt="2FA QR" className="w-48 h-48 mx-auto rounded-xl border border-border" />}
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">Manual entry code:</div>
          <code className="text-xs font-mono text-foreground bg-card border border-border px-3 py-1 rounded select-all">{secret}</code>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Enter 6-digit code to verify</label>
          <input type="text" inputMode="numeric" maxLength={6} value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
            placeholder="000000"
            className="w-full mt-1 px-3 py-2 text-center text-lg font-mono tracking-[0.3em] bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
        </div>
        {error && <div className="flex items-center gap-1.5 text-xs text-red-400"><AlertTriangle className="h-3 w-3" />{error}</div>}
        <button onClick={handleVerify} disabled={loading || code.length !== 6}
          className="w-full px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors">
          {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
        </button>
      </div>
    );
  }

  // status === 'off'
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <Shield className="h-5 w-5 text-amber-400" />
        <div>
          <div className="text-sm font-semibold text-foreground">2FA is not enabled</div>
          <div className="text-xs text-muted-foreground">Secure your account with an authenticator app</div>
        </div>
      </div>
      <button onClick={handleSetup} disabled={loading}
        className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors">
        {loading ? 'Setting up...' : 'Set Up 2FA'}
      </button>
    </div>
  );
}
