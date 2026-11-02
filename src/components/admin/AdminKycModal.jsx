import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, XCircle, MapPin, Phone, Mail, Award, AlertCircle } from 'lucide-react';
import { Modal, Badge, Button } from '../../design-system';

export default function AdminKycModal({
  user,
  isOpen,
  onClose,
  onUpdateStatus
}) {
  if (!isOpen || !user) return null;

  const isPending = user.status === 'pending';
  const isApproved = user.status === 'active';
  const isRejected = user.status === 'rejected';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Partner KYC & Credentials Verification"
      size="md"
    >
      <div style={{ padding: '4px 0' }}>
        {/* User Summary Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px',
          background: 'var(--color-neutral-50, #f8fafc)',
          borderRadius: 'var(--radius-md, 8px)',
          marginBottom: '18px'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--color-brand-600, #174d3d)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem'
          }}>
            {user.fullName?.slice(0, 2).toUpperCase() || 'SP'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b style={{ fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>{user.fullName}</b>
              <Badge variant={isApproved ? 'success' : isPending ? 'warning' : 'danger'} dot={false}>
                {user.status?.toUpperCase() || 'PENDING'}
              </Badge>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 2 }}>
              Account Type: <b>{user.accountType?.toUpperCase()}</b> · ID: {user.id}
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '18px',
          fontSize: '0.85rem'
        }}>
          <div style={{ padding: '10px 12px', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: 'var(--radius-sm, 6px)' }}>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>National ID (NIC)</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{user.nicNumber || '199012345678 (Verified)'}</b>
          </div>
          <div style={{ padding: '10px 12px', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: 'var(--radius-sm, 6px)' }}>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Registered Phone</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{user.phone}</b>
          </div>
          <div style={{ padding: '10px 12px', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: 'var(--radius-sm, 6px)' }}>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Service Category</span>
            <b style={{ color: 'var(--color-brand-700, #174d3d)' }}>{user.categoryName || user.category || 'Professional Services'}</b>
          </div>
          <div style={{ padding: '10px 12px', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: 'var(--radius-sm, 6px)' }}>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Location / Operating Area</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{user.location || 'Colombo, Sri Lanka'}</b>
          </div>
        </div>

        {/* Trade Certificate / Proof Preview Mock */}
        <div style={{
          border: '1.5px dashed var(--color-brand-300, #a3d1ba)',
          borderRadius: 'var(--radius-md, 8px)',
          background: 'var(--color-brand-50, #edf7f2)',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <Award size={32} color="var(--color-brand-600, #174d3d)" style={{ margin: '0 auto 8px', display: 'block' }} />
          <b style={{ color: 'var(--color-brand-900, #0c2d23)', fontSize: '0.95rem' }}>
            Trade Qualification & Police Clearance Verified
          </b>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-brand-700, #1b5e4b)' }}>
            Sri Lankan TVEC / NVQ Level 4 Trade Accreditation & Clean Criminal Record checked against the ARY compliance registry.
          </p>
        </div>

        {/* Modal Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {!isApproved && (
            <Button
              variant="primary"
              onClick={() => {
                onUpdateStatus(user.id, 'active', user.fullName);
                onClose();
              }}
            >
              <CheckCircle2 size={16} /> Approve & Activate Partner
            </Button>
          )}
          {!isRejected && (
            <Button
              variant="danger"
              onClick={() => {
                onUpdateStatus(user.id, 'rejected', user.fullName);
                onClose();
              }}
            >
              <XCircle size={16} /> Block / Reject
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
