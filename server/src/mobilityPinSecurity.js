export const MOBILITY_PIN_TTL_MS = 30 * 60 * 1000;

export function isMobilityPinExpired(job, now = Date.now()) {
  if (!job || !Number.isFinite(now)) return true;
  const rawExpiry = job.pinExpiresAt;
  const expiry = rawExpiry ? Date.parse(rawExpiry) : Date.parse(job.createdAt || '');
  // Legacy jobs without an explicit expiry inherit a bounded lifetime from creation.
  const effectiveExpiry = rawExpiry ? expiry : expiry + MOBILITY_PIN_TTL_MS;
  return !Number.isFinite(effectiveExpiry) || now >= effectiveExpiry;
}
