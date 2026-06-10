'use client';

import { cn } from '@/lib/utils';

export type Scope = 'my' | 'team' | 'org';

interface ScopeSwitchProps {
  value: Scope;
  onChange: (scope: Scope) => void;
}

export function ScopeSwitch({ value, onChange }: ScopeSwitchProps) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary border border-border">
      {(['my', 'team', 'org'] as const).map(scope => (
        <button
          key={scope}
          onClick={() => onChange(scope)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-all capitalize',
            value === scope
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {scope === 'my' ? 'My' : scope === 'team' ? 'Team' : 'Org'}
        </button>
      ))}
    </div>
  );
}
