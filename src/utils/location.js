let lastCoordinates = null;

export function getLastDetectedCoordinates() {
  return lastCoordinates;
}

export async function checkLocationPermissionState() {
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const res = await navigator.permissions.query({ name: 'geolocation' });
      return res.state; // 'granted' | 'prompt' | 'denied'
    }
  } catch (e) {
    // Some browsers don't support query for geolocation
  }
  return 'prompt';
}

export function getGpsFreshness(updatedAt, accuracy = null) {
  if (!updatedAt) {
    return { status: 'unknown', label: 'GPS fix pending', elapsed: null };
  }
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000));

  if (elapsedSeconds <= 45) {
    return {
      status: 'fresh',
      label: accuracy ? `Fresh GPS (±${Math.round(accuracy)}m)` : 'Fresh GPS signal',
      elapsed: elapsedSeconds
    };
  }

  if (elapsedSeconds <= 90) {
    return {
      status: 'stale',
      label: `Stale GPS (${elapsedSeconds}s ago)`,
      elapsed: elapsedSeconds
    };
  }

  return {
    status: 'expired',
    label: `GPS Signal Expired (>90s) · Excluded from dispatch`,
    elapsed: elapsedSeconds
  };
}

export async function fetchCurrentLocationCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        lastCoordinates = coords;
        resolve(coords);
      },
      (err) => {
        let msg = 'Could not get location coordinates.';
        if (err.code === 1) msg = 'Location access was denied. Please allow GPS permissions in your browser or phone settings.';
        else if (err.code === 2) msg = 'Location unavailable on your network or device.';
        else if (err.code === 3) msg = 'Location request timed out. Please check your phone GPS signal.';
        reject(new Error(msg));
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  });
}

export async function fetchCurrentLocationAddress() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        lastCoordinates = { lat: latitude, lng: longitude };
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            const parts = [
              a.suburb || a.neighbourhood || a.village || a.town || a.quarter,
              a.city || a.town || a.county || a.state_district,
              a.state || a.country
            ].filter(Boolean);
            if (parts.length > 0) {
              return resolve(parts.join(', '));
            }
            if (data.display_name) {
              return resolve(data.display_name.split(',').slice(0, 3).join(','));
            }
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        }
        resolve(`Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`);
      },
      (err) => {
        let msg = 'Could not get location.';
        if (err.code === 1) msg = 'Location access was denied. Please allow location permissions in your browser.';
        else if (err.code === 2) msg = 'Location unavailable on your network.';
        else if (err.code === 3) msg = 'Location request timed out.';
        reject(new Error(msg));
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  });
}

export const SRI_LANKA_PRESET_LOCATIONS = [
  { city: 'Colombo', name: 'Colombo 03 (Kollupitiya)', query: 'kollupitiya', coords: { lat: 6.9030, lng: 79.8510 } },
  { city: 'Colombo', name: 'Colombo 04 (Bambalapitiya)', query: 'bambalapitiya', coords: { lat: 6.8920, lng: 79.8560 } },
  { city: 'Colombo', name: 'Colombo 06 (Wellawatte)', query: 'wellawatte', coords: { lat: 6.8741, lng: 79.8606 } },
  { city: 'Colombo', name: 'Colombo 07 (Cinnamon Gardens)', query: 'cinnamon gardens', coords: { lat: 6.9110, lng: 79.8650 } },
  { city: 'Colombo', name: 'Dehiwala / Mount Lavinia', query: 'dehiwala', coords: { lat: 6.8520, lng: 79.8650 } },
  { city: 'Colombo', name: 'Nugegoda / Kotte', query: 'nugegoda', coords: { lat: 6.8650, lng: 79.8990 } },
  { city: 'Kandy', name: 'Kandy City Center', query: 'kandy', coords: { lat: 7.2906, lng: 80.6337 } },
  { city: 'Kandy', name: 'Peradeniya / Katugastota', query: 'peradeniya', coords: { lat: 7.2612, lng: 80.5966 } },
  { city: 'Galle', name: 'Galle Fort & Town', query: 'galle', coords: { lat: 6.0535, lng: 80.2210 } },
  { city: 'Jaffna', name: 'Jaffna Town / Nallur', query: 'jaffna', coords: { lat: 9.6615, lng: 80.0255 } },
  { city: 'Negombo', name: 'Negombo Beach & Town', query: 'negombo', coords: { lat: 7.2008, lng: 79.8736 } },
  { city: 'Batticaloa', name: 'Batticaloa Town', query: 'batticaloa', coords: { lat: 7.7102, lng: 81.6924 } },
  { city: 'Trincomalee', name: 'Trincomalee Town', query: 'trincomalee', coords: { lat: 8.5874, lng: 81.2152 } },
  { city: 'Matara', name: 'Matara City', query: 'matara', coords: { lat: 5.9549, lng: 80.5550 } },
  { city: 'Kurunegala', name: 'Kurunegala Town', query: 'kurunegala', coords: { lat: 7.4818, lng: 80.3609 } }
];

export function resolveCoordinates(locationString) {
  if (!locationString) return { lat: 6.9271, lng: 79.8612 };
  const lower = String(locationString).toLowerCase();
  for (const preset of SRI_LANKA_PRESET_LOCATIONS) {
    if (lower.includes(preset.query) || lower.includes(preset.city.toLowerCase())) {
      return preset.coords;
    }
  }
  return { lat: 6.9271, lng: 79.8612 };
}

export async function searchSriLankaLocationsApi(query) {
  const clean = String(query || '').trim();
  if (!clean || clean.length < 2) return [];

  // 1. Try our backend API first
  try {
    const res = await fetch(`/api/geo/search?q=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (e) {
    // Backend API unavailable or network issue, fallback to direct OSM
  }

  // 2. Direct OpenStreetMap Nominatim fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&countrycodes=lk&limit=8&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const items = await res.json();
      return items.map(item => {
        const addr = item.address || {};
        const name = item.display_name.split(',')[0].trim();
        const suburb = addr.suburb || addr.neighbourhood || addr.village || '';
        const city = addr.city || addr.town || addr.county || '';
        const district = addr.state_district || addr.county || '';
        const province = addr.state || '';
        return {
          id: String(item.place_id),
          name: name || item.display_name,
          displayName: item.display_name,
          suburb,
          city: city || district,
          district,
          province,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        };
      });
    }
  } catch (e) {
    console.warn('Direct Nominatim search fallback failed:', e);
  }

  // 3. Fallback to local preset matches
  const lower = clean.toLowerCase();
  return SRI_LANKA_PRESET_LOCATIONS
    .filter(p => p.name.toLowerCase().includes(lower) || p.city.toLowerCase().includes(lower))
    .map(p => ({
      id: p.name,
      name: p.name,
      displayName: `${p.name}, Sri Lanka`,
      suburb: '',
      city: p.city,
      district: '',
      province: '',
      lat: p.coords.lat,
      lng: p.coords.lng
    }));
}

export async function reverseGeocodeCoordsApi(lat, lng) {
  try {
    const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data.address) return data;
    }
  } catch (e) {}

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
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
      return { address, fullAddress: data.display_name, coords: { lat, lng } };
    }
  } catch (e) {}

  return { address: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, coords: { lat, lng } };
}
