import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Phone,
  Mail,
  Award,
  AlertTriangle,
  ZoomIn,
  Check,
  X,
  CreditCard,
  Truck,
  Building,
  Calendar
} from 'lucide-react';
import { Modal, Badge, Button } from '../../design-system';

export default function AdminKycModal({
  user,
  isOpen,
  onClose,
  onUpdateStatus
}) {
  const [selectedDoc, setSelectedDoc] = useState('');
  const [rejectReasonOpen, setRejectReasonOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isPending = user.status === 'pending';
  const isApproved = user.status === 'active';
  const isRejected = user.status === 'rejected';

  const documents = [
    ...(user.nicDocument ? [{
      id: 'nic_document',
      title: 'NIC Document',
      category: 'Identity',
      icon: CreditCard,
      data: user.nicDocument
    }] : []),
    ...(user.tradeCertificate ? [{
      id: 'trade_certificate',
      title: user.accountType === 'driver' ? 'Driving / Professional Licence' : 'Trade Certificate / Qualification',
      category: user.accountType === 'driver' ? 'Driver Credential' : 'Professional Credential',
      icon: user.accountType === 'driver' ? Truck : Award,
      data: user.tradeCertificate
    }] : [])
  ];
  const currentDoc = documents.find(document => document.id === selectedDoc) || documents[0] || null;

  async function handleApprove() {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(user.id, 'active', user.fullName);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRejectSubmit(e) {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(user.id, 'rejected', user.fullName, rejectionReason.trim());
      setRejectReasonOpen(false);
      setRejectionReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Partner KYC & Credentials Verification"
      maxWidth="860px"
    >
      <div style={{ padding: '4px 0' }}>
        {/* User Summary Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 20px',
          background: 'var(--color-surface-raised, #f8fafc)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border-subtle, #e2e8f0)',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--color-brand-600, #174d3d)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px rgba(23,77,61,0.2)'
            }}>
              {user.fullName?.slice(0, 2).toUpperCase() || 'SP'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b style={{ fontSize: '1.1rem', color: 'var(--color-text, #0f172a)' }}>{user.fullName}</b>
                <Badge variant={isApproved ? 'success' : isPending ? 'warning' : 'danger'} dot={false}>
                  {user.status?.toUpperCase() || 'PENDING'}
                </Badge>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)', marginTop: 2 }}>
                Account: <b>{user.accountType?.toUpperCase()}</b> · ID: #{user.id} · Registered: {user.phone}<br />NIC: {user.nicNumber || 'Not provided'} · NSN / Trade Reg: {user.nsnNumber || 'Not provided'} · Mode: {user.operatingMode || 'Not provided'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectReasonOpen(true)}
              disabled={isSubmitting || user.status === 'rejected'}
            >
              <XCircle size={14} color="#dc2626" /> Reject with Reason
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={isSubmitting}
              disabled={isSubmitting || user.status === 'active'}
            >
              <CheckCircle2 size={14} /> Approve Verified Partner
            </Button>
          </div>
        </div>

        {/* Side-by-Side KYC Document Preview Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 1fr) 2fr',
          gap: 18,
          marginBottom: 16
        }}>
          {/* Document Selector List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-neutral-500, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Submitted Documents ({documents.length})
            </span>

            {documents.map((doc) => {
              const Icon = doc.icon;
              const isSelected = currentDoc?.id === doc.id;

              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoc(doc.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: isSelected ? '1.5px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)',
                    background: isSelected ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #ffffff)',
                    color: isSelected ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-700, #334155)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: isSelected ? 'var(--color-brand-200, #b7decb)' : 'var(--color-neutral-100, #f1f5f9)',
                      display: 'grid',
                      placeItems: 'center',
                      color: isSelected ? 'var(--color-brand-800, #154636)' : 'var(--color-neutral-600, #475569)'
                    }}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <b style={{ fontSize: '0.84rem', display: 'block' }}>{doc.title}</b>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-neutral-400, #94a3b8)' }}>{doc.category}</span>
                    </div>
                  </div>
                  <FileText size={14} color="#64748b" />
                </button>
              );
            })}
          </div>

          {/* Submitted Document Preview */}
          <div style={{
            background: 'var(--color-surface, #ffffff)',
            border: '1px solid var(--color-border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '18px',
            minHeight: 260
          }}>
            {currentDoc ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--color-text, #0f172a)' }}>{currentDoc.title}</h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--color-neutral-500, #64748b)' }}>
                      Uploaded by applicant · {currentDoc.category}
                    </p>
                  </div>
                  <Badge variant="neutral" dot={false}>SUBMITTED</Badge>
                </div>
                {typeof currentDoc.data === 'string' && currentDoc.data.startsWith('data:image/') ? (
                  <img src={currentDoc.data} alt={currentDoc.title} style={{ display: 'block', maxWidth: '100%', maxHeight: 460, objectFit: 'contain', margin: '0 auto', borderRadius: 8 }} />
                ) : typeof currentDoc.data === 'string' && currentDoc.data.startsWith('data:application/pdf') ? (
                  <iframe title={currentDoc.title} src={currentDoc.data} style={{ width: '100%', height: 460, border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: 8 }} />
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-neutral-600, #475569)' }}>
                    <FileText size={28} />
                    <p>Document data is present but cannot be previewed in this format.</p>
                    <a href={currentDoc.data} target="_blank" rel="noreferrer">Open submitted document</a>
                  </div>
                )}
              </>
            ) : (
              <div style={{ minHeight: 220, display: 'grid', placeContent: 'center', textAlign: 'center', color: 'var(--color-neutral-600, #475569)', gap: 8 }}>
                <AlertTriangle size={28} color="#d97706" />
                <b>No verification files uploaded</b>
                <span style={{ fontSize: '0.82rem' }}>The applicant has not submitted an NIC or trade / driving credential file. Review the available profile details and request the missing documents before approval.</span>
              </div>
            )}
          </div>

            {/* Review integrity note */}
            <div style={{
              marginTop: 16,
              gridColumn: '1 / -1',
              padding: '10px 14px',
              background: 'var(--color-neutral-50, #f8fafc)',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '0.76rem',
              color: 'var(--color-neutral-500, #64748b)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }} />
              <span>
                Only the files submitted by this applicant are shown here. The platform does not independently verify document authenticity; administrators must review the originals before approving.
              </span>
            </div>
          </div>
        </div>

        {/* Rejection Reason Submodal */}
        {rejectReasonOpen && (
          <div style={{
            borderTop: '1px solid var(--color-border-subtle, #e2e8f0)',
            paddingTop: '16px',
            marginTop: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem', color: '#b91c1c' }}>
              Required: Specify Reason for KYC Rejection
            </h4>
            <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              The applicant will receive an official notification detailing this reason so they can re-submit the required documents.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {[
                  'NIC photo is blurry or unreadable',
                  'Driving license expired or invalid class',
                  'Address mismatch with proof of residence',
                  'Police clearance certificate required'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full, 9999px)',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      background: rejectionReason === preset ? 'var(--color-danger-50, #fef2f2)' : 'var(--color-surface, #ffffff)',
                      color: rejectionReason === preset ? '#b91c1c' : 'var(--color-neutral-700, #334155)',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                required
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter detailed reason for rejection..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border, #cbd5e1)',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                  marginBottom: 10
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setRejectReasonOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" type="submit" loading={isSubmitting} disabled={!rejectionReason.trim()}>
                  <XCircle size={14} /> Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}
