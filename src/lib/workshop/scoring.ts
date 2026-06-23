/**
 * Workshop scoring math — pure functions, unit-testable.
 * Implements the readiness index calculation from the Galent Assessment Kit prototype.
 */

export interface LevelReadiness {
  levelId: string;
  name: string;
  currentPct: number;   // 0-100
  targetPct: number;    // 0-100
  scored: number;       // dimensions with current score set
  total: number;        // total dimensions in level
  weight: number;       // 0-1 normalized
}

export interface Gap {
  dimensionId: string;
  dimensionName: string;
  levelId: string;
  workstreamCode: string;
  gap: number;          // target - current (1-4)
  current: number;
  target: number;
  priority: boolean;
  finding?: string;
  probe?: string;
}

export interface WorkstreamRollup {
  code: string;
  name: string;
  objective: string;
  gaps: Gap[];
  totalEffort: number;
  phases: string[];
}

const MAX_SCALE = 4;
const STEP_POINTS = 3; // default effort per maturity step

/** Calculate readiness for a single level */
export function levelReadiness(level: any): LevelReadiness {
  const dims = level.dimensions || [];
  const scored = dims.filter((d: any) => d.currentScore != null);
  const tgtScored = dims.filter((d: any) => d.targetScore != null);

  const currentPct = scored.length > 0
    ? Math.round((scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length / MAX_SCALE) * 100)
    : 0;

  const targetPct = tgtScored.length > 0
    ? Math.round((tgtScored.reduce((s: number, d: any) => s + d.targetScore, 0) / tgtScored.length / MAX_SCALE) * 100)
    : 0;

  return {
    levelId: level.id,
    name: level.name,
    currentPct,
    targetPct,
    scored: scored.length,
    total: dims.length,
    weight: level.weight || 1,
  };
}

/** Calculate overall weighted readiness index (0-100) */
export function overallIndex(levels: any[]): number {
  let total = 0;
  let wsum = 0;

  // Normalize weights
  const rawSum = levels.reduce((s: number, l: any) => s + (l.weight || 1), 0);

  levels.forEach((l: any) => {
    const r = levelReadiness(l);
    if (r.scored > 0) {
      const normalizedWeight = (l.weight || 1) / rawSum;
      total += r.currentPct * normalizedWeight;
      wsum += normalizedWeight;
    }
  });

  return wsum > 0 ? Math.round(total / wsum) : 0;
}

/** Map index to human-readable stage */
export function maturityStage(index: number): string {
  if (index === 0) return 'Not Started';
  if (index < 20) return 'Emerging';
  if (index < 40) return 'Developing';
  if (index < 60) return 'Governed';
  if (index < 80) return 'Scaling';
  return 'Optimized';
}

/** Extract all gaps from a workshop */
export function gapsForWorkshop(workshop: any): Gap[] {
  const gaps: Gap[] = [];
  const levels = workshop.framework?.levels || [];

  levels.forEach((level: any) => {
    (level.dimensions || []).forEach((dim: any) => {
      if (dim.currentScore != null && dim.targetScore != null && dim.targetScore > dim.currentScore) {
        gaps.push({
          dimensionId: dim.id,
          dimensionName: dim.name,
          levelId: level.id,
          workstreamCode: dim.workstreamCode,
          gap: dim.targetScore - dim.currentScore,
          current: dim.currentScore,
          target: dim.targetScore,
          priority: !!dim.priority,
          finding: dim.finding?.body,
          probe: dim.probe,
        });
      }
    });
  });

  return gaps;
}

/** Default effort for a gap (gap × STEP_POINTS) */
export function defaultEffort(gap: number): number {
  return gap * STEP_POINTS;
}

/** Priority rank (0-3) combining gap size + priority flag */
export function priorityRank(gap: Gap): number {
  return Math.min(3, gap.gap + (gap.priority ? 1 : 0));
}

/** Roll up gaps by workstream */
export function rollupByWorkstream(gaps: Gap[], workstreams: any[], scopeItems?: any[]): WorkstreamRollup[] {
  return workstreams.map((ws: any) => {
    const wsGaps = gaps
      .filter(g => g.workstreamCode === ws.code)
      .sort((a, b) => priorityRank(b) - priorityRank(a));

    const wsScope = (scopeItems || []).filter((s: any) => s.workstreamCode === ws.code);
    const totalEffort = wsScope.length > 0
      ? wsScope.reduce((s: number, item: any) => s + (item.effort || 0), 0)
      : wsGaps.reduce((s: number, g) => s + defaultEffort(g.gap), 0);

    const phases = [...new Set(wsScope.map((s: any) => s.phase || 'P1'))].sort();

    return {
      code: ws.code,
      name: ws.name,
      objective: ws.objective,
      gaps: wsGaps,
      totalEffort,
      phases: phases.length > 0 ? phases : ['P1'],
    };
  }).filter(r => r.gaps.length > 0);
}

/** Workshop summary stats */
export function workshopStats(workshop: any) {
  const levels = workshop.framework?.levels || [];
  const allDims = levels.flatMap((l: any) => l.dimensions || []);
  const scored = allDims.filter((d: any) => d.currentScore != null);
  const gaps = gapsForWorkshop(workshop);
  const priorityGaps = gaps.filter(g => g.priority);
  const useCases = workshop.useCases || [];
  const pilots = useCases.filter((u: any) => u.isPilot);
  const scopeItems = workshop.scopeItems || [];
  const totalEffort = scopeItems.reduce((s: number, item: any) => s + (item.effort || 0), 0);

  return {
    index: overallIndex(levels),
    stage: maturityStage(overallIndex(levels)),
    dimensionsScored: scored.length,
    totalDimensions: allDims.length,
    gapCount: gaps.length,
    priorityGapCount: priorityGaps.length,
    useCaseCount: useCases.length,
    pilotCount: pilots.length,
    scopeItemCount: scopeItems.length,
    totalEffort,
    levelReadiness: levels.map(levelReadiness),
  };
}
