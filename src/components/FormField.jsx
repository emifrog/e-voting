/**
 * FormField Component
 *
 * Accessible form input component with real-time validation
 * WCAG 2.1 AA compliant
 *
 * Features:
 * - Real-time validation feedback
 * - Visual indicators (✓/✗)
 * - ARIA labels and descriptions
 * - Keyboard navigation support
 * - Error messages with role="alert"
 * - Helper text support
 * - Multiple input types
 */

import { useState, useEffect } from 'react';
import './FormField.css';

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  hint,
  required,
  disabled,
  autoComplete,
  validator,
  onValidChange,
  className,
  maxLength,
  pattern,
  ...props
}) {
  const [isValid, setIsValid] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  // Update valid state when validator result changes
  useEffect(() => {
    if (touched && !error) {
      setIsValid(true);
      onValidChange?.(true);
    } else {
      setIsValid(false);
      onValidChange?.(false);
    }
  }, [error, touched, onValidChange]);

  // Show validation status after 500ms (after validation completes)
  useEffect(() => {
    if (touched) {
      const timer = setTimeout(() => setShowStatus(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowStatus(false);
    }
  }, [touched]);

  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  const descriptionIds = [errorId, hintId].filter(Boolean).join(' ');

  return (
    <div className={`form-field ${className || ''}`}>
      <div className="form-field__label-wrapper">
        <label htmlFor={name} className="form-field__label">
          {label}
          {required && <span className="form-field__required" aria-label="required">*</span>}
        </label>

        {showStatus && touched && (
          <span
            className={`form-field__status ${isValid ? 'valid' : 'invalid'}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {isValid ? '✓' : '✗'}
          </span>
        )}
      </div>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        pattern={pattern}
        aria-invalid={touched && error ? 'true' : 'false'}
        aria-describedby={descriptionIds || undefined}
        aria-required={required}
        className={`
          form-field__input
          ${touched && isValid ? 'form-field__input--valid' : ''}
          ${touched && error ? 'form-field__input--error' : ''}
          ${disabled ? 'form-field__input--disabled' : ''}
        `}
        {...props}
      />

      {hint && !error && (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      )}

      {error && touched && (
        <div
          id={errorId}
          className="form-field__error"
          role="alert"
        >
          <span className="form-field__error-icon" aria-hidden="true">⚠</span>
          {error}
        </div>
      )}
    </div>
  );
}

FormField.displayName = 'FormField';
