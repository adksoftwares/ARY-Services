import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Star,
  Wallet,
  ShoppingBag,
  Package,
  Bell,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { SegmentedControl, Button } from '../../design-system';
import ProviderStatsHeader from './ProviderStatsHeader';
import ProviderVerificationBanner from './ProviderVerificationBanner';
import ProviderJobs from './ProviderJobs';
import ProviderWallet from './ProviderWallet';
import ProviderReviews from './ProviderReviews';
import GroceryInventory from './GroceryInventory';
import GroceryOrders from './GroceryOrders';

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
    // Autoplay restrictions or headless browser
  }
}

export default function ProviderDashboard({
  bookings = [],
  isLoading = false,
  onRefresh,
  onUpdateStatus,
  onDecideReschedule
}) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'reviews' | 'wallet' | 'orders' | 'inventory'
  const [providerReviews, setProviderReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [claimingJobId, setClaimingJobId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Network offline detection
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

  const pendingRequests = bookings.filter(b => b.status === 'requested');

  // Trigger audio alert when new requests arrive
  useEffect(() => {
    if (pendingRequests.length > 0 && soundEnabled) {
      playAlertChime();
    }
  }, [pendingRequests.length, soundEnabled]);

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
      console.warn('Could not fetch provider reviews:', e);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [currentUser?.id]);

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
      console.warn('Could not fetch ledger entries:', e);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    } else if (activeTab === 'wallet') {
      fetchWalletLedger();
    }
  }, [activeTab, fetchReviews, fetchWalletLedger]);

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
        alert(data.error || 'Failed to claim job.');
      } else {
        onRefresh?.();
      }
    } catch (err) {
      alert('Could not claim job: ' + err.message);
    } finally {
      setClaimingJobId(null);
    }
  }

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
      onRefresh?.();
    } catch (error) {
      alert(error.message || 'Could not send quote.');
    }
  }

  const averageRating = providerReviews.length > 0
    ? (providerReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / providerReviews.length).toFixed(1)
    : (currentUser?.rating ? Number(currentUser.rating).toFixed(1) : '5.0');

  const tabOptions = [
    { value: 'jobs', label: `Jobs (${bookings.length})` },
    { value: 'reviews', label: `Reviews (${providerReviews.length || currentUser?.reviewCount || 0})` },
    { value: 'wallet', label: 'Wallet & Earnings' }
  ];

  if (currentUser?.category === 'grocery-products') {
    tabOptions.push(
      { value: 'orders', label: 'Grocery Orders' },
      { value: 'inventory', label: 'Product Inventory' }
    );
  }

  return (
    <main className="dashboard" style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 20px', minHeight: '80vh' }}>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div style={{
          background: 'var(--color-warning-50, #fffbeb)',
          border: '1px solid var(--color-warning-300, #fde68a)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.85rem',
          color: 'var(--color-warning-900, #92400e)'
        }}>
          <AlertTriangle size={18} color="#d97706" />
          <span><b>Offline Resilience Mode:</b> Intermittent or no connection. Actions will synchronize when connection is restored.</span>
        </div>
      )}

      {/* Urgent Incoming Booking Alert Banner */}
      {pendingRequests.length > 0 && (
        <div style={{
          background: 'var(--color-danger-50, #fef2f2)',
          border: '1.5px solid var(--color-danger-300, #fca5a5)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'var(--color-danger-600, #dc2626)',
              color: '#fff',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={18} />
            </div>
            <div>
              <b style={{ color: 'var(--color-danger-900, #991b1b)', fontSize: '0.95rem' }}>
                🚨 {pendingRequests.length} Urgent Booking Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Your Response!
              </b>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-danger-800, #7f1d1d)' }}>
                Responding within 30 minutes improves your contractor ranking across Sri Lanka.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              getOrCreateAudioContext();
              playAlertChime();
            }}
          >
            🔔 Test Alert Chime
          </Button>
        </div>
      )}

      {/* Provider Verification Status Banner */}
      <ProviderVerificationBanner currentUser={currentUser} />

      {/* Stats Header & KPI Cards */}
      <ProviderStatsHeader
        currentUser={currentUser}
        bookings={bookings}
        averageRating={averageRating}
        reviewCount={providerReviews.length || currentUser?.reviewCount || 0}
        walletBalance={walletBalance}
        isOnline={isOnline}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          getOrCreateAudioContext();
          const next = !soundEnabled;
          setSoundEnabled(next);
          if (next) playAlertChime();
        }}
      />

      {/* Navigation Controls */}
      <div style={{
        margin: '24px 0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ minWidth: 280, flex: 1, maxWidth: 650 }}>
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          loading={isLoading}
        >
          <RefreshCw size={14} /> Refresh Data
        </Button>
      </div>

      {/* Active Tab Content */}
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

      {activeTab === 'reviews' && (
        <ProviderReviews
          reviews={providerReviews}
          averageRating={averageRating}
          isLoading={isLoadingReviews}
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

      {activeTab === 'orders' && currentUser?.category === 'grocery-products' && (
        <GroceryOrders />
      )}

      {activeTab === 'inventory' && currentUser?.category === 'grocery-products' && (
        <GroceryInventory />
      )}
    </main>
  );
}
