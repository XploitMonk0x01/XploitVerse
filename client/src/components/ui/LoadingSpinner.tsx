import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
} as const;

export const LoadingSpinner = ({
  size = 'md',
  className = '',
  message = 'Loading',
}: LoadingSpinnerProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3', className)}
    >
      <Loader2 className={cn('animate-spin text-accent', sizeClasses[size])} aria-hidden="true" />
      {message && <span className="text-sm text-fg-muted">{message}</span>}
    </div>
  );
};

export default LoadingSpinner;
