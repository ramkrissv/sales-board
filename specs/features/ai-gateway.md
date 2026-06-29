# Feature: AI Gateway & Guardrail Chain

## Summary
Centralized AI call wrapper enforcing rate limits, sandbox validation, token budgets, and telemetry on every AI call across the platform.

## Call Sites (13)
- account.ts: intentScore
- lead.ts: qualify, enrich, outreach, batchQualify
- integration.ts: discover
- ai.ts: generateSOW, processTranscript, processIntake, chat
- workshop.ts: runAssist
- harness.ts: agent steps

## Guardrail Chain
1. Rate limit → config/token_budgets.json (30 rpm, 500 rph)
2. Sandbox → gatekeeper/sandbox.config.json (forbidden patterns)
3. Token cap → min(config budget, sandbox max)
4. Anthropic API call (timed)
5. Trace → telemetry/traces/YYYY-MM-DD.jsonl
6. Metrics → telemetry/metrics/YYYY-MM-DD.json

## Done Contract
- [ ] All 13 call sites use aiGateway or have direct guardrails
- [ ] Rate limit rejects call 31+ in 60 seconds
- [ ] Sandbox catches hardcoded API keys in prompts
- [ ] Token budget caps sonnet at 4000, opus at 8000
- [ ] Every call has a trace entry
- [ ] Daily metrics aggregate correctly
