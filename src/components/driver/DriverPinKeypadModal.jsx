import React, { useState } from 'react';
import { KeyRound, Delete, X, AlertCircle, CheckCircle2 } from 'lucide-react';
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

  if (!isOpen) return null;

  function handleDigit(d) {
    if (pin.length < 4) {
      setPin(prev => prev + d);
    }
  }

  function handleBackspace() {
    setPin(prev => prev.slice(0, -1));
  }

  function handleClear() {
    setPin('');
  }

  async function handleVerify() {
    if (pin.length !== 4) return;
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
    >
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--color-neutral-600, #475569)' }}>
          {subtitle}
        </p>

        {/* 4-Digit Display Boxes */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '14px',
          marginBottom: '16px'
        }}>
          {[0, 1, 2, 3].map(idx => {
            const digit = pin[idx];
            return (
              <div
                key={idx}
                style={{
                  width: '54px',
                  height: '62px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: digit ? '2px solid var(--color-brand-600, #174d3d)' : '2px dashed var(--color-border, #cbd5e1)',
                  background: digit ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-neutral-50, #f8fafc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  color: 'var(--color-brand-900, #0c2d23)',
                  boxShadow: digit ? '0 2px 8px rgba(23, 77, 61, 0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {digit || ''}
              </div>
            );
          })}
        </div>

        {/* Attempt limit feedback */}
        <div style={{ marginBottom: '14px', fontSize: '0.8rem' }}>
          {attemptsLeft < 5 ? (
            <span style={{ color: 'var(--color-danger-600, #dc2626)', fontWeight: 600 }}>
              ⚠️ Security limit: {attemptsLeft} attempts remaining before temporary lockout
            </span>
          ) : (
            <span style={{ color: 'var(--color-neutral-500, #64748b)' }}>
              Enter the 4-digit numeric code
            </span>
          )}
        </div>

        {error && (
          <div style={{
            background: 'var(--color-danger-50, #fef2f2)',
            border: '1px solid var(--color-danger-200, #fecaca)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '8px 12px',
            marginBottom: '16px',
            color: 'var(--color-danger-700, #b91c1c)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Large Touch Keypad (0-9, Backspace, Clear) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          maxWidth: '300px',
          margin: '0 auto 18px'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              disabled={isVerifying || pin.length >= 4}
              style={{
                height: '56px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border, #cbd5e1)',
                background: 'var(--color-surface, #fff)',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--color-neutral-900, #0f172a)',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                userSelect: 'none'
              }}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={isVerifying || pin.length === 0}
            style={{
              height: '56px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border, #cbd5e1)',
              background: 'var(--color-neutral-100, #f1f5f9)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--color-neutral-600, #475569)',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={isVerifying || pin.length >= 4}
            style={{
              height: '56px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border, #cbd5e1)',
              background: 'var(--color-surface, #fff)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--color-neutral-900, #0f172a)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isVerifying || pin.length === 0}
            style={{
              height: '56px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border, #cbd5e1)',
              background: 'var(--color-neutral-100, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-neutral-700, #334155)',
              cursor: 'pointer'
            }}
            aria-label="Backspace"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Submit & Cancel */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleVerify}
            disabled={pin.length !== 4 || isVerifying || attemptsLeft === 0}
            loading={isVerifying}
          >
            Verify & Confirm Status
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
