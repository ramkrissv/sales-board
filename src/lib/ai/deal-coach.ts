import { getAnthropicClient } from './anthropic';

export interface DealAnalysis {
  healthScore: number;
  winProbability: number;
  risks: { type: string; message: string; severity: 'low' | 'medium' | 'high' | 'critical' }[];
  actions: { action: string; reason: string; priority: 'low' | 'medium' | 'high' }[];
  summary: string;
  generatedAt: string;
}

export async function analyzeDeal(opportunity: any): Promise<DealAnalysis> {
  const client = getAnthropicClient();
  const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6';

  const stakeholders = opportunity.customerStakeholders || [];
  const tasks = opportunity.subTasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === 'complete').length;
  const overdueTasks = tasks.filter(
    (t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date()
  ).length;

  const prompt = `You are the Deal Coach AI agent for Galent Sales Intelligence Platform. Analyze this sales opportunity and provide a structured assessment.

## Opportunity Data
- **Customer**: ${opportunity.customerName}
- **Opportunity**: ${opportunity.opportunityName}
- **Status/Stage**: ${opportunity.status}
- **TCV**: $${(opportunity.tcv || 0).toLocaleString()}
- **Margin**: ${opportunity.margin || 'Not set'}%
- **Industry**: ${opportunity.industry}
- **Region**: ${opportunity.region}
- **Service Line**: ${opportunity.serviceLine || 'Not set'}
- **Billing Model**: ${opportunity.billingModel || 'Not set'}
- **Deal Duration**: ${opportunity.dealDuration}
- **Primary Owner**: ${opportunity.primaryOwner}
- **Sales POCs**: ${(opportunity.salesPOCs || []).join(', ') || 'None'}
- **Presales POCs**: ${(opportunity.presalesPOCs || []).join(', ') || 'None'}
- **Expected Close**: ${opportunity.expectedCloseDate}
- **Start Date**: ${opportunity.startDate}
- **Source**: ${opportunity.source}
- **Tags**: ${(opportunity.customTags || []).join(', ') || 'None'}

## Stakeholders (${stakeholders.length} total)
${stakeholders.map((s: any) => `- ${s.name} (${s.title})${s.isDecisionMaker ? ' [DECISION MAKER]' : ''}${s.isPrimaryContact ? ' [PRIMARY CONTACT]' : ''}`).join('\n') || 'No stakeholders added'}

## Tasks (${completedTasks}/${tasks.length} complete, ${overdueTasks} overdue)
${tasks.map((t: any) => `- [${t.status === 'complete' ? 'x' : ' '}] ${t.name} (${t.owner}, due ${t.dueDate}, ${t.priority})`).join('\n') || 'No tasks'}

## Conversation Log
${opportunity.conversationLog || 'No conversation log'}

## Analysis Instructions
Respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "healthScore": <0-100 integer>,
  "winProbability": <0-100 integer>,
  "risks": [{"type": "<stale_engagement|missing_stakeholder|no_decision_maker|overdue_tasks|low_tcv|no_activity|competitor_threat|single_threaded>", "message": "<specific actionable message>", "severity": "<low|medium|high|critical>"}],
  "actions": [{"action": "<specific next step>", "reason": "<why this matters>", "priority": "<low|medium|high>"}],
  "summary": "<2-3 sentence natural language summary of deal health and key recommendation>"
}

Be specific to THIS deal. Reference actual stakeholder names, dates, and data points. Don't be generic.`;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    // Try to parse the JSON response — extract JSON object even if surrounded by text
    const cleaned = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // First try direct parse, then regex extraction
    let analysis: DealAnalysis;
    try {
      analysis = JSON.parse(cleaned) as DealAnalysis;
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      analysis = JSON.parse(jsonMatch[0]) as DealAnalysis;
    }

    analysis.generatedAt = new Date().toISOString();
    // Ensure numeric fields are numbers
    analysis.healthScore = Number(analysis.healthScore) || 50;
    analysis.winProbability = Number(analysis.winProbability) || 30;
    return analysis;
  } catch {
    // Fallback if parsing fails
    return {
      healthScore: 50,
      winProbability: 30,
      risks: [
        {
          type: 'parse_error',
          message: 'AI analysis could not be parsed. Please refresh to retry.',
          severity: 'low',
        },
      ],
      actions: [
        { action: 'Review deal manually', reason: 'AI analysis needs review', priority: 'medium' },
      ],
      summary: text.slice(0, 500),
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate a pipeline-wide summary using AI
 */
export async function analyzePipeline(opportunities: any[]): Promise<string> {
  const client = getAnthropicClient();
  const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6';

  const active = opportunities.filter((o) => !['Won', 'Lost'].includes(o.status));
  const totalTcv = active.reduce((sum, o) => sum + (o.tcv || 0), 0);
  const byStatus: Record<string, number> = {};
  active.forEach((o) => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  });

  const prompt = `You are the Deal Coach for Galent Sales Intelligence. Give a brief (3-4 sentences) pipeline health summary.

Pipeline: ${active.length} active deals, $${(totalTcv / 1000).toFixed(0)}k total TCV
By stage: ${Object.entries(byStatus).map(([s, c]) => `${s}: ${c}`).join(', ')}
Negotiation deals: ${opportunities.filter((o) => o.status === 'Negotiation').map((o) => o.customerName).join(', ') || 'None'}
Recent wins: ${opportunities.filter((o) => o.status === 'Won').map((o) => o.customerName).join(', ') || 'None'}

Be specific, mention company names, and give one clear actionable recommendation. Keep it conversational, not robotic.`;

  const response = await client.messages.create({
    model,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text'
    ? response.content[0].text
    : 'Unable to generate analysis.';
}
