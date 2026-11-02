import React from 'react';
import {
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Volume2,
  VolumeX,
  Vibrate,
  Globe,
  Sun,
  Moon,
  ArrowLeftRight,
  LogOut,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { Card, Badge, Button, ThemeToggle, LanguageSwitcher } from '../../design-system';
import ProviderVerificationBanner from './ProviderVerificationBanner';

export default function ProviderProfile({
  currentUser,
  soundEnabled = true,
  onToggleSound,
  vibrationEnabled = true,
  onToggleVibration,
  onSwitchRole,
  onLogout
}) {
  return (
    <div className="provider-profile-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Verification Status Banner */}
      <ProviderVerificationBanner currentUser={currentUser} />

      {/* 2. Profile Details Card */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-brand-600, #174d3d)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '24px',
            fontWeight: 800,
            flexShrink: 0
          }}>
            {currentUser?.fullName?.slice(0, 2).toUpperCase() || 'SP'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-brand-900, #173b2f)' }}>
                {currentUser?.fullName}
              </h2>
              <Badge variant="success" dot={false}>
                <CheckCircle2 size={13} /> {currentUser?.accountType?.toUpperCase() || 'PROVIDER'}
              </Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-neutral-500, #64748b)' }}>
              {currentUser?.categoryName || 'Professional Trade Specialist'}
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          padding: '16px',
          background: 'var(--color-surface-subtle, #f8faf8)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border-subtle, #e5ebe2)',
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Contact Phone</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{currentUser?.phone || 'Not configured'}</b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Primary Service Base</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{currentUser?.location || 'Colombo, Sri Lanka'}</b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Account ID</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--color-neutral-600, #475569)' }}>{currentUser?.id || '—'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Registered Roles</span>
            <b style={{ color: 'var(--color-brand-700, #174d3d)' }}>{(currentUser?.roles || ['provider']).join(', ')}</b>
          </div>
        </div>
      </Card>

      {/* 3. Notification & Hardware Sound Alerts */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Real-Time Dispatch & Audio Alert Settings
        </h3>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--color-surface-subtle, #f8faf8)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, #e5ebe2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: soundEnabled ? 'var(--color-brand-100, #d9ebe1)' : '#f1f5f9', color: soundEnabled ? 'var(--color-brand-700, #174d3d)' : '#64748b', display: 'grid', placeItems: 'center' }}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </div>
              <div>
                <b style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                  Audio Chime on Incoming Booking Requests
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                  Plays dual-tone alert frequency when clients book services
                </p>
              </div>
            </div>

            <Button
              variant={soundEnabled ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleSound}
            >
              {soundEnabled ? 'Sound On' : 'Muted'}
            </Button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--color-surface-subtle, #f8faf8)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, #e5ebe2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: vibrationEnabled ? 'var(--color-brand-100, #d9ebe1)' : '#f1f5f9', color: vibrationEnabled ? 'var(--color-brand-700, #174d3d)' : '#64748b', display: 'grid', placeItems: 'center' }}>
                <Vibrate size={16} />
              </div>
              <div>
                <b style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                  Haptic Vibration on Mobile
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                  Triggers hardware pulse vibration on Android / Capacitor WebView
                </p>
              </div>
            </div>

            <Button
              variant={vibrationEnabled ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleVibration}
            >
              {vibrationEnabled ? 'Vibration On' : 'Off'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Display, Language & Account Actions */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Preferences & Role Switching
        </h3>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--color-border-subtle, #edf2ee)' }}>
          {(currentUser?.roles || []).includes('customer') && (
            <Button
              variant="outline"
              onClick={() => onSwitchRole?.('customer')}
            >
              <ArrowLeftRight size={14} /> Switch to Customer Mode
            </Button>
          )}

          <Button
            variant="danger"
            onClick={onLogout}
          >
            <LogOut size={14} /> Sign Out of Workspace
          </Button>
        </div>
      </Card>
    </div>
  );
}
