/**
 * AI Gateway — single entry point for ALL AI calls across the platform.
 * Enforces: rate limits, sandbox validation, token budgets, telemetry logging.
 * Every router should call this instead of client.messages.create() directly.
 */

import { getAnthropicClient } from './anthropic';
import { checkRateLimit, getMaxTokens } from './budgets';
import { validatePrompt, getSandboxMaxTokens } from './sandbox';
import { logTrace, updateMetrics } from './telemetry';

interface GatewayCallParams {
  model?: string;
  max_tokens?: number;
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  /** For telemetry — which feature/assist triggered this */
  source: string;
  /** Optional: workshop or opportunity ID for trace linking + document context */
  entityId?: string;
  entityType?: 'opportunity' | 'workshop' | 'account';
  userId?: string;
  /** If true, auto-fetch documents from knowledge graph for this entity */
  includeDocumentContext?: boolean;
}

interface GatewayResult {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Call the AI through the guardrail chain:
 * 1. Rate limit (config/token_budgets.json)
 * 2. Prompt validation (gatekeeper/sandbox.config.json)
 * 3. Token cap enforcement
 * 4. Anthropic API call (timed)
 * 5. Telemetry trace (telemetry/traces/)
 * 6. Metrics update (telemetry/metrics/)
 */
export async function aiGateway(params: GatewayCallParams): Promise<GatewayResult> {
  const model = params.model || process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6';
  const startMs = Date.now();

  // 1. Rate limit
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    logTrace({
      id: `gw-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      assist: params.source,
      model,
      latencyMs: 0,
      status: 'error',
      workshopId: params.entityId,
      userId: params.userId,
      error: `Rate limit exceeded (retry after ${rateCheck.retryAfter}s)`,
    });
    throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}s.`);
  }

  // 2. Prompt validation
  const fullPrompt = params.messages.map(m => m.content).join('\n') + (params.system || '');
  const validation = validatePrompt(fullPrompt);
  if (!validation.valid) {
    logTrace({
      id: `gw-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      assist: params.source,
      model,
      latencyMs: 0,
      status: 'error',
      error: `Sandbox: ${validation.violation}`,
    });
    throw new Error(`Sandbox violation: ${validation.violation}`);
  }

  // 2.5. RAG — semantic search for relevant document chunks
  if (params.includeDocumentContext && params.entityId && params.entityType) {
    try {
      const { searchDocuments } = await import('@/lib/rag/embeddings');
      // Use the user's question as the search query
      const query = params.messages[params.messages.length - 1]?.content || '';
      const results = await searchDocuments({
        query: query.slice(0, 200),
        entityType: params.entityType,
        entityId: params.entityId,
        limit: 5,
      });
      if (results.length > 0) {
        const docContext = `\n\nRELEVANT DOCUMENT CONTEXT (${results.length} chunks, RAG retrieval):\n${results.map(r => `[${r.documentName}] (relevance: ${Math.round(r.score * 100)}%):\n${r.content}`).join('\n\n---\n\n').slice(0, 3000)}`;
        const lastMsg = params.messages[params.messages.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
          lastMsg.content += docContext;
        }
      }
    } catch {} // Non-blocking — RAG is best-effort
  }

  // 3. Token cap
  const configMax = getMaxTokens(model);
  const sandboxMax = getSandboxMaxTokens();
  const maxTokens = Math.min(params.max_tokens || configMax, configMax, sandboxMax);

  // 4. Call Anthropic
  const client = getAnthropicClient();
  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(params.system ? { system: params.system } : {}),
      messages: params.messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const latencyMs = Date.now() - startMs;

    // 5. Trace
    logTrace({
      id: `gw-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      assist: params.source,
      model,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs,
      status: 'success',
      workshopId: params.entityId,
      userId: params.userId,
    });

    // 6. Metrics
    updateMetrics(params.source, model, latencyMs, true);

    return {
      text,
      model,
      latencyMs,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startMs;
    logTrace({
      id: `gw-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      assist: params.source,
      model,
      latencyMs,
      status: 'error',
      workshopId: params.entityId,
      userId: params.userId,
      error: err.message,
    });
    updateMetrics(params.source, model, latencyMs, false);
    throw err;
  }
}
