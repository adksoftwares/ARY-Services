import React, { useCallback, useEffect, useState } from 'react';
import { Bike, PackageCheck, RefreshCw, CheckCircle2, MapPin, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

const DRIVER_OPTIONS = [
  { value: 'ride', label: 'Passenger rides', description: 'Accept and complete passenger trips', icon: Bike },
  { value: 'food_delivery', label: 'Food delivery', description: 'Collect orders and deliver them to customers', icon: PackageCheck }
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
        if (!navigator.geolocation) throw new Error('This browser does not support GPS location.');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 15000, maximumAge: 10000
        }));
        await savePresence(true, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy
        });
        onNotice?.('You are online. Nearby eligible jobs will appear here.');
      }
      await refresh();
    } catch (err) {
      setError(err.code === 1 ? 'Location permission is required to go online.' : err.message || 'Could not update availability.');
    } finally {
      setPresenceBusy(false);
    }
  }

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
        setError(err.message || 'Live location update failed.');
      }
    }, err => {
      setError(err.code === 1 ? 'Location permission was revoked. Switch offline and re-enable location to continue.' : 'GPS signal is temporarily unavailable.');
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [presence.online, currentUser?.token]);

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

  async function releaseJob(id) {
    const reason = window.prompt('Optional reason for releasing this job (before pickup):') || '';
    try {
      const response = await fetch(`${API_BASE}/driver-jobs/${encodeURIComponent(id)}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ reason })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not release this job.');
      await refresh();
      onNotice?.('Job released before pickup.');
    } catch (err) {
      setError(err.message || 'Could not release this job.');
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

      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 16, border: '1px solid #e5ebe3', borderRadius: 14, background: presence.online ? '#eff8f0' : '#fff', marginBottom: 20 }}>
        <div>
          <b style={{ color: '#263b31' }}>Driver availability</b>
          <p style={{ margin: '5px 0 0', color: '#718076', fontSize: 12 }}>{presence.online ? 'Live location is being shared while this page remains open.' : 'Go online to receive nearby eligible jobs. Your browser will ask for GPS permission.'}</p>
          {presence.online && presence.updatedAt && <small style={{ color: '#718076' }}>Last location update: {new Date(presence.updatedAt).toLocaleTimeString()}</small>}
        </div>
        <button type="button" onClick={toggleOnline} disabled={presenceBusy} style={{ border: 0, borderRadius: 9, padding: '11px 17px', background: presence.online ? '#8a3434' : '#174d3d', color: '#fff', fontWeight: 700 }}>
          {presenceBusy ? 'Updating…' : presence.online ? 'Go offline' : 'Go online'}
        </button>
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
              {job.serviceType === 'food_delivery' ? 'Food Delivery' : 'Passenger Ride'} · {job.id}
            </b>
            <span className="status-pill muted">{String(job.status || 'requested').replaceAll('_', ' ')}</span>
          </div>
          <p style={{ fontSize: 13, color: '#68756b', lineHeight: 1.7, margin: '12px 0' }}>
            <b>Pickup:</b> {job.pickupAddress}<br/><b>Drop-off:</b> {job.destinationAddress}
            {job.distanceKm !== null && job.distanceKm !== undefined && <><br/><b>Distance to {job.serviceType === 'food_delivery' ? 'customer' : 'pickup'}:</b> {job.distanceKm} km {job.etaMinutes ? `· about ${job.etaMinutes} min` : ''}</>}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {job.status === 'requested' && <button onClick={() => claim(job.id)} className="register-nav-btn">Accept job <ArrowUpRight size={14}/></button>}
            {job.status === 'accepted' && <>
              <button onClick={() => update(job.id, 'picked_up')} className="register-nav-btn">Picked up / passenger onboard</button>
              <button onClick={() => releaseJob(job.id)} type="button" style={{border:'1px solid #e6caca',borderRadius:8,padding:'9px 12px',background:'#fff',color:'#a33',fontWeight:700}}>Release job</button>
            </>}
            {job.status === 'picked_up' && <button onClick={() => update(job.id, 'completed')} className="register-nav-btn">Complete trip / delivery</button>}
            {job.status === 'completed' && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#27724b', fontSize: 12 }}><CheckCircle2 size={15}/> Completed</span>}
          </div>
        </article>
      ))}
    </main>
  );
}
