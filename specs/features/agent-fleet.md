# Feature: Agent Fleet & Autonomous Mode

## Summary
13 AI agents with guardrails, tool access, and optional autonomous execution. Coordinated via workflows.

## Agents
1. deal-coach — Strategy & risk analysis
2. research-agent — Company/stakeholder enrichment
3. outreach-agent — Email drafting
4. hygiene-agent — Pipeline cleanup (scheduled 2am daily)
5. forecast-agent — Weighted forecast (scheduled 6am Monday)
6. intake-processor — Multi-channel signal processing
7. proposal-drafter — SOW/proposal generation
8. account-intelligence — Account 360 briefs
9. competitive-intel — Competitor detection (scheduled 3am daily)
10. growth-agent — Whitespace/expansion plays
11. enablement-agent — Sales coaching
12. signal-processor — Signal routing
13. campaign-agent — Outreach campaign management

## Workflows (6)
Deal Deep Dive, Proposal Accelerator, Pipeline Health, Lead Enrichment, Deal Rescue, Growth Play

## Done Contract
- [ ] All 13 agents invocable from Agents page
- [ ] Autonomous mode toggleable with approval queue
- [ ] Each agent has: model, guardrails, blocked actions, tools
- [ ] Workflows chain agents with context passing
- [ ] Agent runs logged as activities
