import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, BriefcaseBusiness, Tag, MapPin, DollarSign, Calendar } from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../../design-system';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAppEvents } from '../../utils/events';

export default function AdminServiceRequests({ onNotice }) {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const canReview = Boolean(currentUser?.token && currentUser.accountType === 'admin');

  const loadRequests = useCallback(async () => {
    if (!canReview) {
      setRequests([]);
      setError(currentUser?.token ? 'Administrator access is required to review service additions.' : 'Sign in with an administrator account to view service additions.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/admin/provider-service-requests`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load provider service requests.');
      setRequests(Array.isArray(data.requests) ? data.requests.filter(item => item && typeof item === 'object' && item.id !== null && item.id !== undefined && item.providerId !== null && item.providerId !== undefined) : []);
    } catch (err) {
      setError(err.message || 'Could not load provider service requests.');
      onNotice?.(`Error: ${err.message || 'Could not review service request.'}`);
    } finally {
      setLoading(false);
    }
  }, [canReview, currentUser, onNotice]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!canReview) return undefined;
    return subscribeToAppEvents(currentUser.token, {
      'provider:service_request_created': loadRequests
    });
  }, [canReview, currentUser?.token, loadRequests]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleRequests = requests.filter(item => [item.serviceName, item.categoryName, item.providerName, item.providerLocation, item.description, item.id].filter(value => value !== null && value !== undefined).some(value => String(value).toLowerCase().includes(normalizedSearch)));

  async function handleReview(item, status) {
    if (!canReview || !item || item.id === null || item.id === undefined || item.providerId === null || item.providerId === undefined || !['approved', 'rejected'].includes(status) || busyId) return;
    const requestKey = `${item.providerId}:${item.id}`;
    setBusyId(requestKey);
    try {
      const response = await fetch(
        `${API_BASE}/admin/provider-service-requests/${encodeURIComponent(item.providerId)}/${encodeURIComponent(item.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ status })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not review service request.');

      onNotice?.(`Service "${item.serviceName || 'requested service'}" has been ${status}.`);
      await loadRequests();
    } catch (err) {
      setError(err.message || 'Could not review service request.');
      onNotice?.(`Error: ${err.message || 'Could not review service request.'}`);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="admin-service-requests-view admin-review-queue" style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header Card */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BriefcaseBusiness size={22} color="var(--color-brand-600, #174d3d)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-900, #173b2f)' }}>
                Provider Service Additions ({requests.length})
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Approve additional trade offerings and specialty services before they appear in public customer search.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={loadRequests} loading={loading}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </Card>

      {error && <div role="alert" style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--color-danger-50, #fef2f2)', color: 'var(--color-danger-700, #b91c1c)', fontSize: '0.85rem' }}>{error}</div>}

      {/* 2. Requests List */}
      {!loading && requests.length > 0 && (
        <Card style={{ padding: '14px 16px' }}>
          <div className="admin-request-search-row">
            <label htmlFor="admin-service-request-search">Search service requests</label>
            <input id="admin-service-request-search" type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Service, provider, category or location…" />
            <span role="status" aria-live="polite" aria-atomic="true">{visibleRequests.length} of {requests.length} requests</span>
            {searchQuery && <Button size="sm" variant="ghost" onClick={() => setSearchQuery('')}>Clear</Button>}
          </div>
        </Card>
      )}
      {loading ? (
        <Card style={{ padding: '28px', color: 'var(--color-neutral-600, #475569)' }}>Loading service requests…</Card>
      ) : requests.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <EmptyState
            icon={BriefcaseBusiness}
            title="No pending service additions"
            description="All provider trade offerings and custom services have been processed."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {visibleRequests.map(item => {
            const requestKey = `${item.providerId}:${item.id}`;
            const isBusy = busyId === requestKey;

            return (
              <Card
                key={item.id}
                style={{
                  padding: '20px',
                  border: '1.5px solid var(--color-brand-200, #b7decb)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand-600, #174d3d)' }}>
                        {typeof item.categoryName === 'string' && item.categoryName.trim() ? item.categoryName : 'Trade Category'}
                      </span>
                      <Badge variant="warning" dot={true}>
                        Pending Review
                      </Badge>
                    </div>

                    <h3 style={{ margin: '2px 0 6px', fontSize: '1.15rem', color: 'var(--color-brand-900, #173b2f)' }}>
                      {typeof item.serviceName === 'string' && item.serviceName.trim() ? item.serviceName : 'Unnamed service request'}
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span>Provider: <b>{item.providerName || 'Provider name unavailable'}</b></span>
                      <span>Location: <b>{item.providerLocation || 'Not provided'}</b></span>
                      <span>Requested: {item.requestedAt && Number.isFinite(Date.parse(item.requestedAt)) ? new Date(item.requestedAt).toLocaleDateString() : 'Date unavailable'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)' }}>Proposed Base Rate</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-brand-700, #174d3d)' }}>
                      {Number.isFinite(Number(item.baseCharge)) && Number(item.baseCharge) > 0 ? `LKR ${Number(item.baseCharge).toLocaleString()}` : 'Quote not specified'}
                    </div>
                  </div>
                </div>

                <div style={{
                  margin: '14px 0',
                  padding: '12px 14px',
                  background: 'var(--color-surface-raised, #f8fafc)',
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.85rem',
                  color: 'var(--color-neutral-700, #334155)',
                  lineHeight: 1.6
                }}>
                  {typeof item.description === 'string' && item.description.trim() ? item.description : 'No service description provided by the partner.'}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={Boolean(busyId)}
                    onClick={() => handleReview(item, 'rejected')}
                  >
                    <XCircle size={14} /> Reject Request
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isBusy}
                    disabled={Boolean(busyId)}
                    onClick={() => handleReview(item, 'approved')}
                  >
                    <CheckCircle2 size={14} /> Approve & Publish Service
                  </Button>
                </div>
              </Card>
            );
          })}
          {visibleRequests.length === 0 && <Card style={{ padding: '28px', textAlign: 'center' }}><EmptyState icon={BriefcaseBusiness} title="No matching requests" description="Try a different service, provider or location search." actionLabel="Clear search" onAction={() => setSearchQuery('')} /></Card>}
        </div>
      )}
    </div>
  );
}
