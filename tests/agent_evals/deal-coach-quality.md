# Agent Eval: Deal Coach Quality

## Purpose
Regression benchmark for the deal-coach agent — the most frequently invoked agent.

## Test Scenarios

### Scenario 1: Pipeline Analysis
- **Input**: "Analyze the entire pipeline"
- **Expected**: Lists deals by stage, identifies risks, gives 3+ recommendations
- **Quality Gate**: Mentions specific deal names + dollar amounts, not generic advice

### Scenario 2: At-Risk Detection
- **Input**: "Find all at-risk deals"
- **Expected**: Identifies stale deals (14+ days), zero TCV, missing decision makers
- **Quality Gate**: Each risk has a specific fix suggestion, not just "follow up"

### Scenario 3: Next Steps
- **Input**: "Suggest next steps for Negotiation deals"
- **Expected**: Per-deal specific actions with owner names
- **Quality Gate**: Creates at least 1 task per deal in Negotiation stage

### Scenario 4: Score Health
- **Input**: Query deal health for a specific opportunity
- **Expected**: 0-100 score with breakdown (activity, stakeholders, velocity)
- **Quality Gate**: Score correlates with deal staleness and stakeholder count
