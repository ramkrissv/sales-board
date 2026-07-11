/**
 * Pipeline Snapshot API — captures current pipeline state for WoW trending
 *
 * POST /api/snapshot — captures a snapshot (call daily via cron or manual)
 * GET /api/snapshot — returns latest snapshot + WoW delta
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/galent';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGODB_URI);
}

// Capture snapshot
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { PipelineSnapshot } = await import('@/lib/db/models/pipeline-snapshot');
    const { Opportunity } = await import('@/lib/db/models/opportunity');
    const { computeFunnelHealth, computeOpportunityHealth } = await import('@/lib/health-scores');

    const allOpps = await Opportunity.find().lean();
    const now = new Date();
    const active = allOpps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
    const won = allOpps.filter((o: any) => o.status === 'Won');
    const lost = allOpps.filter((o: any) => o.status === 'Lost');

    const STAGE_WEIGHTS: Record<string, number> = {
      'Discovery': 0.10, 'Qualification': 0.25, 'Proposal': 0.50,
      'Negotiation': 0.75, 'Won': 1.0,
    };

    // By stage
    const byStageMap: Record<string, { count: number; tcv: number; totalAge: number }> = {};
    active.forEach((o: any) => {
      if (!byStageMap[o.status]) byStageMap[o.status] = { count: 0, tcv: 0, totalAge: 0 };
      byStageMap[o.status].count++;
      byStageMap[o.status].tcv += o.tcv || 0;
      byStageMap[o.status].totalAge += (now.getTime() - new Date(o.createdAt || now).getTime()) / 86400000;
    });

    // By owner
    const byOwnerMap: Record<string, { count: number; tcv: number; wonCount: number; wonTcv: number }> = {};
    allOpps.forEach((o: any) => {
      const owner = o.primaryOwner || 'Unassigned';
      if (!byOwnerMap[owner]) byOwnerMap[owner] = { count: 0, tcv: 0, wonCount: 0, wonTcv: 0 };
      byOwnerMap[owner].count++;
      byOwnerMap[owner].tcv += o.tcv || 0;
      if (o.status === 'Won') { byOwnerMap[owner].wonCount++; byOwnerMap[owner].wonTcv += o.tcv || 0; }
    });

    const funnelHealth = computeFunnelHealth(allOpps as any);
    const avgDealHealth = active.length > 0
      ? Math.round(active.map((o: any) => computeOpportunityHealth(o).score).reduce((a, b) => a + b, 0) / active.length)
      : 0;

    const snapshot = await PipelineSnapshot.create({
      snapshotDate: now,
      period: now.getDay() === 1 ? 'weekly' : now.getDate() === 1 ? 'monthly' : 'daily',
      totalOpportunities: allOpps.length,
      activeOpportunities: active.length,
      totalPipeline: Math.round(active.reduce((s: number, o: any) => s + (o.tcv || 0), 0)),
      weightedPipeline: Math.round(active.reduce((s: number, o: any) => s + (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0), 0)),
      byStage: Object.entries(byStageMap).map(([stage, d]) => ({
        stage, count: d.count, tcv: Math.round(d.tcv), avgAge: Math.round(d.totalAge / (d.count || 1)),
      })),
      byForecast: [],
      byOwner: Object.entries(byOwnerMap).map(([owner, d]) => ({ owner, ...d, tcv: Math.round(d.tcv), wonTcv: Math.round(d.wonTcv) })),
      conversions: [],
      funnelHealthScore: funnelHealth.score,
      avgDealHealth,
      wonCount: won.length, wonTcv: Math.round(won.reduce((s: number, o: any) => s + (o.tcv || 0), 0)),
      lostCount: lost.length,
      winRate: (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
      avgDealAge: active.length > 0 ? Math.round(active.reduce((s: number, o: any) =>
        s + (now.getTime() - new Date(o.createdAt || now).getTime()) / 86400000, 0) / active.length) : 0,
      avgCycleTime: 0,
      dealsWithDM: active.filter((o: any) => (o.customerStakeholders || []).some((s: any) => s.isDecisionMaker)).length,
      dealsWithTcv: active.filter((o: any) => (o.tcv || 0) > 0).length,
    });

    return NextResponse.json({ success: true, snapshotId: snapshot._id, date: snapshot.snapshotDate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get latest + WoW
export async function GET() {
  try {
    await connectDB();
    const { PipelineSnapshot } = await import('@/lib/db/models/pipeline-snapshot');

    const snapshots = await PipelineSnapshot.find()
      .sort({ snapshotDate: -1 })
      .limit(14)
      .lean();

    return NextResponse.json({ snapshots, count: snapshots.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
