const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  if (typeof window !== 'undefined') {
    if (window.__ARY_API_BASE__) return window.__ARY_API_BASE__;
    try {
      const stored = localStorage.getItem('ary_api_base');
      if (stored) return stored;
    } catch {}

    const isCapacitor = Boolean(
      window.Capacitor ||
      window.location.protocol === 'capacitor:' ||
      ((window.location.protocol === 'https:' || window.location.protocol === 'http:') && window.location.hostname === 'localhost' && !window.location.port)
    );
    if (isCapacitor) {
      return 'http://localhost:4000/api';
    }
  }

  return import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';
};

export const API_BASE = getApiBase();
