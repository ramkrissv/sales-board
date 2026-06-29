# SalesPilot Architecture — Immutable Spec

> This document defines the core technical boundaries. Agents and humans read this
> before writing any code. Changes require explicit approval.

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 App Router + TypeScript (strict) | Full-stack, RSC, Server Actions |
| Styling | Tailwind + shadcn/ui + design tokens | Fast, consistent, craft bar |
| State | React Query (server cache) + Zustand (UI only) | Server is source of truth |
| DB | MongoDB 7 (Mongoose) + Redis 7 | Embedded docs, real-time |
| AI | Anthropic SDK (server-only), Assist Registry | First-class Claude integration |
| API | tRPC (typed, zod-validated) | End-to-end type safety |
| Deploy | Docker Compose on EC2 | Single-command deploy |

## Architecture Principles

1. **Server-authoritative** — All mutations through typed tRPC procedures with zod validation. Client never writes DB directly, never sees API key.
2. **AI is a service** — Every assist is a registered, typed function with model routing, output schema, and interaction logging. Adding AI = adding a registry entry.
3. **Everything recorded** — Scores, findings, AI interactions — all persisted with author + timestamp.
4. **Framework-as-data** — Assessment structure is rows, not code. Templates are data, cloned on creation.
5. **One rendering path** — Screen and print/PDF use the same components.
6. **Typed end to end** — TS strict, zod at boundaries, Mongoose types through domain layer.

## Model Routing

| Use case | Model | Max tokens |
|----------|-------|-----------|
| Default assists (finding, detail, gap) | claude-sonnet-4-6 | 4,000 |
| Heavy synthesis (narrative, proposal, scope) | claude-opus-4-8 | 8,000 |
| Custom prompts (asset generation) | claude-sonnet-4-6 | 8,000 |
| Chat / Deal Copilot | claude-sonnet-4-6 | 600-3,000 |

## Data Model (Mongoose Embedded)

Workshop = single document containing:
- framework (levels → dimensions → scores → findings)
- useCases, scopeItems, proposals, aiInteractions
- Clone-on-create from template — one workshop's edits never affect another's

Opportunity = separate collection, linked by workshopId.

## Directory Map

```
src/
  app/           # Next.js pages (App Router)
  components/    # React components
    workshop/    # 12 components + 2 exhibits
    ai/          # Deal Copilot, AI panels
    kanban/      # Pipeline views
    modals/      # Deal Detail, etc.
  lib/
    workshop/    # constants, scoring, types, ai-registry, export
    trpc/        # tRPC routers
    db/          # Mongoose models
    ai/          # Anthropic client, parsers
    presales/    # Proposal templates
  middleware.ts  # Auth middleware
```

## Security Boundaries

- API key: server-only (env var, never in client bundle)
- Auth: NextAuth with middleware enforcement
- RBAC: Owner > Lead > Contributor > Viewer
- Input: Zod validation on every tRPC procedure
- AI: Human-in-the-loop (Accept/Edit/Discard) on all outputs
- Public paths: /login, /api/*, /_next, /plugins, *.html, *.svg, *.png
