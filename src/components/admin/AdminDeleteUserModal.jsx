import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Modal, Button } from '../../design-system';

export default function AdminDeleteUserModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isMatched = confirmInput.trim().toUpperCase() === 'DELETE' || confirmInput.trim() === user.fullName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Permanently Delete Account"
      maxWidth="460px"
    >
      <div style={{ padding: '4px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 14px',
          background: 'var(--color-danger-50, #fef2f2)',
          border: '1px solid var(--color-danger-200, #fecaca)',
          borderRadius: 'var(--radius-md, 8px)',
          marginBottom: '16px'
        }}>
          <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--color-danger-900, #7f1d1d)', lineHeight: 1.5 }}>
            <b>Irreversible Administrative Action:</b> You are about to permanently delete <b>{user.fullName}</b> ({user.phone || user.email}) from the ARY Services database. All active sessions, profile credentials, and associated authorizations will be revoked immediately.
          </div>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--color-neutral-700, #334155)', margin: '0 0 12px' }}>
          To confirm this permanent action, type <code style={{
            background: 'var(--color-neutral-100, #f1f5f9)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700,
            color: '#dc2626'
          }}>DELETE</code> below:
        </p>

        <input
          type="text"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          placeholder="Type DELETE to confirm"
          autoFocus
          style={{
            width: '100%',
            padding: '10px 14px',
            border: isMatched ? '1.5px solid #dc2626' : '1px solid var(--color-border, #cbd5e1)',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
            marginBottom: '18px',
            outline: 'none'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!isMatched || loading}
            loading={loading}
            onClick={() => {
              if (isMatched) {
                onConfirm(user.id, user.fullName);
              }
            }}
          >
            <Trash2 size={15} /> Permanently Delete Account
          </Button>
        </div>
      </div>
    </Modal>
  );
}
