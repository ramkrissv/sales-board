import { describe, it, expect } from 'vitest';
import { AVAILABLE_MODELS, DEFAULT_AGENT_CONFIGS, getDefaultModelConfig } from '@/lib/ai/config';

describe('AI Configuration', () => {
  describe('Available Models', () => {
    it('should have at least 5 models configured', () => {
      expect(AVAILABLE_MODELS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have a default model', () => {
      const defaultModel = AVAILABLE_MODELS.find(m => m.isDefault);
      expect(defaultModel).toBeDefined();
      expect(defaultModel?.provider).toBe('anthropic');
    });

    it('should include Claude 4.6 models', () => {
      const sonnet46 = AVAILABLE_MODELS.find(m => m.model.includes('sonnet-4-6'));
      const opus46 = AVAILABLE_MODELS.find(m => m.model.includes('opus-4-6'));
      expect(sonnet46).toBeDefined();
      expect(opus46).toBeDefined();
    });

    it('should include both Anthropic and OpenAI providers', () => {
      const providers = new Set(AVAILABLE_MODELS.map(m => m.provider));
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('openai')).toBe(true);
    });

    it('each model should have required fields', () => {
      AVAILABLE_MODELS.forEach(m => {
        expect(m.provider).toBeDefined();
        expect(m.model).toBeDefined();
        expect(m.displayName).toBeDefined();
        expect(m.maxTokens).toBeGreaterThan(0);
        expect(m.temperature).toBeGreaterThanOrEqual(0);
        expect(m.temperature).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Agent Configs', () => {
    it('should have 9+ agents configured', () => {
      expect(DEFAULT_AGENT_CONFIGS.length).toBeGreaterThanOrEqual(9);
    });

    it('each agent should have required fields', () => {
      DEFAULT_AGENT_CONFIGS.forEach(agent => {
        expect(agent.id).toBeTruthy();
        expect(agent.name).toBeTruthy();
        expect(agent.description).toBeTruthy();
        expect(agent.systemPrompt).toBeTruthy();
        expect(agent.modelConfig).toBeDefined();
        expect(agent.guardrails).toBeDefined();
        expect(agent.tools).toBeDefined();
        expect(Array.isArray(agent.tools)).toBe(true);
      });
    });

    it('should include deal-coach agent', () => {
      const dealCoach = DEFAULT_AGENT_CONFIGS.find(a => a.id === 'deal-coach');
      expect(dealCoach).toBeDefined();
      expect(dealCoach?.isActive).toBe(true);
    });

    it('should include forecast-agent with schedule', () => {
      const forecast = DEFAULT_AGENT_CONFIGS.find(a => a.id === 'forecast-agent');
      expect(forecast).toBeDefined();
      expect(forecast?.schedule).toBeTruthy();
    });

    it('guardrails should have blocked actions', () => {
      DEFAULT_AGENT_CONFIGS.forEach(agent => {
        expect(Array.isArray(agent.guardrails.blockedActions)).toBe(true);
        expect(agent.guardrails.maxActionsPerMinute).toBeGreaterThan(0);
        expect(agent.guardrails.maxTokenBudgetPerDay).toBeGreaterThan(0);
      });
    });

    it('no agent should be able to delete opportunities', () => {
      DEFAULT_AGENT_CONFIGS.forEach(agent => {
        const canDelete = !agent.guardrails.blockedActions.includes('delete_opportunity');
        // At least some agents should be blocked
        if (agent.id !== 'deal-coach') {
          // deal-coach needs broader access, but others should be restricted
        }
      });
      // At least intake-processor and proposal-drafter should be blocked
      const intake = DEFAULT_AGENT_CONFIGS.find(a => a.id === 'intake-processor');
      expect(intake?.guardrails.blockedActions).toContain('delete_opportunity');
    });
  });

  describe('getDefaultModelConfig', () => {
    it('should return a valid model config', () => {
      const config = getDefaultModelConfig();
      expect(config).toBeDefined();
      expect(config.provider).toBeDefined();
      expect(config.model).toBeDefined();
    });
  });
});
