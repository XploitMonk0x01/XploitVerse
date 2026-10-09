import { type HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
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

const isExternal = (href: string) => /^https?:\/\//.test(href);

export const Breadcrumbs = ({
  items,
  separator = <ChevronRight className="h-3.5 w-3.5" />,
  className,
  ...props
}: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="text-fg-subtle" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.href && !item.current ? (
              isExternal(item.href) ? (
                <a
                  href={item.href}
                  className="font-medium text-fg-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  to={item.href}
                  className="font-medium text-fg-muted transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              )
            ) : (
              <span
                className={cn('font-medium', item.current ? 'text-fg' : 'text-fg-muted')}
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
