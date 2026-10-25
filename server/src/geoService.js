// Geospatial Distance & ETA Engine (Haversine Spherical Trigonometry)
// Computes real-time kilometer distances and estimated arrival times for Sri Lankan urban areas.

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const p1 = Number(lat1);
  const l1 = Number(lon1);
  const p2 = Number(lat2);
  const l2 = Number(lon2);

  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) {
    return null;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = (p2 - p1) * (Math.PI / 180);
  const dLon = (l2 - l1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1 * (Math.PI / 180)) * Math.cos(p2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place (e.g. 1.8 km)
}

export function estimateEtaMinutes(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) return 20;
  if (distanceKm <= 0.8) return 10;
  // Sri Lankan urban average speed: ~22 km/h + 5 min dispatch/prep buffer
  const travelMinutes = Math.round((distanceKm / 22) * 60);
  return Math.max(10, travelMinutes + 5);
}

// Default Coordinates for Sri Lankan Hubs (Colombo / Western Province)
export const SRI_LANKA_REGIONAL_COORDINATES = {
  'bambalapitiya': { lat: 6.8920, lng: 79.8560 },
  'colombo 03': { lat: 6.8970, lng: 79.8550 },
  'colombo 04': { lat: 6.8850, lng: 79.8600 },
  'colombo': { lat: 6.9271, lng: 79.8612 },
  'nugegoda': { lat: 6.8650, lng: 79.8990 },
  'dehiwala': { lat: 6.8520, lng: 79.8650 },
  'mount lavinia': { lat: 6.8350, lng: 79.8650 },
  'kollupitiya': { lat: 6.9030, lng: 79.8510 }
};

export function resolveCoordinatesFromLocation(locationString) {
  if (!locationString) return { lat: 6.9271, lng: 79.8612 };
  const lower = locationString.toLowerCase();
  for (const [key, coords] of Object.entries(SRI_LANKA_REGIONAL_COORDINATES)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  return { lat: 6.9271, lng: 79.8612 }; // Default Colombo Center
}
