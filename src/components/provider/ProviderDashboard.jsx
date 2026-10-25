import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Check,
  Ban,
  Zap,
  CheckCheck,
  ClipboardList,
  AlertTriangle,
  Bell,
  Star,
  ShieldCheck,
  MessageSquare,
  Wallet,
  Banknote,
  CreditCard,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

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

function getSlaStatus(createdAt) {
  if (!createdAt) return null;
  const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const remainingMinutes = 30 - elapsedMinutes;

  if (remainingMinutes > 0) {
    return {
      text: `⏱️ ${remainingMinutes}m remaining (30-Min Response SLA)`,
      urgent: remainingMinutes <= 10,
      overdue: false
    };
  }
  return {
    text: `⚠️ Response SLA Overdue by ${Math.abs(remainingMinutes)}m`,
    urgent: true,
    overdue: true
  };
}

export default function ProviderDashboard({
  bookings,
  isLoading,
  onRefresh,
  onUpdateStatus
}) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'reviews' | 'wallet'
  const [providerReviews, setProviderReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [computedWalletBalance, setComputedWalletBalance] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [claimingJobId, setClaimingJobId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const broadcastJobs = bookings.filter(b => b.status === 'broadcast_pool');
  const directBookings = bookings.filter(b => b.status !== 'broadcast_pool');
  const pendingRequests = directBookings.filter(b => b.status === 'requested');

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
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert('Could not claim job: ' + err.message);
    } finally {
      setClaimingJobId(null);
    }
  }

  // Network offline detector
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

  // Trigger audio alert when new requests arrive
  useEffect(() => {
    if (pendingRequests.length > 0 && soundEnabled) {
      playAlertChime();
    }
  }, [pendingRequests.length, soundEnabled]);

  // Fetch reviews when review tab is active
  useEffect(() => {
    if (activeTab === 'reviews' && currentUser?.id) {
      fetchReviews();
    }
  }, [activeTab, currentUser?.id]);

  // Fetch double-entry ledger when wallet tab is active
  useEffect(() => {
    if (activeTab === 'wallet' && currentUser?.token) {
      fetchWalletLedger();
    }
  }, [activeTab, currentUser?.token]);

  async function fetchReviews() {
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
  }

  async function fetchWalletLedger() {
    try {
      const res = await fetch(`${API_BASE}/ledger/wallet`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComputedWalletBalance(data.walletBalance || 0);
        setLedgerEntries(data.entries || []);
      }
    } catch (e) {
      console.warn('Could not fetch ledger entries:', e);
    }
  }

  const averageRating = providerReviews.length > 0
    ? (providerReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / providerReviews.length).toFixed(1)
    : (currentUser?.rating ? Number(currentUser.rating).toFixed(1) : '5.0');

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalEarnedPayout = completedBookings.reduce((sum, b) => {
    return sum + (b.providerPayout || Math.round((parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500) * 0.9));
  }, 0);

  const pendingEscrowPayout = bookings.filter(b => b.paymentStatus === 'escrow_held' && b.status !== 'completed').reduce((sum, b) => {
    return sum + (b.providerPayout || Math.round((parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500) * 0.9));
  }, 0);

  const totalPlatformFees = completedBookings.reduce((sum, b) => {
    return sum + (b.platformFee || Math.round((parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500) * 0.1));
  }, 0);

  return (
    <main className="dashboard">
      <div className="dashboard-heading">
        <span className="eyebrow">SERVICE PARTNER SPACE</span>
        <h1>Provider <em>workspace.</em></h1>
        <p>
          {currentUser && currentUser.accountType === 'provider'
            ? `Logged in as ${currentUser.fullName} (${currentUser.location || 'Local Area'}). Manage your service profile and respond to customer job requests.`
            : 'Manage your service profile and keep track of customer requests.'}
        </p>
      </div>

      {/* Offline Mode Warning Banner */}
      {!isOnline && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.85rem',
          color: '#92400e'
        }}>
          <AlertTriangle size={18} color="#d97706" />
          <span><b>Offline Resilience Mode:</b> Intermittent or no internet connection. Actions will synchronize automatically when connection is restored.</span>
        </div>
      )}

      {/* Urgent Incoming Booking Alert Banner */}
      {pendingRequests.length > 0 && (
        <div
          className="urgent-alert-banner"
          style={{
          background: '#fef2f2',
          border: '1px solid #f87171',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={20} className="spin-slow" />
            </div>
            <div>
              <b style={{ color: '#991b1b', fontSize: '0.95rem' }}>
                🚨 {pendingRequests.length} Urgent Booking Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Your Response!
              </b>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
                Responding within 30 minutes boosts your rank on the ARY Service Catalog.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={playAlertChime}
            style={{
              background: '#fff',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              padding: '6px 12px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            🔔 Test Alert Chime
          </button>
        </div>
      )}

      {/* Provider Overview Card */}
      <div style={{
        background: 'white',
        border: '1px solid #e1e7de',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <b style={{ fontSize: '17px', color: '#163b2e' }}>{currentUser?.fullName}</b>
            <span className="verified-provider-badge">
              <CheckCircle2 size={12} /> Approved Partner
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#d97706',
              marginLeft: 6
            }}>
              ⭐ {averageRating} ({providerReviews.length || currentUser?.reviewCount || 0} reviews)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#68786e', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <span><b>Phone:</b> {currentUser?.phone}</span>
            <span><b>Email:</b> {currentUser?.email || 'N/A'}</span>
            <span><b>Service Area:</b> {currentUser?.location || 'Colombo'}</span>
            <span><b>Rate:</b> {currentUser?.baseCharge || 'LKR 1,500 base'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="sound-alerts-toggle-btn"
            onClick={() => {
              getOrCreateAudioContext();
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playAlertChime();
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: soundEnabled ? '1px solid #86efac' : '1px solid #cbd5e1',
              background: soundEnabled ? '#f0fdf4' : '#f8fafc',
              color: soundEnabled ? '#166534' : '#64748b',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            title={soundEnabled ? 'Click to mute sound alerts' : 'Click to enable audio alerts for incoming jobs'}
          >
            {soundEnabled ? <Volume2 size={14} color="#16a34a" /> : <VolumeX size={14} color="#94a3b8" />}
            <span>{soundEnabled ? 'Sound: ON' : 'Sound: Muted'}</span>
          </button>

          <button
            type="button"
            className="refresh-users-btn"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>{isLoading ? 'Updating...' : 'Refresh Bookings'}</span>
          </button>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 8
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'jobs' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'jobs' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ClipboardList size={16} /> Job Bookings ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'reviews' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'reviews' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Star size={16} fill={activeTab === 'reviews' ? '#f59e0b' : 'none'} color={activeTab === 'reviews' ? '#f59e0b' : '#64748b'} />
          Customer Ratings & Reviews
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'wallet' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'wallet' ? '#fff' : '#475569',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Wallet size={16} color={activeTab === 'wallet' ? '#fff' : '#059669'} />
          Earnings & Escrow Wallet
        </button>
      </div>

      {/* Tab 1: Job Bookings Feed */}
      {activeTab === 'jobs' && (
        <>
          {/* Cascading Broadcast Pool Section */}
          {broadcastJobs.length > 0 && (
            <div
              className="cascading-broadcast-banner"
              style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 20,
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    background: '#f59e0b',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}>⚡</span>
                  <div>
                    <b style={{ color: '#92400e', fontSize: '1rem' }}>
                      {broadcastJobs.length} Open Broadcast Job{broadcastJobs.length > 1 ? 's' : ''} Available in Your Category!
                    </b>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78350f' }}>
                      Another contractor was unavailable. Fast-track response: Claim this job instantly to earn payout.
                    </p>
                  </div>
                </div>
                <span style={{
                  background: '#b45309',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  First-to-Claim Priority
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {broadcastJobs.map(b => (
                  <div key={b.id} style={{
                    background: '#ffffff',
                    border: '1px solid #fde68a',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <b style={{ color: '#1e293b', fontSize: '0.95rem' }}>{b.categoryName || 'Service Job'}</b>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>#{b.id}</span>
                        <span style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}>
                          {b.baseCharge || 'LKR 1,500'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span>📍 <b>Area:</b> {b.serviceAddress}</span>
                        <span>📅 <b>Date:</b> {b.bookingDate} ({b.bookingTime})</span>
                        <span>👤 <b>Customer:</b> {b.customerName}</span>
                      </div>
                      {b.problemDescription && (
                        <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#334155', fontStyle: 'italic' }}>
                          "{b.problemDescription}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleClaimJob(b.id)}
                      disabled={claimingJobId === b.id}
                      style={{
                        background: '#047857',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 18px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)'
                      }}
                    >
                      <Zap size={15} />
                      {claimingJobId === b.id ? 'Claiming...' : 'Claim Job (1-Click)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#68776d' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
              Loading customer job bookings...
            </div>
          ) : directBookings.length > 0 ? (
            <div className="bookings-feed">
              {directBookings.map(b => {
                const sla = b.status === 'requested' ? getSlaStatus(b.createdAt) : null;

                return (
                  <div key={b.id} className="booking-card-item">
                    <div className="booking-card-header">
                      <div>
                        <span className="booking-service-title">{b.categoryName || 'Service Job'}</span>
                        <span style={{ fontSize: '11px', color: '#7c8a81', marginLeft: '10px' }}>
                          Job Ref: #{b.id}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sla && (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: sla.overdue ? '#fee2e2' : sla.urgent ? '#fef3c7' : '#ecfdf5',
                            color: sla.overdue ? '#b91c1c' : sla.urgent ? '#b45309' : '#047857',
                            border: `1px solid ${sla.overdue ? '#fca5a5' : sla.urgent ? '#fde68a' : '#a7f3d0'}`
                          }}>
                            {sla.text}
                          </span>
                        )}
                        <span className={`booking-status-tag ${b.status}`}>
                          {b.status === 'requested' ? '⏳ New Request' :
                           b.status === 'accepted' ? '✅ Accepted' :
                           b.status === 'in_progress' ? '⚡ In Progress' :
                           b.status === 'completed' ? '🎉 Completed' : b.status}
                        </span>
                      </div>
                    </div>

                    <div className="booking-details-grid">
                      <div>
                        <b>Customer Name:</b> {b.customerName}
                      </div>
                      <div>
                        <b>Phone:</b> <a href={`tel:${b.customerPhone}`} style={{ color: '#166534', fontWeight: 700 }}>{b.customerPhone} (Call)</a>
                      </div>
                      <div>
                        <b>Scheduled Date:</b> {b.bookingDate} ({b.bookingTime})
                      </div>
                      <div>
                        <b>Job Location:</b> <span style={{ color: '#1b4938', fontWeight: 600 }}>{b.serviceAddress}</span>
                      </div>
                    </div>

                    <div className="booking-problem-box">
                      <b>Client Problem / Requirements:</b>
                      <p style={{ margin: '4px 0 0', color: '#1f2e27' }}>{b.problemDescription}</p>
                    </div>

                    {/* If reviewed, show customer review */}
                    {b.review && (
                      <div style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 8
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.85rem' }}>
                            ⭐ {b.review.rating}/5 Customer Rating
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>
                            {new Date(b.review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {b.review.comment && (
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#166534', fontStyle: 'italic' }}>
                            "{b.review.comment}"
                          </p>
                        )}
                      </div>
                    )}

                    <div className="booking-actions-row">
                      {b.status === 'requested' && (
                        <>
                          <button
                            type="button"
                            className="booking-action-btn accept"
                            onClick={() => onUpdateStatus(b.id, 'accepted')}
                          >
                            <Check size={14} /> Accept Job
                          </button>
                          <button
                            type="button"
                            className="booking-action-btn reject"
                            onClick={() => onUpdateStatus(b.id, 'rejected')}
                          >
                            <Ban size={14} /> Decline
                          </button>
                        </>
                      )}
                      {b.status === 'accepted' && (
                        <>
                          <button
                            type="button"
                            className="booking-action-btn progress"
                            onClick={() => onUpdateStatus(b.id, 'in_progress')}
                          >
                            <Zap size={14} /> Start Job
                          </button>
                          <button
                            type="button"
                            className="booking-action-btn complete"
                            onClick={() => onUpdateStatus(b.id, 'completed')}
                          >
                            <CheckCheck size={14} /> Mark Completed
                          </button>
                        </>
                      )}
                      {b.status === 'in_progress' && (
                        <button
                          type="button"
                          className="booking-action-btn complete"
                          onClick={() => onUpdateStatus(b.id, 'completed')}
                        >
                          <CheckCheck size={14} /> Mark as Finished
                        </button>
                      )}
                      {b.status === 'completed' && (
                        <span style={{ fontSize: '12px', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={15} /> Service Completed Successfully
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : broadcastJobs.length === 0 ? (
            <div className="no-providers-box">
              <ClipboardList size={34} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <b>No customer booking requests yet.</b>
              <p style={{ fontSize: '12px', margin: '6px 0 0' }}>
                When customers in your area select your service, their job bookings will appear here in real time!
              </p>
            </div>
          ) : null}
        </>
      )}

      {/* Tab 2: Customer Reviews & Ratings */}
      {activeTab === 'reviews' && (
        <div>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 20
          }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', paddingRight: 20 }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {averageRating}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 2, margin: '6px 0' }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={16}
                    fill={s <= Math.round(Number(averageRating)) ? '#f59e0b' : '#e2e8f0'}
                    color={s <= Math.round(Number(averageRating)) ? '#d97706' : '#cbd5e1'}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Based on {providerReviews.length} reviews
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 700, fontSize: '0.95rem' }}>
                <ShieldCheck size={18} /> 100% Verified Customer Reviews
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                All reviews are tied to confirmed completed jobs under the 14-Day ARY Workmanship Guarantee.
              </p>
            </div>
          </div>

          {isLoadingReviews ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#68776d' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
              Loading reviews...
            </div>
          ) : providerReviews.length > 0 ? (
            <div style={{ display: 'grid', gap: 14 }}>
              {providerReviews.map(r => (
                <div
                  key={r.id}
                  style={{
                    background: '#fff',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ color: '#0f172a', fontSize: '0.92rem' }}>{r.customerName}</b>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#ecfdf5',
                        color: '#065f46',
                        fontWeight: 600
                      }}>
                        Verified Client
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={15}
                        fill={s <= r.rating ? '#f59e0b' : '#e2e8f0'}
                        color={s <= r.rating ? '#d97706' : '#cbd5e1'}
                      />
                    ))}
                  </div>

                  {r.comment ? (
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
                      "{r.comment}"
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No written comment provided.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-providers-box">
              <MessageSquare size={34} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <b>No customer reviews yet.</b>
              <p style={{ fontSize: '12px', margin: '6px 0 0' }}>
                Completed customer jobs will automatically receive reviews here once submitted by clients.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Earnings & Escrow Wallet */}
      {activeTab === 'wallet' && (
        <div>
          {/* Financial Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '16px 18px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="#059669" /> Net Earnings (Released)
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857', marginTop: 6 }}>
                LKR {totalEarnedPayout.toLocaleString()}
              </div>
              <small style={{ fontSize: '0.72rem', color: '#065f46' }}>From {completedBookings.length} completed job(s)</small>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 18px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color="#d97706" /> Escrow Balance (Pending)
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: 6 }}>
                LKR {pendingEscrowPayout.toLocaleString()}
              </div>
              <small style={{ fontSize: '0.72rem', color: '#92400e' }}>Released upon customer completion & rating</small>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Banknote size={16} color="#64748b" /> Platform Commission (10%)
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: 6 }}>
                LKR {totalPlatformFees.toLocaleString()}
              </div>
              <small style={{ fontSize: '0.72rem', color: '#64748b' }}>Covers 14-Day ARY Workmanship Guarantee</small>
            </div>
          </div>

          {/* Detailed Transaction Breakdown */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: '#0f172a' }}>
              Job Payout & Escrow History ({bookings.length})
            </h3>

            {bookings.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '8px 10px' }}>Job Ref</th>
                      <th style={{ padding: '8px 10px' }}>Customer</th>
                      <th style={{ padding: '8px 10px' }}>Date</th>
                      <th style={{ padding: '8px 10px' }}>Payment Mode</th>
                      <th style={{ padding: '8px 10px' }}>Gross Fee</th>
                      <th style={{ padding: '8px 10px' }}>Platform Fee (10%)</th>
                      <th style={{ padding: '8px 10px' }}>Net Payout (90%)</th>
                      <th style={{ padding: '8px 10px' }}>Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => {
                      const base = b.baseAmount || parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500;
                      const fee = b.platformFee || Math.round(base * 0.1);
                      const net = b.providerPayout || (base - fee);

                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px', fontWeight: 600, color: '#334155' }}>#{b.id.slice(-6)}</td>
                          <td style={{ padding: '10px' }}>{b.customerName}</td>
                          <td style={{ padding: '10px', color: '#64748b' }}>{b.bookingDate}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              background: b.paymentMethod === 'cash' ? '#f1f5f9' : '#ecfdf5',
                              color: b.paymentMethod === 'cash' ? '#475569' : '#047857'
                            }}>
                              {b.paymentMethod === 'cash' ? '💵 Cash' : '🛡️ Escrow'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>LKR {base.toLocaleString()}</td>
                          <td style={{ padding: '10px', color: '#dc2626' }}>- LKR {fee.toLocaleString()}</td>
                          <td style={{ padding: '10px', fontWeight: 700, color: '#047857' }}>LKR {net.toLocaleString()}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              background: b.paymentStatus === 'released_to_provider' ? '#ecfdf5' :
                                          b.paymentStatus === 'escrow_held' ? '#fef3c7' : '#f1f5f9',
                              color: b.paymentStatus === 'released_to_provider' ? '#047857' :
                                     b.paymentStatus === 'escrow_held' ? '#b45309' : '#475569'
                            }}>
                              {b.paymentStatus === 'released_to_provider' ? '✓ Payout Released' :
                               b.paymentStatus === 'escrow_held' ? '⏳ Held in Escrow' : '💵 Direct Cash'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                No completed bookings or payout transactions recorded yet.
              </div>
            )}
          </div>

          {/* Double-Entry Ledger Immutable Audit Trail */}
          {ledgerEntries.length > 0 && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px', marginTop: 16 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color="#059669" /> Immutable Double-Entry Ledger Audit Trail ({ledgerEntries.length} entries)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '6px 8px' }}>TX Ref</th>
                      <th style={{ padding: '6px 8px' }}>Account</th>
                      <th style={{ padding: '6px 8px' }}>Type</th>
                      <th style={{ padding: '6px 8px' }}>Amount (LKR)</th>
                      <th style={{ padding: '6px 8px' }}>Description</th>
                      <th style={{ padding: '6px 8px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{e.transactionId ? e.transactionId.slice(-8) : e.id.slice(-6)}</td>
                        <td style={{ padding: '6px 8px', color: '#0f172a', fontWeight: 600 }}>{e.account}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontWeight: 700,
                            background: e.type === 'credit' ? '#ecfdf5' : '#fee2e2',
                            color: e.type === 'credit' ? '#047857' : '#b91c1c'
                          }}>
                            {e.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>LKR {Number(e.amount).toLocaleString()}</td>
                        <td style={{ padding: '6px 8px', color: '#475569' }}>{e.description}</td>
                        <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
