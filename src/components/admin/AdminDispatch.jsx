import React, { useState, useEffect } from 'react';
import {
  Bike,
  Navigation,
  MapPin,
  Flag,
  RefreshCw,
  Radio,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../../design-system';

export default function AdminDispatch({
  dispatchSnapshot = { drivers: [], activeJobs: [], summary: {} },
  isLoading = false,
  onRefresh
}) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const snapshot = dispatchSnapshot && typeof dispatchSnapshot === 'object' ? dispatchSnapshot : {};
  const drivers = Array.isArray(snapshot.drivers) ? snapshot.drivers.filter(driver => driver && typeof driver === 'object') : [];
  const activeJobs = Array.isArray(snapshot.activeJobs) ? snapshot.activeJobs.filter(job => job && typeof job === 'object') : [];
  const driversWithCoordinates = drivers.filter(driver => {
    const lat = Number(driver.lat);
    const lng = Number(driver.lng);
    return driver.lat !== null && driver.lat !== undefined && driver.lat !== '' &&
      driver.lng !== null && driver.lng !== undefined && driver.lng !== '' &&
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  });

  const suppliedSummary = snapshot.summary && typeof snapshot.summary === 'object' ? snapshot.summary : {};
  const safeCount = (value, fallback) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
  const summary = {
    onlineDrivers: safeCount(suppliedSummary.onlineDrivers, drivers.length),
    unassignedJobs: safeCount(suppliedSummary.unassignedJobs, activeJobs.filter(job => !job.assignedDriverId && !job.driverId).length),
    assignedJobs: safeCount(suppliedSummary.assignedJobs, activeJobs.filter(job => job.assignedDriverId || job.driverId).length)
  };

  // 10-second auto-poll effect when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onRefresh?.();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  // Plot only relative positions from the coordinates in this response; this is not a street map.
  const latitudes = driversWithCoordinates.map(driver => Number(driver.lat));
  const longitudes = driversWithCoordinates.map(driver => Number(driver.lng));
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  function projectToSvg(lat, lng) {
    const padding = 42;
    const width = 500 - padding * 2;
    const height = 360 - padding * 2;
    const xRatio = maxLng === minLng ? 0.5 : (lng - minLng) / (maxLng - minLng);
    const yRatio = maxLat === minLat ? 0.5 : (maxLat - lat) / (maxLat - minLat);
    return { x: padding + xRatio * width, y: padding + yRatio * height };
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header & Live Summary */}
      <Card style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#ecfdf5',
              color: '#059669',
              display: 'grid',
              placeItems: 'center'
            }}>
              <Radio size={22} className="driver-marker-pulse" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-brand-900, #173b2f)' }}>
                Driver Dispatch Overview
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
                Current dispatch response for drivers and active mobility jobs. Coordinates are plotted only when valid GPS values are supplied.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Auto Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                border: autoRefresh ? '1.5px solid #059669' : '1px solid var(--color-border, #cbd5e1)',
                background: autoRefresh ? '#ecfdf5' : 'var(--color-surface, #ffffff)',
                color: autoRefresh ? '#065f46' : 'var(--color-neutral-600, #475569)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {autoRefresh ? <Pause size={13} /> : <Play size={13} />}
              <span>{autoRefresh ? 'Live Auto-Refresh (10s)' : 'Auto-Refresh Paused'}</span>
            </button>

            <Button variant="ghost" size="sm" onClick={onRefresh} loading={isLoading}>
              <RefreshCw size={14} /> Refresh Feed
            </Button>
          </div>
        </div>

        {/* Telematics Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12
        }}>
          <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: 'var(--radius-md, 10px)', border: '1px solid #a7f3d0' }}>
            <span style={{ fontSize: '0.74rem', color: '#065f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Broadcasting Drivers
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857', marginTop: 4 }}>
              {summary.onlineDrivers ?? drivers.length}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#065f46' }}>Coordinates supplied by dispatch</span>
          </div>

          <div style={{ padding: '14px', background: '#fef3c7', borderRadius: 'var(--radius-md, 10px)', border: '1px solid #fde68a' }}>
            <span style={{ fontSize: '0.74rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending In-Pool Missions
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>
              {summary.unassignedJobs ?? 0}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#92400e' }}>Awaiting driver assignment</span>
          </div>

          <div style={{ padding: '14px', background: '#eff6ff', borderRadius: 'var(--radius-md, 10px)', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assigned Active Jobs
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
              {summary.assignedJobs ?? 0}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#1e40af' }}>Jobs with a driver assignment</span>
          </div>
        </div>
      </Card>

      {/* 2. Visual Radar Map & Drivers Grid */}
      <div className="dispatch-radar-container">
        {/* SVG Telematics Radar Canvas */}
        <Card style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Compass size={18} color="var(--color-brand-600, #174d3d)" />
              <b style={{ fontSize: '0.95rem', color: 'var(--color-text, #0f172a)' }}>
                Relative GPS Coordinate Plot (Not a Street Map)
              </b>
            </div>
            <Badge variant="neutral" dot={false}>
              Relative coordinate view
            </Badge>
          </div>

          <div className="dispatch-map-svg">
            <svg viewBox="0 0 500 360" style={{ width: '100%', height: '100%', display: 'block' }}>
              <defs>
                <radialGradient id="radarScan" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#247a61" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0f241d" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* Grid Background */}
              <circle cx="250" cy="180" r="140" fill="none" stroke="#1d4235" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="250" cy="180" r="90" fill="none" stroke="#1d4235" strokeWidth="1" />
              <circle cx="250" cy="180" r="40" fill="none" stroke="#1d4235" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="250" y1="20" x2="250" y2="340" stroke="#1a3d31" strokeWidth="1" />
              <line x1="90" y1="180" x2="410" y2="180" stroke="#1a3d31" strokeWidth="1" />

              {/* Area label */}
              <text x="250" y="345" fill="#527d6d" fontSize="9" textAnchor="middle" letterSpacing="0.06em">
                POSITIONS RELATIVE TO CURRENT DISPATCH RESPONSE
              </text>

              {/* Plotted Online Drivers */}
              {driversWithCoordinates.length === 0 ? (
                <text x="250" y="180" fill="#719b8c" fontSize="12" textAnchor="middle">
                  No valid GPS coordinates available
                </text>
              ) : (
                driversWithCoordinates.map((d, idx) => {
                  const pt = projectToSvg(Number(d.lat), Number(d.lng));

                  return (
                    <g key={d.driverId || d.id || idx}>
                      {/* Pulse */}
                      <circle cx={pt.x} cy={pt.y} r="10" fill="#10b981" opacity="0.3" />
                      {/* Driver Pin */}
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      {/* Name Label */}
                      <text
                        x={pt.x}
                        y={pt.y - 8}
                        fontSize="9"
                        fill="#ffffff"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {d.driverName || 'Driver'}
                      </text>
                    </g>
                  );
                })
              )}
            </svg>
          </div>
        </Card>

        {/* Drivers Fleet List */}
        <Card style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: 'var(--color-text, #0f172a)' }}>
            Drivers in Dispatch Feed ({drivers.length})
          </h4>

          {drivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-neutral-500, #64748b)', fontSize: '0.85rem' }}>
              No driver records were returned by the current dispatch response.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10, overflowY: 'auto', maxHeight: '340px' }}>
              {drivers.map((d, index) => (
                <div
                  key={d.driverId || d.id || `driver-${index}`}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    borderRadius: 'var(--radius-md, 8px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: '0.85rem',
                    background: 'var(--color-surface, #ffffff)'
                  }}
                >
                  <div>
                    <b style={{ color: 'var(--color-text, #0f172a)' }}>{d.driverName || 'Driver'}</b>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 2 }}>
                      Networks: {(Array.isArray(d.networks) ? d.networks.filter(Boolean).join(', ') : '') || 'Not specified'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-brand-700, #174d3d)', marginTop: 2 }}>
                      GPS: {d.lat !== null && d.lat !== undefined && d.lng !== null && d.lng !== undefined && Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng))
                        ? `${Number(d.lat).toFixed(4)}, ${Number(d.lng).toFixed(4)}`
                        : 'Coordinates unavailable'}
                    </div>
                  </div>

                  <Badge variant="neutral" dot={false}>
                    IN FEED
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 3. Active Missions Table */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: '0.95rem', color: 'var(--color-text, #0f172a)' }}>
            Active Dispatched Missions ({activeJobs.length})
          </b>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
            Current dispatch snapshot
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Mission Ref & Service</th>
                <th style={{ width: '25%' }}>Pickup Location</th>
                <th style={{ width: '25%' }}>Destination</th>
                <th style={{ width: '15%' }}>Assigned Driver</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    No mobility trips or parcel delivery missions currently active.
                  </td>
                </tr>
              ) : (
                activeJobs.map((job, index) => (
                  <tr key={job.id ?? `job-${index}`}>
                    <td>
                      <b style={{ color: 'var(--color-text, #0f172a)' }}>#{job.id}</b>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)', textTransform: 'capitalize' }}>
                        {job.serviceType || 'Mobility'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                        <MapPin size={13} color="var(--color-brand-600, #174d3d)" />
                        <span>{job.pickupAddress || 'Pickup address unavailable'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                        <Flag size={13} color="#dc2626" />
                        <span>{job.destinationAddress || 'Destination unavailable'}</span>
                      </div>
                    </td>
                    <td>
                      <b>{job.driverName || 'In Pool (Unassigned)'}</b>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Badge variant={job.status === 'in_transit' ? 'brand' : 'warning'} dot={false}>
                        {typeof job.status === 'string' ? job.status.toUpperCase() : 'DISPATCHED'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Privacy & Regulatory Compliance Disclaimer */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--color-surface-raised, #f8fafc)',
        border: '1px solid var(--color-border-subtle, #e2e8f0)',
        borderRadius: 'var(--radius-md, 8px)',
        fontSize: '0.78rem',
        color: 'var(--color-neutral-600, #475569)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <ShieldCheck size={18} color="var(--color-brand-600, #174d3d)" style={{ flexShrink: 0 }} />
        <span>
          <b>Location data notice:</b> This view displays coordinates only when they are included in the dispatch response. Access, consent, and retention should follow the platform’s approved privacy policy.
        </span>
      </div>
    </div>
  );
}
