import React, { type HTMLAttributes, forwardRef } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = 'default', title, dismissible = false, onDismiss, icon, children, ...props },
    ref,
  ) => {
    const variantStyles = {
      default: {
        container: 'bg-bg-raised border-border text-fg',
        iconColor: 'text-fg-muted',
        iconBg: 'bg-bg-overlay',
        defaultIcon: Info,
      },
      success: {
        container: 'bg-success/10 border-success/30 text-fg',
        iconColor: 'text-success',
        iconBg: 'bg-success/10',
        defaultIcon: CheckCircle,
      },
      warning: {
        container: 'bg-warn/10 border-warn/30 text-fg',
        iconColor: 'text-warn',
        iconBg: 'bg-warn/10',
        defaultIcon: AlertTriangle,
      },
      error: {
        container: 'bg-danger/10 border-danger/30 text-fg',
        iconColor: 'text-danger',
        iconBg: 'bg-danger/10',
        defaultIcon: AlertCircle,
      },
      info: {
        container: 'bg-info/10 border-info/30 text-fg',
        iconColor: 'text-info',
        iconBg: 'bg-info/10',
        defaultIcon: Info,
      },
    }[variant];

    const DefaultIcon = variantStyles.defaultIcon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn('flex gap-3 rounded-md border p-4', variantStyles.container, className)}
        {...props}
      >
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md',
            variantStyles.iconBg,
          )}
        >
          {icon ? (
            <span className={cn('h-5 w-5', variantStyles.iconColor)}>{icon}</span>
          ) : (
            <DefaultIcon className={cn('h-5 w-5', variantStyles.iconColor)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {title && <h4 className="mb-1 text-sm font-semibold text-fg">{title}</h4>}
          <div className="text-sm leading-relaxed text-fg-muted">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 self-start rounded p-1 text-fg-subtle transition-colors hover:text-fg"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);

Alert.displayName = 'Alert';

export default Alert;
