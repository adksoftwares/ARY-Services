import React, { useState } from 'react';
import { AlertTriangle, X, ShieldCheck, CheckCircle2, FileText, Scale } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';

const PRESET_DISPUTE_REASONS = [
  'Defective parts or replacement component failure',
  'Unsatisfactory or incomplete workmanship',
  'Appliance or installation stopped functioning within 14 days',
  'Contractor caused incidental property damage during repair',
  'Contractor demanded unauthorized extra cash outside ARY Escrow',
  'Other workmanship or warranty issue'
];

export default function DisputeModal({ isOpen, onClose, booking, onDisputeSuccess }) {
  const { currentUser } = useAuth();
  const [categoryReason, setCategoryReason] = useState(PRESET_DISPUTE_REASONS[0]);
  const [details, setDetails] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !booking) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!currentUser?.token) {
      setError('Please sign in to lodge a dispute.');
      return;
    }

    if (!details.trim() || details.trim().length < 8) {
      setError('Please provide at least 8 characters explaining the issue for ARY administrators.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullReason = `${categoryReason} - ${details.trim()}`;
      const res = await fetch(`${API_BASE}/bookings/${booking.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          reason: fullReason,
          evidence: evidenceNotes.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit dispute claim.');
      }

      if (onDisputeSuccess) {
        onDisputeSuccess(data.booking);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error lodging dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="auth-overlay modal-backdrop dispute-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="auth-card modal-card dispute-modal-card"
        style={{ maxWidth: 540 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Lodge Warranty Dispute
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Booking #{booking.id.slice(-6)} · {booking.providerName || booking.categoryName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: '0.85rem',
            marginBottom: 14
          }}>
            {error}
          </div>
        )}

        {/* Escrow Freeze Policy Banner */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <Scale size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.4 }}>
            <b>14-Day ARY Workmanship Guarantee:</b> Submitting this form will immediately <b>freeze the digital escrow payout</b>. The funds remain safely locked until ARY Mediation inspects the case or executes a binding resolution.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Dispute Reason Category */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Primary Issue Category:
            </label>
            <select
              value={categoryReason}
              onChange={e => setCategoryReason(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                color: '#1e293b',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              {PRESET_DISPUTE_REASONS.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Details / Explanation */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Detailed Description of Workmanship Issue <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="e.g. The technician replaced the valve yesterday, but it started leaking under the sink this morning and the main switch still trips."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Evidence Notes (Optional) */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Evidence / Receipts / Photo Notes (Optional):
            </label>
            <input
              type="text"
              value={evidenceNotes}
              onChange={e => setEvidenceNotes(e.target.value)}
              placeholder="e.g. Photos taken, contractor receipt #402, contacted technician at 9 AM"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-submit-btn dispute-submit-btn"
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
              }}
            >
              <AlertTriangle size={15} />
              {isSubmitting ? 'Submitting Claim...' : 'Freeze Escrow & Lodge Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
