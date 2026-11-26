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
  popularProviders = [],
  onOpenLocationModal
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

  const safePopularProviders = Array.isArray(popularProviders) ? popularProviders.filter(provider => provider && typeof provider === 'object' && provider.id !== null && provider.id !== undefined) : [];

  const QUICK_CHIPS = [
    { label: 'Electrical Repair', icon: Zap, slug: 'electrical-repair', query: 'electrical' },
    { label: 'Plumbing', icon: Wrench, slug: 'plumbing', query: 'plumbing' },
    { label: 'Grocery', icon: ShoppingBag, slug: 'grocery-products', query: 'grocery' },
    { label: 'Ride Trip', icon: Car, slug: 'ride', query: 'ride' },
    { label: 'Parcel Courier', icon: Package, slug: 'parcel', query: 'parcel' },
    { label: 'Food Delivery', icon: Utensils, slug: 'food', query: 'food' }
  ];

  return (
    <section className="hero-concise customer-discovery-hero ary-home-hero" aria-labelledby="hero-main-title">
      <div className="hero-content">
        {/* Eyebrow Pill */}
        <div className="hero-trust-badge customer-hero-eyebrow">
          <span className="live-dot" aria-hidden="true" />
          <span>LOCAL SERVICES. EVERYDAY ESSENTIALS. EASY RIDES.</span>
        </div>

        {/* Clean, Focused Heading */}
        <h1 id="hero-main-title" className="hero-title">
          {t('heroTitle', 'Good help is closer than you think.')}
        </h1>
        <p className="hero-subtext">
          {t('heroSubtitle', 'Find nearby professionals, shop for everyday essentials, and explore ride or delivery services — all from one place.')}
        </p>

        {/* Prominent Dual Search Panel */}
        <div className="search-panel-elevated customer-search-panel customer-search-panel-v2 ary-home-search-panel" role="search" aria-label="Find services and tradespeople">
          {/* Location Field with GPS & Change Location Button */}
          <div className="search-input-field location-field">
            <div className="location-input-row">
              <MapPin size={18} className="search-field-icon" aria-hidden="true" />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                onClick={() => onOpenLocationModal && onOpenLocationModal()}
                placeholder="Search city, area or street in Sri Lanka..."
                aria-label="Your location or area"
                className="search-text-input"
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className="location-actions-wrap">
              <button
                type="button"
                className="gps-detect-btn"
                onClick={handleDetectLocation}
                disabled={isLocating}
                title="Detect current GPS location"
                aria-label="Use my current GPS location"
              >
                <Navigation size={13} className={isLocating ? 'spin' : ''} aria-hidden="true" />
                <span className="gps-btn-label">{isLocating ? 'Locating...' : 'Auto GPS'}</span>
              </button>
              {onOpenLocationModal && (
                <button
                  type="button"
                  className="gps-detect-btn location-change-btn"
                  onClick={onOpenLocationModal}
                  title="Search any location in Sri Lanka or pick on map"
                  aria-label="Change location"
                >
                  <MapPin size={13} />
                  <span>Change Location</span>
                </button>
              )}
            </div>
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
        <div className="quick-category-chips ary-home-quick-filters" role="group" aria-label="Quick Category Filters">
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
                  aria-pressed={isActive}
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
                        onSelectCategory({ slug: chip.slug, name: chip.label }, chip.label);
                      }
                      const catEl = document.getElementById('providers-catalog') || document.querySelector('.providers-section');
                      if (catEl) catEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <Icon size={14} className="chip-icon" aria-hidden="true" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Service information */}
        <div className="hero-trust-row customer-trust-grid" aria-label="Service information">
          <div className="trust-item">
            <ShieldCheck size={16} className="trust-icon" aria-hidden="true" />
            <span>Provider applications reviewed before activation</span>
          </div>
          <div className="trust-item">
            <Lock size={16} className="trust-icon" aria-hidden="true" />
            <span>Clear details before you send a request</span>
          </div>
          <div className="trust-item">
            <Clock size={16} className="trust-icon" aria-hidden="true" />
            <span>Track booking updates in your account</span>
          </div>
        </div>

        {/* Guest Join Prompt */}
        {!isCustomerLoggedIn && (
          <div className="guest-welcome-card">
            <div className="guest-card-left">
              <span className="guest-lock-icon"><ShieldCheck size={18} /></span>
              <div>
                <b>Book and manage services with ARY</b>
                <p>Sign in with your account to request services, review provider details and follow the status updates available for your bookings.</p>
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
      {safePopularProviders.length > 0 && (
        <div className="hero-carousel-section ary-popular-providers" aria-labelledby="popular-near-you-title">
          <div className="carousel-header">
            <div className="carousel-title-group">
              <Sparkles size={16} className="carousel-title-icon" aria-hidden="true" />
              <h2 id="popular-near-you-title" className="carousel-heading">Popular Near You</h2>
            </div>
            <span className="carousel-hint">Browse listed service providers</span>
          </div>

          <div className="popular-carousel-track" tabIndex={0} role="region" aria-label="Popular providers scroll list">
            {safePopularProviders.slice(0, 6).map(p => (
              <div key={p.id} className="popular-provider-card">
                <div className="popular-card-header">
                  <Avatar name={p.fullName} size="md" isOnline={p.isOnline === true} />
                  <div className="popular-card-info">
                    <b className="popular-name">{p.fullName}</b>
                    <span className="popular-category">{p.categoryName || 'Home Services'}</span>
                  </div>
                  <Badge variant="neutral" dot={false} className="popular-badge">
                    Listed on ARY
                  </Badge>
                </div>

                <div className="popular-card-meta">
                  <div className="popular-meta-row">
                    <span className="rating-pill">
                      <Star size={12} fill="currentColor" /> {p.rating !== null && p.rating !== undefined && p.rating !== '' && Number.isFinite(Number(p.rating)) && Number(p.rating) >= 0 && Number(p.rating) <= 5 && Number(p.reviewCount) > 0 ? Number(p.rating).toFixed(1) : 'New'}
                    </span>
                    <span className="reviews-count">({Number.isFinite(Number(p.reviewCount)) && Number(p.reviewCount) > 0 ? `${Math.floor(Number(p.reviewCount))} reviews` : 'No reviews yet'})</span>
                    {p.distanceKm != null && Number.isFinite(Number(p.distanceKm)) && Number(p.distanceKm) >= 0 && (
                      <span className="distance-pill">{`${Number(p.distanceKm).toFixed(1)} km`}</span>
                    )}
                  </div>
                  <div className="rate-text">
                    Starting: <b>{p.baseCharge || 'Contact for rate'}</b>
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
