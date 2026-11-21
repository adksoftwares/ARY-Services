/**
 * Operational marketplace snapshot. Counts only persisted records and avoids exposing PII.
 */
export function summarizeMarketplaceOperations(bookings = [], now = Date.now()) {
  const valid = Array.isArray(bookings) ? bookings : [];
  const count = status => valid.filter(item => item?.status === status).length;
  const requested = valid.filter(item => item?.status === 'requested');
  const pendingAges = requested.map(item => {
    const created = Date.parse(item.createdAt || '');
    return Number.isFinite(created) ? Math.max(0, now - created) : null;
  }).filter(value => value !== null);
  const olderThan30Minutes = pendingAges.filter(age => age >= 30 * 60 * 1000).length;
  const cancellations = valid.filter(item => item?.status === 'cancelled');
  const cancellationsByActor = cancellations.reduce((result, item) => {
    const actor = ['customer', 'provider', 'driver', 'admin'].includes(item.cancelledBy) ? item.cancelledBy : 'unknown';
    result[actor] = (result[actor] || 0) + 1;
    return result;
  }, {});
  const completed = count('completed');
  const terminal = completed + cancellations.length;
  return {
    totalBookings: valid.length,
    requestedBookings: requested.length,
    acceptedBookings: count('accepted'),
    inProgressBookings: count('in_progress'),
    completedBookings: completed,
    cancelledBookings: cancellations.length,
    pendingOver30Minutes: olderThan30Minutes,
    oldestPendingMinutes: pendingAges.length ? Math.floor(Math.max(...pendingAges) / 60000) : null,
    completionRatePercent: terminal ? Math.round(completed / terminal * 1000) / 10 : 0,
    cancellationsByActor
  };
}
