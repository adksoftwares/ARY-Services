import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Scale } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { Modal, Button, Select, Textarea } from '../../design-system';

const PRESET_DISPUTE_REASONS = [
  'Defective parts or replacement component failure',
  'Unsatisfactory or incomplete workmanship',
  'Appliance or installation stopped functioning after the service',
  'Contractor caused incidental property damage during repair',
  'Unexpected additional cash payment or price change',
  'Other workmanship or service issue'
];

export default function DisputeModal({ isOpen, onClose, booking, onSuccess, onDisputeSuccess }) {
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

    if (isSubmitting) return;
    if (!currentUser?.token) {
      setError('Please sign in to lodge a dispute.');
      return;
    }

    if (!booking?.id || !categoryReason || !details.trim() || details.trim().length < 8) {
      setError('Please provide at least 8 characters explaining the issue for ARY administrators.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullReason = `${categoryReason} - ${details.trim()}`;
      const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(booking.id)}/dispute`, {
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to lodge dispute.');
      }

      if (!data.dispute) throw new Error('The server did not confirm the dispute report. Please refresh before trying again.');
      if (onSuccess) onSuccess();
      if (onDisputeSuccess) onDisputeSuccess(data.dispute);
      onClose();
    } catch (err) {
      setError(err.message || 'Error submitting dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report a Booking Dispute"
      isBottomSheet={true}
      size="md"
    >
      <form className="customer-dispute-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="security-notice-box">
          <ShieldCheck size={18} />
          <div>
            <b>Booking Dispute Review</b>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)' }}>
              Share the issue and any supporting information. ARY administrators can review the report; submitting it does not guarantee a particular outcome or fixed response period.
            </p>
          </div>
        </div>

        {error && (
          <div className="ds-toast ds-toast-error" style={{ width: '100%' }} role="alert">
            <span>{error}</span>
          </div>
        )}

        <Select
          label="Primary Reason for Dispute *"
          value={categoryReason}
          onChange={e => setCategoryReason(e.target.value)}
          options={PRESET_DISPUTE_REASONS.map(r => ({ value: r, label: r }))}
        />

        <label className="wizard-form-label">
          <span>Detailed Explanation of Issue *</span>
          <Textarea
            rows={4}
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Describe what occurred, what parts failed, or what repairs remain incomplete..."
            required={true}
          />
        </label>

        <label className="wizard-form-label">
          <span>Supporting Evidence Notes (Optional)</span>
          <Textarea
            rows={2}
            value={evidenceNotes}
            onChange={e => setEvidenceNotes(e.target.value)}
            placeholder="Mention photos, receipts, or notes available for administrator review..."
          />
        </label>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-2)' }}>
          <Button variant="ghost" type="button" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="danger" type="submit" loading={isSubmitting} disabled={isSubmitting || !details.trim() || details.trim().length < 8} style={{ flex: 2 }}>
            Submit Dispute Report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
