import React, { forwardRef, type InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconRight?: React.ReactNode;
  /** Use a monospaced field (e.g. flags, IPs, commands). */
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      required,
      icon: Icon,
      iconRight,
      mono = false,
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'flex items-center justify-between text-sm font-medium text-fg-muted',
              required && 'required',
            )}
          >
            <span>
              {label}
              {required && <span className="ml-0.5 text-accent">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex w-full items-center">
          {Icon && (
            <div className="pointer-events-none absolute left-3 z-10 text-fg-subtle">
              <Icon className="h-4 w-4" />
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-9 w-full rounded border bg-bg-raised px-3 text-sm text-fg outline-none transition-colors duration-150 ease-tactical',
              'placeholder:text-fg-subtle',
              mono && 'font-mono',
              Icon ? 'pl-9' : '',
              iconRight ? 'pr-9' : '',
              error
                ? 'error border-danger focus:border-danger'
                : 'border-border hover:border-border-strong focus:border-accent',
              'disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-bg-overlay disabled:text-fg-subtle',
              className,
            )}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3 flex items-center text-fg-subtle">{iconRight}</div>
          )}
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-1 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        {!error && hint && <p className="text-xs text-fg-subtle">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
