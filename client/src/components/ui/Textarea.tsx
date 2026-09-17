import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  showCharCount?: boolean;
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
      className = '',
      id,
      disabled,
      value,
      defaultValue,
      ...props
    },
    ref
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
      <div className="flex flex-col gap-1.5 w-full font-mono">
        {label && (
          <label
            htmlFor={textareaId}
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
              'w-full bg-surface border text-ink placeholder:text-dim text-sm px-3.5 py-2.5 outline-none transition-all font-mono rounded-none resize-y',
              error
                ? 'border-error text-error focus:border-error focus:ring-1 focus:ring-error/40'
                : 'border-border hover:border-muted focus:border-cyan focus:bg-paper',
              'disabled:bg-subtle disabled:text-dim disabled:border-dashed disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />

          {showCharCount && maxLength && (
            <div
              id={countId}
              className="absolute bottom-2 right-2 text-[10px] text-dim font-mono tracking-wide"
              aria-live="polite"
            >
              {charCount}
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

Textarea.displayName = 'Textarea';

export default Textarea;