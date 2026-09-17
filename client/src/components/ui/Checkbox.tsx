import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      hint,
      error,
      required,
      indeterminate,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
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
      <div className="flex flex-col gap-1.5 w-full font-mono">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <div className="relative flex items-center justify-center mt-0.5 flex-shrink-0">
            <input
              ref={setRef}
              type="checkbox"
              id={checkboxId}
              aria-invalid={Boolean(error)}
              aria-required={required}
              disabled={disabled}
              className={cn(
                'w-4 h-4 appearance-none border rounded-none transition-all cursor-pointer',
                'bg-surface border-border text-accent',
                'checked:bg-accent checked:border-accent checked:text-paper',
                'indeterminate:bg-accent indeterminate:border-accent indeterminate:text-paper',
                'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-paper',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:border-muted',
                className
              )}
              {...props}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            {label && (
              <span
                className={cn(
                  'text-sm font-bold uppercase tracking-wider',
                  error ? 'text-error' : 'text-ink',
                  disabled && 'opacity-50'
                )}
              >
                {label}
                {required && <span className="text-accent ml-1">*</span>}
              </span>
            )}
            {error && (
              <p role="alert" className="text-[11px] font-bold text-error uppercase tracking-wider flex items-center gap-1">
                [ERR]: {error}
              </p>
            )}
            {!error && hint && (
              <p className="text-[11px] text-dim font-mono tracking-wide">
                // {hint}
              </p>
            )}
          </div>
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;