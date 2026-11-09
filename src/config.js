// Dedicated Production Domain & VPS Endpoints for ARY Services
export const DOMAIN_API_BASE = 'https://aryservices.adksoftwares.com/api';
export const VPS_IP_API_BASE = 'http://173.212.223.108:4000/api';
export const PUBLIC_CLOUD_API_BASE = DOMAIN_API_BASE;

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  if (typeof window !== 'undefined') {
    if (window.__ARY_API_BASE__) return window.__ARY_API_BASE__;
    try {
      const stored = localStorage.getItem('ary_api_base');
      if (stored && (stored.includes('aryservices.adksoftwares.com') || stored.includes('173.212.223.108'))) {
        return stored;
      }
    } catch {}

    const isCapacitor = Boolean(
      window.Capacitor ||
      window.location.protocol === 'capacitor:' ||
      ((window.location.protocol === 'https:' || window.location.protocol === 'http:') && window.location.hostname === 'localhost' && !window.location.port)
    );
    if (isCapacitor) {
      // In native mobile app, default to public HTTPS Cloud API
      return PUBLIC_CLOUD_API_BASE;
    }
  }

  return import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';
};

export const API_BASE = getApiBase();

// Self-healing transparent network failover for web & mobile:
// If primary domain encounters network drop, DNS resolution failure, or SSL handshake issues,
// transparently retry against the direct VPS IP endpoint, preventing raw "Failed to fetch" errors.
if (typeof window !== 'undefined' && !window.__ARY_FETCH_FAILOVER_INSTALLED__) {
  window.__ARY_FETCH_FAILOVER_INSTALLED__ = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const isStringInput = typeof input === 'string';
    const inputUrl = isStringInput ? input : (input && input.url ? input.url : '');

    try {
      return await originalFetch(input, init);
    } catch (err) {
      const isDomainCall = inputUrl.includes('aryservices.adksoftwares.com/api');
      const isRelativeApiCall = inputUrl.startsWith('/api/') || inputUrl === '/api';
      const isLocalHostApiCall = inputUrl.includes('localhost:4000/api');

      if ((isDomainCall || isRelativeApiCall || isLocalHostApiCall) && !inputUrl.includes('173.212.223.108:4000')) {
        let failoverUrl = inputUrl;
        if (isDomainCall) {
          failoverUrl = inputUrl.replace(/https?:\/\/aryservices\.adksoftwares\.com\/api/, VPS_IP_API_BASE);
        } else if (isRelativeApiCall) {
          failoverUrl = inputUrl.replace(/^\/api/, VPS_IP_API_BASE);
        } else if (isLocalHostApiCall) {
          failoverUrl = inputUrl.replace(/https?:\/\/localhost:4000\/api/, VPS_IP_API_BASE);
        }

        try {
          const failoverResponse = await originalFetch(failoverUrl, init);
          if (failoverResponse) {
            try {
              localStorage.setItem('ary_api_base', VPS_IP_API_BASE);
            } catch {}
            return failoverResponse;
          }
        } catch {
          // If failover also failed, fall through to user-friendly error formatting
        }
      }

      // Convert raw, cryptic JavaScript fetch errors into clear, human-understandable errors
      const errMsg = err?.message || '';
      if (/failed to fetch|network\s*error|load failed|networkrequestfailed/i.test(errMsg)) {
        const friendly = new Error('Unable to connect to ARY Services server. Please check your internet connection and try again.');
        friendly.originalError = err;
        throw friendly;
      }

      throw err;
    }
  };
}
