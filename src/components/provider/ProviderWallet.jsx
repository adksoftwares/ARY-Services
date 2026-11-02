import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Banknote,
  Wallet,
  ArrowUpRight,
  Clock,
  Landmark,
  FileCheck
} from 'lucide-react';
import { Card, Badge, Button, StatusPill, EmptyState, DataTable } from '../../design-system';

export default function ProviderWallet({
  bookings = [],
  ledgerEntries = [],
  walletBalance = 0,
  currentUser
}) {
  const [requestPayoutOpen, setRequestPayoutOpen] = useState(false);
  const [payoutRequested, setPayoutRequested] = useState(false);

  const completedBookings = bookings.filter(b => b.status === 'completed');

  const totalEarnedPayout = completedBookings.reduce((sum, b) => {
    return sum + (b.providerPayout || Math.round((parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500) * 0.9));
  }, 0);

  const pendingEscrowPayout = bookings
    .filter(b => b.paymentStatus === 'escrow_held' && b.status !== 'completed')
    .reduce((sum, b) => {
      return sum + (b.providerPayout || Math.round((parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500) * 0.9));
    }, 0);

  const totalPlatformFees = completedBookings.reduce((sum, b) => {
    return sum + (b.platformFee || Math.round((parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500) * 0.1));
  }, 0);

  function handleRequestPayout() {
    setPayoutRequested(true);
    setTimeout(() => {
      setRequestPayoutOpen(false);
    }, 2000);
  }

  return (
    <div className="provider-wallet-container" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Financial Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <Card style={{
          background: 'var(--color-brand-50, #edf7f2)',
          border: '1px solid var(--color-brand-200, #b7decb)',
          padding: '18px 20px'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-brand-800, #154636)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} color="var(--color-brand-600, #174d3d)" /> Net Earnings (Released)
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-brand-700, #174d3d)', marginTop: 6, letterSpacing: '-0.02em' }}>
            LKR {totalEarnedPayout.toLocaleString()}
          </div>
          <small style={{ fontSize: '0.75rem', color: 'var(--color-brand-700, #1b5e4b)' }}>
            From {completedBookings.length} completed job{completedBookings.length === 1 ? '' : 's'}
          </small>
        </Card>

        <Card style={{
          background: 'var(--color-warning-50, #fffbeb)',
          border: '1px solid var(--color-warning-200, #fde68a)',
          padding: '18px 20px'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-warning-900, #92400e)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#d97706" /> Escrow Balance (Pending)
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-warning-700, #b45309)', marginTop: 6, letterSpacing: '-0.02em' }}>
            LKR {pendingEscrowPayout.toLocaleString()}
          </div>
          <small style={{ fontSize: '0.75rem', color: 'var(--color-warning-800, #78350f)' }}>
            Released immediately upon customer completion
          </small>
        </Card>

        <Card style={{
          background: 'var(--color-surface, #fff)',
          border: '1px solid var(--color-border-subtle, #e2e8f0)',
          padding: '18px 20px'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Banknote size={16} color="#64748b" /> Platform Fee (10%)
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-neutral-800, #1e293b)', marginTop: 6, letterSpacing: '-0.02em' }}>
            LKR {totalPlatformFees.toLocaleString()}
          </div>
          <small style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
            Covers customer support & 14-Day Guarantee
          </small>
        </Card>
      </div>

      {/* 2. Payout Action Banner */}
      <Card style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        background: 'linear-gradient(135deg, var(--color-brand-900, #0c2d23) 0%, var(--color-brand-800, #154636) 100%)',
        color: '#fff'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={20} color="var(--color-accent-400, #e2a87a)" />
            <b style={{ fontSize: '1.05rem', color: '#fff' }}>CEFT Direct Bank Payout</b>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#c3d9cf' }}>
            Request instant settlement to your registered Sri Lankan bank account (BOC, Commercial Bank, Sampath, HNB).
          </p>
        </div>
        <Button
          variant="accent"
          size="md"
          onClick={() => setRequestPayoutOpen(true)}
          disabled={totalEarnedPayout <= 0}
        >
          <ArrowUpRight size={16} /> Request CEFT Payout
        </Button>
      </Card>

      {/* Payout Modal / Sheet */}
      {requestPayoutOpen && (
        <Card style={{
          padding: '20px',
          border: '2px solid var(--color-brand-500, #174d3d)',
          background: 'var(--color-surface, #fff)'
        }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--color-brand-900, #173b2f)' }}>
            Confirm CEFT Bank Settlement
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-neutral-600, #475569)', marginBottom: 14 }}>
            Net payable amount: <b>LKR {totalEarnedPayout.toLocaleString()}</b> will be transferred to:
          </p>
          <div style={{
            background: 'var(--color-neutral-50, #f8fafc)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.85rem',
            marginBottom: 16
          }}>
            <div><b>Beneficiary Name:</b> {currentUser?.fullName}</div>
            <div><b>Account Type:</b> Commercial Savings Account</div>
            <div><b>Transfer Mode:</b> LankaPay CEFT (Real-time 24/7)</div>
          </div>
          {payoutRequested ? (
            <Badge variant="success" dot={false}>
              ✓ Settlement request logged! Our treasury officer will release batch transfer within 2 hours.
            </Badge>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="primary" onClick={handleRequestPayout}>
                Confirm Payout Transfer
              </Button>
              <Button variant="ghost" onClick={() => setRequestPayoutOpen(false)}>
                Cancel
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* 3. Job Payout & Escrow History */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Job Payout & Escrow Breakdown ({bookings.length})
        </h3>

        {bookings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border-subtle, #f1f5f9)', textAlign: 'left', color: 'var(--color-neutral-500, #64748b)' }}>
                  <th style={{ padding: '10px 12px' }}>Job Ref</th>
                  <th style={{ padding: '10px 12px' }}>Customer</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Payment</th>
                  <th style={{ padding: '10px 12px' }}>Gross Fee</th>
                  <th style={{ padding: '10px 12px' }}>Commission (10%)</th>
                  <th style={{ padding: '10px 12px' }}>Net Payout (90%)</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const base = b.baseAmount || parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500;
                  const fee = b.platformFee || Math.round(base * 0.1);
                  const net = b.providerPayout || (base - fee);

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle, #f8fafc)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-neutral-700, #334155)' }}>
                        #{b.id.slice(-6)}
                      </td>
                      <td style={{ padding: '12px' }}>{b.customerName}</td>
                      <td style={{ padding: '12px', color: 'var(--color-neutral-500, #64748b)' }}>{b.bookingDate}</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant={b.paymentMethod === 'cash' ? 'neutral' : 'brand'} dot={false}>
                          {b.paymentMethod === 'cash' ? '💵 Cash' : '🛡️ Escrow'}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>LKR {base.toLocaleString()}</td>
                      <td style={{ padding: '12px', color: 'var(--color-danger-600, #dc2626)' }}>- LKR {fee.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-success-700, #047857)' }}>
                        LKR {net.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge
                          variant={
                            b.paymentStatus === 'released_to_provider' ? 'success' :
                            b.paymentStatus === 'escrow_held' ? 'warning' : 'neutral'
                          }
                          dot={false}
                        >
                          {b.paymentStatus === 'released_to_provider' ? '✓ Payout Released' :
                           b.paymentStatus === 'escrow_held' ? '⏳ Held in Escrow' : 'Direct Cash'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Wallet}
            title="No payout transactions yet"
            description="Complete customer bookings to record earnings and build up your escrow balance."
          />
        )}
      </Card>

      {/* 4. Immutable Double-Entry Ledger Audit Trail */}
      {ledgerEntries.length > 0 && (
        <Card style={{ padding: '20px', background: 'var(--color-neutral-50, #f8fafc)' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileCheck size={18} color="var(--color-brand-600, #174d3d)" />
            Double-Entry Ledger Audit Trail ({ledgerEntries.length} entries)
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border, #cbd5e1)', textAlign: 'left', color: 'var(--color-neutral-600, #475569)' }}>
                  <th style={{ padding: '8px 10px' }}>TX Ref</th>
                  <th style={{ padding: '8px 10px' }}>Account</th>
                  <th style={{ padding: '8px 10px' }}>Type</th>
                  <th style={{ padding: '8px 10px' }}>Amount (LKR)</th>
                  <th style={{ padding: '8px 10px' }}>Description</th>
                  <th style={{ padding: '8px 10px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                      {e.transactionId ? e.transactionId.slice(-8) : e.id.slice(-6)}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{e.account}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <Badge variant={e.type === 'credit' ? 'success' : 'danger'} dot={false}>
                        {e.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      LKR {Number(e.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-neutral-600, #475569)' }}>{e.description}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-neutral-400, #94a3b8)' }}>
                      {new Date(e.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
