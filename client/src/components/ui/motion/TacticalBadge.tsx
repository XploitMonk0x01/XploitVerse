import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type TacticalBadgeVariant =
  | 'accent'
  | 'cyan'
  | 'success'
  | 'warning'
  | 'error'
  | 'danger'
  | 'info'
  | 'muted'
  | 'neutral';

export interface TacticalBadgeProps {
  label?: ReactNode;
  children?: ReactNode;
  variant?: TacticalBadgeVariant;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  code?: string;
}

export const TacticalBadge = ({
  label,
  children,
  variant = 'muted',
  pulse = false,
  size = 'sm',
  className = '',
  code,
}: TacticalBadgeProps) => {
  // Normalize alias variants
  const resolvedVariant: 'accent' | 'cyan' | 'success' | 'warning' | 'error' | 'muted' =
    variant === 'danger'
      ? 'error'
      : variant === 'info'
      ? 'cyan'
      : variant === 'neutral'
      ? 'muted'
      : variant;

  const variantStyles = {
    accent: 'text-accent border-accent/60 bg-accent/10',
    cyan: 'text-cyan border-cyan/60 bg-cyan/10',
    success: 'text-success border-success/60 bg-success/10',
    warning: 'text-warning border-warning/60 bg-warning/10',
    error: 'text-error border-error/60 bg-error/10',
    muted: 'text-muted border-border bg-paper',
  };

  const beaconColors = {
    accent: 'bg-accent shadow-[0_0_8px_var(--color-accent)]',
    cyan: 'bg-cyan shadow-[0_0_8px_var(--color-cyan)]',
    success: 'bg-success shadow-[0_0_8px_var(--color-success)]',
    warning: 'bg-warning shadow-[0_0_8px_var(--color-warning)]',
    error: 'bg-error shadow-[0_0_8px_var(--color-error)]',
    muted: 'bg-muted',
  };

  const content = children ?? label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider border rounded-none select-none transition-colors',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        variantStyles[resolvedVariant],
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full inline-block animate-pulse',
            beaconColors[resolvedVariant]
          )}
        />
      )}
      {code && <span className="opacity-60">[{code}]</span>}
      {content && <span>{content}</span>}
    </span>
  );
};

export default TacticalBadge;
