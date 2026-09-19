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
    ref
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
      <div className="flex flex-col gap-1.5 w-full font-mono">
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
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            aria-invalid={Boolean(error)}
            autoComplete="current-password"
            className={cn(
              'w-full bg-surface border text-ink placeholder:text-dim text-sm px-3.5 py-2.5 outline-none transition-all font-mono rounded-none pr-10',
              error
                ? 'border-error text-error focus:border-error focus:ring-1 focus:ring-error/40'
                : 'border-border hover:border-muted focus:border-cyan focus:bg-paper',
              'disabled:bg-subtle disabled:text-dim disabled:border-dashed disabled:cursor-not-allowed',
              className
            )}
            onChange={handleChange}
            required={required}
            {...props}
          />

          <button
            type="button"
            onClick={toggleVisibility}
            className="absolute right-3 text-muted hover:text-ink transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
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

        {showStrength && (
          <div className="mt-1.5 space-y-1" role="status" aria-live="polite">
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1 h-1.5 flex-1" role="progressbar" aria-valuenow={strength ? (strength === 'weak' ? 33 : strength === 'medium' ? 66 : 100) : 0} aria-valuemin={0} aria-valuemax={100} aria-label="Password strength">
                <div className={cn('flex-1 h-full transition-colors', strength === 'weak' || strength === 'medium' || strength === 'strong' ? 'bg-error' : 'bg-border') } />
                <div className={cn('flex-1 h-full transition-colors', strength === 'medium' || strength === 'strong' ? 'bg-warning' : 'bg-border') } />
                <div className={cn('flex-1 h-full transition-colors', strength === 'strong' ? 'bg-success' : 'bg-border') } />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-dim">
                {strength ? strength.toUpperCase() : 'ENTER_PASSWORD'}
              </span>
            </div>
            {strength && (
              <p className="text-[10px] text-muted font-mono">
                {getStrengthMessage(strength, minLength)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
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