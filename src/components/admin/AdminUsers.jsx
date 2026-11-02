import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Trash2,
  ShieldCheck,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { Card, Badge, Button, StatusPill, DataTable, ConfirmDialog, SegmentedControl } from '../../design-system';
import AdminKycModal from './AdminKycModal';
import AdminResetPasswordModal from './AdminResetPasswordModal';

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

  // Modals state
  const [kycUser, setKycUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  const filteredUsers = useMemo(() => {
    return adminUsers.filter(u => {
      const matchQuery =
        !searchQuery ||
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole = roleFilter === 'all' || u.accountType === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchQuery && matchRole && matchStatus;
    });
  }, [adminUsers, searchQuery, roleFilter, statusFilter]);

  const roleOptions = [
    { value: 'all', label: `All (${adminUsers.length})` },
    { value: 'customer', label: 'Customers' },
    { value: 'provider', label: 'Providers' },
    { value: 'driver', label: 'Drivers' },
    { value: 'admin', label: 'Admins' }
  ];

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Filter & Search Controls */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, phone, email, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Refresh Button */}
          <Button variant="ghost" size="sm" onClick={onRefresh} loading={isLoadingUsers}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>

        {/* Filters Row */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ maxWidth: 500, flex: 1 }}>
            <SegmentedControl
              options={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
            />
          </div>

          {/* Status Quick Pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'pending', 'active', 'rejected'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: statusFilter === st ? '1.5px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)',
                  background: statusFilter === st ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #fff)',
                  color: statusFilter === st ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-600, #475569)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Users DataTable */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border-subtle, #f1f5f9)', background: 'var(--color-neutral-50, #f8fafc)', textAlign: 'left', color: 'var(--color-neutral-600, #475569)' }}>
                <th style={{ padding: '12px 16px' }}>Participant</th>
                <th style={{ padding: '12px 14px' }}>Role</th>
                <th style={{ padding: '12px 14px' }}>Phone & Location</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--color-neutral-500, #64748b)' }}>
                    No participants matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isPending = user.status === 'pending';
                  const isRejected = user.status === 'rejected';

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
                      {/* Name & ID */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: user.accountType === 'admin' ? '#fef3c7' : user.accountType === 'provider' ? '#edf7f2' : user.accountType === 'driver' ? '#eff6ff' : '#f1f5f9',
                            color: user.accountType === 'admin' ? '#b45309' : user.accountType === 'provider' ? '#174d3d' : user.accountType === 'driver' ? '#1d4ed8' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}>
                            {user.fullName?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <b style={{ color: 'var(--color-neutral-900, #0f172a)', fontSize: '0.92rem', display: 'block' }}>
                              {user.fullName}
                            </b>
                            <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-400, #94a3b8)' }}>
                              #{user.id} · {user.email || 'No email registered'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Account Role */}
                      <td style={{ padding: '12px 14px' }}>
                        <Badge
                          variant={user.accountType === 'admin' ? 'warning' : user.accountType === 'provider' ? 'brand' : user.accountType === 'driver' ? 'accent' : 'neutral'}
                          dot={false}
                        >
                          {user.accountType?.toUpperCase()}
                        </Badge>
                      </td>

                      {/* Contact & Location */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: 'var(--color-neutral-800, #1e293b)', fontWeight: 600 }}>{user.phone}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500, #64748b)' }}>{user.location || 'Colombo'}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <StatusPill status={user.status || 'active'} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* KYC Modal for Providers & Drivers */}
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

                          {/* Quick Block if Active */}
                          {user.status === 'active' && user.accountType !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(user.id, 'rejected', user.fullName)}
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
                              title="Suspend User"
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
                              background: '#fff',
                              color: 'var(--color-neutral-700, #334155)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Reset Password"
                          >
                            <Key size={13} /> Key
                          </button>

                          {/* Delete Account */}
                          {user.accountType !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(user)}
                              style={{
                                padding: '5px 7px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid #fecaca',
                                background: '#fff',
                                color: '#dc2626',
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                              title="Delete Account"
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        onConfirm={() => {
          if (deleteConfirmUser) {
            onDeleteUser(deleteConfirmUser.id, deleteConfirmUser.fullName);
            setDeleteConfirmUser(null);
          }
        }}
        title="Permanently Remove Account?"
        message={`Are you sure you want to delete the registered account for "${deleteConfirmUser?.fullName}"? All active profile sessions will be terminated.`}
        confirmText="Delete Account"
        variant="danger"
      />
    </div>
  );
}
