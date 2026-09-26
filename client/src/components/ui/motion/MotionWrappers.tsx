import type { ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

// Shared, disciplined motion timing. Enter/exit 180ms on the tactical curve.
const EASE = [0.2, 0.8, 0.2, 1] as const;
const ENTER = { duration: 0.18, ease: EASE };

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  /** @deprecated stagger removed; kept for API compatibility. */
  staggerDelay?: number;
  /** @deprecated stagger removed; kept for API compatibility. */
  initialDelay?: number;
  className?: string;
}

/**
 * Container that fades its children in as a single group.
 * Per-child stagger is intentionally removed (it reads as AI slop).
 */
export const StaggerContainer = ({
  children,
  className = '',
  ...props
}: StaggerContainerProps) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={ENTER}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface FadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  className?: string;
}

export const FadeIn = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 8,
  className = '',
  ...props
}: FadeInProps) => {
  const reduce = useReducedMotion();

  const offset = () => {
    switch (direction) {
      case 'up':
        return { y: distance };
      case 'down':
        return { y: -distance };
      case 'left':
        return { x: distance };
      case 'right':
        return { x: -distance };
      case 'none':
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, ...offset() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...ENTER, delay: reduce ? 0 : delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface RevealProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  delay?: number;
  distance?: number;
  className?: string;
}

/**
 * Scroll-triggered reveal — fades and lifts its children in the first time they
 * enter the viewport. Static when the user prefers reduced motion.
 */
export const Reveal = ({
  children,
  delay = 0,
  distance = 18,
  className = '',
  ...props
}: RevealProps) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: distance }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.5, ease: EASE, delay: reduce ? 0 : delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export interface ScalePressProps extends HTMLMotionProps<'div'> {
  scale?: number;
  scaleTap?: number;
  /** @deprecated hover-scale removed; kept for API compatibility. */
  scaleHover?: number;
}

/** Subtle press feedback only — no hover scaling. */
export const ScalePress = ({
  children,
  className = '',
  scale,
  scaleTap = 0.99,
  ...props
}: ScalePressProps) => {
  const reduce = useReducedMotion();
  const tap = scale ?? scaleTap;
  return (
    <motion.div
      whileTap={reduce ? undefined : { scale: tap }}
      transition={ENTER}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};
