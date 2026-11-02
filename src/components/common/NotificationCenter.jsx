import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Bell, CheckCheck, ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';
import { Badge, Button } from '../../design-system';

const EVENTS = [
  'booking:created', 'booking:status_updated', 'booking:quote_sent', 'booking:quote_decided',
  'booking:reschedule_requested', 'booking:reschedule_decided', 'driver:job_created', 'driver:job_updated',
  'driver:application_reviewed', 'grocery:order_created', 'grocery:order_updated',
  'review:submitted', 'user:status_changed', 'provider:service_request_created', 'provider:service_request_reviewed'
];

function getRelativeDateGroup(dateString) {
  if (!dateString) return 'Earlier';
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isYesterday) return 'Yesterday';

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 7) return 'This Week';

  return 'Earlier';
}

export default function NotificationCenter() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  );

  const refresh = useCallback(async () => {
    if (!currentUser?.token) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/notifications?limit=40`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load notifications.');
      const nextItems = data.notifications || [];
      setItems(previous => {
        if (previous.length && permission === 'granted') {
          const known = new Set(previous.map(item => item.id));
          nextItems.filter(item => !known.has(item.id) && !item.readAt).slice(0, 3).forEach(item => {
            try { new window.Notification(item.title, { body: item.body, tag: item.id }); } catch {}
          });
        }
        return nextItems;
      });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.token, permission]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    const handlers = Object.fromEntries(EVENTS.map(name => [name, refresh]));
    return subscribeToAppEvents(currentUser.token, handlers);
  }, [currentUser?.token, refresh]);

  async function markRead(item) {
    if (item.readAt) return;
    try {
      const response = await fetch(`${API_BASE}/notifications/${encodeURIComponent(item.id)}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (!response.ok) throw new Error('Could not update notification.');
      setItems(old => old.map(entry => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllRead() {
    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (!response.ok) throw new Error('Could not update notifications.');
      const now = new Date().toISOString();
      setItems(old => old.map(item => ({ ...item, readAt: item.readAt || now })));
    } catch (err) {
      setError(err.message);
    }
  }

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };
    items.forEach(item => {
      const group = getRelativeDateGroup(item.createdAt);
      if (groups[group]) {
        groups[group].push(item);
      } else {
        groups.Earlier.push(item);
      }
    });
    return groups;
  }, [items]);

  if (!currentUser?.token) return null;
  const unread = items.filter(item => !item.readAt).length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => {
          setOpen(prev => !prev);
          if (!open) refresh();
        }}
        aria-label={`Notifications, ${unread} unread`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          border: '1px solid var(--color-border-subtle, #dbe5dc)',
          borderRadius: 'var(--radius-md, 10px)',
          background: 'var(--color-surface, #fff)',
          color: 'var(--color-brand-600, #174d3d)',
          cursor: 'pointer'
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            right: -4,
            top: -4,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 20,
            background: 'var(--color-danger-600, #dc2626)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.4)'
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 48,
            width: 'min(380px, calc(100vw - 28px))',
            maxHeight: 460,
            overflowY: 'auto',
            zIndex: 1000,
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border-subtle, #dce5dd)',
            borderRadius: 'var(--radius-lg, 14px)',
            boxShadow: '0 16px 40px rgba(15,35,22,.16)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <b style={{ fontSize: '0.95rem', color: 'var(--color-neutral-900, #173b2f)' }}>Notifications</b>
              {unread > 0 && (
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'var(--color-brand-50, #edf7f2)',
                  color: 'var(--color-brand-700, #174d3d)',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {unread} new
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={markAllRead}
              disabled={!unread}
              style={{
                border: 0,
                background: 'transparent',
                color: unread ? 'var(--color-brand-600, #174d3d)' : 'var(--color-neutral-400, #94a39a)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: unread ? 'pointer' : 'default',
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                padding: 0
              }}
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          </div>

          {/* Web notification permission prompt */}
          {'Notification' in window && permission !== 'granted' && permission !== 'denied' && (
            <button
              type="button"
              onClick={async () => {
                const next = await window.Notification.requestPermission();
                setPermission(next);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--color-brand-200, #b7decb)',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--color-brand-50, #edf7f2)',
                color: 'var(--color-brand-800, #154636)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Enable push notifications in browser
            </button>
          )}

          {error && (
            <div style={{ color: 'var(--color-danger-600, #dc2626)', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          {/* Grouped Items List */}
          {loading && items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-neutral-500, #64748b)', fontSize: '0.85rem' }}>
              Loading updates...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--color-neutral-500, #64748b)', fontSize: '0.85rem' }}>
              <CheckCircle2 size={28} color="var(--color-brand-600, #174d3d)" style={{ margin: '0 auto 8px', display: 'block' }} />
              <b>You are all caught up!</b>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>New booking and order status changes will notify you in real-time.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {Object.entries(groupedNotifications).map(([groupName, groupItems]) => {
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupName}>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--color-neutral-400, #94a3b8)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 6
                    }}>
                      {groupName}
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      {groupItems.map(item => {
                        const isUnread = !item.readAt;

                        return (
                          <div
                            key={item.id}
                            onClick={() => markRead(item)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md, 8px)',
                              background: isUnread ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-neutral-50, #f8fafc)',
                              border: isUnread ? '1px solid var(--color-brand-200, #b7decb)' : '1px solid var(--color-border-subtle, #f1f5f9)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                              <b style={{ fontSize: '0.85rem', color: isUnread ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-800, #1e293b)' }}>
                                {item.title}
                              </b>
                              {isUnread && (
                                <span style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: 'var(--color-brand-600, #174d3d)',
                                  flexShrink: 0,
                                  marginTop: 4
                                }} />
                              )}
                            </div>

                            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)', lineHeight: 1.4 }}>
                              {item.body}
                            </p>

                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--color-neutral-400, #94a3b8)' }}>
                              <Clock size={11} />
                              <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {item.link && (
                                <span style={{ color: 'var(--color-brand-600, #174d3d)', fontWeight: 600, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                                  View Details <ExternalLink size={10} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
