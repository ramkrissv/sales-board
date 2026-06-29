# Agent Eval: AI Gateway Guardrails

## Purpose
Verify the guardrail chain works end-to-end — rate limits, sandbox, telemetry.

## Test Scenarios

### Scenario 1: Rate Limit Enforcement
- **Input**: Fire 35 AI calls within 60 seconds
- **Expected**: First 30 succeed, 31st throws "Rate limit exceeded"
- **Quality Gate**: Error includes retryAfter value

### Scenario 2: Sandbox Validation
- **Input**: Prompt containing "sk-ant-api03-xxxxxxxxxxxxx" (fake key pattern)
- **Expected**: Call rejected with "Sandbox violation"
- **Quality Gate**: No call made to Anthropic API

### Scenario 3: Token Budget Enforcement
- **Input**: Request max_tokens=50000 for a sonnet call
- **Expected**: Capped to 4000 (sonnet limit from config)
- **Quality Gate**: Response received within budget

### Scenario 4: Telemetry Logging
- **Input**: Any successful AI call
- **Expected**: Entry appears in telemetry/traces/YYYY-MM-DD.jsonl
- **Quality Gate**: Entry has id, timestamp, assist, model, latencyMs, status

### Scenario 5: Metrics Aggregation
- **Input**: 3 calls to different assists
- **Expected**: telemetry/metrics/YYYY-MM-DD.json shows 3 entries with call counts
- **Quality Gate**: _totalCalls = 3, avgLatencyMs > 0
