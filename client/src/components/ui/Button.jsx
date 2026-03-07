import React from 'react';

// Industrial Utilitarian Button Component
const styles = `
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.75rem var(--space-4);
    border: 1px solid var(--color-border);
    cursor: pointer;
    text-decoration: none;
    transition: all var(--ease-out);
    white-space: nowrap;
    user-select: none;
    position: relative;
    overflow: hidden;
  }
  
  .btn:disabled { 
    opacity: 0.5; 
    cursor: not-allowed; 
    pointer-events: none; 
    filter: grayscale(1);
  }

  /* Primary Action */
  .btn-primary {
    background: var(--color-accent);
    color: var(--color-paper);
    border-color: var(--color-accent);
  }
  .btn-primary:hover { 
    background: var(--color-accent-hover); 
    border-color: var(--color-accent-hover);
    box-shadow: 4px 4px 0px rgba(255, 69, 0, 0.2);
    transform: translate(-2px, -2px);
  }
  .btn-primary:active { 
    transform: translate(0, 0);
    box-shadow: none;
  }

  /* Secondary Action */
  .btn-secondary {
    background: transparent;
    color: var(--color-ink);
    border-color: var(--color-border);
  }
  .btn-secondary:hover { 
    background: var(--color-ink); 
    color: var(--color-paper);
    border-color: var(--color-ink); 
  }

  /* Ghost/Subtle Action */
  .btn-ghost {
    background: transparent;
    color: var(--color-muted);
    border-color: transparent;
  }
  .btn-ghost:hover { 
    color: var(--color-ink); 
    background: var(--color-subtle); 
  }

  /* Danger/Error Action */
  .btn-danger {
    background: transparent;
    color: var(--color-error);
    border-color: var(--color-error);
  }
  .btn-danger:hover {
    background: var(--color-error);
    color: var(--color-paper);
  }

  /* Sizes */
  .btn-sm { font-size: var(--text-xs); padding: 0.5rem var(--space-3); }
  .btn-lg { font-size: var(--text-base); padding: 1rem var(--space-6); }
  .btn-full { width: 100%; }

  /* Loading state spinner */
  .btn-spinner {
    width: 1em; 
    height: 1em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: btn-spin 0.6s linear infinite;
  }
  @keyframes btn-spin { to { transform: rotate(360deg); } }
`;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  as: Tag = 'button',
}) {
  return (
    <>
      <style>{styles}</style>
      <Tag
        type={Tag === 'button' ? type : undefined}
        className={[
          'btn',
          `btn-${variant}`,
          size !== 'md' && `btn-${size}`,
          className,
          className.includes('w-full') && 'btn-full'
        ].filter(Boolean).join(' ')}
        disabled={disabled || isLoading}
        onClick={onClick}
      >
        {isLoading && <span className="btn-spinner" />}
        {isLoading ? 'WORKING...' : children}
      </Tag>
    </>
  );
}

export default Button;
