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
    if (a.driverId && !b.driverId) return -1;
    if (b.driverId && !a.driverId) return 1;
    if (a.distanceKm === null) return 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}
