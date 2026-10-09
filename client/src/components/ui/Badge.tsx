import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'default'
  | 'neutral'
  | 'muted'
  | 'outline'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  /** @deprecated alias for `info`; the palette has a single accent. */
  | 'cyan'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'insane';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Renders a static status dot. Intentionally not animated. */
  pulse?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-overlay border-border text-fg-muted',
  neutral: 'bg-bg-overlay border-border text-fg-muted',
  muted: 'bg-bg-overlay border-border-subtle text-fg-subtle',
  outline: 'bg-transparent border-border-strong text-fg-muted',
  accent: 'bg-accent/10 border-accent/30 text-accent',
  success: 'bg-success/10 border-success/30 text-success',
  warning: 'bg-warn/10 border-warn/30 text-warn',
  error: 'bg-danger/10 border-danger/30 text-danger',
  info: 'bg-info/10 border-info/30 text-info',
  cyan: 'bg-info/10 border-info/30 text-info',
  easy: 'bg-difficulty-easy/10 border-difficulty-easy/30 text-difficulty-easy',
  medium: 'bg-difficulty-medium/10 border-difficulty-medium/30 text-difficulty-medium',
  hard: 'bg-difficulty-hard/10 border-difficulty-hard/30 text-difficulty-hard',
  insane: 'bg-difficulty-insane/10 border-difficulty-insane/30 text-difficulty-insane',
};

const sizeClasses = {
  sm: 'px-1.5 py-0 text-xs gap-1',
  md: 'px-2 py-0.5 text-xs gap-1',
  lg: 'px-2.5 py-1 text-sm gap-1.5',
} as const;

/** Maps a free-form difficulty string onto the fixed semantic badge scale. */
// eslint-disable-next-line react-refresh/only-export-components
export function difficultyVariant(difficulty?: string | null): BadgeVariant {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
    case 'beginner':
      return 'easy';
    case 'medium':
    case 'intermediate':
      return 'medium';
    case 'hard':
    case 'advanced':
    case 'expert':
      return 'hard';
    case 'insane':
    case 'elite':
      return 'insane';
    default:
      return 'neutral';
  }
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', pulse = false, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex select-none items-center rounded-sm border font-medium uppercase tracking-wide',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {pulse && (
          <span
            aria-hidden="true"
            className={cn('h-1.5 w-1.5 rounded-full bg-current', size === 'lg' ? 'opacity-90' : 'opacity-80')}
          />
        )}
        {icon}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export default Badge;
