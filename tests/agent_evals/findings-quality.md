# Agent Eval: Findings Generation Quality

## Purpose
Regression benchmark to catch prompt drift in findings/recommendation generation.

## Test Scenarios

### Scenario 1: Full Assessment (22 dimensions scored)
- **Input**: Workshop with all dimensions scored, 8+ findings, 5 use cases
- **Expected**: AI narrative covers all 3 levels, mentions specific dimension names
- **Quality Gate**: Narrative > 500 words, mentions "implication", no hallucinated dimensions

### Scenario 2: Partial Assessment (8 dimensions scored)
- **Input**: Workshop with only L1 dimensions scored
- **Expected**: AI acknowledges incomplete data, focuses on scored dimensions
- **Quality Gate**: Does NOT claim to analyze unscored levels

### Scenario 3: Recommendations Generation
- **Input**: Workshop with 10+ gaps including 3 critical
- **Expected**: 12+ recommendations across 4 categories
- **Quality Gate**: Each rec has text + category, at least 2 quick_wins, at least 2 governance

### Scenario 4: Asset Generation (Assessment Report)
- **Input**: Full workshop data
- **Expected**: 8+ sections with headers, specific to client name
- **Quality Gate**: Contains all sections from prompt, > 2000 words, no generic filler

## Running
```bash
# Manual: create a workshop, score dimensions, then test each generation
# TODO: automated via Playwright e2e
```
