import React, { useState, useEffect } from 'react';

// Industrial Utilitarian Loading Spinner Component
const LoadingSpinner = ({ size = 'md', className = '', message = "LOADING..." }) => {
    // Technical loading state simulation text
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? "" : prev + ".");
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    const styles = `
    .technical-spinner {
        border: 2px solid var(--color-border);
        border-top-color: var(--color-accent);
        border-right-color: var(--color-accent);
        border-radius: 0;
        animation: technical-spin 1s steps(4) infinite;
    }
    
    @keyframes technical-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-pulse {
        animation: opacity-pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes opacity-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    `;

    return (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <style>{styles}</style>
            <div className={`${sizeClasses[size]} technical-spinner`} />

            {message && (
                <div className="font-mono text-sm text-muted font-bold tracking-widest uppercase loading-pulse">
                    {message}{dots}
                </div>
            )}
        </div>
    );
};

export default LoadingSpinner;
