import React from 'react';

// Industrial Utilitarian Input Component
const styles = `
  .field { display: flex; flex-direction: column; gap: var(--space-2); width: 100%; }

  .field-label {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--color-ink);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .field-label.required::after {
    content: ' *';
    color: var(--color-accent);
  }

  .field-input {
    width: 100%;
    padding: 0.75rem var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--text-base);
    color: var(--color-ink);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0;
    outline: none;
    transition: all var(--ease-out);
    appearance: none;
    -webkit-appearance: none;
  }
  
  .field-input::placeholder { 
    color: var(--color-muted); 
    font-size: var(--text-sm);
    letter-spacing: 0;
  }
  
  .field-input:hover:not(:disabled) { 
    border-color: var(--color-muted); 
  }
  
  .field-input:focus { 
    border-color: var(--color-border-focus); 
    background: var(--color-paper);
    box-shadow: 2px 2px 0px rgba(240, 236, 230, 0.1);
  }
  
  .field-input.error { 
    border-color: var(--color-error); 
    color: var(--color-error);
  }
  .field-input.error:focus {
    box-shadow: 2px 2px 0px rgba(255, 42, 42, 0.2);
  }
  
  .field-input:disabled { 
    background: var(--color-subtle); 
    color: var(--color-muted); 
    cursor: not-allowed; 
    border-style: dashed;
  }

  textarea.field-input { 
    resize: vertical; 
    min-height: 120px; 
    line-height: var(--leading-base); 
  }

  .field-hint { 
    font-size: var(--text-xs); 
    color: var(--color-muted); 
    font-family: var(--font-mono); 
  }
  
  .field-error { 
    font-size: var(--text-xs); 
    color: var(--color-error); 
    font-family: var(--font-mono); 
    font-weight: 700;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .field-error::before {
    content: '>>';
    letter-spacing: -2px;
  }

  .input-wrap { position: relative; }
  .input-icon-left { position: absolute; left: var(--space-3); top: 50%; transform: translateY(-50%); color: var(--color-muted); pointer-events: none; }
  .input-icon-right { position: absolute; right: var(--space-3); top: 50%; transform: translateY(-50%); color: var(--color-muted); }
  .has-icon-left .field-input { padding-left: 2.5rem; }
  .has-icon-right .field-input { padding-right: 2.5rem; }
`;

export function Input({
    label,
    hint,
    error,
    required,
    icon: Icon,
    iconRight,
    type = 'text',
    id,
    className,
    ...props
}) {
    const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : Math.random().toString());

    return (
        <>
            <style>{styles}</style>
            <div className={`field ${className || ''}`}>
                {label && (
                    <label htmlFor={fieldId} className={`field-label${required ? ' required' : ''}`}>
                        {label}
                    </label>
                )}
                <div className={`input-wrap${Icon ? ' has-icon-left' : ''}${iconRight ? ' has-icon-right' : ''}`}>
                    {Icon && <span className="input-icon-left"><Icon size={18} /></span>}
                    <input
                        id={fieldId}
                        type={type}
                        className={`field-input${error ? ' error' : ''}`}
                        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
                        aria-invalid={!!error}
                        required={required}
                        {...props}
                    />
                    {iconRight && <span className="input-icon-right">{iconRight}</span>}
                </div>
                {hint && !error && <span id={`${fieldId}-hint`} className="field-hint">{hint}</span>}
                {error && <span id={`${fieldId}-error`} className="field-error" role="alert">{error}</span>}
            </div>
        </>
    );
}

export default Input;
