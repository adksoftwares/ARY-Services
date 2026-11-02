import React from 'react';
import { Globe } from 'lucide-react';
import { useT } from '../utils/i18n';

export default function LanguageSwitcher({ variant = 'segmented' }) {
  const { language, setLanguage, languages } = useT();

  if (variant === 'select') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Globe size={15} color="var(--color-neutral-500, #64748b)" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Select language"
          style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border-subtle, #cbd5e1)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '5px 8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--color-neutral-800, #1e293b)',
            cursor: 'pointer'
          }}
        >
          {languages.map(l => (
            <option key={l.code} value={l.code}>
              {l.native} ({l.code.toUpperCase()})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Segmented compact toggle (EN | සිං | தமி)
  return (
    <div
      role="group"
      aria-label="Language selection"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--color-neutral-100, #f1f5f9)',
        border: '1px solid var(--color-border-subtle, #e2e8f0)',
        borderRadius: 'var(--radius-full, 9999px)',
        padding: '2px',
        gap: '2px'
      }}
    >
      <Globe size={13} color="var(--color-neutral-400, #94a3b8)" style={{ marginLeft: 6, marginRight: 2 }} />
      {languages.map(l => {
        const isActive = language === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={isActive}
            aria-label={`Switch to ${l.label}`}
            style={{
              border: 'none',
              background: isActive ? 'var(--color-surface, #fff)' : 'transparent',
              color: isActive ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-600, #475569)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.74rem',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full, 9999px)',
              cursor: 'pointer',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
              minWidth: '32px',
              minHeight: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {l.code === 'si' ? 'සිං' : l.code === 'ta' ? 'தமி' : 'EN'}
          </button>
        );
      })}
    </div>
  );
}
