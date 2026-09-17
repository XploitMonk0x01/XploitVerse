import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'w-full font-mono border-collapse';

    const sizeClasses = {
      sm: 'text-[10px]',
      md: 'text-xs',
      lg: 'text-sm',
    }[size];

    const variantClasses = {
      default: '',
      striped: '',
      bordered: 'border border-border',
    }[variant];

    return (
      <div className="overflow-x-auto w-full">
        <table
          ref={ref}
          className={cn(baseClasses, sizeClasses, variantClasses, className)}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <thead ref={ref} className={cn('border-b border-border bg-paper/60 text-[10px] text-muted tracking-[0.12em] uppercase', className)} {...props}>
      {children}
    </thead>
  )
);

TableHeader.displayName = 'TableHeader';

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => (
    <tbody ref={ref} className={cn('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  )
);

TableBody.displayName = 'TableBody';

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hover = true, children, ...props }, ref) => (
    <tr ref={ref} className={cn('font-mono transition-colors', hover && 'hover:bg-paper/40', className)} {...props}>
      {children}
    </tr>
  )
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
      className={cn('px-5 py-3 text-left font-bold', align !== 'left' && `text-${align}`, width && `w-[${width}]`, className)}
      style={{ width }}
      {...props}
    >
      {children}
    </th>
  )
);

TableHead.displayName = 'TableHead';

export interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  fontMono?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'left', fontMono = true, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('px-5 py-3.5', align !== 'left' && `text-${align}`, fontMono && 'font-mono', className)}
      {...props}
    >
      {children}
    </td>
  )
);

TableCell.displayName = 'TableCell';

export interface TableFooterProps extends HTMLAttributes<HTMLTableSectionElement> {}

export const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, children, ...props }, ref) => (
    <tfoot ref={ref} className={cn('border-t border-border bg-paper/40 text-[10px] text-dim tracking-wider uppercase', className)} {...props}>
      {children}
    </tfoot>
  )
);

TableFooter.displayName = 'TableFooter';

export default Table;