import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { computeFunnelHealth, computeOpportunityHealth } from '@/lib/health-scores';

const STAGE_WEIGHTS: Record<string, number> = {
  'Discovery': 0.10, 'Qualification': 0.25, 'Proposal': 0.50,
  'Negotiation': 0.75, 'Won': 1.0, 'Lost': 0, 'On Hold': 0.05,
};

export const pipelineSnapshotRouter = router({
  // Capture a snapshot of current pipeline state
  capture: protectedProcedure.mutation(async () => {
    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const { PipelineSnapshot } = await import('@/lib/db/models/pipeline-snapshot');
    const Opportunity = mongoose.models.Opportunity || (await import('@/lib/db/models/opportunity')).Opportunity;

    const allOpps = await Opportunity.find().lean();
    const now = new Date();
    const active = allOpps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
    const won = allOpps.filter((o: any) => o.status === 'Won');
    const lost = allOpps.filter((o: any) => o.status === 'Lost');

    // By stage
    const byStageMap: Record<string, { count: number; tcv: number; totalAge: number }> = {};
    active.forEach((o: any) => {
      if (!byStageMap[o.status]) byStageMap[o.status] = { count: 0, tcv: 0, totalAge: 0 };
      byStageMap[o.status].count++;
      byStageMap[o.status].tcv += o.tcv || 0;
      const age = (now.getTime() - new Date(o.createdAt || o.startDate || now).getTime()) / (1000 * 60 * 60 * 24);
      byStageMap[o.status].totalAge += age;
    });
    const byStage = Object.entries(byStageMap).map(([stage, data]) => ({
      stage, count: data.count, tcv: Math.round(data.tcv),
      avgAge: Math.round(data.totalAge / (data.count || 1)),
    }));

    // By forecast
    const byFcMap: Record<string, { count: number; tcv: number }> = {};
    active.forEach((o: any) => {
      const cat = o.forecastCategory || 'pipeline';
      if (!byFcMap[cat]) byFcMap[cat] = { count: 0, tcv: 0 };
      byFcMap[cat].count++;
      byFcMap[cat].tcv += o.tcv || 0;
    });
    const byForecast = Object.entries(byFcMap).map(([category, data]) => ({
      category, count: data.count, tcv: Math.round(data.tcv),
    }));

    // By owner
    const byOwnerMap: Record<string, { count: number; tcv: number; wonCount: number; wonTcv: number }> = {};
    allOpps.forEach((o: any) => {
      const owner = o.primaryOwner || 'Unassigned';
      if (!byOwnerMap[owner]) byOwnerMap[owner] = { count: 0, tcv: 0, wonCount: 0, wonTcv: 0 };
      byOwnerMap[owner].count++;
      byOwnerMap[owner].tcv += o.tcv || 0;
      if (o.status === 'Won') { byOwnerMap[owner].wonCount++; byOwnerMap[owner].wonTcv += o.tcv || 0; }
    });
    const byOwner = Object.entries(byOwnerMap).map(([owner, data]) => ({
      owner, ...data, tcv: Math.round(data.tcv), wonTcv: Math.round(data.wonTcv),
    }));

    // Health scores
    const funnelHealth = computeFunnelHealth(allOpps as any);
    const oppHealths = active.map((o: any) => computeOpportunityHealth(o));
    const avgDealHealth = oppHealths.length > 0
      ? Math.round(oppHealths.reduce((s, h) => s + h.score, 0) / oppHealths.length)
      : 0;

    // Weighted pipeline
    const weightedPipeline = active.reduce((s: number, o: any) => {
      return s + (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0);
    }, 0);

    // Average deal age
    const avgDealAge = active.length > 0
      ? Math.round(active.reduce((s: number, o: any) => {
          return s + (now.getTime() - new Date(o.createdAt || now).getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / active.length)
      : 0;

    // Average cycle time (won deals only)
    const avgCycleTime = won.length > 0
      ? Math.round(won.reduce((s: number, o: any) => {
          const start = new Date(o.startDate || o.createdAt || now).getTime();
          const end = new Date(o.updatedAt || now).getTime();
          return s + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / won.length)
      : 0;

    // Stakeholder/TCV coverage
    const dealsWithDM = active.filter((o: any) =>
      (o.customerStakeholders || []).some((s: any) => s.isDecisionMaker)
    ).length;
    const dealsWithTcv = active.filter((o: any) => (o.tcv || 0) > 0).length;
    const winRate = (won.length + lost.length) > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;

    // Determine period
    const dayOfWeek = now.getDay();
    const period = dayOfWeek === 1 ? 'weekly' : now.getDate() === 1 ? 'monthly' : 'daily';

    const snapshot = await PipelineSnapshot.create({
      snapshotDate: now,
      period,
      totalOpportunities: allOpps.length,
      activeOpportunities: active.length,
      totalPipeline: Math.round(active.reduce((s: number, o: any) => s + (o.tcv || 0), 0)),
      weightedPipeline: Math.round(weightedPipeline),
      byStage,
      byForecast,
      byOwner,
      conversions: [],
      funnelHealthScore: funnelHealth.score,
      avgDealHealth,
      wonCount: won.length,
      wonTcv: Math.round(won.reduce((s: number, o: any) => s + (o.tcv || 0), 0)),
      lostCount: lost.length,
      winRate,
      avgDealAge,
      avgCycleTime,
      dealsWithDM,
      dealsWithTcv,
    });

    return { id: snapshot._id, snapshotDate: snapshot.snapshotDate, period };
  }),

  // Get snapshots for trending (last N weeks)
  trending: protectedProcedure
    .input(z.object({
      weeks: z.number().default(8),
    }).optional())
    .query(async ({ input }) => {
      await connectDB();
      const { PipelineSnapshot } = await import('@/lib/db/models/pipeline-snapshot');
      const weeks = input?.weeks || 8;
      const since = new Date();
      since.setDate(since.getDate() - weeks * 7);

      const snapshots = await PipelineSnapshot.find({
        snapshotDate: { $gte: since },
      }).sort({ snapshotDate: 1 }).lean();

      return snapshots.map((s: any) => ({
        date: s.snapshotDate,
        period: s.period,
        totalPipeline: s.totalPipeline,
        weightedPipeline: s.weightedPipeline,
        activeOpportunities: s.activeOpportunities,
        funnelHealthScore: s.funnelHealthScore,
        avgDealHealth: s.avgDealHealth,
        wonCount: s.wonCount,
        wonTcv: s.wonTcv,
        winRate: s.winRate,
        avgDealAge: s.avgDealAge,
        dealsWithDM: s.dealsWithDM,
        dealsWithTcv: s.dealsWithTcv,
        byStage: s.byStage,
        byOwner: s.byOwner,
      }));
    }),

  // Get week-over-week comparison
  wow: protectedProcedure.query(async () => {
    await connectDB();
    const { PipelineSnapshot } = await import('@/lib/db/models/pipeline-snapshot');
    const Opportunity = (await import('mongoose')).default.models.Opportunity
      || (await import('@/lib/db/models/opportunity')).Opportunity;

    // Get latest snapshot
    const latest = await PipelineSnapshot.findOne().sort({ snapshotDate: -1 }).lean();

    // Get snapshot from ~7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const previous = await PipelineSnapshot.findOne({
      snapshotDate: { $lte: weekAgo },
    }).sort({ snapshotDate: -1 }).lean();

    // Compute current state for comparison
    const allOpps = await Opportunity.find().lean();
    const active = allOpps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
    const won = allOpps.filter((o: any) => o.status === 'Won');
    const lost = allOpps.filter((o: any) => o.status === 'Lost');
    const funnelHealth = computeFunnelHealth(allOpps as any);

    const current = {
      totalPipeline: Math.round(active.reduce((s: number, o: any) => s + (o.tcv || 0), 0)),
      activeOpportunities: active.length,
      funnelHealthScore: funnelHealth.score,
      wonCount: won.length,
      wonTcv: Math.round(won.reduce((s: number, o: any) => s + (o.tcv || 0), 0)),
      winRate: (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
    };

    const prev = previous ? {
      totalPipeline: (previous as any).totalPipeline || 0,
      activeOpportunities: (previous as any).activeOpportunities || 0,
      funnelHealthScore: (previous as any).funnelHealthScore || 0,
      wonCount: (previous as any).wonCount || 0,
      wonTcv: (previous as any).wonTcv || 0,
      winRate: (previous as any).winRate || 0,
    } : null;

    const delta = prev ? {
      totalPipeline: current.totalPipeline - prev.totalPipeline,
      activeOpportunities: current.activeOpportunities - prev.activeOpportunities,
      funnelHealthScore: current.funnelHealthScore - prev.funnelHealthScore,
      wonCount: current.wonCount - prev.wonCount,
      wonTcv: current.wonTcv - prev.wonTcv,
      winRate: current.winRate - prev.winRate,
    } : null;

    return {
      current,
      previous: prev,
      delta,
      hasHistory: !!prev,
      latestSnapshotDate: latest ? (latest as any).snapshotDate : null,
    };
  }),
});
