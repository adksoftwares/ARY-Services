import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Bike,
  PackageCheck,
  Package,
  RefreshCw,
  CheckCircle2,
  MapPin,
  ArrowUpRight,
  AlertTriangle,
  Sun,
  ShieldCheck,
  Navigation,
  Compass,
  Phone,
  Power,
  KeyRound,
  Flag,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';
import { subscribeToAppEvents } from '../../utils/events';
import { getGpsFreshness } from '../../utils/location';
import { Card, Badge, Button, StatusPill, EmptyState, Stepper, Skeleton, ConfirmDialog } from '../../design-system';

// Subcomponents
import DriverPinKeypadModal from './DriverPinKeypadModal';
import DriverReleaseModal from './DriverReleaseModal';
import DriverEarningsSummary from './DriverEarningsSummary';
import DriverGpsPermissionModal from './DriverGpsPermissionModal';

const DRIVER_OPTIONS = [
  { value: 'ride', label: 'Passenger Rides', description: 'Accept city trips and airport transfers', icon: Bike },
  { value: 'food_delivery', label: 'Food Delivery', description: 'Collect orders from restaurants and deliver to clients', icon: PackageCheck },
  { value: 'parcel_delivery', label: 'Parcel Courier', description: 'Transport packages with 2-point secure PIN handoffs', icon: Package }
];

export default function DriverWorkspace({ onNotice }) {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedServices, setSelectedServices] = useState(
    currentUser?.driverServices?.length ? currentUser.driverServices : ['food_delivery']
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [presence, setPresence] = useState({ online: false });
  const [presenceBusy, setPresenceBusy] = useState(false);

  // GPS Permission Modal
  const [gpsModalOpen, setGpsModalOpen] = useState(false);

  // Modals state
  const [pinModal, setPinModal] = useState({
    isOpen: false,
    jobId: null,
    endpoint: '',
    title: '',
    subtitle: '',
    error: '',
    isVerifying: false
  });

  const [releaseModal, setReleaseModal] = useState({
    isOpen: false,
    jobId: null,
    isReleasing: false
  });

  // Screen WakeLock ref (pure web API with graceful try/catch)
  useEffect(() => {
    let wakeLock = null;
    const activeTrip = jobs.find(j => ['accepted', 'arrived', 'arrived_pickup', 'picked_up', 'in_progress', 'in_transit'].includes(j.status));

    async function requestWakeLock() {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && activeTrip) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {
          // Silent fallback if low battery or background
        }
      }
    }
    requestWakeLock();

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [jobs]);

  const refresh = useCallback(async () => {
    if (!currentUser?.token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/driver-jobs`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load driver jobs.');
      setJobs(data.jobs || []);
      if (data.presence) setPresence(data.presence);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Could not load driver jobs.'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => { refresh(); }, [refresh]);

  async function savePresence(online, coords) {
    const response = await fetch(`${API_BASE}/driver-presence`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
      body: JSON.stringify({ online, ...(coords || {}) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not update driver availability.');
    setPresence(data.presence || { online });
    return data.presence;
  }

  // Trigger Online Toggle or open GPS explanation modal
  function handleToggleOnlineClick() {
    if (presence.online) {
      // Direct go offline
      executeGoOffline();
    } else {
      // Check if location permission is granted, otherwise open explanation modal
      setGpsModalOpen(true);
    }
  }

  async function executeGoOffline() {
    setPresenceBusy(true);
    setError('');
    try {
      await savePresence(false);
      onNotice?.('You are now offline. Location sharing has stopped.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not go offline.');
    } finally {
      setPresenceBusy(false);
    }
  }

  async function executeGoOnlineWithGps() {
    if (!currentUser?.token || presenceBusy) return;
    setPresenceBusy(true);
    setError('');
    try {
      if (!navigator.geolocation) throw new Error('This device does not support GPS location.');

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        });
      });

      await savePresence(true, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy
      });

      setGpsModalOpen(false);
      onNotice?.('You are now online! Nearby jobs sorted by straight-line distance will appear.');
      await refresh();
    } catch (err) {
      setError(err.code === 1
        ? 'Location permission was denied. Please allow GPS location in your browser or phone settings.'
        : err.message || 'Could not acquire GPS position.'
      );
    } finally {
      setPresenceBusy(false);
    }
  }

  // Live GPS tracking watcher while online (pings every 12-15 seconds)
  useEffect(() => {
    if (!presence.online || !currentUser?.token || !navigator.geolocation) return undefined;
    let lastSentAt = 0;

    const watchId = navigator.geolocation.watchPosition(async position => {
      const now = Date.now();
      if (now - lastSentAt < 12000) return;
      lastSentAt = now;
      try {
        await savePresence(true, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy
        });
      } catch (err) {
        console.warn('Background GPS update failed:', err);
      }
    }, err => {
      if (err.code === 1) {
        setError('Location permission was revoked. Please re-enable GPS to stay online.');
      }
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [presence.online, currentUser?.token]);

  // Real-time events subscriber
  useEffect(() => {
    if (!currentUser?.token) return undefined;
    const notifyNew = () => {
      refresh();
      onNotice?.('New dispatch job broadcasted in your area!');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([200, 100, 200]); } catch (e) {}
      }
    };

    return subscribeToAppEvents(currentUser?.token, {
      'driver:job_created': notifyNew,
      'driver:job_updated': refresh,
      'driver:application_reviewed': refresh
    });
  }, [currentUser?.token, refresh, onNotice]);

  function toggleService(value) {
    setSelectedServices(previous => previous.includes(value)
      ? previous.filter(item => item !== value)
      : [...previous, value]
    );
  }

  async function applyServices() {
    if (!currentUser?.token || selectedServices.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/driver-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ driverTypes: selectedServices })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Application failed.');
      onNotice?.('Your selected driver service streams have been submitted for Admin compliance review.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not submit driver application.');
    } finally {
      setSubmitting(false);
    }
  }

  async function claimJob(id) {
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(id)}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not accept this job.');
      onNotice?.('Job accepted! Follow GPS route to the pickup location.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not accept this job.');
    }
  }

  async function updateStatus(id, status) {
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update job.');
      await refresh();
      onNotice?.(status === 'completed' ? 'Trip completed! Payout credited to your balance.' : 'Job status updated.');
    } catch (err) {
      setError(err.message || 'Could not update job.');
    }
  }

  async function handleConfirmRelease(reason) {
    if (!releaseModal.jobId) return;
    setReleaseModal(prev => ({ ...prev, isReleasing: true }));
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(releaseModal.jobId)}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ reason })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not release this job.');
      setReleaseModal({ isOpen: false, jobId: null, isReleasing: false });
      await refresh();
      onNotice?.('Job released back to dispatch pool.');
    } catch (err) {
      setError(err.message || 'Could not release this job.');
      setReleaseModal(prev => ({ ...prev, isReleasing: false }));
    }
  }

  function openPinModal(jobId, endpoint, title, subtitle) {
    setPinModal({
      isOpen: true,
      jobId,
      endpoint,
      title,
      subtitle,
      error: '',
      isVerifying: false
    });
  }

  async function handleVerifyPin(pin) {
    setPinModal(prev => ({ ...prev, isVerifying: true, error: '' }));
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(pinModal.jobId)}/${pinModal.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ pin })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'PIN verification failed.');
      setPinModal(prev => ({ ...prev, isOpen: false, isVerifying: false }));
      await refresh();
      onNotice?.('PIN verified successfully! Trip progress updated.');
    } catch (err) {
      setPinModal(prev => ({ ...prev, isVerifying: false, error: err.message || 'Incorrect PIN.' }));
      throw err;
    }
  }

  // Active in-progress job (if any)
  const activeTrip = useMemo(() => {
    return jobs.find(j => ['accepted', 'arrived', 'arrived_pickup', 'picked_up', 'in_progress', 'in_transit'].includes(j.status));
  }, [jobs]);

  // Proximity sorting (ascending distanceKm)
  const availableJobs = useMemo(() => {
    return jobs
      .filter(j => j.status === 'requested')
      .sort((a, b) => (Number(a.distanceKm) || 0) - (Number(b.distanceKm) || 0));
  }, [jobs]);

  const completedJobs = useMemo(() => {
    return jobs.filter(j => ['completed', 'delivered'].includes(j.status));
  }, [jobs]);

  // GPS Freshness assessment
  const gpsInfo = getGpsFreshness(presence.updatedAt, presence.accuracyM);

  return (
    <main className="driver-workspace-container">
      {/* 1. Giant Glanceable Online / Offline Switch */}
      <div className={`driver-master-switch-card ${presence.online ? 'online' : 'offline'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div className={`driver-switch-beacon ${presence.online ? 'online' : 'offline'}`} />
              <h1 style={{ fontSize: '1.25rem', margin: 0, letterSpacing: 'normal', fontWeight: 700, color: presence.online ? '#ffffff' : 'var(--color-neutral-900, #0f172a)' }}>
                {presence.online ? 'ONLINE · Receiving Dispatches' : 'OFFLINE · Paused'}
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: presence.online ? '#c7dfd4' : 'var(--color-neutral-600, #475569)', lineHeight: 1.5 }}>
              {presence.online
                ? 'High-accuracy GPS active. Dispatches are matched based on straight-line proximity.'
                : 'Turn on availability to start receiving nearby rides, grocery pickups, and deliveries.'}
            </p>
          </div>

          {/* GPS Freshness Chip */}
          {presence.online && (
            <div className={`gps-status-chip ${gpsInfo.status}`}>
              <Compass size={13} />
              <span>{gpsInfo.label}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`driver-giant-power-btn ${presence.online ? 'go-offline' : 'go-online'}`}
          onClick={handleToggleOnlineClick}
          disabled={presenceBusy}
        >
          <Power size={20} />
          <span>{presenceBusy ? 'Connecting GPS...' : presence.online ? 'Go Offline (End Shift)' : 'GO ONLINE NOW'}</span>
        </button>
      </div>

      {/* 2. Active Trip Dedicated Field HUD */}
      {activeTrip && (
        <div className="driver-active-hud-card">
          <div className="driver-active-top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--color-brand-100, #d9ebe1)',
                color: 'var(--color-brand-700, #174d3d)',
                display: 'grid',
                placeItems: 'center'
              }}>
                {activeTrip.serviceType === 'food_delivery' ? <PackageCheck size={16} /> : activeTrip.serviceType === 'parcel_delivery' ? <Package size={16} /> : <Bike size={16} />}
              </div>
              <div>
                <b style={{ fontSize: '0.95rem', color: 'var(--text-primary, #f8fafc)' }}>
                  ACTIVE DISPATCH #{activeTrip.id.slice(-6)}
                </b>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                  {activeTrip.serviceType === 'food_delivery' ? 'Food Store Pickup' : activeTrip.serviceType === 'parcel_delivery' ? 'Parcel Courier' : 'Passenger Ride'}
                </div>
              </div>
            </div>

            <StatusPill status={activeTrip.status} />
          </div>

          {/* Route Point Details */}
          <div className="driver-route-container">
            <div className="driver-route-point">
              <MapPin size={16} color="var(--color-brand-600, #174d3d)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-neutral-500, #64748b)' }}>
                  Pickup Address
                </span>
                <div style={{ fontWeight: 700, color: 'var(--color-neutral-900, #0f172a)' }}>
                  {activeTrip.pickupAddress}
                </div>
              </div>
            </div>

            <div className="driver-route-point">
              <Navigation size={16} color="var(--color-accent-600, #d18b54)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-neutral-500, #64748b)' }}>
                  Destination Address
                </span>
                <div style={{ fontWeight: 700, color: 'var(--color-neutral-900, #0f172a)' }}>
                  {activeTrip.destinationAddress}
                </div>
              </div>
            </div>

            {activeTrip.distanceKm !== null && (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-brand-700, #174d3d)', fontWeight: 600 }}>
                Straight-line estimate: ~{activeTrip.distanceKm} km {activeTrip.etaMinutes ? `· ~${activeTrip.etaMinutes} min away` : ''}
              </div>
            )}
          </div>

          {/* Customer Call & Navigation Shortcuts */}
          <div className="driver-quick-actions-bar">
            <a
              href={`tel:${activeTrip.customerPhone || '0112345678'}`}
              className="driver-quick-icon-btn call"
            >
              <Phone size={16} /> Call Customer
            </a>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                ['accepted', 'arrived'].includes(activeTrip.status) ? activeTrip.pickupAddress : activeTrip.destinationAddress
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="driver-quick-icon-btn maps"
            >
              <ExternalLink size={16} /> Open in Maps
            </a>
          </div>

          {/* Large Ergonomic Step Buttons Following Permitted Transitions */}
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {activeTrip.status === 'accepted' && (
              <>
                <button
                  type="button"
                  className="driver-field-action-btn primary"
                  onClick={() => updateStatus(activeTrip.id, activeTrip.serviceType === 'ride' ? 'arrived' : 'arrived_pickup')}
                >
                  <MapPin size={18} /> I Have Arrived at Pickup
                </button>
                <button
                  type="button"
                  className="driver-field-action-btn danger"
                  onClick={() => setReleaseModal({ isOpen: true, jobId: activeTrip.id, isReleasing: false })}
                >
                  Release Job Before Pickup
                </button>
              </>
            )}

            {['arrived', 'arrived_pickup'].includes(activeTrip.status) && (
              <button
                type="button"
                className="driver-field-action-btn accent"
                onClick={() => openPinModal(
                  activeTrip.id,
                  'verify-pickup',
                  'Enter Pickup PIN',
                  'Ask the customer or store merchant for their 4-digit pickup PIN'
                )}
              >
                <KeyRound size={18} /> Enter Pickup PIN
              </button>
            )}

            {activeTrip.status === 'picked_up' && (
              <button
                type="button"
                className="driver-field-action-btn primary"
                onClick={() => updateStatus(activeTrip.id, 'in_transit')}
              >
                <Navigation size={18} /> Start Delivery Transit
              </button>
            )}

            {activeTrip.status === 'in_progress' && (
              <button
                type="button"
                className="driver-field-action-btn accent"
                onClick={() => openPinModal(
                  activeTrip.id,
                  'verify-delivery',
                  'Enter Ride Completion PIN',
                  'Ask the passenger for the 4-digit completion PIN to finish trip'
                )}
              >
                <KeyRound size={18} /> Complete Ride · Verify PIN
              </button>
            )}

            {activeTrip.status === 'in_transit' && (
              <button
                type="button"
                className="driver-field-action-btn accent"
                onClick={() => openPinModal(
                  activeTrip.id,
                  'verify-delivery',
                  'Enter Recipient Delivery PIN',
                  'Ask the recipient at destination for their 4-digit PIN'
                )}
              >
                <KeyRound size={18} /> Verify Recipient Delivery PIN
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Driver Earnings & Completed Trips Summary */}
      <DriverEarningsSummary completedJobs={completedJobs} presence={presence} />

      {/* 4. Available Job Feed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary, #f8fafc)' }}>
            Available Nearby Dispatches ({availableJobs.length})
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)', margin: '2px 0 0' }}>
            Sorted by straight-line proximity. 1-tap accept.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          loading={loading}
          aria-label="Refresh job feed"
        >
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-danger-50, #fef2f2)',
          border: '1px solid var(--color-danger-200, #fecaca)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '12px 16px',
          marginBottom: 16,
          color: 'var(--color-danger-700, #b91c1c)',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12
        }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Job Feed List */}
      {availableJobs.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No dispatches nearby right now"
          description={presence.online
            ? "You are online! When customers request rides or deliveries in your area, they will appear here with 1-tap accept."
            : "You are currently offline. Tap 'Go Online Now' above to start receiving trips."}
        />
      ) : (
        <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
          {availableJobs.map(job => {
            const Icon = job.serviceType === 'food_delivery' ? PackageCheck : job.serviceType === 'parcel_delivery' ? Package : Bike;
            const fare = Number(job.fare) || Number(job.baseCharge) || 650;

            return (
              <Card key={job.id} style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-sm, 6px)',
                      background: 'var(--color-brand-50, #edf7f2)',
                      color: 'var(--color-brand-600, #174d3d)',
                      display: 'grid',
                      placeItems: 'center'
                    }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <b style={{ fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                        {job.serviceType === 'food_delivery' ? 'Food Order' : job.serviceType === 'parcel_delivery' ? 'Parcel Courier' : 'Passenger Ride'}
                      </b>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400, #94a3b8)', marginLeft: 8 }}>
                        #{job.id.slice(-6)}
                      </span>
                    </div>
                  </div>

                  <b style={{ fontSize: '1.05rem', color: 'var(--color-success-700, #047857)' }}>
                    LKR {fare.toLocaleString()}
                  </b>
                </div>

                <div style={{
                  padding: '10px 12px',
                  background: 'var(--color-surface-subtle, #f8faf8)',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--color-border-subtle, #e5ebe2)',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  marginBottom: 12
                }}>
                  <div><b>Pickup:</b> {job.pickupAddress}</div>
                  <div><b>Dropoff:</b> {job.destinationAddress}</div>
                  {job.distanceKm !== null && (
                    <div style={{ marginTop: 4, color: 'var(--color-brand-700, #174d3d)', fontWeight: 600 }}>
                      <Navigation size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Estimate (straight-line distance): ~{job.distanceKm} km {job.etaMinutes ? `· ~${job.etaMinutes} min away` : ''}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="driver-field-action-btn primary"
                  onClick={() => claimJob(job.id)}
                >
                  <ArrowUpRight size={18} /> Accept Job (1-Tap)
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Driver Stream Networks Management Card */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-neutral-900, #0f172a)' }}>
              Driver Transport Streams
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Select which transportation streams you operate. Compliance review validates your driving license.
            </p>
          </div>
          <Badge variant="brand" dot={false}>
            {selectedServices.length} Active Stream{selectedServices.length === 1 ? '' : 's'}
          </Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {DRIVER_OPTIONS.map(option => {
            const Icon = option.icon;
            const isChecked = selectedServices.includes(option.value);

            return (
              <div
                key={option.value}
                onClick={() => toggleService(option.value)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: isChecked ? '2px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border, #cbd5e1)',
                  background: isChecked ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #fff)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-sm, 6px)',
                  background: isChecked ? 'var(--color-brand-600, #174d3d)' : 'var(--color-neutral-100, #f1f5f9)',
                  color: isChecked ? '#fff' : 'var(--color-neutral-600, #475569)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={16} />
                </div>
                <div>
                  <b style={{ display: 'block', fontSize: '0.88rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                    {option.label}
                  </b>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-neutral-600, #475569)' }}>
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={applyServices}
            disabled={submitting || selectedServices.length === 0}
            loading={submitting}
          >
            Update Active Streams
          </Button>
        </div>
      </Card>

      {/* GPS Permission Modal */}
      <DriverGpsPermissionModal
        isOpen={gpsModalOpen}
        onClose={() => setGpsModalOpen(false)}
        onGrant={executeGoOnlineWithGps}
        isRequesting={presenceBusy}
        error={error}
      />

      {/* Numeric Keypad Modal for PIN verification */}
      <DriverPinKeypadModal
        isOpen={pinModal.isOpen}
        onClose={() => setPinModal(prev => ({ ...prev, isOpen: false }))}
        title={pinModal.title}
        subtitle={pinModal.subtitle}
        error={pinModal.error}
        isVerifying={pinModal.isVerifying}
        onSubmit={handleVerifyPin}
      />

      {/* Release Confirmation Modal */}
      <DriverReleaseModal
        isOpen={releaseModal.isOpen}
        onClose={() => setReleaseModal({ isOpen: false, jobId: null, isReleasing: false })}
        onConfirm={handleConfirmRelease}
        isReleasing={releaseModal.isReleasing}
      />
    </main>
  );
}
