import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const RECONNECTED_MESSAGE_DURATION = 3500;

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    function handleOnline() {
      clearReconnectTimer();
      setIsOnline(true);
      setJustReconnected(true);
      reconnectTimerRef.current = window.setTimeout(() => {
        setJustReconnected(false);
        reconnectTimerRef.current = null;
      }, RECONNECTED_MESSAGE_DURATION);
    }

    function handleOffline() {
      clearReconnectTimer();
      setIsOnline(false);
      setJustReconnected(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearReconnectTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !justReconnected) return null;

  if (justReconnected) {
    return (
      <div className="connection-banner connection-banner--online ary-offline-banner" role="status" aria-live="polite">
        <Wifi size={16} aria-hidden="true" />
        <span>Connection restored. You can continue using ARY Services.</span>
      </div>
    );
  }

  return (
    <div className="connection-banner connection-banner--offline ary-offline-banner" role="alert" aria-live="assertive">
      <WifiOff size={16} aria-hidden="true" />
      <span>
        <strong>You're offline.</strong> Some actions may be unavailable. Check your connection and retry when you're back online.
      </span>
    </div>
  );
}
