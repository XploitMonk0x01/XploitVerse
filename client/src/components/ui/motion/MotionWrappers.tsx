import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}

export const StaggerContainer = ({
  children,
  staggerDelay = 0.06,
  initialDelay = 0.02,
  className = '',
  ...props
}: StaggerContainerProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
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
  distance = 12,
  className = '',
  ...props
}: FadeInProps) => {
  const getInitial = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: distance };
      case 'down':
        return { opacity: 0, y: -distance };
      case 'left':
        return { opacity: 0, x: distance };
      case 'right':
        return { opacity: 0, x: -distance };
      case 'none':
      default:
        return { opacity: 0 };
    }
  };

  return (
    <motion.div
      variants={{
        hidden: getInitial(),
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            type: 'spring',
            damping: 24,
            stiffness: 260,
            delay,
          },
        },
      }}
      initial="hidden"
      animate="visible"
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
  scaleHover?: number;
}

export const ScalePress = ({
  children,
  className = '',
  scale,
  scaleTap = 0.98,
  scaleHover = 1.01,
  ...props
}: ScalePressProps) => {
  const tap = scale ?? scaleTap;
  return (
    <motion.div
      whileHover={{ scale: scaleHover }}
      whileTap={{ scale: tap }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};
