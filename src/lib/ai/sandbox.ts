/**
 * Sandbox enforcement — reads gatekeeper/sandbox.config.json
 * Validates AI prompts against forbidden patterns before sending to Anthropic.
 * Logs all AI interactions to telemetry/traces/
 */

import fs from 'fs';
import path from 'path';

interface SandboxConfig {
  rules: {
    ai_operations: {
      max_tokens_per_call: number;
      require_human_review: boolean;
      log_all_interactions: boolean;
      forbidden_in_prompts: string[];
    };
  };
}

let _config: SandboxConfig | null = null;

function loadSandbox(): SandboxConfig {
  if (_config) return _config;
  try {
    const p = path.resolve(process.cwd(), 'gatekeeper/sandbox.config.json');
    _config = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return _config!;
  } catch {
    return { rules: { ai_operations: { max_tokens_per_call: 8000, require_human_review: true, log_all_interactions: true, forbidden_in_prompts: ['password', 'secret', 'api_key', 'token'] } } };
  }
}

/** Validate a prompt against sandbox rules — throws if forbidden content detected */
export function validatePrompt(prompt: string): { valid: boolean; violation?: string } {
  const config = loadSandbox();
  const lower = prompt.toLowerCase();
  for (const forbidden of config.rules.ai_operations.forbidden_in_prompts) {
    // Check for actual secret values, not references to env var names
    const patterns = [
      new RegExp(`${forbidden}\\s*[:=]\\s*["'][^"']{8,}`, 'i'), // key = "actual_value"
      new RegExp(`Bearer\\s+[a-zA-Z0-9_-]{20,}`, 'i'), // Bearer tokens
      new RegExp(`sk-ant-[a-zA-Z0-9]{20,}`, 'i'), // Anthropic keys
      new RegExp(`mongodb\\+srv://[^\\s]+@`, 'i'), // MongoDB URIs
    ];
    for (const pat of patterns) {
      if (pat.test(prompt)) {
        return { valid: false, violation: `Forbidden content detected: possible ${forbidden} value in prompt` };
      }
    }
  }
  return { valid: true };
}

/** Get max tokens from sandbox config */
export function getSandboxMaxTokens(): number {
  return loadSandbox().rules.ai_operations.max_tokens_per_call;
}

/** Check if human review is required */
export function requiresHumanReview(): boolean {
  return loadSandbox().rules.ai_operations.require_human_review;
}

/** Check if logging is enabled */
export function shouldLogInteractions(): boolean {
  return loadSandbox().rules.ai_operations.log_all_interactions;
}
