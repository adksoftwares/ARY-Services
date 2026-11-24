import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Percent,
  DollarSign
} from 'lucide-react';
import { Card, Badge, Button, EmptyState, SegmentedControl } from '../../design-system';

export default function ProviderQuotes({
  bookings = [],
  onNavigateTab
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'expired'

  // Extract all bookings that have quotes
  const quotesList = useMemo(() => {
    return bookings
      .filter(b => b.quote && typeof b.quote === 'object')
      .map(b => ({
        bookingId: b.id,
        categoryName: b.categoryName || 'Service Request',
        customerName: b.customerName || 'Customer details unavailable',
        bookingDate: b.bookingDate || 'Schedule unavailable',
        amount: b.quote.amount !== null && b.quote.amount !== undefined && b.quote.amount !== '' && Number.isFinite(Number(b.quote.amount)) && Number(b.quote.amount) >= 0 ? Number(b.quote.amount) : null,
        description: b.quote.description,
        status: b.quote.status || 'pending',
        validUntil: b.quote.validUntil,
        isExpired: Boolean(b.quote.validUntil && Number.isFinite(Date.parse(b.quote.validUntil)) && Date.parse(b.quote.validUntil) <= Date.now())
      }));
  }, [bookings]);

  const pendingQuotes = quotesList.filter(q => q.status === 'pending' && !q.isExpired);
  const acceptedQuotes = quotesList.filter(q => q.status === 'accepted');
  const expiredOrDeclined = quotesList.filter(q => q.isExpired || q.status === 'declined');

  const filteredQuotes = useMemo(() => {
    switch (filter) {
      case 'pending': return pendingQuotes;
      case 'accepted': return acceptedQuotes;
      case 'expired': return expiredOrDeclined;
      case 'all':
      default: return quotesList;
    }
  }, [filter, pendingQuotes, acceptedQuotes, expiredOrDeclined, quotesList]);

  const totalQuotedValue = quotesList.reduce((sum, q) => sum + (q.amount ?? 0), 0);
  const quotesWithAmounts = quotesList.filter(q => q.amount !== null).length;
  const acceptanceRate = quotesList.length > 0
    ? Math.round((acceptedQuotes.length / quotesList.length) * 100)
    : 0;

  return (
    <div className="provider-quotes-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Header & Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px'
      }}>
        <Card style={{ padding: '16px 18px', background: 'var(--color-surface, #fff)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={15} color="var(--color-brand-600, #174d3d)" /> Total Quotes Sent
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginTop: 4 }}>
            {quotesList.length}
          </div>
        </Card>

        <Card style={{ padding: '16px 18px', background: 'var(--color-surface, #fff)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Percent size={15} color="#059669" /> Client Acceptance Rate
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success-700, #047857)', marginTop: 4 }}>
            {acceptanceRate}%
          </div>
        </Card>

        <Card style={{ padding: '16px 18px', background: 'var(--color-surface, #fff)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={15} color="#d97706" /> Total Quoted Volume
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning-700, #b45309)', marginTop: 4 }}>
            {quotesWithAmounts > 0 ? `LKR ${totalQuotedValue.toLocaleString('en-LK')}` : 'Not available'}
          </div>
        </Card>
      </div>

      {/* 2. Filter Tabs */}
      <div style={{ maxWidth: 540 }}>
        <SegmentedControl
          options={[
            { value: 'all', label: `All (${quotesList.length})` },
            { value: 'pending', label: `Pending (${pendingQuotes.length})` },
            { value: 'accepted', label: `Accepted (${acceptedQuotes.length})` },
            { value: 'expired', label: `Expired / Declined (${expiredOrDeclined.length})` }
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {/* 3. Quotes List */}
      {filteredQuotes.length > 0 ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {filteredQuotes.map(q => {
            return (
              <Card key={q.bookingId} style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                        {q.categoryName}
                      </b>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                        #{q.bookingId ? String(q.bookingId).slice(-6) : '—'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)' }}>
                      Client: <b>{q.customerName}</b> · Scheduled: {q.bookingDate}
                    </span>
                  </div>

                  <Badge
                    variant={
                      q.status === 'accepted' ? 'success' :
                      q.isExpired || q.status === 'declined' ? 'danger' : 'brand'
                    }
                    dot={false}
                  >
                    {q.status === 'accepted' ? '✓ Accepted by Client' :
                     q.isExpired ? '⌛ Expired' :
                     q.status === 'declined' ? 'Declined' : '⏳ Pending Client Response'}
                  </Badge>
                </div>

                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-surface-subtle, #f8faf8)',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--color-border-subtle, #e5ebe2)',
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-neutral-800, #1e293b)', marginBottom: 8 }}>
                    <b>Scope of Work:</b> {q.description}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.85rem' }}>
                    <span>Total Quoted: <b style={{ fontSize: '1rem', color: 'var(--text-primary, #f8fafc)' }}>{q.amount === null ? 'Amount unavailable' : `LKR ${q.amount.toLocaleString('en-LK')}`}</b></span>

                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <small style={{ color: 'var(--color-neutral-400, #94a3b8)', fontSize: '0.75rem' }}>
                    {q.validUntil && Number.isFinite(Date.parse(q.validUntil)) ? `Valid until ${new Date(q.validUntil).toLocaleDateString()}` : 'Validity period not available'}
                  </small>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateTab?.('jobs')}
                  >
                    View in Jobs <ArrowRight size={13} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No quotes in this category"
          description="You can send custom price quotes directly from any pending or active job in your Jobs feed."
        />
      )}
    </div>
  );
}
