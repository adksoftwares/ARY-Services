import React, { useState } from 'react';
import { Star, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { Modal, Button, Textarea, RatingStars } from '../../design-system';

const RATING_DESCRIPTIONS = {
  1: 'Poor - Service had major issues',
  2: 'Fair - Needs improvement',
  3: 'Good - Met normal expectations',
  4: 'Very Good - High quality work',
  5: 'Exceptional - Outstanding service & workmanship'
};

export default function ReviewModal({ isOpen, onClose, booking, onSuccess, onReviewSuccess }) {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !booking) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!currentUser?.token) {
      setError('Please sign in to submit a review.');
      return;
    }

    if (!booking?.id) {
      setError('This booking is missing a valid reference. Refresh your bookings and try again.');
      return;
    }

    if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          bookingId: booking.id,
          rating,
          comment: comment.trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      if (!data.review) throw new Error('The server did not confirm the review. Please refresh before trying again.');
      if (onSuccess) onSuccess();
      if (onReviewSuccess) onReviewSuccess(data.review, data.providerStats);
      onClose();
    } catch (err) {
      setError(err.message || 'Error submitting review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rate & Review Service"
      isBottomSheet={true}
      size="sm"
    >
      <form className="customer-review-modal-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <b>Booking #{String(booking.id).slice(-6)} · {booking.providerName || 'Service provider'}</b>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Your honest rating helps other customers understand the service experience.
          </p>
        </div>

        {error && (
          <div className="ds-toast ds-toast-error" style={{ width: '100%' }} role="alert">
            <span>{error}</span>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>
          <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'center' }}>
            <RatingStars
              rating={rating}
              size="lg"
              onChange={setRating}
            />
          </div>
          <div style={{ marginTop: '8px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--brand-primary)' }}>
            {RATING_DESCRIPTIONS[rating]}
          </div>
        </div>

        <label className="wizard-form-label">
          <span>Your Review Comments (Optional)</span>
          <Textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share feedback on punctuality, tidiness, and workmanship quality..."
          />
        </label>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-2)' }}>
          <Button variant="ghost" type="button" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting || !booking?.id} style={{ flex: 2 }}>
            Submit Review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
