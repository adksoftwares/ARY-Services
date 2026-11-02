import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Bike,
  BriefcaseBusiness,
  Layers,
  Scale,
  Banknote,
  Radio,
  ShieldCheck,
  Search,
  RefreshCw,
  LogOut,
  UserRound,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { ThemeToggle, Button, Badge } from '../../design-system';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminDisputes from './AdminDisputes';
import AdminPayouts from './AdminPayouts';
import AdminDispatch from './AdminDispatch';
import AdminCategories from './AdminCategories';
import DriverApplicationsAdmin from './DriverApplicationsAdmin';
import RoleApplicationsAdmin from './RoleApplicationsAdmin';
import ProviderServiceRequestsAdmin from './ProviderServiceRequestsAdmin';

export default function AdminWorkspace({
  adminUsers = [],
  setAdminUsers,
  services = [],
  setServices,
  isLoadingUsers = false,
  fetchAdminUsers,
  onNotice
}) {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'roles' | 'drivers' | 'services' | 'categories' | 'disputes' | 'payouts' | 'dispatch'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Platform data state
  const [allBookings, setAllBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [arbitratingId, setArbitratingId] = useState(null);
  const [payoutResult, setPayoutResult] = useState(null);
  const [isSettling, setIsSettling] = useState(false);
  const [dispatchSnapshot, setDispatchSnapshot] = useState({ drivers: [], activeJobs: [], summary: {} });
  const [dispatchLoading, setDispatchLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!currentUser?.token || currentUser.accountType !== 'admin') return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllBookings(data.bookings || []);
      }
    } catch (e) {
      console.warn('Could not load admin bookings:', e);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [currentUser]);

  const fetchDispatchSnapshot = useCallback(async () => {
    if (!currentUser?.token) return;
    setDispatchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/driver-dispatch/snapshot`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDispatchSnapshot({
          drivers: data.drivers || [],
          activeJobs: data.activeJobs || [],
          summary: data.summary || {}
        });
      }
    } catch (e) {
      console.warn('Could not load dispatch snapshot:', e);
    } finally {
      setDispatchLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchBookings();
    fetchDispatchSnapshot();
  }, [fetchBookings, fetchDispatchSnapshot]);

  // Update user status without ary_persisted_users (Constraint 4)
  async function handleUpdateUserStatus(userId, newStatus, userName) {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update user status.');
      }

      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      onNotice?.(newStatus === 'active' ? `Approved: "${userName}" is now active.` : `Status updated to ${newStatus}.`);
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    }
  }

  // Delete user without ary_persisted_users (Constraint 4)
  async function handleDeleteUser(userId, userName) {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${currentUser.token}`
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account.');
      }
      setAdminUsers(prev => prev.filter(u => u.id !== userId));
      onNotice?.(`Account for ${userName} has been removed.`);
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    }
  }

  // Reset user password
  async function handleResetPassword(userId, password) {
    if (!currentUser?.token) return;
    const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({ password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password.');
    }
    onNotice?.('User password reset successfully.');
  }

  // Arbitrate dispute
  async function handleArbitrateDispute(bookingId, action) {
    if (!currentUser?.token) return;
    setArbitratingId(bookingId);
    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/arbitrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ action, notes: `Arbitrated by Admin ${currentUser.fullName}` })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to arbitrate dispute.');
      onNotice?.(`Dispute Arbitrated: ${action.replaceAll('_', ' ').toUpperCase()}`);
      await fetchBookings();
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    } finally {
      setArbitratingId(null);
    }
  }

  // Run CEFT Payout Run
  async function handleRunPayoutSettlement() {
    if (!currentUser?.token) return;
    setIsSettling(true);
    try {
      const res = await fetch(`${API_BASE}/admin/payouts/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ minThreshold: 1000 })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Payout settlement failed.');
      setPayoutResult(data);
      onNotice?.(`CEFT Batch Generated! Total: LKR ${data.totalPayoutAmount?.toLocaleString() || 0}`);
      await fetchBookings();
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    } finally {
      setIsSettling(false);
    }
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Accounts', icon: Users, count: adminUsers.length },
    { id: 'roles', label: 'Role Applications', icon: ShieldCheck },
    { id: 'drivers', label: 'Driver Approvals', icon: Bike },
    { id: 'services', label: 'Service Approvals', icon: BriefcaseBusiness },
    { id: 'categories', label: 'Marketplace Categories', icon: Layers },
    { id: 'disputes', label: 'Disputes & Escrow', icon: Scale, count: allBookings.filter(b => b.status === 'disputed' || b.paymentStatus === 'disputed_frozen').length },
    { id: 'payouts', label: 'CEFT Settlement', icon: Banknote },
    { id: 'dispatch', label: 'Dispatch Telematics', icon: Radio }
  ];

  const activeNavItem = navItems.find(item => item.id === activeTab) || navItems[0];

  return (
    <div style={{ display: 'flex', minHeight: '90vh', background: 'var(--color-bg, #fbfaf7)' }}>
      {/* 1. Desktop & Mobile Drawer Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'var(--color-surface, #fff)',
          borderRight: '1px solid var(--color-border-subtle, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50
        }}
      >
        {/* Brand strip */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--color-brand-600, #174d3d)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '1rem'
            }}>A</span>
            <div>
              <b style={{ color: 'var(--color-brand-900, #0c2d23)', fontSize: '1rem' }}>ARY Admin</b>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-neutral-400, #94a3b8)' }}>Enterprise Console</div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto', display: 'grid', gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: 'none',
                  background: isActive ? 'var(--color-brand-50, #edf7f2)' : 'transparent',
                  color: isActive ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-700, #334155)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={17} color={isActive ? 'var(--color-brand-600, #174d3d)' : '#64748b'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: item.id === 'disputes' ? '#fee2e2' : 'var(--color-brand-100, #d4ebd8)',
                    color: item.id === 'disputes' ? '#b91c1c' : 'var(--color-brand-800, #154636)',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid var(--color-border-subtle, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#fef3c7',
              color: '#b45309',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: '0.8rem'
            }}>SA</span>
            <div style={{ fontSize: '0.78rem' }}>
              <b style={{ color: 'var(--color-neutral-900, #0f172a)', display: 'block' }}>{currentUser?.fullName}</b>
              <span style={{ color: '#64748b' }}>Super Admin</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* 2. Main Content Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header style={{
          height: '60px',
          background: 'var(--color-surface, #fff)',
          borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--color-neutral-400, #94a3b8)' }}>Admin</span>
            <ChevronRight size={14} color="#94a3b8" />
            <b style={{ color: 'var(--color-brand-900, #173b2f)' }}>{activeNavItem.label}</b>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchAdminUsers?.();
                fetchBookings();
                fetchDispatchSnapshot();
              }}
              loading={isLoadingUsers || isLoadingBookings || dispatchLoading}
            >
              <RefreshCw size={13} /> Refresh Platform
            </Button>
          </div>
        </header>

        {/* Main Body Page View */}
        <main style={{ padding: '24px', maxWidth: 1240, width: '100%', boxSizing: 'border-box' }}>
          {activeTab === 'overview' && (
            <AdminOverview
              adminUsers={adminUsers}
              bookings={allBookings}
              dispatchSnapshot={dispatchSnapshot}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsers
              adminUsers={adminUsers}
              isLoadingUsers={isLoadingUsers}
              onRefresh={fetchAdminUsers}
              onUpdateStatus={handleUpdateUserStatus}
              onDeleteUser={handleDeleteUser}
              onResetPassword={handleResetPassword}
            />
          )}

          {activeTab === 'roles' && (
            <RoleApplicationsAdmin />
          )}

          {activeTab === 'drivers' && (
            <DriverApplicationsAdmin />
          )}

          {activeTab === 'services' && (
            <ProviderServiceRequestsAdmin />
          )}

          {activeTab === 'categories' && (
            <AdminCategories
              services={services}
              setServices={setServices}
              onNotice={onNotice}
            />
          )}

          {activeTab === 'disputes' && (
            <AdminDisputes
              bookings={allBookings}
              onArbitrate={handleArbitrateDispute}
              arbitratingId={arbitratingId}
            />
          )}

          {activeTab === 'payouts' && (
            <AdminPayouts
              bookings={allBookings}
              payoutResult={payoutResult}
              onRunPayout={handleRunPayoutSettlement}
              isSettling={isSettling}
            />
          )}

          {activeTab === 'dispatch' && (
            <AdminDispatch
              dispatchSnapshot={dispatchSnapshot}
              isLoading={dispatchLoading}
              onRefresh={fetchDispatchSnapshot}
            />
          )}
        </main>
      </div>
    </div>
  );
}
