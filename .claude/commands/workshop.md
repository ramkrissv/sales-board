# /workshop — Workshop module development guide

Quick reference for the workshop assessment engine.

## Key files
- `src/app/workshop/[id]/page.tsx` — 9-tab workshop page
- `src/components/workshop/` — 12 components + 2 exhibits
- `src/lib/workshop/constants.ts` — Shared constants (MATURITY, COLORS, EXEC_LABELS)
- `src/lib/workshop/scoring.ts` — Pure scoring functions
- `src/lib/workshop/ai-registry.ts` — 12 AI assists
- `src/lib/workshop/types.ts` — TypeScript interfaces
- `src/lib/workshop/export.ts` — HTML report generation
- `src/lib/trpc/routers/workshop.ts` — Full CRUD + AI endpoints
- `src/lib/db/models/workshop.ts` — Mongoose schema

## Adding a new AI assist
1. Add entry to `ai-registry.ts` with key, model, buildPrompt, schema
2. Call via `trpc.workshop.runAssist.mutate({ workshopId, assistKey, input })`
3. For custom prompts, pass `_customPrompt` in input

## Adding a new exhibit
1. Create component in `src/components/workshop/exhibits/`
2. Accept workshop data as props, render identically on screen and print
3. Import in WorkshopCockpit or WorkshopFindings
