import React from 'react';
import Button from './Button';

// Industrial Utilitarian Empty State
export function EmptyState({
    icon = '[-]',
    title = 'NO_DATA_FOUND',
    description = 'The requested query returned zero localized results.',
    action,
    className = ''
}) {
    const styles = `
    .empty-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-4);
        padding: var(--space-12) var(--space-6);
        background: var(--color-surface);
        border: 1px dashed var(--color-border);
        color: var(--color-ink);
        text-align: center;
        width: 100%;
    }

    .empty-icon {
        font-family: var(--font-mono);
        font-size: var(--text-3xl);
        color: var(--color-subtle);
        font-weight: 700;
        margin-bottom: var(--space-2);
    }

    .empty-title {
        font-family: var(--font-mono);
        font-size: var(--text-lg);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-ink);
        margin: 0;
    }

    .empty-message {
        font-family: var(--font-mono);
        font-size: var(--text-sm);
        color: var(--color-muted);
        max-width: 400px;
        line-height: var(--leading-base);
        margin: 0;
    }
    `;

    return (
        <div className={`empty-container ${className}`}>
            <style>{styles}</style>

            {typeof icon === 'string' ? (
                <span className="empty-icon">{icon}</span>
            ) : (
                <div className="text-subtle mb-2">
                    {icon}
                </div>
            )}

            <h3 className="empty-title">{title}</h3>

            {description && (
                <p className="empty-message">
                    {`// ${description}`}
                </p>
            )}

            {action && (
                <div className="mt-4">
                    <Button variant="primary" onClick={action.onClick}>
                        {action.label}
                    </Button>
                </div>
            )}
        </div>
    );
}

export default EmptyState;
