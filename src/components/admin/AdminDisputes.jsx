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
  const [disputeSearch, setDisputeSearch] = useState('');
  const [cashFilter, setCashFilter] = useState('all');

  const disputedBookings = (Array.isArray(bookings) ? bookings : []).filter(
    booking => booking && typeof booking === 'object' && booking.id !== null && booking.id !== undefined &&
      (booking.status === 'disputed' || booking.paymentStatus === 'disputed_frozen' || Boolean(booking.dispute))
  );

  const normalizedDisputeSearch = disputeSearch.trim().toLowerCase();
  const visibleDisputes = disputedBookings.filter(booking => {
    const searchable = [booking.id, booking.categoryName, booking.customerName, booking.customerPhone, booking.providerName, booking.providerPhone, booking.serviceAddress, booking.bookingDate, booking.bookingTime, booking.disputeReason, booking.dispute?.reason, booking.disputeEvidence, booking.paymentStatus]
      .filter(value => value !== null && value !== undefined).join(' ').toLowerCase();
    const matchesSearch = !normalizedDisputeSearch || searchable.includes(normalizedDisputeSearch);
    const matchesCash = cashFilter === 'all' || (cashFilter === 'collected' ? booking.paymentStatus === 'cash_collected' : ['pending_cash', 'pending_quote'].includes(booking.paymentStatus));
    return matchesSearch && matchesCash;
  });

  function openArbitrationModal(booking) {
    setSelectedBooking(booking);
    setSelectedAction('split_50_50');
    setArbitrationNotes('');
  }

  function calculateLedgerPreview(amount, action) {
    const total = Number.isFinite(Number(amount)) && Number(amount) > 0 ? Number(amount) : 0;
    if (action === 'refund_customer') {
      return {
        customerRefund: total,
        providerPayout: 0,
        platformCommission: 0,
        summaryText: 'Proposed allocation: the full recorded booking amount is assigned to the customer. Confirm actual ledger eligibility before ruling.'
      };
    } else if (action === 'release_provider') {
      const payout = total;
      return {
        customerRefund: 0,
        providerPayout: payout,
        platformCommission: 0,
        summaryText: 'Proposed allocation: the full recorded booking amount is assigned to the provider before any separately configured adjustments.'
      };
    } else {
      // 50/50 split
      const customerRefund = Math.round(total * 0.5);
      const providerGross = total - customerRefund;
      const commission = 0;
      const providerPayout = providerGross;
      return {
        customerRefund,
        providerPayout,
        platformCommission: commission,
        summaryText: 'Proposed allocation: half of the recorded booking amount to the customer and half to the provider, before any separately configured adjustments.'
      };
    }
  }

  async function handleConfirmArbitration() {
    if (!selectedBooking || typeof onArbitrate !== 'function' || arbitratingId === selectedBooking.id) return;
    const completed = await onArbitrate(selectedBooking.id, selectedAction, arbitrationNotes);
    if (completed === true) setSelectedBooking(null);
  }

  return (
    <div className="admin-disputes-view" style={{ display: 'grid', gap: '16px' }}>
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
              Disputes & Cash Payment Review Console ({disputedBookings.length})
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Review disputed bookings, confirm cash collection records and coordinate offline resolutions. Customer payments are exchanged directly with providers; ARY does not hold customer cash.
            </p>
          </div>
        </div>
      </Card>

      {/* 2. Disputed Bookings Feed */}
      {disputedBookings.length > 0 && (
        <Card style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(170px, 220px) auto', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.75rem', color: 'var(--color-neutral-600, #475569)' }}>
              Search disputes
              <input value={disputeSearch} onChange={event => setDisputeSearch(event.target.value)} placeholder="Booking, customer, provider, reason…" aria-label="Search disputed bookings" style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '9px 11px', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 8, background: 'var(--color-surface, #fff)', color: 'var(--color-text, #0f172a)' }} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.75rem', color: 'var(--color-neutral-600, #475569)' }}>
              Cash collection
              <select value={cashFilter} onChange={event => setCashFilter(event.target.value)} aria-label="Filter disputes by cash collection status" style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 8, background: 'var(--color-surface, #fff)', color: 'var(--color-text, #0f172a)' }}>
                <option value="all">All cash states</option><option value="collected">Cash received</option><option value="pending">Cash not yet confirmed</option>
              </select>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
              <span aria-live="polite" style={{ fontSize: '0.78rem', color: 'var(--color-neutral-600, #475569)', whiteSpace: 'nowrap' }}>{visibleDisputes.length} of {disputedBookings.length} shown</span>
              {(disputeSearch || cashFilter !== 'all') && <Button size="sm" variant="ghost" onClick={() => { setDisputeSearch(''); setCashFilter('all'); }}>Clear</Button>}
            </div>
          </div>
        </Card>
      )}
      {disputedBookings.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <EmptyState
            icon={CheckCircle2}
            title="No disputed bookings in this queue"
            description="Disputed bookings will appear here when they are included in the admin workspace data."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {visibleDisputes.length === 0 ? (
            <Card style={{ padding: '28px', textAlign: 'center' }}>
              <EmptyState icon={FileText} title="No matching disputes" description="Try another booking reference, participant, dispute reason, or payment filter." />
              <div style={{ marginTop: 12 }}><Button size="sm" variant="outline" onClick={() => { setDisputeSearch(''); setCashFilter('all'); }}>Clear filters</Button></div>
            </Card>
          ) : visibleDisputes.map(b => {
            const rawCharge = Number(b.baseAmount ?? String(b.baseCharge || '').replace(/[^0-9]/g, '')) || 0;

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
                      Booking Date: <b>{b.bookingDate || 'Date unavailable'}</b> at {b.bookingTime || 'Time unavailable'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Badge variant="danger" dot={true}>
                      DISPUTED BOOKING: {rawCharge > 0 ? `LKR ${rawCharge.toLocaleString()}` : 'Amount unavailable'}
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
                    <b>{b.customerName || 'Customer details unavailable'}</b> ({b.customerPhone || 'Phone not provided'})
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.74rem' }}>Assigned Provider</span>
                    <b>{b.providerName || 'Provider details unavailable'}</b> ({b.providerPhone || 'Phone not provided'})
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.74rem' }}>Job Site Address</span>
                    <b>{b.serviceAddress || 'Address not provided'}</b>
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
                    "{b.disputeReason || b.dispute?.reason || 'No dispute statement was supplied.'}"
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
            const rawCharge = Number(selectedBooking.baseAmount ?? String(selectedBooking.baseCharge || '').replace(/[^0-9]/g, '')) || 0;
            const preview = calculateLedgerPreview(rawCharge, selectedAction);
            const hasFundedEscrow = selectedBooking.paymentStatus === 'escrow_held' && rawCharge > 0;

            return (
              <div style={{ padding: '4px 0', display: 'grid', gap: 16 }}>
                {/* Booking & Cash Payment Summary */}
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)', display: 'block' }}>Recorded booking amount</span>
                    <b style={{ fontSize: '1.25rem', color: '#b91c1c' }}>LKR {rawCharge.toLocaleString()}</b>
                  </div>
                </div>

                {!hasFundedEscrow && <div role="alert" style={{ padding: 12, borderRadius: 8, background: 'var(--color-warning-50, #fffbeb)', border: '1px solid var(--color-warning-200, #fde68a)', color: 'var(--color-warning-900, #78350f)', fontSize: '0.82rem' }}>ARY receives no customer cash for this booking. Automatic refund or payout actions are unavailable for direct-cash payments; review the collection record and coordinate any offline adjustment with both parties.</div>}

                {/* Legacy held-fund options — unavailable for direct cash bookings */}
                <div style={{ opacity: hasFundedEscrow ? 1 : 0.45, pointerEvents: hasFundedEscrow ? 'auto' : 'none' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-neutral-700, #334155)', marginBottom: 8 }}>
                    Select proposed administrative outcome:
                  </label>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      {
                        id: 'split_50_50',
                        title: 'Option A: 50/50 proposed allocation',
                        desc: 'Propose assigning half of the recorded amount to each party, subject to confirmed ledger rules.'
                      },
                      {
                        id: 'refund_customer',
                        title: 'Option B: 100% Refund to Customer',
                        desc: 'Propose assigning the recorded amount to the customer, subject to confirmed ledger rules.'
                      },
                      {
                        id: 'release_provider',
                        title: 'Option C: Release Payout to Provider',
                        desc: 'Propose assigning the recorded amount to the provider after reviewing the evidence and payment status.'
                      }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={selectedAction === opt.id}
                        className={`dispute-decision-option ${selectedAction === opt.id ? 'selected' : ''}`}
                        onClick={() => setSelectedAction(opt.id)}
                        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <b style={{ fontSize: '0.88rem', color: 'var(--color-text, #0f172a)' }}>{opt.title}</b>
                          {selectedAction === opt.id && <Check size={16} color="var(--color-brand-600, #174d3d)" />}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Indicative Amount Allocation Preview */}
                <div style={{
                  background: 'var(--color-brand-50, #edf7f2)',
                  border: '1px solid var(--color-brand-200, #b7decb)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Scale size={16} color="var(--color-brand-600, #174d3d)" />
                    <b style={{ fontSize: '0.85rem', color: 'var(--color-brand-900, #0c2d23)' }}>
                      Indicative allocation preview
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
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)', display: 'block' }}>Additional adjustment</span>
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
                    disabled={!hasFundedEscrow || typeof onArbitrate !== 'function' || selectedBooking.id === null || selectedBooking.id === undefined}
                  >
                    <CheckCircle2 size={15} /> Confirm administrative ruling
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
