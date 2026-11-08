import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Search,
  Check,
  X,
  Compass,
  Loader2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  reverseGeocodeCoordsApi,
  searchSriLankaLocationsApi,
  fetchCurrentLocationCoords
} from '../../utils/location';

export default function InteractiveMapPicker({
  initialCoords = { lat: 7.2906, lng: 80.6337 }, // Default Kandy
  initialAddress = '',
  onConfirmLocation,
  onCancel
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState(initialCoords);
  const [address, setAddress] = useState(initialAddress || 'Resolving location on map...');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Map search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Reverse geocode when position changes
  const updatePinnedPosition = useCallback(async (lat, lng, label = null) => {
    setCoords({ lat, lng });
    if (label) {
      setAddress(label);
      return;
    }
    setIsReverseGeocoding(true);
    try {
      const res = await reverseGeocodeCoordsApi(lat, lng);
      setAddress(res.address || `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } catch (e) {
      setAddress(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const startLat = Number.isFinite(initialCoords?.lat) ? initialCoords.lat : 7.2906;
    const startLng = Number.isFinite(initialCoords?.lng) ? initialCoords.lng : 80.6337;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 14,
      zoomControl: false // custom controls
    });
    mapInstanceRef.current = map;

    // Fast, crisp OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Custom pulse map pin
    const pinIcon = L.divIcon({
      className: 'ary-leaflet-marker',
      html: `
        <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:grab;">
          <div style="position:absolute; width:36px; height:36px; border-radius:50%; background:rgba(21,128,61,0.28); animation:pulse 1.8s infinite;"></div>
          <div style="width:28px; height:28px; border-radius:50% 50% 50% 0; background:#15803d; border:2.5px solid white; transform:rotate(-45deg); box-shadow:0 4px 12px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center;">
            <div style="width:8px; height:8px; border-radius:50%; background:white; transform:rotate(45deg);"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 34]
    });

    const marker = L.marker([startLat, startLng], {
      icon: pinIcon,
      draggable: true,
      autoPan: true
    }).addTo(map);
    markerRef.current = marker;

    // On Drag
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updatePinnedPosition(pos.lat, pos.lng);
    });

    // On Map Click
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      updatePinnedPosition(e.latlng.lat, e.latlng.lng);
    });

    // Invalidate map size after DOM mount
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (!initialAddress) {
        updatePinnedPosition(startLat, startLng);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);

  // Handle GPS detection on map
  async function handleMapGpsDetect() {
    setIsLocatingGps(true);
    try {
      const current = await fetchCurrentLocationCoords();
      if (current && mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.flyTo([current.lat, current.lng], 16, { animate: true, duration: 1 });
        markerRef.current.setLatLng([current.lat, current.lng]);
        await updatePinnedPosition(current.lat, current.lng);
      }
    } catch (e) {
      console.warn('Map GPS error:', e);
    } finally {
      setIsLocatingGps(false);
    }
  }

  // Handle Search on Map
  function handleSearchInputChange(val) {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchSriLankaLocationsApi(val.trim());
        setSearchResults(results);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 320);
  }

  function handleSelectSearchResult(result) {
    const targetLat = result.lat;
    const targetLng = result.lng;
    setSearchQuery('');
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([targetLat, targetLng], 16, { animate: true, duration: 1.2 });
      markerRef.current.setLatLng([targetLat, targetLng]);
      updatePinnedPosition(targetLat, targetLng, result.displayName || result.name);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '460px' }}>
      {/* Floating Map Search & GPS bar */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface-primary, #ffffff)',
          border: '1px solid var(--border-subtle, #cbd5e1)',
          borderRadius: '10px',
          padding: '8px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <Search size={16} color="var(--text-muted, #94a3b8)" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchInputChange(e.target.value)}
            placeholder="Search town, street or landmark on map..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--text-primary, #0f172a)'
            }}
          />
          {isSearching && <Loader2 size={15} className="spin" color="#15803d" />}
          {searchQuery && !isSearching && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={15} color="#94a3b8" />
            </button>
          )}
          <button
            type="button"
            onClick={handleMapGpsDetect}
            disabled={isLocatingGps}
            title="Fetch my current GPS position"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(21, 128, 61, 0.1)',
              color: '#15803d',
              fontWeight: 700,
              fontSize: '11px',
              cursor: isLocatingGps ? 'wait' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Navigation size={12} className={isLocatingGps ? 'spin' : ''} />
            <span>{isLocatingGps ? 'Locating...' : 'Locate GPS'}</span>
          </button>
        </div>

        {/* Live Search Suggestions Dropdown */}
        {searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--surface-primary, #ffffff)',
            border: '1px solid var(--border-subtle, #cbd5e1)',
            borderRadius: '10px',
            marginTop: 4,
            maxHeight: '220px',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}>
            {searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectSearchResult(item)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-muted, #f8fafc)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <MapPin size={16} color="#15803d" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.displayName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map View */}
      <div style={{ position: 'relative', flex: 1, minHeight: '280px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle, #cbd5e1)' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '280px' }} />

        {/* Map Instructions Badge */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 400,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'none'
        }}>
          <Compass size={12} color="#10b981" />
          <span>Click map or drag pin to position</span>
        </div>

        {/* Custom Map Zoom Controls */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              border: 'none',
              background: 'white',
              color: '#0f172a',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              border: 'none',
              background: 'white',
              color: '#0f172a',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
        </div>
      </div>

      {/* Selected Location Summary Card & Confirm Button */}
      <div style={{
        marginTop: 12,
        background: 'var(--surface-muted, #f8fafc)',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: '12px',
        padding: '12px 14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
            <MapPin size={16} color="#15803d" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', fontWeight: 700, display: 'block' }}>
                PINNED LOCATION
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', display: 'block', lineHeight: 1.3 }}>
                {isReverseGeocoding ? 'Reverse geocoding address...' : address}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: 2, display: 'block' }}>
                Coordinates: {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
              </span>
            </div>
          </div>
          {isReverseGeocoding && <Loader2 size={16} className="spin" color="#15803d" />}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'transparent',
                color: 'var(--text-secondary, #475569)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirmLocation && onConfirmLocation(address, coords)}
            disabled={isReverseGeocoding}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #15803d, #166534)',
              color: 'white',
              fontWeight: 700,
              fontSize: '13px',
              cursor: isReverseGeocoding ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(21, 128, 61, 0.25)'
            }}
          >
            <Check size={16} />
            <span>Confirm & Set This Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}
