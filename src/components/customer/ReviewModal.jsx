import React, { useState } from 'react';
import { Star, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';

const RATING_DESCRIPTIONS = {
  1: 'Poor - Service had major issues',
  2: 'Fair - Needs improvement',
  3: 'Good - Met normal expectations',
  4: 'Very Good - High quality work',
  5: 'Exceptional - Outstanding service & workmanship'
};

export default function ReviewModal({ isOpen, onClose, booking, onReviewSuccess }) {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
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

    if (rating < 1 || rating > 5) {
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      if (onReviewSuccess) {
        onReviewSuccess(data.review, data.providerStats);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error submitting review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeRating = hoverRating || rating;

  return (
    <div className="auth-overlay modal-backdrop review-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-card modal-card review-modal-card" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Rate & Review Service
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Booking #{booking.id.slice(-6)} · {booking.providerName}
            </p>
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
            fontSize: '0.875rem',
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <div style={{
          background: '#f8fafc',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <ShieldCheck size={24} color="#059669" />
          <div style={{ fontSize: '0.8rem', color: '#334155' }}>
            <strong style={{ color: '#059669' }}>14-Day ARY Workmanship Guarantee</strong>: Your verified feedback helps keep high service standards across Sri Lanka.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating Picker */}
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div style={{ display: 'inline-flex', gap: 8, cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 4,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}
                  aria-label={`${star} Stars`}
                >
                  <Star
                    size={36}
                    fill={star <= activeRating ? '#f59e0b' : '#e2e8f0'}
                    color={star <= activeRating ? '#d97706' : '#cbd5e1'}
                  />
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', minHeight: 22 }}>
              {RATING_DESCRIPTIONS[activeRating] || ''}
            </div>
          </div>

          {/* Written Feedback */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Share your experience (Optional)
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="How was the punctuality, pricing transparency, and quality of work?"
              maxLength={500}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
              {comment.length} / 500 characters
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              disabled={isSubmitting}
              style={{
                padding: '10px 22px',
                borderRadius: 8,
                border: 'none',
                background: '#0284c7',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <CheckCircle2 size={16} /> Submit Verified Review
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
