import React, { useEffect, useState } from 'react';
import { KeyRound, Delete, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Badge } from '../../design-system';

export default function DriverPinKeypadModal({
  isOpen,
  onClose,
  title = 'Enter Handoff Code',
  subtitle = 'Enter the handoff verification code provided for this job',
  onSubmit,
  isVerifying = false,
  error = '',
  requireCashReceipt = false,
  expectedCashAmount = null
}) {
  const [pin, setPin] = useState('');
  const [cashAmount, setCashAmount] = useState(expectedCashAmount === null ? '' : String(expectedCashAmount));
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const isLockedOut = false;
  useEffect(() => { if (isOpen) { setPin(''); setCashAmount(expectedCashAmount === null ? '' : String(expectedCashAmount)); setCashConfirmed(false); } }, [isOpen, expectedCashAmount]);

  if (!isOpen) return null;

  function handleDigit(d) {
    if (pin.length >= 6) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }
    setPin(prev => prev + d);
  }

  function handleBackspace() {
    if (isLockedOut) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(20); } catch (e) {}
    }
    setPin(prev => prev.slice(0, -1));
  }

  function handleClear() {
    if (isLockedOut) return;
    setPin('');
  }

  async function handleVerify() {
    if (pin.length !== 6 || isVerifying || typeof onSubmit !== 'function') return;
    if (requireCashReceipt && (!cashConfirmed || !Number.isFinite(Number(cashAmount)) || Number(cashAmount) <= 0)) return;
    try {
      await onSubmit(pin, requireCashReceipt ? { cashReceived: true, cashAmount: Number(cashAmount) } : null);
      setPin('');
    } catch (err) {
      // The parent owns the actionable verification error; network failures must not consume local attempts.
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      isBottomSheet={true}
    >
      <div style={{ textAlign: 'center', padding: '6px 0 16px' }}>
        <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>

        {/* 6-Digit Display Boxes */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const digit = pin[idx];
            return (
              <div
                key={idx}
                style={{
                  width: '44px',
                  height: '56px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: digit ? '2.5px solid var(--color-brand-600, #174d3d)' : '2px dashed var(--color-border, #cbd5e1)',
                  background: digit ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #fff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--text-primary, #f8fafc)',
                  boxShadow: digit ? '0 4px 12px rgba(23, 77, 61, 0.15)' : 'none',
                  transition: 'all 0.12s ease'
                }}
              >
                {digit || ''}
              </div>
            );
          })}
        </div>

        {requireCashReceipt && (
          <div style={{ display: 'grid', gap: 10, textAlign: 'left', margin: '0 0 16px', padding: 12, borderRadius: 10, background: 'var(--color-warning-50, #fffbeb)', border: '1px solid var(--color-warning-200, #fde68a)' }}>
            <label style={{ display: 'grid', gap: 5, fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-warning-900, #78350f)' }}>
              Cash received (LKR)
              <input type="number" min="0.01" step="0.01" required value={expectedCashAmount === null ? cashAmount : String(expectedCashAmount)} readOnly={expectedCashAmount !== null} onChange={event => setCashAmount(event.target.value)} placeholder="Enter agreed fare received" style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '9px 11px', borderRadius: 8, border: '1px solid var(--color-border, #cbd5e1)', background: 'var(--color-surface, #fff)', color: 'var(--color-text, #0f172a)' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', color: 'var(--color-warning-900, #78350f)', cursor: 'pointer' }}>
              <input type="checkbox" checked={cashConfirmed} onChange={event => setCashConfirmed(event.target.checked)} style={{ marginTop: 2 }} />
              I confirm that I physically received the full cash amount from the customer
            </label>
          </div>
        )}

        {/* Error message & Lockout State */}
        {error && (
          <div style={{
            background: 'var(--color-danger-50, #fef2f2)',
            border: '1px solid var(--color-danger-200, #fecaca)',
            color: 'var(--color-danger-700, #b91c1c)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.82rem',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter the 6-digit code provided for this handoff.</div>

        {/* Numeric Keypad Grid */}
        <div className="keypad-grid driver-pin-keypad-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              type="button"
              className="keypad-digit-btn"
              onClick={() => handleDigit(String(n))}
              disabled={isLockedOut || pin.length >= 6 || isVerifying}
              aria-label={`Digit ${n}`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="keypad-digit-btn action"
            onClick={handleClear}
            disabled={isLockedOut || !pin || isVerifying}
            aria-label="Clear PIN"
          >
            Clear
          </button>
          <button
            type="button"
            className="keypad-digit-btn"
            onClick={() => handleDigit('0')}
            disabled={isLockedOut || pin.length >= 6 || isVerifying}
            aria-label="Digit 0"
          >
            0
          </button>
          <button
            type="button"
            className="keypad-digit-btn action"
            onClick={handleBackspace}
            disabled={isLockedOut || !pin || isVerifying}
            aria-label="Delete last digit"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Submit Verification Button */}
        <div style={{ marginTop: '20px', maxWidth: '320px', margin: '20px auto 0' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={handleVerify}
            disabled={pin.length !== 6 || isLockedOut || isVerifying}
            loading={isVerifying}
            style={{ width: '100%', minHeight: 52, fontSize: '1rem', fontWeight: 800 }}
          >
            <KeyRound size={16} /> Confirm & Verify PIN
          </Button>
        </div>
      </div>
    </Modal>
  );
}
