import React from 'react';
import { RefreshCw, Ban, ClipboardList, Search, Star, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function MyBookingsList({
  bookings,
  isLoading,
  onRefresh,
  onCancelBooking,
  onDisputeBooking,
  onOpenDisputeModal,
  onExploreServices,
  onOpenReviewModal
}) {
  return (
    <section style={{ margin: '30px 0 60px' }}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR ACTIVE REQUESTS</span>
          <h2>My Bookings ({bookings.length})</h2>
        </div>
        <button
          type="button"
          className="refresh-users-btn"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#68776d' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
          Loading your bookings...
        </div>
      ) : bookings.length > 0 ? (
        <div className="bookings-feed">
          {bookings.map(b => (
            <div key={b.id} className="booking-card-item">
              <div className="booking-card-header">
                <div>
                  <span className="booking-service-title">{b.categoryName || 'Service Request'}</span>
                  <span style={{ fontSize: '11px', color: '#7c8a81', marginLeft: '10px' }}>
                    Ref: #{b.id}
                  </span>
                </div>
                <span className={`booking-status-tag ${b.status}`}>
                  {b.status === 'requested' ? '⏳ Pending Confirmation' :
                   b.status === 'accepted' ? '✅ Accepted & Scheduled' :
                   b.status === 'in_progress' ? '⚡ In Progress' :
                   b.status === 'completed' ? '🎉 Completed' : b.status}
                </span>
              </div>

              <div className="booking-details-grid">
                <div>
                  <b>Provider:</b> {b.providerName}
                </div>
                <div>
                  <b>Provider Contact:</b> <a href={`tel:${b.providerPhone}`} style={{ color: '#174d3d', fontWeight: 600 }}>{b.providerPhone}</a>
                </div>
                <div>
                  <b>Scheduled Date:</b> {b.bookingDate} ({b.bookingTime})
                </div>
                <div>
                  <b>Service Address:</b> {b.serviceAddress}
                </div>
              </div>

              <div className="booking-problem-box">
                <b>Problem Description:</b> {b.problemDescription}
              </div>

              {/* Workmanship Guarantee & Review Section */}
              {b.status === 'completed' && (
                <div style={{
                  marginTop: 12,
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: b.review ? 8 : 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#047857', fontWeight: 600 }}>
                      <ShieldCheck size={16} color="#059669" />
                      <span>🛡️ 14-Day ARY Workmanship Guarantee Active</span>
                    </div>

                    {!b.review && (
                      <button
                        type="button"
                        onClick={() => onOpenReviewModal && onOpenReviewModal(b)}
                        style={{
                          background: '#f59e0b',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Star size={14} fill="#fff" /> Rate & Review Service
                      </button>
                    )}
                  </div>

                  {b.review && (
                    <div style={{
                      marginTop: 6,
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              size={14}
                              fill={s <= b.review.rating ? '#f59e0b' : '#e2e8f0'}
                              color={s <= b.review.rating ? '#d97706' : '#cbd5e1'}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                          Verified Review ({b.review.rating}/5)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
                          {new Date(b.review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {b.review.comment && (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>
                          "{b.review.comment}"
                        </p>
                      )}
                    </div>
                  )}
                  {b.status === 'completed' && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="dispute-workmanship-btn"
                        onClick={() => {
                          if (onOpenDisputeModal) {
                            onOpenDisputeModal(b);
                          } else if (onDisputeBooking) {
                            onDisputeBooking(b.id);
                          }
                        }}
                        style={{
                          background: '#fff',
                          border: '1px solid #fca5a5',
                          color: '#dc2626',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <AlertTriangle size={12} color="#dc2626" /> Dispute Workmanship
                      </button>
                    </div>
                  )}
                </div>
              )}

              {b.status === 'disputed' && (
                <div style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.8rem',
                  color: '#991b1b'
                }}>
                  <AlertTriangle size={15} color="#ef4444" />
                  <span><b>Dispute Under Review:</b> Escrow payment is safely frozen while ARY Administration investigates your claim.</span>
                </div>
              )}

              {b.status === 'refunded' && (
                <div style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.8rem',
                  color: '#166534'
                }}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span><b>Refund Completed:</b> 100% full refund has been credited back to your account under the ARY Guarantee.</span>
                </div>
              )}

              {(b.status === 'requested' || b.status === 'accepted' || b.status === 'in_progress') && (
                <div className="booking-actions-row">
                  <button
                    type="button"
                    className="booking-action-btn cancel"
                    onClick={() => onCancelBooking(b.id)}
                  >
                    <Ban size={13} /> {b.status === 'in_progress' ? 'Cancel (Call-Out Fee Applies)' : 'Cancel Booking'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-providers-box">
          <ClipboardList size={34} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <b>No bookings placed yet.</b>
          <p style={{ fontSize: '12px', margin: '6px 0 16px' }}>
            Need a plumber, electrician or local delivery? Browse services to book a verified provider!
          </p>
          <button
            type="button"
            className="prompt-sign-in-btn"
            style={{ margin: '0 auto' }}
            onClick={onExploreServices}
          >
            <Search size={14} /> Explore Available Services
          </button>
        </div>
      )}
    </section>
  );
}
