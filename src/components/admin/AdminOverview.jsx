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
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Scale,
  Radio
} from 'lucide-react';
import { Card, Badge, Button } from '../../design-system';

export default function AdminOverview({
  adminUsers = [],
  bookings = [],
  dispatchSnapshot = { drivers: [], activeJobs: [] },
  onNavigateTab
}) {
  const users = Array.isArray(adminUsers) ? adminUsers.filter(user => user && typeof user === 'object') : [];
  const bookingRecords = Array.isArray(bookings) ? bookings.filter(booking => booking && typeof booking === 'object') : [];
  const dispatch = dispatchSnapshot && typeof dispatchSnapshot === 'object' ? dispatchSnapshot : {};
  const dispatchDrivers = Array.isArray(dispatch.drivers) ? dispatch.drivers.filter(Boolean) : [];
  const totalUsers = users.length;
  const hasRole = (user, role) => user.accountType === role || (Array.isArray(user.roles) && user.roles.includes(role));
  const customers = users.filter(u => hasRole(u, 'customer')).length;
  const providers = users.filter(u => hasRole(u, 'provider')).length;
  const drivers = users.filter(u => hasRole(u, 'driver')).length;
  const pendingApprovals = users.filter(u => u.status === 'pending').length;
  const roleTotal = customers + providers + drivers;
  const customerShare = roleTotal ? (customers / roleTotal) * 100 : 0;
  const providerShare = roleTotal ? (providers / roleTotal) * 100 : 0;
  const driverShare = roleTotal ? (drivers / roleTotal) * 100 : 0;

  const totalBookings = bookingRecords.length;
  const inProgressBookings = bookingRecords.filter(b => ['accepted', 'in_progress'].includes(b.status)).length;
  const disputedBookings = bookingRecords.filter(b => b.status === 'disputed' || b.paymentStatus === 'disputed_frozen' || Boolean(b.dispute)).length;

  const releasedToProviders = bookingRecords
    .filter(b => b.paymentStatus === 'released_to_provider')
    .reduce((sum, b) => {
      const amount = Number(b.providerPayout);
      return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
    }, 0);

  // Derive the last-seven-day booking trend from actual booking timestamps.
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    return day;
  });
  const days = lastSevenDays.map(day => day.toLocaleDateString('en-LK', { weekday: 'short' }));
  const bookingPoints = lastSevenDays.map(day => bookingRecords.filter(booking => {
    const created = new Date(booking.createdAt);
    return Number.isFinite(created.getTime()) &&
      created.getFullYear() === day.getFullYear() &&
      created.getMonth() === day.getMonth() &&
      created.getDate() === day.getDate();
  }).length);
  const maxVal = Math.max(...bookingPoints);
  const minVal = Math.min(...bookingPoints);
  const svgWidth = 520;
  const svgHeight = 150;
  const padding = 24;

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
      {/* 1. KPI Metric Cards Grid */}
      <div className="admin-kpi-grid">
        {/* Total Users */}
        <div
          className="admin-kpi-card interactive"
          onClick={() => onNavigateTab?.('users')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.(event.currentTarget.dataset.target); } }}
          data-target="users"
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Registered Accounts</span>
            <div className="admin-kpi-icon-box brand">
              <Users size={18} />
            </div>
          </div>
          <div className="admin-kpi-value">{totalUsers}</div>
          <div className="admin-kpi-subtext">
            <span>{customers} customers · {providers} pros · {drivers} drivers</span>
          </div>
        </div>

        {/* Online Drivers */}
        <div
          className="admin-kpi-card interactive"
          onClick={() => onNavigateTab?.('dispatch')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('dispatch'); } }}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Broadcasting Drivers</span>
            <div className="admin-kpi-icon-box green">
              <Bike size={18} />
            </div>
          </div>
          <div className="admin-kpi-value" style={{ color: '#047857' }}>
            {Number.isFinite(Number(dispatch.summary?.onlineDrivers)) ? Number(dispatch.summary.onlineDrivers) : dispatchDrivers.length}
          </div>
          <div className="admin-kpi-subtext">
            <span>Driver records currently returned by dispatch</span>
          </div>
        </div>

        {/* Active Bookings */}
        <div
          className="admin-kpi-card interactive"
          onClick={() => onNavigateTab?.('overview')}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">In-Progress Orders</span>
            <div className="admin-kpi-icon-box blue">
              <Activity size={18} />
            </div>
          </div>
          <div className="admin-kpi-value" style={{ color: '#1d4ed8' }}>
            {inProgressBookings}
          </div>
          <div className="admin-kpi-subtext">
            <span>Of {totalBookings} total platform jobs</span>
          </div>
        </div>

        {/* Open Disputes */}
        <div
          className="admin-kpi-card interactive"
          onClick={() => onNavigateTab?.('disputes')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('disputes'); } }}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Open Disputes</span>
            <div className="admin-kpi-icon-box red">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="admin-kpi-value" style={{ color: disputedBookings > 0 ? '#b91c1c' : '#0f172a' }}>
            {disputedBookings}
          </div>
          <div className="admin-kpi-subtext">
            <span>{disputedBookings > 0 ? 'Awaiting administrative ruling' : 'No open disputes recorded'}</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          className="admin-kpi-card interactive"
          onClick={() => onNavigateTab?.('applications')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('applications'); } }}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Pending KYC / Roles</span>
            <div className="admin-kpi-icon-box accent">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="admin-kpi-value" style={{ color: pendingApprovals > 0 ? 'var(--color-accent-700, #a05a1e)' : '#0f172a' }}>
            {pendingApprovals}
          </div>
          <div className="admin-kpi-subtext">
            <span>In partner verification queue</span>
          </div>
        </div>

        {/* Released to Providers */}
        <div
          className="admin-kpi-card interactive"
          onClick={() => onNavigateTab?.('payouts')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('payouts'); } }}
        >
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Released to Providers</span>
            <div className="admin-kpi-icon-box brand">
              <Banknote size={18} />
            </div>
          </div>
          <div className="admin-kpi-value" style={{ fontSize: '1.65rem', color: 'var(--color-brand-700, #174d3d)' }}>
            LKR {releasedToProviders.toLocaleString()}
          </div>
          <div className="admin-kpi-subtext">
            <span>Recorded provider releases · LKR</span>
          </div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {/* SVG Area Chart: 7-Day Velocity */}
        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--color-text, #0f172a)' }}>
                7-Day Booking Velocity
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
                Platform daily service & delivery orders volume
              </p>
            </div>
            <Badge variant="neutral" dot={false}>Actual daily bookings</Badge>
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

              {/* Points & Day Labels */}
              {coordinates.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4.5" fill="#ffffff" stroke="#174d3d" strokeWidth="2.5" />
                  <text
                    x={pt.x}
                    y={svgHeight - 6}
                    fontSize="10"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {days[i]}
                  </text>
                  <text
                    x={pt.x}
                    y={pt.y - 8}
                    fontSize="9.5"
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
            <h2 style={{ margin: 0, fontSize: '1.02rem', color: 'var(--color-text, #0f172a)' }}>
              Ecosystem Role Distribution
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>
              Breakdown of registered marketplace participants
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
            {/* Donut SVG */}
            <svg width="130" height="130" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="5" />
              {/* Distribution is calculated from the currently loaded account records. */}
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent" stroke="#174d3d" strokeWidth="5"
                strokeDasharray={`${customerShare} ${100 - customerShare}`} strokeDashoffset="0"
              />
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent" stroke="#d18b54" strokeWidth="5"
                strokeDasharray={`${providerShare} ${100 - providerShare}`}
                strokeDashoffset={-customerShare}
              />
              <circle
                cx="21" cy="21" r="15.91549430918954"
                fill="transparent" stroke="#059669" strokeWidth="5"
                strokeDasharray={`${driverShare} ${100 - driverShare}`}
                strokeDashoffset={-(customerShare + providerShare)}
              />
            </svg>

            {/* Legend */}
            <div style={{ fontSize: '0.84rem', display: 'grid', gap: 8 }}>
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

      {/* 3. Quick Jump Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px'
      }}>
        <div
          onClick={() => onNavigateTab?.('applications')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('applications'); } }}
          style={{
            padding: '16px',
            background: 'var(--color-surface, #ffffff)',
            border: '1px solid var(--color-border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 10px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} color="var(--color-brand-600, #174d3d)" />
            <div>
              <b style={{ fontSize: '0.88rem', color: 'var(--color-text, #0f172a)', display: 'block' }}>KYC Application Queue</b>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)' }}>Review partner credentials</span>
            </div>
          </div>
          <ArrowRight size={16} color="#94a3b8" />
        </div>

        <div
          onClick={() => onNavigateTab?.('disputes')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('disputes'); } }}
          style={{
            padding: '16px',
            background: 'var(--color-surface, #ffffff)',
            border: '1px solid var(--color-border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 10px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Scale size={20} color="#dc2626" />
            <div>
              <b style={{ fontSize: '0.88rem', color: 'var(--color-text, #0f172a)', display: 'block' }}>Dispute Arbitration</b>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)' }}>Arbitrate customer claims</span>
            </div>
          </div>
          <ArrowRight size={16} color="#94a3b8" />
        </div>

        <div
          onClick={() => onNavigateTab?.('payouts')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('payouts'); } }}
          style={{
            padding: '16px',
            background: 'var(--color-surface, #ffffff)',
            border: '1px solid var(--color-border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 10px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Banknote size={20} color="var(--color-brand-600, #174d3d)" />
            <div>
              <b style={{ fontSize: '0.88rem', color: 'var(--color-text, #0f172a)', display: 'block' }}>Manual Payout Management</b>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)' }}>Review payout requests and records</span>
            </div>
          </div>
          <ArrowRight size={16} color="#94a3b8" />
        </div>

        <div
          onClick={() => onNavigateTab?.('dispatch')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigateTab?.('dispatch'); } }}
          style={{
            padding: '16px',
            background: 'var(--color-surface, #ffffff)',
            border: '1px solid var(--color-border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 10px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={20} color="#059669" />
            <div>
              <b style={{ fontSize: '0.88rem', color: 'var(--color-text, #0f172a)', display: 'block' }}>Driver Dispatch</b>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)' }}>Review available dispatch information</span>
            </div>
          </div>
          <ArrowRight size={16} color="#94a3b8" />
        </div>
      </div>
    </div>
  );
}
