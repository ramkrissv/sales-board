'use client';

const MATURITY_COLORS = ['#C3C9D4', '#9DB0C6', '#6E97C2', '#3A93A0', '#0A867F'];
const MATURITY_LABELS = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'];

interface MaturityChipsProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  label: string;
  isTarget?: boolean;
}

export default function MaturityChips({ value, onChange, label, isTarget = false }: MaturityChipsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        {value != null && (
          <span className="text-[10px] font-semibold" style={{ color: MATURITY_COLORS[value] }}>
            {MATURITY_LABELS[value]}
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map(v => {
          const isSelected = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={`flex-1 h-9 rounded-md font-mono text-xs font-semibold transition-all relative ${
                isSelected
                  ? 'text-white shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:border-foreground/30'
              }`}
              style={isSelected ? { backgroundColor: MATURITY_COLORS[v] } : undefined}
              title={`${v} — ${MATURITY_LABELS[v]}`}
            >
              {v}
              {isTarget && isSelected && (
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] text-amber-500">▲</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
