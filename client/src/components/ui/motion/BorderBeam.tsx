interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

// Disabled to eliminate distracting AI-generated laser loops
export const BorderBeam = (_props: BorderBeamProps) => {
  return null;
};

export default BorderBeam;
