import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  showCharCount?: boolean;
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      required,
      rows = 4,
      showCharCount = false,
      maxLength,
      mono = false,
      className = '',
      id,
      disabled,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    const labelId = `${textareaId}-label`;
    const hintId = `${textareaId}-hint`;
    const errorId = `${textareaId}-error`;
    const countId = `${textareaId}-count`;

    const effectiveValue = value !== undefined ? value : defaultValue;
    const valueLength = typeof effectiveValue === 'string' ? effectiveValue.length : 0;
    const charCount = maxLength ? `${valueLength} / ${maxLength}` : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
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

        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            maxLength={maxLength}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            required={required}
            className={cn(
              'w-full resize-y rounded border bg-bg-raised px-3 py-2 text-sm text-fg outline-none transition-colors duration-150 ease-tactical',
              'placeholder:text-fg-subtle',
              mono && 'font-mono',
              error
                ? 'border-danger focus:border-danger'
                : 'border-border hover:border-border-strong focus:border-accent',
              'disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-bg-overlay disabled:text-fg-subtle',
              className,
            )}
            {...props}
          />

          {showCharCount && maxLength && (
            <div
              id={countId}
              className="absolute bottom-2 right-2 text-xs text-fg-subtle"
              aria-live="polite"
            >
              {charCount}
            </div>
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

Textarea.displayName = 'Textarea';

export default Textarea;
