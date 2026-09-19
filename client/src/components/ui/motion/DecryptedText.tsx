import { useState, useEffect, useRef, useCallback } from 'react';

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

const DEFAULT_CHARS = '0123456789ABCDEF!@#$%^&*()_+-=[]{}|;:,.<>?';

export const DecryptedText = ({
  text,
  speed = 40,
  maxIterations = 10,
  sequential = true,
  characters = DEFAULT_CHARS,
  className = '',
  parentClassName = '',
  animateOn = 'mount',
}: DecryptedTextProps) => {
    const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scramble = useCallback(() => {
    let currentIteration = 0;
    setIsScrambling(true);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (sequential && currentIteration > index * 2) {
              return char;
            }
            if (currentIteration >= maxIterations) {
              return char;
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('');
      });

      currentIteration++;

      if (currentIteration > (sequential ? text.length * 2 + 2 : maxIterations)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, speed);
  }, [text, speed, maxIterations, sequential, characters]);

  useEffect(() => {
    if (animateOn === 'mount' || animateOn === 'view') {
      scramble();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scramble, animateOn]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' && !isScrambling) {
      scramble();
    }
  };

  return (
    <span
      className={`inline-block font-mono ${parentClassName}`}
      onMouseEnter={handleMouseEnter}
    >
      <span className={className}>
        {displayText}
      </span>
      {isScrambling && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-accent animate-pulse align-middle" />
      )}
    </span>
  );
};

export default DecryptedText;
