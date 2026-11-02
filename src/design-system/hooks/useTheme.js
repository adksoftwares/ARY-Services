import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ary_theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['light', 'dark', 'sunlight'].includes(saved)) {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const applyTheme = useCallback((newTheme) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', newTheme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (newTheme === 'dark') metaThemeColor.setAttribute('content', '#0c1411');
      else if (newTheme === 'sunlight') metaThemeColor.setAttribute('content', '#ffffff');
      else metaThemeColor.setAttribute('content', '#174d3d');
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
}
