import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Fine architectural line grid that fades out toward the bottom of the viewport.
const gridStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, rgba(27,26,23,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,26,23,0.05) 1px, transparent 1px)',
  backgroundSize: '56px 56px',
  maskImage: 'radial-gradient(ellipse 100% 65% at 50% 0%, #000 25%, transparent 78%)',
  WebkitMaskImage: 'radial-gradient(ellipse 100% 65% at 50% 0%, #000 25%, transparent 78%)',
};

// Single-hue indigo depth glows. Tuned up so the ambient presence reads clearly
// on the linen canvas without tipping into neon.
const glow = (alpha: number): CSSProperties => ({
  background: `radial-gradient(circle, rgba(79,70,229,${alpha}), transparent 68%)`,
});

/**
 * Ambient backdrop rendered behind the whole page: a subtle grid plus a few
 * slow-drifting indigo glows. Fixed to the viewport and painted above the page
 * background but below all content (via the parent `isolate` + negative z-index).
 * Animation is disabled when the user prefers reduced motion.
 */
export function AmbientBackdrop() {
  const reduce = useReducedMotion();

  const loop = (duration: number) =>
    reduce
      ? undefined
      : { duration, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={gridStyle} />

      <div className="absolute -top-48 left-1/2 -translate-x-1/2">
        <motion.div
          className="h-[620px] w-[620px] rounded-full blur-3xl"
          style={glow(0.36)}
          animate={reduce ? undefined : { x: [0, 44, -30, 0], y: [0, 28, 8, 0], scale: [1, 1.12, 0.97, 1] }}
          transition={loop(20)}
        />
      </div>
      <motion.div
        className="absolute top-[30%] -right-52 h-[560px] w-[560px] rounded-full blur-3xl"
        style={glow(0.3)}
        animate={reduce ? undefined : { x: [0, -48, 18, 0], y: [0, 36, -18, 0], scale: [1, 1.14, 1, 1] }}
        transition={loop(24)}
      />
      <motion.div
        className="absolute top-[52%] -left-64 h-[560px] w-[560px] rounded-full blur-3xl"
        style={glow(0.26)}
        animate={reduce ? undefined : { x: [0, 40, 0, 0], y: [0, -30, 18, 0], scale: [1, 1.1, 0.98, 1] }}
        transition={loop(26)}
      />
      <motion.div
        className="absolute bottom-[-12%] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        style={glow(0.24)}
        animate={reduce ? undefined : { x: [0, 30, -24, 0], y: [0, -22, 14, 0], scale: [1, 1.08, 1, 1] }}
        transition={loop(28)}
      />
    </div>
  );
}

export default AmbientBackdrop;
