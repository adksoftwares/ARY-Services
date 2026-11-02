import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  ShoppingBag,
  Zap,
  Utensils,
  Package,
  Car,
  Star,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCurrentLocationAddress, getLastDetectedCoordinates } from '../../utils/location';
import { Button } from '../../design-system';
import { useT } from '../../utils/i18n';

export default function HeroSection({
  address,
  setAddress,
  query,
  setQuery,
  onNotice,
  onSearch,
  onLocationDetected
}) {
  const { isCustomerLoggedIn, openAuthModal } = useAuth();
  const { t } = useT();
  const [isLocating, setIsLocating] = useState(false);

  async function handleDetectLocation() {
    setIsLocating(true);
    try {
      const loc = await fetchCurrentLocationAddress();
      setAddress(loc);
      const coords = getLastDetectedCoordinates();
      if (onLocationDetected && coords) {
        onLocationDetected(coords);
      }
      if (onNotice) onNotice(`Location updated: ${loc}`);
    } catch (err) {
      if (onNotice) onNotice(err.message || 'Could not retrieve current location.');
    } finally {
      setIsLocating(false);
    }
  }

  const QUICK_CHIPS = [
    { label: 'Electrical Repair', icon: Zap, query: 'electrical' },
    { label: 'Plumbing', icon: Wrench, query: 'plumbing' },
    { label: 'Grocery Products', icon: ShoppingBag, query: 'grocery' },
    { label: 'Food Delivery', icon: Utensils, query: 'food' },
    { label: 'Parcel Courier', icon: Package, query: 'parcel' },
    { label: 'Ride Trip', icon: Car, query: 'ride' }
  ];

  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-badge-pill">
          <Sparkles size={13} className="hero-badge-icon" />
          <span>SRI LANKA'S TRUSTED SERVICE & MOBILITY NETWORK</span>
        </div>

        <h1>
          {t('heroTitle', 'Good help is closer than you think.')}
        </h1>
        <p>{t('heroSubtitle', 'Discover local shops, verified tradespeople, rides, and reliable delivery across Sri Lanka.')}</p>

        <div className="search-panel">
          <label className="search-field">
            <MapPin size={18} className="search-field-icon" />
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Your area (e.g. Colombo 03)"
              aria-label="Your location or area"
            />
            <button
              type="button"
              className="search-locate-btn"
              onClick={handleDetectLocation}
              disabled={isLocating}
              title="Use current GPS location"
              aria-label="Detect my current location"
            >
              <Navigation size={15} className={isLocating ? 'spin' : ''} />
            </button>
          </label>

          <label className="search-field service-search">
            <Search size={18} className="search-field-icon" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder', 'What service do you need?')}
              aria-label="Service or shop keyword"
            />
          </label>

          <Button
            variant="primary"
            size="md"
            className="search-button"
            onClick={() => {
              if (onSearch) onSearch();
              else if (onNotice) onNotice('Showing services matching your search.');
            }}
          >
            {t('findServices', 'Find services')}
          </Button>
        </div>

        {/* Quick Discovery Chips with Lucide Icons */}
        <div className="hero-quick-chips" role="group" aria-label="Quick Category Filters">
          <span className="quick-chips-label">Popular:</span>
          {QUICK_CHIPS.map(chip => {
            const Icon = chip.icon;
            const isActive = query.toLowerCase().includes(chip.query);
            return (
              <button
                key={chip.label}
                type="button"
                className={`quick-chip-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setQuery(chip.label);
                  if (['parcel', 'ride', 'food'].includes(chip.query)) {
                    const mobEl = document.getElementById('mobility-services') || document.getElementById('mobility-section');
                    if (mobEl) mobEl.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    const srvEl = document.querySelector('.services-section');
                    if (srvEl) srvEl.scrollIntoView({ behavior: 'smooth' });
                  }
                  if (onSearch) onSearch();
                }}
              >
                <Icon size={14} className="chip-icon" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {!isCustomerLoggedIn && (
          <div className="sign-in-prompt-card">
            <div className="sign-in-prompt-info">
              <span className="prompt-icon-badge"><Lock size={18} /></span>
              <div>
                <b>Direct Sign In & Instant Booking</b>
                <small>Explore freely. Sign in with Phone & Password to confirm bookings and track drivers in real time.</small>
              </div>
            </div>
            <div className="sign-in-prompt-actions">
              <Button
                variant="primary"
                size="sm"
                iconRight={ArrowRight}
                onClick={() => openAuthModal('login')}
              >
                Sign in
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openAuthModal('register')}
              >
                Join ARY
              </Button>
            </div>
          </div>
        )}

        <div className="trust-row">
          <span><ShieldCheck size={16} /> 100% Verified Sri Lankan Providers</span>
          <span><Clock size={16} /> 14-Day Service Guarantee</span>
          <span><CheckCircle2 size={16} /> Secure PIN Handoff</span>
        </div>
      </div>

      {/* Refined Trust Showcase Card instead of giant monogram */}
      <div className="hero-visual-card" aria-hidden="true">
        <div className="hero-showcase-card">
          <div className="hero-showcase-header">
            <div className="hero-provider-avatar">
              <Wrench size={20} />
            </div>
            <div className="hero-provider-info">
              <div className="hero-provider-name">Verified Electrical & Plumbing</div>
              <div className="hero-provider-meta">
                <span className="hero-rating"><Star size={13} fill="currentColor" /> 4.9 (120+ reviews)</span>
                <span className="hero-dot-separator">•</span>
                <span className="hero-avail">Available Today</span>
              </div>
            </div>
            <span className="hero-verified-badge"><ShieldCheck size={14} /> Verified</span>
          </div>

          <div className="hero-showcase-middle">
            <div className="hero-stat-pill">
              <span className="stat-label">Starting at</span>
              <span className="stat-val">LKR 1,800</span>
            </div>
            <div className="hero-stat-pill">
              <span className="stat-label">Avg Arrival</span>
              <span className="stat-val">30 mins</span>
            </div>
            <div className="hero-stat-pill">
              <span className="stat-label">Warranty</span>
              <span className="stat-val">14 Days</span>
            </div>
          </div>

          <div className="hero-showcase-footer">
            <span className="hero-pin-note"><Lock size={13} /> Driver & delivery protected with 4-digit PIN handoff</span>
          </div>
        </div>
      </div>
    </section>
  );
}
