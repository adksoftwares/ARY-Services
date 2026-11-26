import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from './Button';

export function Skeleton({
  variant = 'text', // 'text' | 'rect' | 'circle'
  width,
  height,
  className = '',
  style = {}
}) {
  const inlineStyles = {
    width: width || (variant === 'circle' ? '40px' : '100%'),
    height: height || (variant === 'circle' ? '40px' : variant === 'rect' ? '120px' : '16px'),
    ...style
  };

  return (
    <span
      className={`ds-skeleton ds-skeleton-${variant} ${variant === 'circle' ? 'ds-skeleton-circle' : ''} ${className}`}
      style={inlineStyles}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`ds-state-box ds-empty-state ${className}`} role="status" aria-live="polite" aria-atomic="true">
      <div className="ds-state-icon" aria-hidden="true">
        <Icon size={26} />
      </div>
      <h3 className="ds-state-title">{title}</h3>
      {description && <p className="ds-state-desc">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this information. Please check your connection and try again.',
  onRetry,
  className = ''
}) {
  return (
    <div className={`ds-state-box ds-error-state ${className}`} role="alert" aria-live="assertive" aria-atomic="true">
      <div className="ds-state-icon" style={{ color: 'var(--color-danger-600)', background: 'var(--color-danger-50)' }} aria-hidden="true">
        <AlertCircle size={26} />
      </div>
      <h3 className="ds-state-title">{title}</h3>
      {description && <p className="ds-state-desc">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="md" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
