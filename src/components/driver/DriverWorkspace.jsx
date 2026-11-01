import React, { useCallback, useEffect, useState } from 'react';
import { Bike, PackageCheck, RefreshCw, CheckCircle2, MapPin, ArrowUpRight, Power, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

const DRIVER_OPTIONS = [
  { value: 'ride', label: 'Passenger rides', description: 'Accept and complete passenger trips', icon: Bike },
  { value: 'food_delivery', label: 'Food delivery', description: 'Collect orders and deliver them to customers', icon: PackageCheck },\n  { value: 'parcel_delivery', label: 'Parcel delivery', description: 'Collect and deliver customer parcels', icon: Package }
];

export default function DriverWorkspace({ onNotice }) {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedServices, setSelectedServices] = useState(
    currentUser?.driverServices?.length ? currentUser.driverServices : ['food_delivery']
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');\n  const [online, setOnline] = useState(false);\n  const [availabilityBusy, setAvailabilityBusy] = useState(false);

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
      setJobs(data.jobs || []);\n      setOnline(Boolean(data.online));
    } catch (err) {
      setError(err.message || 'Could not load driver jobs.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    const events = new EventSource(`${API_BASE}/events`);
    const updateEvents = ['driver:job_created', 'driver:job_updated', 'driver:application_reviewed'];
    updateEvents.forEach(eventName => events.addEventListener(eventName, refresh));
    return () => {
      updateEvents.forEach(eventName => events.removeEventListener(eventName, refresh));
      events.close();
    };
  }, [currentUser?.token, refresh]);

  async function setAvailability(nextOnline) {
    setAvailabilityBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/driver/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ online: nextOnline })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update availability.');
      setOnline(Boolean(data.availability?.online));
      onNotice?.(nextOnline ? 'You are online and eligible for approved jobs.' : 'You are offline and will not receive new job offers.');
      await refresh();
    } catch (err) { setError(err.message || 'Could not update availability.'); }
    finally { setAvailabilityBusy(false); }
  }

  async function verifyPin(jobId, endpoint, promptText) {
    const pin = window.prompt(promptText);
    if (!pin) return;
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(jobId)}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ pin: pin.trim() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'PIN verification failed.');
      await refresh();
      onNotice?.('PIN verified. Job status updated.');
    } catch (err) { setError(err.message || 'PIN verification failed.'); }
  }

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
      onNotice?.('Job accepted. You can now update its progress.');
    } catch (err) {
      setError(err.message || 'Could not accept this job.');
    }
  }

  async function update(id, status) {
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update job.');
      await refresh();
      onNotice?.(status === 'completed' ? 'Trip / delivery completed.' : 'Job progress updated.');
    } catch (err) {
      setError(err.message || 'Could not update job.');
    }
  }

  return (
    <main style={{ maxWidth: 1050, margin: '35px auto', padding: '0 18px', minHeight: '60vh' }}>
      <span className="eyebrow">DRIVER OPERATIONS</span>
      <h1 style={{ fontSize: 38 }}>Driver <em>workspace.</em></h1>
      <section style={{ padding: 22, border: '1px solid #e5ebe3', borderRadius: 16, background: '#fff', margin: '22px 0', boxShadow: '0 8px 24px rgba(24,55,39,.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ marginBottom: 6 }}>Choose your driver services</h3>
            <p style={{ fontSize: 13, color: '#6d786f', lineHeight: 1.6, marginBottom: 16 }}>
              Select the networks you want to work with. Admin approval is required separately before you can receive eligible jobs.
            </p>
          </div>
          <span className="status-pill muted">Approval required</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {DRIVER_OPTIONS.map(option => {
            const Icon = option.icon;
            const checked = selectedServices.includes(option.value);
            return (
              <label key={option.value} style={{ display: 'flex', alignItems: 'start', gap: 12, padding: 15, border: `1px solid ${checked ? '#9ab9a3' : '#e5ebe3'}`, borderRadius: 12, background: checked ? '#f3f8f3' : '#fff', cursor: 'pointer' }}>
                <input type="checkbox" checked={checked} onChange={() => toggleService(option.value)} style={{ marginTop: 4, accentColor: '#174d3d' }}/>
                <span style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#eaf2eb', color: '#174d3d', flexShrink: 0 }}><Icon size={18}/></span>
                <span><b style={{ display: 'block', fontSize: 13, color: '#263b31' }}>{option.label}</b><small style={{ display: 'block', color: '#788078', lineHeight: 1.5, marginTop: 4 }}>{option.description}</small></span>
              </label>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={{ fontSize: 12, color: '#788078' }}>{selectedServices.length} service network{selectedServices.length === 1 ? '' : 's'} selected</span>
          <button onClick={apply} disabled={submitting || selectedServices.length === 0} style={{ padding: '11px 17px', border: 0, borderRadius: 9, background: selectedServices.length ? '#174d3d' : '#aab7ad', color: '#fff', fontWeight: 700, cursor: selectedServices.length ? 'pointer' : 'not-allowed' }}>
            {submitting ? 'Submitting…' : 'Submit selected services'}
          </button>
        </div>
      </section>

      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 16, margin: '0 0 22px', border: '1px solid #e5ebe3', borderRadius: 14, background: online ? '#f0f8f1' : '#fff' }}>
        <div><b style={{ color: '#263b31' }}>Driver availability</b><p style={{ margin: '4px 0 0', color: '#6d786f', fontSize: 12 }}>{online ? 'You are visible to dispatch for approved services.' : 'Go online when you are ready to receive jobs.'}</p></div>
        <button onClick={() => setAvailability(!online)} disabled={availabilityBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 0, borderRadius: 9, padding: '11px 16px', color: '#fff', background: online ? '#9a3d36' : '#174d3d', fontWeight: 700, cursor: availabilityBusy ? 'wait' : 'pointer' }}><Power size={16}/>{availabilityBusy ? 'Updating…' : online ? 'Go offline' : 'Go online'}</button>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div><h2 style={{ fontSize: 22, margin: 0 }}>Available and assigned jobs</h2><p style={{ fontSize: 12, color: '#788078', margin: '5px 0 0' }}>New jobs refresh automatically when the dispatch system sends an update.</p></div>
        <button onClick={refresh} disabled={loading} aria-label="Refresh jobs" style={{ padding: 10, border: '1px solid #dce5dc', borderRadius: 9, background: '#fff', color: '#174d3d' }}><RefreshCw size={16}/></button>
      </div>
      {error && <p role="alert" style={{ color: '#a33', background: '#fff4f2', border: '1px solid #f2d1ca', padding: 12, borderRadius: 9 }}>{error}</p>}
      {loading ? <p style={{ color: '#788078' }}>Loading jobs…</p> : jobs.length === 0 ? (
        <section style={{ padding: 28, textAlign: 'center', border: '1px dashed #dce5dc', borderRadius: 14, background: '#fff' }}>
          <MapPin size={24} color="#78917d"/>
          <h3 style={{ margin: '10px 0 5px', fontSize: 16 }}>No jobs available right now</h3>
          <p style={{ color: '#788078', fontSize: 13, margin: 0 }}>Approved jobs for your selected service networks will appear here.</p>
        </section>
      ) : jobs.map(job => (
        <article key={job.id} style={{ padding: 18, border: '1px solid #e5ebe3', borderRadius: 14, background: '#fff', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <b style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#263b31' }}>
              {job.serviceType === 'food_delivery' ? <PackageCheck size={17}/> : <Bike size={17}/>}
              {job.serviceType === 'food_delivery' ? 'Food Delivery' : job.serviceType === 'parcel_delivery' ? 'Parcel Delivery' : 'Passenger Ride'} · {job.id}
            </b>
            <span className="status-pill muted">{String(job.status || 'requested').replaceAll('_', ' ')}</span>
          </div>
          <p style={{ fontSize: 13, color: '#68756b', lineHeight: 1.7, margin: '12px 0' }}>
            <b>Pickup:</b> {job.pickupAddress}<br/><b>Drop-off:</b> {job.destinationAddress}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {job.status === 'requested' && <button onClick={() => claim(job.id)} disabled={!online} className="register-nav-btn">Accept job <ArrowUpRight size={14}/></button>}
            {job.status === 'accepted' && <button onClick={() => update(job.id, job.serviceType === 'ride' ? 'arrived' : 'arrived_pickup')} className="register-nav-btn">Arrived at pickup</button>}
            {['arrived', 'arrived_pickup'].includes(job.status) && <button onClick={() => verifyPin(job.id, 'verify-pickup', 'Enter the customer pickup PIN')} className="register-nav-btn">Verify pickup PIN</button>}
            {job.status === 'in_progress' && <button onClick={() => verifyPin(job.id, 'verify-delivery', 'Enter the customer trip completion PIN')} className="register-nav-btn">Complete trip · verify PIN</button>}
            {job.status === 'picked_up' && <button onClick={() => update(job.id, 'in_transit')} className="register-nav-btn">Start delivery</button>}
            {job.status === 'in_transit' && <button onClick={() => verifyPin(job.id, 'verify-delivery', 'Enter recipient delivery PIN')} className="register-nav-btn">Verify delivery PIN</button>}
            {['completed', 'delivered'].includes(job.status) && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#27724b', fontSize: 12 }}><CheckCircle2 size={15}/> Completed</span>}
          </div>
        </article>
      ))}
    </main>
  );
}
