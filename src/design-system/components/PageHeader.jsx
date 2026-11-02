import React from 'react';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  badge,
  breadcrumb,
  actions,
  onBack,
  className = '',
  style = {}
}) {
  return (
    <header className={`ds-page-header ${className}`} style={{
      marginBottom: 'var(--space-6, 24px)',
      ...style
    }}>
      {/* Optional Breadcrumb */}
      {breadcrumb && (
        <nav aria-label="Breadcrumb" style={{
          marginBottom: 'var(--space-2, 8px)',
          fontSize: 'var(--text-xs, 0.75rem)',
          color: 'var(--text-muted, #74857b)'
        }}>
          {breadcrumb}
        </nav>
      )}

      {/* Main Row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-4, 16px)'
      }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          {/* Eyebrow / Tagline */}
          {eyebrow && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2, 8px)',
              fontSize: 'var(--text-2xs, 0.6875rem)',
              fontWeight: 'var(--font-bold, 700)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-brand-700, #174d3d)',
              marginBottom: 'var(--space-1-5, 6px)'
            }}>
              <span>{eyebrow}</span>
            </div>
          )}

          {/* Heading + Badge + Back Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3, 12px)', flexWrap: 'wrap' }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go back"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md, 10px)',
                  border: '1px solid var(--border-default, #dfdcd2)',
                  background: 'var(--surface-primary, #fff)',
                  color: 'var(--text-primary, #182922)',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <h1 style={{
              margin: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 'var(--font-bold, 700)',
              color: 'var(--text-primary, #182922)',
              letterSpacing: '-0.02em',
              lineHeight: 'var(--leading-tight, 1.15)'
            }}>
              {title}
            </h1>

            {badge && <div>{badge}</div>}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p style={{
              margin: 'var(--space-2, 8px) 0 0',
              fontSize: 'var(--text-sm, 0.8125rem)',
              color: 'var(--text-secondary, #4a5c53)',
              lineHeight: 'var(--leading-normal, 1.5)',
              maxWidth: '680px'
            }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        {actions && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2-5, 10px)',
            flexWrap: 'wrap'
          }}>
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
