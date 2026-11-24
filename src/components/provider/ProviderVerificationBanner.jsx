import React from 'react';
import { ShieldAlert, ShieldCheck, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, Badge, Button } from '../../design-system';

export default function ProviderVerificationBanner({ currentUser }) {
  if (!currentUser) return null;

  const status = currentUser.status || 'active'; // 'pending' | 'active' | 'approved' | 'rejected' | 'suspended'

  if (status === 'active' || status === 'approved') {
    return (
      <div style={{
        background: 'var(--color-brand-50, #edf7f2)',
        border: '1px solid var(--color-brand-200, #b7decb)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '12px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--color-brand-600, #174d3d)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #f8fafc)' }}>
              ARY Provider Account Active
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-brand-700, #1b5e4b)' }}>
              Your provider account is active. Service listings and booking access remain subject to their individual approval and availability status.
            </div>
          </div>
        </div>
        <Badge variant="success" dot={false}>
          <CheckCircle2 size={12} /> Account Active
        </Badge>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div style={{
        background: 'var(--color-warning-50, #fffbeb)',
        border: '1px solid var(--color-warning-200, #fde68a)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--color-warning-500, #f59e0b)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-warning-900, #78350f)' }}>
              Application Under Review
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-warning-700, #b45309)' }}>
              Your application is awaiting Admin review. You can continue using your existing customer account while the review is pending.
            </div>
          </div>
        </div>
        <Badge variant="warning" dot={true}>
          Pending Admin Review
        </Badge>
      </div>
    );
  }

  if (status === 'rejected' || status === 'suspended') {
    return (
      <div style={{
        background: 'var(--color-danger-50, #fef2f2)',
        border: '1px solid var(--color-danger-200, #fecaca)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--color-danger-600, #dc2626)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-danger-900, #7f1d1d)' }}>
              Account {status === 'suspended' ? 'Suspended' : 'Verification Incomplete'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-danger-700, #b91c1c)' }}>
              {currentUser.rejectionReason || 'Your provider account is not currently active. Contact ARY support if you need clarification or want to submit updated information.'}
            </div>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => window.location.href = 'mailto:support@aryservices.lk'}>
          Contact Support <ArrowRight size={14} />
        </Button>
      </div>
    );
  }

  return null;
}
