import React from 'react';
import { ShieldAlert, CheckCircle2, RotateCcw, Scale, Check, User, MapPin, Calendar } from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../../design-system';

export default function AdminDisputes({
  bookings = [],
  onArbitrate,
  arbitratingId = null
}) {
  const disputedBookings = bookings.filter(b => b.status === 'disputed' || b.paymentStatus === 'disputed_frozen');

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <Card style={{ padding: '18px 20px', background: 'var(--color-surface, #fff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={22} color="var(--color-danger-600, #dc2626)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-danger-900, #7f1d1d)' }}>
              Disputes & Escrow Arbitration ({disputedBookings.length})
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Review customer workmanship complaints and exercise binding administrative authority over frozen escrow funds.
            </p>
          </div>
        </div>
      </Card>

      {disputedBookings.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No active disputes"
          description="All contractor jobs are currently in good standing under the 14-Day ARY Workmanship Guarantee."
        />
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {disputedBookings.map(b => (
            <Card key={b.id} style={{ padding: '20px', border: '1.5px solid var(--color-danger-300, #fca5a5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div>
                  <b style={{ fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>{b.categoryName || 'Service Job'}</b>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', marginLeft: 8 }}>
                    Job Ref: #{b.id}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant="danger" dot={true}>
                    Escrow Frozen: LKR {Number(b.baseAmount || parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500).toLocaleString()}
                  </Badge>
                </div>
              </div>

              {/* Grid of details */}
              <div style={{
                background: 'var(--color-neutral-50, #f8fafc)',
                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 10,
                fontSize: '0.82rem',
                marginBottom: 12
              }}>
                <div><b>Customer:</b> {b.customerName} ({b.customerPhone})</div>
                <div><b>Provider:</b> {b.providerName} ({b.providerPhone || 'N/A'})</div>
                <div><b>Job Address:</b> {b.serviceAddress}</div>
                <div><b>Booking Date:</b> {b.bookingDate} ({b.bookingTime})</div>
              </div>

              {/* Dispute statement */}
              <div style={{
                background: 'var(--color-danger-50, #fef2f2)',
                border: '1px solid var(--color-danger-200, #fecaca)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '12px 14px',
                marginBottom: 16
              }}>
                <b style={{ color: 'var(--color-danger-900, #991b1b)', fontSize: '0.85rem' }}>
                  Client Dispute Statement:
                </b>
                <p style={{ margin: '4px 0 0', color: 'var(--color-danger-800, #7f1d1d)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  "{b.disputeReason || 'Unsatisfactory workmanship reported under ARY Guarantee'}"
                </p>
                {b.disputeEvidence && (
                  <p style={{ margin: '6px 0 0', color: 'var(--color-neutral-600, #475569)', fontSize: '0.8rem' }}>
                    Evidence notes: {b.disputeEvidence}
                  </p>
                )}
              </div>

              {/* Arbitration Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onArbitrate(b.id, 'refund_customer')}
                  loading={arbitratingId === b.id}
                >
                  <RotateCcw size={14} /> 100% Refund Customer
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onArbitrate(b.id, 'split_50_50')}
                  loading={arbitratingId === b.id}
                >
                  <Scale size={14} /> 50/50 Mediated Split
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onArbitrate(b.id, 'release_provider')}
                  loading={arbitratingId === b.id}
                >
                  <Check size={14} /> Release Payout to Provider
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
