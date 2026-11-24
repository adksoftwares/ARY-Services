import React from 'react';
import {
  Briefcase,
  Clock,
  Star,
  Wallet,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge, Card } from '../../design-system';

export default function ProviderStatsHeader({
  currentUser,
  bookings = [],
  averageRating = '—',
  reviewCount = 0,
  walletBalance = 0,
  isOnline = true,
  soundEnabled = true,
  onToggleSound,
  isAvailable = true,
  onToggleAvailability
}) {
  const safeBookings = Array.isArray(bookings) ? bookings.filter(booking => booking && typeof booking === 'object' && booking.id !== null && booking.id !== undefined) : [];
  const pendingCount = safeBookings.filter(booking => booking.status === 'requested').length;
  const inProgressCount = safeBookings.filter(booking => booking.status === 'in_progress').length;
  const walletValue = walletBalance !== null && walletBalance !== undefined && walletBalance !== '' ? Number(walletBalance) : NaN;
  const safeWalletBalance = Number.isFinite(walletValue) && walletValue >= 0 ? `LKR ${walletValue.toLocaleString('en-LK')}` : '—';
  const reviewCountValue = Number(reviewCount);
  const safeReviewCount = Number.isFinite(reviewCountValue) && reviewCountValue > 0 ? Math.floor(reviewCountValue) : 0;
  const ratingValue = averageRating !== null && averageRating !== undefined && averageRating !== '' ? Number(averageRating) : NaN;
  const safeRating = safeReviewCount > 0 && Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 5 ? ratingValue.toFixed(1) : '—';

  return (
    <div className="provider-stats-container">
      {/* Top Banner: Verification Status */}
      <div className="provider-status-strip">
        <div className="provider-profile-summary">
          <div className="provider-avatar-circle">
            {currentUser?.fullName?.slice(0, 2).toUpperCase() || 'SP'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="provider-heading-name">{currentUser?.fullName}</h2>
              <Badge variant="neutral" dot={false}>Provider account</Badge>
            </div>
            <span className="provider-category-subtitle">
              {currentUser?.categoryName || 'Service Provider'} · {currentUser?.location || 'Service area not provided'}
            </span>
          </div>
        </div>

        {/* Quick Online & Sound Toggles */}
        <div className="provider-quick-toggles">
          <button
            type="button"
            className={`status-pill-toggle ${isOnline ? 'online' : 'offline'}`}
            title={isOnline ? 'Network connection available' : 'Network connection unavailable'}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? 'Network online' : 'Network offline'}</span>
          </button>

          <button
            type="button"
            className={`sound-toggle-btn ${soundEnabled ? 'active' : ''}`}
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute alert sounds' : 'Enable alert chime'}
            title={soundEnabled ? 'Chime alerts active' : 'Alerts muted'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="provider-kpi-grid">
        <Card className="provider-kpi-card">
          <div className="kpi-icon-wrap warning">
            <Clock size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{pendingCount}</span>
            <span className="kpi-label">Pending Requests</span>
          </div>
        </Card>

        <Card className="provider-kpi-card">
          <div className="kpi-icon-wrap brand">
            <Briefcase size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{inProgressCount}</span>
            <span className="kpi-label">In Progress Jobs</span>
          </div>
        </Card>

        <Card className="provider-kpi-card">
          <div className="kpi-icon-wrap success">
            <Wallet size={20} />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{safeWalletBalance}</span>
            <span className="kpi-label">Available Balance</span>
          </div>
        </Card>

        <Card className="provider-kpi-card">
          <div className="kpi-icon-wrap star">
            <Star size={20} fill="currentColor" />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{safeRating}</span>
            <span className="kpi-label">Rating ({safeReviewCount} reviews)</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
