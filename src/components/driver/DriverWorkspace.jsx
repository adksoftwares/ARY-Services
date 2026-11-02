import React, { useCallback, useEffect, useState } from 'react';
import {
  Bike,
  PackageCheck,
  RefreshCw,
  CheckCircle2,
  MapPin,
  ArrowUpRight,
  Package,
  AlertTriangle,
  Sun,
  ShieldCheck,
  Navigation,
  Compass,
  Phone,
  Power,
  KeyRound,
  Flag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';
import { Card, Badge, Button, StatusPill, EmptyState, Stepper } from '../../design-system';
import DriverPinKeypadModal from './DriverPinKeypadModal';
import DriverReleaseModal from './DriverReleaseModal';
import DriverEarningsSummary from './DriverEarningsSummary';

const DRIVER_OPTIONS = [
  { value: 'ride', label: 'Passenger Rides', description: 'Accept and complete passenger trips', icon: Bike },
  { value: 'food_delivery', label: 'Food Delivery', description: 'Collect restaurant orders and deliver to customers', icon: PackageCheck },
  { value: 'parcel_delivery', label: 'Parcel Courier', description: 'Collect and deliver parcels with 2-point PIN confirmation', icon: Package }
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
      setError(err.message || 'Could not load driver jobs.');
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

  async function toggleOnline() {
    if (!currentUser?.token || presenceBusy) return;
    setPresenceBusy(true);
    setError('');
    try {
      if (presence.online) {
        await savePresence(false);
        onNotice?.('You are now offline. Location sharing has stopped.');
      } else {
        if (!navigator.geolocation) throw new Error('This device does not support GPS location.');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 10000
        }));
        await savePresence(true, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy
        });
        onNotice?.('You are now online! Nearby jobs sorted by straight-line distance will appear.');
      }
      await refresh();
    } catch (err) {
      setError(err.code === 1 ? 'Location permission was denied. Please allow GPS location in browser/device settings to go online.' : err.message || 'Could not update availability.');
    } finally {
      setPresenceBusy(false);
    }
  }

  // Live GPS tracking watcher
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
        setError(err.message || 'Live GPS update failed.');
      }
    }, err => {
      setError(err.code === 1 ? 'Location permission was revoked. Please re-enable GPS to stay online.' : 'GPS signal is temporarily weak or unavailable.');
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [presence.online, currentUser?.token]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    return subscribeToAppEvents(currentUser?.token, {
      'driver:job_created': refresh,
      'driver:job_updated': refresh,
      'driver:application_reviewed': refresh
    });
  }, [currentUser?.token, refresh]);

  function toggleService(value) {
    setSelectedServices(previous => previous.includes(value)
      ? previous.filter(item => item !== value)
      : [...previous, value]
    );
  }

  async function apply() {
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
      onNotice?.('Your selected driver services have been submitted for Admin approval.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not submit driver application.');
    } finally {
      setSubmitting(false);
    }
  }

  async function claim(id) {
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(id)}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not accept this job.');
      await refresh();
      onNotice?.('Job accepted! Navigate to the pickup address.');
    } catch (err) {
      setError(err.message || 'Could not accept this job.');
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
      onNotice?.('Job released before pickup.');
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
      onNotice?.('PIN verified successfully! Job status updated.');
    } catch (err) {
      setPinModal(prev => ({ ...prev, isVerifying: false, error: err.message || 'Incorrect PIN.' }));
      throw err;
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
      onNotice?.(status === 'completed' ? 'Trip completed! Payout credited to your balance.' : 'Job progress updated.');
    } catch (err) {
      setError(err.message || 'Could not update job.');
    }
  }

  // Check if GPS is stale (> 45s without update while online)
  const isGpsStale = presence.online && presence.updatedAt && (Date.now() - new Date(presence.updatedAt).getTime() > 45000);

  // Proximity sorting (ascending distanceKm)
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      return (Number(a.distanceKm) || 0) - (Number(b.distanceKm) || 0);
    }
    return 0;
  });

  const completedJobs = jobs.filter(j => ['completed', 'delivered'].includes(j.status));

  return (
    <main className="driver-workspace" style={{ maxWidth: 1040, margin: '24px auto', padding: '0 16px', minHeight: '80vh' }}>
      {/* 1. Glanceable Online/Offline Master Switch */}
      <Card style={{
        padding: '20px',
        marginBottom: '20px',
        background: presence.online ? 'linear-gradient(135deg, var(--color-brand-900, #0c2d23) 0%, var(--color-brand-800, #154636) 100%)' : 'var(--color-surface, #fff)',
        color: presence.online ? '#fff' : 'inherit',
        border: presence.online ? 'none' : '1px solid var(--color-border-subtle, #e2e8f0)',
        boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,0.06))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: presence.online ? '#4ade80' : '#94a3b8',
                boxShadow: presence.online ? '0 0 10px #4ade80' : 'none'
              }} />
              <b style={{ fontSize: '1.25rem', color: presence.online ? '#fff' : 'var(--color-neutral-900, #0f172a)' }}>
                {presence.online ? 'You are ONLINE for Dispatch' : 'You are currently OFFLINE'}
              </b>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: presence.online ? '#c7dfd4' : 'var(--color-neutral-600, #475569)', lineHeight: 1.5 }}>
              {presence.online
                ? 'High-precision GPS active. Broadcast jobs are dispatched based on straight-line proximity.'
                : 'Turn on your availability to receive nearby rides and food delivery requests.'}
            </p>
            {presence.online && presence.updatedAt && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                <span style={{ color: '#a7d5be' }}>
                  Last GPS ping: {new Date(presence.updatedAt).toLocaleTimeString()}
                </span>
                {isGpsStale && (
                  <Badge variant="warning" dot={true}>
                    ⚠️ Stale GPS signal - keep screen awake
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Button
            variant={presence.online ? 'danger' : 'accent'}
            size="lg"
            onClick={toggleOnline}
            disabled={presenceBusy}
            loading={presenceBusy}
            style={{ minWidth: 160, minHeight: 52, fontSize: '1rem', fontWeight: 800 }}
          >
            <Power size={18} style={{ marginRight: 6 }} />
            {presence.online ? 'Go Offline' : 'Go Online Now'}
          </Button>
        </div>
      </Card>

      {/* 2. Driver Earnings KPI Summary */}
      <DriverEarningsSummary completedJobs={completedJobs} presence={presence} />

      {/* 3. Driver Service Networks Selection Card */}
      <Card style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
              Eligible Driver Service Networks
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)' }}>
              Select which transportation streams you operate in Sri Lanka. Admin verification confirms your driving license.
            </p>
          </div>
          <Badge variant="neutral" dot={false}>
            {selectedServices.length} Network{selectedServices.length === 1 ? '' : 's'} Active
          </Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
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
                  gap: 12,
                  padding: '14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: isChecked ? '2px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border, #cbd5e1)',
                  background: isChecked ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #fff)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
              >
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-sm, 6px)',
                  background: isChecked ? 'var(--color-brand-600, #174d3d)' : 'var(--color-neutral-100, #f1f5f9)',
                  color: isChecked ? '#fff' : 'var(--color-neutral-600, #475569)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={18} />
                </div>
                <div>
                  <b style={{ display: 'block', fontSize: '0.92rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                    {option.label}
                  </b>
                  <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-600, #475569)', lineHeight: 1.4 }}>
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={apply}
            disabled={submitting || selectedServices.length === 0}
            loading={submitting}
          >
            Update & Submit Services
          </Button>
        </div>
      </Card>

      {/* 4. Jobs Feed Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-brand-900, #173b2f)' }}>
            Available & Active Jobs ({jobs.length})
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)', margin: '2px 0 0' }}>
            Sorted by nearest proximity (straight-line distance). Auto-refreshes on dispatch changes.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          loading={loading}
          aria-label="Refresh available driver jobs"
        >
          <RefreshCw size={15} /> Refresh
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
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {/* 5. Jobs List */}
      {sortedJobs.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No driver jobs in your area right now"
          description="Ensure you are online with GPS enabled. When customers request rides or grocery orders in your vicinity, they will appear here with 1-tap accept."
        />
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {sortedJobs.map(job => {
            const isCompleted = ['completed', 'delivered'].includes(job.status);

            return (
              <Card key={job.id} style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
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
                      {job.serviceType === 'food_delivery' ? <PackageCheck size={18} /> : <Bike size={18} />}
                    </div>
                    <div>
                      <b style={{ fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                        {job.serviceType === 'food_delivery' ? 'Food Delivery' : job.serviceType === 'parcel_delivery' ? 'Parcel Courier' : 'Passenger Ride'}
                      </b>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-400, #94a3b8)', marginLeft: 8 }}>
                        Job Ref: #{job.id}
                      </span>
                    </div>
                  </div>

                  <StatusPill status={job.status || 'requested'} />
                </div>

                {/* Pickup & Destination Address Route */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-neutral-50, #f8fafc)',
                  border: '1px solid var(--color-border-subtle, #f1f5f9)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  marginBottom: 14
                }}>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem' }}>PICKUP: </span>
                    <b style={{ color: 'var(--color-neutral-800, #1e293b)' }}>{job.pickupAddress}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem' }}>DESTINATION: </span>
                    <b style={{ color: 'var(--color-neutral-800, #1e293b)' }}>{job.destinationAddress}</b>
                  </div>
                  {job.distanceKm !== null && job.distanceKm !== undefined && (
                    <div style={{ marginTop: 4, color: 'var(--color-brand-700, #174d3d)', fontWeight: 600, fontSize: '0.8rem' }}>
                      <Navigation size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Proximity: {job.distanceKm} km (straight-line distance) {job.etaMinutes ? `· ~${job.etaMinutes} min away` : ''}
                    </div>
                  )}
                </div>

                {/* One-Handed Big Action Buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {job.status === 'requested' && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => claim(job.id)}
                      style={{ minHeight: 48, fontWeight: 700 }}
                    >
                      <ArrowUpRight size={18} /> Accept Job (1-Tap)
                    </Button>
                  )}

                  {job.status === 'accepted' && (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => updateStatus(job.id, job.serviceType === 'ride' ? 'arrived' : 'arrived_pickup')}
                        style={{ minHeight: 48 }}
                      >
                        <MapPin size={16} /> Arrived at Pickup
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setReleaseModal({ isOpen: true, jobId: job.id, isReleasing: false })}
                      >
                        Release Job
                      </Button>
                    </>
                  )}

                  {['arrived', 'arrived_pickup'].includes(job.status) && (
                    <Button
                      variant="accent"
                      size="lg"
                      onClick={() => openPinModal(
                        job.id,
                        'verify-pickup',
                        'Enter Pickup PIN',
                        'Ask the customer / merchant for their 4-digit security PIN'
                      )}
                      style={{ minHeight: 48 }}
                    >
                      <KeyRound size={16} /> Enter Pickup PIN
                    </Button>
                  )}

                  {job.status === 'picked_up' && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => updateStatus(job.id, 'in_transit')}
                      style={{ minHeight: 48 }}
                    >
                      <Navigation size={16} /> Start Delivery / Transit
                    </Button>
                  )}

                  {job.status === 'in_progress' && (
                    <Button
                      variant="accent"
                      size="lg"
                      onClick={() => openPinModal(
                        job.id,
                        'verify-delivery',
                        'Enter Passenger Completion PIN',
                        'Ask the passenger for the 4-digit ride completion PIN'
                      )}
                      style={{ minHeight: 48 }}
                    >
                      <KeyRound size={16} /> Complete Ride · Verify PIN
                    </Button>
                  )}

                  {job.status === 'in_transit' && (
                    <Button
                      variant="accent"
                      size="lg"
                      onClick={() => openPinModal(
                        job.id,
                        'verify-delivery',
                        'Enter Recipient Delivery PIN',
                        'Ask the recipient at the destination for their 4-digit PIN'
                      )}
                      style={{ minHeight: 48 }}
                    >
                      <KeyRound size={16} /> Verify Recipient PIN
                    </Button>
                  )}

                  {isCompleted && (
                    <Badge variant="success" dot={false}>
                      <CheckCircle2 size={14} /> Completed & Settled
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Numeric Keypad Modal for PIN */}
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
