import React, { useState, useMemo } from 'react';
import {
  Bike,
  PackageCheck,
  Package,
  CheckCircle2,
  DollarSign,
  Clock,
  MapPin,
  Calendar,
  Navigation,
  ArrowUpRight
} from 'lucide-react';
import { Card, Badge, EmptyState, SegmentedControl } from '../../design-system';

export default function DriverEarningsSummary({
  completedJobs = [],
  presence
}) {
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'ride' | 'food_delivery' | 'parcel_delivery'

  const completedCount = completedJobs.length;

  const totalEarnings = useMemo(() => {
    return completedJobs.reduce((sum, j) => {
      return sum + (Number(j.fare ?? j.baseCharge) || 0);
    }, 0);
  }, [completedJobs]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return completedJobs;
    return completedJobs.filter(j => j.serviceType === historyFilter);
  }, [completedJobs, historyFilter]);

  return (
    <div className="driver-earnings-container" style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
      {/* 1. Summary Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <Card style={{
          background: 'var(--color-surface, #fff)',
          padding: '16px 18px',
          border: '1px solid var(--color-border-subtle, #e2e8f0)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--color-brand-50, #edf7f2)',
              color: 'var(--color-brand-600, #174d3d)',
              display: 'grid',
              placeItems: 'center'
            }}>
              <CheckCircle2 size={16} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>
              Completed Jobs
            </span>
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', letterSpacing: '-0.02em' }}>
            {completedCount}
          </div>
          <small style={{ fontSize: '0.72rem', color: 'var(--color-neutral-500, #64748b)' }}>
            Across all transport streams
          </small>
        </Card>

        <Card style={{
          background: 'var(--color-brand-50, #edf7f2)',
          padding: '16px 18px',
          border: '1px solid var(--color-brand-200, #b7decb)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'var(--color-brand-600, #174d3d)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center'
            }}>
              <DollarSign size={16} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-brand-800, #154636)' }}>
              Recorded Fares
            </span>
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-brand-700, #174d3d)', letterSpacing: '-0.02em' }}>
            LKR {totalEarnings.toLocaleString()}
          </div>
          <small style={{ fontSize: '0.72rem', color: 'var(--color-brand-700, #1b5e4b)' }}>
            Completed-job fare records; this is not a bank payout confirmation.
          </small>
        </Card>

        <Card style={{
          background: presence?.online ? 'var(--color-success-50, #ecfdf5)' : 'var(--color-neutral-50, #f8fafc)',
          padding: '16px 18px',
          border: presence?.online ? '1px solid var(--color-success-200, #a7f3d0)' : '1px solid var(--color-border-subtle, #e2e8f0)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-sm, 6px)',
              background: presence?.online ? 'var(--color-success-600, #059669)' : 'var(--color-neutral-400, #94a3b8)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center'
            }}>
              <MapPin size={16} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>
              Dispatch Status
            </span>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: presence?.online ? 'var(--color-success-800, #065f46)' : 'var(--color-neutral-700, #334155)' }}>
            {presence?.online ? '🟢 Available' : '⏸️ Offline'}
          </div>
          <small style={{ fontSize: '0.72rem', color: presence?.online ? 'var(--color-success-700, #047857)' : 'var(--color-neutral-500, #64748b)' }}>
            {presence?.online ? 'GPS proximity active' : 'Turn online to receive trips'}
          </small>
        </Card>
      </div>

      {/* 2. Completed Trip History Feed */}
      {completedJobs.length > 0 && (
        <Card style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>
              Completed Trip History ({completedJobs.length})
            </h2>

            <div style={{ maxWidth: 360 }}>
              <SegmentedControl
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'ride', label: 'Rides' },
                  { value: 'food_delivery', label: 'Shop & Grocery' },
                  { value: 'parcel_delivery', label: 'Parcels' }
                ]}
                value={historyFilter}
                onChange={setHistoryFilter}
              />
            </div>
          </div>

          {filteredHistory.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {filteredHistory.map(job => {
                const fare = Number(job.fare ?? job.baseCharge) || null;
                const Icon = job.serviceType === 'food_delivery' ? PackageCheck : job.serviceType === 'parcel_delivery' ? Package : Bike;

                return (
                  <div
                    key={job.id}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--color-surface-subtle, #f8faf8)',
                      border: '1px solid var(--color-border-subtle, #e5ebe2)',
                      borderRadius: 'var(--radius-md, 8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: 1 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm, 6px)',
                        background: 'var(--color-brand-100, #d9ebe1)',
                        color: 'var(--color-brand-700, #174d3d)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <b style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                          {job.serviceType === 'food_delivery' ? 'Food Order' : job.serviceType === 'parcel_delivery' ? 'Parcel Delivery' : 'Passenger Ride'}
                        </b>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                          {job.pickupAddress} &rarr; {job.destinationAddress}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <b style={{ fontSize: '0.95rem', color: 'var(--color-success-700, #047857)' }}>
                        {fare != null ? `LKR ${fare.toLocaleString()}` : 'Fare not recorded'}
                      </b>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-neutral-400, #94a3b8)' }}>
                        {new Date(job.updatedAt || job.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-neutral-500, #64748b)', fontSize: '0.82rem' }}>
              No completed trips in this category yet.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
