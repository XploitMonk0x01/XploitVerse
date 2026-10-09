import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** @deprecated mouse-follow spotlight removed; kept for API compatibility. */
  spotlightColor?: string;
  /** @deprecated glow border removed; kept for API compatibility. */
  borderColor?: string;
  onClick?: () => void;
}

/**
 * A quiet hover card. Interaction is a subtle border/surface shift only —
 * no mouse-follow spotlight, no glow.
 */
export const SpotlightCard = ({ children, className, onClick }: SpotlightCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-lg border border-border-subtle bg-bg-raised shadow-card transition-colors duration-150 ease-tactical',
        'hover:border-border-strong hover:bg-bg-overlay',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

export default SpotlightCard;
