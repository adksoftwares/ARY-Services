import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  ShoppingBasket,
  Zap,
  Wrench,
  Sparkles,
  Search,
  ClipboardList
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { API_BASE } from './config';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AuthModal from './components/common/AuthModal';

import HeroSection from './components/customer/HeroSection';
import CategoryGrid from './components/customer/CategoryGrid';
import ProviderCatalog from './components/customer/ProviderCatalog';
import BookingModal from './components/customer/BookingModal';
import MyBookingsList from './components/customer/MyBookingsList';
import ReviewModal from './components/customer/ReviewModal';
import DisputeModal from './components/customer/DisputeModal';

import ProviderDashboard from './components/provider/ProviderDashboard';
import AdminWorkspace from './components/admin/AdminWorkspace';

const initialServices = [
  { id: 1, name: 'Food Shops', slug: 'food-shops', description: 'Explore local shops and place an order', icon: ShoppingBasket, color: 'peach' },
  { id: 2, name: 'Electrical Repair', slug: 'electrical-repair', description: 'Electricians for home and business', icon: Zap, color: 'yellow' },
  { id: 3, name: 'Plumbing', slug: 'plumbing', description: 'Repairs, fittings and maintenance', icon: Wrench, color: 'blue' },
  { id: 4, name: 'Other Services', slug: 'other-services', description: 'Discover more services near you', icon: Sparkles, color: 'lilac' },
];

function getInitialAdminUsers() {
  try {
    const saved = localStorage.getItem('ary_persisted_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [
    {
      id: 'user-admin-arikarran',
      fullName: 'Arikarran',
      email: 'arikarran14@gmail.com',
      phone: '0771414141',
      location: 'Headquarters, Admin Desk',
      accountType: 'admin',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ];
}

function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

function MainApp() {
  const { currentUser, role, isCustomerLoggedIn, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [address, setAddress] = useState('');
  const [customerCoords, setCustomerCoords] = useState(null);
  const [services, setServices] = useState(initialServices);
  const [notice, setNotice] = useState('');

  // Customer Marketplace & Bookings State
  const [customerTab, setCustomerTab] = useState('explore'); // 'explore' | 'bookings'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedProviderToBook, setSelectedProviderToBook] = useState(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBookingToReview, setSelectedBookingToReview] = useState(null);

  // Dispute Modal State
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedBookingToDispute, setSelectedBookingToDispute] = useState(null);

  // Bookings list state
  const [myBookings, setMyBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Admin Workspace State
  const [adminUsers, setAdminUsers] = useState(getInitialAdminUsers);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch admin accounts when Admin view is active or on mount
  useEffect(() => {
    fetchAdminUsers();
  }, []);

  useEffect(() => {
    if (role === 'Admin') {
      fetchAdminUsers();
    }
  }, [role, currentUser]);

  // Keep address in sync when user logs in and fetch bookings
  useEffect(() => {
    if (currentUser) {
      if (currentUser.location && !address) {
        setAddress(currentUser.location);
      }
      fetchMyBookings();
    } else {
      setMyBookings([]);
    }
  }, [currentUser]);

  // Real-Time Server-Sent Events (SSE) Hub Listener
  useEffect(() => {
    let eventSource;
    try {
      eventSource = new EventSource(`${API_BASE}/events`);

      eventSource.addEventListener('booking:created', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchMyBookings();
          if (currentUser?.id === data.providerId) {
            setNotice(`🚨 Urgent Booking Request from ${data.booking.customerName}! (${data.booking.categoryName})`);
            playAlertChime();
          }
        } catch {}
      });

      eventSource.addEventListener('booking:status_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchMyBookings();
          if (currentUser?.id === data.booking.customerId) {
            setNotice(`🔔 Booking #${data.booking.id.slice(-6)} updated to: ${data.status}`);
          }
        } catch {}
      });

      eventSource.addEventListener('review:submitted', () => {
        fetchMyBookings();
        if (selectedCategory) {
          fetchProviders(selectedCategory.slug || selectedCategory.name, query);
        }
      });

      eventSource.addEventListener('user:status_changed', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (currentUser?.id === data.userId && data.status === 'rejected') {
            logout();
            setNotice('🚫 Your account has been placed on the block list by administration.');
          }
          if (currentUser?.accountType === 'admin') {
            fetchAdminUsers();
          }
        } catch {}
      });
    } catch (err) {
      console.warn('Real-time SSE subscription error:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [currentUser?.id, selectedCategory, query]);

  async function fetchAdminUsers() {
    if (!currentUser?.token || currentUser.accountType !== 'admin') {
      return;
    }
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setAdminUsers(data.users);
          try {
            localStorage.setItem('ary_persisted_users', JSON.stringify(data.users));
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Could not fetch admin users from server:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function fetchProviders(categorySlug, searchQuery = '', coords = customerCoords) {
    setIsLoadingProviders(true);
    try {
      let url = `${API_BASE}/providers?`;
      if (categorySlug && categorySlug !== 'all') url += `category=${encodeURIComponent(categorySlug)}&`;
      if (searchQuery) url += `query=${encodeURIComponent(searchQuery)}&`;
      if (coords && coords.lat && coords.lng) {
        url += `lat=${coords.lat}&lng=${coords.lng}&`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAvailableProviders(data.providers || []);
      }
    } catch (e) {
      console.warn('Could not fetch providers:', e);
    } finally {
      setIsLoadingProviders(false);
    }
  }

  async function fetchMyBookings() {
    if (!currentUser?.token) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyBookings(data.bookings || []);
      }
    } catch (e) {
      console.warn('Could not fetch bookings:', e);
    } finally {
      setIsLoadingBookings(false);
    }
  }

  function handleSelectCategory(cat) {
    if (selectedCategory?.id === cat.id) {
      setSelectedCategory(null);
      setAvailableProviders([]);
    } else {
      setSelectedCategory(cat);
      fetchProviders(cat.slug || cat.name, query);
      setNotice(`Showing verified providers for "${cat.name}".`);
    }
  }

  function handleOpenBookingModal(provider) {
    if (!currentUser) {
      setNotice('Please sign in as a customer to book this service.');
      openAuthModal('login');
      return;
    }
    setSelectedProviderToBook(provider);
    setIsBookingModalOpen(true);
  }

  function handleBookingSuccess(_newBooking, provider) {
    setNotice(`✅ Booking requested! Provider "${provider.fullName}" has been notified.`);
    navigate('/bookings');
    fetchMyBookings();
  }

  function handleOpenReviewModal(booking) {
    setSelectedBookingToReview(booking);
    setIsReviewModalOpen(true);
  }

  function handleOpenDisputeModal(booking) {
    setSelectedBookingToDispute(booking);
    setIsDisputeModalOpen(true);
  }

  function handleDisputeSuccess(disputedBooking) {
    setNotice(`⚠️ Dispute lodged on booking #${disputedBooking?.id?.slice(-6) || ''}. Escrow funds are frozen pending administrative review.`);
    fetchMyBookings();
  }

  function handleReviewSuccess() {
    setNotice('⭐ Thank you! Your verified review and rating have been published.');
    fetchMyBookings();
    if (selectedCategory) {
      fetchProviders(selectedCategory.slug || selectedCategory.name, query);
    }
  }

  async function handleUpdateBookingStatus(bookingId, newStatus) {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setNotice(`Booking status updated to ${newStatus}.`);
        fetchMyBookings();
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice(`❌ ${data.error || 'Could not update booking status.'}`);
      }
    } catch (e) {
      console.warn('Booking status update error:', e);
      setNotice('❌ Network error updating booking status.');
    }
  }

  async function handleCancelBooking(bookingId) {
    if (!currentUser?.token) return;
    const confirmCancel = window.confirm('Are you sure you want to cancel this booking? If the contractor has already started travel/work, an LKR 500 call-out fee applies.');
    if (!confirmCancel) return;

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ reason: 'Cancelled by customer' })
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(`✅ ${data.message}`);
        fetchMyBookings();
      } else {
        setNotice(`❌ ${data.error || 'Could not cancel booking.'}`);
      }
    } catch (e) {
      setNotice(`❌ Error: ${e.message}`);
    }
  }

  async function handleDisputeBooking(bookingId) {
    if (!currentUser?.token) return;
    const reason = window.prompt('Please enter the reason for disputing this booking under the 14-Day ARY Workmanship Guarantee:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(`⚠️ Dispute lodged! Escrow funds frozen pending administrative review.`);
        fetchMyBookings();
      } else {
        setNotice(`❌ ${data.error || 'Could not submit dispute.'}`);
      }
    } catch (e) {
      setNotice(`❌ Error: ${e.message}`);
    }
  }

  const filteredServices = useMemo(() => {
    return services.filter(s =>
      (s.name + ' ' + s.description).toLowerCase().includes(query.toLowerCase())
    );
  }, [services, query]);

  return (
    <div className="app-shell">
      <Navbar onNotice={setNotice} />

      <Routes>
        {/* Customer Marketplace / Explore Home */}
        <Route
          path="/"
          element={
            <main>
              <HeroSection
                address={address}
                setAddress={setAddress}
                query={query}
                setQuery={setQuery}
                onNotice={setNotice}
                onSearch={() => fetchProviders(selectedCategory?.slug, query)}
                onLocationDetected={(coords) => {
                  setCustomerCoords(coords);
                  fetchProviders(selectedCategory?.slug, query, coords);
                }}
              />

              <CategoryGrid
                services={filteredServices}
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
              />

              <ProviderCatalog
                selectedCategory={selectedCategory}
                providers={availableProviders}
                isLoading={isLoadingProviders}
                onRefresh={() => fetchProviders(selectedCategory?.slug || selectedCategory?.name, query)}
                onBookProvider={handleOpenBookingModal}
              />
            </main>
          }
        />

        {/* Customer My Bookings Route */}
        <Route
          path="/bookings"
          element={
            <main style={{ minHeight: '60vh', padding: '20px 0' }}>
              <MyBookingsList
                bookings={myBookings}
                isLoading={isLoadingBookings}
                onRefresh={fetchMyBookings}
                onCancelBooking={handleCancelBooking}
                onDisputeBooking={handleDisputeBooking}
                onOpenDisputeModal={handleOpenDisputeModal}
                onExploreServices={() => navigate('/')}
                onOpenReviewModal={handleOpenReviewModal}
              />
            </main>
          }
        />

        {/* Provider Dashboard Route */}
        <Route
          path="/provider"
          element={
            currentUser?.accountType === 'provider' ? (
              <ProviderDashboard
                bookings={myBookings}
                isLoading={isLoadingBookings}
                onRefresh={fetchMyBookings}
                onUpdateStatus={handleUpdateBookingStatus}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Super Admin Workspace Route */}
        <Route
          path="/admin"
          element={
            currentUser?.accountType === 'admin' ? (
              <AdminWorkspace
                adminUsers={adminUsers}
                setAdminUsers={setAdminUsers}
                services={services}
                setServices={setServices}
                isLoadingUsers={isLoadingUsers}
                fetchAdminUsers={fetchAdminUsers}
                onNotice={setNotice}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Complete Authentication Modal */}
      <AuthModal onNotice={setNotice} />

      {/* Service Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        provider={selectedProviderToBook}
        selectedCategory={selectedCategory}
        initialAddress={address}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Customer Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        booking={selectedBookingToReview}
        onReviewSuccess={handleReviewSuccess}
      />

      {/* Customer Dispute Modal */}
      <DisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        booking={selectedBookingToDispute}
        onDisputeSuccess={handleDisputeSuccess}
      />

      {/* Global Toast Notification */}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
