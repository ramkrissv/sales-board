# CLAUDE.md — SalesPilot by Galent AI

> **Platform:** SalesPilot — AI-native enterprise sales intelligence
> **Stack:** Next.js 14 (App Router) + TypeScript (strict) + MongoDB 7 + Redis 7 + Claude AI (Anthropic SDK)
> **Live:** https://salespilot.galent.ai

---

## Quick Start

```bash
npm install
cp .env.example .env.local     # DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_SECRET
npm run dev                     # http://localhost:3000
npx next build                  # must pass before every push
```

## Architecture

Read `specs/ARCHITECTURE.md` for the full immutable spec. Key principles:

1. **Server-authoritative** — All mutations via typed tRPC + zod. Client never writes DB directly.
2. **AI is a service** — Every assist goes through `src/lib/ai/gateway.ts` with the guardrail chain: rate limit → sandbox validation → token budget → Anthropic API → telemetry trace → metrics.
3. **Everything recorded** — Scores, findings, AI interactions all persisted with author + timestamp.
4. **Framework-as-data** — Assessment structure is rows, not code. Templates clone on creation.

## Agentic Structure

```
.claude/
  agents/
    planner.yml          # Specs → execution plans (opus, read-only specs)
    generator.yml        # Plans → code (sonnet, forbidden patterns enforced)
    evaluator.yml        # 7-criteria grading rubric (opus)
  commands/
    workshop.md          # /workshop dev quick reference
    audit.md             # /audit codebase check
  skills/
    workshop-assist.md   # AI assist registry pattern

specs/                   # IMMUTABLE — agents read, never modify
  ARCHITECTURE.md        # Core technical boundaries, stack, model routing
  features/              # Per-feature specs with acceptance criteria
  done_contracts/        # JSON schemas defining "success"

execution/               # ORCHESTRATION — planner writes, generator reads
  workflows/deploy.yml   # Full deploy pipeline with recovery
  tasks.json             # Active/completed task state machine

config/                  # ECONOMICS — read by src/lib/ai/budgets.ts
  token_budgets.json     # $50/day, model tier routing (haiku/sonnet/opus)
  rate_limits.json       # 30 rpm, 500 rph, 5 concurrent

gatekeeper/              # SECURITY — read by src/lib/ai/sandbox.ts
  sandbox.config.json    # File/git/network guardrails, forbidden prompt patterns
  approvals/             # High-risk mutation review queue

telemetry/               # OBSERVABILITY — written by src/lib/ai/telemetry.ts
  traces/                # JSONL per day (every AI call logged)
  metrics/               # JSON per day (aggregated calls/errors/latency)

tests/agent_evals/       # QUALITY GATE — regression benchmarks
  findings-quality.md    # Workshop findings generation (4 scenarios)
  deal-coach-quality.md  # Deal coach agent (4 scenarios)
  gateway-quality.md     # AI gateway guardrails (5 scenarios)

.githooks/               # ACTIVE (git config core.hooksPath .githooks)
  pre-commit             # Secrets scan + TypeScript check
  pre-push               # Full npx next build

.mcp.json                # MCP tool schemas (5 tools)
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/app/` | 32 Next.js pages (App Router) |
| `src/components/workshop/` | 13 components + 2 exhibits |
| `src/components/ai/` | 20 AI feature components |
| `src/lib/ai/` | gateway.ts, budgets.ts, sandbox.ts, telemetry.ts, execution.ts, anthropic.ts, config.ts |
| `src/lib/workshop/` | constants.ts, scoring.ts, types.ts, ai-registry.ts (12 assists), export.ts |
| `src/lib/trpc/routers/` | 24 tRPC routers (zod-validated) |
| `src/lib/db/models/` | 22 Mongoose models |
| `src/lib/agents/` | harness.ts (agent executor), coordinator.ts (workflows) |

## AI Model Routing

| Use Case | Model | Max Tokens |
|----------|-------|-----------|
| Standard assists | claude-sonnet-4-6 | 4,000 |
| Heavy synthesis (narrative, proposal, scope) | claude-opus-4-8 | 8,000 |
| Custom prompts (asset generation) | claude-sonnet-4-6 | 8,000 |
| Chat / Deal Copilot | claude-sonnet-4-6 | 600-3,000 |

## Workshop AI Assists (12)

`finding.synthesize` · `dimension.detail` · `dimension.suggest` · `gap.narrative` · `usecase.enrich` · `pilot.recommend` · `scope.synthesize` · `currentstate.narrative` · `proposal.generate` · `exec.summary` · `consistency.check` · `deep.discovery`

## Agent Fleet (13)

`deal-coach` · `research-agent` · `outreach-agent` · `hygiene-agent` · `forecast-agent` · `intake-processor` · `proposal-drafter` · `account-intelligence` · `competitive-intel` · `growth-agent` · `enablement-agent` · `signal-processor` · `campaign-agent`

## Deploy

```bash
git push origin main:feature/<name>
# SSM: sudo -u ubuntu bash -c 'cd /home/ubuntu/sales-board && git fetch origin && git checkout feature/<name> && git reset --hard origin/feature/<name> && docker compose build && docker compose up -d'
# Instance: i-085cae314b9dda866 | Build: ~7 min
```

## Guardrails

1. **No hardcoded secrets** — pre-commit hook scans for API keys
2. **No `any` in domain layer** — use types from `src/lib/workshop/types.ts`
3. **No direct AI calls** — use `aiGateway()` from `src/lib/ai/gateway.ts`
4. **No push to main** — always use feature branches
5. **Import constants from** `src/lib/workshop/constants.ts` — never duplicate MATURITY_LABELS, MATURITY_COLORS, EXEC_LABELS
6. **AI outputs are drafts** — always Accept/Edit/Discard, never auto-commit
7. **Build must pass** — pre-push hook runs `npx next build`
