import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  StatusPill,
  SegmentedControl,
  ConfirmDialog,
  EmptyState
} from '../../design-system';
import AdminKycModal from './AdminKycModal';
import AdminResetPasswordModal from './AdminResetPasswordModal';
import AdminDeleteUserModal from './AdminDeleteUserModal';

export default function AdminUsers({
  adminUsers = [],
  isLoadingUsers = false,
  onRefresh,
  onUpdateStatus,
  onDeleteUser,
  onResetPassword
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [kycUser, setKycUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [suspendConfirmUser, setSuspendConfirmUser] = useState(null);

  // Filter and sort logic
  const filteredUsers = useMemo(() => {
    let result = adminUsers.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.location?.toLowerCase().includes(q) ||
        String(u.id).includes(q);

      const matchRole = roleFilter === 'all' || u.accountType === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchQuery && matchRole && matchStatus;
    });

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [adminUsers, searchQuery, roleFilter, statusFilter, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const roleOptions = [
    { value: 'all', label: `All (${adminUsers.length})` },
    { value: 'customer', label: 'Customers' },
    { value: 'provider', label: 'Providers' },
    { value: 'driver', label: 'Drivers' },
    { value: 'admin', label: 'Admins' }
  ];

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Filter, Search & Quick Action Card */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 420 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, phone, email, or area..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                border: '1px solid var(--color-border, #cbd5e1)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Quick Stats Pill & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-neutral-500, #64748b)' }}>
              Showing <b>{filteredUsers.length}</b> of <b>{adminUsers.length}</b> accounts
            </span>
            <Button variant="ghost" size="sm" onClick={onRefresh} loading={isLoadingUsers}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ maxWidth: 500, flex: 1 }}>
            <SegmentedControl
              options={roleOptions}
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status Quick Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'ALL STATUS' },
              { id: 'active', label: 'ACTIVE' },
              { id: 'pending', label: 'PENDING' },
              { id: 'rejected', label: 'SUSPENDED' }
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setStatusFilter(st.id);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: statusFilter === st.id ? '1.5px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)',
                  background: statusFilter === st.id ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #ffffff)',
                  color: statusFilter === st.id ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-600, #475569)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Registered Users DataTable */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th
                  className="sortable"
                  onClick={() => handleSort('fullName')}
                  style={{ width: '30%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Participant</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('accountType')}
                  style={{ width: '15%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Role</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ width: '25%' }}>Phone & Operating Area</th>
                <th
                  className="sortable"
                  onClick={() => handleSort('status')}
                  style={{ width: '12%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Status</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ textAlign: 'right', width: '18%' }}>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <EmptyState
                      icon={Users}
                      title="No accounts found"
                      description="No registered platform accounts match your selected filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => {
                  const isPending = user.status === 'pending';
                  const isRejected = user.status === 'rejected';

                  return (
                    <tr key={user.id}>
                      {/* Participant Profile */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: user.accountType === 'admin' ? '#fef3c7' : user.accountType === 'provider' ? 'var(--color-brand-100, #d4ebd8)' : user.accountType === 'driver' ? '#eff6ff' : '#f1f5f9',
                            color: user.accountType === 'admin' ? '#b45309' : user.accountType === 'provider' ? 'var(--color-brand-800, #154636)' : user.accountType === 'driver' ? '#1d4ed8' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            flexShrink: 0
                          }}>
                            {user.fullName?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <b style={{ color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', display: 'block' }}>
                              {user.fullName}
                            </b>
                            <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-400, #94a3b8)' }}>
                              #{user.id} · {user.email || 'No email registered'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Account Role */}
                      <td>
                        <Badge
                          variant={user.accountType === 'admin' ? 'warning' : user.accountType === 'provider' ? 'brand' : user.accountType === 'driver' ? 'accent' : 'neutral'}
                          dot={false}
                        >
                          {user.accountType?.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Phone & Location */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-text, #1e293b)' }}>
                          <Phone size={13} color="#64748b" />
                          <span>{user.phone}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 2 }}>
                          <MapPin size={12} color="#94a3b8" />
                          <span>{user.location || 'Colombo, Sri Lanka'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusPill status={user.status || 'active'} />
                      </td>

                      {/* Management Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-table-actions">
                          {/* KYC Inspector for Providers & Drivers */}
                          {(user.accountType === 'provider' || user.accountType === 'driver') && (
                            <button
                              type="button"
                              onClick={() => setKycUser(user)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid var(--color-brand-200, #b7decb)',
                                background: 'var(--color-brand-50, #edf7f2)',
                                color: 'var(--color-brand-800, #154636)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Inspect KYC Credentials"
                              aria-label={`Inspect KYC for ${user.fullName}`}
                            >
                              <ShieldCheck size={13} /> KYC
                            </button>
                          )}

                          {/* Quick Approve if Pending or Rejected */}
                          {(isPending || isRejected) && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(user.id, 'active', user.fullName)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid #86efac',
                                background: '#f0fdf4',
                                color: '#166534',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Approve User"
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                          )}

                          {/* Quick Suspend if Active */}
                          {user.status === 'active' && user.accountType !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => setSuspendConfirmUser(user)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#b91c1c',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Suspend Account"
                            >
                              <XCircle size={13} /> Suspend
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => setResetUser(user)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: 'var(--radius-sm, 6px)',
                              border: '1px solid var(--color-border, #cbd5e1)',
                              background: '#ffffff',
                              color: 'var(--color-neutral-700, #334155)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Reset User Password"
                          >
                            <Key size={13} /> Key
                          </button>

                          {/* Delete Account */}
                          {user.accountType !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => setDeleteUser(user)}
                              style={{
                                padding: '5px 8px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid #fecaca',
                                background: '#ffffff',
                                color: '#dc2626',
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                              title="Permanently Delete Account"
                              aria-label={`Delete ${user.fullName}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Pagination Bar */}
        {filteredUsers.length > 0 && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--color-border-subtle, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: '0.84rem'
          }}>
            <span style={{ color: 'var(--color-neutral-600, #475569)' }}>
              Showing <b>{(currentPage - 1) * pageSize + 1}</b> to <b>{Math.min(currentPage * pageSize, filteredUsers.length)}</b> of <b>{filteredUsers.length}</b> participants
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={14} /> Previous
              </Button>

              <span style={{ padding: '0 8px', fontWeight: 700, color: 'var(--color-brand-900, #0c2d23)' }}>
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* KYC Inspector Modal */}
      <AdminKycModal
        user={kycUser}
        isOpen={Boolean(kycUser)}
        onClose={() => setKycUser(null)}
        onUpdateStatus={onUpdateStatus}
      />

      {/* Reset Password Modal */}
      <AdminResetPasswordModal
        user={resetUser}
        isOpen={Boolean(resetUser)}
        onClose={() => setResetUser(null)}
        onSubmit={onResetPassword}
      />

      {/* Typed Confirmation Delete Account Modal */}
      <AdminDeleteUserModal
        user={deleteUser}
        isOpen={Boolean(deleteUser)}
        onClose={() => setDeleteUser(null)}
        onConfirm={(id, name) => {
          onDeleteUser(id, name);
          setDeleteUser(null);
        }}
      />

      {/* Suspend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(suspendConfirmUser)}
        onClose={() => setSuspendConfirmUser(null)}
        onConfirm={() => {
          if (suspendConfirmUser) {
            onUpdateStatus(suspendConfirmUser.id, 'rejected', suspendConfirmUser.fullName);
            setSuspendConfirmUser(null);
          }
        }}
        title="Suspend Platform Account?"
        message={`Are you sure you want to suspend access for "${suspendConfirmUser?.fullName}"? Their account will be deactivated immediately.`}
        confirmLabel="Suspend Account"
        isDanger={true}
      />
    </div>
  );
}
