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

export function rankJobsForDriver(jobs, presence, now = Date.now()) {
  const fresh = isDriverPresenceFresh(presence, now);
  return jobs.map(job => {
    const targetLat = job.serviceType === 'food_delivery' ? job.destinationLat : job.pickupLat;
    const targetLng = job.serviceType === 'food_delivery' ? job.destinationLng : job.pickupLng;
    const target = cleanSriLankaCoordinates(targetLat, targetLng);
    const distanceKm = fresh && target ? calculateDistanceKm(presence.lat, presence.lng, target.lat, target.lng) : null;
    return { ...job, distanceKm, etaMinutes: distanceKm === null ? null : estimateEtaMinutes(distanceKm) };
  }).sort((a, b) => {
    const aAssigned = Boolean(a.driverId);
    const bAssigned = Boolean(b.driverId);
    if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
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
