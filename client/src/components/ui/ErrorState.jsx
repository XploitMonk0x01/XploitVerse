import React from 'react';
import Button from './Button';

// Industrial Utilitarian Error State
export function ErrorState({ error, onRetry, title, className = '' }) {
    const defaultTitle = 'SYSTEM FAILURE';
    const message = error?.message || error || 'An unexpected error occurred during operation.';

    const styles = `
    .error-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-4);
        padding: var(--space-6);
        background: rgba(255, 42, 42, 0.05);
        border: 1px solid var(--color-error);
        border-left: 4px solid var(--color-error);
        color: var(--color-ink);
        width: 100%;
        max-width: 600px;
    }

    .error-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        color: var(--color-error);
    }

    .error-icon {
        font-family: var(--font-mono);
        font-size: var(--text-xl);
        font-weight: 700;
        animation: blink 2s infinite;
    }

    @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
    }

    .error-title {
        font-family: var(--font-mono);
        font-size: var(--text-lg);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin: 0;
    }

    .error-message {
        font-family: var(--font-mono);
        font-size: var(--text-sm);
        color: var(--color-muted);
        line-height: var(--leading-base);
        margin: 0;
        word-break: break-all;
    }
    `;

    return (
        <div className={`error-container ${className}`}>
            <style>{styles}</style>
            <div className="error-header">
                <span className="error-icon">[!]</span>
                <h3 className="error-title">{title ?? defaultTitle}</h3>
            </div>
            <p className="error-message">
                {'> ERR_DETAILS: '}{message}
            </p>
            {onRetry && (
                <div className="mt-2">
                    <Button variant="danger" onClick={onRetry} size="sm">
                        INITIALIZE RETRY_SEQUENCE
                    </Button>
                </div>
            )}
        </div>
    );
}

export default ErrorState;
