import type { ReactNode } from 'react';
import Button from './Button';
import { Database } from 'lucide-react';

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
  title = 'Nothing here yet',
  description = 'No records were found. Try adjusting your filters or check back later.',
  action,
  className = '',
}: EmptyStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-10 text-center sm:p-14 ${className}`}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle bg-bg-raised text-fg-subtle">
        {icon || <Database className="h-5 w-5" />}
      </div>

      <h3 className="mb-2 text-base font-semibold text-fg">{title}</h3>

      <p className="mb-5 max-w-[42ch] text-sm leading-relaxed text-fg-muted">{description}</p>

      {action && (
        <Button variant="secondary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
