import React, { useCallback, useEffect, useState } from 'react';
import {
  Bike,
  Utensils,
  MapPin,
  ArrowRight,
  PackageCheck,
  CarFront,
  Navigation,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  User,
  Car
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';
import { Button, Input, Select, Badge, SegmentedControl, Card } from '../../design-system';

export default function MobilityServices({ onNotice }) {
  const { currentUser, openAuthModal } = useAuth();
  const [mode, setMode] = useState('food'); // 'food' | 'ride' | 'parcel'
  const [form, setForm] = useState({
    orderReference: '',
    restaurantName: '',
    pickupAddress: '',
    dropoffAddress: '',
    pickup: '',
    destination: '',
    passengerCount: '1',
    pickupContact: '',
    recipientContact: '',
    parcelType: 'standard',
    weightKg: '1',
    notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedPin, setCopiedPin] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [myJobs, setMyJobs] = useState([]);
  const [jobsError, setJobsError] = useState('');

  const change = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const refreshJobs = useCallback(async () => {
    if (!currentUser?.token) { setMyJobs([]); return; }
    try {
      const response = await fetch(API_BASE + '/my-mobility-jobs', {
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load your ride and delivery requests.');
      setMyJobs(data.jobs || []);
      setJobsError('');
    } catch (err) {
      setJobsError(err.message || 'Could not load your requests.');
    }
  }, [currentUser?.token]);

  useEffect(() => { refreshJobs(); }, [refreshJobs]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    const refresh = () => refreshJobs();
    return subscribeToAppEvents(currentUser?.token, {
      'driver:job_created': refresh,
      'driver:job_updated': refresh,
      'driver:presence_updated': refresh
    });
  }, [currentUser?.token, refreshJobs]);

  async function cancelRequest(jobId) {
    try {
      const response = await fetch(API_BASE + '/my-mobility-jobs/' + encodeURIComponent(jobId) + '/cancel', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not cancel this request.');
      await refreshJobs();
      setMessage('Request cancelled successfully.');
    } catch (err) {
      setJobsError(err.message || 'Could not cancel this request.');
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage('This device does not support GPS location.');
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      setGps({ lat: position.coords.latitude, lng: position.coords.longitude, accuracyM: position.coords.accuracy });
      setGpsBusy(false);
      setMessage('GPS coordinates added to request.');
    }, error => {
      setGpsBusy(false);
      setMessage(error.code === 1 ? 'Location permission was denied.' : 'Could not read GPS location.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  }

  function copyPinToClipboard(pin, label) {
    navigator.clipboard?.writeText(pin);
    setCopiedPin(pin);
    onNotice?.(`Copied ${label} PIN: ${pin}`);
    setTimeout(() => setCopiedPin(null), 2500);
  }

  async function submit(e) {
    e.preventDefault();
    if (!currentUser?.token) { openAuthModal('login'); return; }
    setBusy(true);
    setMessage('');

    const endpoint = mode === 'food' ? '/food-deliveries' : mode === 'parcel' ? '/parcels' : '/ride-trips';
    const payload = mode === 'food'
      ? { orderReference: form.orderReference.trim(), restaurantName: form.restaurantName.trim(), pickupAddress: form.pickupAddress.trim(), dropoffAddress: form.dropoffAddress.trim(), destinationLat: gps?.lat, destinationLng: gps?.lng, notes: form.notes.trim() }
      : mode === 'parcel'
      ? { pickupAddress: form.pickup.trim(), destinationAddress: form.destination.trim(), pickupContact: form.pickupContact.trim(), recipientContact: form.recipientContact.trim(), parcelType: form.parcelType, weightKg: Number(form.weightKg), pickupLat: gps?.lat, pickupLng: gps?.lng, notes: form.notes.trim() }
      : { pickupAddress: form.pickup.trim(), destinationAddress: form.destination.trim(), pickupLat: gps?.lat, pickupLng: gps?.lng, passengerCount: Number(form.passengerCount), notes: form.notes.trim() };

    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + currentUser.token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit request.');

      setMessage(`Request created successfully (ID: #${data.job?.id?.slice(0, 8)})`);
      setForm(old => ({ ...old, orderReference: '', notes: '' }));
      await refreshJobs();
      onNotice?.('Request broadcasted to nearby verified drivers.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Estimated fare calculation
  const estimatedFare = mode === 'food' ? 'LKR 450 - 650' : mode === 'parcel' ? 'LKR 550 - 900' : 'LKR 650 - 1,200';

  return (
    <section className="services-section" id="mobility-services">
      <div className="section-heading">
        <div>
          <div className="eyebrow">DEDICATED DRIVER FLEETS</div>
          <h2>Delivery or a Ride?</h2>
        </div>
        <span className="section-note">Separate driver networks · Verified background checks</span>
      </div>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <SegmentedControl
          options={[
            { id: 'food', label: 'Food Delivery', icon: Utensils },
            { id: 'ride', label: 'Ride Service', icon: CarFront },
            { id: 'parcel', label: 'Parcel Courier', icon: PackageCheck }
          ]}
          value={mode}
          onChange={setMode}
          aria-label="Select Mobility Service Type"
        />
      </div>

      <div className="mobility-grid-layout">
        {/* Form Column */}
        <form onSubmit={submit} className="mobility-form-card">
          <div className="mobility-form-header">
            <b>
              {mode === 'food' ? <Utensils size={18} /> : mode === 'parcel' ? <PackageCheck size={18} /> : <Car size={18} />}
              <span>{mode === 'food' ? 'Food Delivery Driver Request' : mode === 'parcel' ? 'Parcel Courier Request' : 'On-Demand Ride Request'}</span>
            </b>
            <Badge variant="brand" dot={false}>
              Est. Fare: {estimatedFare}
            </Badge>
          </div>

          {mode === 'food' && (
            <>
              <p className="mobility-hint-text">
                Place an order with your food shop first. Once accepted, enter the booking ID to dispatch a dedicated food delivery driver.
              </p>
              <Input
                label="Food Shop Order Reference *"
                required={true}
                value={form.orderReference}
                onChange={e => change('orderReference', e.target.value)}
                placeholder="Paste order booking ID"
              />
              <Input
                label="Restaurant / Food Shop Name *"
                required={true}
                value={form.restaurantName}
                onChange={e => change('restaurantName', e.target.value)}
                placeholder="Restaurant name"
              />
              <Input
                label="Pickup Address *"
                required={true}
                value={form.pickupAddress}
                onChange={e => change('pickupAddress', e.target.value)}
                placeholder="Restaurant location"
                icon={MapPin}
              />
              <Input
                label="Delivery Address *"
                required={true}
                value={form.dropoffAddress}
                onChange={e => change('dropoffAddress', e.target.value)}
                placeholder="Where should food be delivered?"
                icon={MapPin}
              />
            </>
          )}

          {mode === 'parcel' && (
            <>
              <Input
                label="Sender Pickup Address *"
                required={true}
                value={form.pickup}
                onChange={e => change('pickup', e.target.value)}
                placeholder="Address where parcel is collected"
                icon={MapPin}
              />
              <Input
                label="Recipient Destination Address *"
                required={true}
                value={form.destination}
                onChange={e => change('destination', e.target.value)}
                placeholder="Recipient address"
                icon={MapPin}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Input
                  label="Sender Contact *"
                  required={true}
                  type="tel"
                  value={form.pickupContact}
                  onChange={e => change('pickupContact', e.target.value)}
                  placeholder="07X XXX XXXX"
                />
                <Input
                  label="Recipient Contact *"
                  required={true}
                  type="tel"
                  value={form.recipientContact}
                  onChange={e => change('recipientContact', e.target.value)}
                  placeholder="07X XXX XXXX"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Select
                  label="Parcel Type"
                  value={form.parcelType}
                  onChange={e => change('parcelType', e.target.value)}
                  options={[
                    { value: 'document', label: 'Document' },
                    { value: 'small', label: 'Small Box (< 2kg)' },
                    { value: 'standard', label: 'Standard Parcel' },
                    { value: 'fragile', label: 'Fragile Package' }
                  ]}
                />
                <Input
                  label="Weight (kg) *"
                  type="number"
                  min="0.1"
                  max="50"
                  step="0.1"
                  value={form.weightKg}
                  onChange={e => change('weightKg', e.target.value)}
                />
              </div>
            </>
          )}

          {mode === 'ride' && (
            <>
              <Input
                label="Pickup Location *"
                required={true}
                value={form.pickup}
                onChange={e => change('pickup', e.target.value)}
                placeholder="Where should driver pick you up?"
                icon={MapPin}
              />
              <Input
                label="Destination Location *"
                required={true}
                value={form.destination}
                onChange={e => change('destination', e.target.value)}
                placeholder="Where are you heading?"
                icon={MapPin}
              />
              <Select
                label="Number of Passengers"
                value={form.passengerCount}
                onChange={e => change('passengerCount', e.target.value)}
                options={[
                  { value: '1', label: '1 Passenger' },
                  { value: '2', label: '2 Passengers' },
                  { value: '3', label: '3 Passengers' },
                  { value: '4', label: '4 Passengers' }
                ]}
              />
            </>
          )}

          <div className="gps-location-bar">
            <span className="gps-accuracy-label">
              {gps ? `GPS Attached (±${Math.round(gps.accuracyM || 0)} m accuracy)` : 'GPS coordinates are optional.'}
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={Navigation}
              onClick={useCurrentLocation}
              loading={gpsBusy}
            >
              {gps ? 'Refresh GPS' : 'Attach GPS'}
            </Button>
          </div>

          <Input
            label="Driver Notes (Optional)"
            value={form.notes}
            onChange={e => change('notes', e.target.value)}
            placeholder="e.g. Near yellow gate, gate code #1234"
          />

          {message && (
            <div className={`ds-toast ${message.includes('created') ? 'ds-toast-success' : 'ds-toast-info'}`} style={{ width: '100%' }}>
              <span>{message}</span>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            type="submit"
            fullWidth={true}
            loading={busy}
            iconRight={ArrowRight}
          >
            {busy ? 'Broadcasting...' : mode === 'food' ? 'Find Delivery Driver' : mode === 'parcel' ? 'Dispatch Parcel Driver' : 'Request Ride Driver'}
          </Button>
        </form>

        {/* Side Info Column */}
        <aside className="mobility-info-sidebar">
          <div className="mobility-info-header">
            <div className="info-icon-badge">
              {mode === 'food' ? <Utensils size={24} /> : mode === 'parcel' ? <PackageCheck size={24} /> : <CarFront size={24} />}
            </div>
            <h3>{mode === 'food' ? 'Food Delivery Network' : mode === 'parcel' ? 'Direct Courier Fleet' : 'On-Demand Rides'}</h3>
          </div>

          <p className="mobility-info-body">
            {mode === 'food'
              ? 'Our food delivery drivers only handle restaurant pickups and meal deliveries to ensure timely and hygienic service.'
              : mode === 'parcel'
              ? 'Real-time peer-to-peer parcel courier with mandatory recipient verification PIN before package release.'
              : 'Direct point-to-point passenger transport with upfront fare estimate and 4-digit ride start PIN.'}
          </p>

          <div className="pin-security-callout">
            <ShieldCheck size={18} className="callout-icon" />
            <div>
              <b>Secure 4-Digit PIN Handoff</b>
              <p>Every trip and delivery generates a unique verification PIN. Never share your PIN until the package is handed over or the ride begins.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Active Requests List */}
      {currentUser?.token && myJobs.length > 0 && (
        <section className="active-mobility-feed">
          <div className="section-heading" style={{ marginTop: 'var(--space-8)' }}>
            <div>
              <div className="eyebrow">YOUR DISPATCH STATUS</div>
              <h3>Active Mobility & Deliveries ({myJobs.length})</h3>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={refreshJobs}>
              Refresh Status
            </Button>
          </div>

          {jobsError && (
            <div className="ds-toast ds-toast-error" style={{ marginBottom: 'var(--space-4)' }}>
              <span>{jobsError}</span>
            </div>
          )}

          <div className="mobility-jobs-list">
            {myJobs.map(job => {
              const isAssigned = Boolean(job.driverName);
              const isRequested = job.status === 'requested';

              return (
                <div key={job.id} className="mobility-job-card">
                  <div className="mobility-job-top">
                    <div>
                      <b className="mobility-job-title">
                        {job.serviceType === 'food_delivery' ? 'Food Delivery' : job.serviceType === 'parcel_delivery' ? 'Parcel Courier' : 'Ride Trip'}
                      </b>
                      <span className="mobility-job-id">#{job.id?.slice(0, 8)}</span>
                    </div>
                    <Badge variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'brand' : 'warning'}>
                      {String(job.status || 'requested').replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="mobility-route-box">
                    <div className="route-point">
                      <MapPin size={15} className="pickup-pin" />
                      <span><b>Pickup:</b> {job.pickupAddress}</span>
                    </div>
                    <div className="route-point">
                      <MapPin size={15} className="dest-pin" />
                      <span><b>Drop-off:</b> {job.destinationAddress}</span>
                    </div>
                  </div>

                  {job.driverName && (
                    <div className="driver-assigned-strip">
                      <User size={15} />
                      <span>Assigned Driver: <b>{job.driverName}</b></span>
                    </div>
                  )}

                  {/* High Contrast PIN Display Card */}
                  {(job.startPin || job.pickupPin || job.deliveryPin) && (
                    <div className="pin-handoff-card">
                      <div className="pin-card-header">
                        <ShieldCheck size={16} />
                        <span>Handoff Verification PINs (Share at handover)</span>
                      </div>
                      <div className="pin-card-items">
                        {job.startPin && (
                          <div className="pin-pill-box">
                            <span className="pin-type">Trip Start</span>
                            <span className="pin-code">{job.startPin}</span>
                            <button
                              type="button"
                              className="pin-copy-btn"
                              onClick={() => copyPinToClipboard(job.startPin, 'Trip Start')}
                              aria-label="Copy start PIN"
                            >
                              {copiedPin === job.startPin ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                        {job.pickupPin && (
                          <div className="pin-pill-box">
                            <span className="pin-type">Pickup</span>
                            <span className="pin-code">{job.pickupPin}</span>
                            <button
                              type="button"
                              className="pin-copy-btn"
                              onClick={() => copyPinToClipboard(job.pickupPin, 'Pickup')}
                              aria-label="Copy pickup PIN"
                            >
                              {copiedPin === job.pickupPin ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                        {job.deliveryPin && (
                          <div className="pin-pill-box">
                            <span className="pin-type">Delivery / Release</span>
                            <span className="pin-code">{job.deliveryPin}</span>
                            <button
                              type="button"
                              className="pin-copy-btn"
                              onClick={() => copyPinToClipboard(job.deliveryPin, 'Delivery')}
                              aria-label="Copy delivery PIN"
                            >
                              {copiedPin === job.deliveryPin ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isRequested && (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => cancelRequest(job.id)}
                      >
                        Cancel Request
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
