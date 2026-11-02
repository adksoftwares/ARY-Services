import React from 'react';

export function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  isOnline = false,
  className = '',
  ...props
}) {
  const getInitials = (str) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return str.slice(0, 2).toUpperCase();
  };

  // Deterministic pastel color from name
  const getBgColor = (str) => {
    if (!str) return '#174d3d';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hues = [160, 28, 200, 280, 40, 185];
    const hue = hues[Math.abs(hash) % hues.length];
    return `hsl(${hue}, 45%, 38%)`;
  };

  return (
    <div
      className={`ds-avatar ds-avatar-${size} ${isOnline ? 'ds-avatar-online' : ''} ${className}`}
      style={{ backgroundColor: !src ? getBgColor(name) : undefined, color: '#ffffff' }}
      aria-label={alt || name}
      role="img"
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

export default Avatar;
