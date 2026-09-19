import React, { type ElementType, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  as?: ElementType;
  href?: string;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  as: Component = 'button',
  ...props
}: ButtonProps) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-mono font-bold uppercase tracking-[0.1em] select-none transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none border rounded-none group whitespace-nowrap';

  const sizeClasses = {
    sm: 'text-[11px] px-3 py-1.5 gap-1.5',
    md: 'text-xs px-4 py-2 gap-2',
    lg: 'text-sm px-6 py-3 gap-2',
  }[size];

  const variantClasses = {
    primary:
      'bg-accent text-paper border-accent hover:bg-accent-hover hover:border-accent-hover shadow-accent hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]',
    secondary:
      'bg-surface text-ink border-border hover:border-border-bright hover:bg-surface-elevated',
    cyan:
      'bg-cyan text-paper border-cyan hover:opacity-90 shadow-cyan hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]',
    ghost:
      'bg-transparent text-muted border-border hover:text-ink hover:bg-surface hover:border-border-bright',
    danger:
      'bg-error text-paper border-error hover:opacity-90',
  }[variant];

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Working</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
};

export default Button;