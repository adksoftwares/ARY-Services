import { API_BASE } from '../config';

export function subscribeToAppEvents(token, handlers = {}) {
  let source = null;
  let retryTimer = null;
  let stopped = false;
  let retryDelay = 1500;

  async function connect() {
    if (stopped || !token) return;
    try {
      const response = await fetch(`${API_BASE}/events-ticket`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ticket) throw new Error(data.error || 'Could not authorize live updates.');
      if (stopped) return;
      source = new EventSource(`${API_BASE}/events?ticket=${encodeURIComponent(data.ticket)}`);
      Object.entries(handlers).forEach(([name, callback]) => source.addEventListener(name, callback));
      source.onopen = () => { retryDelay = 1500; };
      source.onerror = () => {
        source?.close();
        source = null;
        if (!stopped) {
          retryTimer = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      };
    } catch {
      if (!stopped) {
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 15000);
      }
    }
  }

  connect();
  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    source?.close();
  };
}
