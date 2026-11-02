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
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCurrentLocationAddress, getLastDetectedCoordinates } from '../../utils/location';
import { Button, Avatar, Badge } from '../../design-system';
import { useT } from '../../utils/i18n';

export default function HeroSection({
  address,
  setAddress,
  query,
  setQuery,
  onNotice,
  onSearch,
  onLocationDetected,
  onSelectCategory,
  onBookProvider,
  popularProviders = []
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
    { label: 'Electrical Repair', icon: Zap, slug: 'electrical-repair', query: 'electrical' },
    { label: 'Plumbing', icon: Wrench, slug: 'plumbing', query: 'plumbing' },
    { label: 'Grocery', icon: ShoppingBag, slug: 'grocery-products', query: 'grocery' },
    { label: 'Ride Trip', icon: Car, slug: 'ride', query: 'ride' },
    { label: 'Parcel Courier', icon: Package, slug: 'parcel', query: 'parcel' },
    { label: 'Food Delivery', icon: Utensils, slug: 'food', query: 'food' }
  ];

  return (
    <section className="hero-concise" aria-labelledby="hero-main-title">
      <div className="hero-content">
        {/* Eyebrow Pill */}
        <div className="hero-trust-badge">
          <span className="live-dot" aria-hidden="true" />
          <span>SRI LANKA'S VERIFIED SERVICES & MOBILITY NETWORK</span>
        </div>

        {/* Clean, Focused Heading */}
        <h1 id="hero-main-title" className="hero-title">
          {t('heroTitle', 'Good help is closer than you think.')}
        </h1>
        <p className="hero-subtext">
          {t('heroSubtitle', 'Discover verified local tradespeople, grocery storefronts, rides, and secure parcel couriers across Sri Lanka.')}
        </p>

        {/* Prominent Dual Search Panel */}
        <div className="search-panel-elevated" role="search" aria-label="Find services and tradespeople">
          {/* Location Field with GPS Button */}
          <div className="search-input-field location-field">
            <MapPin size={18} className="search-field-icon" aria-hidden="true" />
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Your area (e.g. Colombo 03)"
              aria-label="Your location or area"
              className="search-text-input"
            />
            <button
              type="button"
              className="gps-detect-btn"
              onClick={handleDetectLocation}
              disabled={isLocating}
              title="Detect current GPS location"
              aria-label="Use my current GPS location"
            >
              <Navigation size={15} className={isLocating ? 'spin' : ''} aria-hidden="true" />
              <span className="gps-btn-label">{isLocating ? 'Locating...' : 'My location'}</span>
            </button>
          </div>

          {/* Service Keyword Field */}
          <div className="search-input-field service-field">
            <Search size={18} className="search-field-icon" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && onSearch) onSearch(); }}
              placeholder={t('searchPlaceholder', 'What service or trade do you need?')}
              aria-label="Service or trade keyword"
              className="search-text-input"
            />
          </div>

          {/* Primary Action Button */}
          <Button
            variant="primary"
            size="md"
            className="hero-search-action-btn"
            onClick={() => {
              if (onSearch) onSearch();
            }}
          >
            {t('findServices', 'Find services')}
          </Button>
        </div>

        {/* Quick Category Chips */}
        <div className="quick-category-chips" role="group" aria-label="Quick Category Filters">
          <span className="chips-label">Quick filter:</span>
          <div className="chips-scroll-container">
            {QUICK_CHIPS.map(chip => {
              const Icon = chip.icon;
              const isActive = query.toLowerCase().includes(chip.query);
              return (
                <button
                  key={chip.slug}
                  type="button"
                  className={`category-chip ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setQuery(chip.label);
                    if (['parcel', 'ride', 'food'].includes(chip.slug)) {
                      const mobEl = document.getElementById('mobility-section');
                      if (mobEl) mobEl.scrollIntoView({ behavior: 'smooth' });
                    } else if (chip.slug === 'grocery-products') {
                      const grocEl = document.getElementById('grocery-section');
                      if (grocEl) grocEl.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      if (onSelectCategory) {
                        onSelectCategory({ slug: chip.slug, name: chip.label });
                      }
                      const catEl = document.getElementById('providers-catalog') || document.querySelector('.providers-section');
                      if (catEl) catEl.scrollIntoView({ behavior: 'smooth' });
                    }
                    if (onSearch) onSearch();
                  }}
                >
                  <Icon size={14} className="chip-icon" aria-hidden="true" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust Row */}
        <div className="hero-trust-row" aria-label="Trust guarantees">
          <div className="trust-item">
            <ShieldCheck size={16} className="trust-icon" aria-hidden="true" />
            <span>100% Verified Sri Lankan Providers</span>
          </div>
          <div className="trust-item">
            <Lock size={16} className="trust-icon" aria-hidden="true" />
            <span>4-Digit PIN Secured Handoff</span>
          </div>
          <div className="trust-item">
            <Clock size={16} className="trust-icon" aria-hidden="true" />
            <span>14-Day ARY Workmanship Warranty</span>
          </div>
        </div>

        {/* Guest Join Prompt */}
        {!isCustomerLoggedIn && (
          <div className="guest-welcome-card">
            <div className="guest-card-left">
              <span className="guest-lock-icon"><ShieldCheck size={18} /></span>
              <div>
                <b>Instant Booking & Secure Live Tracking</b>
                <p>Sign in with mobile number and password to book verified providers and track drivers in real time.</p>
              </div>
            </div>
            <div className="guest-card-actions">
              <Button
                variant="primary"
                size="sm"
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
      </div>

      {/* Popular Near You Carousel / Scroller */}
      {popularProviders && popularProviders.length > 0 && (
        <div className="hero-carousel-section" aria-labelledby="popular-near-you-title">
          <div className="carousel-header">
            <div className="carousel-title-group">
              <Sparkles size={16} className="carousel-title-icon" aria-hidden="true" />
              <h2 id="popular-near-you-title" className="carousel-heading">Popular Near You</h2>
            </div>
            <span className="carousel-hint">Swipe to explore verified partners</span>
          </div>

          <div className="popular-carousel-track" tabIndex={0} role="region" aria-label="Popular providers scroll list">
            {popularProviders.slice(0, 6).map(p => (
              <div key={p.id} className="popular-provider-card">
                <div className="popular-card-header">
                  <Avatar name={p.fullName} size="md" isOnline={true} />
                  <div className="popular-card-info">
                    <b className="popular-name">{p.fullName}</b>
                    <span className="popular-category">{p.categoryName || 'Home Services'}</span>
                  </div>
                  <Badge variant="success" dot={false} className="popular-badge">
                    <CheckCircle2 size={12} /> Verified
                  </Badge>
                </div>

                <div className="popular-card-meta">
                  <div className="popular-meta-row">
                    <span className="rating-pill">
                      <Star size={12} fill="currentColor" /> {p.rating ? Number(p.rating).toFixed(1) : '5.0'}
                    </span>
                    <span className="reviews-count">({p.reviewCount ?? 12} reviews)</span>
                    {p.distanceKm != null && (
                      <span className="distance-pill">{p.distanceKm} km</span>
                    )}
                  </div>
                  <div className="rate-text">
                    Starting: <b>{p.baseCharge || 'LKR 1,500'}</b>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  fullWidth={true}
                  className="quick-book-btn"
                  onClick={() => onBookProvider && onBookProvider(p)}
                >
                  Book Service <ChevronRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
