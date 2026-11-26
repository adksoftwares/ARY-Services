import React, { useEffect, useRef, useState } from 'react';
import { Key, Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Modal, Button } from '../../design-system';

export default function AdminResetPasswordModal({
  user,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}) {
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const feedbackTimerRef = useRef(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); }, []);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setCopied(false);
      setError('');
      setSuccess('');
      setShowPassword(false);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  function generateStrongPassword() {
    const cryptoApi = typeof window !== 'undefined' ? window.crypto : null;
    if (!cryptoApi?.getRandomValues) {
      setError('Secure password generation is unavailable in this browser. Enter a temporary password manually.');
      return;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    const randomValues = new Uint32Array(16);
    cryptoApi.getRandomValues(randomValues);
    const generated = Array.from(randomValues, value => chars[value % chars.length]).join('');
    setPassword(generated);
    setCopied(false);
    setError('');
  }

  async function handleCopy() {
    if (!password) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(password);
      setCopied(true);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setError('Could not copy the password. Select and copy it manually.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting || typeof onSubmit !== 'function' || !user?.id) return;
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setError('');
    try {
      await onSubmit(user.id, password);
      setSuccess(`Password for ${user.fullName} has been successfully updated.`);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setSuccess('');
        onClose?.();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset User Password"
      size="sm"
    >
      <form className="admin-password-modal-form" onSubmit={handleSubmit} style={{ padding: '4px 0' }}>
        <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--color-neutral-600, #475569)' }}>
          Reset account password for <b>{user.fullName}</b> ({user.phone || user.email}).
        </p>

        {/* Shown Once Warning Alert */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--color-warning-50, #fffbeb)',
          border: '1px solid var(--color-warning-200, #fde68a)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '0.82rem',
          color: 'var(--color-warning-900, #78350f)'
        }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
          <span>
            <b>Security Note:</b> This temporary password is displayed in this dialog. Share it through a secure channel and do not reuse it for another account.
          </span>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-neutral-700, #334155)' }}>
              New Temporary Password
            </label>
            <button
              type="button"
              onClick={generateStrongPassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-brand-600, #174d3d)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0
              }}
            >
              ⚡ Generate Strong Password
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter or generate temporary password"
              style={{
                width: '100%',
                padding: '10px 80px 10px 12px',
                border: '1px solid var(--color-border, #cbd5e1)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '1rem',
                boxSizing: 'border-box',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!password}
                style={{
                  background: copied ? 'var(--color-brand-600, #174d3d)' : '#f1f5f9',
                  color: copied ? '#fff' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-sm, 6px)',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--color-danger-600, #dc2626)', fontSize: '0.8rem', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ color: 'var(--color-success-700, #047857)', fontSize: '0.8rem', marginBottom: 12, fontWeight: 600 }}>
            {success}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={() => onClose?.()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isSubmitting} disabled={!password}>
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
