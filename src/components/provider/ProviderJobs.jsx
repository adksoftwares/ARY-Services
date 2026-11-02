import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { Card, Badge, Button, Stepper, StatusPill, EmptyState, Skeleton } from '../../design-system';

function getSlaStatus(createdAt) {
  if (!createdAt) return null;
  const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const remainingMinutes = 30 - elapsedMinutes;

  if (remainingMinutes > 0) {
    return {
      text: `${remainingMinutes}m remaining (30-min SLA)`,
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
  const [quoteDrafts, setQuoteDrafts] = useState({});
  const [quoteNotes, setQuoteNotes] = useState({});
  const [quoteBusy, setQuoteBusy] = useState('');
  const [quoteError, setQuoteError] = useState({});

  const broadcastJobs = bookings.filter(b => b.status === 'broadcast_pool');
  const directBookings = bookings.filter(b => b.status !== 'broadcast_pool');

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

  return (
    <div className="provider-jobs-container" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Cascading Broadcast Pool Section */}
      {broadcastJobs.length > 0 && (
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                <Zap size={18} />
              </div>
              <div>
                <b style={{ color: 'var(--color-warning-900, #92400e)', fontSize: '1rem' }}>
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
            {broadcastJobs.map(b => (
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
                    <b style={{ color: 'var(--color-neutral-900, #1e293b)', fontSize: '0.95rem' }}>{b.categoryName || 'Service Job'}</b>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>#{b.id}</span>
                    <Badge variant="success" dot={false}>{b.baseCharge || 'LKR 1,500'}</Badge>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.serviceAddress}</span>
                    <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.bookingDate} ({b.bookingTime})</span>
                    <span><User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.customerName}</span>
                  </div>
                  {b.problemDescription && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-700, #334155)', fontStyle: 'italic' }}>
                      "{b.problemDescription}"
                    </p>
                  )}
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

      {/* 2. Direct Bookings Feed */}
      {directBookings.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {directBookings.map(b => {
            const sla = b.status === 'requested' ? getSlaStatus(b.createdAt) : null;
            const stepIndex = getStepIndex(b.status);

            return (
              <Card key={b.id} style={{ padding: '20px' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-brand-900, #173b2f)' }}>
                        {b.categoryName || 'Service Request'}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                        #{b.id}
                      </span>
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

                {/* Progress Stepper */}
                <div style={{ margin: '14px 0 18px', padding: '12px 16px', background: 'var(--color-neutral-50, #f8fafc)', borderRadius: 'var(--radius-md, 8px)' }}>
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

                {/* Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  padding: '14px',
                  background: 'var(--color-surface, #fff)',
                  border: '1px solid var(--color-border-subtle, #e5e7eb)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Customer</span>
                    <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{b.customerName}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Contact Phone</span>
                    <a
                      href={`tel:${b.customerPhone}`}
                      style={{ color: 'var(--color-brand-600, #174d3d)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Phone size={13} /> {b.customerPhone} (Call)
                    </a>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Schedule</span>
                    <span style={{ fontWeight: 600 }}>{b.bookingDate} at {b.bookingTime}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Location</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-brand-800, #154636)' }}>{b.serviceAddress}</span>
                  </div>
                </div>

                {/* Customer Problem / Notes */}
                {b.problemDescription && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'var(--color-neutral-50, #f8fafc)',
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

                {/* Reschedule Request Notice */}
                {b.rescheduleRequest?.status === 'pending' && (
                  <div style={{
                    marginTop: 14,
                    padding: '12px 16px',
                    border: '1px solid var(--color-warning-300, #fcd34d)',
                    background: 'var(--color-warning-50, #fffbeb)',
                    borderRadius: 'var(--radius-md, 8px)'
                  }}>
                    <b style={{ fontSize: '0.85rem', color: 'var(--color-warning-900, #78350f)' }}>
                      Customer Requested a Reschedule
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

                {/* Quote Status & Composer */}
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

                {/* Quote Composer Form (when applicable) */}
                {['requested', 'accepted'].includes(b.status) &&
                  (b.quote?.status !== 'pending' || Date.parse(b.quote.validUntil || '') <= Date.now()) &&
                  b.quote?.status !== 'accepted' && (
                    <form
                      onSubmit={(e) => handleQuoteSubmit(b, e)}
                      style={{
                        marginTop: 14,
                        padding: '14px',
                        border: '1px solid var(--color-border-subtle, #e2e8f0)',
                        background: 'var(--color-neutral-50, #f8fafc)',
                        borderRadius: 'var(--radius-md, 8px)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <FileText size={15} color="var(--color-brand-600, #174d3d)" />
                        <b style={{ fontSize: '0.85rem', color: 'var(--color-neutral-800, #1e293b)' }}>
                          Send or Revise Service Quote
                        </b>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 170px) 1fr', gap: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                            Amount (LKR)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10000000"
                            step="1"
                            required
                            value={quoteDrafts[b.id] ?? b.quote?.amount ?? b.baseAmount ?? ''}
                            onChange={(e) => setQuoteDrafts(prev => ({ ...prev, [b.id]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid var(--color-border, #cbd5e1)',
                              borderRadius: 'var(--radius-sm, 6px)',
                              fontSize: '1rem',
                              background: '#fff'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                            Work Included & Scope
                          </label>
                          <input
                            type="text"
                            minLength={5}
                            required
                            placeholder="Labour, spare parts, and warranty scope"
                            value={quoteNotes[b.id] ?? b.quote?.description ?? ''}
                            onChange={(e) => setQuoteNotes(prev => ({ ...prev, [b.id]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              border: '1px solid var(--color-border, #cbd5e1)',
                              borderRadius: 'var(--radius-sm, 6px)',
                              fontSize: '1rem',
                              background: '#fff'
                            }}
                          />
                        </div>
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

                {/* Customer Review display if already rated */}
                {b.review && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'var(--color-brand-50, #edf7f2)',
                    border: '1px solid var(--color-brand-200, #b7decb)',
                    borderRadius: 'var(--radius-md, 8px)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.85rem' }}>
                        ⭐ {b.review.rating}/5 Client Rating
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>
                        {new Date(b.review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {b.review.comment && (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-brand-900, #0c2d23)', fontStyle: 'italic' }}>
                        "{b.review.comment}"
                      </p>
                    )}
                  </div>
                )}

                {/* Action Row */}
                <div style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: '1px solid var(--color-border-subtle, #f1f5f9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap'
                }}>
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
                        onClick={() => onUpdateStatus?.(b.id, 'rejected')}
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
                </div>
              </Card>
            );
          })}
        </div>
      ) : broadcastJobs.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No customer booking requests yet"
          description="When customers in your service area request your expertise, their bookings will appear here instantly in real time."
        />
      ) : null}
    </div>
  );
}
