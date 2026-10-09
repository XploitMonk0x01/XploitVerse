import { AlertTriangle } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  error: Error | string | null | undefined;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function ErrorState({ error, onRetry, title, className = '' }: ErrorStateProps) {
  const defaultTitle = 'Error';
  const message =
    error instanceof Error ? error.message : error || 'An unexpected error occurred.';

  return (
    <div
      role="alert"
      className={`flex w-full flex-col gap-3 rounded-md border border-danger/30 border-l-2 border-l-danger bg-danger/5 p-5 ${className}`}
    >
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-fg">{title ?? defaultTitle}</h3>
      </div>
      <p className="text-sm leading-relaxed text-fg-muted">{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry} size="sm" className="self-start">
          Retry
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
