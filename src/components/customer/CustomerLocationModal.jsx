import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  X,
  Check,
  Building,
  Compass,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  fetchCurrentLocationAddress,
  fetchCurrentLocationCoords,
  getLastDetectedCoordinates,
  SRI_LANKA_PRESET_LOCATIONS,
  resolveCoordinates
} from '../../utils/location';

export default function CustomerLocationModal({
  isOpen,
  onClose,
  currentAddress,
  onSelectLocation,
  onNotice
}) {
  const [isLocating, setIsLocating] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');

  if (!isOpen) return null;

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

  function handleCustomSubmit(e) {
    e.preventDefault();
    const clean = customInput.trim();
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

  const cities = ['All', 'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Batticaloa'];
  const filteredPresets = selectedCity === 'All'
    ? SRI_LANKA_PRESET_LOCATIONS
    : SRI_LANKA_PRESET_LOCATIONS.filter(p => p.city.toLowerCase() === selectedCity.toLowerCase());

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-card location-picker-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Change delivery and service location"
        style={{ maxWidth: '540px', width: '92%' }}
      >
        {/* Header */}
        <div className="modal-header">
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
                <MapPin size={12} /> SERVICE AREA
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                Sri Lanka
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Choose Your Location</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>
              Select where you need tradespeople, grocery delivery, and mobility services.
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Current Active Location Display */}
        {currentAddress && (
          <div style={{
            background: 'var(--surface-muted, rgba(22, 101, 52, 0.08))',
            border: '1px solid var(--border-subtle, rgba(22, 101, 52, 0.2))',
            borderRadius: '10px',
            padding: '10px 14px',
            margin: '0 0 16px',
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
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Current active location
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {currentAddress}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', flexShrink: 0 }}>
              Active
            </span>
          </div>
        )}

        {/* Quick GPS Auto-Detect Button */}
        <button
          type="button"
          onClick={handleGpsDetect}
          disabled={isLocating}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #15803d, #166534)',
            color: 'white',
            fontWeight: 700,
            fontSize: '14px',
            cursor: isLocating ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(21, 128, 61, 0.25)',
            marginBottom: '18px',
            transition: 'all 0.2s ease'
          }}
        >
          <Navigation size={18} className={isLocating ? 'spin' : ''} />
          <span>{isLocating ? 'Detecting current GPS location...' : '🎯 Use Current GPS Location'}</span>
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '0 0 16px',
          color: 'var(--text-muted, #94a3b8)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle, #e2e8f0)' }} />
          <span>Or enter custom address</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle, #e2e8f0)' }} />
        </div>

        {/* Custom Location Search Form */}
        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: 8, marginBottom: '20px' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--surface-primary, #ffffff)',
            border: '1px solid var(--border-subtle, #cbd5e1)',
            borderRadius: '10px'
          }}>
            <Search size={16} color="var(--text-muted, #94a3b8)" />
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              placeholder="e.g. Wellawatte, Colombo 06 or Kandy Town"
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: 'var(--text-primary, #0f172a)'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!customInput.trim()}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: customInput.trim() ? 'var(--brand-primary, #15803d)' : 'var(--surface-muted, #e2e8f0)',
              color: customInput.trim() ? 'white' : 'var(--text-muted, #94a3b8)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: customInput.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Apply <ArrowRight size={14} />
          </button>
        </form>

        {/* Popular Locations in Sri Lanka */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              Popular Sri Lankan Areas
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
              1-click select
            </span>
          </div>

          {/* City filter tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
            {cities.map(city => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: selectedCity === city ? 'var(--brand-primary, #15803d)' : 'var(--border-subtle, #e2e8f0)',
                  background: selectedCity === city ? 'var(--brand-primary, #15803d)' : 'var(--surface-primary, #ffffff)',
                  color: selectedCity === city ? 'white' : 'var(--text-secondary, #475569)',
                  fontSize: '12px',
                  fontWeight: selectedCity === city ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Preset Chips Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 8,
            maxHeight: '180px',
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
                  <MapPin size={14} color={isActive ? '#15803d' : '#64748b'} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #0f172a)', display: 'block', lineHeight: 1.3 }}>
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
    </div>
  );
}
