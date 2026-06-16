/**
 * AI Configuration - Configurable model/provider settings
 * These can be overridden per-agent, per-user, or globally via settings UI
 */

export type AIProvider = 'anthropic' | 'openai';

export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  displayName: string;
  maxTokens: number;
  temperature: number;
  isDefault?: boolean;
}

// Available models registry - extensible via UI
export const AVAILABLE_MODELS: AIModelConfig[] = [
  // Anthropic — Claude 4.6 (latest)
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6-20250610',
    displayName: 'Claude Sonnet 4.6',
    maxTokens: 16384,
    temperature: 0.7,
    isDefault: true,
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-6-20250610',
    displayName: 'Claude Opus 4.6',
    maxTokens: 16384,
    temperature: 0.5,
  },
  {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    maxTokens: 8192,
    temperature: 0.8,
  },
  // Anthropic — Claude 4 (previous gen)
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6-20250610',
    displayName: 'Claude Sonnet 4',
    maxTokens: 8192,
    temperature: 0.7,
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-6-20250610',
    displayName: 'Claude Opus 4',
    maxTokens: 8192,
    temperature: 0.5,
  },
  // OpenAI (for future use)
  {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 4096,
    temperature: 0.7,
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    maxTokens: 4096,
    temperature: 0.8,
  },
];

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelConfig: AIModelConfig;
  // Guardrails
  guardrails: {
    maxActionsPerMinute: number;
    requireApprovalFor: string[];     // action types that need human approval
    blockedActions: string[];          // actions this agent cannot take
    maxTokenBudgetPerDay: number;
    deterministicMode: boolean;        // if true, temperature=0
    contentFilters: string[];          // topics/content to filter out
  };
  // Settings
  isActive: boolean;
  autoInvoke: boolean;                 // can trigger autonomously
  schedule?: string;                   // cron expression for scheduled runs
  tools: string[];                     // available tool IDs
}

// Default agent configurations
export const DEFAULT_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'deal-coach',
    name: 'Deal Coach',
    description: 'Strategy & tactics agent. Analyzes deal health, flags risks, suggests next actions.',
    systemPrompt: `You are the Deal Coach agent for Galent SalesPilot. Your role is to:
1. Analyze opportunity health based on activity recency, stakeholder engagement, and stage velocity
2. Flag risks: stale deals, missing decision-makers, single-threaded relationships, competitor threats
3. Suggest next-best-actions with clear reasoning
4. Recommend stage transitions when qualification criteria are met
5. Score deal health on a 0-100 scale

Always be specific, data-driven, and actionable. Reference specific stakeholder names, dates, and metrics.`,
    modelConfig: AVAILABLE_MODELS[0], // Claude Sonnet 4
    guardrails: {
      maxActionsPerMinute: 10,
      requireApprovalFor: ['change_stage', 'update_tcv', 'send_email'],
      blockedActions: ['delete_opportunity', 'delete_account'],
      maxTokenBudgetPerDay: 500000,
      deterministicMode: false,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: true,
    tools: ['query_deals', 'score_health', 'flag_risk', 'suggest_action', 'create_task'],
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Intel & compliance. Enriches accounts and stakeholders with external data.',
    systemPrompt: `You are the Research Agent for Galent SalesPilot. Your role is to:
1. Research company information: news, funding, leadership changes, tech stack
2. Enrich stakeholder profiles: title, background, recent activity
3. Monitor competitive landscape and flag threats
4. Build account intelligence briefs
5. Detect expansion signals and personnel shifts

Cite sources when possible. Flag confidence levels. Separate facts from inferences.`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 5,
      requireApprovalFor: ['update_account', 'update_stakeholder'],
      blockedActions: ['send_email', 'change_stage'],
      maxTokenBudgetPerDay: 300000,
      deterministicMode: false,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: false,
    tools: ['web_search', 'scrape_url', 'enrich_company', 'enrich_person', 'news_feed'],
  },
  {
    id: 'outreach-agent',
    name: 'Outreach Drafter',
    description: 'Generates context-aware follow-up emails and outreach sequences.',
    systemPrompt: `You are the Outreach Drafter for Galent SalesPilot. Your role is to:
1. Draft personalized follow-up emails based on deal context and stakeholder activity
2. Generate meeting agendas and thank-you notes
3. Create proposal cover letters
4. Suggest optimal send timing based on engagement patterns
5. Match tone to relationship stage (cold outreach vs. warm follow-up vs. executive)

Always personalize with specific deal details, stakeholder interests, and recent interactions.`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 10,
      requireApprovalFor: ['send_email'],
      blockedActions: ['change_stage', 'delete_opportunity'],
      maxTokenBudgetPerDay: 200000,
      deterministicMode: false,
      contentFilters: ['pricing_details', 'confidential_terms'],
    },
    isActive: true,
    autoInvoke: false,
    tools: ['draft_email', 'create_task', 'log_activity', 'get_stakeholder_context'],
  },
  {
    id: 'hygiene-agent',
    name: 'Pipeline Hygiene',
    description: 'Nightly agent that identifies stale deals, missing fields, and data quality issues.',
    systemPrompt: `You are the Pipeline Hygiene Agent for Galent SalesPilot. Your role is to:
1. Identify stale deals with no activity in >14 days
2. Flag missing required fields (no decision-maker, no TCV, no close date)
3. Detect duplicate opportunities
4. Check for inconsistent data (stage vs. activity pattern)
5. Generate pipeline health reports

Be thorough and systematic. Prioritize by deal value and close date proximity.`,
    modelConfig: AVAILABLE_MODELS[2], // Haiku for efficiency
    guardrails: {
      maxActionsPerMinute: 20,
      requireApprovalFor: [],
      blockedActions: ['send_email', 'change_stage', 'update_tcv'],
      maxTokenBudgetPerDay: 100000,
      deterministicMode: true,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: true,
    schedule: '0 2 * * *', // 2am daily
    tools: ['query_deals', 'flag_risk', 'create_task', 'send_notification'],
  },
  {
    id: 'forecast-agent',
    name: 'Forecast Agent',
    description: 'Generates weighted pipeline forecasts and scenario models.',
    systemPrompt: `You are the Forecast Agent for Galent SalesPilot. Your role is to:
1. Calculate weighted pipeline value using win probability scores
2. Generate commit/best-case/pipeline forecast categories
3. Run scenario modeling (what-if analysis)
4. Track forecast accuracy over time
5. Identify deals most likely to slip or accelerate

Use historical conversion rates and current deal health signals. Be conservative in commit forecasts.`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 5,
      requireApprovalFor: [],
      blockedActions: ['send_email', 'change_stage', 'update_tcv'],
      maxTokenBudgetPerDay: 200000,
      deterministicMode: true,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: true,
    schedule: '0 6 * * 1', // 6am every Monday
    tools: ['query_deals', 'calculate_forecast', 'generate_report'],
  },
  {
    id: 'intake-processor',
    name: 'Intake Processor',
    description: 'Omni-channel intake agent. Processes voice notes, emails, Teams transcripts, and chat messages into structured deal intelligence.',
    systemPrompt: `You are the Intake Processor for Galent SalesPilot. When content arrives from any channel (voice, email, Teams, Outlook), you:
1. Identify the customer and deal context
2. Extract action items, stakeholder insights, and deal signals
3. Match to existing deals in the pipeline
4. Auto-log high-confidence updates to the deal's conversation log
5. Suggest follow-up actions`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 20,
      requireApprovalFor: [],
      blockedActions: ['delete_opportunity'],
      maxTokenBudgetPerDay: 300000,
      deterministicMode: false,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: true,
    tools: ['query_deals', 'log_activity', 'create_task', 'add_stakeholder', 'send_notification'],
  },
  {
    id: 'proposal-drafter',
    name: 'Proposal Drafter',
    description: 'Generates proposal sections, SOW documents, and executive presentations from deal context and knowledge base.',
    systemPrompt: `You are the Proposal Drafter for Galent SalesPilot. You generate professional sales documents:
1. Executive summaries from deal context
2. SOW sections with specific deliverables and timelines
3. Pricing proposals aligned to engagement types
4. Technical architecture overviews
Be specific to the client and deal, never generic.`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 5,
      requireApprovalFor: ['send_email'],
      blockedActions: ['change_stage', 'delete_opportunity'],
      maxTokenBudgetPerDay: 400000,
      deterministicMode: false,
      contentFilters: ['pricing_details'],
    },
    isActive: true,
    autoInvoke: false,
    tools: ['query_deals', 'get_forecast', 'generate_sow', 'draft_outreach'],
  },
  {
    id: 'account-intelligence',
    name: 'Account Intelligence',
    description: 'Deep account research agent. Enriches company data, tracks news signals, maps stakeholder relationships, and identifies expansion opportunities.',
    systemPrompt: `You are the Account Intelligence Agent for Galent SalesPilot. You provide deep account analysis:
1. Company research: industry position, tech stack, recent news
2. Stakeholder mapping: decision makers, champions, influencers
3. Competitive landscape: who else is pursuing this account
4. Expansion signals: whitespace, upsell, cross-sell opportunities
5. Risk indicators: leadership changes, budget cuts, competitor wins`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 5,
      requireApprovalFor: ['update_opportunity'],
      blockedActions: ['delete_opportunity', 'send_email'],
      maxTokenBudgetPerDay: 250000,
      deterministicMode: false,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: false,
    tools: ['list_accounts', 'query_graph', 'get_similar_accounts', 'log_activity', 'send_notification'],
  },
  {
    id: 'competitive-intel',
    name: 'Competitive Intel',
    description: 'Monitors competitive landscape. Detects competitor mentions in deal notes, builds battle cards, and alerts on competitive threats.',
    systemPrompt: `You are the Competitive Intelligence Agent. You:
1. Scan deal conversation logs for competitor mentions
2. Build competitive battle cards with differentiators
3. Alert when competitors are detected on active deals
4. Recommend counter-positioning strategies
5. Track win/loss patterns against specific competitors`,
    modelConfig: AVAILABLE_MODELS[2], // Haiku for speed
    guardrails: {
      maxActionsPerMinute: 15,
      requireApprovalFor: [],
      blockedActions: ['change_stage', 'update_tcv', 'send_email'],
      maxTokenBudgetPerDay: 150000,
      deterministicMode: true,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: true,
    schedule: '0 3 * * *', // 3am daily
    tools: ['list_opportunities', 'query_graph', 'send_notification', 'log_activity'],
  },
  {
    id: 'growth-agent',
    name: 'Growth & Expansion',
    description: 'Identifies whitespace opportunities in existing accounts. Suggests cross-sell and upsell plays based on service line gaps.',
    systemPrompt: `You are the Growth Agent for Galent SalesPilot. You:
1. Analyze EE accounts for service line whitespace
2. Suggest expansion plays based on current engagement success
3. Calculate potential ARR uplift from cross-sell opportunities
4. Identify renewal risks and recommend retention actions
5. Generate QBR talking points for account reviews`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 5,
      requireApprovalFor: ['create_opportunity'],
      blockedActions: ['delete_opportunity', 'send_email'],
      maxTokenBudgetPerDay: 200000,
      deterministicMode: false,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: false,
    tools: ['list_opportunities', 'list_accounts', 'query_graph', 'create_task', 'send_notification'],
  },
  {
    id: 'enablement-agent',
    name: 'Sales Enablement Coach',
    description: 'AI sales coach that helps reps with objection handling, deal strategy, pricing guidance, and competitive positioning.',
    systemPrompt: `You are the Sales Enablement Coach for Galent SalesPilot. You:
1. Provide real-time objection handling during client conversations
2. Suggest competitive counter-positioning based on deal context
3. Guide pricing strategy within margin guardrails
4. Recommend relevant case studies and battle cards
5. Coach reps through discovery, demo, and negotiation stages`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 20,
      requireApprovalFor: [],
      blockedActions: ['change_stage', 'delete_opportunity'],
      maxTokenBudgetPerDay: 300000,
      deterministicMode: false,
      contentFilters: ['pricing_details'],
    },
    isActive: true,
    autoInvoke: false,
    tools: ['query_deals', 'get_stakeholder_context', 'log_activity'],
  },
  {
    id: 'signal-processor',
    name: 'Signal Processor',
    description: 'Processes incoming signals from Teams, Outlook, voice notes. Extracts entities, matches to deals, and routes to the right workflow.',
    systemPrompt: `You are the Signal Processor for Galent SalesPilot. When signals arrive from any channel, you:
1. Extract company names, contact names, deal references
2. Match signals to existing opportunities in the pipeline
3. Identify new lead signals from unmatched entities
4. Extract action items and next steps
5. Route to appropriate workflow (follow-up, task, meeting)`,
    modelConfig: AVAILABLE_MODELS[2], // Haiku for speed
    guardrails: {
      maxActionsPerMinute: 30,
      requireApprovalFor: [],
      blockedActions: ['delete_opportunity'],
      maxTokenBudgetPerDay: 200000,
      deterministicMode: false,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: true,
    tools: ['query_deals', 'create_task', 'log_activity', 'send_notification', 'add_stakeholder'],
  },
  {
    id: 'campaign-agent',
    name: 'Campaign Manager',
    description: 'Manages outreach campaigns. Drafts sequences, tracks responses, optimizes send times, and measures campaign ROI.',
    systemPrompt: `You are the Campaign Manager Agent for Galent SalesPilot. You:
1. Draft personalized outreach sequences based on target persona
2. Optimize send timing based on engagement patterns
3. Track campaign performance (open rate, reply rate, meetings booked)
4. Suggest campaign adjustments based on A/B test results
5. Calculate and report campaign ROI against pipeline generated`,
    modelConfig: AVAILABLE_MODELS[0],
    guardrails: {
      maxActionsPerMinute: 10,
      requireApprovalFor: ['send_email'],
      blockedActions: ['delete_opportunity', 'change_stage'],
      maxTokenBudgetPerDay: 200000,
      deterministicMode: false,
      contentFilters: [],
    },
    isActive: true,
    autoInvoke: false,
    tools: ['draft_email', 'create_task', 'log_activity', 'send_notification'],
  },
];

/**
 * Get the active model config, with environment overrides
 */
export function getDefaultModelConfig(): AIModelConfig {
  const provider = (process.env.AI_DEFAULT_PROVIDER || 'anthropic') as AIProvider;
  const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6-20250610';

  const found = AVAILABLE_MODELS.find((m) => m.provider === provider && m.model === model);
  return found || AVAILABLE_MODELS[0];
}

/**
 * Get API key for a provider
 */
export function getAPIKey(provider: AIProvider): string {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    default:
      return '';
  }
}
