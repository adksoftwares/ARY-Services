import React from 'react';

export function Badge({
  children,
  variant = 'brand', // 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  dot = true,
  className = '',
  ...props
}) {
  return (
    <span className={`ds-badge ds-badge-${variant} ${className}`} {...props}>
      {dot && <span className="ds-badge-dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

export function StatusPill({ status = 'pending', label, className = '' }) {
  const statusMap = {
    requested: { variant: 'warning', text: 'Requested' },
    pending: { variant: 'warning', text: 'Pending' },
    accepted: { variant: 'info', text: 'Accepted' },
    in_progress: { variant: 'brand', text: 'In Progress' },
    completed: { variant: 'success', text: 'Completed' },
    cancelled: { variant: 'neutral', text: 'Cancelled' },
    rejected: { variant: 'danger', text: 'Rejected' },
    disputed: { variant: 'danger', text: 'Disputed' },
    active: { variant: 'success', text: 'Active' },
    suspended: { variant: 'danger', text: 'Suspended' }
  };

  const conf = statusMap[status] || { variant: 'neutral', text: status };

  return (
    <Badge variant={conf.variant} className={className}>
      {label || conf.text}
    </Badge>
  );
}

export default Badge;
