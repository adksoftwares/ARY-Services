import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Ban,
  ClipboardList,
  Search,
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Phone,
  MapPin,
  Check,
  X,
  FileText,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Button, Badge, StatusPill, Tabs, Stepper, ConfirmDialog, Modal, Skeleton, EmptyState } from '../../design-system';

function formatLkr(value) {
  if (value === null || value === undefined || value === '') return 'Amount unavailable';
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? `LKR ${amount.toLocaleString('en-LK')}` : 'Amount unavailable';
}

function getLocalDateInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function isValidLocalDateInput(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export default function MyBookingsList({
  bookings = [],
  isLoading,
  onRefresh,
  onCancelBooking,
  onDisputeBooking,
  onOpenDisputeModal,
  onExploreServices,
  onOpenReviewModal,
  onRescheduleBooking,
  onQuoteDecision
}) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookingSearch, setBookingSearch] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('Morning (9 AM - 12 PM)');
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [actionBusyId, setActionBusyId] = useState('');
  const [actionErrors, setActionErrors] = useState({});

  const safeBookings = useMemo(() => (Array.isArray(bookings) ? bookings : []).filter(booking =>
    booking && typeof booking === 'object' && booking.id !== null && booking.id !== undefined && String(booking.id).trim() !== ''
  ), [bookings]);

  const TABS = [
    { id: 'upcoming', label: 'Upcoming', badge: safeBookings.filter(b => ['requested', 'accepted'].includes(b.status)).length },
    { id: 'in_progress', label: 'In Progress', badge: safeBookings.filter(b => b.status === 'in_progress').length },
    { id: 'completed', label: 'Completed', badge: safeBookings.filter(b => b.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', badge: safeBookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).length },
    { id: 'all', label: 'All Requests', badge: safeBookings.length }
  ];

  const filteredBookings = useMemo(() => {
    let result = safeBookings;
    if (activeTab === 'upcoming') result = result.filter(b => ['requested', 'accepted'].includes(b.status));
    else if (activeTab === 'in_progress') result = result.filter(b => b.status === 'in_progress');
    else if (activeTab === 'completed') result = result.filter(b => b.status === 'completed');
    else if (activeTab === 'cancelled') result = result.filter(b => ['cancelled', 'rejected'].includes(b.status));

    const query = bookingSearch.trim().toLocaleLowerCase();
    if (!query) return result;
    return result.filter(booking => [
      booking.id, booking.categoryName, booking.providerName, booking.status,
      booking.pickupAddress, booking.destinationAddress, booking.address,
      booking.serviceAddress, booking.location
    ].filter(value => value !== null && value !== undefined).some(value => String(value).toLocaleLowerCase().includes(query)));
  }, [safeBookings, activeTab, bookingSearch]);

  const getStepIndex = (status) => {
    switch (status) {
      case 'requested': return 0;
      case 'accepted': return 1;
      case 'in_progress': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  async function runBookingAction(bookingId, action, ...args) {
    if (!bookingId || actionBusyId === bookingId || typeof action !== 'function') return false;
    setActionBusyId(bookingId);
    setActionErrors(prev => ({ ...prev, [bookingId]: '' }));
    try {
      await action(bookingId, ...args);
      return true;
    } catch (error) {
      setActionErrors(prev => ({ ...prev, [bookingId]: error?.message || 'This action could not be completed. Please try again.' }));
      return false;
    } finally {
      setActionBusyId('');
    }
  }

  async function handleConfirmReschedule() {
    if (rescheduleBusy || !rescheduleTarget || !onRescheduleBooking) return;
    const today = getLocalDateInputValue();
    if (!isValidLocalDateInput(newDate) || newDate < today || !newTime) {
      setRescheduleError('Choose a valid date from today onward and a time slot.');
      return;
    }
    setRescheduleBusy(true);
    setRescheduleError('');
    try {
      await onRescheduleBooking(rescheduleTarget.id, newDate, newTime);
      setRescheduleTarget(null);
    } catch (error) {
      setRescheduleError(error?.message || 'Could not update the booking schedule. Please try again.');
    } finally {
      setRescheduleBusy(false);
    }
  }

  const emptyTabDescriptions = {
    upcoming: 'You have no pending or accepted upcoming service appointments.',
    in_progress: 'No active service is currently marked as in progress.',
    completed: 'You haven\'t completed any service appointments yet.',
    cancelled: 'No cancelled or rejected service requests.',
    all: 'No booking history found.'
  };

  return (
    <section className="my-bookings-container customer-bookings-workspace customer-bookings-polish" aria-labelledby="bookings-main-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">YOUR ACTIVE REQUESTS</div>
          <h2 id="bookings-main-title">My Bookings ({safeBookings.length})</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={onRefresh}
          loading={isLoading}
        >
          Refresh
        </Button>
      </div>

      <div className="booking-history-search-row" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', minWidth: 0, border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 10, padding: '0 12px', minHeight: 44, background: 'var(--color-surface, #fff)' }}>
          <Search size={16} aria-hidden="true" style={{ color: 'var(--color-neutral-500, #64748b)', flexShrink: 0 }} />
          <input type="search" value={bookingSearch} onChange={event => setBookingSearch(event.target.value)} placeholder="Search by booking, service, provider or address" aria-label="Search booking history" style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--color-neutral-900, #0f172a)', font: 'inherit', fontSize: '0.88rem' }} />
        </label>
        {bookingSearch && <button type="button" onClick={() => setBookingSearch('')} style={{ minHeight: 40, border: 0, borderRadius: 8, padding: '8px 12px', background: 'var(--color-brand-50, #edf7f2)', color: 'var(--color-brand-700, #174d3d)', fontWeight: 700, cursor: 'pointer' }}>Clear search</button>}
        <span role="status" aria-live="polite" aria-atomic="true" style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.78rem' }}>{filteredBookings.length} result{filteredBookings.length === 1 ? '' : 's'}</span>
      </div>

      {/* Tabs navigation */}
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        aria-label="Filter Bookings by Status"
        className="bookings-tabs-bar"
      />

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="bookings-feed">
          {[1, 2, 3].map(n => (
            <div key={n} className="booking-card-item skeleton-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Skeleton width="40%" height="20px" />
                <Skeleton width="20%" height="20px" />
              </div>
              <Skeleton width="100%" height="40px" style={{ marginBottom: 14 }} />
              <Skeleton width="80%" height="16px" style={{ marginBottom: 8 }} />
              <Skeleton width="60%" height="16px" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bookings-feed">
          {filteredBookings.map(b => {
            const stepIndex = getStepIndex(b.status);
            const isTerminal = ['completed', 'cancelled', 'rejected'].includes(b.status);

            return (
              <div key={String(b.id)} className="booking-card-item" aria-labelledby={`booking-title-${b.id}`}>
                {/* Header */}
                <div className="booking-card-header">
                  <div className="booking-card-title-col">
                    <h3 id={`booking-title-${b.id}`} className="booking-service-title">
                      {b.categoryName || 'Service Request'}
                    </h3>
                    <span className="booking-ref-tag">Ref: #{String(b.id).slice(0, 8)}</span>
                  </div>
                  <StatusPill status={b.status} />
                </div>

                {/* Status Timeline / Stepper */}
                {!isTerminal && (
                  <div className="booking-stepper-box">
                    <Stepper
                      steps={['Requested', 'Accepted', 'In Progress', 'Completed']}
                      currentStep={stepIndex}
                    />
                  </div>
                )}

                {/* Details Grid */}
                <div className="booking-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Provider</span>
                    <span className="detail-val">{b.providerName || 'Awaiting provider assignment'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Provider Phone</span>
                    {b.providerPhone ? (
                      <a href={`tel:${b.providerPhone}`} className="detail-phone-link">
                        <Phone size={13} /> {b.providerPhone}
                      </a>
                    ) : (
                      <span className="detail-val">Pending assignment</span>
                    )}
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Scheduled Date & Time</span>
                    <span className="detail-val">{b.bookingDate || 'Date unavailable'}{b.bookingTime ? ` (${b.bookingTime})` : ''}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Service Address</span>
                    <span className="detail-val">{b.serviceAddress || 'Address not provided'}</span>
                  </div>
                </div>

                {/* Cancelled / Declined Reason Banner */}
                {['cancelled', 'rejected'].includes(b.status) && (
                  <div className="booking-cancelled-banner" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.22)',
                    color: '#f87171',
                    fontSize: 'var(--text-xs, 0.78rem)',
                    margin: '6px 0 10px'
                  }}>
                    <Ban size={14} style={{ flexShrink: 0 }} />
                    <span>
                      <b>{b.status === 'cancelled' ? 'Booking Cancelled' : 'Booking Declined'}:</b> {b.cancelReason || b.reason || 'This service request was cancelled.'}
                    </span>
                  </div>
                )}

                {b.problemDescription && (
                  <div className="booking-problem-note">
                    <FileText size={14} className="note-icon" />
                    <span><b>Issue:</b> {b.problemDescription}</span>
                  </div>
                )}

                {/* Pending Quote Decision Card */}
                {b.quote?.status === 'pending' && (
                  <div className="booking-quote-card" role="region" aria-label="Quote received">
                    <div className="quote-header">
                      <div>
                        <span className="quote-badge">New Quote Received</span>
                        <h4 className="quote-price">{formatLkr(b.quote.amount)}</h4>
                      </div>
                      <p className="quote-scope"><b>Scope:</b> {b.quote.scope}</p>
                    </div>
                    <div className="quote-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => runBookingAction(b.id, onQuoteDecision, 'accepted')}
                        loading={actionBusyId === b.id}
                        disabled={actionBusyId === b.id}
                      >
                        Accept Quote
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={X}
                        onClick={() => runBookingAction(b.id, onQuoteDecision, 'declined')}
                        disabled={actionBusyId === b.id}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reschedule Suggestion by Provider */}
                {b.reschedule?.status === 'suggested_by_provider' && (
                  <div className="booking-reschedule-banner">
                    <Clock size={16} />
                    <div style={{ flex: 1 }}>
                      <b>Provider suggested a new schedule:</b> {b.reschedule.date} ({b.reschedule.time})
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => runBookingAction(b.id, onRescheduleBooking, b.reschedule.date, b.reschedule.time, 'accepted')}
                        loading={actionBusyId === b.id}
                        disabled={actionBusyId === b.id}
                      >
                        Accept Time
                      </Button>
                    </div>
                  </div>
                )}

                {actionErrors[b.id] && <div role="alert" aria-live="assertive" className="wizard-error-banner">{actionErrors[b.id]}</div>}

                <div className="booking-payment-status" role="status" aria-live="polite" style={{ marginTop: 12, padding: '11px 13px', borderRadius: 10, border: '1px solid var(--color-border-subtle, #e2e8f0)', background: 'var(--color-surface-subtle, #f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <b style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-neutral-800, #1e293b)' }}>Cash payment only</b>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-600, #64748b)' }}>{b.paymentStatus === 'cash_collected' ? 'Provider confirmed cash received' : b.status === 'completed' ? 'Please settle the agreed amount directly with your provider' : 'Pay your provider in cash after service completion'}</span>
                  </div>
                  <Badge variant={b.paymentStatus === 'cash_collected' ? 'success' : 'warning'} dot={false}>{b.paymentStatus === 'cash_collected' ? 'Cash received' : b.status === 'completed' ? 'Payment due' : 'Cash on completion'}</Badge>
                </div>

                {/* Booking Footer Actions */}
                <div className="booking-card-footer">
                  <div className="booking-action-buttons">
                    {/* Reschedule button for active bookings */}
                    {['requested', 'accepted'].includes(b.status) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Clock}
                        onClick={() => {
                          setRescheduleTarget(b);
                          setNewDate(b.bookingDate);
                          setNewTime(b.bookingTime);
                        }}
                      >
                        Reschedule
                      </Button>
                    )}

                    {/* Cancel button */}
                    {['requested', 'accepted', 'in_progress'].includes(b.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Ban}
                        onClick={() => setCancelTargetId(b.id)}
                      >
                        Cancel
                      </Button>
                    )}

                    {/* Review Button for completed bookings */}
                    {b.status === 'completed' && !b.review && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Star}
                        onClick={() => onOpenReviewModal && onOpenReviewModal(b)}
                      >
                        Rate & Review
                      </Button>
                    )}

                    {/* Dispute action is available without implying a fixed warranty period. */}
                    {b.status === 'completed' && !b.dispute && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={AlertTriangle}
                        onClick={() => onOpenDisputeModal && onOpenDisputeModal(b)}
                      >
                        Dispute
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title={`No ${activeTab.replace('_', ' ')} bookings`}
          description={emptyTabDescriptions[activeTab] || emptyTabDescriptions.all}
          actionLabel="Explore Services"
          onAction={onExploreServices}
        />
      )}

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetId)}
        onClose={() => { if (!actionBusyId) setCancelTargetId(null); }}
        title="Cancel Service Booking"
        message="Are you sure you want to request cancellation of this booking?"
        confirmLabel="Yes, Cancel Booking"
        isDanger={true}
        onConfirm={async () => {
          if (cancelTargetId && onCancelBooking) {
            const cancelled = await runBookingAction(cancelTargetId, onCancelBooking);
            if (cancelled) setCancelTargetId(null);
          }
        }}
      />

      {/* Reschedule Modal */}
      <Modal
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => { if (!rescheduleBusy) { setRescheduleTarget(null); setRescheduleError(''); } }}
        title="Reschedule Booking"
        isBottomSheet={true}
        footer={
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <Button variant="ghost" onClick={() => { setRescheduleTarget(null); setRescheduleError(''); }} disabled={rescheduleBusy} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReschedule} loading={rescheduleBusy} disabled={!newDate || rescheduleBusy} style={{ flex: 2 }}>
              Confirm New Schedule
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rescheduleError && <div role="alert" aria-live="assertive" className="wizard-error-banner">{rescheduleError}</div>}
          <label className="wizard-form-label">
            <span>New Service Date *</span>
            <input
              type="date"
              className="ds-input"
              value={newDate}
              onChange={e => { setNewDate(e.target.value); setRescheduleError(''); }}
              min={getLocalDateInputValue()}
              required
            />
          </label>

          <label className="wizard-form-label">
            <span>New Time Slot *</span>
            <select
              className="ds-select"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
            >
              <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
              <option value="Afternoon (1 PM - 5 PM)">Afternoon (1 PM - 5 PM)</option>
              <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
              <option value="Emergency (ASAP)">Emergency (ASAP)</option>
            </select>
          </label>
        </div>
      </Modal>
    </section>
  );
}
