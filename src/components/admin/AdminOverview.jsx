import React from 'react';
import {
  Users,
  Briefcase,
  Bike,
  ShieldAlert,
  Banknote,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Card, Badge } from '../../design-system';

export default function AdminOverview({
  adminUsers = [],
  bookings = [],
  dispatchSnapshot = { drivers: [], activeJobs: [] },
  onNavigateTab
}) {
  const totalUsers = adminUsers.length;
  const customers = adminUsers.filter(u => u.accountType === 'customer').length;
  const providers = adminUsers.filter(u => u.accountType === 'provider').length;
  const drivers = adminUsers.filter(u => u.accountType === 'driver').length;
  const pendingApprovals = adminUsers.filter(u => u.status === 'pending').length;

  const totalBookings = bookings.length;
  const inProgressBookings = bookings.filter(b => ['accepted', 'in_progress'].includes(b.status)).length;
  const disputedBookings = bookings.filter(b => b.status === 'disputed' || b.dispute).length;

  const settledPayouts = bookings.filter(b => b.paymentStatus === 'released_to_provider').reduce((sum, b) => {
    return sum + (b.providerPayout || Math.round((parseInt(String(b.baseCharge).replace(/\D/g, '')) || 1500) * 0.9));
  }, 0);

  // Sparkline data for 7-day bookings volume
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const bookingPoints = [12, 18, 15, 26, 32, 45, 38];
  const maxVal = Math.max(...bookingPoints);
  const minVal = Math.min(...bookingPoints);
  const svgWidth = 500;
  const svgHeight = 140;
  const padding = 20;

  const coordinates = bookingPoints.map((val, idx) => {
    const x = padding + (idx / (bookingPoints.length - 1)) * (svgWidth - padding * 2);
    const y = svgHeight - padding - ((val - minVal) / (maxVal - minVal || 1)) * (svgHeight - padding * 2);
    return { x, y, val };
  });

  const pathD = coordinates.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${coordinates[coordinates.length - 1].x} ${svgHeight - padding} L ${coordinates[0].x} ${svgHeight - padding} Z`;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* 1. KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px'
      }}>
        <Card
          onClick={() => onNavigateTab?.('users')}
          style={{ padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>Total Users</span>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--color-brand-50, #edf7f2)', color: 'var(--color-brand-600, #174d3d)', display: 'grid', placeItems: 'center' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-neutral-900, #0f172a)', letterSpacing: '-0.02em' }}>
            {totalUsers}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 4 }}>
            {customers} customers · {providers} partners · {drivers} drivers
          </div>
        </Card>

        <Card style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>Active Jobs</span>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
              <Activity size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1d4ed8', letterSpacing: '-0.02em' }}>
            {inProgressBookings}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 4 }}>
            Out of {totalBookings} total platform bookings
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab?.('dispatch')}
          style={{ padding: '16px 18px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>Online Drivers</span>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center' }}>
              <Bike size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#047857', letterSpacing: '-0.02em' }}>
            {dispatchSnapshot.summary?.onlineDrivers || dispatchSnapshot.drivers?.length || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 4 }}>
            GPS broadcasting across Sri Lanka
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab?.('disputes')}
          style={{ padding: '16px 18px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>Open Disputes</span>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: '#fef2f2', color: '#dc2626', display: 'grid', placeItems: 'center' }}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: disputedBookings > 0 ? '#b91c1c' : '#334155', letterSpacing: '-0.02em' }}>
            {disputedBookings}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 4 }}>
            Awaiting Super Admin arbitration
          </div>
        </Card>

        <Card
          onClick={() => onNavigateTab?.('payouts')}
          style={{ padding: '16px 18px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-600, #475569)' }}>CEFT Settled</span>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--color-brand-50, #edf7f2)', color: 'var(--color-brand-600, #174d3d)', display: 'grid', placeItems: 'center' }}>
              <Banknote size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-brand-700, #174d3d)', letterSpacing: '-0.02em' }}>
            LKR {settledPayouts.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 4 }}>
            Released to contractor accounts
          </div>
        </Card>
      </div>

      {/* 2. Charts Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {/* SVG Area Chart: 7-Day Trend */}
        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                7-Day Booking Velocity
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                Platform daily service & delivery orders
              </p>
            </div>
            <Badge variant="success" dot={false}>
              <TrendingUp size={12} /> +24% WoW
            </Badge>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#174d3d" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#174d3d" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#e2e8f0" strokeWidth="1" />
              <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#f1f5f9" strokeDasharray="3 3" />

              {/* Shaded Area */}
              <path d={areaD} fill="url(#chartGradient)" />

              {/* Curve Line */}
              <path d={pathD} fill="none" stroke="#174d3d" strokeWidth="3" strokeLinecap="round" />

              {/* Point Circles and Day Labels */}
              {coordinates.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#174d3d" strokeWidth="2.5" />
                  <text
                    x={pt.x}
                    y={svgHeight - 4}
                    fontSize="10"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {days[i]}
                  </text>
                  <text
                    x={pt.x}
                    y={pt.y - 8}
                    fontSize="9"
                    fontWeight="700"
                    fill="#174d3d"
                    textAnchor="middle"
                  >
                    {pt.val}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </Card>

        {/* SVG Donut / Distribution Chart: Accounts */}
        <Card style={{ padding: '20px' }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
              Ecosystem Role Distribution
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
              Breakdown of registered marketplace participants
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
            {/* Donut SVG */}
            <svg width="120" height="120" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="5" />
              {/* Customers: ~60% */}
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#174d3d"
                strokeWidth="5"
                strokeDasharray="60 40"
                strokeDashoffset="0"
              />
              {/* Providers: ~25% */}
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#d18b54"
                strokeWidth="5"
                strokeDasharray="25 75"
                strokeDashoffset="-60"
              />
              {/* Drivers: ~15% */}
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent"
                stroke="#059669"
                strokeWidth="5"
                strokeDasharray="15 85"
                strokeDashoffset="-85"
              />
            </svg>

            {/* Legend */}
            <div style={{ fontSize: '0.82rem', display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#174d3d' }} />
                <span>Customers: <b>{customers}</b></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d18b54' }} />
                <span>Providers: <b>{providers}</b></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669' }} />
                <span>Drivers: <b>{drivers}</b></span>
              </div>
              {pendingApprovals > 0 && (
                <div style={{ marginTop: 4 }}>
                  <Badge variant="warning" dot={true}>
                    {pendingApprovals} Pending Verification
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
