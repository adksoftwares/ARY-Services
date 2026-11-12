import React, { useState, useMemo } from 'react';
import {
  Check,
  Ban,
  Zap,
  CheckCheck,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  User,
  Send,
  Star,
  FileText,
  Filter,
  ExternalLink,
  Info
} from 'lucide-react';
import { Card, Badge, Button, Stepper, StatusPill, EmptyState, Skeleton, ConfirmDialog, SegmentedControl } from '../../design-system';

function getSlaStatus(createdAt) {
  if (!createdAt) return null;
  const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const remainingMinutes = 30 - elapsedMinutes;

  if (remainingMinutes > 0) {
    return {
      text: `${remainingMinutes}m remaining (30m SLA)`,
      urgent: remainingMinutes <= 10,
      overdue: false
    };
  }
  return {
    text: `SLA Overdue by ${Math.abs(remainingMinutes)}m`,
    urgent: true,
    overdue: true
  };
}

export default function ProviderJobs({
  bookings = [],
  isLoading = false,
  onUpdateStatus,
  onDecideReschedule,
  onClaimJob,
  onSendQuote,
  claimingJobId = null
}) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'active' | 'completed' | 'broadcast'
  const [quoteDrafts, setQuoteDrafts] = useState({});
  const [quoteNotes, setQuoteNotes] = useState({});
  const [quoteBusy, setQuoteBusy] = useState('');
  const [quoteError, setQuoteError] = useState({});
  const [confirmDeclineId, setConfirmDeclineId] = useState(null);

  const broadcastJobs = useMemo(() => bookings.filter(b => b.status === 'broadcast_pool'), [bookings]);
  const directBookings = useMemo(() => bookings.filter(b => b.status !== 'broadcast_pool'), [bookings]);

  const filteredBookings = useMemo(() => {
    switch (filterTab) {
      case 'pending':
        return directBookings.filter(b => b.status === 'requested');
      case 'active':
        return directBookings.filter(b => ['accepted', 'in_progress'].includes(b.status));
      case 'completed':
        return directBookings.filter(b => b.status === 'completed');
      case 'broadcast':
        return broadcastJobs;
      case 'all':
      default:
        return directBookings;
    }
  }, [filterTab, directBookings, broadcastJobs]);

  async function handleQuoteSubmit(booking, e) {
    e.preventDefault();
    const amountVal = quoteDrafts[booking.id] ?? booking.quote?.amount ?? booking.baseAmount;
    const amount = Number(amountVal);
    const description = String(quoteNotes[booking.id] ?? booking.quote?.description ?? 'Service work as discussed').trim();

    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) {
      setQuoteError(prev => ({ ...prev, [booking.id]: 'Enter a valid quote between LKR 1 and 10,000,000' }));
      return;
    }
    if (description.length < 5) {
      setQuoteError(prev => ({ ...prev, [booking.id]: 'Please enter a description (at least 5 characters)' }));
      return;
    }

    setQuoteError(prev => ({ ...prev, [booking.id]: '' }));
    setQuoteBusy(booking.id);
    try {
      await onSendQuote?.(booking, amount, description);
    } finally {
      setQuoteBusy('');
    }
  }

  const getStepIndex = (status) => {
    switch (status) {
      case 'requested': return 0;
      case 'accepted': return 1;
      case 'in_progress': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: '16px' }}>
        <Skeleton height="140px" radius="12px" />
        <Skeleton height="180px" radius="12px" />
        <Skeleton height="180px" radius="12px" />
      </div>
    );
  }

  const filterOptions = [
    { value: 'all', label: `All (${directBookings.length})` },
    { value: 'pending', label: `Pending (${directBookings.filter(b => b.status === 'requested').length})` },
    { value: 'active', label: `Active (${directBookings.filter(b => ['accepted', 'in_progress'].includes(b.status)).length})` },
    { value: 'completed', label: `Completed (${directBookings.filter(b => b.status === 'completed').length})` }
  ];

  if (broadcastJobs.length > 0) {
    filterOptions.push({ value: 'broadcast', label: `Broadcast Pool (${broadcastJobs.length})` });
  }

  return (
    <div className="provider-jobs-container" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Cascading Broadcast Pool Section (High Priority Banner) */}
      {broadcastJobs.length > 0 && filterTab !== 'broadcast' && (
        <Card style={{
          background: 'linear-gradient(135deg, var(--color-warning-50, #fef3c7) 0%, #fffbeb 100%)',
          border: '1.5px solid var(--color-warning-400, #f59e0b)',
          padding: '16px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: 'var(--color-warning-500, #f59e0b)',
                color: '#fff',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <Zap size={18} />
              </div>
              <div>
                <b style={{ color: 'var(--color-warning-900, #92400e)', fontSize: '0.95rem' }}>
                  {broadcastJobs.length} Open Broadcast Job{broadcastJobs.length > 1 ? 's' : ''} in Your Category
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-warning-800, #78350f)' }}>
                  Another contractor was unavailable. Fast-track claim: Earn direct payout with 1 tap.
                </p>
              </div>
            </div>
            <Badge variant="warning" dot={false}>First-to-Claim Priority</Badge>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {broadcastJobs.slice(0, 2).map(b => (
              <div
                key={b.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--color-warning-200, #fde68a)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <b style={{ color: 'var(--text-primary, #f8fafc)', fontSize: '0.95rem' }}>{b.categoryName || 'Service Job'}</b>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>#{b.id.slice(-6)}</span>
                    <Badge variant="success" dot={false}>{b.baseCharge || 'Quote required'}</Badge>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.serviceAddress}</span>
                    <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.bookingDate} ({b.bookingTime})</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onClaimJob?.(b.id)}
                  loading={claimingJobId === b.id}
                >
                  <Zap size={14} /> Claim Job (1-Tap)
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. Filter Tabs */}
      <div style={{ maxWidth: 640 }}>
        <SegmentedControl
          options={filterOptions}
          value={filterTab}
          onChange={setFilterTab}
        />
      </div>

      {/* 3. Bookings Feed */}
      {filteredBookings.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredBookings.map(b => {
            const isBroadcast = b.status === 'broadcast_pool';
            const sla = b.status === 'requested' ? getSlaStatus(b.createdAt) : null;
            const stepIndex = getStepIndex(b.status);
            const currentAmount = quoteDrafts[b.id] ?? b.quote?.amount ?? b.baseAmount ?? 0;
            const feePreview = Math.round(Number(currentAmount) * 0.1);
            const netPreview = Number(currentAmount) - feePreview;

            return (
              <Card key={b.id} className="job-card">
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #f8fafc)' }}>
                        {b.categoryName || 'Service Request'}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                        #{b.id.slice(-6)}
                      </span>
                      <Badge variant="brand" dot={false}>
                        {b.baseCharge || 'Quote required'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 2 }}>
                      Created: {new Date(b.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {sla && (
                      <Badge variant={sla.overdue ? 'danger' : sla.urgent ? 'warning' : 'neutral'} dot={false}>
                        <Clock size={12} /> {sla.text}
                      </Badge>
                    )}
                    <StatusPill status={b.status} />
                  </div>
                </div>

                {/* Progress Stepper (Only for direct claimed/accepted bookings) */}
                {!isBroadcast && (
                  <div style={{ margin: '14px 0 16px', padding: '12px 16px', background: 'var(--surface-secondary, #161920)', borderRadius: 'var(--radius-md, 8px)' }}>
                    <Stepper
                      currentStep={stepIndex}
                      steps={[
                        { label: 'Requested' },
                        { label: 'Accepted' },
                        { label: 'In Progress' },
                        { label: 'Completed' }
                      ]}
                    />
                  </div>
                )}

                {/* Details Grid: Customer info shown per visibility rules */}
                <div className="job-detail-grid">
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Customer</span>
                    <b style={{ color: 'var(--text-primary, #f8fafc)' }}>
                      {isBroadcast ? 'Confidential (Unassigned)' : (b.customerName || 'Ary Client')}
                    </b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Contact Phone</span>
                    {isBroadcast ? (
                      <span style={{ color: 'var(--color-neutral-500, #64748b)', fontStyle: 'italic' }}>Visible after claiming</span>
                    ) : (
                      <a
                        href={`tel:${b.customerPhone}`}
                        style={{ color: 'var(--color-brand-600, #174d3d)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Phone size={13} /> {b.customerPhone} (Call)
                      </a>
                    )}
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Schedule</span>
                    <span style={{ fontWeight: 600 }}>{b.bookingDate} at {b.bookingTime}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Location</span>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(b.serviceAddress || 'Sri Lanka')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 600, color: 'var(--color-brand-700, #174d3d)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <MapPin size={13} /> {b.serviceAddress} <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                {/* Customer Problem / Notes */}
                {b.problemDescription && (
                  <div style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    background: 'var(--surface-secondary, #161920)',
                    borderLeft: '3px solid var(--color-brand-500, #174d3d)',
                    borderRadius: '0 var(--radius-md, 8px) var(--radius-md, 8px) 0',
                    fontSize: '0.85rem'
                  }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-neutral-700, #334155)', display: 'block', fontSize: '0.75rem' }}>
                      Customer Scope / Problem Notes:
                    </span>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-neutral-800, #1e293b)' }}>
                      {b.problemDescription}
                    </p>
                  </div>
                )}

                {/* Reschedule Request Notice & Decision */}
                {b.rescheduleRequest?.status === 'pending' && (
                  <div style={{
                    marginTop: 14,
                    padding: '12px 16px',
                    border: '1px solid var(--color-warning-300, #fcd34d)',
                    background: 'var(--color-warning-50, #fffbeb)',
                    borderRadius: 'var(--radius-md, 8px)'
                  }}>
                    <b style={{ fontSize: '0.85rem', color: 'var(--color-warning-900, #78350f)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={15} color="#d97706" /> Customer Requested a Reschedule
                    </b>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-warning-800, #92400e)', margin: '4px 0 10px' }}>
                      Proposed new time: <b>{b.rescheduleRequest.date} ({b.rescheduleRequest.time})</b>
                      {b.rescheduleRequest.reason ? ` · "${b.rescheduleRequest.reason}"` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onDecideReschedule?.(b.id, 'accept')}
                      >
                        <Check size={14} /> Confirm New Time
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDecideReschedule?.(b.id, 'reject')}
                      >
                        <Ban size={14} /> Decline Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quote Status Display */}
                {b.quote?.status === 'pending' && (
                  <div style={{
                    marginTop: 14,
                    padding: '12px 16px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    borderRadius: 'var(--radius-md, 8px)'
                  }}>
                    <b style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                      Quote Awaiting Customer Decision{Date.parse(b.quote.validUntil || '') <= Date.now() ? ' (Expired)' : ''}
                    </b>
                    <p style={{ fontSize: '0.82rem', color: '#334155', margin: '4px 0' }}>
                      <b>LKR {Number(b.quote.amount).toLocaleString('en-LK')}</b> · {b.quote.description}
                    </p>
                    <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Valid until {new Date(b.quote.validUntil).toLocaleDateString()}
                    </small>
                  </div>
                )}

                {b.quote?.status === 'accepted' && (
                  <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'var(--color-brand-50, #edf7f2)',
                    border: '1px solid var(--color-brand-200, #b7decb)',
                    borderRadius: 'var(--radius-md, 8px)',
                    fontSize: '0.85rem',
                    color: 'var(--color-brand-800, #154636)'
                  }}>
                    ✓ Customer accepted quote: <b>LKR {Number(b.quote.amount).toLocaleString('en-LK')}</b>
                  </div>
                )}

                {/* Quote Composer Form (Available on requested/accepted before in_progress) */}
                {['requested', 'accepted'].includes(b.status) &&
                  (b.quote?.status !== 'pending' || Date.parse(b.quote.validUntil || '') <= Date.now()) &&
                  b.quote?.status !== 'accepted' && (
                    <form
                      onSubmit={(e) => handleQuoteSubmit(b, e)}
                      className="quote-composer-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <FileText size={15} color="var(--color-brand-600, #174d3d)" />
                        <b style={{ fontSize: '0.85rem', color: 'var(--color-neutral-800, #1e293b)' }}>
                          Send Custom Service Quote
                        </b>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 170px) 1fr', gap: 10 }}>
                        <div className="provider-form-group">
                          <label className="provider-form-label">
                            Quote Amount (LKR)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10000000"
                            step="1"
                            required
                            value={quoteDrafts[b.id] ?? b.quote?.amount ?? b.baseAmount ?? ''}
                            onChange={(e) => setQuoteDrafts(prev => ({ ...prev, [b.id]: e.target.value }))}
                            className="provider-form-input"
                          />
                        </div>
                        <div className="provider-form-group">
                          <label className="provider-form-label">
                            Work Included & Scope
                          </label>
                          <input
                            type="text"
                            minLength={5}
                            required
                            placeholder="e.g. Labour, spare parts, and warranty scope"
                            value={quoteNotes[b.id] ?? b.quote?.description ?? ''}
                            onChange={(e) => setQuoteNotes(prev => ({ ...prev, [b.id]: e.target.value }))}
                            className="provider-form-input"
                          />
                        </div>
                      </div>

                      {/* Live Quote Breakdown Preview */}
                      <div className="quote-preview-callout">
                        <span>Customer pays: <b>LKR {Number(currentAmount || 0).toLocaleString()}</b></span>
                        <span style={{ color: 'var(--color-neutral-500, #64748b)' }}>ARY 10% fee: - LKR {feePreview.toLocaleString()}</span>
                        <span style={{ color: 'var(--color-success-700, #047857)', fontWeight: 700 }}>
                          Your Net Payout: LKR {netPreview.toLocaleString()}
                        </span>
                      </div>

                      {quoteError[b.id] && (
                        <div style={{ color: 'var(--color-danger-600, #dc2626)', fontSize: '0.75rem', marginTop: 6 }}>
                          {quoteError[b.id]}
                        </div>
                      )}
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        loading={quoteBusy === b.id}
                        style={{ marginTop: 10 }}
                      >
                        <Send size={13} /> Send Official Quote to Customer
                      </Button>
                    </form>
                  )}

                {/* Allowed Transitions Action Row */}
                <div className="job-actions-row">
                  {isBroadcast ? (
                    <Button
                      variant="primary"
                      onClick={() => onClaimJob?.(b.id)}
                      loading={claimingJobId === b.id}
                    >
                      <Zap size={15} /> Claim This Broadcast Job
                    </Button>
                  ) : (
                    <>
                      {b.status === 'requested' && (
                        <>
                          <Button
                            variant="primary"
                            onClick={() => onUpdateStatus?.(b.id, 'accepted')}
                          >
                            <Check size={16} /> Accept Job
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setConfirmDeclineId(b.id)}
                          >
                            <Ban size={16} /> Decline
                          </Button>
                        </>
                      )}

                      {b.status === 'accepted' && (
                        <>
                          <Button
                            variant="primary"
                            onClick={() => onUpdateStatus?.(b.id, 'in_progress')}
                          >
                            <Zap size={16} /> Start Job
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => onUpdateStatus?.(b.id, 'completed')}
                          >
                            <CheckCheck size={16} /> Mark Completed
                          </Button>
                        </>
                      )}

                      {b.status === 'in_progress' && (
                        <Button
                          variant="primary"
                          onClick={() => onUpdateStatus?.(b.id, 'completed')}
                        >
                          <CheckCheck size={16} /> Mark as Finished
                        </Button>
                      )}

                      {b.status === 'completed' && (
                        <span style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-success-700, #047857)',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <CheckCircle2 size={16} /> Service Completed Successfully
                        </span>
                      )}

                      {['rejected', 'cancelled'].includes(b.status) && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-neutral-500, #64748b)' }}>
                          Job {b.status === 'rejected' ? 'Declined' : 'Cancelled'}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="No booking requests in this category"
          description="When new customer requests arrive, they will be listed here instantly in real time."
        />
      )}

      {/* Confirm Decline Modal */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeclineId)}
        onClose={() => setConfirmDeclineId(null)}
        title="Decline Booking Request?"
        message="Declining will pass this booking to the next available provider in your area. Are you sure you cannot attend to this job?"
        confirmLabel="Yes, Decline"
        cancelLabel="Keep Request"
        isDanger={true}
        onConfirm={() => {
          if (confirmDeclineId) {
            onUpdateStatus?.(confirmDeclineId, 'rejected');
            setConfirmDeclineId(null);
          }
        }}
        onCancel={() => setConfirmDeclineId(null)}
      />
    </div>
  );
}
