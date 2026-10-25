let lastCoordinates = null;

export function getLastDetectedCoordinates() {
  return lastCoordinates;
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
        if (err.code === 1) msg = 'Location access was denied.';
        else if (err.code === 2) msg = 'Location unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        reject(new Error(msg));
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 }
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
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  });
}
