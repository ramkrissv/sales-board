'use client';

import { useState, useEffect } from 'react';
import { Mail, Video, Mic, Globe, Copy, ExternalLink, ArrowRight, FolderOpen } from 'lucide-react';

const PLUGINS = [
  {
    id: 'outlook',
    name: 'Outlook Add-in',
    icon: Mail,
    status: 'available',
    description: 'Add a "Send to Galent" button in Outlook. Forwards emails to Signal for AI processing.',
    setupSteps: [
      'Register an Azure AD app at portal.azure.com',
      'Set redirect URI to your Galent instance',
      'Add Mail.Read and User.Read permissions',
      'Copy the Client ID and Tenant ID below',
      'Deploy the manifest XML to your Office 365 tenant',
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
    name: 'Teams Bot',
    icon: Video,
    status: 'available',
    description: 'Capture meeting transcripts and chat messages automatically. Bot posts deal updates to channels.',
    setupSteps: [
      'Create a Bot registration in Azure Bot Service',
      'Set messaging endpoint to your Galent webhook URL',
      'Install the bot in your Teams tenant',
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Plugins & Connectors</h1>
        <p className="text-sm text-muted-foreground">Connect Galent to your tools — Outlook, Teams, Voice, Salesforce</p>
      </div>

      <div className="space-y-3">
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{plugin.description}</p>
                </div>
                <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: 'var(--g-line)' }}>
                  {/* Setup Steps */}
                  <div className="mt-4">
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

                  {/* Docs Link */}
                  <a href={plugin.docsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#7c3aed] hover:underline">
                    <ExternalLink className="h-3 w-3" /> View Documentation
                  </a>

                  <button
                    onClick={() => handleSave(plugin.id, plugin.name)}
                    className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors"
                  >
                    Save Configuration
                  </button>
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
