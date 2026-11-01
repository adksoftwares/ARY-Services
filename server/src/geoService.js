// Geospatial helpers. Unknown addresses deliberately return null: never invent a Colombo
// location for a customer or provider whose coordinates are not known.
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const values = [lat1, lon1, lat2, lon2].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const [p1, l1, p2, l2] = values;
  if (Math.abs(p1) > 90 || Math.abs(p2) > 90 || Math.abs(l1) > 180 || Math.abs(l2) > 180) return null;
  const radians = Math.PI / 180;
  const dLat = (p2 - p1) * radians;
  const dLon = (l2 - l1) * radians;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(p1 * radians) * Math.cos(p2 * radians) * Math.sin(dLon / 2) ** 2;
  const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return Math.round(distance * 10) / 10;
}

export function estimateEtaMinutes(distanceKm, averageSpeedKmh = 22, dispatchBufferMinutes = 5) {
  const distance = Number(distanceKm);
  const speed = Number(averageSpeedKmh);
  const buffer = Number(dispatchBufferMinutes);
  if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(speed) || speed <= 0
    || !Number.isFinite(buffer) || buffer < 0) return null;
  return Math.max(1, Math.ceil((distance / speed) * 60 + buffer));
}

export const SRI_LANKA_REGIONAL_COORDINATES = Object.freeze({
  'bambalapitiya': { lat: 6.8920, lng: 79.8560 },
  'colombo 03': { lat: 6.8970, lng: 79.8550 },
  'colombo 04': { lat: 6.8850, lng: 79.8600 },
  'colombo': { lat: 6.9271, lng: 79.8612 },
  'nugegoda': { lat: 6.8650, lng: 79.8990 },
  'dehiwala': { lat: 6.8520, lng: 79.8650 },
  'mount lavinia': { lat: 6.8350, lng: 79.8650 },
  'kollupitiya': { lat: 6.9030, lng: 79.8510 }
});

export function resolveCoordinatesFromLocation(locationString) {
  if (typeof locationString !== 'string' || !locationString.trim()) return null;
  const lower = locationString.toLowerCase();
  const match = Object.entries(SRI_LANKA_REGIONAL_COORDINATES)
    .sort(([a], [b]) => b.length - a.length)
    .find(([key]) => lower.includes(key));
  return match ? { ...match[1] } : null;
}
