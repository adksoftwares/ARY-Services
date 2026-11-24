import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Card, Badge, Button, StatusPill, EmptyState, SegmentedControl } from '../../design-system';

function parseLocalBookingDate(value, timeValue) {
  if (typeof value !== 'string') return null;
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const timeText = typeof timeValue === 'string' ? timeValue : '';
  const timeMatch = /(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM)?/i.exec(timeText);
  let hours = 12;
  let minutes = 0;
  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2] || 0);
    const meridiem = (timeMatch[3] || '').toUpperCase();
    if (minutes > 59 || hours > 23 || (meridiem && (hours < 1 || hours > 12))) return null;
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export default function ProviderSchedule({
  bookings = [],
  onNavigateTab,
  onDecideReschedule
}) {
  const [filter, setFilter] = useState('upcoming'); // 'upcoming' | 'completed' | 'all'
  const safeBookings = Array.isArray(bookings) ? bookings.filter(booking => booking && typeof booking === 'object') : [];

  // Sort using local calendar dates so date-only API values do not shift by timezone.
  const sortedBookings = useMemo(() => {
    return [...safeBookings].sort((a, b) => {
      const dateA = parseLocalBookingDate(a.bookingDate, a.bookingTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      const dateB = parseLocalBookingDate(b.bookingDate, b.bookingTime)?.getTime() ?? Number.POSITIVE_INFINITY;
      return dateA - dateB;
    });
  }, [safeBookings]);

  const filteredBookings = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return sortedBookings.filter(b => ['requested', 'accepted', 'in_progress'].includes(b.status));
      case 'completed':
        return sortedBookings.filter(b => b.status === 'completed');
      case 'all':
      default:
        return sortedBookings;
    }
  }, [filter, sortedBookings]);

  // Group by relative day
  const groupedSchedule = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const groups = {
      Today: [],
      Tomorrow: [],
      'This Week': [],
      Later: []
    };

    filteredBookings.forEach(b => {
      const parsedDate = parseLocalBookingDate(b.bookingDate, '12:00');
      if (!parsedDate) {
        groups.Later.push(b);
        return;
      }
      const bDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());

      if (bDate.getTime() === today.getTime()) {
        groups.Today.push(b);
      } else if (bDate.getTime() === tomorrow.getTime()) {
        groups.Tomorrow.push(b);
      } else if (bDate > tomorrow && bDate <= endOfWeek) {
        groups['This Week'].push(b);
      } else {
        groups.Later.push(b);
      }
    });

    return groups;
  }, [filteredBookings]);

  const hasAnyJobs = filteredBookings.length > 0;

  return (
    <div className="provider-schedule-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Header & Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary, #f8fafc)' }}>
            Service Schedule & Appointments
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--color-neutral-500, #64748b)' }}>
            A chronological view of appointments assigned to your provider account.
          </p>
        </div>

        <div style={{ minWidth: 280 }}>
          <SegmentedControl
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'completed', label: 'Completed' },
              { value: 'all', label: 'All Dates' }
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </div>

      {/* 2. Grouped Schedule Cards */}
      {hasAnyJobs ? (
        Object.entries(groupedSchedule).map(([groupName, items]) => {
          if (items.length === 0) return null;

          return (
            <div key={groupName} style={{ display: 'grid', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.88rem',
                fontWeight: 800,
                color: 'var(--color-brand-800, #154636)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <Calendar size={16} />
                <span>{groupName}</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'var(--color-brand-100, #d9ebe1)',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}>
                  {items.length}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {items.map(b => (
                  <Card key={b.id} style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <b style={{ fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                            {b.categoryName || 'Service Appointment'}
                          </b>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                            #{String(b.id || '—').slice(-6)}
                          </span>
                          <StatusPill status={b.status} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, color: 'var(--color-brand-700, #174d3d)', fontWeight: 600, fontSize: '0.85rem' }}>
                          <Clock size={14} /> {b.bookingDate} · {b.bookingTime}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateTab?.('jobs')}
                      >
                        Manage in Jobs <ArrowRight size={13} />
                      </Button>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 10,
                      padding: '12px 14px',
                      background: 'var(--color-surface-subtle, #f8faf8)',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--color-border-subtle, #e5ebe2)',
                      fontSize: '0.82rem'
                    }}>
                      <div>
                        <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.75rem' }}>Customer</span>
                        <b>{b.customerName || 'Customer details unavailable'}</b>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.75rem' }}>Phone</span>
                        {b.customerPhone ? (
                          <a
                            href={`tel:${b.customerPhone}`}
                            style={{ color: 'var(--color-brand-600, #174d3d)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Phone size={12} /> {b.customerPhone}
                          </a>
                        ) : <span style={{ color: 'var(--color-neutral-500, #64748b)' }}>Not provided</span>}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--color-neutral-500, #64748b)', display: 'block', fontSize: '0.75rem' }}>Service Address</span>
                        {b.serviceAddress ? (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(b.serviceAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-brand-700, #174d3d)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <MapPin size={12} /> {b.serviceAddress} <ExternalLink size={10} />
                          </a>
                        ) : <span style={{ color: 'var(--color-neutral-500, #64748b)' }}>Address not provided</span>}
                      </div>
                    </div>

                    {/* Reschedule alert banner */}
                    {b.rescheduleRequest?.status === 'pending' && (
                      <div style={{
                        marginTop: 10,
                        padding: '10px 14px',
                        background: 'var(--color-warning-50, #fffbeb)',
                        border: '1px solid var(--color-warning-300, #fcd34d)',
                        borderRadius: 'var(--radius-md, 8px)',
                        fontSize: '0.82rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10
                      }}>
                        <div>
                          <b style={{ color: 'var(--color-warning-900, #78350f)' }}>Client Requested Reschedule</b>
                          <div style={{ color: 'var(--color-warning-800, #92400e)' }}>
                            New requested slot: {b.rescheduleRequest.date} ({b.rescheduleRequest.time})
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" variant="primary" onClick={() => onDecideReschedule?.(b.id, 'accept')}>
                            Accept Slot
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onDecideReschedule?.(b.id, 'reject')}>
                            Decline
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState
          icon={Calendar}
          title="No scheduled appointments found"
          description="Appointments matching this filter will appear here when they are assigned to your account."
        />
      )}
    </div>
  );
}
