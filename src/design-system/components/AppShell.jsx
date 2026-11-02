import React from 'react';

export function AppShell({
  header,
  sidebar,
  bottomNav,
  banner,
  children,
  maxWidth = '1440px',
  className = '',
  style = {}
}) {
  return (
    <div
      className={`ds-app-shell ${className}`}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-canvas, #fbfaf7)',
        color: 'var(--text-primary, #182922)',
        fontFamily: 'var(--font-body)',
        ...style
      }}
    >
      {/* Skip Navigation Link for Accessibility */}
      <a
        href="#main-content"
        className="ds-skip-link"
        style={{
          position: 'absolute',
          top: '-40px',
          left: '16px',
          background: 'var(--brand-primary, #174d3d)',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: 'var(--radius-sm, 6px)',
          fontWeight: 700,
          zIndex: 9999,
          transition: 'top 0.15s ease'
        }}
      >
        Skip to main content
      </a>

      {/* Optional Connectivity / Notice Banner */}
      {banner && <div className="ds-app-banner">{banner}</div>}

      {/* Sticky Topbar / Header */}
      {header && <div className="ds-app-header-container">{header}</div>}

      {/* Main Layout Area: Sidebar (desktop) + Content Canvas */}
      <div
        className="ds-app-body"
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          maxWidth,
          margin: '0 auto',
          position: 'relative'
        }}
      >
        {sidebar && (
          <aside
            className="ds-app-sidebar"
            aria-label="Sidebar Navigation"
            style={{
              flexShrink: 0
            }}
          >
            {sidebar}
          </aside>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="ds-app-main"
          style={{
            flex: 1,
            minWidth: 0,
            padding: 'var(--space-4, 16px) var(--space-4, 16px) calc(var(--space-16, 64px) + var(--sab, 0px))',
            outline: 'none'
          }}
        >
          {children}
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation */}
      {bottomNav && (
        <nav
          className="ds-app-bottom-nav"
          aria-label="Mobile Navigation"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 'var(--z-bottom-nav, 300)',
            background: 'var(--surface-primary, #ffffff)',
            borderTop: '1px solid var(--border-subtle, #eeece4)',
            paddingBottom: 'var(--sab, 0px)'
          }}
        >
          {bottomNav}
        </nav>
      )}
    </div>
  );
}
