import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Bike,
  BriefcaseBusiness,
  UserCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  CreditCard,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import { Card, Badge, Button, EmptyState, SegmentedControl } from '../../design-system';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import AdminKycModal from './AdminKycModal';

export default function AdminApplications({
  adminUsers = [],
  onRefreshUsers,
  onNotice
}) {
  const { currentUser } = useAuth();
  const [driverApps, setDriverApps] = useState([]);
  const [roleApps, setRoleApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'driver' | 'provider' | 'role'
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState('');

  // Modals state
  const [kycUser, setKycUser] = useState(null);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchApplications = useCallback(async () => {
    if (!currentUser?.token || currentUser.accountType !== 'admin') return;
    setLoading(true);
    try {
      const [driverRes, roleRes] = await Promise.all([
        fetch(`${API_BASE}/admin/driver-applications`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        }),
        fetch(`${API_BASE}/admin/role-applications`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        })
      ]);

      if (driverRes.ok) {
        const d = await driverRes.json();
        setDriverApps(d.applications || []);
      }
      if (roleRes.ok) {
        const r = await roleRes.json();
        setRoleApps(r.applications || []);
      }
    } catch (e) {
      console.warn('Could not load applications:', e);
      onNotice?.('Could not load application queue.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, onNotice]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Combine driver applications, role applications, and pending provider accounts
  const unifiedList = React.useMemo(() => {
    const list = [];

    // 1. Driver applications
    for (const d of driverApps) {
      list.push({
        id: `driver-${d.id}`,
        rawId: d.id,
        kind: 'driver',
        applicantName: d.driverName || d.userId,
        phone: d.phone || 'Phone on file',
        serviceNetwork: d.driverType === 'food_delivery' ? 'Food Delivery Driver' : 'Ride Driver',
        status: d.status || 'pending',
        appliedAt: d.createdAt || d.requestedAt || new Date().toISOString(),
        details: d,
        nicNumber: d.nicNumber || 'Not provided'
      });
    }

    // 2. Role applications
    for (const r of roleApps) {
      list.push({
        id: `role-${r.userId}-${r.role}`,
        rawId: r.userId,
        role: r.role,
        kind: 'role',
        applicantName: r.fullName,
        phone: r.phone,
        email: r.email,
        serviceNetwork: r.role === 'provider' ? 'Additional Provider Role' : 'Additional Driver Role',
        status: r.status || 'pending',
        appliedAt: r.requestedAt || r.application?.requestedAt || new Date().toISOString(),
        details: r.application?.details || {},
        nicNumber: r.application?.details?.nicNumber || 'Not provided'
      });
    }

    // 3. Pending direct provider registrations
    for (const u of adminUsers) {
      if (u.accountType === 'provider' && u.status === 'pending') {
        // Only if not already present in role applications
        if (!list.some(item => item.kind === 'role' && item.rawId === u.id)) {
          list.push({
            id: `user-${u.id}`,
            rawId: u.id,
            kind: 'provider',
            applicantName: u.fullName,
            phone: u.phone,
            email: u.email,
            serviceNetwork: `New Provider Registration (${u.category || 'General'})`,
            status: 'pending',
            appliedAt: u.createdAt || new Date().toISOString(),
            details: {
              location: u.location,
              categoryName: u.categoryName || u.category
            },
            nicNumber: u.nicNumber || 'Not provided'
          });
        }
      }
    }

    // Filter
    return list.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.applicantName?.toLowerCase().includes(q) ||
        item.phone?.toLowerCase().includes(q) ||
        item.serviceNetwork?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.nicNumber?.toLowerCase().includes(q);

      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'driver' && item.kind === 'driver') ||
        (typeFilter === 'provider' && item.kind === 'provider') ||
        (typeFilter === 'role' && item.kind === 'role');

      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchQuery && matchType && matchStatus;
    });
  }, [driverApps, roleApps, adminUsers, searchQuery, typeFilter, statusFilter]);

  // Handle application decision
  async function handleDecide(item, decision, reason = '') {
    setBusyId(item.id);
    try {
      if (item.kind === 'driver') {
        const res = await fetch(`${API_BASE}/admin/driver-applications/${item.rawId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ status: decision, reason })
        });
        if (!res.ok) throw new Error('Failed to update driver application.');
      } else if (item.kind === 'role') {
        const res = await fetch(`${API_BASE}/admin/role-applications/${encodeURIComponent(item.rawId)}/${item.role}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ status: decision, reason })
        });
        if (!res.ok) throw new Error('Failed to update role application.');
      } else if (item.kind === 'provider') {
        const res = await fetch(`${API_BASE}/admin/users/${item.rawId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ status: decision === 'approved' ? 'active' : 'rejected' })
        });
        if (!res.ok) throw new Error('Failed to update provider status.');
        onRefreshUsers?.();
      }

      onNotice?.(`Application ${decision === 'approved' ? 'Approved' : 'Rejected'} for ${item.applicantName}`);
      await fetchApplications();
    } catch (e) {
      onNotice?.(`Error: ${e.message}`);
    } finally {
      setBusyId('');
      setRejectingItem(null);
      setRejectionReason('');
    }
  }

  const typeOptions = [
    { id: 'all', value: 'all', label: `All Queue (${unifiedList.length})` },
    { id: 'driver', value: 'driver', label: 'Drivers' },
    { id: 'provider', value: 'provider', label: 'Providers' },
    { id: 'role', value: 'role', label: 'Role Upgrades' }
  ];

  const pendingCount = unifiedList.filter(i => i.status === 'pending').length;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header & Filter Card */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={22} color="var(--color-brand-600, #174d3d)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-900, #173b2f)' }}>
                Unified Partner & Role Verification Queue
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Inspect and verify driver credentials, service contractor applications, and multi-role upgrades.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={fetchApplications} loading={loading}>
            <RefreshCw size={14} /> Refresh Queue
          </Button>
        </div>

        {/* Filter Controls */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ maxWidth: 480, flex: 1 }}>
            <SegmentedControl
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {['pending', 'all', 'approved', 'rejected'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: statusFilter === st ? '1.5px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)',
                  background: statusFilter === st ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #ffffff)',
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

      {/* 2. Applications Queue List */}
      {unifiedList.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <EmptyState
            icon={ShieldCheck}
            title="Application queue is clear"
            description="No pending contractor or driver applications require review under the selected criteria."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {unifiedList.map(item => {
            const isPending = item.status === 'pending';
            const isBusy = busyId === item.id;

            return (
              <Card
                key={item.id}
                style={{
                  padding: '18px 20px',
                  border: isPending ? '1.5px solid var(--color-brand-300, #a3d1ba)' : '1px solid var(--color-border-subtle, #e2e8f0)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md, 10px)',
                      background: item.kind === 'driver' ? '#eff6ff' : 'var(--color-brand-50, #edf7f2)',
                      color: item.kind === 'driver' ? '#1d4ed8' : 'var(--color-brand-700, #174d3d)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}>
                      {item.kind === 'driver' ? <Bike size={22} /> : <BriefcaseBusiness size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b style={{ fontSize: '1.02rem', color: 'var(--color-text, #0f172a)' }}>
                          {item.applicantName}
                        </b>
                        <Badge
                          variant={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'}
                          dot={false}
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--color-brand-800, #154636)', fontWeight: 600, marginTop: 2 }}>
                        {item.serviceNetwork}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 6, flexWrap: 'wrap' }}>
                        <span>Phone: <b>{item.phone}</b></span>
                        <span>NIC: <b>{item.nicNumber}</b></span>
                        <span>Applied: {new Date(item.appliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* View KYC Docs */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setKycUser({
                        id: item.rawId,
                        fullName: item.applicantName,
                        phone: item.phone,
                        accountType: item.kind === 'driver' ? 'driver' : 'provider',
                        status: item.status,
                        nicNumber: item.nicNumber
                      })}
                    >
                      <Eye size={14} /> Inspect KYC Files
                    </Button>

                    {isPending && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => setRejectingItem(item)}
                        >
                          <XCircle size={14} /> Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isBusy}
                          onClick={() => handleDecide(item, 'approved')}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* KYC Inspector Modal */}
      <AdminKycModal
        user={kycUser}
        isOpen={Boolean(kycUser)}
        onClose={() => setKycUser(null)}
        onUpdateStatus={async (userId, status, name, reason) => {
          // Find matching item
          const match = unifiedList.find(i => String(i.rawId) === String(userId));
          if (match) {
            await handleDecide(match, status, reason);
          }
        }}
      />

      {/* Rejection Reason Modal */}
      {rejectingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: 16
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 14px)',
            maxWidth: 480,
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#b91c1c' }}>
              Required: Specify Reason for Rejection
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: 'var(--color-neutral-600, #475569)' }}>
              Specify the administrative justification for rejecting <b>{rejectingItem.applicantName}</b>'s application:
            </p>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                'NIC / Driving License is unreadable',
                'Driver license not valid for vehicle class',
                'Trade credentials unverified',
                'Outside current service coverage area'
              ].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectionReason(preset)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    background: rejectionReason === preset ? 'var(--color-danger-50, #fef2f2)' : 'var(--color-surface, #ffffff)',
                    color: rejectionReason === preset ? '#b91c1c' : 'var(--color-neutral-700, #334155)',
                    fontSize: '0.74rem',
                    cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter clear, actionable feedback for the applicant..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border, #cbd5e1)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '0.86rem',
                boxSizing: 'border-box',
                marginBottom: 16
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectingItem(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!rejectionReason.trim()}
                onClick={() => handleDecide(rejectingItem, 'rejected', rejectionReason.trim())}
              >
                <XCircle size={14} /> Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
