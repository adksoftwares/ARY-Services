import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Clock,
  Star,
  Wallet,
  Check,
  Ban,
  Calendar,
  MapPin,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Bell
} from 'lucide-react';
import { Card, Badge, Button, StatusPill, EmptyState } from '../../design-system';

export default function ProviderOverview({
  currentUser,
  bookings = [],
  walletBalance = 0,
  averageRating = '—',
  reviewCount = 0,
  onNavigateTab,
  onUpdateStatus,
  isAvailable = true,
  onToggleAvailability
}) {
  const pendingRequests = bookings.filter(b => b.status === 'requested');
  const activeJobs = bookings.filter(b => ['accepted', 'in_progress'].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === 'completed');



  // Filter today's / upcoming jobs
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingJobs = bookings
    .filter(b => ['requested', 'accepted', 'in_progress'].includes(b.status))
    .slice(0, 5);

  return (
    <div className="provider-overview-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Partner Profile & Quick Availability Strip */}
      <div className="provider-stats-strip">
        <div className="provider-profile-summary">
          <div className="provider-avatar-circle">
            {currentUser?.fullName?.slice(0, 2).toUpperCase() || 'SP'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 className="provider-heading-name">{currentUser?.fullName}</h1>
              <Badge variant="success" dot={false}>
                <ShieldCheck size={13} /> Verified Partner
              </Badge>
            </div>
            <span className="provider-category-subtitle">
              {currentUser?.categoryName || 'Professional Service Provider'} · {currentUser?.location || 'Colombo, Sri Lanka'}
            </span>
          </div>
        </div>

        <div className="provider-quick-toggles">
          <button
            type="button"
            className={`availability-toggle-btn ${isAvailable ? 'available' : 'paused'}`}
            onClick={onToggleAvailability}
            title={isAvailable ? 'Currently taking new customer bookings' : 'Bookings paused'}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isAvailable ? 'var(--color-success-600, #059669)' : 'var(--color-neutral-400, #94a3b8)',
              display: 'inline-block'
            }} />
            {isAvailable ? 'Accepting New Jobs' : 'Bookings Paused'}
          </button>
        </div>
      </div>

      {/* 2. Urgent Incoming Bookings Banner */}
      {pendingRequests.length > 0 && (
        <div className="provider-urgent-banner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'var(--color-danger-600, #dc2626)',
                color: '#fff',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0
              }}>
                <Bell size={18} />
              </div>
              <div>
                <b style={{ color: 'var(--color-danger-900, #991b1b)', fontSize: '1rem' }}>
                  {pendingRequests.length} Urgent Booking Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Response!
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-danger-800, #7f1d1d)' }}>
                  Accepting within 30 minutes improves your contractor ranking across Sri Lanka.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => onNavigateTab?.('jobs')}
            >
              View All in Jobs
            </Button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {pendingRequests.slice(0, 3).map(b => (
              <div
                key={b.id}
                className="provider-urgent-item" 
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <b style={{ color: 'var(--color-neutral-900, #1e293b)', fontSize: '0.92rem' }}>
                      {b.categoryName || 'Service Request'}
                    </b>
                    <Badge variant="brand" dot={false}>
                      {b.baseCharge || 'Quote required'}
                    </Badge>
                  </div>
                  <div className="provider-urgent-meta" style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.bookingDate} ({b.bookingTime})</span>
                    <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.serviceAddress}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onUpdateStatus?.(b.id, 'accepted')}
                  >
                    <Check size={14} /> 1-Tap Accept
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onUpdateStatus?.(b.id, 'rejected')}
                  >
                    <Ban size={14} /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. KPI Metrics Grid */}
      <div className="provider-kpi-grid">
        <Card className="provider-kpi-card" onClick={() => onNavigateTab?.('jobs')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap warning">
            <Clock size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{pendingRequests.length}</span>
            <span className="kpi-label">Pending Requests</span>
          </div>
        </Card>

        <Card className="provider-kpi-card" onClick={() => onNavigateTab?.('jobs')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap brand">
            <Briefcase size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{activeJobs.length}</span>
            <span className="kpi-label">Active Jobs</span>
          </div>
        </Card>

        <Card className="provider-kpi-card" onClick={() => onNavigateTab?.('wallet')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap success">
            <Wallet size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">LKR {Number(walletBalance || 0).toLocaleString('en-LK')}</span>
            <span className="kpi-label">Available Wallet Balance</span>
          </div>
        </Card>

        <Card className="provider-kpi-card" onClick={() => onNavigateTab?.('reviews')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon-wrap star">
            <Star size={20} fill="currentColor" />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{averageRating} ★</span>
            <span className="kpi-label">{reviewCount} Verified Reviews</span>
          </div>
        </Card>
      </div>

      {/* 4. Active & Upcoming Schedule Snapshot */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #f8fafc)' }}>
              Upcoming Schedule & Active Tasks
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)' }}>
              Next jobs requiring your attention
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigateTab?.('schedule')}>
            View Full Schedule <ArrowRight size={13} />
          </Button>
        </div>

        {upcomingJobs.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {upcomingJobs.map(b => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--color-surface-subtle, #f8faf8)',
                  border: '1px solid var(--color-border-subtle, #e5ebe2)',
                  borderRadius: 'var(--radius-md, 8px)',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <b style={{ color: 'var(--color-neutral-900, #0f172a)', fontSize: '0.92rem' }}>
                      {b.categoryName || 'Service Job'}
                    </b>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                      #{b.id.slice(-6)}
                    </span>
                    <StatusPill status={b.status} />
                  </div>
                  <div className="provider-urgent-meta" style={{ fontSize: '0.82rem', color: 'var(--color-neutral-600, #475569)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.bookingDate} at {b.bookingTime}</span>
                    <span><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{b.serviceAddress}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab?.('jobs')}
                >
                  Manage Job <ArrowRight size={13} />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No upcoming jobs scheduled"
            description="When clients book your service, their dates and addresses will appear here in chronological order."
          />
        )}
      </Card>

      {/* 5. Quick Links & Shortcuts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px'
      }}>
        <Card
          style={{ padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onClick={() => onNavigateTab?.('services')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md, 8px)',
              background: 'var(--color-brand-50, #edf7f2)',
              color: 'var(--color-brand-600, #174d3d)',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Briefcase size={18} />
            </div>
            <div>
              <b style={{ fontSize: '0.92rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                Services & Rates Catalog
              </b>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                Add trade skills, set base pricing, submit for admin approval
              </p>
            </div>
          </div>
        </Card>

        <Card
          style={{ padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onClick={() => onNavigateTab?.('wallet')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md, 8px)',
              background: 'var(--color-success-50, #ecfdf5)',
              color: 'var(--color-success-600, #059669)',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Wallet size={18} />
            </div>
            <div>
              <b style={{ fontSize: '0.92rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                CEFT Bank Settlements
              </b>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                View 10% platform fee breakdown & request instant bank payout
              </p>
            </div>
          </div>
        </Card>

        {currentUser?.category === 'grocery-products' && (
          <Card
            style={{ padding: '16px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => onNavigateTab?.('orders')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--color-warning-50, #fffbeb)',
                color: 'var(--color-warning-600, #d97706)',
                display: 'grid',
                placeItems: 'center'
              }}>
                <ShoppingBag size={18} />
              </div>
              <div>
                <b style={{ fontSize: '0.92rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                  Grocery Orders & Packing
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                  Manage store orders, pack items, notify delivery drivers
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
