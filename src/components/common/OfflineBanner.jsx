import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOnline(false);
      setJustReconnected(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !justReconnected) {
    return null;
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          background: 'var(--color-success-600, #059669)',
          color: '#ffffff',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '0.84rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          zIndex: 9999,
          position: 'sticky',
          top: 0,
          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
          animation: 'fade-in 0.2s ease-out'
        }}
      >
        <Wifi size={16} />
        <span>Connection restored! All services are active.</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: 'var(--color-warning-500, #f59e0b)',
        color: '#78350f',
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '0.84rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        zIndex: 9999,
        position: 'sticky',
        top: 0,
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
        animation: 'fade-in 0.2s ease-out'
      }}
    >
      <WifiOff size={16} />
      <span>
        <b>Offline Resilience Mode:</b> Intermittent or no connection. Actions will automatically synchronize once reconnected.
      </span>
    </div>
  );
}
