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
  AlertCircle
} from 'lucide-react';
import { Button, Badge, StatusPill, Tabs, Stepper, ConfirmDialog, Modal } from '../../design-system';

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
  const [activeTab, setActiveTab] = useState('all');
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('Morning (9 AM - 12 PM)');
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  const TABS = [
    { id: 'all', label: 'All', badge: bookings.length },
    { id: 'upcoming', label: 'Upcoming', badge: bookings.filter(b => ['requested', 'accepted'].includes(b.status)).length },
    { id: 'in_progress', label: 'In Progress', badge: bookings.filter(b => b.status === 'in_progress').length },
    { id: 'completed', label: 'Completed', badge: bookings.filter(b => b.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', badge: bookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).length }
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

  return (
    <section className="my-bookings-container">
      <div className="section-heading">
        <div>
          <div className="eyebrow">YOUR ACTIVE REQUESTS</div>
          <h2>My Bookings ({bookings.length})</h2>
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

      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        aria-label="Filter Bookings by Status"
        className="bookings-tabs-bar"
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto var(--space-3)', display: 'block' }} />
          Loading your bookings...
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="bookings-feed">
          {filteredBookings.map(b => {
            const stepIndex = getStepIndex(b.status);
            const isTerminal = ['completed', 'cancelled', 'rejected'].includes(b.status);

            return (
              <div key={b.id} className="booking-card-item">
                <div className="booking-card-header">
                  <div>
                    <span className="booking-service-title">{b.categoryName || 'Service Request'}</span>
                    <span className="booking-ref-tag">Ref: #{b.id?.slice(0, 8)}</span>
                  </div>
                  <StatusPill status={b.status} />
                </div>

                {!isTerminal && (
                  <div className="booking-stepper-box">
                    <Stepper
                      steps={['Requested', 'Accepted', 'In Progress', 'Completed']}
                      currentStep={stepIndex}
                    />
                  </div>
                )}

                <div className="booking-details-grid">
                  <div>
                    <span className="detail-label">Provider</span>
                    <span className="detail-val">{b.providerName || 'Assigned Provider'}</span>
                  </div>

                  <div>
                    <span className="detail-label">Provider Phone</span>
                    {b.providerPhone ? (
                      <a href={`tel:${b.providerPhone}`} className="detail-phone-link">
                        <Phone size={13} /> {b.providerPhone}
                      </a>
                    ) : (
                      <span className="detail-val">Pending assignment</span>
                    )}
                  </div>

                  <div>
                    <span className="detail-label">Scheduled Date & Time</span>
                    <span className="detail-val">{b.bookingDate} ({b.bookingTime})</span>
                  </div>

                  <div>
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

                {/* Pending Quote Decision */}
                {b.quote?.status === 'pending' && (
                  <div className="booking-quote-card">
                    <div className="quote-header">
                      <b>Quote Received: LKR {Number(b.quote.amount).toLocaleString('en-LK')}</b>
                      <span className="quote-scope">{b.quote.scope}</span>
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
                      <b>Provider suggested a new time:</b> {b.reschedule.date} ({b.reschedule.time})
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
        <div className="no-bookings-placeholder">
          <ClipboardList size={40} className="placeholder-icon" />
          <h3>No bookings in this tab</h3>
          <p>Looking for a verified Sri Lankan electrician, plumber, AC tech, or parcel delivery?</p>
          <Button
            variant="primary"
            size="md"
            icon={Search}
            onClick={onExploreServices}
          >
            Explore Services
          </Button>
        </div>
      )}

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        title="Cancel Service Booking"
        message="Are you sure you want to cancel this booking? This action will immediately notify the provider."
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
          <>
            <Button variant="ghost" onClick={() => setRescheduleTarget(null)} disabled={rescheduleBusy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReschedule} loading={rescheduleBusy}>
              Send Reschedule Request
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label className="ds-label"><span>New Service Date *</span></label>
          <input
            type="date"
            className="ds-input"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />

          <label className="ds-label"><span>New Time Slot *</span></label>
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
        </div>
      </Modal>
    </section>
  );
}
