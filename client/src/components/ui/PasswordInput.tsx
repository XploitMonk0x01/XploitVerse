import { forwardRef, useState, useId, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
  error?: string;
  showStrength?: boolean;
  minLength?: number;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      hint,
      error,
      showStrength = false,
      minLength = 8,
      className = '',
      id,
      required,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

    const generatedId = useId();
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChange?.(e);
      if (showStrength) {
        setStrength(calculateStrength(value));
      }
    };

    const toggleVisibility = () => {
      setShowPassword(!showPassword);
    };

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
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            aria-invalid={Boolean(error)}
            autoComplete="current-password"
            className={cn(
              'h-9 w-full rounded border bg-bg-raised px-3 pr-10 text-sm text-fg outline-none transition-colors duration-150 ease-tactical',
              'placeholder:text-fg-subtle',
              error
                ? 'border-danger focus:border-danger'
                : 'border-border hover:border-border-strong focus:border-accent',
              'disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-bg-overlay disabled:text-fg-subtle',
              className,
            )}
            onChange={handleChange}
            required={required}
            {...props}
          />

          <button
            type="button"
            onClick={toggleVisibility}
            className="absolute right-3 text-fg-subtle transition-colors hover:text-fg"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-1 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        {!error && hint && <p className="text-xs text-fg-subtle">{hint}</p>}

        {showStrength && (
          <div className="mt-1.5 space-y-1" role="status" aria-live="polite">
            <div className="flex items-center gap-2">
              <div
                className="flex h-1.5 flex-1 gap-1"
                role="progressbar"
                aria-valuenow={strength ? (strength === 'weak' ? 33 : strength === 'medium' ? 66 : 100) : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Password strength"
              >
                <div
                  className={cn(
                    'h-full flex-1 rounded-full transition-colors',
                    strength ? 'bg-danger' : 'bg-border',
                  )}
                />
                <div
                  className={cn(
                    'h-full flex-1 rounded-full transition-colors',
                    strength === 'medium' || strength === 'strong' ? 'bg-warn' : 'bg-border',
                  )}
                />
                <div
                  className={cn(
                    'h-full flex-1 rounded-full transition-colors',
                    strength === 'strong' ? 'bg-accent' : 'bg-border',
                  )}
                />
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                {strength ? strength.toUpperCase() : 'ENTER_PASSWORD'}
              </span>
            </div>
            {strength && (
              <p className="text-xs text-fg-muted">{getStrengthMessage(strength, minLength)}</p>
            )}
          </div>
        )}
      </div>
    );
  },
);

function calculateStrength(password: string): 'weak' | 'medium' | 'strong' | null {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

function getStrengthMessage(strength: 'weak' | 'medium' | 'strong', minLength: number): string {
  switch (strength) {
    case 'weak':
      return `Weak — Use at least ${minLength} chars with mixed case, numbers, symbols`;
    case 'medium':
      return 'Medium — Good, but could be stronger with more variety';
    case 'strong':
      return 'Strong — Excellent password strength';
    default:
      return '';
  }
}

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
