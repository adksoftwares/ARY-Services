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
  ChevronRight,
  Flame,
  Shield,
  Truck
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

  const safePopularProviders = Array.isArray(popularProviders)
    ? popularProviders.filter(provider => provider && typeof provider === 'object' && provider.id !== null && provider.id !== undefined)
    : [];

  const CORE_CATEGORIES = [
    {
      id: 'electrical-repair',
      label: 'Electrician',
      subtitle: 'Wiring & Fans',
      icon: Zap,
      slug: 'electrical-repair',
      theme: 'amber',
      badge: 'Popular'
    },
    {
      id: 'plumbing',
      label: 'Plumbing',
      subtitle: 'Pipes & Taps',
      icon: Wrench,
      slug: 'plumbing',
      theme: 'blue',
      badge: null
    },
    {
      id: 'ac-repair',
      label: 'AC & Repairs',
      subtitle: 'Gas & Service',
      icon: Sparkles,
      slug: 'electrical-repair',
      theme: 'teal',
      badge: null
    },
    {
      id: 'cleaning',
      label: 'Cleaning',
      subtitle: 'Home & Office',
      icon: CheckCircle2,
      slug: 'other-services',
      theme: 'purple',
      badge: null
    },
    {
      id: 'rides',
      label: 'Rides & Tuk',
      subtitle: 'City Travel',
      icon: Car,
      slug: 'ride',
      theme: 'emerald',
      badge: 'Fast'
    },
    {
      id: 'grocery',
      label: 'Grocery Mart',
      subtitle: 'Fresh Essentials',
      icon: ShoppingBag,
      slug: 'grocery-products',
      theme: 'coral',
      badge: null
    },
    {
      id: 'food',
      label: 'Food Delivery',
      subtitle: 'Meals & Bakery',
      icon: Utensils,
      slug: 'food',
      theme: 'orange',
      badge: null
    },
    {
      id: 'courier',
      label: 'Express Courier',
      subtitle: 'Parcel Pickup',
      icon: Package,
      slug: 'parcel',
      theme: 'indigo',
      badge: null
    }
  ];

  function handleCategoryClick(cat) {
    setQuery(cat.label);
    if (['parcel', 'ride', 'food'].includes(cat.slug)) {
      const mobEl = document.getElementById('mobility-section');
      if (mobEl) mobEl.scrollIntoView({ behavior: 'smooth' });
    } else if (cat.slug === 'grocery-products') {
      const grocEl = document.getElementById('grocery-section');
      if (grocEl) grocEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      if (onSelectCategory) {
        onSelectCategory({ slug: cat.slug, name: cat.label }, cat.label);
      }
      const catEl = document.getElementById('providers-catalog') || document.querySelector('.providers-section');
      if (catEl) catEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <section className="ary-mobile-hub-container" aria-labelledby="hero-main-title">
      {/* 1. Sleek Search & Location Hub */}
      <div className="ary-search-hub-card">
        {/* Location Row inside Search Hub */}
        <div className="ary-location-subrow">
          <button
            type="button"
            className="ary-location-button"
            onClick={onOpenLocationModal}
            title="Change service location"
          >
            <div className="ary-pulse-dot" />
            <MapPin size={15} className="ary-loc-icon" />
            <span className="ary-loc-text">{address || 'Select Service Location in Sri Lanka'}</span>
            <ChevronRight size={14} className="ary-loc-chevron" />
          </button>
          <button
            type="button"
            className="ary-gps-quick-btn"
            onClick={handleDetectLocation}
            disabled={isLocating}
            title="Use current GPS"
          >
            <Navigation size={13} className={isLocating ? 'spin' : ''} />
            <span>{isLocating ? 'GPS...' : 'Auto GPS'}</span>
          </button>
        </div>

        {/* Primary Unified Search Bar */}
        <div className="ary-unified-search-bar">
          <Search size={18} className="ary-search-icon" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && onSearch) onSearch(); }}
            placeholder={t('searchPlaceholder', 'Search electricians, plumbing, grocery, rides...')}
            className="ary-search-input"
            aria-label="Search services"
          />
          <button
            type="button"
            className="ary-search-action-btn"
            onClick={() => onSearch && onSearch()}
            aria-label="Search"
          >
            Find
          </button>
        </div>
      </div>

      {/* 2. Visual 8-Category Native App Grid */}
      <div className="ary-categories-hub">
        <div className="ary-hub-header">
          <div>
            <h2 id="hero-main-title" className="ary-hub-title">What do you need today?</h2>
            <p className="ary-hub-subtitle">Instant booking with certified Sri Lankan professionals</p>
          </div>
        </div>

        <div className="ary-native-category-grid">
          {CORE_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isMatch = query.toLowerCase().includes(cat.label.toLowerCase());
            return (
              <button
                key={cat.id}
                type="button"
                className={`ary-category-tile theme-${cat.theme} ${isMatch ? 'active-tile' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat.badge && <span className="ary-tile-badge">{cat.badge}</span>}
                <div className={`ary-tile-icon-wrap icon-bg-${cat.theme}`}>
                  <Icon size={24} />
                </div>
                <b className="ary-tile-name">{cat.label}</b>
                <span className="ary-tile-subtitle">{cat.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Escrow & Trust Highlight Cards */}
      <div className="ary-trust-carousel">
        <div className="ary-trust-card">
          <div className="ary-trust-icon-box trust-shield">
            <ShieldCheck size={20} />
          </div>
          <div className="ary-trust-info">
            <b>100% Escrow Protection</b>
            <p>Funds released only after you verify the job</p>
          </div>
        </div>
        <div className="ary-trust-card">
          <div className="ary-trust-icon-box trust-speed">
            <Zap size={20} />
          </div>
          <div className="ary-trust-info">
            <b>~15 Min Fast Dispatch</b>
            <p>Nearest active certified pros at your doorstep</p>
          </div>
        </div>
        <div className="ary-trust-card">
          <div className="ary-trust-icon-box trust-lock">
            <Lock size={20} />
          </div>
          <div className="ary-trust-info">
            <b>4-Digit PIN Security</b>
            <p>Secure verification handoff on every order</p>
          </div>
        </div>
      </div>

      {/* 4. Guest Welcome Banner (Non-Intrusive) */}
      {!isCustomerLoggedIn && (
        <div className="ary-guest-action-card">
          <div className="ary-guest-card-left">
            <div className="ary-guest-badge-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <b>Sign in for live tracking & escrow</b>
              <p>Track arrival in real time, view booking history, and manage payments.</p>
            </div>
          </div>
          <div className="ary-guest-card-buttons">
            <button
              type="button"
              className="ary-btn-signin"
              onClick={() => openAuthModal('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="ary-btn-join"
              onClick={() => openAuthModal('register')}
            >
              Join ARY
            </button>
          </div>
        </div>
      )}

      {/* 5. Popular Near You Showcase */}
      {safePopularProviders.length > 0 && (
        <div className="ary-popular-section" aria-labelledby="popular-near-you-title">
          <div className="ary-popular-header">
            <div>
              <div className="ary-popular-eyebrow">
                <Sparkles size={14} className="ary-sparkle" />
                <span>VERIFIED PARTNERS</span>
              </div>
              <h2 id="popular-near-you-title" className="ary-popular-title">Popular Near You</h2>
            </div>
            <span className="ary-popular-subtitle">Ready to book immediately</span>
          </div>

          <div className="ary-popular-cards-scroll">
            {safePopularProviders.slice(0, 6).map(p => (
              <div key={p.id} className="ary-popular-card">
                <div className="ary-card-top">
                  <Avatar name={p.fullName} size="md" isOnline={p.isOnline === true} />
                  <div className="ary-card-titles">
                    <b className="ary-provider-fullname">{p.fullName}</b>
                    <span className="ary-provider-cat">{p.categoryName || 'Home Services'}</span>
                  </div>
                  <span className="ary-badge-verified">Verified</span>
                </div>

                <div className="ary-card-details">
                  <div className="ary-card-ratings">
                    <span className="ary-star-pill">
                      <Star size={13} fill="currentColor" />
                      <span>{p.rating !== null && p.rating !== undefined && Number(p.rating) > 0 ? Number(p.rating).toFixed(1) : '5.0'}</span>
                    </span>
                    <span className="ary-review-count">
                      ({Number.isFinite(Number(p.reviewCount)) && Number(p.reviewCount) > 0 ? `${Math.floor(Number(p.reviewCount))} reviews` : '4 reviews'})
                    </span>
                  </div>
                  <div className="ary-card-price">
                    <span>Starting:</span>
                    <b>{p.baseCharge || 'LKR 2,000'}</b>
                  </div>
                </div>

                <button
                  type="button"
                  className="ary-book-service-btn"
                  onClick={() => onBookProvider && onBookProvider(p)}
                >
                  <span>Book Service</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
