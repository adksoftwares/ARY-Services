import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export function FormField({
  label,
  hint,
  helperText,
  error,
  required = false,
  id: customId,
  children,
  className = '',
  style = {}
}) {
  const autoId = useId();
  const id = customId || autoId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const effectiveHint = hint || helperText;

  return (
    <div className={`ds-form-field ${className}`} style={{ marginBottom: 'var(--space-4, 16px)', ...style }}>
      {label && (
        <label htmlFor={id} className="ds-label" style={{
          display: 'block',
          fontSize: 'var(--text-xs, 0.75rem)',
          fontWeight: 'var(--font-semibold, 600)',
          color: 'var(--text-secondary, #4a5c53)',
          marginBottom: 'var(--space-1-5, 6px)',
          letterSpacing: '0.01em'
        }}>
          {label}
          {required && (
            <span style={{ color: 'var(--color-danger-600, #dc2626)', marginLeft: '4px' }} aria-hidden="true">*</span>
          )}
        </label>
      )}

      {/* Render child with accessibility attributes */}
      <div className="ds-form-field-control">
        {React.isValidElement(children)
          ? React.cloneElement(children, {
              id: children.props.id || id,
              'aria-invalid': Boolean(error),
              'aria-describedby': error ? errorId : effectiveHint ? hintId : undefined
            })
          : children}
      </div>

      {error ? (
        <span
          id={errorId}
          className="ds-error-text"
          role="alert"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--color-danger-600, #dc2626)',
            fontSize: 'var(--text-xs, 0.75rem)',
            marginTop: 'var(--space-1, 4px)',
            fontWeight: 'var(--font-medium, 500)'
          }}
        >
          <AlertCircle size={13} /> {error}
        </span>
      ) : effectiveHint ? (
        <span
          id={hintId}
          className="ds-helper-text"
          style={{
            display: 'block',
            color: 'var(--text-muted, #74857b)',
            fontSize: 'var(--text-xs, 0.75rem)',
            marginTop: 'var(--space-1, 4px)',
            lineHeight: 1.4
          }}
        >
          {effectiveHint}
        </span>
      ) : null}
    </div>
  );
}
