import type { ReactNode } from 'react';
import { Badge, type BadgeVariant } from '../Badge';
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

const variantMap: Record<TacticalBadgeVariant, BadgeVariant> = {
  accent: 'accent',
  cyan: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  danger: 'error',
  info: 'info',
  muted: 'neutral',
  neutral: 'neutral',
};

/**
 * Thin compatibility wrapper over the design-system {@link Badge}.
 * The neon beacon/glow and pulse animation have been removed; `pulse` now
 * renders a static status dot.
 */
export const TacticalBadge = ({
  label,
  children,
  variant = 'muted',
  pulse = false,
  size = 'sm',
  className = '',
  code,
}: TacticalBadgeProps) => {
  const content = children ?? label;

  return (
    <Badge variant={variantMap[variant]} size={size} pulse={pulse} className={cn(className)}>
      {code && <span className="opacity-60">[{code}]</span>}
      {content}
    </Badge>
  );
};

export default TacticalBadge;
