import React from 'react';

export function IconButton({
  icon: Icon,
  'aria-label': ariaLabel,
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'ghost', // 'ghost' | 'secondary' | 'outline' | 'danger'
  disabled = false,
  className = '',
  onClick,
  title,
  type = 'button',
  ...props
}) {
  if (!ariaLabel && !title) {
    console.warn('IconButton requires an aria-label or title for accessibility.');
  }

  const iconSizes = { sm: 16, md: 18, lg: 22 };

  return (
    <button
      type={type}
      className={`ds-icon-btn ${size} ${variant !== 'ghost' ? `ds-btn-${variant}` : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel || title}
      title={title || ariaLabel}
      {...props}
    >
      {Icon && <Icon size={iconSizes[size] || 18} />}
    </button>
  );
}

export default IconButton;
