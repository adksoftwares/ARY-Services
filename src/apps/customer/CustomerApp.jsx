import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Search, ClipboardList, LogIn, LogOut, UserRound, ArrowRight, ShoppingBasket, Zap, Wrench, Sparkles, Package } from 'lucide-react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';
import HeroSection from '../../components/customer/HeroSection';
import CategoryGrid from '../../components/customer/CategoryGrid';
import ProviderCatalog from '../../components/customer/ProviderCatalog';
import GroceryMarketplace from '../../components/customer/GroceryMarketplace';
import MobilityServices from '../../components/customer/MobilityServices';
import BookingModal from '../../components/customer/BookingModal';
import MyBookingsList from '../../components/customer/MyBookingsList';
import ReviewModal from '../../components/customer/ReviewModal';
import DisputeModal from '../../components/customer/DisputeModal';
import AccountRoleRequest from '../../components/customer/AccountRoleRequest';
import AuthModal from '../../components/common/AuthModal';
import Footer from '../../components/common/Footer';
import NotificationCenter from '../../components/common/NotificationCenter';

const SERVICES = [
  { id: 1, name: 'Food Shops', slug: 'food-shops', description: 'Explore local shops and place an order', icon: ShoppingBasket, color: 'peach' },
  { id: 2, name: 'Electrical Repair', slug: 'electrical-repair', description: 'Electricians for home and business', icon: Zap, color: 'yellow' },
  { id: 3, name: 'Plumbing', slug: 'plumbing', description: 'Repairs, fittings and maintenance', icon: Wrench, color: 'blue' },
  { id: 4, name: 'Grocery Products', slug: 'grocery-products', description: 'Everyday grocery items by weight, volume and pack size', icon: Package, color: 'peach' },
  { id: 5, name: 'Other Services', slug: 'other-services', description: 'Discover more services near you', icon: Sparkles, color: 'lilac' }
];

function CustomerHeader() {
  const { currentUser, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();
  return <header className="topbar">
    <Link to="/" className="brand" aria-label="ARY Services home"><span className="brand-mark">A</span><span>ARY <b>Services</b></span></Link>
    <nav className="header-nav-links">
      <Link to="/" className="nav-link-btn"><Search size={14}/> Explore</Link>
      {currentUser?.accountType === 'customer' && <Link to="/bookings" className="nav-link-btn"><ClipboardList size={14}/> My Bookings</Link>}
    </nav>
    {currentUser ? <div className="user-profile">
      <NotificationCenter/>
      <span className="user-badge"><UserRound size={14}/><span>{currentUser.fullName}</span></span>
      <button className="sign-out-btn" onClick={() => { logout(); navigate('/'); }}><LogOut size={14}/> Sign out</button>
    </div> : <div style={{display:'flex',gap:8}}>
      <button className="sign-in" onClick={() => openAuthModal('login')}><LogIn size={14}/> Sign in</button>
      <button className="register-nav-btn" onClick={() => openAuthModal('register')}>Join ARY <ArrowRight size={14}/></button>
    </div>}
  </header>;
}

function CustomerWorkspace() {
  const { currentUser, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [address, setAddress] = useState(currentUser?.location || '');
  const [coords, setCoords] = useState(null);
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

  const fetchProviders = useCallback(async (category = selectedCategory?.slug, search = query, location = coords) => {
    setLoadingProviders(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.set('category', category);
      if (search) params.set('query', search);
      if (location?.lat && location?.lng) { params.set('lat', location.lat); params.set('lng', location.lng); }
      const response = await fetch(`${API_BASE}/providers?${params.toString()}`);
      if (!response.ok) throw new Error('Could not load providers.');
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      setNotice(error.message || 'Could not load providers right now.');
    } finally {
      setLoadingProviders(false);
    }
  }, [selectedCategory, query, coords]);

  const fetchBookings = useCallback(async () => {
    if (!currentUser?.token || currentUser.accountType !== 'customer') { setBookings([]); return; }
    setLoadingBookings(true);
    try {
      const response = await fetch(`${API_BASE}/bookings`, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      if (!response.ok) throw new Error('Could not load your bookings.');
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoadingBookings(false);
    }
  }, [currentUser]);

  async function decideQuote(bookingId, decision) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId)}/quote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ decision })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update quote.');
      setNotice(data.message || 'Quote updated.');
      await fetchBookings();
    } catch (error) { setNotice(error.message || 'Could not update quote.'); }
  }

  async function requestReschedule(bookingId, date, time) {
    if (!currentUser?.token) return false;
    try {
      const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId)}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ date, time })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not request a new booking time.');
      setNotice(data.message || 'Reschedule request sent.');
      await fetchBookings();
      return true;
    } catch (error) {
      setNotice(error.message || 'Could not request a new booking time.');
      return false;
    }
  }

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => {
    const refresh = () => { fetchBookings(); };
    return subscribeToAppEvents(currentUser?.token, { 'booking:created': refresh, 'booking:status_updated': refresh, 'booking:quote_sent': refresh, 'booking:quote_decided': refresh, 'booking:reschedule_requested': refresh, 'booking:reschedule_decided': refresh, 'grocery:order_updated': refresh, 'driver:job_created': refresh, 'driver:job_updated': refresh });
  }, [fetchBookings]);

  const visibleServices = useMemo(() => SERVICES.filter(service =>
    `${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  function selectCategory(category) {
    const next = selectedCategory?.id === category.id ? null : category;
    setSelectedCategory(next);
    if (next) fetchProviders(next.slug, query);
    else setProviders([]);
  }

  function openBooking(provider) {
    if (!currentUser) { setNotice('Sign in to book a service.'); openAuthModal('login'); return; }
    if (currentUser.accountType !== 'customer') {
      setNotice('This app is for customer bookings. Please use the matching ARY workspace for your account.');
      return;
    }
    setBookingProvider(provider);
    setBookingOpen(true);
  }

  async function updateBookingStatus(id, status) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update booking.');
      setNotice('Booking updated.');
      fetchBookings();
    } catch (error) { setNotice(error.message); }
  }

  async function cancelBooking(id) {
    if (!currentUser?.token || !window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ reason: 'Cancelled by customer' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not cancel booking.');
      setNotice(data.message || 'Booking cancelled.');
      fetchBookings();
    } catch (error) { setNotice(error.message); }
  }

  async function disputeBooking(id) {
    if (!currentUser?.token) return;
    const reason = window.prompt('Please enter the reason for disputing this booking:');
    if (!reason?.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit dispute.');
      setNotice('Dispute submitted for Admin review.');
      fetchBookings();
    } catch (error) { setNotice(error.message); }
  }

  return <div className="app-shell">
    <CustomerHeader/>
    <Routes>
      <Route path="/" element={<main>
        <HeroSection address={address} setAddress={setAddress} query={query} setQuery={setQuery}
          onNotice={setNotice} onSearch={() => fetchProviders(selectedCategory?.slug, query)}
          onLocationDetected={next => { setCoords(next); fetchProviders(selectedCategory?.slug, query, next); }}/>
        <CategoryGrid services={visibleServices} selectedCategory={selectedCategory} onSelectCategory={selectCategory}/>
        <MobilityServices onNotice={setNotice}/>
        {selectedCategory?.slug === 'grocery-products' && <GroceryMarketplace/>}
        <ProviderCatalog selectedCategory={selectedCategory} providers={providers} isLoading={loadingProviders}
          onRefresh={() => fetchProviders(selectedCategory?.slug, query)} onBookProvider={openBooking}/>
      </main>}/>
      <Route path="/bookings" element={currentUser?.accountType === 'customer' ? <main style={{minHeight:'60vh',padding:'20px 0'}}>
        <MyBookingsList bookings={bookings} isLoading={loadingBookings} onRefresh={fetchBookings}
          onCancelBooking={cancelBooking} onDisputeBooking={disputeBooking}
          onOpenDisputeModal={booking => setDisputeBookingItem(booking)}
          onExploreServices={() => navigate('/')} onOpenReviewModal={booking => setReviewBooking(booking)}/>
      </main> : <Navigate to="/" replace/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
    <AccountRoleRequest onNotice={setNotice}/>
    <AuthModal onNotice={setNotice}/>
    <ReviewModal isOpen={Boolean(reviewBooking)} onClose={() => setReviewBooking(null)} booking={reviewBooking} onReviewSuccess={() => { setReviewBooking(null); setNotice('Thank you for your review.'); fetchBookings(); }}/>
    <DisputeModal isOpen={Boolean(disputeBookingItem)} onClose={() => setDisputeBookingItem(null)} booking={disputeBookingItem} onDisputeSuccess={() => { setDisputeBookingItem(null); setNotice('Dispute submitted for Admin review.'); fetchBookings(); }}/>
    <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} provider={bookingProvider}
      selectedCategory={selectedCategory} initialAddress={address}
      onBookingSuccess={(_booking, provider) => { setBookingOpen(false); setNotice(`Booking request sent to ${provider.fullName}.`); navigate('/bookings'); fetchBookings(); }}/>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    <Footer/>
  </div>;
}

export default function CustomerApp() {
  return <AuthProvider><BrowserRouter><CustomerWorkspace/></BrowserRouter></AuthProvider>;
}
