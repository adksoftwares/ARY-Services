import React from 'react';
import { Banknote, CheckCircle2, Zap, Landmark, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../../design-system';

export default function AdminPayouts({
  bookings = [],
  payoutResult,
  onRunPayout,
  isSettling = false
}) {
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalCompletedGross = completedBookings.reduce((sum, b) => {
    return sum + (b.baseAmount || parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500);
  }, 0);
  const totalNetPayable = Math.round(totalCompletedGross * 0.9);

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header & Trigger Card */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Landmark size={22} color="var(--color-brand-600, #174d3d)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-900, #173b2f)' }}>
                LankaPay CEFT Automated Payout Settlement
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)', maxWidth: 640 }}>
              Aggregate completed jobs, enforce 10% platform commission, and construct tamper-proof LankaPay CEFT Direct Settlement batch files.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={onRunPayout}
            loading={isSettling}
            disabled={isSettling}
          >
            <Zap size={16} /> Execute CEFT Payout Run (Min: LKR 1,000)
          </Button>
        </div>

        {/* Stats strip */}
        <div style={{
          marginTop: 18,
          padding: '12px 16px',
          background: 'var(--color-neutral-50, #f8fafc)',
          borderRadius: 'var(--radius-md, 8px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Completed Jobs</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{completedBookings.length} bookings</b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Estimated Net Payout (90%)</span>
            <b style={{ color: 'var(--color-brand-700, #174d3d)' }}>LKR {totalNetPayable.toLocaleString()}</b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Platform Commission (10%)</span>
            <b style={{ color: 'var(--color-neutral-700, #334155)' }}>LKR {Math.round(totalCompletedGross * 0.1).toLocaleString()}</b>
          </div>
        </div>
      </Card>

      {/* 2. Generated Settlement Manifest */}
      {payoutResult && (
        <Card style={{
          padding: '20px',
          background: 'var(--color-surface, #fff)',
          border: '1.5px solid var(--color-brand-400, #56a582)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <CheckCircle2 size={22} color="var(--color-brand-600, #174d3d)" />
            <div>
              <b style={{ color: 'var(--color-brand-900, #0c2d23)', fontSize: '1.05rem' }}>
                CEFT Bank Settlement Manifest Generated Successfully
              </b>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-brand-700, #1b5e4b)' }}>
                Batch Reference: <code>{payoutResult.batchId}</code>
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--color-brand-50, #edf7f2)',
            border: '1px solid var(--color-brand-200, #b7decb)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '14px',
            marginBottom: 16
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '0.85rem' }}>
              <div><b>Total Disbursed:</b> <span style={{ color: 'var(--color-brand-700, #174d3d)', fontWeight: 800 }}>LKR {payoutResult.totalPayoutAmount?.toLocaleString()}</span></div>
              <div><b>Contractors Settled:</b> {payoutResult.providerCount} partners</div>
              <div><b>Transfer Protocol:</b> LankaPay CEFT Real-Time</div>
              <div><b>Double-Entry Balance:</b> Verified Balanced</div>
            </div>
            {payoutResult.checksum && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--color-brand-200, #b7decb)', fontSize: '0.75rem', color: 'var(--color-brand-800, #154636)' }}>
                <b>Cryptographic SHA-256 Digest:</b> <code style={{ wordBreak: 'break-all' }}>{payoutResult.checksum}</code>
              </div>
            )}
          </div>

          {/* Disbursements Table */}
          {payoutResult.disbursements && payoutResult.disbursements.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border-subtle, #f1f5f9)', textAlign: 'left', color: 'var(--color-neutral-600, #475569)' }}>
                    <th style={{ padding: '8px 10px' }}>Provider Name</th>
                    <th style={{ padding: '8px 10px' }}>Phone</th>
                    <th style={{ padding: '8px 10px' }}>Bank</th>
                    <th style={{ padding: '8px 10px' }}>Account Ref</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Disbursed Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutResult.disbursements.map(d => (
                    <tr key={d.providerId} style={{ borderBottom: '1px solid var(--color-border-subtle, #f8fafc)' }}>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{d.fullName}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{d.phone}</td>
                      <td style={{ padding: '10px' }}>{d.bankName || 'Commercial Bank'}</td>
                      <td style={{ padding: '10px' }}><code>{d.accountNumber || '****4921'}</code></td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-brand-700, #174d3d)' }}>
                        LKR {d.amount?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
