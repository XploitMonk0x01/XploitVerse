import {
  forwardRef,
  type ElementType,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'ghost'
  | 'danger'
  /** @deprecated kept as an alias for `secondary`; the palette has a single accent. */
  | 'cyan';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  as?: ElementType;
  href?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-press',
  secondary:
    'bg-bg-raised text-fg border border-border hover:bg-bg-overlay hover:border-border-strong active:bg-bg-raised',
  subtle: 'bg-bg-overlay text-fg-muted hover:text-fg hover:bg-border-subtle',
  ghost: 'bg-transparent text-fg-muted hover:text-fg hover:bg-bg-overlay',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger',
  cyan: 'bg-bg-raised text-fg border border-border hover:bg-bg-overlay hover:border-border-strong',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    className,
    as,
    href,
    iconLeft,
    iconRight,
    fullWidth,
    children,
    type,
    ...props
  },
  ref,
) {
  const Component: ElementType = as || (href ? 'a' : 'button');
  const isButton = Component === 'button';
  const isDisabled = disabled || isLoading;

  return (
    <Component
      ref={ref}
      type={isButton ? (type ?? 'button') : undefined}
      href={href}
      disabled={isButton ? isDisabled : undefined}
      aria-busy={isLoading || undefined}
      aria-disabled={!isButton && isDisabled ? true : undefined}
      tabIndex={!isButton && isDisabled ? -1 : undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded font-medium whitespace-nowrap',
        'transition-colors duration-150 ease-tactical',
        'disabled:pointer-events-none disabled:opacity-50',
        fullWidth && 'w-full',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Working</span>
        </>
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </Component>
  );
});

export default Button;
