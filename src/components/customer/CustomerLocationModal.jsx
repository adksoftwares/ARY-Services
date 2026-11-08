import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  X,
  Check,
  Building,
  Compass,
  Sparkles,
  ArrowRight,
  Map,
  Loader2,
  Crosshair
} from 'lucide-react';
import {
  fetchCurrentLocationAddress,
  fetchCurrentLocationCoords,
  getLastDetectedCoordinates,
  SRI_LANKA_PRESET_LOCATIONS,
  resolveCoordinates,
  searchSriLankaLocationsApi
} from '../../utils/location';
import InteractiveMapPicker from './InteractiveMapPicker';

export default function CustomerLocationModal({
  isOpen,
  onClose,
  currentAddress,
  onSelectLocation,
  onNotice
}) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'map'
  const [isLocating, setIsLocating] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All');

  const searchDebounceRef = useRef(null);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchInput('');
      setSearchResults([]);
      setIsSearching(false);
      setActiveTab('search');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Live Google Maps-like autosuggestion as user types
  function handleSearchChange(val) {
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!val.trim() || val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchSriLankaLocationsApi(val.trim());
        setSearchResults(results);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  }

  async function handleGpsDetect() {
    setIsLocating(true);
    try {
      const address = await fetchCurrentLocationAddress();
      const coords = getLastDetectedCoordinates() || await fetchCurrentLocationCoords().catch(() => null);
      onSelectLocation(address, coords || resolveCoordinates(address));
      if (onNotice) onNotice(`📍 Current location detected: ${address}`);
      onClose();
    } catch (err) {
      if (onNotice) onNotice(err.message || 'Could not retrieve GPS location.');
    } finally {
      setIsLocating(false);
    }
  }

  function handleSelectResult(item) {
    const coords = { lat: item.lat, lng: item.lng };
    const label = item.displayName || item.name;
    onSelectLocation(label, coords);
    if (onNotice) onNotice(`📍 Location selected: ${label}`);
    onClose();
  }

  function handleCustomSubmit(e) {
    e.preventDefault();
    const clean = searchInput.trim();
    if (!clean) return;
    const coords = resolveCoordinates(clean);
    onSelectLocation(clean, coords);
    if (onNotice) onNotice(`📍 Location updated to: ${clean}`);
    onClose();
  }

  function handleSelectPreset(preset) {
    onSelectLocation(preset.name, preset.coords);
    if (onNotice) onNotice(`📍 Location set to: ${preset.name}`);
    onClose();
  }

  function handleMapConfirmed(chosenAddress, chosenCoords) {
    onSelectLocation(chosenAddress, chosenCoords);
    if (onNotice) onNotice(`📍 Location set on map: ${chosenAddress}`);
    onClose();
  }

  const cities = ['All', 'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Batticaloa', 'Matara', 'Kurunegala'];
  const filteredPresets = selectedCity === 'All'
    ? SRI_LANKA_PRESET_LOCATIONS
    : SRI_LANKA_PRESET_LOCATIONS.filter(p => p.city.toLowerCase() === selectedCity.toLowerCase());

  // Determine starting coordinates for the map
  const activeCoords = resolveCoordinates(currentAddress);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-card location-picker-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Change delivery and service location"
        style={{
          maxWidth: activeTab === 'map' ? '640px' : '560px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.25s ease'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                background: 'var(--brand-primary, #15803d)',
                color: 'white',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <MapPin size={12} /> SRI LANKA SERVICE NETWORK
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Island-wide Coverage
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Choose Your Location</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>
              Search any place in Sri Lanka or fetch & pin on the interactive map.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs: Search vs Interactive Map */}
        <div style={{
          display: 'flex',
          gap: 6,
          background: 'var(--surface-muted, #f1f5f9)',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: 14
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'search' ? '#ffffff' : 'transparent',
              color: activeTab === 'search' ? 'var(--brand-primary, #15803d)' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'search' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Search size={15} />
            <span>Search Any Location</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'map' ? '#ffffff' : 'transparent',
              color: activeTab === 'map' ? 'var(--brand-primary, #15803d)' : 'var(--text-secondary, #64748b)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: activeTab === 'map' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Map size={15} />
            <span>Fetch on Map</span>
          </button>
        </div>

        {/* TAB 1: SEARCH MODE (Google Maps Autocomplete) */}
        {activeTab === 'search' && (
          <div style={{ overflowY: 'auto', paddingRight: 2 }}>
            {/* Current Active Location Display */}
            {currentAddress && (
              <div style={{
                background: 'var(--surface-muted, rgba(22, 101, 52, 0.08))',
                border: '1px solid var(--border-subtle, rgba(22, 101, 52, 0.2))',
                borderRadius: '10px',
                padding: '10px 14px',
                margin: '0 0 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                    flexShrink: 0
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                      Current active location
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {currentAddress}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'none',
                    border: 'none',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    padding: 0
                  }}
                >
                  <Map size={13} /> View on Map
                </button>
              </div>
            )}

            {/* Quick Action Buttons: Auto GPS & Fetch on Map */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={handleGpsDetect}
                disabled={isLocating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #15803d, #166534)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: isLocating ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(21, 128, 61, 0.2)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Navigation size={15} className={isLocating ? 'spin' : ''} />
                <span>{isLocating ? 'Detecting GPS...' : '🎯 Auto GPS'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('map')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  background: 'var(--surface-primary, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Compass size={15} color="#15803d" />
                <span>🗺️ Pick on Map</span>
              </button>
            </div>

            {/* Google Maps-Style Sri Lanka Search Box */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'var(--surface-primary, #ffffff)',
                  border: '2px solid',
                  borderColor: searchInput ? 'var(--brand-primary, #15803d)' : 'var(--border-subtle, #cbd5e1)',
                  borderRadius: '10px',
                  boxShadow: searchInput ? '0 0 0 3px rgba(21, 128, 61, 0.12)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  <Search size={16} color={searchInput ? '#15803d' : '#94a3b8'} />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Search any town, street or landmark in Sri Lanka..."
                    autoFocus
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '13.5px',
                      color: 'var(--text-primary, #0f172a)',
                      fontWeight: 500
                    }}
                  />
                  {isSearching && <Loader2 size={16} className="spin" color="#15803d" />}
                  {searchInput && !isSearching && (
                    <button
                      type="button"
                      onClick={() => { setSearchInput(''); setSearchResults([]); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      aria-label="Clear search input"
                    >
                      <X size={16} color="#94a3b8" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!searchInput.trim()}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: searchInput.trim() ? 'var(--brand-primary, #15803d)' : 'var(--surface-muted, #e2e8f0)',
                    color: searchInput.trim() ? 'white' : 'var(--text-muted, #94a3b8)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: searchInput.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Apply <ArrowRight size={14} />
                </button>
              </form>

              {/* Instant Autocomplete Suggestions List */}
              {searchResults.length > 0 && (
                <div style={{
                  marginTop: 6,
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  borderRadius: '10px',
                  background: 'var(--surface-primary, #ffffff)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', background: 'var(--surface-muted, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    Sri Lanka Place Suggestions ({searchResults.length})
                  </div>
                  {searchResults.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item)}
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
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.displayName}
                        </div>
                      </div>
                      <span style={{ fontSize: '10.5px', color: '#15803d', fontWeight: 600, background: 'rgba(21,128,61,0.08)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                        Select ↵
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Sri Lankan Areas Quick Select */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                  Popular Cities & Hubs
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                  1-click select
                </span>
              </div>

              {/* City Filter Pills */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 8 }}>
                {cities.map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid',
                      borderColor: selectedCity === city ? 'var(--brand-primary, #15803d)' : 'var(--border-subtle, #e2e8f0)',
                      background: selectedCity === city ? 'var(--brand-primary, #15803d)' : 'var(--surface-primary, #ffffff)',
                      color: selectedCity === city ? 'white' : 'var(--text-secondary, #475569)',
                      fontSize: '11.5px',
                      fontWeight: selectedCity === city ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Preset Cards Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 8,
                maxHeight: '170px',
                overflowY: 'auto',
                paddingRight: 4
              }}>
                {filteredPresets.map(preset => {
                  const isActive = currentAddress && currentAddress.toLowerCase().includes(preset.query);
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--brand-primary, #15803d)' : 'var(--border-subtle, #e2e8f0)',
                        background: isActive ? 'var(--surface-muted, rgba(22, 101, 52, 0.08))' : 'var(--surface-primary, #ffffff)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <MapPin size={13} color={isActive ? '#15803d' : '#64748b'} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', display: 'block', lineHeight: 1.3 }}>
                          {preset.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)' }}>
                          {preset.city}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE MAP PICKER MODE ("fetch on the map") */}
        {activeTab === 'map' && (
          <InteractiveMapPicker
            initialCoords={activeCoords}
            initialAddress={currentAddress}
            onConfirmLocation={handleMapConfirmed}
            onCancel={() => setActiveTab('search')}
          />
        )}
      </div>
    </div>
  );
}
