import React from 'react';
import { Bike, Navigation, MapPin, Flag, RefreshCw, Radio } from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../../design-system';

export default function AdminDispatch({
  dispatchSnapshot = { drivers: [], activeJobs: [], summary: {} },
  isLoading = false,
  onRefresh
}) {
  const drivers = dispatchSnapshot.drivers || [];
  const activeJobs = dispatchSnapshot.activeJobs || [];
  const summary = dispatchSnapshot.summary || {
    onlineDrivers: drivers.length,
    unassignedJobs: activeJobs.filter(j => !j.assignedDriverId).length,
    assignedJobs: activeJobs.filter(j => j.assignedDriverId).length
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header & Summary Grid */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={22} color="var(--color-brand-600, #174d3d)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-900, #173b2f)' }}>
                Live Dispatch & Fleet Monitor
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
                Real-time telematics of active drivers and mobility/delivery missions in Sri Lanka.
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onRefresh} loading={isLoading}>
            <RefreshCw size={14} /> Refresh Dispatch Feed
          </Button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12
        }}>
          <div style={{ padding: '12px 14px', background: '#ecfdf5', borderRadius: 'var(--radius-md, 8px)' }}>
            <span style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>Active Online Drivers</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857' }}>
              {summary.onlineDrivers ?? drivers.length}
            </div>
          </div>

          <div style={{ padding: '12px 14px', background: '#fef3c7', borderRadius: 'var(--radius-md, 8px)' }}>
            <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>Unassigned In-Pool</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>
              {summary.unassignedJobs ?? 0}
            </div>
          </div>

          <div style={{ padding: '12px 14px', background: '#eff6ff', borderRadius: 'var(--radius-md, 8px)' }}>
            <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>Assigned / In Transit</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8' }}>
              {summary.assignedJobs ?? 0}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Drivers and Active Jobs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Drivers List */}
        <Card style={{ padding: '18px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>
            Online Fleet Telematics ({drivers.length})
          </h4>

          {drivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.85rem' }}>
              No drivers are currently broadcasting live GPS locations.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {drivers.map(d => (
                <div
                  key={d.id || d.userId}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    borderRadius: 'var(--radius-md, 8px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.85rem'
                  }}
                >
                  <div>
                    <b>{d.fullName || d.driverName || 'Driver'}</b>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                      {d.phone} · GPS: {d.lat?.toFixed(4)}, {d.lng?.toFixed(4)}
                    </div>
                  </div>
                  <Badge variant="success" dot={true}>
                    Online
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active Jobs */}
        <Card style={{ padding: '18px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: 'var(--color-neutral-900, #0f172a)' }}>
            Active Missions ({activeJobs.length})
          </h4>

          {activeJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.85rem' }}>
              No active mobility trips or deliveries currently dispatched.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {activeJobs.map(j => (
                <div
                  key={j.id}
                  style={{
                    padding: '12px',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    borderRadius: 'var(--radius-md, 8px)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <b>#{j.id} · {j.serviceType}</b>
                    <span style={{ fontWeight: 600, color: 'var(--color-brand-700, #174d3d)' }}>{j.status}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <MapPin size={13} /> {j.pickupAddress} <span>&rarr;</span> <Flag size={13} /> {j.destinationAddress}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
