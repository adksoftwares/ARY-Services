import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Scale,
  Check,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  FileText,
  DollarSign
} from 'lucide-react';
import { Card, Badge, Button, EmptyState, Modal } from '../../design-system';

export default function AdminDisputes({
  bookings = [],
  onArbitrate,
  arbitratingId = null
}) {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedAction, setSelectedAction] = useState('split_50_50'); // 'refund_customer' | 'split_50_50' | 'release_provider'
  const [arbitrationNotes, setArbitrationNotes] = useState('');

  const disputedBookings = bookings.filter(
    b => b.status === 'disputed' || b.paymentStatus === 'disputed_frozen' || b.dispute
  );

  function openArbitrationModal(booking) {
    setSelectedBooking(booking);
    setSelectedAction('split_50_50');
    setArbitrationNotes('');
  }

  function calculateLedgerPreview(amount, action) {
    const total = Number(amount) || 1500;
    if (action === 'refund_customer') {
      return {
        customerRefund: total,
        providerPayout: 0,
        platformCommission: 0,
        summaryText: 'Customer receives 100% refund. Escrow funds returned.'
      };
    } else if (action === 'release_provider') {
      const commission = Math.round(total * 0.1);
      const payout = total - commission;
      return {
        customerRefund: 0,
        providerPayout: payout,
        platformCommission: commission,
        summaryText: 'Provider receives 90% contract payout. ARY 10% commission recognized.'
      };
    } else {
      // 50/50 split
      const customerRefund = Math.round(total * 0.5);
      const providerGross = total - customerRefund;
      const commission = Math.round(providerGross * 0.1);
      const providerPayout = providerGross - commission;
      return {
        customerRefund,
        providerPayout,
        platformCommission: commission,
        summaryText: '50% refunded to Customer. 50% released to Provider (less 10% platform fee).'
      };
    }
  }

  async function handleConfirmArbitration() {
    if (!selectedBooking) return;
    await onArbitrate(selectedBooking.id, selectedAction, arbitrationNotes);
    setSelectedBooking(null);
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header Card */}
      <Card style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#fef2f2',
            color: '#dc2626',
            display: 'grid',
            placeItems: 'center'
          }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#7f1d1d' }}>
              Disputes & Escrow Arbitration Console ({disputedBookings.length})
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Review customer workmanship complaints and exercise binding administrative authority over frozen escrow funds under ARY 14-Day Guarantee.
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Disputed Bookings Feed */}
      {disputedBookings.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <EmptyState
            icon={CheckCircle2}
            title="All escrow funds in good standing"
            description="Zero customer workmanship disputes are currently open on the platform."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {disputedBookings.map(b => {
            const rawCharge = b.baseAmount || parseInt(String(b.baseCharge || '1500').replace(/\D/g, ''), 10) || 1500;

            return (
              <Card
                key={b.id}
                style={{
                  padding: '22px',
                  border: '1.5px solid #fca5a5',
                  boxShadow: '0 4px 16px rgba(220, 38, 38, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: '1.05rem', color: 'var(--color-text, #0f172a)' }}>
                        {b.categoryName || 'Service Order'}
                      </b>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                        Ref: #{b.id}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 2 }}>
                      Booking Date: <b>{b.bookingDate}</b> at {b.bookingTime}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Badge variant="danger" dot={true}>
                      FROZEN ESCROW: LKR {rawCharge.toLocaleString()}
                    </Badge>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openArbitrationModal(b)}
                      loading={arbitratingId === b.id}
                    >
                      <Scale size={14} /> Arbitrate Dispute
                    </Button>
                  </div>
                </div>

                {/* Participant Details Box */}
                <div style={{
                  background: 'var(--color-surface-raised, #f8fafc)',
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  fontSize: '0.82rem',
                  marginBottom: 14
                }}>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.74rem' }}>Customer</span>
                    <b>{b.customerName}</b> ({b.customerPhone})
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.74rem' }}>Assigned Provider</span>
                    <b>{b.providerName}</b> ({b.providerPhone || 'On File'})
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.74rem' }}>Job Site Address</span>
                    <b>{b.serviceAddress || 'Colombo Area'}</b>
                  </div>
                </div>

                {/* Dispute Reason & Customer Statement */}
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '14px',
                  color: '#7f1d1d',
                  fontSize: '0.85rem'
                }}>
                  <b style={{ display: 'block', marginBottom: 4, color: '#991b1b' }}>
                    Customer Workmanship Claim:
                  </b>
                  <p style={{ margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{b.disputeReason || b.dispute?.reason || 'Work was not completed to professional trade standards. Requested refund under guarantee.'}"
                  </p>
                  {b.disputeEvidence && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#b91c1c' }}>
                      Evidence notes: {b.disputeEvidence}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 3. Interactive Arbitration Decision Modal */}
      {selectedBooking && (
        <Modal
          isOpen={Boolean(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
          title={`Arbitrate Dispute: Booking #${selectedBooking.id}`}
          maxWidth="640px"
        >
          {(() => {
            const rawCharge = selectedBooking.baseAmount || parseInt(String(selectedBooking.baseCharge || '1500').replace(/\D/g, ''), 10) || 1500;
            const preview = calculateLedgerPreview(rawCharge, selectedAction);

            return (
              <div style={{ padding: '4px 0', display: 'grid', gap: 16 }}>
                {/* Booking & Escrow Summary */}
                <div style={{
                  padding: '14px',
                  background: 'var(--color-surface-raised, #f8fafc)',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <b style={{ color: 'var(--color-text, #0f172a)', fontSize: '0.95rem' }}>{selectedBooking.categoryName || 'Service Order'}</b>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                      Customer: {selectedBooking.customerName} · Provider: {selectedBooking.providerName}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)', display: 'block' }}>Frozen Escrow</span>
                    <b style={{ fontSize: '1.25rem', color: '#b91c1c' }}>LKR {rawCharge.toLocaleString()}</b>
                  </div>
                </div>

                {/* Arbitration Decision Options */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-neutral-700, #334155)', marginBottom: 8 }}>
                    Select Administrative Ruling:
                  </label>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      {
                        id: 'split_50_50',
                        title: 'Option A: 50/50 Mediated Settlement (Recommended)',
                        desc: 'Customer receives 50% refund. Provider receives 50% payout (less 10% platform fee).'
                      },
                      {
                        id: 'refund_customer',
                        title: 'Option B: 100% Refund to Customer',
                        desc: 'Full escrow return to customer wallet. Provider payout forfeited due to incomplete job.'
                      },
                      {
                        id: 'release_provider',
                        title: 'Option C: Release Payout to Provider',
                        desc: 'Provider receives 90% net payout. Complaint dismissed after review of evidence.'
                      }
                    ].map(opt => (
                      <div
                        key={opt.id}
                        className={`dispute-decision-option ${selectedAction === opt.id ? 'selected' : ''}`}
                        onClick={() => setSelectedAction(opt.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <b style={{ fontSize: '0.88rem', color: 'var(--color-text, #0f172a)' }}>{opt.title}</b>
                          {selectedAction === opt.id && <Check size={16} color="var(--color-brand-600, #174d3d)" />}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                          {opt.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Amount Calculation Preview */}
                <div style={{
                  background: 'var(--color-brand-50, #edf7f2)',
                  border: '1px solid var(--color-brand-200, #b7decb)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Scale size={16} color="var(--color-brand-600, #174d3d)" />
                    <b style={{ fontSize: '0.85rem', color: 'var(--color-brand-900, #0c2d23)' }}>
                      Double-Entry Settlement Breakdown (Live Preview)
                    </b>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    textAlign: 'center'
                  }}>
                    <div style={{ background: 'var(--color-surface, #ffffff)', padding: '10px', borderRadius: 6, border: '1px solid var(--color-brand-200, #b7decb)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)', display: 'block' }}>Customer Refund</span>
                      <b style={{ fontSize: '1.05rem', color: '#166534' }}>LKR {preview.customerRefund.toLocaleString()}</b>
                    </div>
                    <div style={{ background: 'var(--color-surface, #ffffff)', padding: '10px', borderRadius: 6, border: '1px solid var(--color-brand-200, #b7decb)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)', display: 'block' }}>Provider Payout</span>
                      <b style={{ fontSize: '1.05rem', color: 'var(--color-brand-700, #174d3d)' }}>LKR {preview.providerPayout.toLocaleString()}</b>
                    </div>
                    <div style={{ background: 'var(--color-surface, #ffffff)', padding: '10px', borderRadius: 6, border: '1px solid var(--color-brand-200, #b7decb)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)', display: 'block' }}>ARY Commission</span>
                      <b style={{ fontSize: '1.05rem', color: 'var(--color-neutral-700, #334155)' }}>LKR {preview.platformCommission.toLocaleString()}</b>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: '0.76rem', color: 'var(--color-brand-800, #154636)', fontStyle: 'italic' }}>
                    {preview.summaryText}
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 4 }}>
                    Administrative Ruling Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={arbitrationNotes}
                    onChange={(e) => setArbitrationNotes(e.target.value)}
                    placeholder="e.g. Incomplete wiring corrected by third party; 50% refund applied."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      borderRadius: 'var(--radius-md, 8px)',
                      fontSize: '0.84rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <Button variant="ghost" onClick={() => setSelectedBooking(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmArbitration}
                    loading={arbitratingId === selectedBooking.id}
                  >
                    <CheckCircle2 size={15} /> Execute Binding Settlement
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
