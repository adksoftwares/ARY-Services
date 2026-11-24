import React, { useCallback, useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  Plus,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Info,
  ShieldCheck,
  X
} from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAppEvents } from '../../utils/events';
import { Card, Badge, Button, Modal, StatusPill, EmptyState, Skeleton } from '../../design-system';

function formatLkr(value) {
  if (value === null || value === undefined || value === '') return 'Rate not provided';
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? `LKR ${amount.toLocaleString('en-LK')}`
    : 'Rate not provided';
}

const categories = [
  { slug: 'food-shops', name: 'Food Shops & Catering' },
  { slug: 'electrical-repair', name: 'Electrical & Appliances' },
  { slug: 'plumbing', name: 'Plumbing & Water Systems' },
  { slug: 'grocery-products', name: 'Grocery & Essentials' },
  { slug: 'other-services', name: 'Masonry, Painting & Carpentry' }
];

export default function ProviderServicesManager() {
  const { currentUser } = useAuth();
  const [data, setData] = useState({ primaryCategory: {}, approvedServices: [], requests: [] });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categorySlug, setCategorySlug] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [baseCharge, setBaseCharge] = useState('');
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!currentUser?.token) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/providers/services/mine`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not load your service approvals.');
      setData({
        primaryCategory: result.primaryCategory || {},
        approvedServices: Array.isArray(result.approvedServices) ? result.approvedServices : [],
        requests: Array.isArray(result.requests) ? result.requests : []
      });
      setError('');
      if (!categorySlug) {
        const primary = categories.find(item => item.slug === result.primaryCategory?.categorySlug);
        setCategorySlug((primary || categories[0])?.slug || 'other-services');
      }
    } catch (err) {
      setError(err.message || 'Could not load service approvals.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.token, categorySlug]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    return subscribeToAppEvents(currentUser.token, { 'provider:service_request_reviewed': load });
  }, [currentUser?.token, load]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    const normalizedServiceName = serviceName.trim();
    const normalizedDescription = description.trim();
    const parsedBaseCharge = Number(baseCharge);
    if (
      !categorySlug ||
      normalizedServiceName.length < 2 || normalizedServiceName.length > 120 ||
      normalizedDescription.length < 10 || normalizedDescription.length > 1000 ||
      !Number.isFinite(parsedBaseCharge) || parsedBaseCharge < 1 || parsedBaseCharge > 10000000
    ) {
      setError('Check the category, service title, service scope and base charge before submitting.');
      setNotice('');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/providers/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ categorySlug, serviceName: normalizedServiceName, description: normalizedDescription, baseCharge: parsedBaseCharge })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not submit service request.');
      setNotice(result.message || 'Service request submitted for Admin compliance review.');
      setServiceName('');
      setDescription('');
      setIsAddModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not submit service request.');
    } finally {
      setBusy(false);
    }
  }

  const available = categories;

  return (
    <div className="provider-services-manager-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary, #0f172a)', fontWeight: 800 }}>
            Services & Trade Offerings
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
            Add individual services within any trade category. Each offering is reviewed by Admin before customers can book it.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} /> Add Service Offering
          </Button>
          <Button variant="ghost" onClick={load} loading={isLoading} disabled={isLoading}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {notice && (
        <div role="status" aria-live="polite" style={{
          background: 'var(--color-success-50, #ecfdf5)',
          border: '1px solid var(--color-success-200, #a7f3d0)',
          color: 'var(--color-success-800, #065f46)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md, 8px)',
          fontSize: '0.85rem'
        }}>
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" aria-live="assertive" style={{
          background: 'var(--color-danger-50, #fef2f2)',
          border: '1px solid var(--color-danger-200, #fecaca)',
          color: 'var(--color-danger-800, #991b1b)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md, 8px)',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <Skeleton height="110px" radius="12px" />
          <Skeleton height="110px" radius="12px" />
        </div>
      ) : (
      <>
      {/* 2. Active Approved Services Grid */}
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Active & Approved Services
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Primary registered category */}
          {(data.primaryCategory?.categoryName || data.primaryCategory?.categorySlug) && (
          <Card style={{ padding: '16px 18px', borderLeft: '4px solid var(--color-brand-600, #174d3d)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <b style={{ fontSize: '1rem', color: 'var(--text-primary, #0f172a)' }}>
                  {data.primaryCategory?.categoryName || data.primaryCategory?.categorySlug || 'Primary Service'}
                </b>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                  Primary Certified Trade
                </span>
              </div>
              <Badge variant="success" dot={false}>
                <CheckCircle2 size={12} /> Approved
              </Badge>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #475569)' }}>
              Base charge: <b>{currentUser?.baseCharge ? formatLkr(currentUser.baseCharge) : 'Quote-based pricing'}</b>
            </p>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--brand-primary, #16a34a)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={14} /> Active in public customer search
            </div>
          </Card>
          )}

          {/* Approved individual service offerings */}
          {data.approvedServices.map(service => (
            <Card key={service.id} style={{ padding: '16px 18px', borderLeft: '4px solid var(--color-brand-500, #174d3d)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <b style={{ fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                    {service.serviceName}
                  </b>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                    {service.categoryName || service.categorySlug}
                  </span>
                </div>
                <Badge variant="success" dot={false}>
                  <CheckCircle2 size={12} /> Approved
                </Badge>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)' }}>
                Starting at <b>{formatLkr(service.baseCharge)}</b>
              </p>
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--color-success-700, #047857)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={13} /> Active in discovery catalog
              </div>
            </Card>
          ))}
        </div>
        {!(data.primaryCategory?.categoryName || data.primaryCategory?.categorySlug) && data.approvedServices.length === 0 && (
          <EmptyState icon={BriefcaseBusiness} title="No approved services yet" description="Your approved service offerings will appear here after Admin review." />
        )}
      </div>

      {/* 3. Service Requests & Approval Status History */}
      {data.requests.length > 0 && (
        <Card style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
            Service Verification Request History ({data.requests.length})
          </h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {data.requests.map(request => {
              const isPending = request.status === 'pending';
              const isApproved = request.status === 'approved';
              const isRejected = request.status === 'rejected';

              return (
                <div
                  key={request.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'var(--color-surface-subtle, #f8faf8)',
                    border: '1px solid var(--color-border-subtle, #e5ebe2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                        {request.serviceName}
                      </b>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                        ({request.categoryName})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)', marginTop: 2 }}>
                      Proposed Rate: <b>{formatLkr(request.baseCharge)}</b>
                    </div>
                    {/* What-to-do-next hints */}
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                      {isPending && (
                        <span style={{ color: 'var(--color-warning-700, #b45309)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Submitted and waiting for an Admin decision.
                        </span>
                      )}
                      {isApproved && (
                        <span style={{ color: 'var(--color-success-700, #047857)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> Approved and live. Customers can now book this service directly.
                        </span>
                      )}
                      {isRejected && (
                        <span style={{ color: 'var(--color-danger-700, #b91c1c)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={12} /> Review rejected. Please contact partner support to clarify your credentials.
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant={isApproved ? 'success' : isRejected ? 'danger' : 'warning'}
                    dot={isPending}
                  >
                    {request.status.toUpperCase()}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      </>
      )}

      {/* 4. Add Service BottomSheet / Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Service Category"
        isBottomSheet={true}
      >
        <form onSubmit={submit} style={{ display: 'grid', gap: '14px', padding: '4px 0' }}>
          <div className="provider-form-group">
            <label className="provider-form-label" htmlFor="provider-service-category">Service Category *</label>
            <select
              id="provider-service-category"
              required
              value={categorySlug}
              onChange={e => setCategorySlug(e.target.value)}
              className="provider-form-select"
            >
              <option value="">Select a category</option>
              {available.map(item => (
                <option key={item.slug} value={item.slug}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="provider-form-group">
            <label className="provider-form-label" htmlFor="provider-service-title">Service Title *</label>
            <input
              id="provider-service-title"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Air Conditioner Servicing & Gas Top-up"
              value={serviceName}
              onChange={e => setServiceName(e.target.value)}
              className="provider-form-input"
            />
          </div>

          <div className="provider-form-group">
            <label className="provider-form-label" htmlFor="provider-service-base-charge">Base Charge (LKR) *</label>
            <input
              id="provider-service-base-charge"
              required
              type="number"
              min="1"
              max="10000000"
              step="1"
              value={baseCharge}
              onChange={e => setBaseCharge(e.target.value)}
              className="provider-form-input"
            />
            <small style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
              Starting price before on-site inspection or custom quoting.
            </small>
          </div>

          <div className="provider-form-group">
            <label className="provider-form-label" htmlFor="provider-service-description">Service Scope & Qualifications *</label>
            <textarea
              id="provider-service-description"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              placeholder="Describe the trade equipment you bring, coverage area, and proof of experience or NVQ certification."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="provider-form-textarea"
            />
          </div>

          <div style={{
            background: 'var(--brand-subtle, rgba(43, 132, 101, 0.16))',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.8rem',
            color: 'var(--brand-text, #60cba5)',
            border: '1px solid rgba(96, 203, 165, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Info size={16} color="var(--color-brand-600, #174d3d)" style={{ flexShrink: 0 }} />
            <span>
              New service offerings remain unavailable to customers until an Admin reviews and approves the request.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <Button
              type="submit"
              variant="primary"
              loading={busy}
              disabled={busy || !categorySlug || serviceName.trim().length < 2 || description.trim().length < 10 || !Number.isFinite(Number(baseCharge)) || Number(baseCharge) < 1 || Number(baseCharge) > 10000000}
            >
              <Send size={15} /> Submit for Admin Approval
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
