import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, error, required, indeterminate, className = '', id, disabled, ...props }, ref) => {
    const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const innerRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    const setRef = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <div className="flex w-full flex-col gap-1.5">
        <label
          className={cn(
            'flex select-none items-start gap-2.5',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          <span className="relative mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
            <input
              ref={setRef}
              type="checkbox"
              id={checkboxId}
              aria-invalid={Boolean(error)}
              aria-required={required}
              className={cn(
                'peer h-4 w-4 cursor-pointer appearance-none rounded-sm border border-border bg-bg-raised transition-colors duration-150 ease-tactical',
                'checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent',
                'hover:border-border-strong',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error ? 'border-danger' : '',
                className,
              )}
              {...props}
              disabled={disabled}
              onChange={(e) => {
                if (disabled) {
                  e.preventDefault();
                  return;
                }
                props.onChange?.(e);
              }}
            />
            <Check
              className="pointer-events-none absolute h-3 w-3 text-accent-fg opacity-0 transition-opacity peer-checked:opacity-100 peer-indeterminate:opacity-0"
              strokeWidth={3}
              aria-hidden="true"
            />
            <Minus
              className="pointer-events-none absolute h-3 w-3 text-accent-fg opacity-0 transition-opacity peer-indeterminate:opacity-100"
              strokeWidth={3}
              aria-hidden="true"
            />
          </span>

          {(label || error || hint) && (
            <span className="flex flex-col gap-0.5">
              {label && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    error ? 'text-danger' : 'text-fg',
                    disabled && 'opacity-50',
                  )}
                >
                  {label}
                  {required && <span className="ml-0.5 text-accent">*</span>}
                </span>
              )}
              {error && (
                <p role="alert" className="flex items-center gap-1 text-xs font-medium text-danger">
                  {error}
                </p>
              )}
              {!error && hint && <p className="text-xs text-fg-subtle">{hint}</p>}
            </span>
          )}
        </label>
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
