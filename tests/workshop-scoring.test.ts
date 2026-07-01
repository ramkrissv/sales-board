import { describe, it, expect } from 'vitest';
import { levelReadiness, overallIndex, maturityStage, gapsForWorkshop, defaultEffort, priorityRank, workshopStats } from '../src/lib/workshop/scoring';

describe('levelReadiness', () => {
  it('returns 0% for empty level', () => {
    const r = levelReadiness({ id: 'L1', name: 'Test', weight: 1, dimensions: [] });
    expect(r.currentPct).toBe(0);
    expect(r.scored).toBe(0);
  });

  it('calculates 50% for [3,1] scores (avg 2 out of 4)', () => {
    const level = {
      id: 'L1', name: 'Test', weight: 1,
      dimensions: [
        { id: 'd1', currentScore: 3, targetScore: 4 },
        { id: 'd2', currentScore: 1, targetScore: 3 },
      ],
    };
    const r = levelReadiness(level);
    expect(r.currentPct).toBe(50);
    expect(r.scored).toBe(2);
    expect(r.total).toBe(2);
  });

  it('calculates 100% for all Optimized', () => {
    const level = {
      id: 'L1', name: 'Test', weight: 1,
      dimensions: [
        { id: 'd1', currentScore: 4, targetScore: 4 },
        { id: 'd2', currentScore: 4, targetScore: 4 },
      ],
    };
    expect(levelReadiness(level).currentPct).toBe(100);
  });

  it('ignores unscored dimensions', () => {
    const level = {
      id: 'L1', name: 'Test', weight: 1,
      dimensions: [
        { id: 'd1', currentScore: 2 },
        { id: 'd2', currentScore: null },
        { id: 'd3' },
      ],
    };
    const r = levelReadiness(level);
    expect(r.scored).toBe(1);
    expect(r.total).toBe(3);
    expect(r.currentPct).toBe(50); // 2/4 = 50%
  });
});

describe('overallIndex', () => {
  it('returns weighted mean of level readiness', () => {
    const levels = [
      { id: 'L1', weight: 0.3, dimensions: [{ id: 'd1', currentScore: 4 }] }, // 100%
      { id: 'L2', weight: 0.4, dimensions: [{ id: 'd2', currentScore: 2 }] }, // 50%
      { id: 'L3', weight: 0.3, dimensions: [{ id: 'd3', currentScore: 0 }] }, // 0%
    ];
    const idx = overallIndex(levels);
    // (100*0.3 + 50*0.4 + 0*0.3) / 1.0 = 50
    expect(idx).toBe(50);
  });

  it('returns 0 for no scored levels', () => {
    expect(overallIndex([{ id: 'L1', weight: 1, dimensions: [] }])).toBe(0);
  });
});

describe('maturityStage', () => {
  it('maps index to correct stage', () => {
    expect(maturityStage(0)).toBe('Not Started');
    expect(maturityStage(10)).toBe('Emerging');
    expect(maturityStage(30)).toBe('Developing');
    expect(maturityStage(50)).toBe('Governed');
    expect(maturityStage(70)).toBe('Scaling');
    expect(maturityStage(90)).toBe('Optimized');
  });
});

describe('gapsForWorkshop', () => {
  it('identifies gaps where target > current', () => {
    const workshop = {
      framework: {
        levels: [{
          id: 'L1',
          dimensions: [
            { id: 'd1', name: 'D1', currentScore: 1, targetScore: 3, workstreamCode: 'WS1' },
            { id: 'd2', name: 'D2', currentScore: 3, targetScore: 3 }, // no gap
            { id: 'd3', name: 'D3', currentScore: 2, targetScore: 4, workstreamCode: 'WS2', priority: true },
          ],
        }],
      },
    };
    const gaps = gapsForWorkshop(workshop);
    expect(gaps.length).toBe(2);
    expect(gaps[0].gap).toBe(2); // 3-1
    expect(gaps[1].gap).toBe(2); // 4-2
    expect(gaps[1].priority).toBe(true);
  });

  it('returns empty for no gaps', () => {
    const workshop = {
      framework: {
        levels: [{
          id: 'L1',
          dimensions: [
            { id: 'd1', currentScore: 4, targetScore: 4 },
          ],
        }],
      },
    };
    expect(gapsForWorkshop(workshop).length).toBe(0);
  });
});

describe('defaultEffort', () => {
  it('returns gap * 3 (STEP_POINTS)', () => {
    expect(defaultEffort(1)).toBe(3);
    expect(defaultEffort(2)).toBe(6);
    expect(defaultEffort(3)).toBe(9);
  });
});

describe('priorityRank', () => {
  it('combines gap size and priority flag', () => {
    expect(priorityRank({ gap: 1, priority: false } as any)).toBe(1);
    expect(priorityRank({ gap: 1, priority: true } as any)).toBe(2);
    expect(priorityRank({ gap: 2, priority: true } as any)).toBe(3); // capped at 3
    expect(priorityRank({ gap: 3, priority: true } as any)).toBe(3); // capped at 3
  });
});

describe('workshopStats', () => {
  it('returns complete stats object', () => {
    const workshop = {
      framework: {
        levels: [{
          id: 'L1', weight: 1,
          dimensions: [
            { id: 'd1', currentScore: 2, targetScore: 4 },
            { id: 'd2', currentScore: 3, targetScore: 3 },
          ],
        }],
      },
      useCases: [{ id: 'uc1', isPilot: true }],
      scopeItems: [{ id: 's1', effort: 5 }],
    };
    const stats = workshopStats(workshop);
    expect(stats.dimensionsScored).toBe(2);
    expect(stats.totalDimensions).toBe(2);
    expect(stats.gapCount).toBe(1);
    expect(stats.useCaseCount).toBe(1);
    expect(stats.pilotCount).toBe(1);
    expect(stats.scopeItemCount).toBe(1);
    expect(stats.totalEffort).toBe(5);
    expect(stats.index).toBeGreaterThan(0);
    expect(stats.stage).toBeTruthy();
  });
});
