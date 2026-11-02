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
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Badge, Card } from '../../design-system';

export default function ProviderStatsHeader({
  currentUser,
  bookings = [],
  averageRating = '5.0',
  reviewCount = 0,
  walletBalance = 0,
  isOnline = true,
  soundEnabled = true,
  onToggleSound,
  isAvailable = true,
  onToggleAvailability
}) {
  const pendingCount = bookings.filter(b => b.status === 'requested').length;
  const inProgressCount = bookings.filter(b => b.status === 'in_progress').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;

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
              <Badge variant="success" dot={false}>
                <CheckCircle2 size={13} /> Verified Partner
              </Badge>
            </div>
            <span className="provider-category-subtitle">
              {currentUser?.categoryName || 'Professional Service Provider'} · {currentUser?.location || 'Colombo, Sri Lanka'}
            </span>
          </div>
        </div>

        {/* Quick Online & Sound Toggles */}
        <div className="provider-quick-toggles">
          <button
            type="button"
            className={`status-pill-toggle ${isOnline ? 'online' : 'offline'}`}
            title={isOnline ? 'Network Online' : 'Network Offline'}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
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
            <span className="kpi-val">LKR {Number(walletBalance).toLocaleString('en-LK')}</span>
            <span className="kpi-label">Available Balance</span>
          </div>
        </Card>

        <Card className="provider-kpi-card">
          <div className="kpi-icon-wrap star">
            <Star size={20} fill="currentColor" />
          </div>
          <div className="kpi-data">
            <span className="kpi-val">{averageRating}</span>
            <span className="kpi-label">Rating ({reviewCount} reviews)</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
