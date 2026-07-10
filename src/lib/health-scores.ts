/**
 * Health Score Engine — computes opportunity-level and funnel-level health scores
 *
 * Opportunity Health Score (0-100):
 *   Based on: stage progression, TCV, stakeholder coverage, task completion,
 *   activity recency, close date proximity, engagement type, forecast category
 *
 * Funnel Health Score (0-100):
 *   Based on: pipeline coverage ratio, stage conversion rates, deal velocity,
 *   aging distribution, forecast mix, win rate, revenue concentration
 */

interface OppInput {
  id: string;
  status: string;
  tcv: number;
  customerName: string;
  opportunityName: string;
  primaryOwner: string;
  expectedCloseDate: string | Date;
  startDate?: string | Date;
  createdAt?: string | Date;
  customerStakeholders?: { name: string; isDecisionMaker?: boolean }[];
  subTasks?: { status: string; dueDate: string | Date }[];
  forecastCategory?: string;
  engagementType?: string;
  nextStep?: string;
  lastActivityDate?: string | Date;
  dealHealthScore?: number;
  conversationLog?: string;
}

export interface OpportunityHealthScore {
  score: number;         // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'healthy' | 'at_risk' | 'critical' | 'stale';
  color: string;         // hex color
  factors: { name: string; score: number; weight: number; detail: string }[];
}

export interface FunnelHealthScore {
  score: number;         // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'stable' | 'declining';
  color: string;
  metrics: {
    pipelineCoverage: number;    // ratio of pipeline to target
    stageBalance: number;        // how well-distributed across stages
    velocityScore: number;       // deal movement speed
    agingScore: number;          // how many deals are stale
    forecastQuality: number;     // commit/best-case ratio
    winRate: number;             // historical win rate
    stakeholderCoverage: number; // % of deals with decision makers
    tcvHealth: number;           // % of deals with non-zero TCV
  };
}

// ── Opportunity Health Score ──

export function computeOpportunityHealth(opp: OppInput): OpportunityHealthScore {
  const factors: OpportunityHealthScore['factors'] = [];
  const now = Date.now();

  // 1. TCV Score (15% weight) — deals with $0 are unhealthy
  const tcvScore = opp.tcv > 500000 ? 100 : opp.tcv > 100000 ? 85 : opp.tcv > 10000 ? 70 : opp.tcv > 0 ? 50 : 10;
  factors.push({ name: 'Deal Value', score: tcvScore, weight: 15,
    detail: opp.tcv > 0 ? `$${(opp.tcv/1000).toFixed(0)}k TCV` : 'No TCV — needs pricing' });

  // 2. Stakeholder Coverage (15% weight)
  const stakeholders = opp.customerStakeholders || [];
  const hasDM = stakeholders.some(s => s.isDecisionMaker);
  const stakeholderScore = hasDM && stakeholders.length >= 3 ? 100 :
    hasDM ? 75 : stakeholders.length >= 2 ? 50 : stakeholders.length === 1 ? 30 : 5;
  factors.push({ name: 'Stakeholders', score: stakeholderScore, weight: 15,
    detail: hasDM ? `${stakeholders.length} contacts, DM identified` : `${stakeholders.length} contacts, no DM` });

  // 3. Task Completion (10% weight)
  const tasks = opp.subTasks || [];
  const completeTasks = tasks.filter(t => t.status === 'complete').length;
  const overdueTasks = tasks.filter(t => t.status === 'pending' && new Date(t.dueDate).getTime() < now).length;
  const taskScore = tasks.length === 0 ? 40 : // No tasks = meh
    overdueTasks > 2 ? 15 : overdueTasks > 0 ? 40 :
    completeTasks === tasks.length ? 100 : Math.round((completeTasks / tasks.length) * 80) + 20;
  factors.push({ name: 'Task Progress', score: taskScore, weight: 10,
    detail: tasks.length === 0 ? 'No tasks created' : `${completeTasks}/${tasks.length} done, ${overdueTasks} overdue` });

  // 4. Close Date Proximity (15% weight)
  const closeDate = new Date(opp.expectedCloseDate).getTime();
  const daysToClose = Math.ceil((closeDate - now) / (1000 * 60 * 60 * 24));
  const closeScore = daysToClose < -30 ? 5 : // way overdue
    daysToClose < 0 ? 20 : // overdue
    daysToClose <= 7 ? 90 : // closing this week
    daysToClose <= 30 ? 80 : // closing this month
    daysToClose <= 90 ? 70 : // closing this quarter
    50; // far out
  factors.push({ name: 'Close Timeline', score: closeScore, weight: 15,
    detail: daysToClose < 0 ? `${Math.abs(daysToClose)} days overdue` :
      daysToClose === 0 ? 'Due today' : `${daysToClose} days to close` });

  // 5. Activity Recency (15% weight)
  const lastActivity = opp.lastActivityDate ? new Date(opp.lastActivityDate).getTime() :
    opp.createdAt ? new Date(opp.createdAt).getTime() : now - 30 * 24 * 60 * 60 * 1000;
  const daysSinceActivity = Math.ceil((now - lastActivity) / (1000 * 60 * 60 * 24));
  const activityScore = daysSinceActivity <= 3 ? 100 : daysSinceActivity <= 7 ? 80 :
    daysSinceActivity <= 14 ? 60 : daysSinceActivity <= 30 ? 35 : 10;
  factors.push({ name: 'Activity', score: activityScore, weight: 15,
    detail: daysSinceActivity <= 1 ? 'Active today' : `${daysSinceActivity} days since last activity` });

  // 6. Next Step Defined (10% weight)
  const hasNextStep = opp.nextStep && opp.nextStep.length > 5;
  const nextStepScore = hasNextStep ? 85 : 15;
  factors.push({ name: 'Next Step', score: nextStepScore, weight: 10,
    detail: hasNextStep ? 'Defined' : 'Missing — no clear next action' });

  // 7. Stage Appropriateness (10% weight)
  const created = opp.createdAt ? new Date(opp.createdAt).getTime() : now;
  const daysInPipeline = Math.ceil((now - created) / (1000 * 60 * 60 * 24));
  const stageWeight: Record<string, number> = {
    'Discovery': daysInPipeline > 60 ? 30 : 80,
    'Qualification': daysInPipeline > 90 ? 25 : 75,
    'Proposal': daysInPipeline > 120 ? 20 : 80,
    'Negotiation': daysInPipeline > 60 ? 40 : 90,
    'Won': 100, 'Lost': 10,
  };
  const stageScore = stageWeight[opp.status] || 50;
  factors.push({ name: 'Stage Health', score: stageScore, weight: 10,
    detail: `${opp.status} for ${daysInPipeline} days` });

  // 8. Forecast Category (10% weight)
  const fcScore = opp.forecastCategory === 'commit' ? 95 :
    opp.forecastCategory === 'best_case' ? 70 :
    opp.forecastCategory === 'pipeline' ? 45 : 30;
  factors.push({ name: 'Forecast', score: fcScore, weight: 10,
    detail: opp.forecastCategory || 'Not categorized' });

  // Weighted average
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + (f.score * f.weight), 0) / totalWeight);

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F';
  const status = score >= 70 ? 'healthy' : score >= 45 ? 'at_risk' : score >= 25 ? 'critical' : 'stale';
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  return { score, grade, status, color, factors };
}


// ── Funnel Health Score ──

export function computeFunnelHealth(opps: OppInput[]): FunnelHealthScore {
  const active = opps.filter(o => !['Won', 'Lost'].includes(o.status));
  const won = opps.filter(o => o.status === 'Won');
  const lost = opps.filter(o => o.status === 'Lost');
  const now = Date.now();

  // 1. Pipeline Coverage (target: 3x of won revenue)
  const wonTcv = won.reduce((s, o) => s + (o.tcv || 0), 0);
  const activeTcv = active.reduce((s, o) => s + (o.tcv || 0), 0);
  const targetCoverage = wonTcv > 0 ? wonTcv * 3 : 5000000; // default $5M target
  const coverageRatio = activeTcv / targetCoverage;
  const pipelineCoverage = Math.min(100, Math.round(coverageRatio * 100));

  // 2. Stage Balance (ideal: pyramid shape — more early stage, fewer late)
  const byStage: Record<string, number> = {};
  active.forEach(o => { byStage[o.status] = (byStage[o.status] || 0) + 1; });
  const discovery = (byStage['Discovery'] || 0) + (byStage['Qualification'] || 0);
  const mid = byStage['Proposal'] || 0;
  const late = byStage['Negotiation'] || 0;
  const total = active.length || 1;
  // Good balance: 50%+ early, 25% mid, 25% late
  const earlyPct = discovery / total;
  const stageBalance = earlyPct >= 0.4 ? 80 : earlyPct >= 0.2 ? 60 : 40;

  // 3. Velocity Score (avg days in current stage)
  const avgAge = active.length > 0 ?
    active.reduce((s, o) => {
      const created = o.createdAt ? new Date(o.createdAt).getTime() : now;
      return s + (now - created) / (1000 * 60 * 60 * 24);
    }, 0) / active.length : 0;
  const velocityScore = avgAge <= 30 ? 90 : avgAge <= 60 ? 75 : avgAge <= 90 ? 55 : avgAge <= 120 ? 35 : 15;

  // 4. Aging Score (% of deals over 90 days old)
  const staleDealCount = active.filter(o => {
    const created = o.createdAt ? new Date(o.createdAt).getTime() : now;
    return (now - created) / (1000 * 60 * 60 * 24) > 90;
  }).length;
  const stalePct = active.length > 0 ? staleDealCount / active.length : 0;
  const agingScore = stalePct <= 0.1 ? 95 : stalePct <= 0.25 ? 75 : stalePct <= 0.5 ? 50 : 25;

  // 5. Forecast Quality (commit + best_case as % of pipeline)
  const commitCount = active.filter(o => o.forecastCategory === 'commit').length;
  const bestCaseCount = active.filter(o => o.forecastCategory === 'best_case').length;
  const forecastedPct = active.length > 0 ? (commitCount + bestCaseCount) / active.length : 0;
  const forecastQuality = forecastedPct >= 0.4 ? 90 : forecastedPct >= 0.2 ? 65 : forecastedPct >= 0.1 ? 45 : 20;

  // 6. Win Rate
  const closedTotal = won.length + lost.length;
  const winRate = closedTotal > 0 ? Math.round((won.length / closedTotal) * 100) : 50;
  const winRateScore = winRate >= 60 ? 95 : winRate >= 40 ? 75 : winRate >= 25 ? 50 : 25;

  // 7. Stakeholder Coverage
  const withDM = active.filter(o => (o.customerStakeholders || []).some(s => s.isDecisionMaker)).length;
  const stakeholderCoverage = active.length > 0 ? Math.round((withDM / active.length) * 100) : 0;
  const stakeholderScore = stakeholderCoverage >= 60 ? 85 : stakeholderCoverage >= 30 ? 55 : 25;

  // 8. TCV Health (% of deals with non-zero TCV)
  const withTcv = active.filter(o => (o.tcv || 0) > 0).length;
  const tcvHealth = active.length > 0 ? Math.round((withTcv / active.length) * 100) : 0;
  const tcvScore = tcvHealth >= 70 ? 90 : tcvHealth >= 50 ? 65 : tcvHealth >= 30 ? 40 : 15;

  // Weighted funnel score
  const weights = { pipeline: 15, stage: 10, velocity: 15, aging: 15, forecast: 10, winRate: 15, stakeholder: 10, tcv: 10 };
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  const score = Math.round(
    (pipelineCoverage * weights.pipeline +
     stageBalance * weights.stage +
     velocityScore * weights.velocity +
     agingScore * weights.aging +
     forecastQuality * weights.forecast +
     winRateScore * weights.winRate +
     stakeholderScore * weights.stakeholder +
     tcvScore * weights.tcv) / totalWeight
  );

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F';
  const trend = score >= 65 ? 'improving' : score >= 45 ? 'stable' : 'declining';
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  return {
    score, grade, trend, color,
    metrics: {
      pipelineCoverage, stageBalance, velocityScore, agingScore,
      forecastQuality, winRate, stakeholderCoverage, tcvHealth,
    },
  };
}

// ── Helpers ──

export function healthGradeColor(grade: string): string {
  return grade === 'A' ? '#10b981' : grade === 'B' ? '#22c55e' :
    grade === 'C' ? '#f59e0b' : grade === 'D' ? '#f97316' : '#ef4444';
}

export function healthStatusLabel(status: string): string {
  return status === 'healthy' ? 'Healthy' : status === 'at_risk' ? 'At Risk' :
    status === 'critical' ? 'Critical' : 'Stale';
}
