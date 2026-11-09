import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, useNavigate } from 'react-router-dom';
import { Bike, LogIn, LogOut, ShieldCheck, UserRound, ArrowLeftRight, Sun, Wifi, WifiOff } from 'lucide-react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';
import { subscribeToAppEvents } from '../../utils/events';
import DriverWorkspace from '../../components/driver/DriverWorkspace';
import AuthModal from '../../components/common/AuthModal';
import Footer from '../../components/common/Footer';
import NotificationCenter from '../../components/common/NotificationCenter';
import OfflineBanner from '../../components/common/OfflineBanner';
import { ThemeToggle, Button, LanguageSwitcher } from '../../design-system';
import { LanguageProvider } from '../../utils/i18n';

function DriverPortal() {
  const { currentUser, openAuthModal, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isDriver = currentUser?.accountType === 'driver';

  // Online / offline network monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Capacitor hardware back-button listener
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const handleBackButton = () => {
        // If modals or keypads are open, dismiss them first
        const openBackdrop = document.querySelector('.modal-backdrop');
        if (openBackdrop) {
          const closeBtn = openBackdrop.querySelector('button[aria-label="Close"]') ||
                           openBackdrop.querySelector('button');
          if (closeBtn) {
            closeBtn.click();
            return;
          }
        }
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.Capacitor.Plugins.App.exitApp();
        }
      };
      window.Capacitor.Plugins.App.addListener('backButton', handleBackButton);
    }
  }, []);

  useEffect(() => {
    if (!isDriver) return undefined;
    const notify = () => setNotice('Your driver dispatch activity has changed. Refreshing jobs...');
    return subscribeToAppEvents(currentUser?.token, {
      'driver:job_created': notify,
      'driver:job_updated': notify,
      'driver:application_reviewed': notify
    });
  }, [isDriver, currentUser?.token]);

  return (
    <div className="driver-app-shell">
      <OfflineBanner />
      <header className="topbar">
        <Link to="/" className="brand" aria-label="ARY Services Driver home">
          <span className="brand-mark">A</span><span>ARY <b>Driver</b></span>
        </Link>
        <nav className="header-nav-links">
          <span className="nav-link-btn active"><Bike size={14}/> Driver Workspace</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LanguageSwitcher />
          <ThemeToggle />
          {isDriver ? (
            <div className="user-profile">
              <NotificationCenter/>
              <span className="user-badge" title="Verified Driver">
                <UserRound size={14}/>
                <span>{currentUser.fullName}</span>
              </span>
              {(currentUser.roles || []).includes('customer') && (
                <button
                  type="button"
                  className="sign-in"
                  onClick={async () => {
                    try {
                      await switchRole('customer');
                      window.location.href = '/';
                    } catch (error) {
                      setNotice(getFriendlyErrorMessage(error));
                    }
                  }}
                  title="Switch to Customer Mode"
                >
                  <ArrowLeftRight size={13} style={{ marginRight: 4 }} /> Customer app
                </button>
              )}
              <button
                type="button"
                className="sign-out-btn"
                onClick={() => { logout(); navigate('/'); }}
                aria-label="Sign out"
              >
                <LogOut size={14}/> Sign out
              </button>
            </div>
          ) : (
            <button className="sign-in" onClick={() => openAuthModal('login')}><LogIn size={14}/> Driver sign in</button>
          )}
        </div>
      </header>

      {isDriver ? (
        <DriverWorkspace onNotice={setNotice}/>
      ) : (
        <main style={{ maxWidth: 840, margin: '56px auto', padding: '0 20px', minHeight: '52vh' }}>
          <section style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border-subtle, #e5ebe2)',
            borderRadius: 'var(--radius-xl, 20px)',
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md, 0 12px 36px rgba(20,45,32,.06))'
          }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: 'var(--radius-lg, 16px)',
              background: 'var(--surface-secondary, #161920)',
              color: 'var(--brand-primary, #22c55e)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 18px',
              border: '1px solid var(--border-default, #222631)'
            }}>
              <ShieldCheck size={30}/>
            </div>
            <p className="eyebrow" style={{ color: 'var(--brand-primary, #22c55e)', fontWeight: 700, letterSpacing: '0.05em' }}>
              ARY DRIVER NETWORK
            </p>
            <h1 style={{ color: 'var(--text-primary, #f8fafc)', margin: '8px 0 12px', fontSize: '1.9rem' }}>
              Every journey, connected.
            </h1>
            <p style={{ color: 'var(--text-secondary, #94a3b8)', maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.7, fontSize: '0.95rem' }}>
              Sign in with your Driver account to receive nearby ride and delivery requests, enter secure handoff PINs, and track your daily earnings across Sri Lanka.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => openAuthModal('login')}
            >
              <LogIn size={16}/> Sign in to Driver Workspace
            </Button>
          </section>
        </main>
      )}

      <AuthModal onNotice={setNotice}/>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>
        </div>
      )}
      <Footer/>
    </div>
  );
}

export default function DriverApp() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <DriverPortal/>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
