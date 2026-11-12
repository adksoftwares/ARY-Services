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

  const completedBookings = useMemo(() => bookings.filter(b => b.status === 'completed'), [bookings]);



  const pendingEscrowPayout = useMemo(() => {
    return bookings
      .filter(b => b.paymentStatus === 'escrow_held' && b.status !== 'completed')
      .reduce((sum, b) => {
        const charge = Number(b.baseAmount ?? String(b.baseCharge || '').replace(/[^0-9.]/g, ''));
        return sum + Number(b.providerPayout ?? (Number.isFinite(charge) ? Math.round(charge * 0.9) : 0));
      }, 0);
  }, [bookings]);

  const totalPlatformFees = useMemo(() => {
    return completedBookings.reduce((sum, b) => {
      const charge = Number(b.baseAmount ?? String(b.baseCharge || '').replace(/[^0-9.]/g, ''));
      return sum + Number(b.platformFee ?? (Number.isFinite(charge) ? Math.round(charge * 0.1) : 0));
    }, 0);
  }, [completedBookings]);

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'credit') return ledgerEntries.filter(e => e.type === 'credit');
    if (ledgerFilter === 'debit') return ledgerEntries.filter(e => e.type === 'debit');
    return ledgerEntries;
  }, [ledgerEntries, ledgerFilter]);


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
            <CheckCircle2 size={16} color="var(--color-brand-600, #174d3d)" /> Available Wallet Balance
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-brand-700, #174d3d)', marginTop: 6, letterSpacing: '-0.02em' }}>
            LKR {Number(walletBalance || 0).toLocaleString()}
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
            <Banknote size={16} color="#64748b" /> Platform Fee (estimated where charge data exists)
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-neutral-800, #1e293b)', marginTop: 6, letterSpacing: '-0.02em' }}>
            LKR {totalPlatformFees.toLocaleString()}
          </div>
          <small style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
            Covers customer support & 14-Day Guarantee
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
          <b>Transparent 90 / 10 Revenue Model:</b> For every booking, you receive 90% of the gross charge directly. The flat 10% platform fee funds ARY payment gateway escrow, 24/7 client dispatch support, and national marketing for Sri Lankan contractors.
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
            View your available earnings. Bank transfers are prepared by ARY administrators after your bank details are recorded.
          </p>
        </div>
        <Button
          variant="accent"
          size="md"
          onClick={() => setRequestPayoutOpen(true)}
          disabled={Number(walletBalance || 0) <= 0}
        >
          <ArrowUpRight size={16} /> Payout Information
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
            Bank Transfer Information
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', marginBottom: 14 }}>
            Your available wallet balance is <b>LKR {Number(walletBalance || 0).toLocaleString()}</b>. A payout request here does not trigger a bank transfer.
          </p>
          <div style={{
            background: 'var(--surface-secondary, #f8fafc)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.85rem',
            marginBottom: 16,
            color: 'var(--text-primary, #0f172a)'
          }}>
            <div><b>Beneficiary Name:</b> {currentUser?.fullName}</div>
            <div><b>Bank Details:</b> Contact ARY support to add or update verified bank details.</div>
            <div><b>Transfer Status:</b> No transfer has been initiated from this screen.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="primary" onClick={() => setRequestPayoutOpen(false)}>Close</Button>
          </div>
        </Card>
      )}

      {/* 4. Job Payout & Escrow Breakdown Table */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Job Payout & Commission Ledger ({bookings.length})
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
                  <th style={{ padding: '10px 12px' }}>Payout Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const base = Number(b.baseAmount ?? String(b.baseCharge || '').replace(/[^0-9.]/g, '')) || 0;
                  const fee = Number(b.platformFee ?? Math.round(base * 0.1));
                  const net = Number(b.providerPayout ?? Math.max(0, base - fee));

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle, #f8fafc)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-neutral-700, #334155)' }}>
                        #{b.id.slice(-6)}
                      </td>
                      <td style={{ padding: '12px' }}>{b.customerName}</td>
                      <td style={{ padding: '12px', color: 'var(--color-neutral-500, #64748b)' }}>{b.bookingDate}</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant={b.paymentMethod === 'cash' ? 'neutral' : 'brand'} dot={false}>
                          {b.paymentMethod === 'cash' ? 'Cash' : 'Escrow'}
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

      {/* 5. Immutable Double-Entry Ledger Audit Trail */}
      {ledgerEntries.length > 0 && (
        <Card style={{ padding: '20px', background: 'var(--color-neutral-50, #f8fafc)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileCheck size={18} color="var(--color-brand-600, #174d3d)" />
              Double-Entry Ledger Audit Trail ({filteredLedger.length})
            </h4>

            <div style={{ maxWidth: 280 }}>
              <SegmentedControl
                options={[
                  { value: 'all', label: `All (${ledgerEntries.length})` },
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
