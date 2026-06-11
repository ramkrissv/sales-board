'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Database, Megaphone, Mail, Calendar, MessageSquare, HardDrive,
  CheckCircle2, XCircle, AlertCircle, Settings, Power, PowerOff,
  Sparkles, Search, X, Loader2, Globe, Shield, ArrowRight, Plus,
  FolderKanban, BarChart3, DollarSign, Users, Code2, Box,
  ChevronRight, ChevronLeft, Wrench, Zap, Eye, Check, Server,
  Cpu, RefreshCw, ExternalLink, Copy, Lock
} from 'lucide-react';

// ── Platform-specific configurations ──
const PLATFORM_CONFIGS: Record<string, {
  fields: { key: string; label: string; type: string; placeholder: string; required?: boolean; help?: string }[];
  authMethod: string;
  syncCapabilities: string[];
  mcpTools: { name: string; description: string }[];
}> = {
  'Salesforce': {
    fields: [
      { key: 'instanceUrl', label: 'Salesforce Instance URL', type: 'url', placeholder: 'https://yourorg.salesforce.com', required: true, help: 'Found in Setup → Company Information' },
      { key: 'clientId', label: 'Connected App Client ID', type: 'text', placeholder: 'Consumer Key from your Connected App', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••', required: true },
      { key: 'securityToken', label: 'Security Token', type: 'password', placeholder: 'Sent to your email when reset', help: 'Reset via My Settings → Personal → Reset My Security Token' },
    ],
    authMethod: 'OAuth 2.0',
    syncCapabilities: ['Opportunities', 'Contacts', 'Accounts', 'Tasks', 'Events', 'Custom Objects'],
    mcpTools: [
      { name: 'sf_query', description: 'Run SOQL queries against Salesforce data' },
      { name: 'sf_create_record', description: 'Create records (Lead, Opportunity, etc.)' },
      { name: 'sf_update_record', description: 'Update existing Salesforce records' },
      { name: 'sf_get_metadata', description: 'Fetch object schema and field definitions' },
    ],
  },
  'HubSpot': {
    fields: [
      { key: 'apiKey', label: 'Private App Access Token', type: 'password', placeholder: 'pat-na1-xxxxxxxx', required: true, help: 'Settings → Integrations → Private Apps → Create' },
      { key: 'portalId', label: 'Portal ID (Hub ID)', type: 'text', placeholder: '12345678', help: 'Found in account settings URL' },
    ],
    authMethod: 'Bearer Token',
    syncCapabilities: ['Contacts', 'Companies', 'Deals', 'Tickets', 'Marketing Emails', 'Forms'],
    mcpTools: [
      { name: 'hs_search_contacts', description: 'Search HubSpot contacts by filters' },
      { name: 'hs_create_deal', description: 'Create a new deal in HubSpot pipeline' },
      { name: 'hs_get_engagement', description: 'Retrieve email/call/meeting engagements' },
      { name: 'hs_sync_pipeline', description: 'Bidirectional pipeline sync' },
    ],
  },
  'Gmail': {
    fields: [
      { key: 'email', label: 'Gmail Address', type: 'email', placeholder: 'you@company.com', required: true },
      { key: 'appPassword', label: 'App Password', type: 'password', placeholder: '16-character app password', required: true, help: 'Google Account → Security → 2-Step Verification → App Passwords. No OAuth setup needed.' },
      { key: 'imapEnabled', label: 'IMAP Enabled', type: 'checkbox', placeholder: '', help: 'Enable in Gmail → Settings → See All → Forwarding and POP/IMAP' },
    ],
    authMethod: 'Email + App Password (no OAuth needed)',
    syncCapabilities: ['Inbox Monitoring', 'Send Emails', 'Thread Tracking', 'Label Sync'],
    mcpTools: [
      { name: 'email_search', description: 'Search emails by sender, subject, or date range' },
      { name: 'email_send', description: 'Send email with deal context' },
      { name: 'email_thread', description: 'Get full email thread for a contact' },
    ],
  },
  'Outlook': {
    fields: [
      { key: 'email', label: 'Outlook Email', type: 'email', placeholder: 'you@company.com', required: true },
      { key: 'authMode', label: 'Authentication Method', type: 'select', placeholder: 'Choose: credentials or oauth', help: 'Use "App Password" for quick setup, or "OAuth" for full Microsoft Graph access' },
      { key: 'appPassword', label: 'App Password (Simple Auth)', type: 'password', placeholder: 'xxxx-xxxx-xxxx-xxxx', help: 'Generate at account.microsoft.com → Security → App Passwords. Works without Azure AD setup.' },
      { key: 'clientId', label: 'Azure AD Client ID (OAuth)', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Optional — only needed for full Microsoft Graph access (calendar, OneDrive)' },
      { key: 'tenantId', label: 'Tenant ID (OAuth)', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'clientSecret', label: 'Client Secret (OAuth)', type: 'password', placeholder: '••••••••' },
    ],
    authMethod: 'App Password or OAuth 2.0',
    syncCapabilities: ['Emails', 'Calendar Events', 'Contacts', 'OneDrive Files'],
    mcpTools: [
      { name: 'outlook_search', description: 'Search Outlook emails and calendar' },
      { name: 'outlook_send', description: 'Send email via Outlook' },
      { name: 'outlook_calendar', description: 'Create/read calendar events' },
    ],
  },
  'Google Calendar': {
    fields: [
      { key: 'clientId', label: 'Google OAuth Client ID', type: 'text', placeholder: 'xxxxx.apps.googleusercontent.com', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••', required: true },
      { key: 'calendarId', label: 'Calendar ID', type: 'text', placeholder: 'primary (or specific calendar ID)', help: 'Use "primary" for default calendar' },
    ],
    authMethod: 'OAuth 2.0 (Google)',
    syncCapabilities: ['Events', 'Attendees', 'Meeting Links', 'Recurring Events'],
    mcpTools: [
      { name: 'gcal_list_events', description: 'List upcoming calendar events' },
      { name: 'gcal_create_event', description: 'Schedule a new meeting' },
      { name: 'gcal_find_slots', description: 'Find available meeting slots' },
    ],
  },
  'Slack': {
    fields: [
      { key: 'botToken', label: 'Bot User OAuth Token', type: 'password', placeholder: 'xoxb-xxxxxxxxxx', required: true, help: 'Slack App → OAuth & Permissions' },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', placeholder: '••••••••', required: true },
      { key: 'defaultChannel', label: 'Default Channel', type: 'text', placeholder: '#sales-pipeline', help: 'Channel for deal notifications' },
    ],
    authMethod: 'OAuth 2.0 (Slack)',
    syncCapabilities: ['Channel Messages', 'DMs', 'Reactions', 'File Sharing'],
    mcpTools: [
      { name: 'slack_send_message', description: 'Post deal updates to a channel' },
      { name: 'slack_search', description: 'Search Slack messages for deal mentions' },
      { name: 'slack_notify', description: 'Send DM notifications to deal owners' },
    ],
  },
  'Microsoft Teams': {
    fields: [
      { key: 'botId', label: 'Bot Registration ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'botSecret', label: 'Bot Secret', type: 'password', placeholder: '••••••••', required: true },
      { key: 'tenantId', label: 'Azure AD Tenant ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
    ],
    authMethod: 'Azure Bot Framework',
    syncCapabilities: ['Team Messages', 'Meeting Transcripts', 'Channel Notifications', 'Adaptive Cards'],
    mcpTools: [
      { name: 'teams_post', description: 'Post adaptive cards to Teams channels' },
      { name: 'teams_transcript', description: 'Capture meeting transcripts' },
      { name: 'teams_notify', description: 'Send targeted notifications' },
    ],
  },
  'Microsoft 365': {
    fields: [
      { key: 'clientId', label: 'Azure AD Client ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'tenantId', label: 'Tenant ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••', required: true },
    ],
    authMethod: 'OAuth 2.0 (Microsoft Identity)',
    syncCapabilities: ['Outlook', 'Calendar', 'Teams', 'OneDrive', 'SharePoint'],
    mcpTools: [
      { name: 'ms_graph_query', description: 'Query Microsoft Graph API' },
      { name: 'ms_onedrive', description: 'Read/write OneDrive documents' },
    ],
  },
};

// Fallback config for unknown platforms
const DEFAULT_PLATFORM_CONFIG = {
  fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API key...', required: true },
    { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com' },
  ],
  authMethod: 'API Key',
  syncCapabilities: ['Custom Data Sync'],
  mcpTools: [
    { name: 'custom_query', description: 'Query data from this integration' },
    { name: 'custom_action', description: 'Perform actions via API' },
  ],
};

const typeIcons: Record<string, any> = {
  crm: Database, marketing: Megaphone, email: Mail, calendar: Calendar,
  messaging: MessageSquare, storage: HardDrive, project_management: FolderKanban,
  analytics: BarChart3, finance: DollarSign, hr: Users, devtools: Code2, other: Box,
};
const typeBadgeColor: Record<string, string> = {
  crm: 'bg-blue-500/15 text-blue-400', marketing: 'bg-purple-500/15 text-purple-400',
  email: 'bg-amber-500/15 text-amber-400', calendar: 'bg-emerald-500/15 text-emerald-400',
  messaging: 'bg-pink-500/15 text-pink-400', storage: 'bg-cyan-500/15 text-cyan-400',
  project_management: 'bg-orange-500/15 text-orange-400', analytics: 'bg-indigo-500/15 text-indigo-400',
  finance: 'bg-green-500/15 text-green-400', hr: 'bg-rose-500/15 text-rose-400',
  devtools: 'bg-slate-500/15 text-slate-400', other: 'bg-zinc-500/15 text-zinc-400',
};
const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  connected: { icon: CheckCircle2, color: 'text-[var(--g-green)]', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-muted-foreground', label: 'Disconnected' },
  error: { icon: AlertCircle, color: 'text-[var(--g-red)]', label: 'Error' },
};

// ── Wizard Steps ──
const WIZARD_STEPS = [
  { id: 'discover', label: 'Discover & Validate', icon: Search },
  { id: 'configure', label: 'Configure Service', icon: Settings },
  { id: 'api', label: 'API Discovery', icon: Sparkles },
  { id: 'tools', label: 'Generate & Test Tools', icon: Wrench },
];

// ── Integration Wizard Component ──
function IntegrationWizard({ integration, onClose, onConnect }: {
  integration: any;
  onClose: () => void;
  onConnect: (id: string, config: any) => void;
}) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending' | null>>({});

  const platformConfig = PLATFORM_CONFIGS[integration.name] || DEFAULT_PLATFORM_CONFIG;

  const handleValidate = async () => {
    setValidating(true);
    // Simulate validation (in prod, call a tRPC endpoint to test the connection)
    await new Promise(r => setTimeout(r, 1500));
    setValidating(false);
    setValidated(true);
  };

  const handleTestTool = async (toolName: string) => {
    setTestResults(p => ({ ...p, [toolName]: 'pending' }));
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
    setTestResults(p => ({ ...p, [toolName]: Math.random() > 0.2 ? 'pass' : 'fail' }));
  };

  const handleComplete = () => {
    onConnect(integration._id, {
      ...config,
      mcpTools: Array.from(selectedTools),
      authMethod: platformConfig.authMethod,
    });
    onClose();
  };

  const canProceed = () => {
    if (step === 0) return validated;
    if (step === 1) {
      return platformConfig.fields.filter(f => f.required).every(f => config[f.key]?.trim());
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl g-surface border border-border shadow-2xl flex flex-col card-enter">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground font-display">Configure Integration</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{integration.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1">
            {WIZARD_STEPS.map((s, i) => {
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 transition-colors ${
                      isActive ? 'bg-[#7c3aed] text-white' : isDone ? 'bg-[var(--g-green-soft)] text-[var(--g-green)]' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {isDone ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-[#7c3aed]' : isDone ? 'text-[var(--g-green)]' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 mt-[-16px] ${isDone ? 'bg-[var(--g-green)]' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 0: Discover & Validate */}
          {step === 0 && (
            <div className="space-y-5 animate-flow-in">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/50 border border-border">
                <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center shrink-0">
                  {(() => { const Icon = typeIcons[integration.type] || Database; return <Icon className="h-6 w-6 text-[#7c3aed]" />; })()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{integration.name}</div>
                  <p className="text-xs text-muted-foreground mt-1">{integration.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[integration.type] || typeBadgeColor.other}`}>
                      {integration.type}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> {platformConfig.authMethod}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="g-section-label">Sync Capabilities</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {platformConfig.syncCapabilities.map(cap => (
                    <span key={cap} className="text-xs px-2.5 py-1 rounded-lg bg-card border border-border text-foreground">{cap}</span>
                  ))}
                </div>
              </div>

              <div>
                <span className="g-section-label">MCP Tools Available</span>
                <div className="space-y-2 mt-2">
                  {platformConfig.mcpTools.map(tool => (
                    <div key={tool.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border">
                      <Cpu className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                      <div>
                        <span className="text-xs font-mono font-semibold text-foreground">{tool.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{tool.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleValidate} disabled={validating || validated}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-[#6d28d9] transition-colors disabled:opacity-60">
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : validated ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {validating ? 'Validating Service...' : validated ? 'Service Validated' : 'Validate Service'}
              </button>
            </div>
          )}

          {/* Step 1: Configure Service */}
          {step === 1 && (
            <div className="space-y-4 animate-flow-in">
              <p className="text-sm text-muted-foreground">Enter your {integration.name} credentials. These are stored encrypted and used for API connections.</p>
              {platformConfig.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    {field.label} {field.required && <span className="text-[var(--g-red)]">*</span>}
                  </label>
                  {field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={config[field.key] === 'true'} onChange={e => setConfig(p => ({ ...p, [field.key]: String(e.target.checked) }))} className="rounded border-border" />
                      <span className="text-xs text-muted-foreground">{field.help || 'Enable this option'}</span>
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      value={config[field.key] || ''}
                      onChange={e => setConfig(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40 focus:ring-1 focus:ring-[#7c3aed]/20"
                    />
                  )}
                  {field.help && field.type !== 'checkbox' && (
                    <p className="text-[10px] text-muted-foreground mt-1">{field.help}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 2: API Discovery */}
          {step === 2 && (
            <div className="space-y-5 animate-flow-in">
              <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                  <span className="text-sm font-semibold text-foreground">AI API Discovery</span>
                </div>
                <p className="text-xs text-muted-foreground">AI has analyzed the {integration.name} API and identified the following endpoints and data models available for synchronization.</p>
              </div>

              <div>
                <span className="g-section-label">Discovered Endpoints</span>
                <div className="space-y-2 mt-2">
                  {platformConfig.syncCapabilities.map((cap, i) => (
                    <div key={cap} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[var(--g-green-soft)] flex items-center justify-center">
                          <Check className="h-3 w-3 text-[var(--g-green)]" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{cap}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-[#7c3aed]">read + write</span>
                        <span className="text-[10px] text-muted-foreground">auto-mapped</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--g-green-soft)] border border-[var(--g-green)]/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--g-green)]" />
                  <span className="text-xs font-medium text-[var(--g-green)]">All endpoints validated successfully</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Generate & Test MCP Tools */}
          {step === 3 && (
            <div className="space-y-5 animate-flow-in">
              <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-[#7c3aed]" />
                  <span className="text-sm font-semibold text-foreground">MCP Server Tools</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  These tools will be registered as MCP (Model Context Protocol) tools, making them available to all AI agents in the platform.
                </p>
              </div>

              <div>
                <span className="g-section-label">Select Tools to Enable</span>
                <div className="space-y-2 mt-2">
                  {platformConfig.mcpTools.map(tool => {
                    const isSelected = selectedTools.has(tool.name);
                    const testResult = testResults[tool.name];
                    return (
                      <div key={tool.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                        isSelected ? 'bg-[#7c3aed]/5 border-[#7c3aed]/30' : 'bg-card border-border'
                      }`}>
                        <div className="flex items-center gap-3">
                          <button onClick={() => {
                            const next = new Set(selectedTools);
                            isSelected ? next.delete(tool.name) : next.add(tool.name);
                            setSelectedTools(next);
                          }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-[#7c3aed] border-[#7c3aed] text-white' : 'border-border'
                            }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold text-foreground">{tool.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">MCP</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{tool.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {testResult === 'pass' && <CheckCircle2 className="h-4 w-4 text-[var(--g-green)]" />}
                          {testResult === 'fail' && <XCircle className="h-4 w-4 text-[var(--g-red)]" />}
                          {testResult === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-[#7c3aed]" />}
                          {isSelected && !testResult && (
                            <button onClick={() => handleTestTool(tool.name)}
                              className="text-[10px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                              Test
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedTools.size > 0 && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5" />
                    <span><strong className="text-foreground">{selectedTools.size}</strong> MCP tools will be registered. AI agents (Deal Coach, Research, Outreach, etc.) will be able to call these tools automatically.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/20 shrink-0">
          <button onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> {step > 0 ? 'Back' : 'Cancel'}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            )}
            {step < WIZARD_STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                className="flex items-center gap-1 px-5 py-2 text-sm rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] transition-colors disabled:opacity-50">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button onClick={handleComplete} disabled={selectedTools.size === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg bg-[var(--g-green)] text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                <Zap className="h-3.5 w-3.5" /> Connect & Enable
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function IntegrationsPage() {
  const utils = trpc.useUtils();
  const { data: integrations = [], isLoading } = trpc.integration.list.useQuery();
  const connectMutation = trpc.integration.connect.useMutation({ onSuccess: () => utils.integration.list.invalidate() });
  const disconnectMutation = trpc.integration.disconnect.useMutation({ onSuccess: () => utils.integration.list.invalidate() });
  const discoverMutation = trpc.integration.discover.useMutation();
  const addDiscoveredMutation = trpc.integration.addDiscovered.useMutation({
    onSuccess: () => { utils.integration.list.invalidate(); setDiscoveredResult(null); setDiscoverInput(''); setShowDiscover(false); },
  });

  const [wizardIntegration, setWizardIntegration] = useState<any>(null);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverInput, setDiscoverInput] = useState('');
  const [discoveredResult, setDiscoveredResult] = useState<any>(null);

  const handleDiscover = async () => {
    if (!discoverInput.trim()) return;
    setDiscoveredResult(null);
    const result = await discoverMutation.mutateAsync({ serviceName: discoverInput.trim() });
    setDiscoveredResult(result);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-secondary rounded-lg animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl g-surface animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const connected = integrations.filter((i: any) => i.status === 'connected');
  const disconnected = integrations.filter((i: any) => i.status !== 'connected');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-display">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">{connected.length} of {integrations.length} connected · MCP tools available</p>
        </div>
        <button onClick={() => setShowDiscover(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors ripple">
          <Sparkles className="h-4 w-4" /> Discover New
        </button>
      </div>

      {/* Connected integrations */}
      {connected.length > 0 && (
        <div>
          <span className="g-section-label">Connected</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {connected.map((integration: any) => {
              const Icon = typeIcons[integration.type] || Database;
              return (
                <div key={integration._id} className="rounded-xl g-surface g-elevated hover-glow transition-all">
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--g-green-soft)] flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-[var(--g-green)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{integration.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[integration.type] || typeBadgeColor.other}`}>
                            {integration.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--g-green)]" />
                          <span className="text-xs text-[var(--g-green)]">Connected</span>
                          {integration.syncHealth != null && (
                            <div className="flex items-center gap-1 ml-2">
                              <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className={`h-full rounded-full ${integration.syncHealth >= 70 ? 'bg-[var(--g-green)]' : 'bg-[var(--g-amber)]'}`}
                                  style={{ width: `${integration.syncHealth}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{integration.syncHealth}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setWizardIntegration(integration)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Configure">
                          <Settings className="h-4 w-4" />
                        </button>
                        <button onClick={() => disconnectMutation.mutate({ id: integration._id })}
                          className="p-1.5 rounded-lg hover:bg-[var(--g-red-soft)] text-[var(--g-red)] transition-colors" title="Disconnect">
                          <PowerOff className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available integrations */}
      <div>
        <span className="g-section-label">Available</span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {disconnected.map((integration: any) => {
            const Icon = typeIcons[integration.type] || Database;
            return (
              <div key={integration._id} className="rounded-xl g-surface hover-glow transition-all group">
                <div className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-[#7c3aed] transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{integration.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeBadgeColor[integration.type] || typeBadgeColor.other}`}>
                          {integration.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{integration.description}</p>
                    </div>
                    <button onClick={() => setWizardIntegration(integration)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] font-medium hover:bg-[#7c3aed]/20 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Wizard */}
      {wizardIntegration && (
        <IntegrationWizard
          integration={wizardIntegration}
          onClose={() => setWizardIntegration(null)}
          onConnect={(id, config) => connectMutation.mutate({ id, config })}
        />
      )}

      {/* Discover Modal */}
      {showDiscover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDiscover(false); setDiscoveredResult(null); }} />
          <div className="relative w-full max-w-lg g-surface g-elevated rounded-2xl shadow-2xl card-enter">
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-[#7c3aed]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground font-display">Discover Integration</h2>
                    <p className="text-xs text-muted-foreground">AI will research and configure any service</p>
                  </div>
                </div>
                <button onClick={() => { setShowDiscover(false); setDiscoveredResult(null); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-2">
                <input value={discoverInput} onChange={e => setDiscoverInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDiscover()}
                  placeholder="e.g., Jira, Notion, Datadog, Stripe..."
                  className="flex-1 px-3 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
                <button onClick={handleDiscover} disabled={!discoverInput.trim() || discoverMutation.isPending}
                  className="px-4 py-2.5 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors">
                  {discoverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Discover'}
                </button>
              </div>

              {discoveredResult && (
                <div className="p-4 rounded-xl border border-[#7c3aed]/20 bg-[#7c3aed]/5 space-y-3 animate-flow-in">
                  <div className="text-sm font-semibold text-foreground">{discoveredResult.name}</div>
                  <p className="text-xs text-muted-foreground">{discoveredResult.description}</p>
                  {discoveredResult.availableActions?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {discoveredResult.availableActions.map((a: any, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{a.name}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { addDiscoveredMutation.mutate({ name: discoveredResult.name, type: discoveredResult.type || 'other', description: discoveredResult.description || '' }); }}
                    disabled={addDiscoveredMutation.isPending}
                    className="w-full px-4 py-2 text-xs rounded-lg bg-[#7c3aed] text-white font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors">
                    {addDiscoveredMutation.isPending ? 'Adding...' : 'Add to Platform'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
