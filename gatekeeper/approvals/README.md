# Approvals Queue

High-risk mutations are intercepted and queued here for human review.

## What triggers approval

| Action | Risk Level | Auto-approve? |
|--------|-----------|---------------|
| Modify middleware.ts | High | No |
| Modify AI router (ai.ts) | High | No |
| Push to main branch | Blocked | No |
| Delete workshop data | Medium | No |
| Modify CLAUDE.md | High | No |
| New tRPC procedure | Medium | After eval |
| New AI assist registration | Medium | After eval |

## Approval format

```json
{
  "id": "APR-001",
  "action": "modify src/middleware.ts",
  "requestedBy": "generator",
  "reason": "Add public path for dossier.html",
  "diff": "...",
  "status": "approved|pending|rejected",
  "reviewedBy": "human",
  "timestamp": "2026-06-29T10:00:00Z"
}
```
