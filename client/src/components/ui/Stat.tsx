import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface StatProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Small supporting text under the value. */
  hint?: ReactNode;
  /** Semantic tone applied to the icon chip. */
  tone?: 'neutral' | 'accent' | 'danger' | 'warn' | 'info';
  className?: string;
}

const toneClasses = {
  neutral: 'bg-bg-overlay text-fg-muted',
  accent: 'bg-accent/10 text-accent',
  danger: 'bg-danger/10 text-danger',
  warn: 'bg-warn/10 text-warn',
  info: 'bg-info/10 text-info',
} as const;

export const Stat = ({ label, value, icon, hint, tone = 'neutral', className }: StatProps) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-subtle bg-bg-raised p-4 shadow-card',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        {icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', toneClasses[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
};

export default Stat;
