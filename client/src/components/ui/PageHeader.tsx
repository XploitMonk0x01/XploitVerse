import React, { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { DecryptedText } from '../ui/motion/DecryptedText';
import { TacticalBadge } from '../ui/motion/TacticalBadge';

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'cyan' | 'accent' | 'neutral' | 'muted';
    pulse?: boolean;
  };
  action?: React.ReactNode;
  backLink?: {
    href: string;
    label?: string;
  };
}

export const PageHeader = ({
  title,
  subtitle,
  badge,
  action,
  backLink,
  className,
  children,
  ...props
}: PageHeaderProps) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6', className)} {...props}>
      <div className="flex flex-col gap-2">
        {backLink && (
          <a
            href={backLink.href}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-accent uppercase tracking-wider transition-colors"
          >
            <span className="w-3.5 h-3.5">←</span>
            <span>{backLink.label || '[ // BACK ]'}</span>
          </a>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-display font-black text-ink tracking-tight uppercase leading-none">
            <DecryptedText text={title} speed={20} />
          </h1>
          {badge && (
            <TacticalBadge
              label={badge.label}
              variant={badge.variant || 'neutral'}
              size="sm"
              pulse={badge.pulse}
            />
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 sm:self-end">
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

export default PageHeader;