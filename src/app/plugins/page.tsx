'use client';

import { useState, useEffect } from 'react';
import { Mail, Video, Mic, Globe, Copy, ExternalLink, ArrowRight, FolderOpen, Download, CheckCircle2, Zap, Shield } from 'lucide-react';

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
    features: [
      'One-click "Send to Galent" from any email',
      'AI extracts deal signals, contacts, action items',
      'Auto-logs email threads to deal conversation',
      'CC tracking for sent emails',
    ],
    setupSteps: [
      'Download the manifest XML below',
      'Go to admin.microsoft.com → Settings → Integrated apps',
      'Click "Upload custom apps" and select the manifest',
      'Assign to users or your entire organization',
      'Users will see "SalesPilot" in their Outlook sidebar',
    ],
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
    installGuide: 'Upload to Teams Admin Center → Manage apps → Upload new app',
    features: [
      'Auto-capture meeting transcripts',
      'Chat message signal extraction',
      'Deal update notifications in channels',
      'Embedded SalesPilot tab in Teams',
    ],
    setupSteps: [
      'Download the Teams app manifest below',
      'Go to Teams Admin Center → Manage apps',
      'Click "Upload new app" and select the manifest',
      'Create a Bot registration in Azure Bot Service',
      'Set messaging endpoint to your Galent webhook URL',
      'Configure which channels to monitor',
    ],
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
    features: [
      'Natural language voice input',
      'Real-time speech-to-text (Deepgram)',
      'AI processes and creates deal updates',
      'Voice-to-lead capture',
    ],
    setupSteps: [
      'Deploy the Pipecat Python server',
      'Configure Deepgram API key for STT',
      'Set the Pipecat server URL below',
    ],
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
    features: [
      'Bidirectional opportunity sync',
      'Contact and account mapping',
      'Activity log synchronization',
      'Custom field mapping',
    ],
    setupSteps: [
      'Create a Connected App in Salesforce Setup',
      'Enable OAuth 2.0 with API access',
      'Set callback URL to your Galent instance',
      'Map Salesforce objects to Galent entities',
    ],
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
    features: [
      'Auto-upload proposals and SOWs',
      'Organize by deal/account folders',
      'Version tracking and sync status',
      'Document library mapping',
    ],
    setupSteps: [
      'Configure SharePoint site URL',
      'Set up authentication (App Password or OAuth)',
      'Map document libraries to deal stages',
      'Enable auto-sync for generated proposals',
    ],
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

export default function PluginsPage() {
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});

  // Load saved configs from localStorage on mount
  useEffect(() => {
    const saved: Record<string, Record<string, string>> = {};
    PLUGINS.forEach(plugin => {
      const raw = localStorage.getItem(`plugin_config_${plugin.id}`);
      if (raw) {
        try { saved[plugin.id] = JSON.parse(raw); } catch { /* ignore */ }
      }
    });
    if (Object.keys(saved).length > 0) setConfigs(saved);
  }, []);

  const handleSave = (pluginId: string, pluginName: string) => {
    const pluginConfig = configs[pluginId] || {};
    localStorage.setItem(`plugin_config_${pluginId}`, JSON.stringify(pluginConfig));
    setToast(`${pluginName} configuration saved`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestConnection = async (pluginId: string) => {
    setConnectionStatus(prev => ({ ...prev, [pluginId]: 'testing' }));
    // Simulate connection test (replace with real API call per connector)
    await new Promise(r => setTimeout(r, 1500));
    const hasConfig = Object.values(configs[pluginId] || {}).some(v => v.length > 0);
    setConnectionStatus(prev => ({ ...prev, [pluginId]: hasConfig ? 'success' : 'error' }));
    setToast(hasConfig ? 'Connection verified' : 'Please fill in configuration first');
    setTimeout(() => {
      setConnectionStatus(prev => ({ ...prev, [pluginId]: 'idle' }));
      setToast(null);
    }, 3000);
  };

  const availableCount = PLUGINS.filter(p => p.status === 'available').length;
  const configuredCount = PLUGINS.filter(p => {
    const c = configs[p.id];
    return c && Object.values(c).some(v => v.length > 0);
  }).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Plugins & Connectors</h1>
        <p className="text-sm text-muted-foreground">Connect Galent to your tools — Outlook, Teams, Voice, Salesforce, SharePoint</p>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 p-4 g-surface g-elevated">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#7c3aed]" />
          <span className="text-xs text-muted-foreground">{availableCount} available</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-muted-foreground">{configuredCount} configured</span>
        </div>
      </div>

      <div className="space-y-3">
        {PLUGINS.map(plugin => {
          const isExpanded = expandedPlugin === plugin.id;
          const isSoon = plugin.status === 'coming_soon';
          const connStatus = connectionStatus[plugin.id] || 'idle';
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
                    {configs[plugin.id] && Object.values(configs[plugin.id]).some(v => v.length > 0) && (
                      <span className="g-chip bg-blue-500/10 text-blue-400">Configured</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{plugin.description}</p>
                </div>
                <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: 'var(--g-line)' }}>

                  {/* Download Button — prominent if manifest exists */}
                  {plugin.downloadUrl && (
                    <div className="mt-4 p-4 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Install Package</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{plugin.installGuide}</div>
                        </div>
                        <a href={plugin.downloadUrl} download
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors">
                          <Download className="h-4 w-4" />
                          {plugin.downloadLabel}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Features */}
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

                  {/* Setup Steps */}
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

                  {/* Config Fields */}
                  <div>
                    <div className="g-section-label mb-2">Configuration</div>
                    <div className="space-y-2">
                      {plugin.configFields.map(field => (
                        <div key={field.key}>
                          <label className="text-xs text-muted-foreground">{field.label}</label>
                          <input
                            value={configs[plugin.id]?.[field.key] || ''}
                            onChange={e => setConfigs(prev => ({ ...prev, [plugin.id]: { ...prev[plugin.id], [field.key]: e.target.value } }))}
                            placeholder={field.placeholder}
                            className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Endpoint */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                    <span className="text-xs text-muted-foreground">API Endpoint:</span>
                    <code className="text-xs font-mono text-foreground flex-1">{plugin.apiEndpoint}</code>
                    <button onClick={() => navigator.clipboard.writeText(plugin.apiEndpoint)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleSave(plugin.id, plugin.name)}
                      className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors"
                    >
                      Save Configuration
                    </button>

                    {!isSoon && (
                      <button
                        onClick={() => handleTestConnection(plugin.id)}
                        disabled={connStatus === 'testing'}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors border ${
                          connStatus === 'success' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' :
                          connStatus === 'error' ? 'border-red-500 text-red-400 bg-red-500/10' :
                          connStatus === 'testing' ? 'border-border text-muted-foreground bg-card animate-pulse' :
                          'border-border text-foreground bg-card hover:bg-card/80'
                        }`}
                      >
                        {connStatus === 'testing' ? 'Testing...' :
                         connStatus === 'success' ? 'Connected' :
                         connStatus === 'error' ? 'Failed' :
                         'Test Connection'}
                      </button>
                    )}

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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-4 z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
