import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, LogIn, LogOut, RefreshCw, ShieldCheck, UserRound, ArrowLeftRight, Wifi, WifiOff } from 'lucide-react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';
import ProviderDashboard from '../../components/provider/ProviderDashboard';
import AuthModal from '../../components/common/AuthModal';
import Footer from '../../components/common/Footer';
import NotificationCenter from '../../components/common/NotificationCenter';
import OfflineBanner from '../../components/common/OfflineBanner';
import { ThemeToggle, Button, LanguageSwitcher } from '../../design-system';
import { LanguageProvider } from '../../utils/i18n';

function ProviderWorkspace() {
  const { currentUser, openAuthModal, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Network online/offline monitor
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

  // Hardware Back Button for Capacitor on Android
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const handleBackButton = () => {
        // If modals are open, the back button dismisses them
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

  const fetchBookings = useCallback(async () => {
    if (!currentUser?.token || currentUser.accountType !== 'provider') {
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load provider bookings.');
      setBookings(data.bookings || []);
    } catch (error) {
      setNotice(error.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    if (!currentUser || currentUser.accountType !== 'provider') return undefined;
    const refresh = () => fetchBookings();
    return subscribeToAppEvents(currentUser?.token, {
      'booking:created': refresh,
      'booking:status_updated': refresh,
      'booking:quote_sent': refresh,
      'booking:quote_decided': refresh,
      'booking:reschedule_requested': refresh,
      'booking:reschedule_decided': refresh,
      'grocery:order_created': refresh,
      'grocery:order_updated': refresh,
      'driver:job_updated': refresh
    });
  }, [currentUser, fetchBookings]);

  async function updateBookingStatus(bookingId, status) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update booking status.');
      setNotice(`Booking status updated to ${status.replaceAll('_', ' ')}.`);
      await fetchBookings();
    } catch (error) {
      setNotice(error.message || 'Could not update booking status.');
    }
  }

  async function decideReschedule(bookingId, decision) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId)}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ decision })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update reschedule request.');
      setNotice(data.message || 'Reschedule request updated.');
      await fetchBookings();
    } catch (error) { setNotice(error.message || 'Could not update reschedule request.'); }
  }

  const isProvider = currentUser?.accountType === 'provider';

  return (
    <div className="provider-app-shell">
      <OfflineBanner />
      <header className="topbar">
        <Link to="/" className="brand" aria-label="ARY Services Provider home">
          <span className="brand-mark">A</span><span>ARY <b>Provider</b></span>
        </Link>
        <nav className="header-nav-links">
          <span className="nav-link-btn active"><BriefcaseBusiness size={14}/> Partner Workspace</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LanguageSwitcher />
          <ThemeToggle />
          {isProvider ? (
            <div className="user-profile">
              <NotificationCenter/>
              <span className="user-badge" title="Verified Trade Partner">
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
                      setNotice(error.message);
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
            <button className="sign-in" onClick={() => openAuthModal('login')}><LogIn size={14}/> Provider sign in</button>
          )}
        </div>
      </header>

      {isProvider ? (
        <ProviderDashboard
          bookings={bookings}
          isLoading={loading}
          onRefresh={fetchBookings}
          onUpdateStatus={updateBookingStatus}
          onDecideReschedule={decideReschedule}
          notice={notice}
          onSetNotice={setNotice}
        />
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
              background: 'var(--color-brand-50, #edf7ef)',
              color: 'var(--color-brand-600, #174d3d)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 18px'
            }}>
              <ShieldCheck size={30}/>
            </div>
            <p className="eyebrow" style={{ color: 'var(--color-brand-700, #174d3d)', fontWeight: 700, letterSpacing: '0.05em' }}>
              ARY SERVICE PARTNER PORTAL
            </p>
            <h1 style={{ color: 'var(--color-brand-900, #173b2f)', margin: '8px 0 12px', fontSize: '1.9rem' }}>
              Your business, one workspace.
            </h1>
            <p style={{ color: 'var(--color-neutral-600, #64748b)', maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.7, fontSize: '0.95rem' }}>
              Sign in with your approved Service Provider account to manage bookings, customer reviews, earnings and grocery inventory. New provider applications are verified by admin compliance.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => openAuthModal('login')}
            >
              <LogIn size={16}/> Sign in to Partner Workspace
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

export default function ProviderApp() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <ProviderWorkspace/>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
