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
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('Morning (9 AM - 12 PM)');
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  const TABS = [
    { id: 'upcoming', label: 'Upcoming', badge: bookings.filter(b => ['requested', 'accepted'].includes(b.status)).length },
    { id: 'in_progress', label: 'In Progress', badge: bookings.filter(b => b.status === 'in_progress').length },
    { id: 'completed', label: 'Completed', badge: bookings.filter(b => b.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', badge: bookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).length },
    { id: 'all', label: 'All Requests', badge: bookings.length }
  ];

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    if (activeTab === 'upcoming') return bookings.filter(b => ['requested', 'accepted'].includes(b.status));
    if (activeTab === 'in_progress') return bookings.filter(b => b.status === 'in_progress');
    if (activeTab === 'completed') return bookings.filter(b => b.status === 'completed');
    if (activeTab === 'cancelled') return bookings.filter(b => ['cancelled', 'rejected'].includes(b.status));
    return bookings;
  }, [bookings, activeTab]);

  const getStepIndex = (status) => {
    switch (status) {
      case 'requested': return 0;
      case 'accepted': return 1;
      case 'in_progress': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  async function handleConfirmReschedule() {
    if (!rescheduleTarget || !newDate || !onRescheduleBooking) return;
    setRescheduleBusy(true);
    try {
      await onRescheduleBooking(rescheduleTarget.id, newDate, newTime);
      setRescheduleTarget(null);
    } finally {
      setRescheduleBusy(false);
    }
  }

  const emptyTabDescriptions = {
    upcoming: 'You have no pending or accepted upcoming service appointments.',
    in_progress: 'No technicians or trade specialists currently on-site or in transit.',
    completed: 'You haven\'t completed any service appointments yet.',
    cancelled: 'No cancelled or rejected service requests.',
    all: 'No booking history found.'
  };

  return (
    <section className="my-bookings-container" aria-labelledby="bookings-main-title">
      <div className="section-heading">
        <div>
          <div className="eyebrow">YOUR ACTIVE REQUESTS</div>
          <h2 id="bookings-main-title">My Bookings ({bookings.length})</h2>
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
              <div key={b.id} className="booking-card-item" aria-labelledby={`booking-title-${b.id}`}>
                {/* Header */}
                <div className="booking-card-header">
                  <div className="booking-card-title-col">
                    <h3 id={`booking-title-${b.id}`} className="booking-service-title">
                      {b.categoryName || 'Service Request'}
                    </h3>
                    <span className="booking-ref-tag">Ref: #{b.id?.slice(0, 8)}</span>
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
                    <span className="detail-val">{b.providerName || 'Assigned Provider'}</span>
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
                    <span className="detail-val">{b.bookingDate} ({b.bookingTime})</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Service Address</span>
                    <span className="detail-val">{b.serviceAddress}</span>
                  </div>
                </div>

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
                        <h4 className="quote-price">LKR {Number(b.quote.amount).toLocaleString('en-LK')}</h4>
                      </div>
                      <p className="quote-scope"><b>Scope:</b> {b.quote.scope}</p>
                    </div>
                    <div className="quote-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => onQuoteDecision && onQuoteDecision(b.id, 'accepted')}
                      >
                        Accept Quote
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={X}
                        onClick={() => onQuoteDecision && onQuoteDecision(b.id, 'declined')}
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
                        onClick={() => onRescheduleBooking && onRescheduleBooking(b.id, b.reschedule.date, b.reschedule.time, 'accepted')}
                      >
                        Accept Time
                      </Button>
                    </div>
                  </div>
                )}

                {/* Booking Footer Actions */}
                <div className="booking-card-footer">
                  <div className="booking-warranty-indicator">
                    <ShieldCheck size={14} />
                    <span>14-Day ARY Workmanship Protection</span>
                  </div>

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
                    {['requested', 'accepted'].includes(b.status) && (
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

                    {/* Dispute Button */}
                    {['accepted', 'in_progress', 'completed'].includes(b.status) && !b.dispute && (
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
        onClose={() => setCancelTargetId(null)}
        title="Cancel Service Booking"
        message="Are you sure you want to cancel this booking? The assigned provider will be notified immediately."
        confirmLabel="Yes, Cancel Booking"
        isDanger={true}
        onConfirm={async () => {
          if (cancelTargetId && onCancelBooking) {
            await onCancelBooking(cancelTargetId);
          }
          setCancelTargetId(null);
        }}
      />

      {/* Reschedule Modal */}
      <Modal
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule Booking"
        isBottomSheet={true}
        footer={
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <Button variant="ghost" onClick={() => setRescheduleTarget(null)} disabled={rescheduleBusy} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReschedule} loading={rescheduleBusy} style={{ flex: 2 }}>
              Confirm New Schedule
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label className="wizard-form-label">
            <span>New Service Date *</span>
            <input
              type="date"
              className="ds-input"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
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
              <option value="Afternoon (1 PM - 4 PM)">Afternoon (1 PM - 4 PM)</option>
              <option value="Evening (4 PM - 7 PM)">Evening (4 PM - 7 PM)</option>
              <option value="Emergency / As Soon As Possible">Emergency / As Soon As Possible</option>
            </select>
          </label>
        </div>
      </Modal>
    </section>
  );
}
