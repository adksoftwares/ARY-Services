import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Card, RatingStars, EmptyState, Skeleton } from '../../design-system';

export default function ProviderReviews({
  reviews = [],
  averageRating = '—',
  isLoading = false
}) {
  const safeReviews = Array.isArray(reviews) ? reviews.filter(review => review && typeof review === 'object' && review.id !== null && review.id !== undefined) : [];
  const ratingValue = averageRating !== null && averageRating !== undefined && averageRating !== '' ? Number(averageRating) : NaN;
  const roundedRating = safeReviews.length > 0 && Number.isFinite(ratingValue) && ratingValue >= 0 && ratingValue <= 5 ? ratingValue : null;

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: '16px' }}>
        <Skeleton height="120px" radius="12px" />
        <Skeleton height="100px" radius="10px" />
        <Skeleton height="100px" radius="10px" />
      </div>
    );
  }

  return (
    <div className="provider-reviews-container" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Score Summary Header */}
      <Card style={{
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          textAlign: 'center',
          paddingRight: '24px',
          borderRight: '1px solid var(--color-border-subtle, #e2e8f0)',
          minWidth: 140
        }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-neutral-900, #0f172a)', lineHeight: 1 }}>
            {roundedRating != null ? roundedRating.toFixed(1) : '—'}
          </div>
          {roundedRating != null && <div style={{ margin: '8px 0 4px', display: 'flex', justifyContent: 'center' }}>
            <RatingStars value={Math.round(roundedRating)} readOnly size={18} />
          </div>}
          <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)' }}>
            {safeReviews.length > 0 ? `Based on ${safeReviews.length} customer review${safeReviews.length === 1 ? '' : 's'}` : 'No ratings yet'}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-success-700, #047857)',
            fontWeight: 700,
            fontSize: '1rem',
            marginBottom: 6
          }}>
            Customer feedback
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-neutral-600, #475569)', lineHeight: 1.6 }}>
            Customer feedback submitted for your bookings is shown below.
          </p>
        </div>
      </Card>

      {/* 2. Reviews Feed */}
      {safeReviews.length > 0 ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {safeReviews.map(r => (
            <Card key={r.id} style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <b style={{ color: 'var(--color-neutral-900, #0f172a)', fontSize: '0.95rem' }}>
                    {r.customerName || 'Customer'
                  </b>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-400, #94a3b8)' }}>
                  {r.createdAt && Number.isFinite(Date.parse(r.createdAt)) ? new Date(r.createdAt).toLocaleDateString() : 'Date unavailable'}
                </span>
              </div>

              <div style={{ marginBottom: 10 }}>
                <RatingStars value={r.rating !== null && r.rating !== undefined && r.rating !== '' && Number.isFinite(Number(r.rating)) && Number(r.rating) >= 1 && Number(r.rating) <= 5 ? Number(r.rating) : 0} readOnly size={15} />
              </div>

              {r.comment ? (
                <p style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  color: 'var(--color-neutral-700, #334155)',
                  lineHeight: 1.6,
                  fontStyle: 'normal'
                }}>
                  "{r.comment}"
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-neutral-400, #94a3b8)', fontStyle: 'italic' }}>
                  Client left a rating without additional comments.
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          <EmptyState
            icon={MessageSquare}
            title="No customer reviews yet"
            description="Once clients complete and rate your jobs, their feedback and star ratings will be published here."
          />

          {/* Pro-Tips for Getting 5-Star Reviews */}
          <Card style={{ padding: '24px', background: 'var(--surface-muted, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: '18px' }}>✨</span>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                How to Build a 5-Star Reputation on ARY Services
              </h4>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16
            }}>
              <div style={{ padding: '14px', borderRadius: 10, background: 'var(--surface-primary, #fff)', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d', marginBottom: 4 }}>
                  1. Punctual Arrival
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
                  Arrive on time for scheduled bookings. Prompt communication with clients significantly improves ratings.
                </p>
              </div>

              <div style={{ padding: '14px', borderRadius: 10, background: 'var(--surface-primary, #fff)', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d', marginBottom: 4 }}>
                  2. Transparent Upfront Quoting
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
                  Discuss parts and labor before commencing work. Transparent pricing prevents disputes and builds trust.
                </p>
              </div>

              <div style={{ padding: '14px', borderRadius: 10, background: 'var(--surface-primary, #fff)', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#15803d', marginBottom: 4 }}>
                  3. Clean & Professional Finish
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
                  Walk through the finished work with the customer and ensure the workspace is tidy before marking complete.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
