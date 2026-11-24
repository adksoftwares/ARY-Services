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

  const loadRequests = useCallback(async () => {
    if (!currentUser?.token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/admin/provider-service-requests`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load provider service requests.');
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError(err.message || 'Could not load provider service requests.');
      onNotice?.(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser, onNotice]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    return subscribeToAppEvents(currentUser.token, {
      'provider:service_request_created': loadRequests
    });
  }, [currentUser?.token, loadRequests]);

  async function handleReview(item, status) {
    setBusyId(item.id);
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

      onNotice?.(`Service "${item.serviceName}" has been ${status}.`);
      await loadRequests();
    } catch (err) {
      onNotice?.(`Error: ${err.message}`);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
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
          {requests.map(item => {
            const isBusy = busyId === item.id;

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
                        {item.categoryName || 'Trade Category'}
                      </span>
                      <Badge variant="warning" dot={true}>
                        Pending Review
                      </Badge>
                    </div>

                    <h3 style={{ margin: '2px 0 6px', fontSize: '1.15rem', color: 'var(--color-brand-900, #173b2f)' }}>
                      {item.serviceName}
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span>Provider: <b>{item.providerName}</b></span>
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
                  {item.description || 'No service description provided by the partner.'}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleReview(item, 'rejected')}
                  >
                    <XCircle size={14} /> Reject Request
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isBusy}
                    disabled={isBusy}
                    onClick={() => handleReview(item, 'approved')}
                  >
                    <CheckCircle2 size={14} /> Approve & Publish Service
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
