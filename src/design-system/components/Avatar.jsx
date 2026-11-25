import React, { useState } from 'react';

export function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  isOnline = false,
  className = '',
  ...props
}) {
  const [failedSrc, setFailedSrc] = useState(null);

  const getInitials = (value) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) return '?';
    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return normalized.slice(0, 2).toUpperCase();
  };

  const getBgColor = (value) => {
    if (!value) return '#174d3d';
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = value.charCodeAt(index) + ((hash << 5) - hash);
    }
    const hues = [160, 28, 200, 280, 40, 185];
    const hue = hues[Math.abs(hash) % hues.length];
    return `hsl(${hue}, 45%, 38%)`;
  };

  const showImage = Boolean(src) && failedSrc !== src;
  const accessibleName = alt || name || 'User avatar';

  return (
    <div
      className={`ds-avatar ds-avatar-${size} ${isOnline ? 'ds-avatar-online' : ''} ${className}`}
      style={{ backgroundColor: showImage ? undefined : getBgColor(name), color: '#ffffff' }}
      aria-label={accessibleName}
      role="img"
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </div>
  );
}

export default Avatar;
