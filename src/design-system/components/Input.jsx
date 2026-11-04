import React, { useState, useId } from 'react';
import { Eye, EyeOff, AlertCircle, Phone } from 'lucide-react';

export function Input({
  label,
  helperText,
  error,
  required = false,
  icon: Icon = null,
  trailingAction = null,
  id: customId,
  className = '',
  type = 'text',
  disabled = false,
  ...props
}) {
  const autoId = useId();
  const id = customId || autoId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const displayLabel = typeof label === 'string' ? label.replace(/\s*\*+$/, '') : label;

  return (
    <div className={`ds-form-field ${className}`}>
      {label && (
        <label htmlFor={id} className="ds-label">
          <span>
            {displayLabel}
            {required && <span className="ds-label-required" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="ds-input-container">
        {Icon && (
          <span className="ds-input-leading-icon" aria-hidden="true">
            <Icon size={18} />
          </span>
        )}

        <input
          id={id}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={[
            'ds-input',
            Icon ? 'ds-input-with-leading' : '',
            trailingAction ? 'ds-input-with-trailing' : '',
            error ? 'ds-input-error' : ''
          ].filter(Boolean).join(' ')}
          {...props}
        />

        {trailingAction && (
          <span className="ds-input-trailing-action">{trailingAction}</span>
        )}
      </div>

      {error ? (
        <span id={errorId} className="ds-error-text" role="alert">
          <AlertCircle size={14} /> {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="ds-helper-text">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export function PasswordInput({ label = 'Password', ...props }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      label={label}
      type={showPassword ? 'text' : 'password'}
      trailingAction={
        <button
          type="button"
          onClick={() => setShowPassword(p => !p)}
          className="ds-icon-btn sm"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      {...props}
    />
  );
}

export function PhoneInput({ label = 'Mobile Phone Number', ...props }) {
  return (
    <Input
      label={label}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder="e.g. 077 123 4567"
      icon={Phone}
      {...props}
    />
  );
}

export function Textarea({
  label,
  helperText,
  error,
  required = false,
  id: customId,
  className = '',
  rows = 3,
  disabled = false,
  ...props
}) {
  const autoId = useId();
  const id = customId || autoId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const displayLabel = typeof label === 'string' ? label.replace(/\s*\*+$/, '') : label;

  return (
    <div className={`ds-form-field ${className}`}>
      {label && (
        <label htmlFor={id} className="ds-label">
          <span>
            {displayLabel}
            {required && <span className="ds-label-required" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`ds-textarea ${error ? 'ds-input-error' : ''}`}
        {...props}
      />

      {error ? (
        <span id={errorId} className="ds-error-text" role="alert">
          <AlertCircle size={14} /> {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="ds-helper-text">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export function Select({
  label,
  options = [],
  helperText,
  error,
  required = false,
  id: customId,
  className = '',
  disabled = false,
  ...props
}) {
  const autoId = useId();
  const id = customId || autoId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const displayLabel = typeof label === 'string' ? label.replace(/\s*\*+$/, '') : label;

  return (
    <div className={`ds-form-field ${className}`}>
      {label && (
        <label htmlFor={id} className="ds-label">
          <span>
            {displayLabel}
            {required && <span className="ds-label-required" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <select
        id={id}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`ds-select ${error ? 'ds-input-error' : ''}`}
        {...props}
      >
        {options.map((opt, i) => (
          <option key={opt.value ?? i} value={opt.value}>
            {opt.label || opt.name || opt.value}
          </option>
        ))}
      </select>

      {error ? (
        <span id={errorId} className="ds-error-text" role="alert">
          <AlertCircle size={14} /> {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="ds-helper-text">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export default Input;
