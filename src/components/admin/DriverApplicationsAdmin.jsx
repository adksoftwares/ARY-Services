import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Bike, PackageCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';

export default function DriverApplicationsAdmin() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!currentUser?.token) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_BASE + '/admin/driver-applications', {
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load driver applications.');
      setItems(Array.isArray(data.applications) ? data.applications : []);
    } catch (err) {
      setError(err.message || 'Could not load driver applications.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token]);

  useEffect(() => {
    load();
    return subscribeToAppEvents(currentUser?.token, {
      'driver:application_created': load,
      'driver:application_reviewed': load
    });
  }, [currentUser?.token, load]);

  async function review(id, status) {
    if (!currentUser?.token || busyId !== null) return;
    setBusyId(id);
    setError('');
    try {
      const response = await fetch(API_BASE + '/admin/driver-applications/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + currentUser.token
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update application.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not update application.');
    } finally {
      setBusyId(null);
    }
  }

  function serviceLabels(application) {
    const types = Array.isArray(application.driverTypes)
      ? application.driverTypes
      : application.driverType ? [application.driverType] : [];
    const labels = types.map(type => ({
      ride: 'Passenger rides',
      food_delivery: 'Shop & grocery delivery',
      parcel_delivery: 'Parcel courier'
    }[type] || String(type).replace(/_/g, ' ')));
    return labels.length ? labels : ['Service selection unavailable'];
  }

  return (
    <main style={{ maxWidth: 1000, margin: '35px auto', padding: '0 18px', minHeight: '60vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow">ADMIN CONTROL</span>
          <h1 style={{ fontSize: 36, margin: '8px 0' }}>Driver <em>applications.</em></h1>
          <p style={{ color: '#718076', fontSize: 13, marginTop: 0 }}>
            Review each driver's selected service network. A driver may request approval for multiple services.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} aria-label="Refresh driver applications" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px', border: '1px solid #dbe4dc', borderRadius: 8, background: '#fff', cursor: loading ? 'wait' : 'pointer' }}>
          <RefreshCw size={15} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #efcaca', borderRadius: 9, background: '#fff7f7', color: '#9b2525', margin: '14px 0' }}>
          <span>{error}</span>
          <button type="button" onClick={load} disabled={loading} style={{ border: 0, background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div role="status" aria-live="polite" style={{ padding: 24, border: '1px solid #e5ebe3', borderRadius: 12, color: '#647268', background: '#fff' }}>
          Loading driver applications…
        </div>
      ) : !loading && items.length === 0 ? (
        <div style={{ padding: 30, border: '1px dashed #d5dfd5', borderRadius: 12, textAlign: 'center', background: '#fff' }}>
          <Bike size={26} color="#718076" />
          <b style={{ display: 'block', marginTop: 8 }}>No driver applications</b>
          <span style={{ display: 'block', marginTop: 4, color: '#718076', fontSize: 13 }}>New applications will appear here when drivers submit their service selections.</span>
        </div>
      ) : (
        <div aria-busy={loading} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {items.map(application => {
            const pending = application.status === 'pending';
            const services = serviceLabels(application);
            return (
              <article key={application.id} style={{ padding: 16, border: '1px solid #e5ebe3', borderRadius: 12, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220, flex: 1 }}>
                  <b>{application.driverName || 'Driver name unavailable'}</b>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, margin: '8px 0' }}>
                    {services.map((service, index) => (
                      <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 999, background: '#edf5ef', color: '#285a42', fontSize: 12 }}>
                        {service.toLowerCase().includes('ride') ? <Bike size={12} /> : <PackageCheck size={12} />}
                        {service}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: '#647268' }}>Application status: <b>{application.status || 'Unknown'}</b></span>
                </div>
                {pending ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => review(application.id, 'approved')} disabled={busyId !== null} aria-busy={busyId === application.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#174d3d', color: '#fff', border: 0, borderRadius: 7, padding: '9px 13px', opacity: busyId !== null ? 0.65 : 1, cursor: busyId !== null ? 'wait' : 'pointer' }}>
                      <CheckCircle2 size={14} /> {busyId === application.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button type="button" onClick={() => review(application.id, 'rejected')} disabled={busyId !== null} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#a33', border: '1px solid #e5caca', borderRadius: 7, padding: '9px 13px', opacity: busyId !== null ? 0.65 : 1, cursor: busyId !== null ? 'wait' : 'pointer' }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#647268' }}>No review action available</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
