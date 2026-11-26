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
import AdminCashPayments from './AdminCashPayments';
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
  const [bookingsError, setBookingsError] = useState('');
  const [arbitratingId, setArbitratingId] = useState(null);
  const [payoutResult, setPayoutResult] = useState(null);
  const [isSettling, setIsSettling] = useState(false);
  const [dispatchSnapshot, setDispatchSnapshot] = useState({ drivers: [], activeJobs: [], summary: {} });
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [auditEvents, setAuditEvents] = useState([]);
  const [cashPayments, setCashPayments] = useState({ records: [], summary: {} });
  const [cashPaymentsLoading, setCashPaymentsLoading] = useState(false);
  const [cashPaymentsError, setCashPaymentsError] = useState('');

  const isAdmin = currentUser?.accountType === 'admin';

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const handleEscape = event => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // 1. Fetch Bookings
  const fetchBookings = useCallback(async () => {
    if (!currentUser?.token || !isAdmin) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load bookings.');
      setAllBookings(Array.isArray(data.bookings) ? data.bookings.filter(booking => booking && typeof booking === 'object') : []);
      setBookingsError('');
    } catch (e) {
      const message = e.message || 'Could not load bookings.';
      setBookingsError(message);
      console.warn('Could not load bookings:', e);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [currentUser, isAdmin]);

  // Cash-only reconciliation across bookings, grocery orders and driver jobs.
  const fetchCashPayments = useCallback(async () => {
    if (!currentUser?.token || !isAdmin) return;
    setCashPaymentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/cash-payments`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load cash payment records.');
      setCashPayments({
        records: Array.isArray(data.records) ? data.records.filter(record => record && typeof record === 'object') : [],
        summary: data.summary && typeof data.summary === 'object' ? data.summary : {}
      });
      setCashPaymentsError('');
    } catch (error) {
      setCashPaymentsError(error.message || 'Could not load cash payment records.');
    } finally {
      setCashPaymentsLoading(false);
    }
  }, [currentUser?.token, isAdmin]);

  // 2. Fetch Dispatch Snapshot
  const fetchDispatchSnapshot = useCallback(async () => {
    if (!currentUser?.token || !isAdmin) return;
    setDispatchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/driver-dispatch`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load dispatch information.');
      setDispatchSnapshot({
        drivers: Array.isArray(data.drivers) ? data.drivers.filter(driver => driver && typeof driver === 'object') : [],
        activeJobs: Array.isArray(data.activeJobs) ? data.activeJobs.filter(job => job && typeof job === 'object') : [],
        summary: data.summary && typeof data.summary === 'object' ? data.summary : {}
      });
      setDispatchError('');
    } catch (e) {
      const message = e.message || 'Could not load dispatch information.';
      setDispatchError(message);
      console.warn('Could not load dispatch information:', e);
    } finally {
      setDispatchLoading(false);
    }
  }, [currentUser, isAdmin]);

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchAdminUsers?.();
      fetchBookings();
      fetchDispatchSnapshot();
      fetchCashPayments();
    }
  }, [isAdmin, fetchAdminUsers, fetchBookings, fetchDispatchSnapshot, fetchCashPayments]);

  // Real-time SSE Event Subscription
  useEffect(() => {
    if (!isAdmin || !currentUser?.token) return undefined;

    const refreshData = () => {
      fetchAdminUsers?.();
      fetchBookings();
      fetchDispatchSnapshot();
      fetchCashPayments();
    };

    return subscribeToAppEvents(currentUser.token, {
      'driver:application_created': (data) => {
        refreshData();
        setAuditEvents(prev => [{
          id: Date.now(),
          type: 'kyc',
          title: 'New Driver Application Received',
          description: `Applicant: ${data?.driverName || 'Driver'}`,
          createdAt: new Date().toISOString(),
          color: 'accent',
          targetTab: 'applications'
        }, ...prev]);
      },
      'user:role_application_created': (data) => {
        refreshData();
        setAuditEvents(prev => [{
          id: Date.now(),
          type: 'kyc',
          title: `New ${data?.role === 'provider' ? 'Provider' : 'Role'} Application Received`,
          description: `Applicant ID: ${data?.userId || 'User'}`,
          createdAt: new Date().toISOString(),
          color: 'accent',
          targetTab: 'applications'
        }, ...prev]);
      },
      'user:registered': () => refreshData(),
      'user:status_changed': () => refreshData(),
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
          createdAt: new Date().toISOString(),
          color: 'brand',
          targetTab: 'overview'
        }, ...prev]);
      },
      'booking:cash_collected': refreshData,
      'grocery:order_updated': refreshData,
      'driver:job_updated': refreshData,
      'dispute:raised': (data) => {
        fetchBookings();
        setAuditEvents(prev => [{
          id: Date.now(),
          type: 'dispute',
          title: 'Customer Workmanship Dispute Raised',
          description: `A dispute was raised for booking #${data?.bookingId || ''}. Verify its payment status before any financial action.`,
          createdAt: new Date().toISOString(),
          color: 'danger',
          targetTab: 'disputes'
        }, ...prev]);
      }
    });
  }, [isAdmin, currentUser?.token, fetchAdminUsers, fetchBookings, fetchDispatchSnapshot, fetchCashPayments]);

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
    if (!currentUser?.token || bookingId === null || bookingId === undefined || !['split_50_50', 'refund_customer', 'release_provider'].includes(action) || arbitratingId !== null) return false;
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
      return true;
    } catch (e) {
      onNotice?.(`Error: ${e.message || 'Failed to arbitrate dispute.'}`);
      return false;
    } finally {
      setArbitratingId(null);
    }
  }

  // Action: Prepare manual bank-transfer instructions
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
      if (!res.ok) throw new Error(data.error || 'Could not prepare bank transfer instructions.');

      setPayoutResult(data);
      onNotice?.(`Transfer instructions prepared (not paid). Total to transfer: LKR ${data.totalPayoutAmount?.toLocaleString() || 0}`);
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
    { id: 'disputes', label: 'Disputes', icon: Scale, count: disputedCount, badgeType: 'danger' },
    { id: 'payouts', label: 'Manual Payouts', icon: Banknote },
    { id: 'cash_payments', label: 'Cash Payments', icon: Banknote, count: cashPayments.summary?.pendingCount || 0, badgeType: 'warning' },
    { id: 'dispatch', label: 'Driver Dispatch', icon: Radio, count: dispatchSnapshot.summary?.onlineDrivers ?? dispatchSnapshot.drivers?.length ?? 0, badgeType: 'brand' },
    { id: 'notifications', label: 'System Audit Log', icon: Bell }
  ];

  const activeNavItem = navItems.find(item => item.id === activeTab) || navItems[0];

  return (
    <div className="admin-layout">
      {/* Mobile Sidebar Overlay Backdrop */}
      <button
        type="button"
        className={`admin-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="Close admin navigation"
        tabIndex={sidebarOpen ? 0 : -1}
        aria-hidden={!sidebarOpen}
      />

      {/* 1. Sidebar Navigation */}
      <aside id="admin-sidebar" className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Admin workspace navigation">
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
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
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
                aria-current={isActive ? 'page' : undefined}
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
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb */}
            <div className="admin-breadcrumbs">
              <span>Admin</span>
              <ChevronRight size={13} />
              <h1 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', display: 'inline', color: 'inherit' }}>
                {activeNavItem.label}
              </h1>
            </div>
          </div>

          {/* Topbar Actions */}
          <div className="admin-topbar-actions">
            {/* Global Search Bar */}
            <div className="admin-search-wrapper">
              <Search size={15} className="admin-search-icon" />
              <input
                type="search"
                className="admin-search-input"
                aria-label="Search platform users"
                placeholder="Search platform users..."
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
                fetchCashPayments();
              }}
              loading={isLoadingUsers || isLoadingBookings || dispatchLoading || cashPaymentsLoading}
              title="Refresh Platform Data"
            >
              <RefreshCw size={13} />
            </Button>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => { setActiveTab('notifications'); setSidebarOpen(false); }}
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
          {(activeTab === 'overview' || activeTab === 'disputes' || activeTab === 'payouts' || activeTab === 'cash_payments') && bookingsError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 14px', marginBottom: 14, border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#991b1b' }}>
              <span>Booking data could not be refreshed: {bookingsError}. Previously loaded records may be shown.</span>
              <Button size="sm" variant="outline" onClick={fetchBookings}>Retry</Button>
            </div>
          )}
          {activeTab === 'cash_payments' && cashPaymentsError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 14px', marginBottom: 14, border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#991b1b' }}>
              <span>Cash records could not be refreshed: {cashPaymentsError}</span>
              <Button size="sm" variant="outline" onClick={fetchCashPayments}>Retry</Button>
            </div>
          )}
          {(activeTab === 'overview' || activeTab === 'dispatch') && dispatchError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 14px', marginBottom: 14, border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#991b1b' }}>
              <span>Dispatch data could not be refreshed: {dispatchError}. Previously loaded records may be shown.</span>
              <Button size="sm" variant="outline" onClick={fetchDispatchSnapshot}>Retry</Button>
            </div>
          )}
          {activeTab === 'overview' && (
            <AdminOverview
              adminUsers={adminUsers}
              bookings={allBookings}
              dispatchSnapshot={dispatchSnapshot}
              cashSummary={cashPayments.summary}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsers
              adminUsers={adminUsers}
              isLoadingUsers={isLoadingUsers}
              initialSearchQuery={globalSearch}
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

          {activeTab === 'cash_payments' && (
            <AdminCashPayments
              records={cashPayments.records}
              summary={cashPayments.summary}
              isLoading={cashPaymentsLoading}
              error={cashPaymentsError}
              onRefresh={fetchCashPayments}
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
