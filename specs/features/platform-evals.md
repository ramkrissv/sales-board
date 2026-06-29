# Feature: Platform Evals

## Summary
Runnable test suites executable from the Agents page UI. Validates the entire agentic infrastructure.

## Suites

### Gateway (6 tests)
1. Config: token_budgets.json valid
2. Config: rate_limits.json valid
3. Config: sandbox.config.json valid
4. Gateway: aiGateway module resolves
5. Sandbox: clean prompt passes validation
6. Sandbox: prompt with secret is rejected

### Telemetry (3 tests)
1. Modules resolve (logTrace, updateMetrics, getTodayMetrics)
2. Trace write succeeds
3. Metrics readable

### Config (3 tests)
1. token_budgets.json has "budgets" key
2. rate_limits.json has "api" key
3. sandbox.config.json has "rules" key

### Workshop (8 tests)
1. levelReadiness returns 50% for [3,1] scores
2. scored count = 2
3. overallIndex = 50
4. maturityStage = "Governed"
5. MATURITY_LABELS has 5 entries
6. MATURITY_COLORS has 5 entries
7. EXEC_LABELS has 5 entries
8. 4 key AI assists resolve from registry

## Done Contract
- [ ] All 20 tests pass (100%)
- [ ] UI shows per-test pass/fail with detail
- [ ] Failed suites auto-expand
- [ ] Score displayed as percentage
