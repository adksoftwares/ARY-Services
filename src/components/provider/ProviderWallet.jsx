import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Banknote,
  Wallet,
  ArrowUpRight,
  Clock,
  Landmark,
  FileCheck,
  Filter,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Card, Badge, Button, StatusPill, EmptyState, SegmentedControl } from '../../design-system';

export default function ProviderWallet({
  bookings = [],
  ledgerEntries = [],
  walletBalance = 0,
  currentUser
}) {
  const [requestPayoutOpen, setRequestPayoutOpen] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState('all'); // 'all' | 'credit' | 'debit'

  const safeBookings = useMemo(() => (Array.isArray(bookings) ? bookings : []).filter(b =>
    b && typeof b === 'object' && b.id !== null && b.id !== undefined && String(b.id).trim() !== ''
  ), [bookings]);
  const safeLedgerEntries = useMemo(() => (Array.isArray(ledgerEntries) ? ledgerEntries : []).filter(entry =>
    entry && typeof entry === 'object' && entry.id !== null && entry.id !== undefined && String(entry.id).trim() !== ''
  ), [ledgerEntries]);
  const normalizedWalletBalance = walletBalance !== null && walletBalance !== undefined && walletBalance !== '' && Number.isFinite(Number(walletBalance))
    ? Number(walletBalance)
    : null;
  const completedBookings = useMemo(() => safeBookings.filter(b => b.status === 'completed'), [safeBookings]);
  const pendingCashCollection = useMemo(() => safeBookings
    .filter(b => b.status === 'completed' && b.paymentStatus !== 'cash_collected')
    .reduce((sum, b) => {
      const amount = Number(b.baseAmount);
      return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
    }, 0), [safeBookings]);
  const totalPlatformFees = useMemo(() => completedBookings.filter(b => b.paymentStatus === 'cash_collected').reduce((sum, b) => {
    const fee = Number(b.platformFee);
    return sum + (Number.isFinite(fee) && fee >= 0 ? fee : 0);
  }, 0), [completedBookings]);
  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'credit') return safeLedgerEntries.filter(e => e.type === 'credit');
    if (ledgerFilter === 'debit') return safeLedgerEntries.filter(e => e.type === 'debit');
    return safeLedgerEntries;
  }, [safeLedgerEntries, ledgerFilter]);


  return (
    <div className="provider-wallet-container" data-workspace="provider-wallet" style={{ display: 'grid', gap: '20px' }}>
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
            <CheckCircle2 size={16} color="var(--color-brand-600, #174d3d)" /> Available Wallet Balance
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-brand-700, #174d3d)', marginTop: 6, letterSpacing: '-0.02em' }}>
            {normalizedWalletBalance === null ? '—' : `LKR ${normalizedWalletBalance.toLocaleString('en-LK')}`}
          </div>
          <small style={{ fontSize: '0.75rem', color: 'var(--color-brand-700, #1b5e4b)' }}>
            Available balance from your wallet ledger
          </small>
        </Card>

        <Card style={{
          background: 'var(--color-warning-50, #fffbeb)',
          border: '1px solid var(--color-warning-200, #fde68a)',
          padding: '18px 20px'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-warning-900, #92400e)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Banknote size={16} color="#d97706" /> Cash Collection Pending
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-warning-700, #b45309)', marginTop: 6, letterSpacing: '-0.02em' }}>
            LKR {pendingCashCollection.toLocaleString()}
          </div>
          <small style={{ fontSize: '0.75rem', color: 'var(--color-warning-800, #78350f)' }}>
            Pending amount includes only provider payout values supplied by the booking records; release timing is not guaranteed here.
          </small>
        </Card>

        <Card style={{
          background: 'var(--color-surface, #fff)',
          border: '1px solid var(--color-border-subtle, #e2e8f0)',
          padding: '18px 20px'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Banknote size={16} color="#64748b" /> Platform Commission on Collected Cash
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-neutral-800, #1e293b)', marginTop: 6, letterSpacing: '-0.02em' }}>
            LKR {totalPlatformFees.toLocaleString()}
          </div>
          <small style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
            Calculated from bookings where the provider confirmed cash received.
          </small>
        </Card>
      </div>

      {/* 2. Transparent Commission Callout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--color-surface, #ffffff)',
        border: '1px solid var(--color-border-subtle, #e5ebe2)',
        borderRadius: 'var(--radius-md, 8px)',
        fontSize: '0.85rem',
        color: 'var(--color-neutral-700, #334155)'
      }}>
        <Info size={18} color="var(--color-brand-600, #174d3d)" style={{ flexShrink: 0 }} />
        <div>
          <b>Booking financial breakdown:</b> Commission and provider payout values are shown only when supplied by the booking or ledger records. Rates and settlement timing depend on the recorded transaction; this screen does not initiate transfers.
        </div>
      </div>

      {/* 3. Payout Action Banner */}
      <Card style={{
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        background: 'linear-gradient(135deg, #0d2b20 0%, #154636 100%)',
        border: '1px solid rgba(43, 132, 101, 0.3)',
        borderRadius: 'var(--radius-lg, 12px)',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={20} color="#f6ad55" />
            <b style={{ fontSize: '1.05rem', color: '#ffffff', letterSpacing: '0.02em' }}>Bank Transfer Information</b>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#e2e8f0', opacity: 0.9 }}>
            Customers pay you directly in cash after the service. Confirm cash received on completed jobs so ARY can reconcile platform commission.
          </p>
        </div>
        <Button
          variant="accent"
          size="md"
          onClick={() => setRequestPayoutOpen(true)}
          disabled={normalizedWalletBalance === null || normalizedWalletBalance <= 0}
        >
          <ArrowUpRight size={16} /> Cash Settlement Guide
        </Button>
      </Card>

      {/* Payout Confirmation Sheet */}
      {requestPayoutOpen && (
        <Card style={{
          padding: '20px',
          border: '2px solid var(--color-brand-500, #174d3d)',
          background: 'var(--color-surface, #fff)'
        }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--text-primary, #0f172a)' }}>
            Cash Settlement Guide
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', marginBottom: 14 }}>
            Customers pay the agreed service amount directly to you in cash. ARY does not process card or online payments and this screen does not initiate a transfer.
          </p>
          <div style={{
            background: 'var(--surface-secondary, #f8fafc)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.85rem',
            marginBottom: 16,
            color: 'var(--text-primary, #0f172a)'
          }}>
            <div><b>Cash collection:</b> Confirm the full amount after completing each service.</div>
            <div><b>Platform commission:</b> The commission amount is shown against each cash-collected booking.</div>
            <div><b>Record keeping:</b> Keep your cash receipts and reconcile commission with ARY Admin.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="primary" onClick={() => setRequestPayoutOpen(false)}>Close</Button>
          </div>
        </Card>
      )}

      {/* 4. Job Payout & Escrow Breakdown Table */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Booking Financial Records ({safeBookings.length})
        </h3>

        {safeBookings.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border-subtle, #f1f5f9)', textAlign: 'left', color: 'var(--color-neutral-500, #64748b)' }}>
                  <th style={{ padding: '10px 12px' }}>Job Ref</th>
                  <th style={{ padding: '10px 12px' }}>Customer</th>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Payment method</th>
                  <th style={{ padding: '10px 12px' }}>Gross Fee</th>
                  <th style={{ padding: '10px 12px' }}>Recorded Fee</th>
                  <th style={{ padding: '10px 12px' }}>Recorded Provider Payout</th>
                  <th style={{ padding: '10px 12px' }}>Cash status</th>
                </tr>
              </thead>
              <tbody>
                {safeBookings.map(b => {
                  const baseValue = Number(b.baseAmount ?? String(b.baseCharge || '').replace(/[^0-9.]/g, ''));
                  const base = Number.isFinite(baseValue) && baseValue >= 0 ? baseValue : null;
                  const feeValue = Number(b.platformFee);
                  const fee = Number.isFinite(feeValue) && feeValue >= 0 ? feeValue : null;
                  const netValue = Number(b.providerPayout);
                  const net = Number.isFinite(netValue) && netValue >= 0 ? netValue : null;

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle, #f8fafc)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-neutral-700, #334155)' }}>
                        #{String(b.id).slice(-6)}
                      </td>
                      <td style={{ padding: '12px' }}>{b.customerName}</td>
                      <td style={{ padding: '12px', color: 'var(--color-neutral-500, #64748b)' }}>{b.bookingDate}</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="neutral" dot={false}>Cash only</Badge>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{base === null ? '—' : `LKR ${base.toLocaleString('en-LK')}`}</td>
                      <td style={{ padding: '12px', color: 'var(--color-danger-600, #dc2626)' }}>{fee === null ? '—' : `- LKR ${fee.toLocaleString('en-LK')}`}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--color-success-700, #047857)' }}>
                        {net === null ? '—' : `LKR ${net.toLocaleString('en-LK')}`}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge
                          variant={b.paymentStatus === 'cash_collected' ? 'success' : 'warning'}
                          dot={false}
                        >
                          {b.paymentStatus === 'cash_collected' ? '✓ Cash received' : 'Cash collection pending'}
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
            description="Booking financial records will appear here when available."
          />
        )}
      </Card>

      {/* 5. Wallet Ledger Entries */}
      {safeLedgerEntries.length > 0 && (
        <Card style={{ padding: '20px', background: 'var(--color-neutral-50, #f8fafc)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCheck size={18} color="var(--color-brand-600, #174d3d)" />
              Wallet Ledger Entries ({filteredLedger.length})
            </h4>

            <div style={{ maxWidth: 280 }}>
              <SegmentedControl
                options={[
                  { value: 'all', label: `All (${safeLedgerEntries.length})` },
                  { value: 'credit', label: 'Credits' },
                  { value: 'debit', label: 'Debits' }
                ]}
                value={ledgerFilter}
                onChange={setLedgerFilter}
              />
            </div>
          </div>

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
                {filteredLedger.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                      {e.transactionId ? String(e.transactionId).slice(-8) : String(e.id).slice(-6)}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{e.account}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <Badge variant={e.type === 'credit' ? 'success' : 'danger'} dot={false}>
                        {e.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      {Number.isFinite(Number(e.amount)) && Number(e.amount) >= 0 ? `LKR ${Number(e.amount).toLocaleString('en-LK')}` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-neutral-600, #475569)' }}>{e.description}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-neutral-400, #94a3b8)' }}>
                      {e.timestamp && Number.isFinite(new Date(e.timestamp).getTime()) ? new Date(e.timestamp).toLocaleString() : 'Time unavailable'}
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
