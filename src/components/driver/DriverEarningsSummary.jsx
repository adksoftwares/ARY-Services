import React from 'react';
import { Bike, CheckCircle2, DollarSign, Clock, MapPin } from 'lucide-react';
import { Card, Badge } from '../../design-system';

export default function DriverEarningsSummary({
  completedJobs = [],
  presence
}) {
  const completedCount = completedJobs.length;
  // Estimated LKR 650 avg base for driver trip
  const estimatedEarnings = completedJobs.reduce((sum, j) => {
    return sum + (j.fare || j.baseCharge || 650);
  }, 0);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '14px',
      marginBottom: '20px'
    }}>
      <Card style={{
        background: 'var(--color-surface, #fff)',
        padding: '16px 18px',
        border: '1px solid var(--color-border-subtle, #e2e8f0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm, 6px)',
            background: 'var(--color-brand-50, #edf7f2)',
            color: 'var(--color-brand-600, #174d3d)',
            display: 'grid',
            placeItems: 'center'
          }}>
            <CheckCircle2 size={18} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>
            Completed Trips
          </span>
        </div>
        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-brand-900, #0c2d23)', letterSpacing: '-0.02em' }}>
          {completedCount}
        </div>
        <small style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)' }}>
          Across rides & food deliveries
        </small>
      </Card>

      <Card style={{
        background: 'var(--color-brand-50, #edf7f2)',
        padding: '16px 18px',
        border: '1px solid var(--color-brand-200, #b7decb)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm, 6px)',
            background: 'var(--color-brand-600, #174d3d)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center'
          }}>
            <DollarSign size={18} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-brand-800, #154636)' }}>
            Driver Payout
          </span>
        </div>
        <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-brand-700, #174d3d)', letterSpacing: '-0.02em' }}>
          LKR {estimatedEarnings.toLocaleString()}
        </div>
        <small style={{ fontSize: '0.72rem', color: 'var(--color-brand-700, #1b5e4b)' }}>
          Direct to driver wallet / cash
        </small>
      </Card>

      <Card style={{
        background: presence?.online ? 'var(--color-success-50, #ecfdf5)' : 'var(--color-neutral-50, #f8fafc)',
        padding: '16px 18px',
        border: presence?.online ? '1px solid var(--color-success-200, #a7f3d0)' : '1px solid var(--color-border-subtle, #e2e8f0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm, 6px)',
            background: presence?.online ? 'var(--color-success-600, #059669)' : 'var(--color-neutral-400, #94a3b8)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center'
          }}>
            <MapPin size={18} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>
            Dispatch Status
          </span>
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: presence?.online ? 'var(--color-success-700, #047857)' : 'var(--color-neutral-700, #334155)' }}>
          {presence?.online ? '🟢 Live on Duty' : '⚪ Offline'}
        </div>
        <small style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)' }}>
          {presence?.online ? 'GPS sharing active' : 'Turn on to get jobs'}
        </small>
      </Card>
    </div>
  );
}
