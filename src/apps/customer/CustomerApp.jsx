import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ClipboardList,
  LogIn,
  LogOut,
  UserRound,
  ArrowRight,
  ShoppingBasket,
  Zap,
  Wrench,
  Sparkles,
  Package,
  Bike,
  Utensils,
  Moon,
  Sun,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  Bell,
  Home,
  MapPin,
  ChevronDown
} from 'lucide-react';
import CustomerLocationModal from '../../components/customer/CustomerLocationModal';
import { App } from '@capacitor/app';
import { fetchCurrentLocationAddress, fetchCurrentLocationCoords, getLastDetectedCoordinates, resolveCoordinates } from '../../utils/location';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';
import { subscribeToAppEvents } from '../../utils/events';
import HeroSection from '../../components/customer/HeroSection';
import CategoryGrid from '../../components/customer/CategoryGrid';
import ProviderCatalog from '../../components/customer/ProviderCatalog';
import BookingModal from '../../components/customer/BookingModal';
import ReviewModal from '../../components/customer/ReviewModal';
import DisputeModal from '../../components/customer/DisputeModal';
import AccountView from '../../components/customer/AccountView';
import AuthModal from '../../components/common/AuthModal';
import Footer from '../../components/common/Footer';
import NotificationCenter from '../../components/common/NotificationCenter';
import OfflineBanner from '../../components/common/OfflineBanner';
import { Button, ThemeToggle, ToastProvider, Modal, LanguageSwitcher, useToast, Skeleton } from '../../design-system';
import { LanguageProvider, useT } from '../../utils/i18n';

// Route-level and heavy section code-splitting
const GroceryMarketplace = lazy(() => import('../../components/customer/GroceryMarketplace'));
const MobilityServices = lazy(() => import('../../components/customer/MobilityServices'));
const MyBookingsList = lazy(() => import('../../components/customer/MyBookingsList'));
const DesignSystemShowcase = lazy(() => import('../../components/design-system-showcase/DesignSystemShowcase'));
const AdminWorkspace = lazy(() => import('../../components/admin/AdminWorkspace'));

const SectionFallback = () => (
  <div style={{ padding: 'var(--space-6) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <Skeleton height="28px" width="30%" />
    <Skeleton height="140px" width="100%" borderRadius="var(--radius-lg)" />
  </div>
);

const SERVICES = [
  { id: 1, name: 'Food Shops', slug: 'food-shops', description: 'Explore local shops and place an order', icon: ShoppingBasket, color: 'peach' },
  { id: 2, name: 'Electrical Repair', slug: 'electrical-repair', description: 'Electricians for home and business', icon: Zap, color: 'yellow' },
  { id: 3, name: 'Plumbing', slug: 'plumbing', description: 'Repairs, fittings and maintenance', icon: Wrench, color: 'blue' },
  { id: 4, name: 'Grocery Products', slug: 'grocery-products', description: 'Everyday grocery items by weight, volume and pack size', icon: Package, color: 'peach' },
  { id: 5, name: 'Other Services', slug: 'other-services', description: 'Discover more services near you', icon: Sparkles, color: 'lilac' }
];

function CustomerHeader({ address, launchCity, onOpenLocationModal, onOpenProfile }) {
  const { currentUser, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar customer-main-header">
      <div className="customer-header-brand-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/" className="brand" aria-label="ARY Services home">
          <span className="brand-mark">A</span>
          <span>ARY <b>Services</b></span>
        </Link>

        {launchCity && !address && <span style={{fontSize:11,fontWeight:600,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{launchCity}</span>}

        {/* Dynamic Location Switcher Button */}
        <button
          type="button"
          onClick={onOpenLocationModal}
          className="header-location-pill"
          title="Click to view or change your delivery and service location"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: 'var(--surface-muted, rgba(21, 128, 61, 0.08))',
            border: '1px solid var(--border-subtle, rgba(21, 128, 61, 0.25))',
            borderRadius: '9999px',
            padding: '5px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            color: 'var(--text-primary, inherit)',
            maxWidth: '220px',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
            flexShrink: 0
          }} />
          <MapPin size={13} style={{ color: 'var(--brand-primary, #15803d)', flexShrink: 0 }} />
          <span style={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '12px'
          }}>
            {address || 'Select Location'}
          </span>
          <ChevronDown size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
        </button>
      </div>

      <nav className="header-nav-links customer-header-links">
        <Link to="/" className="nav-link-btn">
          <Search size={15} /> Explore
        </Link>
        {currentUser?.accountType === 'customer' && (
          <Link to="/bookings" className="nav-link-btn">
            <ClipboardList size={15} /> My Bookings
          </Link>
        )}
        {currentUser?.accountType === 'admin' && (
          <Link
            to="/admin"
            className="nav-link-btn"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 600
            }}
          >
            <ShieldCheck size={15} /> Super Admin Panel
          </Link>
        )}
      </nav>

      <div className="customer-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LanguageSwitcher />
        <ThemeToggle />

        {currentUser ? (
          <div className="user-profile customer-header-user-actions">
            <NotificationCenter />
            <button
              type="button"
              className="user-badge"
              onClick={onOpenProfile}
              title="View account profile & roles"
              style={{ cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'transparent' }}
            >
              <UserRound size={14} />
              <span>{currentUser.fullName}</span>
            </button>
            <button
              className="sign-out-btn"
              onClick={() => { logout(); navigate('/'); }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        ) : (
          <div className="header-guest-actions customer-header-guest-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="ghost"
              size="sm"
              className="header-admin-btn"
              onClick={() => openAuthModal('admin')}
              style={{
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.08)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Super Admin Control Center Sign In"
            >
              <ShieldCheck size={14} /> Admin
            </Button>
            <Button variant="primary" size="sm" className="header-signin-btn" onClick={() => openAuthModal('login')}>
              <LogIn size={14} /> Sign in
            </Button>
            <Button variant="secondary" size="sm" className="header-join-btn" onClick={() => openAuthModal('register')}>
              Join ARY <ArrowRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

function CustomerMobileBottomNav({ bookingsCount = 0, onOpenProfile, onOpenAlerts }) {
  const { currentUser, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function scrollToSection(id) {
    navigate('/');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  const isHome = location.pathname === '/';
  const isBookings = location.pathname === '/bookings';
  const isAdminPath = location.pathname === '/admin';

  return (
    <nav className="mobile-bottom-nav customer-mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      {/* 1. Home */}
      <Link to="/" className={`mob-nav-item ${isHome ? 'active' : ''}`}>
        <Home size={20} />
        <span>Explore</span>
      </Link>

      {/* 2. Bookings */}
      <Link
        to="/bookings"
        className={`mob-nav-item ${isBookings ? 'active' : ''}`}
        onClick={(e) => {
          if (!currentUser) {
            e.preventDefault();
            openAuthModal('login');
          }
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardList size={20} />
          {bookingsCount > 0 && <span className="mob-nav-badge">{bookingsCount}</span>}
        </div>
        <span>Bookings</span>
      </Link>

      {/* 3. Orders */}
      <button
        type="button"
        className="mob-nav-item"
        onClick={() => scrollToSection('grocery-section')}
      >
        <ShoppingBag size={20} />
        <span>Orders</span>
      </button>

      {/* Admin navigation is shown only inside an authenticated admin session. */}
      {currentUser?.accountType === 'admin' && (
        <Link to="/admin" className={`mob-nav-item ${isAdminPath ? 'active' : ''}`}>
          <ShieldCheck size={20} />
          <span>Admin</span>
        </Link>
      )}

      {/* 5. Alerts / Notifications */}
      <button
        type="button"
        className="mob-nav-item"
        onClick={() => {
          if (!currentUser) {
            openAuthModal('login');
          } else if (onOpenAlerts) {
            onOpenAlerts();
          }
        }}
      >
        <Bell size={20} />
        <span>Alerts</span>
      </button>

      {/* 6. Account */}
      {currentUser ? (
        <button
          type="button"
          className="mob-nav-item"
          onClick={onOpenProfile}
        >
          <UserRound size={20} />
          <span>{currentUser.fullName ? currentUser.fullName.split(' ')[0] : 'Profile'}</span>
        </button>
      ) : (
        <button
          type="button"
          className="mob-nav-item"
          onClick={() => openAuthModal('login')}
        >
          <LogIn size={20} />
          <span>Sign In</span>
        </button>
      )}
    </nav>
  );
}

const initialAdminServices = [
  { id: 1, name: 'Food Shops', slug: 'food-shops', description: 'Explore local shops and place an order', color: 'peach' },
  { id: 2, name: 'Electrical Repair', slug: 'electrical-repair', description: 'Electricians for home and business', color: 'yellow' },
  { id: 3, name: 'Plumbing', slug: 'plumbing', description: 'Repairs, fittings and maintenance', color: 'blue' },
  { id: 4, name: 'Grocery Products', slug: 'grocery-products', description: 'Shop everyday grocery items by weight, volume and pack size', color: 'peach' },
  { id: 5, name: 'Other Services', slug: 'other-services', description: 'Discover more services near you', color: 'lilac' }
];

function AdminPortalView({ onNotice }) {
  const { currentUser, openAuthModal } = useAuth();
  const [adminUsers, setAdminUsers] = useState([]);
  const [services, setServices] = useState(initialAdminServices);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const isAdmin = currentUser?.accountType === 'admin';

  const fetchAdminUsers = useCallback(async () => {
    const requestId = ++adminUsersRequestRef.current;
    if (!currentUser?.token || currentUser.accountType !== 'admin') {
      setAdminUsers([]);
      setIsLoadingUsers(false);
      return;
    }
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load registered accounts.');
      if (requestId !== adminUsersRequestRef.current) return;
      if (!Array.isArray(data.users)) throw new Error('The server returned an unexpected user list. Please refresh.');
      setAdminUsers(data.users.filter(user => user && typeof user === 'object' && user.id !== null && user.id !== undefined));
    } catch (error) {
      if (requestId === adminUsersRequestRef.current) onNotice?.(getFriendlyErrorMessage(error, 'Could not load registered accounts.'));
    } finally {
      if (requestId === adminUsersRequestRef.current) setIsLoadingUsers(false);
    }
  }, [currentUser?.token, currentUser?.accountType, onNotice]);

  useEffect(() => {
    fetchAdminUsers();
    return () => { adminUsersRequestRef.current += 1; };
  }, [fetchAdminUsers]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const refresh = () => fetchAdminUsers();
    return subscribeToAppEvents(currentUser?.token, {
      'driver:application_created': refresh,
      'driver:application_reviewed': refresh,
      'user:registered': refresh,
      'user:status_changed': refresh
    });
  }, [isAdmin, fetchAdminUsers, currentUser?.token]);

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', padding: '32px 20px', textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
          Super Admin Access Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
          Sign in with authorized administrator credentials to manage users, verify KYC documents, and monitor platform dispatches.
        </p>
        <Button
          variant="danger"
          size="lg"
          onClick={() => openAuthModal('admin')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 700
          }}
        >
          <ShieldCheck size={18} /> Sign In to Super Admin Console
        </Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '80vh', paddingBottom: '80px' }}>
      <Suspense fallback={<SectionFallback />}>
        <AdminWorkspace
          adminUsers={adminUsers}
          setAdminUsers={setAdminUsers}
          services={services}
          setServices={setServices}
          isLoadingUsers={isLoadingUsers}
          fetchAdminUsers={fetchAdminUsers}
          onNotice={onNotice}
        />
      </Suspense>
    </div>
  );
}

function CustomerWorkspace() {
  const { currentUser, openAuthModal, updateUserLocation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressRef = React.useRef(0);
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState(currentUser?.location || '');
  const [platformConfig, setPlatformConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/platform/config`).then((response) => response.ok ? response.json() : null)
      .then((config) => { if (!cancelled && config) setPlatformConfig(config); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [coords, setCoords] = useState(currentUser?.coords || null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [notice, setNotice] = useState('');
  const [bookingProvider, setBookingProvider] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [disputeBookingItem, setDisputeBookingItem] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const autoDetectDoneRef = React.useRef(false);
  const providerRequestRef = React.useRef(0);
  const bookingRequestRef = React.useRef(0);
  const adminUsersRequestRef = React.useRef(0);

  // Hardware Back Button Handling for Capacitor WebView & Native Android
  useEffect(() => {
    const handleBackButtonLogic = () => {
      // 1. First priority: Close any open modals or bottom sheets
      if (locationModalOpen) {
        setLocationModalOpen(false);
        return true;
      }
      if (profileModalOpen) {
        setProfileModalOpen(false);
        return true;
      }
      if (bookingOpen) {
        setBookingOpen(false);
        return true;
      }
      if (reviewBooking) {
        setReviewBooking(null);
        return true;
      }
      if (disputeBookingItem) {
        setDisputeBookingItem(null);
        return true;
      }

      // Check for any open generic modal / backdrop in DOM
      const activeModal = document.querySelector('.modal-overlay, .modal-backdrop, [role="dialog"]');
      if (activeModal) {
        const closeBtn = activeModal.querySelector('.modal-close, button[aria-label="Close"], button[aria-label="Dismiss"], button.close');
        if (closeBtn) {
          closeBtn.click();
          return true;
        }
      }

      // 2. Second priority: If not on home page ("/"), navigate back to home screen
      if (location.pathname !== '/') {
        navigate('/');
        return true;
      }

      // 3. Third priority: On home screen, double-tap back within 2 seconds to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        App.exitApp();
        return false;
      } else {
        lastBackPressRef.current = now;
        setNotice('Press back again to exit ARY Services');
        return true;
      }
    };

    window.__ARY_HANDLE_BACK__ = handleBackButtonLogic;

    const listenerPromise = App.addListener('backButton', () => {
      handleBackButtonLogic();
    });

    return () => {
      delete window.__ARY_HANDLE_BACK__;
      listenerPromise.then(h => h?.remove?.());
    };
  }, [
    locationModalOpen,
    profileModalOpen,
    bookingOpen,
    reviewBooking,
    disputeBookingItem,
    location.pathname,
    navigate
  ]);

  const fetchProviders = useCallback(async (category = selectedCategory?.slug, search = query, location = coords) => {
    const requestId = ++providerRequestRef.current;
    setLoadingProviders(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.set('category', category);
      if (search) params.set('query', search);
      if (location?.lat !== null && location?.lat !== undefined && location?.lng !== null && location?.lng !== undefined && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng))) {
        params.set('lat', String(location.lat));
        params.set('lng', String(location.lng));
      }
      const response = await fetch(`${API_BASE}/providers?${params.toString()}`);
      if (!response.ok) throw new Error('Could not load service providers.');
      const data = await response.json().catch(() => ({}));
      if (requestId === providerRequestRef.current) {
        setProviders(Array.isArray(data.providers) ? data.providers.filter(provider => provider && typeof provider === 'object') : []);
      }
    } catch (err) {
      if (requestId === providerRequestRef.current) {
        setNotice(getFriendlyErrorMessage(err, 'Error loading providers.'));
      }
    } finally {
      if (requestId === providerRequestRef.current) setLoadingProviders(false);
    }
  }, [selectedCategory?.slug, query, coords]);

  useEffect(() => () => { providerRequestRef.current += 1; }, []);

  const handleAutoDetectLocation = useCallback(async () => {
    try {
      setNotice('📍 Detecting your current location in Sri Lanka...');
      const detectedAddress = await fetchCurrentLocationAddress();
      const detectedCoords = getLastDetectedCoordinates() || await fetchCurrentLocationCoords().catch(() => null);
      const effectiveCoords = detectedCoords || resolveCoordinates(detectedAddress);

      setAddress(detectedAddress);
      setCoords(effectiveCoords);
      if (updateUserLocation) {
        await updateUserLocation(detectedAddress, effectiveCoords);
      }
      fetchProviders(selectedCategory?.slug, query, effectiveCoords);
      setNotice(`📍 Location automatically detected: ${detectedAddress}`);
    } catch (err) {
      console.log('Location detection fallback:', err.message);
      if (currentUser?.location) {
        setAddress(currentUser.location);
        const savedCoords = currentUser?.coords || resolveCoordinates(currentUser.location);
        setCoords(savedCoords);
        fetchProviders(selectedCategory?.slug, query, savedCoords);
      }
    }
  }, [currentUser?.location, currentUser?.coords, selectedCategory?.slug, query, updateUserLocation, fetchProviders]);

  const handleSelectLocation = useCallback((newAddress, newCoords) => {
    setAddress(newAddress);
    setCoords(newCoords);
    setLocationModalOpen(false);
    if (updateUserLocation) {
      updateUserLocation(newAddress, newCoords);
    }
    fetchProviders(selectedCategory?.slug, query, newCoords);
  }, [updateUserLocation, fetchProviders, selectedCategory?.slug, query]);

  // Auto-detect current location on Customer Sign In / initial mount
  useEffect(() => {
    if (currentUser?.accountType === 'customer') {
      if (!autoDetectDoneRef.current) {
        autoDetectDoneRef.current = true;
        handleAutoDetectLocation();
      }
    } else {
      autoDetectDoneRef.current = false;
    }
  }, [currentUser?.id, currentUser?.accountType, handleAutoDetectLocation]);

  const fetchBookings = useCallback(async () => {
    const requestId = ++bookingRequestRef.current;
    if (!currentUser?.token || currentUser.accountType !== 'customer') {
      setBookings([]);
      setLoadingBookings(false);
      return;
    }
    setLoadingBookings(true);
    try {
      const response = await fetch(`${API_BASE}/bookings`, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      if (!response.ok) throw new Error('Could not load bookings.');
      const data = await response.json().catch(() => ({}));
      if (requestId !== bookingRequestRef.current) return;
      if (!Array.isArray(data.bookings)) throw new Error('The server returned an unexpected bookings list. Please refresh.');
      setBookings(data.bookings.filter(booking => booking && typeof booking === 'object' && booking.id !== null && booking.id !== undefined));
    } catch (error) {
      if (requestId === bookingRequestRef.current) setNotice(getFriendlyErrorMessage(error, 'Could not load your bookings.'));
    } finally {
      if (requestId === bookingRequestRef.current) setLoadingBookings(false);
    }
  }, [currentUser?.token, currentUser?.accountType]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    fetchBookings();
    return () => { bookingRequestRef.current += 1; };
  }, [fetchBookings]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    const unsub = subscribeToAppEvents(currentUser.token, {
      'booking:created': () => fetchBookings(),
      'booking:status_changed': () => fetchBookings(),
      'booking:cancelled': () => fetchBookings(),
      'quote:created': () => fetchBookings(),
      'quote:accepted': () => fetchBookings(),
      'quote:declined': () => fetchBookings(),
      'reschedule:suggested': () => fetchBookings(),
      'reschedule:accepted': () => fetchBookings(),
      'dispute:raised': () => fetchBookings()
    });
    return unsub;
  }, [currentUser?.token, fetchBookings]);

  const handleCategorySelect = (category, searchTerm = query) => {
    setSelectedCategory(category);
    fetchProviders(category.slug, searchTerm, coords);
    const catalogEl = document.getElementById('providers-catalog') || document.querySelector('.providers-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleQuoteDecision = async (bookingId, decision) => {
    if (!currentUser?.token) return;
    const normalizedDecision = (decision === 'accepted' || decision === 'accept') ? 'accept' : 'reject';
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/quote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ decision: normalizedDecision })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update quote decision.');
      setNotice(data.message || `Quote ${normalizedDecision === 'accept' ? 'accepted' : 'declined'}.`);
      fetchBookings();
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error, 'Failed to update quote.'));
    }
  };

  const handleRescheduleBooking = async (bookingId, date, time, reason = 'Customer requested reschedule') => {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ date, time, reason })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reschedule booking.');
      setNotice(data.message || 'Reschedule request submitted.');
      fetchBookings();
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error, 'Failed to reschedule.'));
    }
  };

  const handleCancelBooking = async (bookingId, reason = 'Customer requested cancellation') => {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to cancel booking.');
      setNotice(data.message || 'Booking cancelled successfully.');
      fetchBookings();
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error, 'Failed to cancel booking.'));
    }
  };

  const activeBookingsCount = bookings.filter(b => !['completed', 'cancelled', 'rejected'].includes(b.status)).length;

  return (
    <div className="app-shell ary-app-root ary-customer-root">
      <OfflineBanner />
      <CustomerHeader
        address={address}
        launchCity={platformConfig?.primaryLaunchCity || platformConfig?.launchCities?.[0] || ''}
        onOpenLocationModal={() => setLocationModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      <main tabIndex={-1}>
        <Routes>
          <Route path="/" element={
            <>
              <HeroSection
                address={address}
                setAddress={setAddress}
                query={query}
                setQuery={setQuery}
                onNotice={setNotice}
                onOpenLocationModal={() => setLocationModalOpen(true)}
                onSearch={() => {
                  fetchProviders(selectedCategory?.slug, query, coords);
                  const catalogEl = document.getElementById('providers-catalog') || document.querySelector('.providers-section');
                  if (catalogEl) {
                    catalogEl.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                onSelectCategory={handleCategorySelect}
                onLocationDetected={(newCoords) => {
                  setCoords(newCoords);
                  fetchProviders(selectedCategory?.slug, query, newCoords);
                }}
                popularProviders={providers}
                onBookProvider={(provider, service) => {
                  if (!currentUser) {
                    setNotice('Please sign in or create an account to book a service.');
                    openAuthModal('login');
                    return;
                  }
                  setBookingProvider({ ...provider, selectedService: service || null });
                  setBookingOpen(true);
                }}
              />

              <CategoryGrid
                services={SERVICES}
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
              />

              <ProviderCatalog
                selectedCategory={selectedCategory}
                providers={providers}
                isLoading={loadingProviders}
                onRefresh={() => fetchProviders(selectedCategory?.slug, query, coords)}
                onSelectCategory={handleCategorySelect}
                onBookProvider={(provider) => {
                  if (!currentUser) {
                    setNotice('Please sign in or create an account to book a service.');
                    openAuthModal('login');
                    return;
                  }
                  setBookingProvider(provider);
                  setBookingOpen(true);
                }}
              />

              <div id="mobility-section">
                <Suspense fallback={<SectionFallback />}>
                  <MobilityServices onNotice={setNotice} />
                </Suspense>
              </div>

              <div id="grocery-section">
                <Suspense fallback={<SectionFallback />}>
                  <GroceryMarketplace />
                </Suspense>
              </div>
            </>
          } />

          <Route path="/bookings" element={
            <Suspense fallback={<SectionFallback />}>
              <MyBookingsList
                bookings={bookings}
                isLoading={loadingBookings}
                onRefresh={fetchBookings}
                onCancelBooking={handleCancelBooking}
                onOpenDisputeModal={setDisputeBookingItem}
                onOpenReviewModal={setReviewBooking}
                onRescheduleBooking={handleRescheduleBooking}
                onQuoteDecision={handleQuoteDecision}
                onExploreServices={() => navigate('/')}
              />
            </Suspense>
          } />

          <Route path="/admin" element={<AdminPortalView onNotice={setNotice} />} />
          <Route path="/design-system" element={
            <Suspense fallback={<SectionFallback />}>
              <DesignSystemShowcase />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Guided Multi-step Booking BottomSheet Modal */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        provider={bookingProvider}
        selectedCategory={selectedCategory}
        initialAddress={address}
        onBookingSuccess={(_booking, provider) => {
          setBookingOpen(false);
          setNotice(`Booking request sent to ${provider.fullName}.`);
          navigate('/bookings');
          fetchBookings();
        }}
      />

      {/* Review Modal */}
      {reviewBooking && (
        <ReviewModal
          isOpen={Boolean(reviewBooking)}
          onClose={() => setReviewBooking(null)}
          booking={reviewBooking}
          onSuccess={() => { setNotice('Review published. Thank you!'); fetchBookings(); }}
        />
      )}

      {/* Dispute Modal */}
      {disputeBookingItem && (
        <DisputeModal
          isOpen={Boolean(disputeBookingItem)}
          onClose={() => setDisputeBookingItem(null)}
          booking={disputeBookingItem}
          onSuccess={() => { setNotice('Dispute submitted for admin review.'); fetchBookings(); }}
        />
      )}

      {/* Account Profile BottomSheet Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="My ARY Account"
        isBottomSheet={true}
        size="md"
      >
        <AccountView
          onNotice={setNotice}
          onClose={() => setProfileModalOpen(false)}
        />
      </Modal>

      <CustomerLocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentAddress={address}
        onSelectLocation={handleSelectLocation}
        onNotice={setNotice}
      />

      <AuthModal onNotice={setNotice} />

      {notice && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
          style={{ cursor: 'pointer' }}
          onClick={() => setNotice('')}
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <Footer />

      {/* Mobile Bottom Navigation */}
      <CustomerMobileBottomNav
        bookingsCount={activeBookingsCount}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenAlerts={() => setProfileModalOpen(true)}
      />
    </div>
  );
}

export default function CustomerApp() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
          <BrowserRouter>
            <CustomerWorkspace />
          </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
