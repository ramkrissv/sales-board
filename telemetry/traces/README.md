# Telemetry Traces

AI interaction traces are stored in MongoDB via the `aiInteractions` array on each Workshop document.

## What's Traced

| Field | Description |
|-------|-------------|
| `id` | Unique interaction ID (ai-{timestamp36}) |
| `assist` | Registry key (e.g., "finding.synthesize") |
| `model` | Model used (claude-sonnet-4-6, claude-opus-4-8) |
| `input` | Prompt input data (JSON) |
| `output` | Raw AI response |
| `status` | proposed → accepted/edited/rejected |
| `userId` | Who triggered it |
| `createdAt` | Timestamp |

## Querying Traces

```javascript
// All interactions for a workshop
db.workshops.findOne({ id: "WS-xxx" }, { aiInteractions: 1 })

// All rejected interactions (signal for prompt tuning)
db.workshops.aggregate([
  { $unwind: "$aiInteractions" },
  { $match: { "aiInteractions.status": "rejected" } },
  { $group: { _id: "$aiInteractions.assist", count: { $sum: 1 } } }
])
```

## Metrics to Watch
- Accept rate per assist type (target: > 70%)
- Average tokens per assist type
- Reject rate spikes (indicates prompt drift)
- Model cost per workshop
