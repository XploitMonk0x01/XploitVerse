import Button from './Button';

interface ErrorStateProps {
  error: Error | string | null | undefined;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function ErrorState({ error, onRetry, title, className = '' }: ErrorStateProps) {
  const defaultTitle = 'Error';
  const message = error instanceof Error ? error.message : error || 'An unexpected error occurred.';

  return (
    <div className={`flex flex-col gap-3 p-5 bg-error/5 border border-error border-l-4 border-l-error font-mono w-full ${className}`}>
      <div className="flex items-center gap-2 text-error">
        <span className="font-bold text-sm font-mono">[!]</span>
        <h3 className="text-sm font-display font-black uppercase tracking-tight">{title ?? defaultTitle}</h3>
      </div>
      <p className="text-xs text-muted leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry} size="sm" className="self-start">
          Retry
        </Button>
      )}
    </div>
  );
}

export default ErrorState;