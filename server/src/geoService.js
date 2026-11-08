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
  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(Number(distanceKm))) return null;
  if (distanceKm <= 0.8) return 10;
  // Sri Lankan urban average speed: ~22 km/h + 5 min dispatch/prep buffer
  const travelMinutes = Math.round((distanceKm / 22) * 60);
  return Math.max(10, travelMinutes + 5);
}

// Comprehensive Regional Coordinates for Sri Lankan Cities, Hubs & Suburbs
export const SRI_LANKA_REGIONAL_COORDINATES = {
  // Central Province (Kandy, Peradeniya, Katugastota, Katukele)
  'peradeniya': { lat: 7.2612, lng: 80.5966 },
  'katukele': { lat: 7.2920, lng: 80.6330 },
  'katugastota': { lat: 7.3245, lng: 80.6212 },
  'kandy': { lat: 7.2906, lng: 80.6337 },
  'central province': { lat: 7.2906, lng: 80.6337 },
  'nuwara eliya': { lat: 6.9497, lng: 80.7891 },
  'matale': { lat: 7.4675, lng: 80.6234 },

  // Western Province (Colombo, Gampaha, Kalutara)
  'bambalapitiya': { lat: 6.8920, lng: 79.8560 },
  'colombo 03': { lat: 6.8970, lng: 79.8550 },
  'colombo 04': { lat: 6.8850, lng: 79.8600 },
  'colombo 06': { lat: 6.8741, lng: 79.8606 },
  'colombo 07': { lat: 6.9110, lng: 79.8650 },
  'wellawatte': { lat: 6.8741, lng: 79.8606 },
  'kollupitiya': { lat: 6.9030, lng: 79.8510 },
  'nugegoda': { lat: 6.8650, lng: 79.8990 },
  'dehiwala': { lat: 6.8520, lng: 79.8650 },
  'mount lavinia': { lat: 6.8350, lng: 79.8650 },
  'moratuwa': { lat: 6.7730, lng: 79.8816 },
  'negombo': { lat: 7.2008, lng: 79.8736 },
  'gampaha': { lat: 7.0840, lng: 79.9939 },
  'kalutara': { lat: 6.5854, lng: 79.9607 },
  'colombo': { lat: 6.9271, lng: 79.8612 },
  'western province': { lat: 6.9271, lng: 79.8612 },

  // Southern Province (Galle, Matara, Hambantota)
  'galle': { lat: 6.0535, lng: 80.2210 },
  'unawatuna': { lat: 6.0104, lng: 80.2497 },
  'matara': { lat: 5.9549, lng: 80.5550 },
  'southern province': { lat: 6.0535, lng: 80.2210 },

  // Northern Province (Jaffna, Nallur, Kilinochchi)
  'nallur': { lat: 9.6740, lng: 80.0290 },
  'jaffna': { lat: 9.6615, lng: 80.0255 },
  'chavakachcheri': { lat: 9.6582, lng: 80.1584 },
  'northern province': { lat: 9.6615, lng: 80.0255 },

  // Eastern Province (Batticaloa, Trincomalee, Ampara)
  'batticaloa': { lat: 7.7102, lng: 81.6924 },
  'trincomalee': { lat: 8.5874, lng: 81.2152 },
  'eastern province': { lat: 7.7102, lng: 81.6924 },

  // North Western & North Central
  'kurunegala': { lat: 7.4818, lng: 80.3609 },
  'anuradhapura': { lat: 8.3114, lng: 80.4037 },
  'badulla': { lat: 6.9934, lng: 81.0550 },
  'ratnapura': { lat: 6.6828, lng: 80.4036 }
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

/**
 * Optional road route provider. Configure ROUTING_BASE_URL with a self-hosted
 * OSRM-compatible service; no public demo routing endpoint is assumed.
 */
export async function getRoadRoute(origin, destination) {
  const base = String(process.env.ROUTING_BASE_URL || '').trim().replace(/\/$/, '');
  if (!base) return { available: false, reason: 'routing_not_configured' };
  let parsed;
  try { parsed = new URL(base); } catch { return { available: false, reason: 'invalid_routing_configuration' }; }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    return { available: false, reason: 'routing_requires_https' };
  }
  const points = [origin, destination].map(point => ({
    lat: Number(point?.lat), lng: Number(point?.lng)
  }));
  if (points.some(point => !Number.isFinite(point.lat) || !Number.isFinite(point.lng) ||
    point.lat < 5.8 || point.lat > 10.1 || point.lng < 79 || point.lng > 82.2)) {
    return { available: false, reason: 'invalid_coordinates' };
  }
  const url = new URL(`${base}/route/v1/driving/${points[0].lng},${points[0].lat};${points[1].lng},${points[1].lat}`);
  url.searchParams.set('overview', 'false');
  url.searchParams.set('steps', 'false');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return { available: false, reason: 'routing_provider_unavailable' };
    const data = await response.json();
    const route = data?.code === 'Ok' && Array.isArray(data.routes) ? data.routes[0] : null;
    if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
      return { available: false, reason: 'route_not_found' };
    }
    return {
      available: true,
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      provider: 'OSRM-compatible routing service'
    };
  } catch {
    return { available: false, reason: 'routing_provider_unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}


// In-memory caches for fast autocomplete & reverse geocoding
const geoSearchCache = new Map();
const geoReverseCache = new Map();

export async function searchSriLankaLocations(query, limit = 8) {
  const clean = String(query || '').trim();
  if (!clean || clean.length < 2) return [];

  const cacheKey = clean.toLowerCase();
  if (geoSearchCache.has(cacheKey)) {
    return geoSearchCache.get(cacheKey);
  }

  // 1. Search OpenStreetMap Nominatim with Sri Lanka boundary & country filter
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(clean) + '&countrycodes=lk&limit=' + limit + '&addressdetails=1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ARY-Services-Platform/2.0' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const results = data.map(item => {
          const addr = item.address || {};
          const name = item.display_name.split(',')[0].trim();
          const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.quarter || '';
          const city = addr.city || addr.town || addr.municipality || '';
          const district = addr.state_district || addr.county || '';
          const province = addr.state || '';
          const postcode = addr.postcode || '';

          const displayParts = [name, suburb, city, district, province].filter(Boolean);
          const cleanDisplayName = [...new Set(displayParts)].join(', ');

          return {
            id: String(item.place_id || Math.random()),
            name: name || item.display_name,
            displayName: cleanDisplayName || item.display_name,
            suburb,
            city: city || district,
            district,
            province,
            postcode,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type || 'place'
          };
        });

        geoSearchCache.set(cacheKey, results);
        return results;
      }
    }
  } catch (err) {
    console.warn('Nominatim search warning:', err.message);
  }

  // 2. Fallback to regional coordinates database
  const fallback = [];
  const lowerQuery = clean.toLowerCase();
  for (const [name, coords] of Object.entries(SRI_LANKA_REGIONAL_COORDINATES)) {
    if (name.includes(lowerQuery) || lowerQuery.includes(name)) {
      const titleCase = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      fallback.push({
        id: 'preset-' + name,
        name: titleCase,
        displayName: titleCase + ', Sri Lanka',
        suburb: '',
        city: titleCase,
        district: '',
        province: '',
        lat: coords.lat,
        lng: coords.lng,
        type: 'preset'
      });
      if (fallback.length >= limit) break;
    }
  }

  return fallback;
}

export async function reverseGeocodeLocation(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { address: 'Colombo, Western Province, Sri Lanka', coords: { lat: 6.9271, lng: 79.8612 } };
  }

  const cacheKey = latitude.toFixed(4) + ',' + longitude.toFixed(4);
  if (geoReverseCache.has(cacheKey)) {
    return geoReverseCache.get(cacheKey);
  }

  try {
    const url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + latitude + '&lon=' + longitude + '&zoom=16&addressdetails=1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ARY-Services-Platform/2.0' }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian,
        addr.suburb || addr.neighbourhood || addr.village || addr.quarter,
        addr.city || addr.town || addr.county || addr.state_district,
        addr.state
      ].filter(Boolean);

      const address = parts.length > 0 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(',') || 'Sri Lanka');
      const result = {
        address,
        fullAddress: data.display_name,
        coords: { lat: latitude, lng: longitude },
        details: addr
      };
      geoReverseCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('Reverse geocode warning:', err.message);
  }

  return {
    address: latitude.toFixed(4) + ', ' + longitude.toFixed(4) + ', Sri Lanka',
    coords: { lat: latitude, lng: longitude }
  };
}
