import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  LayoutDashboard,
  User,
  Briefcase,
  Shield,
  Search,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Check,
  Ban,
  Trash2,
  ShieldCheck,
  FileText,
  X,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

export default function AdminWorkspace({
  adminUsers,
  setAdminUsers,
  services,
  setServices,
  isLoadingUsers,
  fetchAdminUsers,
  onNotice
}) {
  const { currentUser } = useAuth();

  const [adminTab, setAdminTab] = useState('users'); // 'users' | 'categories' | 'disputes' | 'payouts'
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'rejected'
  const [newCategory, setNewCategory] = useState('');
  const [inspectedKycUser, setInspectedKycUser] = useState(null);

  const [allBookings, setAllBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [arbitratingBookingId, setArbitratingBookingId] = useState(null);
  const [payoutResult, setPayoutResult] = useState(null);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    if (currentUser?.token && currentUser.accountType === 'admin') {
      fetchAdminBookings();
    }
  }, [currentUser?.token]);

  async function fetchAdminBookings() {
    if (!currentUser?.token) return;
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
      console.warn('Could not fetch admin bookings:', e);
    } finally {
      setIsLoadingBookings(false);
    }
  }

  async function handleArbitrate(bookingId, action) {
    if (!currentUser?.token) return;
    setArbitratingBookingId(bookingId);
    try {
      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/arbitrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ action, notes: `Arbitrated by Admin ${currentUser.fullName}` })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to arbitrate dispute.');
      }
      if (onNotice) onNotice(`⚖️ Dispute Arbitrated: ${action.replace('_', ' ').toUpperCase()}`);
      fetchAdminBookings();
    } catch (e) {
      if (onNotice) onNotice(`❌ Error: ${e.message}`);
    } finally {
      setArbitratingBookingId(null);
    }
  }

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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payout settlement failed.');
      }
      setPayoutResult(data);
      if (onNotice) onNotice(`🏦 CEFT Batch Generated! Total: LKR ${data.totalPayoutAmount?.toLocaleString() || 0}`);
    } catch (e) {
      if (onNotice) onNotice(`❌ Error: ${e.message}`);
    } finally {
      setIsSettling(false);
    }
  }

  const disputedBookings = allBookings.filter(b => b.status === 'disputed' || b.paymentStatus === 'disputed_frozen');

  const filteredAdminUsers = useMemo(() => {
    return adminUsers.filter(u => {
      const matchesSearch =
        (u.fullName + ' ' + (u.email || '') + ' ' + (u.phone || '') + ' ' + (u.location || '') + ' ' + u.accountType)
          .toLowerCase()
          .includes(userSearchQuery.toLowerCase());
      const matchesRole = userRoleFilter === 'all' || u.accountType === userRoleFilter;
      const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [adminUsers, userSearchQuery, userRoleFilter, userStatusFilter]);

  const customerCount = adminUsers.filter(u => u.accountType === 'customer').length;
  const providerCount = adminUsers.filter(u => u.accountType === 'provider').length;
  const adminCount = adminUsers.filter(u => u.accountType === 'admin').length;
  const pendingCount = adminUsers.filter(u => u.status === 'pending').length;
  const activeCount = adminUsers.filter(u => u.status === 'active').length;
  const rejectedCount = adminUsers.filter(u => u.status === 'rejected').length;

  async function handleStatusChange(userId, newStatus, userName) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update user status.');
      }

      const updated = adminUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u);
      setAdminUsers(updated);
      try {
        localStorage.setItem('ary_persisted_users', JSON.stringify(updated));
      } catch {}

      if (onNotice) {
        if (newStatus === 'active') {
          onNotice(`✅ Approved! "${userName}" is now active and can log in.`);
        } else if (newStatus === 'rejected') {
          onNotice(`🚫 Rejected! "${userName}" has been moved to the Block List.`);
        } else {
          onNotice(`⏳ "${userName}" status set to pending.`);
        }
      }
    } catch (e) {
      console.warn('Status update API error:', e);
      if (onNotice) onNotice(`❌ Error: ${e.message}`);
    }
  }

  async function handleDeleteUser(id, name) {
    if (!window.confirm(`Are you sure you want to remove the account for "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {})
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account.');
      }
      const updated = adminUsers.filter(u => u.id !== id);
      setAdminUsers(updated);
      try {
        localStorage.setItem('ary_persisted_users', JSON.stringify(updated));
      } catch {}
      if (onNotice) onNotice(`Account for ${name} has been removed.`);
    } catch (e) {
      console.warn('Delete error:', e);
      if (onNotice) onNotice(`❌ Error: ${e.message}`);
    }
  }

  function addCategory(e) {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (services.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      if (onNotice) onNotice('That category already exists.');
      return;
    }
    setServices(prev => [...prev, { id: Date.now(), name, description: 'New service category', color: 'lilac' }]);
    setNewCategory('');
    if (onNotice) onNotice('Category added successfully.');
  }

  return (
    <main className="dashboard admin-dashboard">
      <div className="dashboard-heading">
        <span className="eyebrow">
          <span className="live-dot" /> PLATFORM SUPER ADMIN
        </span>
        <h1>Super Admin <em>workspace.</em></h1>
        <p>
          {currentUser && currentUser.email === 'arikarran14@gmail.com'
            ? `Welcome Arikarran! Here are the full system metrics and all registered accounts across ARY Services.`
            : 'Platform supervision, registered user account details, and service management.'}
        </p>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          className={`admin-nav-tab ${adminTab === 'users' ? 'active' : ''}`}
          onClick={() => setAdminTab('users')}
        >
          <Users size={16} /> Registered Accounts ({adminUsers.length})
        </button>
        <button
          className={`admin-nav-tab ${adminTab === 'categories' ? 'active' : ''}`}
          onClick={() => setAdminTab('categories')}
        >
          <LayoutDashboard size={16} /> Service Categories ({services.length})
        </button>
        <button
          className={`admin-nav-tab ${adminTab === 'disputes' ? 'active' : ''}`}
          onClick={() => {
            setAdminTab('disputes');
            fetchAdminBookings();
          }}
        >
          <AlertTriangle size={16} color={disputedBookings.length > 0 ? '#ef4444' : undefined} /> Dispute Arbitration ({disputedBookings.length})
        </button>
        <button
          className={`admin-nav-tab ${adminTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setAdminTab('payouts')}
        >
          <Banknote size={16} /> CEFT Banking Payouts
        </button>
      </div>

      {adminTab === 'users' && (
        <div className="admin-users-view">
          {/* Stat Counters */}
          <div className="admin-stats-grid">
            <div
              className={`stat-card total ${userRoleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setUserRoleFilter('all')}
            >
              <div className="stat-icon-wrap"><Users size={20} /></div>
              <div className="stat-info">
                <span className="stat-count">{adminUsers.length}</span>
                <span className="stat-label">Total Accounts</span>
              </div>
            </div>

            <div
              className={`stat-card customer ${userRoleFilter === 'customer' ? 'active' : ''}`}
              onClick={() => setUserRoleFilter('customer')}
            >
              <div className="stat-icon-wrap"><User size={20} /></div>
              <div className="stat-info">
                <span className="stat-count">{customerCount}</span>
                <span className="stat-label">Customers</span>
              </div>
            </div>

            <div
              className={`stat-card provider ${userRoleFilter === 'provider' ? 'active' : ''}`}
              onClick={() => setUserRoleFilter('provider')}
            >
              <div className="stat-icon-wrap"><Briefcase size={20} /></div>
              <div className="stat-info">
                <span className="stat-count">{providerCount}</span>
                <span className="stat-label">Providers</span>
              </div>
            </div>

            <div
              className={`stat-card admin ${userRoleFilter === 'admin' ? 'active' : ''}`}
              onClick={() => setUserRoleFilter('admin')}
            >
              <div className="stat-icon-wrap"><Shield size={20} /></div>
              <div className="stat-info">
                <span className="stat-count">{adminCount}</span>
                <span className="stat-label">Admins</span>
              </div>
            </div>
          </div>

          {/* Status Filter Row */}
          <div className="status-filter-pills">
            <button
              className={`status-pill-tab ${userStatusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setUserStatusFilter('all')}
            >
              All Accounts ({adminUsers.length})
            </button>
            <button
              className={`status-pill-tab pending ${userStatusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setUserStatusFilter('pending')}
            >
              <span className="dot yellow" /> Pending Approval ({pendingCount})
            </button>
            <button
              className={`status-pill-tab active ${userStatusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setUserStatusFilter('active')}
            >
              <span className="dot green" /> Active ({activeCount})
            </button>
            <button
              className={`status-pill-tab blocked ${userStatusFilter === 'rejected' ? 'active' : ''}`}
              onClick={() => setUserStatusFilter('rejected')}
            >
              <span className="dot red" /> Block List ({rejectedCount})
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="admin-users-toolbar">
            <div className="admin-search-box">
              <Search size={16} />
              <input
                type="text"
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                placeholder="Search accounts by name, email, phone, location..."
              />
              {userSearchQuery && (
                <button className="clear-search-btn" onClick={() => setUserSearchQuery('')}>×</button>
              )}
            </div>

            <div className="role-filter-group">
              {['all', 'customer', 'provider', 'admin'].map(r => (
                <button
                  key={r}
                  className={`filter-btn ${userRoleFilter === r ? 'active' : ''}`}
                  onClick={() => setUserRoleFilter(r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <button
              className="refresh-users-btn"
              onClick={fetchAdminUsers}
              disabled={isLoadingUsers}
              title="Reload Accounts List"
            >
              <RefreshCw size={14} className={isLoadingUsers ? 'spin' : ''} />
              <span>{isLoadingUsers ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Users Table / List */}
          <div className="admin-users-table-container">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Location / Area</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdminUsers.map(user => {
                  const isSuper = user.email === 'arikarran14@gmail.com';
                  return (
                    <tr key={user.id} className={isSuper ? 'super-admin-row' : ''}>
                      <td>
                        <div className="user-cell">
                          <div className={`user-avatar-circle ${user.accountType}`}>
                            {user.fullName ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                          </div>
                          <div className="user-details">
                            <b className="user-name">
                              {user.fullName}
                              {isSuper && <span className="super-tag">SUPER ADMIN</span>}
                            </b>
                            <small className="user-id-code">ID: {user.id ? user.id.slice(0, 14) : '...'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`account-badge ${user.accountType}`}>
                          {user.accountType === 'admin' ? '🛡️ Admin' : user.accountType === 'provider' ? '🛠️ Provider' : '👤 Customer'}
                        </span>
                      </td>
                      <td>
                        <div className="contact-cell">
                          {user.email && (
                            <span className="contact-line">
                              <Mail size={12} /> {user.email}
                            </span>
                          )}
                          {user.phone && (
                            <span className="contact-line phone">
                              <Phone size={12} /> {user.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="location-cell">
                          <MapPin size={13} />
                          {user.location || 'Not specified'}
                        </span>
                      </td>
                      <td>
                        {user.status === 'pending' && (
                          <span className="status-badge pending">
                            <span className="status-dot pending" /> Pending
                          </span>
                        )}
                        {user.status === 'active' && (
                          <span className="status-badge active">
                            <span className="status-dot active" /> Active
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="status-badge rejected">
                            <span className="status-dot rejected" /> Blocked
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="date-cell">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          {user.accountType === 'provider' && (
                            <button
                              type="button"
                              className="action-btn"
                              style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setInspectedKycUser(user)}
                              title="Inspect Provider KYC Documents"
                            >
                              <FileText size={12} /> KYC
                            </button>
                          )}

                          {user.status === 'pending' && (
                            <>
                              <button
                                className="action-btn approve"
                                onClick={() => handleStatusChange(user.id, 'active', user.fullName)}
                                title="Approve & Activate Provider Account"
                              >
                                <Check size={13} /> Approve
                              </button>
                              <button
                                className="action-btn reject"
                                onClick={() => handleStatusChange(user.id, 'rejected', user.fullName)}
                                title="Reject & Move to Block List"
                              >
                                <Ban size={13} /> Reject
                              </button>
                            </>
                          )}

                          {user.status === 'rejected' && (
                            <button
                              className="action-btn unblock"
                              onClick={() => handleStatusChange(user.id, 'active', user.fullName)}
                              title="Unblock and activate provider account"
                            >
                              <Check size={13} /> Unblock
                            </button>
                          )}

                          {user.status === 'active' && user.accountType === 'provider' && !isSuper && (
                            <button
                              className="action-btn block"
                              onClick={() => handleStatusChange(user.id, 'rejected', user.fullName)}
                              title="Move to Block List"
                            >
                              <Ban size={13} /> Block
                            </button>
                          )}

                          {!isSuper ? (
                            <button
                              className="delete-user-btn"
                              onClick={() => handleDeleteUser(user.id, user.fullName)}
                              title="Delete this account"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span className="protected-tag" title="Super Admin Account Protected">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredAdminUsers.length === 0 && (
              <div className="admin-empty-state">
                <Users size={32} />
                <p>No accounts match your search filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {adminTab === 'categories' && (
        <div className="admin-layout">
          <section className="admin-panel">
            <div className="panel-title">
              <LayoutDashboard />
              <h2>Service categories</h2>
            </div>
            <form className="add-category" onSubmit={addCategory}>
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="e.g. TV Repair"
                aria-label="New category name"
              />
              <button type="submit">Add category</button>
            </form>
            <p className="helper">Add custom categories dynamically.</p>
            <ul className="category-list">
              {services.map(s => (
                <li key={s.id}>
                  <span>{s.name}</span>
                  <span className="status-pill muted">Active Category</span>
                </li>
              ))}
            </ul>
          </section>
          <aside className="admin-side">
            <span className="side-icon"><ShieldCheck size={24} /></span>
            <h3>Review before publishing</h3>
            <p>Provider identity, business details, and provider-specific service applications should be approved before public listing.</p>
          </aside>
        </div>
      )}

      {/* Tab 3: Dispute Arbitration Queue */}
      {adminTab === 'disputes' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#ef4444" />
                Customer Dispute & Arbitration Queue
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Review disputed service bookings, inspect customer claims, and arbitrate binding escrow settlement.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAdminBookings}
              disabled={isLoadingBookings}
              className="refresh-users-btn"
            >
              <RefreshCw size={14} className={isLoadingBookings ? 'spin' : ''} />
              <span>Refresh Disputes</span>
            </button>
          </div>

          {isLoadingBookings ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
              Loading disputed bookings...
            </div>
          ) : disputedBookings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {disputedBookings.map(b => (
                <div key={b.id} style={{
                  border: '1.5px solid #fca5a5',
                  background: '#fef2f2',
                  borderRadius: 12,
                  padding: 18
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <b style={{ fontSize: '1rem', color: '#991b1b' }}>Dispute on #{b.id} ({b.categoryName})</b>
                      <span style={{ fontSize: '0.78rem', color: '#7f1d1d', marginLeft: 8 }}>
                        📅 Disputed on: {b.disputedAt ? new Date(b.disputedAt).toLocaleString() : 'Recent'}
                      </span>
                    </div>
                    <span style={{
                      background: '#ef4444',
                      color: '#fff',
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      Escrow Frozen: LKR {(b.baseAmount || 1500).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #fecaca' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: '0.82rem', marginBottom: 8 }}>
                      <div><b>Customer:</b> {b.customerName} ({b.customerPhone})</div>
                      <div><b>Assigned Provider:</b> {b.providerName} ({b.providerPhone || 'N/A'})</div>
                      <div><b>Job Address:</b> {b.serviceAddress}</div>
                      <div><b>Original Date:</b> {b.bookingDate} ({b.bookingTime})</div>
                    </div>
                    <div style={{ borderTop: '1px solid #fee2e2', paddingTop: 8 }}>
                      <b style={{ color: '#991b1b', fontSize: '0.85rem' }}>Client Dispute Reason:</b>
                      <p style={{ margin: '4px 0 0', color: '#7f1d1d', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        "{b.disputeReason || 'Unsatisfactory workmanship reported under ARY Guarantee'}"
                      </p>
                      {b.disputeEvidence && (
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                          Evidence: {b.disputeEvidence}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Arbitration Actions */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={arbitratingBookingId === b.id}
                      onClick={() => handleArbitrate(b.id, 'refund_customer')}
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ↩️ 100% Refund to Customer
                    </button>
                    <button
                      type="button"
                      disabled={arbitratingBookingId === b.id}
                      onClick={() => handleArbitrate(b.id, 'split_50_50')}
                      style={{
                        background: '#d97706',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ⚖️ 50/50 Mediated Split
                    </button>
                    <button
                      type="button"
                      disabled={arbitratingBookingId === b.id}
                      onClick={() => handleArbitrate(b.id, 'release_provider')}
                      style={{
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Release to Provider
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 10px', display: 'block' }} />
              <b style={{ color: '#166534', fontSize: '1rem' }}>No Active Disputes!</b>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
                All contractor bookings are currently in good standing under the 14-Day ARY Workmanship Guarantee.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: CEFT Banking Payouts */}
      {adminTab === 'payouts' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Banknote size={20} color="#059669" />
                Automated CEFT Banking Payout Engine
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Batch disbursement generator for Commercial Bank of Ceylon & LankaPay CEFT automated bank transfers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunPayoutSettlement}
              disabled={isSettling}
              style={{
                background: '#047857',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)'
              }}
            >
              <Zap size={16} />
              {isSettling ? 'Generating CEFT Batch...' : 'Execute CEFT Payout Run (Min: LKR 1,000)'}
            </button>
          </div>

          {payoutResult && (
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: 12,
              padding: 18,
              marginTop: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <CheckCircle2 size={22} color="#16a34a" />
                <div>
                  <b style={{ color: '#166534', fontSize: '1rem' }}>CEFT Bank Settlement Manifest Generated</b>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803d' }}>
                    Batch Reference: <code>{payoutResult.batchId}</code>
                  </p>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '0.85rem' }}>
                  <div><b>Total Disbursed:</b> <span style={{ color: '#166534', fontWeight: 800 }}>LKR {payoutResult.totalPayoutAmount?.toLocaleString()}</span></div>
                  <div><b>Providers Settled:</b> {payoutResult.providerCount} contractors</div>
                  <div><b>Bank Protocol:</b> LankaPay CEFT Direct</div>
                  <div><b>Ledger Status:</b> Balanced (Debits === Credits)</div>
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                  <b>Cryptographic SHA256 Checksum:</b> <code style={{ wordBreak: 'break-all' }}>{payoutResult.checksum}</code>
                </div>
              </div>

              {payoutResult.disbursements && payoutResult.disbursements.length > 0 && (
                <table className="admin-users-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Phone</th>
                      <th>Settlement Bank</th>
                      <th>Account / CEFT Ref</th>
                      <th>Disbursed Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutResult.disbursements.map(d => (
                      <tr key={d.providerId}>
                        <td><b>{d.fullName}</b></td>
                        <td>{d.phone}</td>
                        <td>{d.bankName}</td>
                        <td><code>{d.accountNumber}</code></td>
                        <td><b style={{ color: '#166534' }}>LKR {d.amount?.toLocaleString()}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Super Admin KYC Document Inspector Modal */}
      {inspectedKycUser && (
        <div className="modal-backdrop" onClick={() => setInspectedKycUser(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h3>Provider KYC & Document Verification</h3>
                <p>Applicant: <b>{inspectedKycUser.fullName}</b> ({inspectedKycUser.categoryName || 'Service Specialist'})</p>
              </div>
              <button className="modal-close" onClick={() => setInspectedKycUser(null)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem' }}>
                <div><b>Mobile:</b> {inspectedKycUser.phone}</div>
                <div><b>Email:</b> {inspectedKycUser.email || 'N/A'}</div>
                <div><b>Service Area:</b> {inspectedKycUser.location}</div>
                <div><b>Base Rate:</b> {inspectedKycUser.baseCharge || 'LKR 1,500'}</div>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', color: '#475569' }}>Sri Lanka NIC Number:</span>
                <b style={{ fontSize: '0.9rem', color: '#0f172a', letterSpacing: 0.5, background: '#e2e8f0', padding: '2px 8px', borderRadius: 4 }}>
                  {inspectedKycUser.nicNumber || 'Pending Submission'}
                </b>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  marginLeft: 'auto',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: inspectedKycUser.status === 'active' ? '#ecfdf5' : '#fef3c7',
                  color: inspectedKycUser.status === 'active' ? '#065f46' : '#92400e'
                }}>
                  {inspectedKycUser.status === 'active' ? '✓ Verified Partner' : '⏳ Pending Approval'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              {/* NIC Document Box */}
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <b style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: 6 }}>NIC Document (Front/Back)</b>
                {inspectedKycUser.nicDocument ? (
                  <img
                    src={inspectedKycUser.nicDocument}
                    alt="NIC Preview"
                    style={{ maxHeight: 110, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                  />
                ) : (
                  <div style={{ padding: '24px 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    📄 Standard SL NIC format verified ({inspectedKycUser.nicNumber || 'Pending'})
                  </div>
                )}
              </div>

              {/* Trade Certificate Box */}
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <b style={{ fontSize: '0.8rem', color: '#334155', display: 'block', marginBottom: 6 }}>Trade Certificate / License</b>
                {inspectedKycUser.tradeCertificate ? (
                  <img
                    src={inspectedKycUser.tradeCertificate}
                    alt="Certificate Preview"
                    style={{ maxHeight: 110, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                  />
                ) : (
                  <div style={{ padding: '24px 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    📜 Verified NVQ / Industry Experience (3+ Yrs)
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {inspectedKycUser.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="action-btn reject"
                    onClick={() => {
                      handleStatusChange(inspectedKycUser.id, 'rejected', inspectedKycUser.fullName);
                      setInspectedKycUser(null);
                    }}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <Ban size={14} /> Reject Application
                  </button>
                  <button
                    type="button"
                    className="action-btn approve"
                    onClick={() => {
                      handleStatusChange(inspectedKycUser.id, 'active', inspectedKycUser.fullName);
                      setInspectedKycUser(null);
                    }}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <Check size={14} /> Approve & Verify Partner
                  </button>
                </>
              )}
              {inspectedKycUser.status !== 'pending' && (
                <button
                  type="button"
                  onClick={() => setInspectedKycUser(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Close Inspector
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
