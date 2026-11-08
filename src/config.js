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
      if (stored) return stored;
    } catch {}

    const isCapacitor = Boolean(
      window.Capacitor ||
      window.location.protocol === 'capacitor:' ||
      ((window.location.protocol === 'https:' || window.location.protocol === 'http:') && window.location.hostname === 'localhost' && !window.location.port)
    );
    if (isCapacitor) {
      // In native mobile app, default to public HTTPS Cloud API so users on Dialog, Mobitel,
      // cellular data 4G/5G, or any Wi-Fi network island-wide connect seamlessly!
      return PUBLIC_CLOUD_API_BASE;
    }
  }

  return import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';
};

export const API_BASE = getApiBase();
