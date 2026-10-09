interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: 'start' | 'end' | 'center';
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  animateOn?: 'view' | 'hover' | 'mount';
}

// Clean, stable text rendering without distracting AI typewriter scrambling
export const DecryptedText = ({
  text,
  className = '',
  parentClassName = '',
}: DecryptedTextProps) => {
  return (
    <span className={parentClassName}>
      <span className={className}>{text}</span>
    </span>
  );
};

export default DecryptedText;
