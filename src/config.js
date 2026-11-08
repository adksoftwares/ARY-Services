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

// Automatic network failover for mobile/Capacitor:
// If localhost:4000 is unreachable (e.g. phone running over Wi-Fi without USB reverse),
// transparently retry via local PC IP (192.168.8.120) and cache the working endpoint.
if (typeof window !== 'undefined' && !window.__ARY_FETCH_PATCHED__) {
  window.__ARY_FETCH_PATCHED__ = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    try {
      return await originalFetch(input, init);
    } catch (err) {
      if (typeof input === 'string' && input.includes('localhost:4000/api')) {
        const lanUrl = input.replace('localhost:4000/api', '192.168.8.120:4000/api');
        try {
          const res = await originalFetch(lanUrl, init);
          if (res) {
            try {
              localStorage.setItem('ary_api_base', 'http://192.168.8.120:4000/api');
            } catch {}
            return res;
          }
        } catch {}
      }
      throw err;
    }
  };
}

export const API_BASE = getApiBase();
