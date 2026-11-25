import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  Search,
  ShieldCheck,
  Scale,
  UserRound,
  Wallet
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../../design-system';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function AdminNotifications({
  events = [],
  onClear,
  onNavigateTab
}) {
  const { currentUser } = useAuth();
  const [auditRecords, setAuditRecords] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser?.token || currentUser.accountType !== 'admin') {
      setAuditRecords([]);
      return undefined;
    }
    const controller = new AbortController();
    setAuditLoading(true);
    setAuditError('');
    fetch(`${API_BASE}/admin/audit-log?limit=150`, {
      headers: { Authorization: `Bearer ${currentUser.token}` },
      signal: controller.signal,
      cache: 'no-store'
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load persistent audit events.');
      setAuditRecords(Array.isArray(data.events) ? data.events : []);
    }).catch(error => {
      if (error.name !== 'AbortError') setAuditError(error.message || 'Could not load persistent audit events.');
    }).finally(() => {
      if (!controller.signal.aborted) setAuditLoading(false);
    });
    return () => controller.abort();
  }, [currentUser?.token, currentUser?.accountType, refreshCount]);

  const persistentEvents = auditRecords.map(record => {
    const action = String(record.action || '');
    const type = action.startsWith('kyc.') || action.startsWith('role.') || action.startsWith('driver.application') ? 'kyc' : action.startsWith('dispute.') ? 'dispute' : action.startsWith('provider.payout') ? 'payout' : action.startsWith('account.') ? 'account' : 'account';
    const details = record.details && typeof record.details === 'object' ? record.details : {};
    const summary = Object.entries(details).filter(([key, value]) => !/token|document|password|secret/i.test(key) && value !== null && typeof value !== 'object')
      .map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
    return {
      id: record.id,
      type,
      title: action.replace(/[._]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
      description: `${record.actorRole || 'Unknown role'} ${record.actorId || 'unknown actor'} · ${record.targetType || 'record'} ${record.targetId || ''}${summary ? ` · ${summary}` : ''}`,
      createdAt: record.createdAt,
      targetTab: action.startsWith('dispute.') ? 'disputes' : action.startsWith('provider.payout') ? 'payouts' : action.startsWith('kyc.') || action.startsWith('account.') ? 'applications' : ''
    };
  });

  const displayEvents = [
    ...persistentEvents,
    ...(Array.isArray(events) ? events.filter(event => event && typeof event === 'object' && !Array.isArray(event)) : [])
  ];
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return displayEvents.filter(event => {
      const matchesType = filter === 'all' || event.type === filter;
      const searchable = [event.title, event.description, event.type, event.targetTab, event.createdAt, event.timestamp]
        .filter(value => value !== null && value !== undefined).join(' ').toLocaleLowerCase();
      return matchesType && (!query || searchable.includes(query));
    });
  }, [displayEvents, filter, searchQuery]);
  const eventIcons = { kyc: ShieldCheck, dispute: Scale, payout: Wallet, account: UserRound };

  return (
    <div className="admin-audit-workspace" style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header Card */}
      <Card className="admin-audit-header" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={22} color="var(--color-brand-600, #174d3d)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-900, #173b2f)' }}>
                Admin Audit & Session Activity
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Persistent records of sensitive Admin actions, combined with live session activity from this workspace.
            </p>
          </div>

          <div className="admin-audit-filter-bar" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Button size="sm" variant="outline" onClick={() => setRefreshCount(value => value + 1)} loading={auditLoading}>Refresh audit log</Button>
            {[
              { id: 'all', label: 'ALL EVENTS' },
              { id: 'payout', label: 'PAYOUTS' },
              { id: 'dispute', label: 'DISPUTES' },
              { id: 'kyc', label: 'KYC & ROLES' },
              { id: 'account', label: 'ACCOUNTS' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: filter === f.id ? '1.5px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)',
                  background: filter === f.id ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #ffffff)',
                  color: filter === f.id ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-600, #475569)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {auditError && <div role="alert" style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-danger-50, #fef2f2)', color: 'var(--color-danger-700, #b91c1c)' }}>{auditError}</div>}
      {auditLoading && <p role="status" style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.82rem' }}>Loading persistent audit events…</p>}
      <div className="admin-audit-search-row" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', minWidth: 0, minHeight: 44, padding: '0 12px', border: '1px solid var(--color-border, #cbd5e1)', borderRadius: 10, background: 'var(--color-surface, #fff)' }}>
          <Search size={16} aria-hidden="true" style={{ color: 'var(--color-neutral-500, #64748b)', flexShrink: 0 }} />
          <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search activity, description or destination" aria-label="Search admin session activity" style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--color-neutral-900, #0f172a)', font: 'inherit', fontSize: '0.88rem' }} />
        </label>
        {searchQuery && <button type="button" onClick={() => setSearchQuery('')} style={{ minHeight: 40, border: 0, borderRadius: 8, padding: '8px 12px', background: 'var(--color-brand-50, #edf7f2)', color: 'var(--color-brand-700, #174d3d)', fontWeight: 700, cursor: 'pointer' }}>Clear search</button>}
        <span aria-live="polite" style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.78rem' }}>{filteredEvents.length} of {displayEvents.length} events</span>
      </div>

      {/* 2. Audit Trail Feed */}
      <Card className="admin-audit-feed" style={{ padding: '20px' }}>
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No events found"
            description={displayEvents.length === 0
              ? 'No session activity has been received while this workspace is open.'
              : 'No session activity matches this filter. Choose another filter to view the available events.'}
          />
        ) : (
          <div style={{ display: 'grid', gap: 14 }} role="log" aria-live="polite" aria-relevant="additions text">
            {filteredEvents.map((evt, index) => {
              const Icon = eventIcons[evt.type] || ShieldCheck;
              const createdAt = typeof evt.createdAt === 'string' ? Date.parse(evt.createdAt) : NaN;
              const displayTime = Number.isFinite(createdAt)
                ? new Date(createdAt).toLocaleString()
                : (typeof evt.timestamp === 'string' || typeof evt.timestamp === 'number' ? String(evt.timestamp) : 'Time unavailable');

              return (
                <div
                  key={evt.id !== undefined && evt.id !== null ? String(evt.id) : `${typeof evt.type === 'string' ? evt.type : 'event'}-${evt.createdAt || evt.timestamp || index}`}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md, 10px)',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    background: 'var(--color-surface, #ffffff)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: evt.color === 'danger' ? '#fef2f2' : evt.color === 'accent' ? '#eff6ff' : 'var(--color-brand-50, #edf7f2)',
                      color: evt.color === 'danger' ? '#dc2626' : evt.color === 'accent' ? '#2563eb' : 'var(--color-brand-700, #174d3d)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>

                    <div>
                      <b style={{ color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', display: 'block' }}>
                        {typeof evt.title === 'string' && evt.title.trim() ? evt.title : 'Activity update'}
                      </b>
                      <p style={{ margin: '4px 0 0', color: 'var(--color-neutral-600, #475569)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                        {typeof evt.description === 'string' && evt.description.trim() ? evt.description : 'No additional details were provided.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-400, #94a3b8)', display: 'block' }}>
                      {displayTime}
                    </span>
                    {typeof evt.targetTab === 'string' && evt.targetTab.trim() && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab?.(evt.targetTab)}
                        style={{
                          marginTop: 6,
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-brand-600, #174d3d)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Inspect &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
