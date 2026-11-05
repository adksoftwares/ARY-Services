import React from 'react';
import { Star, Check } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export function Stepper({
  steps = [], // array of string labels or { label, description }
  currentStep = 0, // 0-indexed
  className = ''
}) {
  return (
    <div className={`ds-stepper ${className}`} aria-label="Progress">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const label = typeof step === 'string' ? step : step.label;

        return (
          <div
            key={index}
            className={`ds-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
          >
            <div className="ds-step-dot" aria-hidden="true">
              {isCompleted ? <Check size={14} /> : index + 1}
            </div>
            <span className="ds-step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RatingStars({
  rating = 0,
  max = 5,
  interactive = false,
  onChange,
  size = 18,
  className = ''
}) {
  const isInteractive = interactive || Boolean(onChange);
  const numericSize = typeof size === 'number'
    ? size
    : size === 'lg' ? 28
    : size === 'md' ? 22
    : size === 'sm' ? 16
    : 18;

  return (
    <div
      className={`ds-rating-stars ${className}`}
      role={isInteractive ? 'radiogroup' : 'img'}
      aria-label={`Rating: ${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }).map((_, i) => {
        const starIndex = i + 1;
        const isFilled = starIndex <= Math.round(rating);

        if (isInteractive) {
          return (
            <button
              key={i}
              type="button"
              className="ds-star-interactive"
              onClick={() => onChange && onChange(starIndex)}
              role="radio"
              aria-checked={starIndex === rating}
              aria-label={`Rate ${starIndex} of ${max} stars`}
            >
              <Star
                size={numericSize}
                fill={isFilled ? 'currentColor' : 'none'}
              />
            </button>
          );
        }

        return (
          <Star
            key={i}
            size={numericSize}
            fill={isFilled ? 'currentColor' : 'none'}
          />
        );
      })}
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  variant = 'primary',
  loading = false
}) {
  const handleDismiss = onClose || onCancel || (() => {});
  const danger = isDanger || variant === 'danger';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title={title}
      maxWidth="440px"
      footer={
        <>
          <Button variant="ghost" onClick={handleDismiss} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
        {message}
      </p>
    </Modal>
  );
}
