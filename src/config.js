// Central API endpoint configuration. Production API traffic must use HTTPS.
export const DOMAIN_API_BASE = 'https://aryservices.adksoftwares.com/api';
export const PUBLIC_CLOUD_API_BASE = DOMAIN_API_BASE;

const normalizeApiBase = (value) => {
  const candidate = String(value || '').trim().replace(/\/$/, '');
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    const isLocal = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (import.meta.env.PROD && parsed.protocol !== 'https:') return '';
    if (!['https:', 'http:'].includes(parsed.protocol) || (parsed.protocol === 'http:' && !isLocal)) return '';
    return candidate;
  } catch {
    return '';
  }
};

const getApiBase = () => {
  const configured = normalizeApiBase(import.meta.env.VITE_API_BASE);
  if (configured) return configured;

  if (typeof window !== 'undefined') {
    const injected = normalizeApiBase(window.__ARY_API_BASE__);
    if (injected) return injected;

    const isCapacitor = Boolean(
      window.Capacitor ||
      window.location.protocol === 'capacitor:' ||
      ((window.location.protocol === 'https:' || window.location.protocol === 'http:') && window.location.hostname === 'localhost' && !window.location.port)
    );
    if (isCapacitor) return PUBLIC_CLOUD_API_BASE;
  }

  return import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';
};

export const API_BASE = getApiBase();

// Optional, explicitly configured backup endpoint. Never use raw-IP HTTP failover.
const API_FALLBACK_BASE = normalizeApiBase(import.meta.env.VITE_API_FALLBACK_BASE);
if (typeof window !== 'undefined' && API_FALLBACK_BASE && !window.__ARY_FETCH_FAILOVER_INSTALLED__) {
  window.__ARY_FETCH_FAILOVER_INSTALLED__ = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const inputUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    try {
      return await originalFetch(input, init);
    } catch (err) {
      const primaryBase = DOMAIN_API_BASE;
      const primaryUrl = new URL(primaryBase);
      let parsedInputUrl = null;
      try {
        parsedInputUrl = new URL(inputUrl, window.location.origin);
      } catch {
        parsedInputUrl = null;
      }
      const isPrimaryApiCall = Boolean(parsedInputUrl &&
        parsedInputUrl.origin === primaryUrl.origin &&
        (parsedInputUrl.pathname === primaryUrl.pathname || parsedInputUrl.pathname.startsWith(primaryUrl.pathname + '/')));
      const isRelativeApiCall = inputUrl.startsWith('/api/') || inputUrl === '/api';
      const isLocalApiCall = import.meta.env.DEV && /^http:\/\/localhost:4000\/api(?:\/|$)/.test(inputUrl);
      const shouldFailover = API_FALLBACK_BASE &&
        (isPrimaryApiCall || isRelativeApiCall || isLocalApiCall) &&
        !inputUrl.startsWith(API_FALLBACK_BASE);
      if (shouldFailover) {
        let fallbackUrl = inputUrl;
        if (isPrimaryApiCall && parsedInputUrl) {
          const suffix = parsedInputUrl.pathname.slice(primaryUrl.pathname.length);
          fallbackUrl = API_FALLBACK_BASE + suffix + parsedInputUrl.search;
        } else if (isRelativeApiCall) fallbackUrl = inputUrl.replace(/^\/api(?=\/|$)/, API_FALLBACK_BASE);
        else if (isLocalApiCall) fallbackUrl = inputUrl.replace(/^http:\/\/localhost:4000\/api(?=\/|$)/, API_FALLBACK_BASE);
        try {
          return await originalFetch(fallbackUrl, init);
        } catch {
          // The fallback failure is intentionally not persisted as the primary API.
        }
      }
      const errMsg = err?.message || '';
      if (/failed to fetch|network\\s*error|load failed|networkrequestfailed/i.test(errMsg)) {
        const friendly = new Error('Unable to connect to ARY Services server. Please check your internet connection and try again.');
        friendly.originalError = err;
        throw friendly;
      }
      throw err;
    };
  };
}
