/**
 * Workshop shared constants — single source of truth for maturity scale, colors, and execution models.
 */

export const MATURITY_LABELS = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'] as const;

export const MATURITY_COLORS = ['#C3C9D4', '#9DB0C6', '#6E97C2', '#3A93A0', '#0A867F'] as const;

export const EXECUTION_MODELS = [
  { id: 'pod_squad', name: 'FDE Pod Squad', color: '#7c3aed' },
  { id: 'managed_capacity', name: 'Managed Capacity', color: '#3b82f6' },
  { id: 'outcome_based', name: 'Outcome-Based', color: '#22c55e' },
  { id: 'ai_stream', name: 'AI-Powered Stream', color: '#0A867F' },
  { id: 'hybrid', name: 'Hybrid Blend', color: '#f59e0b' },
] as const;

export const EXEC_LABELS: Record<string, string> = {
  pod_squad: 'FDE Pod Squad',
  managed_capacity: 'Managed Capacity',
  outcome_based: 'Outcome-Based',
  ai_stream: 'AI-Powered',
  hybrid: 'Hybrid',
};

export const MAX_MATURITY_SCALE = 4;

export const REC_CATEGORIES = [
  { id: 'quick_wins', label: 'Quick Wins', sublabel: '0-30 days', desc: 'Low effort, immediate impact' },
  { id: 'foundation', label: 'Foundation', sublabel: '1-3 months', desc: 'Build capabilities & infrastructure' },
  { id: 'strategic', label: 'Strategic', sublabel: '3-6 months', desc: 'Transform operating model & scale' },
  { id: 'governance', label: 'Governance', sublabel: 'Ongoing', desc: 'Institutionalize practices & compliance' },
] as const;
