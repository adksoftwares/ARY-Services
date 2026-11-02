import React, { useState } from 'react';
import { KeyRound, Delete, X, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Modal, Button, Badge } from '../../design-system';

export default function DriverPinKeypadModal({
  isOpen,
  onClose,
  title = 'Enter Verification PIN',
  subtitle = 'Ask the customer for their 4-digit security PIN',
  onSubmit,
  isVerifying = false,
  error = ''
}) {
  const [pin, setPin] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const isLockedOut = attemptsLeft <= 0;

  if (!isOpen) return null;

  function handleDigit(d) {
    if (isLockedOut || pin.length >= 4) return;
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
    if (pin.length !== 4 || isLockedOut) return;
    try {
      await onSubmit(pin);
      setPin('');
    } catch (err) {
      setAttemptsLeft(prev => Math.max(0, prev - 1));
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
        <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--color-neutral-600, #475569)' }}>
          {subtitle}
        </p>

        {/* 4-Digit Display Boxes */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {[0, 1, 2, 3].map(idx => {
            const digit = pin[idx];
            return (
              <div
                key={idx}
                style={{
                  width: '56px',
                  height: '64px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: digit ? '2.5px solid var(--color-brand-600, #174d3d)' : '2px dashed var(--color-border, #cbd5e1)',
                  background: digit ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #fff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--color-brand-900, #0c2d23)',
                  boxShadow: digit ? '0 4px 12px rgba(23, 77, 61, 0.15)' : 'none',
                  transition: 'all 0.12s ease'
                }}
              >
                {digit || ''}
              </div>
            );
          })}
        </div>

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

        {isLockedOut ? (
          <div style={{
            background: 'var(--color-danger-50, #fef2f2)',
            border: '1.5px solid var(--color-danger-400, #f87171)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '14px',
            marginBottom: 16,
            color: 'var(--color-danger-900, #7f1d1d)',
            fontSize: '0.85rem'
          }}>
            <ShieldAlert size={22} color="#dc2626" style={{ margin: '0 auto 6px', display: 'block' }} />
            <b>Security Lockout Active</b>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
              Maximum 5 incorrect attempts reached. Handoff is locked to protect customer goods. Please contact ARY Dispatch Hotline at <b>011 234 5678</b> to unlock this trip.
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: '16px', fontSize: '0.8rem' }}>
            {attemptsLeft < 5 ? (
              <span style={{ color: 'var(--color-danger-600, #dc2626)', fontWeight: 700 }}>
                ⚠️ Security limit: {attemptsLeft} of 5 attempts remaining
              </span>
            ) : (
              <span style={{ color: 'var(--color-neutral-500, #64748b)' }}>
                Ask customer / recipient for their 4-digit verification code
              </span>
            )}
          </div>
        )}

        {/* Numeric Keypad Grid */}
        <div className="keypad-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              type="button"
              className="keypad-digit-btn"
              onClick={() => handleDigit(String(n))}
              disabled={isLockedOut || pin.length >= 4 || isVerifying}
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
            disabled={isLockedOut || pin.length >= 4 || isVerifying}
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
            disabled={pin.length !== 4 || isLockedOut || isVerifying}
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
