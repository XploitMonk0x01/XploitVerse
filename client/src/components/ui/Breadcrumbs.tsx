import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export const Breadcrumbs = ({
  items,
  separator = <ChevronRight className="w-3 h-3" />,
  className,
  ...props
}: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-xs font-mono', className)} {...props}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-dim" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.href && !item.current ? (
              <a
                href={item.href}
                className={cn(
                  'font-bold uppercase tracking-wider transition-colors',
                  item.current ? 'text-ink' : 'text-muted hover:text-accent'
                )}
              >
                {item.label}
              </a>
            ) : (
              <span
                className={cn(
                  'font-bold uppercase tracking-wider',
                  item.current ? 'text-ink' : 'text-muted'
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;