import { cn } from '../../utils/cn';

export type ProgressTone = 'accent' | 'danger' | 'warn' | 'info';

export interface ProgressBarProps {
  /** Current value. Ignored when `indeterminate`. */
  value?: number;
  /** Maximum value. Defaults to 100. */
  max?: number;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  label?: string;
  /** Render the numeric percentage to the right of the label. */
  showValue?: boolean;
  /** Unknown progress: animate a travelling segment instead of a value. */
  indeterminate?: boolean;
  className?: string;
}

const toneClasses: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  danger: 'bg-danger',
  warn: 'bg-warn',
  info: 'bg-info',
};

const barSize = {
  sm: 'h-1',
  md: 'h-2',
} as const;

export const ProgressBar = ({
  value = 0,
  max = 100,
  tone = 'accent',
  size = 'md',
  label,
  showValue = false,
  indeterminate = false,
  className,
}: ProgressBarProps) => {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? Math.round((clamped / max) * 100) : 0;

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-fg-muted">{label}</span>}
          {showValue && <span className="tabular-nums text-fg-subtle">{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : max}
        aria-busy={indeterminate || undefined}
        aria-label={label || 'Progress'}
        className={cn('w-full overflow-hidden rounded-full bg-bg-overlay', barSize[size])}
      >
        {indeterminate ? (
          <div className={cn('h-full w-1/3 rounded-full animate-pulse', toneClasses[tone])} />
        ) : (
          <div
            className={cn('h-full rounded-full transition-all duration-300 ease-tactical', toneClasses[tone])}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
