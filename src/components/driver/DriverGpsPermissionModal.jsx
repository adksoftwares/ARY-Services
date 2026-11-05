import React from 'react';
import { Navigation, ShieldCheck, MapPin, AlertTriangle, Compass, CheckCircle2, Settings } from 'lucide-react';
import { Modal, Button, Badge } from '../../design-system';

export default function DriverGpsPermissionModal({
  isOpen,
  onClose,
  onGrant,
  isRequesting = false,
  error = ''
}) {
  if (!isOpen) return null;

  const isDenied = error && (error.includes('denied') || error.includes('permission'));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="High-Precision GPS Location Required"
      size="sm"
      isBottomSheet={true}
    >
      <div style={{ padding: '8px 0 16px', textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg, 16px)',
          background: isDenied ? 'var(--color-danger-50, #fef2f2)' : 'var(--color-brand-50, #edf7ef)',
          color: isDenied ? 'var(--color-danger-600, #dc2626)' : 'var(--color-brand-600, #174d3d)',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px'
        }}>
          {isDenied ? <AlertTriangle size={28} /> : <Compass size={28} />}
        </div>

        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: 'var(--text-primary, #f8fafc)' }}>
          {isDenied ? 'Location Permission Needed' : 'Connect Your Real-Time GPS'}
        </h3>

        <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--color-neutral-600, #475569)', lineHeight: 1.5 }}>
          {isDenied
            ? 'Your browser or device has blocked GPS location access. To receive nearby passenger rides and delivery dispatches, location access is required.'
            : 'ARY Driver matches you with nearby passenger rides and store deliveries based on live straight-line proximity.'}
        </p>

        {/* Benefits Checklist */}
        {!isDenied && (
          <div style={{
            background: 'var(--color-surface-subtle, #f8faf8)',
            border: '1px solid var(--color-border-subtle, #e5ebe2)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: '0.82rem',
            color: 'var(--color-neutral-700, #334155)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} color="var(--color-success-600, #059669)" style={{ flexShrink: 0 }} />
              <span>Prioritizes closest jobs within 1–5 km radius</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} color="var(--color-success-600, #059669)" style={{ flexShrink: 0 }} />
              <span>Calculates accurate customer arrival estimates (ETA)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} color="var(--color-success-600, #059669)" style={{ flexShrink: 0 }} />
              <span>Battery-optimised: pings only while you are active online</span>
            </div>
          </div>
        )}

        {/* Instructions for Denied Permission */}
        {isDenied && (
          <div style={{
            background: 'var(--color-warning-50, #fffbeb)',
            border: '1px solid var(--color-warning-200, #fde68a)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '14px',
            textAlign: 'left',
            fontSize: '0.82rem',
            color: 'var(--color-warning-900, #78350f)',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 6 }}>
              <Settings size={15} /> How to re-enable GPS on Android:
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Tap the <b>Lock / Site settings</b> icon in your browser address bar (or Android App Settings).</li>
              <li>Tap <b>Permissions</b> &rarr; <b>Location</b>.</li>
              <li>Select <b>Allow while using the app</b>.</li>
              <li>Return here and tap <b>Retry GPS Connection</b>.</li>
            </ol>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button
            variant="primary"
            size="lg"
            onClick={onGrant}
            loading={isRequesting}
            style={{ minHeight: 52, fontSize: '1rem', fontWeight: 800 }}
          >
            <Navigation size={18} /> {isDenied ? 'Retry GPS Connection' : 'Allow GPS & Go Online'}
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isRequesting}
          >
            Stay Offline for Now
          </Button>
        </div>
      </div>
    </Modal>
  );
}
