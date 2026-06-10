'use client';

import { useParams } from 'next/navigation';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { DealDetail } from '@/components/modals/DealDetail';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ArrowLeft, CheckSquare, Users, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';

function StageContent() {
  const params = useParams();
  const stage = decodeURIComponent(params.stage as string);
  const { opportunities } = useOpportunities();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const { data: ontology } = trpc.ontology.getForStage.useQuery({ stage });

  const stageDeals = opportunities.filter(o => o.status === stage);
  const totalTcv = stageDeals.reduce((s, o) => s + (o.tcv || 0), 0);
  const weights: Record<string, number> = { Discovery: 0.1, Qualification: 0.25, Proposal: 0.5, Negotiation: 0.75, Won: 1, Lost: 0, 'On Hold': 0.05 };
  const weightedTcv = totalTcv * (weights[stage] || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/pipeline" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{stage}</h1>
          <p className="text-sm text-muted-foreground">
            {stageDeals.length} deals · ${(totalTcv/1000).toFixed(0)}k raw · ${(weightedTcv/1000).toFixed(0)}k weighted
          </p>
        </div>
      </div>

      {/* Gate Criteria from Ontology */}
      {ontology?.gateCriteria && ontology.gateCriteria.length > 0 && (
        <div className="g-surface g-elevated p-4">
          <div className="g-section-label mb-3">Stage Gate Criteria</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ontology.gateCriteria.map((gate: any, i: number) => (
              <div key={i} className="p-2 rounded-lg bg-card border border-border text-xs text-muted-foreground">
                {gate.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Required Artifacts */}
      {ontology?.templates && ontology.templates.filter((t: any) => t.required).length > 0 && (
        <div className="g-surface g-elevated p-4">
          <div className="g-section-label mb-3">Required Artifacts for {stage}</div>
          <div className="flex flex-wrap gap-2">
            {ontology.templates.filter((t: any) => t.required).map((t: any, i: number) => (
              <span key={i} className="g-chip bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {t.name} {t.aiGenerable && '✨'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deal List */}
      <div className="space-y-2">
        {stageDeals.map(opp => {
          const tasks = opp.subTasks || [];
          const completed = tasks.filter(t => t.status === 'complete').length;
          const stakeholders = opp.customerStakeholders || [];
          const hasDM = stakeholders.some(s => s.isDecisionMaker);
          const daysInStage = differenceInDays(new Date(), new Date(opp.updatedAt || opp.createdAt));

          return (
            <button key={opp.id} onClick={() => setSelectedOppId(opp.id)}
              className="w-full text-left p-4 rounded-xl g-surface g-elevated hover:!border-[#5B4FE9]/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{opp.customerName}</div>
                  <div className="text-xs text-muted-foreground truncate">{opp.opportunityName}</div>
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <span className="g-metric font-semibold text-foreground">{opp.tcv > 0 ? `$${(opp.tcv/1000).toFixed(0)}k` : '$0'}</span>
                  <span className="text-muted-foreground">{opp.margin ? `${opp.margin}%` : '—'}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CheckSquare className="h-3 w-3" /> {completed}/{tasks.length}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" /> {stakeholders.length}
                    {!hasDM && <span title="No decision maker"><AlertTriangle className="h-3 w-3 text-amber-500" /></span>}
                  </div>
                  <span className={`flex items-center gap-0.5 ${daysInStage > 14 ? 'text-red-500' : daysInStage > 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    <Clock className="h-3 w-3" /> {daysInStage}d
                  </span>
                  <span className="text-muted-foreground">{opp.primaryOwner}</span>
                </div>
              </div>
            </button>
          );
        })}
        {stageDeals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No deals in {stage}</div>
        )}
      </div>

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function StagePage() {
  return (
    <OpportunityProvider>
      <StageContent />
    </OpportunityProvider>
  );
}
