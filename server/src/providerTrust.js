/**
 * Provider quality and trust signals derived only from verified marketplace activity.
 * Scores are advisory and are not used for automated account suspension.
 */
export function summarizeProviderTrust(providerId, bookings = [], reviews = []) {
  const providerBookings = bookings.filter(booking => booking?.providerId === providerId);
  const completed = providerBookings.filter(booking => booking.status === 'completed');
  const providerCancelled = providerBookings.filter(booking =>
    booking.status === 'cancelled' && booking.cancelledBy === providerId
  );
  const declines = providerBookings.reduce((count, booking) => count + (
    Array.isArray(booking.lifecycleHistory)
      ? booking.lifecycleHistory.filter(event => event?.event === 'provider_declined_rebroadcast' && event?.actorId === providerId).length
      : 0
  ), 0);
  const verifiedReviews = reviews.filter(review =>
    review?.providerId === providerId &&
    review.verifiedBooking === true &&
    completed.some(booking => booking.id === review.bookingId)
  );
  const averageRating = verifiedReviews.length
    ? Math.round((verifiedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / verifiedReviews.length) * 100) / 100
    : null;
  const engagements = completed.length + providerCancelled.length + declines;
  const cancellationRate = engagements ? Math.round(providerCancelled.length / engagements * 100) : 0;
  const declineRate = engagements ? Math.round(declines / engagements * 100) : 0;
  const enoughHistory = engagements >= 5;
  let trustScore = averageRating === null ? null : Math.round((averageRating / 5) * 100);
  if (trustScore !== null) {
    trustScore = Math.max(0, Math.min(100, trustScore - (enoughHistory ? cancellationRate * 0.35 + declineRate * 0.15 : 0)));
  }
  const riskSignals = [];
  if (enoughHistory && cancellationRate >= 25) riskSignals.push('provider_cancellation_rate_elevated');
  if (enoughHistory && declineRate >= 40) riskSignals.push('provider_decline_rate_elevated');
  if (verifiedReviews.length >= 3 && averageRating < 3.5) riskSignals.push('low_verified_rating');
  return {
    providerId,
    completedBookings: completed.length,
    providerCancellations: providerCancelled.length,
    providerDeclines: declines,
    verifiedReviewCount: verifiedReviews.length,
    averageVerifiedRating: averageRating,
    cancellationRatePercent: cancellationRate,
    declineRatePercent: declineRate,
    trustScore,
    trustConfidence: engagements >= 20 ? 'high' : engagements >= 5 ? 'medium' : 'low',
    riskSignals
  };
}
