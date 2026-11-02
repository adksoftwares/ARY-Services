import React from 'react';

const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40
};

export function Icon({
  icon: Component,
  size = 'md',
  color = 'currentColor',
  strokeWidth = 1.75,
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  style = {},
  ...props
}) {
  if (!Component) return null;

  const numericSize = typeof size === 'number' ? size : (SIZE_MAP[size] || 20);
  const isDecorative = ariaHidden !== undefined ? ariaHidden : !ariaLabel;

  return (
    <Component
      size={numericSize}
      color={color}
      strokeWidth={strokeWidth}
      className={`ds-icon ${className}`}
      aria-hidden={isDecorative ? 'true' : undefined}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
      {...props}
    />
  );
}
