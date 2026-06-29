# Feature: Telemetry & Observability

## Summary
Every AI call traced, metrics aggregated daily, visible in Agents page UI.

## Trace Fields
id, timestamp, assist, model, inputTokens, outputTokens, latencyMs, status, workshopId, userId, error

## Metrics
Per assist:model per day: calls, successes, errors, totalLatencyMs, avgLatencyMs

## UI (Agents Page)
- AI Calls Today (KPI card)
- Active Assists count
- Recent Traces count
- Metrics table (assist, calls, successes, errors, avgLatency)
- Expandable traces (status dot, assist, model, latency, timestamp)

## Runnable Evals (4 suites, 20 tests)
- Gateway: config validity, module resolution, sandbox validation, rate limiter
- Telemetry: module resolution, trace write, metrics read
- Config: 3 config files valid
- Workshop: scoring math (4 tests), constants (3 tests), AI registry (4 tests)

## Done Contract
- [ ] telemetry/traces/ has JSONL files per day
- [ ] telemetry/metrics/ has JSON files per day
- [ ] Agents page shows live telemetry data
- [ ] Evals run from UI with pass/fail results
- [ ] Accept rate trackable per assist type
