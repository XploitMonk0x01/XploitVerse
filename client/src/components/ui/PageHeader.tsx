import React, { type HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Badge, type BadgeVariant } from './Badge';

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: BadgeVariant;
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
    <div
      className={cn(
        'flex flex-col justify-between gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-center',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-2">
        {backLink && (
          <Link
            to={backLink.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLink.label || 'Back'}</span>
          </Link>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-semibold leading-none tracking-tight text-fg">{title}</h1>
          {badge && (
            <Badge variant={badge.variant || 'neutral'} size="sm" pulse={badge.pulse}>
              {badge.label}
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 sm:self-end">{action}</div>}
      {children}
    </div>
  );
};

export default PageHeader;
