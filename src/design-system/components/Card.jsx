import React from 'react';

export function Card({
  children,
  variant = 'default', // 'default' | 'elevated' | 'glass'
  interactive = false,
  className = '',
  onClick,
  ...props
}) {
  const classes = [
    'ds-card',
    variant === 'elevated' ? 'ds-card-elevated' : '',
    interactive ? 'ds-card-interactive' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
}

export default Card;
