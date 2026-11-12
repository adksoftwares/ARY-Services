import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Calendar,
  Wallet,
  Star,
  Layers,
  ShoppingBag,
  Package,
  User,
  Bell,
  RefreshCw,
  AlertTriangle,
  Menu,
  X,
  Volume2,
  VolumeX,
  Vibrate,
  ShieldCheck,
  ArrowRight,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';
import { Button, Badge, Modal } from '../../design-system';

// Feature Views
import ProviderOverview from './ProviderOverview';
import ProviderJobs from './ProviderJobs';
import ProviderQuotes from './ProviderQuotes';
import ProviderSchedule from './ProviderSchedule';
import ProviderWallet from './ProviderWallet';
import ProviderReviews from './ProviderReviews';
import ProviderServicesManager from './ProviderServicesManager';
import GroceryInventory from './GroceryInventory';
import GroceryOrders from './GroceryOrders';
import ProviderProfile from './ProviderProfile';

let sharedAudioCtx = null;

function getOrCreateAudioContext() {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

function playAlertChime() {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Silent fallback
  }
}

function triggerHapticVibration() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 80, 150]);
    }
  } catch (e) {}
}

export default function ProviderDashboard({
  bookings = [],
  isLoading = false,
  onRefresh,
  onUpdateStatus,
  onDecideReschedule,
  notice = '',
  onSetNotice
}) {
  const { currentUser, switchRole, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active view tab from URL search params: ?tab=overview
  const activeTab = searchParams.get('tab') || 'overview';

  const [providerReviews, setProviderReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [claimingJobId, setClaimingJobId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sound, vibration, and availability state persisted in localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('ary_provider_sound') !== 'false' : true;
  });
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('ary_provider_vibration') !== 'false' : true;
  });
  const [isAvailable, setIsAvailable] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('ary_provider_available') !== 'false' : true;
  });

  const isGrocery = currentUser?.category === 'grocery-products';
  const pendingRequests = useMemo(() => bookings.filter(b => b.status === 'requested'), [bookings]);

  // Tab navigation helper
  const handleNavigateTab = useCallback((tabName) => {
    setSearchParams({ tab: tabName });
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [setSearchParams]);

  // Audio and sound toggles
  function toggleSound() {
    getOrCreateAudioContext();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('ary_provider_sound', String(next));
    if (next) playAlertChime();
  }

  function toggleVibration() {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    localStorage.setItem('ary_provider_vibration', String(next));
    if (next) triggerHapticVibration();
  }

  function toggleAvailability() {
    const next = !isAvailable;
    setIsAvailable(next);
    localStorage.setItem('ary_provider_available', String(next));
    onSetNotice?.(next ? 'Status set to Accepting Bookings.' : 'Status set to Paused.');
  }

  // Fetch reviews when on reviews tab or overview
  const fetchReviews = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingReviews(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/provider/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setProviderReviews(data.reviews || []);
      }
    } catch (e) {
      console.warn('Could not fetch reviews:', e);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [currentUser?.id]);

  // Fetch ledger entries
  const fetchWalletLedger = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`${API_BASE}/ledger/wallet`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.walletBalance || 0);
        setLedgerEntries(data.entries || []);
      }
    } catch (e) {
      console.warn('Could not fetch wallet ledger:', e);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    if (activeTab === 'reviews' || activeTab === 'overview') {
      fetchReviews();
    }
    if (activeTab === 'wallet' || activeTab === 'overview') {
      fetchWalletLedger();
    }
  }, [activeTab, fetchReviews, fetchWalletLedger]);

  // Trigger alert on new bookings via SSE
  useEffect(() => {
    if (!currentUser?.token || currentUser.accountType !== 'provider') return undefined;

    const handleNewBooking = () => {
      onRefresh?.();
      onSetNotice?.('New customer booking request arrived!');
      if (soundEnabled) playAlertChime();
      if (vibrationEnabled) triggerHapticVibration();
    };

    const handleNewGroceryOrder = () => {
      onRefresh?.();
      onSetNotice?.('New grocery order received!');
      if (soundEnabled) playAlertChime();
      if (vibrationEnabled) triggerHapticVibration();
    };

    return subscribeToAppEvents(currentUser.token, {
      'booking:created': handleNewBooking,
      'grocery:order_created': handleNewGroceryOrder
    });
  }, [currentUser, soundEnabled, vibrationEnabled, onRefresh, onSetNotice]);

  // Claim job handler
  async function handleClaimJob(jobId) {
    if (!currentUser?.token) return;
    setClaimingJobId(jobId);
    try {
      const res = await fetch(`${API_BASE}/bookings/${jobId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        onSetNotice?.(data.error || 'Failed to claim job.');
      } else {
        onSetNotice?.('Job claimed successfully! Details added to your active jobs.');
        onRefresh?.();
      }
    } catch (err) {
      onSetNotice?.('Could not claim job: ' + err.message);
    } finally {
      setClaimingJobId(null);
    }
  }

  // Quote submit handler
  async function handleSendQuote(booking, amount, description) {
    try {
      const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(booking.id)}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ amount, description })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not send quote.');
      onSetNotice?.(`Quote of LKR ${Number(amount).toLocaleString()} sent to client.`);
      onRefresh?.();
    } catch (error) {
      onSetNotice?.(error.message || 'Could not send quote.');
    }
  }

  const averageRating = providerReviews.length > 0
    ? (providerReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / providerReviews.length).toFixed(1)
    : (currentUser?.reviewCount > 0 && currentUser?.rating != null ? Number(currentUser.rating).toFixed(1) : '—');

  // Navigation Items Definition
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'jobs', label: 'Jobs', icon: Briefcase, badge: pendingRequests.length > 0 ? pendingRequests.length : null },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'wallet', label: 'Earnings & Wallet', icon: Wallet },
    { id: 'reviews', label: 'Client Reviews', icon: Star },
    { id: 'services', label: 'Services Catalog', icon: Layers }
  ];

  if (isGrocery) {
    navItems.push(
      { id: 'orders', label: 'Grocery Orders', icon: ShoppingBag },
      { id: 'inventory', label: 'Product Inventory', icon: Package }
    );
  }

  navItems.push({ id: 'profile', label: 'Profile & Settings', icon: User });

  return (
    <div className="provider-layout-body">
      {/* 1. Desktop Responsive Sidebar (>= 1024px) */}
      <aside className="provider-sidebar">
        <div className="provider-sidebar-header">
          <div className="provider-sidebar-title">Workspace Navigation</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="provider-avatar-circle" style={{ width: 34, height: 34, fontSize: 13 }}>
              {currentUser?.fullName?.slice(0, 2).toUpperCase() || 'SP'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-neutral-900, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.fullName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-success-700, #047857)', fontWeight: 600 }}>
                ● Active Partner
              </div>
            </div>
          </div>
        </div>

        <ul className="provider-nav-list">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`provider-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavigateTab(item.id)}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.badge && <span className="provider-nav-badge">{item.badge}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Modern Interactive Partner Hotline Card */}
        <div className="provider-sidebar-hotline-card">
          <div className="sidebar-hotline-header">
            <span className="sidebar-pulse-dot" />
            <span className="sidebar-hotline-tag">24/7 Dispatch Desk</span>
          </div>
          <div className="sidebar-hotline-body">
            <span className="sidebar-hotline-title">ARY Partner Hotline</span>
            <a href="tel:0112345678" className="sidebar-hotline-phone" title="Click to call dispatch">
              <PhoneCall size={14} /> 011 234 5678
            </a>
          </div>
          <span className="sidebar-hotline-sub">Emergency & Job Reassignment</span>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="provider-content-area">
        {activeTab === 'overview' && (
          <ProviderOverview
            currentUser={currentUser}
            bookings={bookings}
            walletBalance={walletBalance}
            averageRating={averageRating}
            reviewCount={providerReviews.length || currentUser?.reviewCount || 0}
            onNavigateTab={handleNavigateTab}
            onUpdateStatus={onUpdateStatus}
            isAvailable={isAvailable}
            onToggleAvailability={toggleAvailability}
          />
        )}

        {activeTab === 'jobs' && (
          <ProviderJobs
            bookings={bookings}
            isLoading={isLoading}
            onUpdateStatus={onUpdateStatus}
            onDecideReschedule={onDecideReschedule}
            onClaimJob={handleClaimJob}
            onSendQuote={handleSendQuote}
            claimingJobId={claimingJobId}
          />
        )}

        {activeTab === 'quotes' && (
          <ProviderQuotes
            bookings={bookings}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'schedule' && (
          <ProviderSchedule
            bookings={bookings}
            onNavigateTab={handleNavigateTab}
            onDecideReschedule={onDecideReschedule}
          />
        )}

        {activeTab === 'wallet' && (
          <ProviderWallet
            bookings={bookings}
            ledgerEntries={ledgerEntries}
            walletBalance={walletBalance}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'reviews' && (
          <ProviderReviews
            reviews={providerReviews}
            averageRating={averageRating}
            isLoading={isLoadingReviews}
          />
        )}

        {activeTab === 'services' && (
          <ProviderServicesManager />
        )}

        {activeTab === 'orders' && isGrocery && (
          <GroceryOrders />
        )}

        {activeTab === 'inventory' && isGrocery && (
          <GroceryInventory />
        )}

        {activeTab === 'profile' && (
          <ProviderProfile
            currentUser={currentUser}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
            vibrationEnabled={vibrationEnabled}
            onToggleVibration={toggleVibration}
            onSwitchRole={switchRole}
            onLogout={logout}
          />
        )}
      </main>

      {/* 3. Mobile Bottom Navigation (< 1024px) */}
      <nav className="provider-bottom-nav" aria-label="Mobile Provider Navigation">
        <button
          type="button"
          className={`provider-bottom-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => handleNavigateTab('overview')}
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`provider-bottom-tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => handleNavigateTab('jobs')}
        >
          <Briefcase size={20} />
          <span>Jobs</span>
          {pendingRequests.length > 0 && (
            <span className="provider-bottom-tab-badge">{pendingRequests.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`provider-bottom-tab ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => handleNavigateTab('wallet')}
        >
          <Wallet size={20} />
          <span>Wallet</span>
        </button>

        {isGrocery ? (
          <button
            type="button"
            className={`provider-bottom-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => handleNavigateTab('orders')}
          >
            <ShoppingBag size={20} />
            <span>Orders</span>
          </button>
        ) : (
          <button
            type="button"
            className={`provider-bottom-tab ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => handleNavigateTab('services')}
          >
            <Layers size={20} />
            <span>Services</span>
          </button>
        )}

        <button
          type="button"
          className={`provider-bottom-tab ${['quotes', 'schedule', 'reviews', 'inventory', 'profile'].includes(activeTab) ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* 4. Mobile "More" Drawer Modal */}
      <Modal
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Workspace Menu"
        isBottomSheet={true}
      >
        <div style={{ display: 'grid', gap: 10, padding: '4px 0 16px' }}>
          <button
            type="button"
            className="provider-nav-item"
            onClick={() => handleNavigateTab('quotes')}
            style={{ padding: '14px 16px', background: activeTab === 'quotes' ? 'var(--color-brand-50, #edf7f2)' : '#fff' }}
          >
            <FileText size={18} color="var(--color-brand-600, #174d3d)" />
            <span>Quotes & Estimates</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
          </button>

          <button
            type="button"
            className="provider-nav-item"
            onClick={() => handleNavigateTab('schedule')}
            style={{ padding: '14px 16px', background: activeTab === 'schedule' ? 'var(--color-brand-50, #edf7f2)' : '#fff' }}
          >
            <Calendar size={18} color="var(--color-brand-600, #174d3d)" />
            <span>Service Schedule</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
          </button>

          <button
            type="button"
            className="provider-nav-item"
            onClick={() => handleNavigateTab('reviews')}
            style={{ padding: '14px 16px', background: activeTab === 'reviews' ? 'var(--color-brand-50, #edf7f2)' : '#fff' }}
          >
            <Star size={18} color="#d97706" />
            <span>Client Reviews ({providerReviews.length})</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
          </button>

          {isGrocery && (
            <button
              type="button"
              className="provider-nav-item"
              onClick={() => handleNavigateTab('inventory')}
              style={{ padding: '14px 16px', background: activeTab === 'inventory' ? 'var(--color-brand-50, #edf7f2)' : '#fff' }}
            >
              <Package size={18} color="var(--color-brand-600, #174d3d)" />
              <span>Product Inventory</span>
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </button>
          )}

          {!isGrocery && (
            <button
              type="button"
              className="provider-nav-item"
              onClick={() => handleNavigateTab('services')}
              style={{ padding: '14px 16px', background: activeTab === 'services' ? 'var(--color-brand-50, #edf7f2)' : '#fff' }}
            >
              <Layers size={18} color="var(--color-brand-600, #174d3d)" />
              <span>Services Catalog</span>
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </button>
          )}

          <button
            type="button"
            className="provider-nav-item"
            onClick={() => handleNavigateTab('profile')}
            style={{ padding: '14px 16px', background: activeTab === 'profile' ? 'var(--color-brand-50, #edf7f2)' : '#fff' }}
          >
            <User size={18} color="var(--color-brand-600, #174d3d)" />
            <span>Partner Profile & Preferences</span>
            <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
          </button>
        </div>
      </Modal>
    </div>
  );
}
