import {
  forwardRef,
  useId,
  type SelectHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
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
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    const labelId = `${selectId}-label`;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            id={labelId}
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

          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            disabled={disabled}
            required={required}
            className={cn(
              'h-9 w-full appearance-none rounded border bg-bg-raised pl-3 pr-9 text-sm text-fg outline-none transition-colors duration-150 ease-tactical',
              Icon ? 'pl-9' : '',
              iconRight ? 'pr-16' : '',
              error
                ? 'border-danger focus:border-danger'
                : 'border-border hover:border-border-strong focus:border-accent',
              'disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-bg-overlay disabled:text-fg-subtle',
              className,
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

          {iconRight ? (
            <div className="pointer-events-none absolute right-8 flex items-center text-fg-subtle">
              {iconRight}
            </div>
          ) : (
            <ChevronDown
              className="pointer-events-none absolute right-3 h-4 w-4 text-fg-subtle"
              aria-hidden="true"
            />
          )}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1 text-xs font-medium text-danger"
          >
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-xs text-fg-subtle">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
