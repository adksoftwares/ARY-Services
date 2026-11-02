import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BriefcaseBusiness,
  Layers,
  Scale,
  Banknote,
  Radio,
  Bell,
  Search,
  RefreshCw,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ShieldAlert,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { ThemeToggle, Button, Badge } from '../../design-system';
import LanguageSwitcher from '../../design-system/LanguageSwitcher';
import { subscribeToAppEvents } from '../../utils/events';

// Sub-components
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminApplications from './AdminApplications';
import AdminServiceRequests from './AdminServiceRequests';
import AdminCategories from './AdminCategories';
import AdminDisputes from './AdminDisputes';
import AdminPayouts from './AdminPayouts';
import AdminDispatch from './AdminDispatch';
import AdminNotifications from './AdminNotifications';

export default function AdminWorkspace({
  adminUsers = [],
  setAdminUsers,
  services = [],
  setServices,
  isLoadingUsers = false,
  fetchAdminUsers,
  onNotice
}) {
  const { currentUser, logout, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Platform state
  const [allBookings, setAllBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [arbitratingId, setArbitratingId] = useState(null);
  const [payoutResult, setPayoutResult] = useState(null);
  const [isSettling, setIsSettling] = useState(false);
  const [dispatchSnapshot, setDispatchSnapshot] = useState({ drivers: [], activeJobs: [], summary: {} });
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [auditEvents, setAuditEvents] = useState([]);

  const isAdmin = currentUser?.accountType === 'admin';

  // 1. Fetch Bookings
  const fetchBookings = useCallback(async () => {
    if (!currentUser?.token || !isAdmin) return;
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
      console.warn('Could not load bookings:', e);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [currentUser, isAdmin]);

  // 2. Fetch Dispatch Snapshot
  const fetchDispatchSnapshot = useCallback(async () => {
    if (!currentUser?.token || !isAdmin) return;
    setDispatchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/driver-dispatch`, {
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
      console.warn('Could not load dispatch telemetry:', e);
    } finally {
      setDispatchLoading(false);
    }
  }, [currentUser, isAdmin]);

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchBookings();
      fetchDispatchSnapshot();
    }
  }, [isAdmin, fetchBookings, fetchDispatchSnapshot]);

  // Real-time SSE Event Subscription
  useEffect(() => {
    if (!isAdmin || !currentUser?.token) return undefined;

    const refreshData = () => {
      fetchAdminUsers?.();
      fetchBookings();
      fetchDispatchSnapshot();
    };

    return subscribeToAppEvents(currentUser.token, {
      'driver:application_created': (data) => {
        refreshData();
        setAuditEvents(prev => [{
          id: Date.now(),
          type: 'kyc',
          title: 'New Driver Application Received',
          description: `Applicant: ${data?.driverName || 'Driver'}`,
          timestamp: 'Just now',
          color: 'accent',
          targetTab: 'applications'
        }, ...prev]);
      },
      'driver:location_updated': () => fetchDispatchSnapshot(),
      'job:dispatched': (data) => {
        fetchDispatchSnapshot();
        fetchBookings();
      },
      'booking:created': (data) => {
        fetchBookings();
        setAuditEvents(prev => [{
          id: Date.now(),
          type: 'account',
          title: 'New Customer Booking Placed',
          description: `Job Ref: #${data?.bookingId || 'new'}`,
          timestamp: 'Just now',
          color: 'brand',
          targetTab: 'overview'
        }, ...prev]);
      },
      'dispute:raised': (data) => {
        fetchBookings();
        setAuditEvents(prev => [{
          id: Date.now(),
          type: 'dispute',
          title: 'Customer Workmanship Dispute Raised',
          description: `Booking #${data?.bookingId || ''} frozen in escrow`,
          timestamp: 'Just now',
          color: 'danger',
          targetTab: 'disputes'
        }, ...prev]);
      }
    });
  }, [isAdmin, currentUser?.token, fetchAdminUsers, fetchBookings, fetchDispatchSnapshot]);

  // Action: Update User Status
  async function handleUpdateUserStatus(userId, newStatus, userName, reason = '') {
    if (!currentUser?.token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ status: newStatus, reason })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update user status.');
      }

      setAdminUsers(prev => prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u)));
      onNotice?.(newStatus === 'active' ? `Approved: "${userName}" is now active.` : `Status updated to ${newStatus}.`);
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    }
  }

  // Action: Delete User
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
      onNotice?.(`Account for "${userName}" permanently deleted.`);
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    }
  }

  // Action: Reset User Password
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
    onNotice?.('Password reset successfully.');
  }

  // Action: Arbitrate Dispute
  async function handleArbitrateDispute(bookingId, action, notes) {
    if (!currentUser?.token) return;
    setArbitratingId(bookingId);
    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/arbitrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          action,
          notes: notes || `Arbitrated by Admin ${currentUser.fullName}`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to arbitrate dispute.');

      onNotice?.(`Dispute Settlement Executed: ${action.replace(/_/g, ' ').toUpperCase()}`);
      await fetchBookings();
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    } finally {
      setArbitratingId(null);
    }
  }

  // Action: Run CEFT Payout Run
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
      onNotice?.(`CEFT Batch Dispatched! Total: LKR ${data.totalPayoutAmount?.toLocaleString() || 0}`);
      await fetchBookings();
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    } finally {
      setIsSettling(false);
    }
  }

  // Security Role Guard
  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: 620,
        margin: '60px auto',
        padding: '36px 24px',
        textAlign: 'center',
        background: 'var(--color-surface, #ffffff)',
        borderRadius: 'var(--radius-xl, 20px)',
        border: '1px solid var(--color-border-subtle, #e2e8f0)',
        boxShadow: 'var(--shadow-md, 0 12px 36px rgba(0,0,0,0.06))'
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg, 16px)',
          background: '#fef2f2',
          color: '#dc2626',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px'
        }}>
          <ShieldAlert size={30} />
        </div>
        <h2 style={{ fontSize: '1.4rem', color: '#7f1d1d', margin: '0 0 8px' }}>
          Access Denied — Administrator Credentials Required
        </h2>
        <p style={{ color: 'var(--color-neutral-600, #475569)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
          This administrative workstation is restricted to authorized ARY Services Super Administrators. Your current session does not possess administrative privileges.
        </p>
        <Button variant="primary" onClick={() => openAuthModal('login')}>
          <LogIn size={15} /> Sign In as Administrator
        </Button>
      </div>
    );
  }

  // Navigation Items
  const disputedCount = allBookings.filter(b => b.status === 'disputed' || b.paymentStatus === 'disputed_frozen' || b.dispute).length;
  const pendingUsersCount = adminUsers.filter(u => u.status === 'pending').length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Accounts', icon: Users, count: adminUsers.length },
    { id: 'applications', label: 'Applications Queue', icon: ShieldCheck, count: pendingUsersCount, badgeType: 'warning' },
    { id: 'services', label: 'Service Requests', icon: BriefcaseBusiness },
    { id: 'categories', label: 'Marketplace Categories', icon: Layers, count: services.length },
    { id: 'disputes', label: 'Disputes & Escrow', icon: Scale, count: disputedCount, badgeType: 'danger' },
    { id: 'payouts', label: 'CEFT Settlement', icon: Banknote },
    { id: 'dispatch', label: 'Dispatch Telematics', icon: Radio, count: dispatchSnapshot.summary?.onlineDrivers ?? dispatchSnapshot.drivers?.length ?? 0, badgeType: 'brand' },
    { id: 'notifications', label: 'System Audit Log', icon: Bell }
  ];

  const activeNavItem = navItems.find(item => item.id === activeTab) || navItems[0];

  return (
    <div className="admin-layout">
      {/* Mobile Sidebar Overlay Backdrop */}
      <div
        className={`admin-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* 1. Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <span className="admin-brand-icon">A</span>
            <div className="admin-brand-info">
              <b>ARY Admin</b>
              <span>Super Console</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            style={{ display: sidebarOpen ? 'flex' : 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="admin-nav-list" aria-label="Admin Navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                <div className="admin-nav-left">
                  <Icon size={17} color={isActive ? 'var(--color-brand-600, #174d3d)' : '#64748b'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className={`admin-nav-badge ${item.badgeType || 'brand'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-profile-pill">
            <div className="admin-profile-avatar">
              {currentUser?.fullName?.slice(0, 2).toUpperCase() || 'SA'}
            </div>
            <div className="admin-profile-info">
              <b>{currentUser?.fullName || 'Super Admin'}</b>
              <span>{currentUser?.email || 'admin@aryservices.lk'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-neutral-500, #64748b)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6
            }}
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* 2. Main Content Canvas */}
      <div className="admin-canvas">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb */}
            <div className="admin-breadcrumbs">
              <span>Admin</span>
              <ChevronRight size={13} />
              <b>{activeNavItem.label}</b>
            </div>
          </div>

          {/* Topbar Actions */}
          <div className="admin-topbar-actions">
            {/* Global Search Bar */}
            <div className="admin-search-wrapper">
              <Search size={15} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search platform..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (activeTab !== 'users' && e.target.value.trim()) {
                    setActiveTab('users');
                  }
                }}
              />
            </div>

            {/* Quick Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchAdminUsers?.();
                fetchBookings();
                fetchDispatchSnapshot();
              }}
              loading={isLoadingUsers || isLoadingBookings || dispatchLoading}
              title="Refresh Platform Data"
            >
              <RefreshCw size={13} />
            </Button>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              style={{
                position: 'relative',
                background: 'none',
                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '8px',
                color: 'var(--color-text, #1e293b)',
                cursor: 'pointer'
              }}
              title="System Audit Notifications"
              aria-label="System notifications"
            >
              <Bell size={16} />
              {disputedCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#dc2626'
                }} />
              )}
            </button>

            {/* Language & Theme Controls */}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* 3. Page Content Area */}
        <main className="admin-page-container">
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

          {activeTab === 'applications' && (
            <AdminApplications
              adminUsers={adminUsers}
              onRefreshUsers={fetchAdminUsers}
              onNotice={onNotice}
            />
          )}

          {activeTab === 'services' && (
            <AdminServiceRequests
              onNotice={onNotice}
            />
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
              adminUsers={adminUsers}
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

          {activeTab === 'notifications' && (
            <AdminNotifications
              events={auditEvents}
              onNavigateTab={setActiveTab}
            />
          )}
        </main>
      </div>
    </div>
  );
}
