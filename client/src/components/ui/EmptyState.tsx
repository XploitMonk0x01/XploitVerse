import type { ReactNode } from 'react';
import Button from './Button';
import { Terminal, Database } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState = ({
  icon,
  title = 'TELEMETRY_EMPTY',
  description = 'No localized assets or records were detected in the target database.',
  action,
  className = '',
}: EmptyStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-10 sm:p-14 border border-dashed border-border font-mono ${className}`}
    >
      <div className="w-10 h-10 bg-surface border border-border flex items-center justify-center text-muted mb-4">
        {icon || <Database className="w-5 h-5 text-dim" />}
      </div>

      <h3 className="text-sm font-display font-black text-ink uppercase tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-xs text-muted max-w-[36ch] leading-relaxed mb-5">
        {description}
      </p>

      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          <Terminal className="w-3 h-3" />
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;