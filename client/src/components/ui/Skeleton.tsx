import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton = ({
  variant = 'text',
  width,
  height,
  lines,
  className,
  ...props
}: SkeletonProps) => {
  const baseClasses = 'animate-pulse bg-dim/20 rounded-none';

  const variantStyles = {
    text: cn(baseClasses, 'h-3 w-full'),
    circular: cn(baseClasses, 'rounded-full'),
    rectangular: cn(baseClasses),
    card: cn(baseClasses, 'w-full'),
  };

  if (variant === 'text' && lines && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(variantStyles.text, i === lines - 1 && 'w-3/4')}
            style={{ width: i === lines - 1 ? '75%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(variantStyles[variant], className)}
      style={{ width, height }}
      {...props}
    />
  );
};

export const SkeletonCard = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-surface border border-border p-5 space-y-4', className)} {...props}>
    <div className="flex items-center justify-between">
      <Skeleton variant="rectangular" width="40%" height="1.5rem" />
      <Skeleton variant="circular" width="2rem" height="2rem" />
    </div>
    <Skeleton variant="text" lines={3} />
    <div className="flex items-center gap-2">
      <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
      <Skeleton variant="text" width="60%" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4, className, ...props }: { rows?: number; columns?: number } & HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('overflow-x-auto', className)} {...props}>
    <table className="w-full text-xs font-mono border-collapse">
      <thead>
        <tr className="border-b border-border bg-paper/60 text-[10px] text-muted tracking-[0.12em] uppercase">
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-5 py-3 text-left font-bold">
              <Skeleton variant="text" width="80%" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="hover:bg-paper/40 transition-colors">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className="px-5 py-3.5 font-mono">
                <Skeleton variant="text" width="90%" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Skeleton;