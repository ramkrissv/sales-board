# Agent Eval: Full Fleet Coverage

## Purpose
Verify all 13 agents can be invoked and produce valid output.

## Test Scenarios (one per agent)

### 1. deal-coach
- Input: "Analyze pipeline risks"
- Gate: Mentions specific deals, gives numbered recommendations

### 2. research-agent
- Input: "Research account JPMC"
- Gate: Returns structured company data, cites confidence level

### 3. outreach-agent
- Input: "Draft follow-up email for Hughes deal"
- Gate: Under 150 words, personalized to deal context

### 4. hygiene-agent
- Input: "Find stale deals"
- Gate: Identifies deals >14 days without activity

### 5. forecast-agent
- Input: "Generate weekly pipeline forecast"
- Gate: Includes weighted total, commit/best-case/pipeline breakdown

### 6. intake-processor
- Input: Process a Teams transcript
- Gate: Extracts entities, matches to existing deal or suggests new

### 7. proposal-drafter
- Input: "Draft exec summary for Hughes proposal"
- Gate: 2-3 paragraphs, specific to deal data

### 8. account-intelligence
- Input: "360 view of Hughes Networks"
- Gate: Returns deals, stakeholders, expansion opportunities

### 9. competitive-intel
- Input: "Scan for competitor mentions"
- Gate: Identifies competitors from conversation logs

### 10. growth-agent
- Input: "Whitespace analysis for EE accounts"
- Gate: Maps service line gaps, calculates ARR uplift

### 11. enablement-agent
- Input: "Coaching tips for Negotiation deals"
- Gate: Deal-specific objection handling, talk tracks

### 12. signal-processor
- Input: Process an email signal
- Gate: Extracts company/contact, classifies signal type

### 13. campaign-agent
- Input: "Campaign insights for outreach"
- Gate: Returns open rate analysis, send time recommendations
