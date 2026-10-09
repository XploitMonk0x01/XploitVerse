import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    }[size];

    const variantClasses = {
      default: '',
      striped: '',
      bordered: 'border border-border',
    }[variant];

    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={cn('w-full border-collapse', sizeClasses, variantClasses, className)}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
);

Table.displayName = 'Table';

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('border-b border-border bg-bg-overlay text-xs text-fg-subtle', className)}
      {...props}
    >
      {children}
    </thead>
  ),
);

TableHeader.displayName = 'TableHeader';

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-border-subtle', className)} {...props}>
      {children}
    </tbody>
  ),
);

TableBody.displayName = 'TableBody';

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hover = true, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('transition-colors duration-150 ease-tactical', hover && 'hover:bg-bg-raised', className)}
      {...props}
    >
      {children}
    </tr>
  ),
);

TableRow.displayName = 'TableRow';

export interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, align = 'left', width, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'px-4 py-2.5 font-medium uppercase tracking-wide',
        alignClasses[align],
        className,
      )}
      style={{ width }}
      {...props}
    >
      {children}
    </th>
  ),
);

TableHead.displayName = 'TableHead';

export interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  fontMono?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'left', fontMono = false, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'px-4 py-3 text-fg',
        alignClasses[align],
        align === 'right' && 'tabular-nums',
        fontMono && 'font-mono',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  ),
);

TableCell.displayName = 'TableCell';

export interface TableFooterProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, children, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('border-t border-border bg-bg-overlay text-xs text-fg-subtle', className)}
      {...props}
    >
      {children}
    </tfoot>
  ),
);

TableFooter.displayName = 'TableFooter';

export default Table;
