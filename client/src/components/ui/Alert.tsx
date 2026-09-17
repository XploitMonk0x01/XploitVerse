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
  ({ className, variant = 'default', title, dismissible = false, onDismiss, icon, children, ...props }, ref) => {
    const variantStyles = {
      default: {
        bg: 'bg-surface',
        border: 'border-border',
        text: 'text-ink',
        iconColor: 'text-muted',
        iconBg: 'bg-dim/20',
        defaultIcon: Info,
      },
      success: {
        bg: 'bg-success/10',
        border: 'border-success',
        text: 'text-success',
        iconColor: 'text-success',
        iconBg: 'bg-success-dim',
        defaultIcon: CheckCircle,
      },
      warning: {
        bg: 'bg-warning/10',
        border: 'border-warning',
        text: 'text-warning',
        iconColor: 'text-warning',
        iconBg: 'bg-warning/10',
        defaultIcon: AlertTriangle,
      },
      error: {
        bg: 'bg-error/10',
        border: 'border-error',
        text: 'text-error',
        iconColor: 'text-error',
        iconBg: 'bg-error/10',
        defaultIcon: AlertCircle,
      },
      info: {
        bg: 'bg-info/10',
        border: 'border-info',
        text: 'text-info',
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
        className={cn(
          'flex gap-3 p-4 border rounded-none font-mono',
          variantStyles.bg,
          variantStyles.border,
          variantStyles.text,
          className
        )}
        {...props}
      >
        <div className={cn('w-8 h-8 flex items-center justify-center rounded-none flex-shrink-0', variantStyles.iconBg)}>
          {icon ? (
            <span className={cn('w-5 h-5', variantStyles.iconColor)}>{icon}</span>
          ) : (
            <DefaultIcon className={cn('w-5 h-5', variantStyles.iconColor)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-bold uppercase tracking-wider mb-1">
              {title}
            </h4>
          )}
          <div className="text-xs leading-relaxed">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="p-1 text-current/50 hover:text-current transition-opacity flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;