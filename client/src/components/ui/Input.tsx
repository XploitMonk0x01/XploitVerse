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
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full font-mono group">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-xs font-bold uppercase tracking-wider text-muted flex items-center justify-between',
              required && 'required'
            )}
          >
            <span>
              <span className="text-accent mr-1.5">#</span>
              {label}
              {required && <span className="text-accent ml-1">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          {Icon && (
            <div className="absolute left-3 text-muted pointer-events-none z-10">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            className={cn(
              'w-full bg-surface border text-ink placeholder:text-dim text-sm px-3.5 py-2.5 outline-none transition-all font-mono rounded-none',
              Icon ? 'pl-9' : '',
              iconRight ? 'pr-9' : '',
              error
                ? 'error border-error text-error focus:border-error focus:ring-1 focus:ring-error/40'
                : 'border-border hover:border-muted focus:border-cyan focus:bg-paper',
              'disabled:bg-subtle disabled:text-dim disabled:border-dashed disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3 text-muted flex items-center">
              {iconRight}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-[11px] font-bold text-error uppercase tracking-wider flex items-center gap-1 mt-0.5">
            <span>[ERR]:</span> {error}
          </p>
        )}

        {!error && hint && (
          <p className="text-[11px] text-dim font-mono tracking-wide mt-0.5">
            // {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;