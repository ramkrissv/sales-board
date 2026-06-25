'use client';

import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface StageGateProps {
  stage: string;
  entry: { label: string; met: boolean }[];
  output: string[];
}

/**
 * StageGate — shows entry criteria (what's needed to start) and expected outputs.
 * Displayed at the top of each workshop tab.
 */
export default function StageGate({ stage, entry, output }: StageGateProps) {
  const allMet = entry.every(e => e.met);

  return (
    <div className={`flex items-start gap-4 p-3 rounded-xl text-xs ${allMet ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-amber-500/5 border border-amber-500/15'}`}>
      {/* Entry criteria */}
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Entry — {stage}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {entry.map(e => (
            <span key={e.label} className="flex items-center gap-1 text-[10px]">
              {e.met ? <CheckCircle className="h-2.5 w-2.5 text-emerald-400" /> : <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />}
              <span className={e.met ? 'text-foreground' : 'text-muted-foreground'}>{e.label}</span>
            </span>
          ))}
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-2 shrink-0" />
      {/* Output */}
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Output</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {output.map(o => (
            <span key={o} className="text-[10px] text-muted-foreground">{o}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
