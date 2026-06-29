/**
 * Token budget enforcement — reads from config/token_budgets.json
 * Wired into every AI call via the workshop router and ai router.
 */

import fs from 'fs';
import path from 'path';

interface TokenBudgets {
  budgets: {
    daily_limit_usd: number;
    monthly_limit_usd: number;
    per_request_max_tokens: Record<string, number>;
  };
  model_routing: Record<string, { model: string; use_cases: string[] }>;
  rate_limits: {
    requests_per_minute: number;
    requests_per_hour: number;
    concurrent_max: number;
  };
}

let _config: TokenBudgets | null = null;

function loadConfig(): TokenBudgets {
  if (_config) return _config;
  try {
    const configPath = path.resolve(process.cwd(), 'config/token_budgets.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    _config = JSON.parse(raw);
    return _config!;
  } catch {
    // Fallback defaults if config file missing
    return {
      budgets: { daily_limit_usd: 50, monthly_limit_usd: 500, per_request_max_tokens: { haiku: 2000, sonnet: 4000, opus: 8000 } },
      model_routing: {},
      rate_limits: { requests_per_minute: 30, requests_per_hour: 500, concurrent_max: 5 },
    };
  }
}

/** Get max tokens for a model tier */
export function getMaxTokens(model: string): number {
  const config = loadConfig();
  if (model.includes('opus')) return config.budgets.per_request_max_tokens.opus || 8000;
  if (model.includes('haiku')) return config.budgets.per_request_max_tokens.haiku || 2000;
  return config.budgets.per_request_max_tokens.sonnet || 4000;
}

/** Get the configured model for a use case (assist key) */
export function getModelForUseCase(assistKey: string): string | null {
  const config = loadConfig();
  for (const tier of Object.values(config.model_routing)) {
    if (tier.use_cases.includes(assistKey)) return tier.model;
  }
  return null;
}

/** Get rate limits */
export function getRateLimits() {
  return loadConfig().rate_limits;
}

/** Simple in-memory rate limiter */
const requestLog: number[] = [];

export function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const config = loadConfig();
  const now = Date.now();
  const oneMinAgo = now - 60_000;
  const oneHourAgo = now - 3_600_000;

  // Clean old entries
  while (requestLog.length > 0 && requestLog[0] < oneHourAgo) requestLog.shift();

  const lastMinute = requestLog.filter(t => t > oneMinAgo).length;
  const lastHour = requestLog.length;

  if (lastMinute >= config.rate_limits.requests_per_minute) {
    return { allowed: false, retryAfter: 60 - Math.floor((now - oneMinAgo) / 1000) };
  }
  if (lastHour >= config.rate_limits.requests_per_hour) {
    return { allowed: false, retryAfter: 3600 - Math.floor((now - oneHourAgo) / 1000) };
  }

  requestLog.push(now);
  return { allowed: true };
}
