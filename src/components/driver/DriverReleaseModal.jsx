import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Modal, Button } from '../../design-system';

const STANDARD_REASONS = [
  'Vehicle mechanical breakdown / flat tyre',
  'Severe traffic congestion / road closure',
  'Personal emergency / health issue',
  'Cannot locate or reach customer at pickup'
];

export default function DriverReleaseModal({
  isOpen,
  onClose,
  onConfirm,
  isReleasing = false
}) {
  const [selectedReason, setSelectedReason] = useState(STANDARD_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  async function handleConfirm() {
    const finalReason = customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason;
    await onConfirm(finalReason);
    setCustomReason('');
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Release Job Before Pickup"
      size="sm"
      isBottomSheet={true}
    >
      <div style={{ padding: '6px 0 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'var(--color-warning-50, #fffbeb)',
          border: '1px solid var(--color-warning-300, #fcd34d)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '0.85rem',
          color: 'var(--color-warning-900, #78350f)'
        }}>
          <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Immediate Re-Dispatch Notice</b>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-warning-800, #92400e)' }}>
              Releasing this trip will immediately return it to the broadcast dispatch pool so another nearby driver can attend to the customer.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-neutral-700, #334155)', marginBottom: 8 }}>
            Select Reason for Release:
          </label>
          <div style={{ display: 'grid', gap: 8 }}>
            {STANDARD_REASONS.map(r => (
              <label
                key={r}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: selectedReason === r ? '2px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border, #cbd5e1)',
                  background: selectedReason === r ? 'var(--color-brand-50, #edf7f2)' : '#ffffff',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="releaseReason"
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)', marginBottom: 6 }}>
            Additional Notes (Optional)
          </label>
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Add any specific details for ARY Dispatch..."
            rows={2}
            className="provider-form-textarea"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="danger"
            size="lg"
            onClick={handleConfirm}
            loading={isReleasing}
            style={{ flex: 1, minHeight: 48, fontWeight: 700 }}
          >
            Confirm Release
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            disabled={isReleasing}
          >
            Keep Job
          </Button>
        </div>
      </div>
    </Modal>
  );
}
