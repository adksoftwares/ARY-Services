import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  fullWidth = false,
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const classes = [
    'ds-btn',
    `ds-btn-${variant}`,
    `ds-btn-${size}`,
    fullWidth ? 'ds-btn-full' : '',
    loading ? 'ds-btn-loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="ds-btn-spinner" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
          <span>{children}</span>
          {IconRight && <IconRight size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
        </>
      )}
    </button>
  );
}

export default Button;
