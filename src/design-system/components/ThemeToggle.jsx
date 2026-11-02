import React from 'react';
import { Sun, Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle({ showSunlight = false, className = '' }) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (showSunlight) {
    return (
      <div className={`theme-toggle-segmented ${className}`} role="group" aria-label="Theme Selection">
        <button
          type="button"
          className={`theme-segment-btn ${theme === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
          title="Light Theme"
          aria-label="Light Theme"
        >
          <Sun size={15} />
        </button>
        <button
          type="button"
          className={`theme-segment-btn ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          title="Dark Theme"
          aria-label="Dark Theme"
        >
          <Moon size={15} />
        </button>
        <button
          type="button"
          className={`theme-segment-btn ${theme === 'sunlight' ? 'active' : ''}`}
          onClick={() => setTheme('sunlight')}
          title="High Contrast Sunlight Theme"
          aria-label="High Contrast Sunlight Theme"
        >
          <SunMedium size={15} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default ThemeToggle;
