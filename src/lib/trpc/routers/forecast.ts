import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

function getOppModel() {
  return mongoose.models.Opportunity;
}

// Stage probability weights
const STAGE_WEIGHTS: Record<string, number> = {
  'Discovery': 0.10,
  'Qualification': 0.25,
  'Proposal': 0.50,
  'Negotiation': 0.75,
  'Won': 1.0,
  'Lost': 0,
  'On Hold': 0.05,
};

export const forecastRouter = router({
  getSummary: protectedProcedure.query(async () => {
    await connectDB();
    const Opp = getOppModel();
    const opps = await Opp.find().lean();

    const active = opps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
    const totalPipeline = active.reduce((sum: number, o: any) => sum + (o.tcv || 0), 0);
    const weightedForecast = active.reduce((sum: number, o: any) => sum + (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0), 0);

    // By stage
    const byStage = Object.entries(STAGE_WEIGHTS).map(([stage, weight]) => {
      const deals = opps.filter((o: any) => o.status === stage);
      return {
        stage,
        count: deals.length,
        tcv: deals.reduce((s: number, o: any) => s + (o.tcv || 0), 0),
        weighted: deals.reduce((s: number, o: any) => s + (o.tcv || 0) * weight, 0),
      };
    });

    // By owner
    const byOwner: Record<string, { count: number; tcv: number; weighted: number }> = {};
    active.forEach((o: any) => {
      if (!byOwner[o.primaryOwner]) byOwner[o.primaryOwner] = { count: 0, tcv: 0, weighted: 0 };
      byOwner[o.primaryOwner].count++;
      byOwner[o.primaryOwner].tcv += o.tcv || 0;
      byOwner[o.primaryOwner].weighted += (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0);
    });

    // By quarter (bucket by expectedCloseDate)
    const byQuarter: Record<string, { count: number; tcv: number }> = {};
    opps.forEach((o: any) => {
      const d = new Date(o.expectedCloseDate);
      const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
      if (!byQuarter[q]) byQuarter[q] = { count: 0, tcv: 0 };
      byQuarter[q].count++;
      byQuarter[q].tcv += o.tcv || 0;
    });

    const wonDeals = opps.filter((o: any) => o.status === 'Won');
    const lostDeals = opps.filter((o: any) => o.status === 'Lost');
    const winRate = wonDeals.length + lostDeals.length > 0 ? wonDeals.length / (wonDeals.length + lostDeals.length) : 0;

    return {
      totalPipeline,
      weightedForecast: Math.round(weightedForecast),
      activeDeals: active.length,
      winRate: Math.round(winRate * 100),
      avgDealSize: active.length > 0 ? Math.round(totalPipeline / active.length) : 0,
      byStage,
      byOwner: Object.entries(byOwner).map(([owner, data]) => ({ owner, ...data })).sort((a, b) => b.tcv - a.tcv),
      byQuarter: Object.entries(byQuarter).map(([quarter, data]) => ({ quarter, ...data })).sort((a, b) => a.quarter.localeCompare(b.quarter)),
    };
  }),
});
