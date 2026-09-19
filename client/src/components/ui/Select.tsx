import { forwardRef, useId, type SelectHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  iconRight?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      required,
      placeholder,
      options,
      icon: Icon,
      iconRight,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    const labelId = `${selectId}-label`;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex flex-col gap-1.5 w-full font-mono group">
        {label && (
          <label
            htmlFor={selectId}
            id={labelId}
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

          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            disabled={disabled}
            required={required}
            className={cn(
              'w-full bg-surface border text-ink text-sm px-3.5 py-2.5 outline-none transition-all font-mono rounded-none appearance-none',
              'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cGF0aCBkPSJNNiA5bDYtNiIgc3Ryb2tlPSIjNkI3ODk5IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48L3N2Zz4=")]_no-repeat_center_right_8px',
              Icon ? 'pl-9' : '',
              iconRight ? 'pr-12' : 'pr-10',
              error
                ? 'border-error text-error focus:border-error focus:ring-1 focus:ring-error/40'
                : 'border-border hover:border-muted focus:border-cyan focus:bg-paper',
              'disabled:bg-subtle disabled:text-dim disabled:border-dashed disabled:cursor-not-allowed',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          {iconRight && (
            <div className="absolute right-3 text-muted flex items-center pointer-events-none">
              {iconRight}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-[11px] font-bold text-error uppercase tracking-wider flex items-center gap-1 mt-0.5">
            <span>[ERR]:</span> {error}
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-[11px] text-dim font-mono tracking-wide mt-0.5">
            // {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;