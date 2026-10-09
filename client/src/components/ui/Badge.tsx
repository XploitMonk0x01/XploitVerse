import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'cyan' | 'accent' | 'neutral' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', pulse = false, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-mono font-bold uppercase tracking-wider border select-none';

    const variantClasses = {
      default: 'bg-surface border-border text-ink',
      success: 'bg-success-dim border-success text-success',
      warning: 'bg-warning/10 border-warning text-warning',
      error: 'bg-error/10 border-error text-error',
      info: 'bg-info/10 border-info text-info',
      cyan: 'bg-cyan-dim border-cyan text-cyan',
      accent: 'bg-accent-dim border-accent text-accent',
      neutral: 'bg-dim/20 border-dim text-dim',
      muted: 'bg-muted/10 border-muted text-muted',
    }[variant];

    const sizeClasses = {
      sm: 'text-[10px] px-2 py-0.5 gap-1',
      md: 'text-[11px] px-2.5 py-1 gap-1.5',
      lg: 'text-xs px-3 py-1.5 gap-2',
    }[size];

    const pulseClasses = pulse ? 'animate-beacon-pulse' : '';

    return (
      <span
        ref={ref}
        className={cn(baseClasses, variantClasses, sizeClasses, pulseClasses, className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;