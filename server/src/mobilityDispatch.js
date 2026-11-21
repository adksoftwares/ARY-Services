import { calculateDistanceKm, estimateEtaMinutes } from './geoService.js';

export function cleanSriLankaCoordinates(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < 5.8 || latitude > 10.1 || longitude < 79.0 || longitude > 82.2) return null;
  return { lat: latitude, lng: longitude };
}

export function isDriverPresenceFresh(presence, now = Date.now(), maxAgeMs = 90_000) {
  if (!presence?.online || !cleanSriLankaCoordinates(presence.lat, presence.lng)) return false;
  const updatedAt = Date.parse(presence.updatedAt || '');
  return Number.isFinite(updatedAt) && now - updatedAt >= 0 && now - updatedAt <= maxAgeMs;
}

// Request aging prevents nearby new requests from indefinitely starving older jobs.
export function dispatchFairnessScore(distanceKm, createdAt, now = Date.now()) {
  const created = Date.parse(createdAt || '');
  const ageMinutes = Number.isFinite(created) ? Math.max(0, (now - created) / 60_000) : 0;
  const agePriorityKm = Math.min(5, ageMinutes / 10); // capped at 5km-equivalent after 50 minutes
  return distanceKm === null ? -agePriorityKm : distanceKm - agePriorityKm;
}

/** A bounded urgency boost for repeatedly released requests. Lower scores dispatch sooner. */
export function releasePriorityBoost(job) {
  const count = Number.isFinite(Number(job?.driverReleaseCount))
    ? Math.max(0, Number(job.driverReleaseCount))
    : (Array.isArray(job?.driverReleaseHistory) ? job.driverReleaseHistory.length : 0);
  return Math.min(2, count * 0.5);
}

/** Drivers who previously released this request cannot reclaim it after requeue. */
export function isDriverEligibleForRequeuedJob(job, driverId) {
  if (!driverId) return false;
  return !(Array.isArray(job?.driverReleaseHistory) && job.driverReleaseHistory.some(entry => entry?.driverId === driverId));
}

export function rankJobsForDriver(jobs, presence, now = Date.now()) {
  const fresh = isDriverPresenceFresh(presence, now);
  return jobs.map(job => {
    const targetLat = job.serviceType === 'food_delivery' ? job.destinationLat : job.pickupLat;
    const targetLng = job.serviceType === 'food_delivery' ? job.destinationLng : job.pickupLng;
    const target = cleanSriLankaCoordinates(targetLat, targetLng);
    const distanceKm = fresh && target ? calculateDistanceKm(presence.lat, presence.lng, target.lat, target.lng) : null;
    const releasePriorityBoost = releasePriorityBoost(job);
    const fairnessScore = dispatchFairnessScore(distanceKm, job.createdAt, now) - releasePriorityBoost;
    return { ...job, distanceKm, etaMinutes: distanceKm === null ? null : estimateEtaMinutes(distanceKm), fairnessScore, releasePriorityBoost };
  }).sort((a, b) => {
    const aAssigned = Boolean(a.driverId);
    const bAssigned = Boolean(b.driverId);
    if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
    if (a.fairnessScore !== b.fairnessScore) return a.fairnessScore - b.fairnessScore;
    const aCreated = Date.parse(a.createdAt || '');
    const bCreated = Date.parse(b.createdAt || '');
    if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) return aCreated - bCreated;
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}

/** Build a compact, privacy-minimised snapshot for authenticated Admin dispatch monitoring. */
export function buildAdminDispatchSnapshot(jobs, applications, presence, now = Date.now()) {
  const approvedByDriver = new Map();
  for (const application of applications || []) {
    if (application.status !== 'approved') continue;
    const current = approvedByDriver.get(application.userId) || { driverName: application.driverName || 'Approved driver', networks: [] };
    if (!current.networks.includes(application.driverType)) current.networks.push(application.driverType);
    approvedByDriver.set(application.userId, current);
  }
  const drivers = Object.entries(presence || {}).flatMap(([driverId, location]) => {
    const approval = approvedByDriver.get(driverId);
    if (!approval || !isDriverPresenceFresh(location, now)) return [];
    return [{ driverId, driverName: approval.driverName, networks: approval.networks, lat: location.lat, lng: location.lng, updatedAt: location.updatedAt }];
  });
  const activeJobs = (jobs || []).filter(job => !['completed', 'delivered', 'cancelled', 'failed_attempt', 'returned'].includes(job.status)).map(job => ({
    id: job.id, serviceType: job.serviceType, status: job.status, customerName: job.customerName,
    pickupAddress: job.pickupAddress, destinationAddress: job.destinationAddress,
    driverId: job.driverId || null, driverName: job.driverName || null, createdAt: job.createdAt,
    updatedAt: job.updatedAt || job.acceptedAt || null
  }));
  return { drivers, activeJobs, summary: {
    onlineDrivers: drivers.length,
    unassignedJobs: activeJobs.filter(job => job.status === 'requested').length,
    assignedJobs: activeJobs.filter(job => Boolean(job.driverId)).length
  }};
}

/** Aggregate dispatch outcomes for a driver without exposing customer data. */
export function summarizeDriverReliability(jobs, driverId) {
  const records = Array.isArray(jobs) ? jobs : [];
  const releases = records.reduce((total, job) => total + (Array.isArray(job.driverReleaseHistory) ? job.driverReleaseHistory.filter(entry => entry.driverId === driverId).length : 0), 0);
  const completed = records.filter(job => job.driverId === driverId && ['completed', 'delivered'].includes(job.status)).length;
  const engagements = completed + releases;
  return { completed, prePickupReleases: releases, engagements, reliabilityRate: engagements ? Math.round((completed / engagements) * 100) : null };
}
