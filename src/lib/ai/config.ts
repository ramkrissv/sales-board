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
  // Anthropic
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    maxTokens: 8192,
    temperature: 0.7,
    isDefault: true,
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    displayName: 'Claude Opus 4',
    maxTokens: 8192,
    temperature: 0.5,
  },
  {
    provider: 'anthropic',
    model: 'claude-haiku-4-20250514',
    displayName: 'Claude Haiku 4',
    maxTokens: 4096,
    temperature: 0.8,
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
    systemPrompt: `You are the Deal Coach agent for Galent AI Sales Intelligence Platform. Your role is to:
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
    systemPrompt: `You are the Research Agent for Galent AI. Your role is to:
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
    systemPrompt: `You are the Outreach Drafter for Galent AI. Your role is to:
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
    systemPrompt: `You are the Pipeline Hygiene Agent for Galent AI. Your role is to:
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
    systemPrompt: `You are the Forecast Agent for Galent AI. Your role is to:
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
];

/**
 * Get the active model config, with environment overrides
 */
export function getDefaultModelConfig(): AIModelConfig {
  const provider = (process.env.AI_DEFAULT_PROVIDER || 'anthropic') as AIProvider;
  const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-20250514';

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
