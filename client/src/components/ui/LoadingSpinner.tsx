import { useState, useEffect, useMemo } from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
}

export const LoadingSpinner = ({
  size = 'md',
  className = '',
  message = 'INITIALIZING_STREAM',
}: LoadingSpinnerProps) => {
  const [phase, setPhase] = useState(0);
  const frames = useMemo(() => ['[ - ]', '[ \\ ]', '[ | ]', '[ / ]'], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((prev) => (prev + 1) % frames.length);
    }, 120);
    return () => clearInterval(interval);
  }, [frames]);

  const sizeClasses = {
    sm: 'w-4 h-4 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-2',
    xl: 'w-16 h-16 border-2',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 font-mono ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Mechanical square spinner */}
        <div
          className={`${sizeClasses} border-border border-t-accent border-r-accent animate-spin`}
          style={{ animationDuration: '0.8s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-accent">
            {frames[phase]}
          </span>
        </div>
      </div>

      {message && (
        <div className="text-xs text-muted font-bold tracking-widest uppercase flex items-center gap-1.5">
          <span className="text-accent">{'>'}</span>
          <span>{message}</span>
          <span className="animate-ping text-[10px] text-accent">_</span>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;