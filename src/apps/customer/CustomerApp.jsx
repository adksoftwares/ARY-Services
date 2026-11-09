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
  ShoppingBag,
  Bell,
  Home,
  MapPin,
  ChevronDown
} from 'lucide-react';
import CustomerLocationModal from '../../components/customer/CustomerLocationModal';
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

function CustomerHeader({ address, onOpenLocationModal, onOpenProfile }) {
  const { currentUser, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/" className="brand" aria-label="ARY Services home">
          <span className="brand-mark">A</span>
          <span>ARY <b>Services</b></span>
        </Link>

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

      <nav className="header-nav-links">
        <Link to="/" className="nav-link-btn">
          <Search size={15} /> Explore
        </Link>
        {currentUser?.accountType === 'customer' && (
          <Link to="/bookings" className="nav-link-btn">
            <ClipboardList size={15} /> My Bookings
          </Link>
        )}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LanguageSwitcher />
        <ThemeToggle />

        {currentUser ? (
          <div className="user-profile">
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={() => openAuthModal('login')}>
              <LogIn size={14} /> Sign in
            </Button>
            <Button variant="secondary" size="sm" onClick={() => openAuthModal('register')}>
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

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
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

      {/* 4. Alerts / Notifications */}
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

      {/* 5. Account */}
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
          className="mob-nav-item highlight"
          onClick={() => openAuthModal('login')}
        >
          <LogIn size={20} />
          <span>Sign In</span>
        </button>
      )}
    </nav>
  );
}

function CustomerWorkspace() {
  const { currentUser, openAuthModal, updateUserLocation } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState(currentUser?.location || '');
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

  // Hardware Back Button Handling for Capacitor WebView
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
      const handleBack = window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
        if (profileModalOpen) {
          setProfileModalOpen(false);
        } else if (bookingOpen) {
          setBookingOpen(false);
        } else if (reviewBooking) {
          setReviewBooking(null);
        } else if (disputeBookingItem) {
          setDisputeBookingItem(null);
        } else if (canGoBack) {
          window.history.back();
        } else {
          window.Capacitor.Plugins.App.exitApp();
        }
      });
      return () => {
        handleBack.then(h => h?.remove?.());
      };
    }
  }, [profileModalOpen, bookingOpen, reviewBooking, disputeBookingItem]);

  const fetchProviders = useCallback(async (category = selectedCategory?.slug, search = query, location = coords) => {
    setLoadingProviders(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.set('category', category);
      if (search) params.set('query', search);
      if (location?.lat && location?.lng) { params.set('lat', location.lat); params.set('lng', location.lng); }
      const response = await fetch(`${API_BASE}/providers?${params.toString()}`);
      if (!response.ok) throw new Error('Could not load service providers.');
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setNotice(getFriendlyErrorMessage(err, 'Error loading providers.'));
    } finally {
      setLoadingProviders(false);
    }
  }, [selectedCategory?.slug, query, coords]);

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
    if (!currentUser?.token || currentUser.accountType !== 'customer') { setBookings([]); return; }
    setLoadingBookings(true);
    try {
      const response = await fetch(`${API_BASE}/bookings`, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      if (!response.ok) throw new Error('Could not load bookings.');
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error, 'Could not load your bookings.'));
    } finally {
      setLoadingBookings(false);
    }
  }, [currentUser?.token, currentUser?.accountType]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    fetchBookings();
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

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    fetchProviders(category.slug, query, coords);
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
    <div className="app-shell">
      <OfflineBanner />
      <CustomerHeader
        address={address}
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
