import React, { useMemo, useState } from 'react';
import { Banknote, Search, RefreshCw, ReceiptText, Clock3, Info } from 'lucide-react';
import { Card, Badge, Button, EmptyState, Skeleton, SegmentedControl } from '../../design-system';

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? `LKR ${amount.toLocaleString('en-LK', { maximumFractionDigits: 2 })}` : '—';
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
}

export default function AdminCashPayments({ records = [], summary = {}, isLoading = false, error = '', onRefresh }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const safeRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  const visibleRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return safeRecords.filter(item => {
      const searchable = [item.reference, item.id, item.source, item.serviceType, item.customerName, item.providerName, item.collectorName, item.paymentStatus, item.status]
        .filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !normalized || searchable.includes(normalized);
      const matchesFilter = filter === 'all' ||
        (filter === 'collected' && item.paymentStatus === 'cash_collected') ||
        (filter === 'pending' && ['pending_cash', 'unpaid'].includes(item.paymentStatus)) ||
        (filter === 'not_due' && item.paymentStatus === 'not_due');
      return matchesSearch && matchesFilter;
    });
  }, [safeRecords, query, filter]);

  return (
    <div className="admin-cash-reconciliation-view" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-neutral-900, #0f172a)' }}>Cash Payment Reconciliation</h2>
          <p style={{ margin: '5px 0 0', fontSize: '0.84rem', color: 'var(--color-neutral-500, #64748b)' }}>One view of cash collection across service bookings, grocery orders, rides and deliveries</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} loading={isLoading}><RefreshCw size={14} /> Refresh records</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-neutral-500, #64748b)', fontSize: '0.78rem' }}><Banknote size={16} /> Cash received</div>
          <div style={{ marginTop: 8, fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-success-700, #047857)' }}>{money(summary.totalCollected)}</div>
          <small style={{ color: 'var(--color-neutral-500, #64748b)' }}>{Number(summary.collectedCount || 0)} confirmed collections</small>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-neutral-500, #64748b)', fontSize: '0.78rem' }}><Clock3 size={16} /> Cash outstanding</div>
          <div style={{ marginTop: 8, fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-warning-700, #b45309)' }}>{money(summary.totalPending)}</div>
          <small style={{ color: 'var(--color-neutral-500, #64748b)' }}>{Number(summary.pendingCount || 0)} pending collections</small>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-neutral-500, #64748b)', fontSize: '0.78rem' }}><ReceiptText size={16} /> Total records</div>
          <div style={{ marginTop: 8, fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-neutral-900, #0f172a)' }}>{Number(summary.totalRecords || safeRecords.length).toLocaleString('en-LK')}</div>
          <small style={{ color: 'var(--color-neutral-500, #64748b)' }}>All cash-only transactions</small>
        </Card>
      </div>

      <div role="note" style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: 'var(--color-brand-50, #edf7f2)', border: '1px solid var(--color-brand-100, #d7e9df)', color: 'var(--color-brand-800, #154636)', fontSize: '0.82rem', lineHeight: 1.5 }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Customers pay providers or drivers directly in cash. This is a reconciliation record, not a money collection or transfer screen. Card and online payment methods are disabled.</span>
      </div>

      {error && <div role="alert" style={{ padding: 12, borderRadius: 8, background: 'var(--color-danger-50, #fef2f2)', color: 'var(--color-danger-700, #b91c1c)' }}>{error}</div>}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 42, padding: '0 11px', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 9 }}>
            <Search size={16} color="#64748b" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reference, customer, provider, driver…" aria-label="Search cash payments" style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--color-text, #0f172a)', font: 'inherit', fontSize: '0.84rem' }} />
          </label>
          <div style={{ minWidth: 280 }}>
            <SegmentedControl options={[{ value: 'all', label: `All (${safeRecords.length})` }, { value: 'collected', label: 'Received' }, { value: 'pending', label: 'Pending' }, { value: 'not_due', label: 'Not due' }]} value={filter} onChange={setFilter} />
          </div>
        </div>

        {isLoading && safeRecords.length === 0 ? (
          <div style={{ display: 'grid', gap: 10, padding: 18 }}><Skeleton height={48} /><Skeleton height={48} /><Skeleton height={48} /></div>
        ) : visibleRecords.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <EmptyState icon={ReceiptText} title="No cash payment records found" description={query || filter !== 'all' ? 'Try another search or filter.' : 'Cash booking, grocery and driver collections will appear here.'} />
            {(query || filter !== 'all') && <Button size="sm" variant="outline" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</Button>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920, fontSize: '0.82rem' }}>
              <thead><tr style={{ textAlign: 'left', color: 'var(--color-neutral-500, #64748b)', background: 'var(--color-surface-subtle, #f8fafc)' }}>
                {['Reference / Type', 'Customer', 'Provider / Driver', 'Amount', 'Payment', 'Service status', 'Collected / created'].map(label => <th key={label} style={{ padding: '12px 14px', fontWeight: 700 }}>{label}</th>)}
              </tr></thead>
              <tbody>
                {visibleRecords.map(item => (
                  <tr key={`${item.source}:${item.id}`} style={{ borderTop: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
                    <td style={{ padding: '13px 14px' }}><b>{String(item.reference || item.id).slice(-12)}</b><small style={{ display: 'block', color: 'var(--color-neutral-500, #64748b)', marginTop: 3 }}>{item.serviceType || item.source}</small></td>
                    <td style={{ padding: '13px 14px' }}>{item.customerName || 'Customer'}</td>
                    <td style={{ padding: '13px 14px' }}>{item.providerName || '—'}{item.collectorName && item.collectorName !== item.providerName ? <small style={{ display: 'block', color: 'var(--color-neutral-500, #64748b)', marginTop: 3 }}>Collected by {item.collectorName}</small> : null}</td>
                    <td style={{ padding: '13px 14px', fontWeight: 800, whiteSpace: 'nowrap' }}>{money(item.amount)}</td>
                    <td style={{ padding: '13px 14px' }}><Badge variant={item.paymentStatus === 'cash_collected' ? 'success' : item.paymentStatus === 'not_due' ? 'neutral' : 'warning'} dot={false}>{item.paymentStatus === 'cash_collected' ? 'Cash received' : item.paymentStatus === 'not_due' ? 'Not due' : item.paymentStatus === 'pending_quote' ? 'Awaiting quote' : 'Cash pending'}</Badge></td>
                    <td style={{ padding: '13px 14px', textTransform: 'capitalize' }}>{String(item.status || '—').replaceAll('_', ' ')}</td>
                    <td style={{ padding: '13px 14px', color: 'var(--color-neutral-500, #64748b)', whiteSpace: 'nowrap' }}>{formatDate(item.collectedAt || item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border-subtle, #e2e8f0)', color: 'var(--color-neutral-500, #64748b)', fontSize: '0.76rem' }} aria-live="polite">{visibleRecords.length} of {safeRecords.length} records shown</div>
      </Card>
    </div>
  );
}
