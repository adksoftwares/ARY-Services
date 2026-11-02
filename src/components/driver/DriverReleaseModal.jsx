import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button, Textarea } from '../../design-system';

export default function DriverReleaseModal({
  isOpen,
  onClose,
  onConfirm,
  isReleasing = false
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  async function handleConfirm() {
    await onConfirm(reason);
    setReason('');
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Release Accepted Job"
      size="sm"
    >
      <div style={{ padding: '4px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--color-warning-50, #fffbeb)',
          border: '1px solid var(--color-warning-200, #fde68a)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '0.85rem',
          color: 'var(--color-warning-900, #78350f)'
        }}>
          <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0 }} />
          <span>
            You are releasing this job before pickup. It will immediately return to the dispatch broadcast pool for other nearby drivers.
          </span>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 6 }}>
            Optional Reason for Release
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Vehicle breakdown, sudden traffic delay, emergency"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--color-border, #cbd5e1)',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isReleasing}
          >
            Keep Job
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isReleasing}
          >
            Confirm Release
          </Button>
        </div>
      </div>
    </Modal>
  );
}
