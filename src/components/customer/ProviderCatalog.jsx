import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Star,
  Calendar,
  Users,
  Briefcase,
  Navigation,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, Avatar, Skeleton, EmptyState } from '../../design-system';

export default function ProviderCatalog({
  selectedCategory,
  providers = [],
  isLoading,
  onRefresh,
  onBookProvider
}) {
  const { openAuthModal } = useAuth();
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'rating' | 'price'
  const [minRating, setMinRating] = useState(0);

  // If no category selected, no search results and not loading, keep catalog hidden
  if (!selectedCategory && providers.length === 0 && !isLoading) {
    return null;
  }

  const catalogTitle = selectedCategory
    ? `Available Providers for ${selectedCategory.name}`
    : `Matching Verified Providers (${providers.length})`;

  // Sort and filter logic
  const filteredProviders = useMemo(() => {
    let list = [...providers];

    if (minRating > 0) {
      list = list.filter(p => (Number(p.rating) || 5) >= minRating);
    }

    if (sortBy === 'rating') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === 'price') {
      const getNum = (str) => Number(String(str || '').replace(/[^\d]/g, '')) || 99999;
      list.sort((a, b) => getNum(a.baseCharge) - getNum(b.baseCharge));
    } else if (sortBy === 'distance') {
      list.sort((a, b) => (Number(a.distanceKm) || 99) - (Number(b.distanceKm) || 99));
    }

    return list;
  }, [providers, sortBy, minRating]);

  return (
    <>
      <section className="providers-section" id="providers-catalog">
        <div className="providers-header">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> VERIFIED CONTRACTORS
            </div>
            <h3>
              <ShieldCheck size={22} className="provider-heading-icon" />
              {catalogTitle}
            </h3>
          </div>

          <div className="providers-header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={onRefresh}
              loading={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <div className="catalog-toolbar">
          <div className="catalog-filter-group">
            <SlidersHorizontal size={15} className="catalog-toolbar-icon" />
            <span className="catalog-filter-label">Filter:</span>
            <button
              type="button"
              className={`catalog-pill-btn ${minRating === 0 ? 'active' : ''}`}
              onClick={() => setMinRating(0)}
            >
              All
            </button>
            <button
              type="button"
              className={`catalog-pill-btn ${minRating === 4.5 ? 'active' : ''}`}
              onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
            >
              <Star size={13} fill="currentColor" /> 4.5+ Rated
            </button>
          </div>

          <div className="catalog-sort-group">
            <ArrowUpDown size={15} className="catalog-toolbar-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="catalog-sort-select"
              aria-label="Sort providers"
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="rating">Sort: Highest Rating</option>
              <option value="price">Sort: Lowest Starting Rate</option>
              <option value="distance">Sort: Nearest Distance</option>
            </select>
          </div>
        </div>

        {providers.some(p => p.distanceKm != null) && (
          <div className="geofence-banner">
            <Navigation size={13} className="geofence-icon" />
            <span><b>Geofence Active:</b> Verified contractors serving your detected 25 km boundary</span>
          </div>
        )}

        {isLoading ? (
          <div className="providers-grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="provider-card-item skeleton-card">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Skeleton variant="circle" width="48px" height="48px" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height="18px" style={{ marginBottom: '6px' }} />
                    <Skeleton width="40%" height="14px" />
                  </div>
                </div>
                <Skeleton width="100%" height="60px" style={{ margin: '14px 0' }} />
                <Skeleton width="100%" height="40px" />
              </div>
            ))}
          </div>
        ) : filteredProviders.length > 0 ? (
          <div className="providers-grid">
            {filteredProviders.map(provider => {
              const selectedService = provider.approvedServices?.find(
                service => service.categorySlug === selectedCategory?.slug
              );
              const serviceTitle = selectedService?.serviceName || provider.categoryName || selectedCategory?.name || 'General Services';
              const startingPrice = selectedService?.baseCharge
                ? `LKR ${Number(selectedService.baseCharge).toLocaleString('en-LK')}`
                : provider.baseCharge || 'LKR 1,500';

              return (
                <div key={provider.id} className="provider-card-item">
                  <div className="provider-card-body">
                    <div className="provider-card-top">
                      <div className="provider-avatar-wrap">
                        <Avatar name={provider.fullName} size="md" isOnline={true} />
                        <div className="provider-name-block">
                          <b className="provider-name">{provider.fullName}</b>
                          <span className="provider-category-tag">{serviceTitle}</span>
                        </div>
                      </div>
                      <Badge variant="success" dot={false} className="verified-badge">
                        <CheckCircle2 size={13} /> Verified
                      </Badge>
                    </div>

                    <div className="provider-meta-row">
                      <div className="provider-meta-item">
                        <MapPin size={14} className="meta-icon" />
                        <span>{provider.location || 'Local Area'}</span>
                      </div>

                      {provider.distanceKm != null && (
                        <div className="provider-meta-item distance-badge">
                          <Navigation size={13} />
                          <span>{provider.distanceKm} km away · ~{provider.etaMinutes || 25} mins</span>
                        </div>
                      )}

                      <div className="provider-meta-item">
                        <Star size={14} className="meta-star" fill="currentColor" />
                        <span>
                          <b>{provider.rating ? Number(provider.rating).toFixed(1) : '5.0'}</b> ({provider.reviewCount ?? 0} reviews) · {provider.experienceYears || 3} yrs exp
                        </span>
                      </div>

                      <div className="provider-meta-item provider-rate">
                        <span>Starting from: <b>{startingPrice}</b></span>
                      </div>
                    </div>

                    <div className="warranty-guarantee-badge">
                      <ShieldCheck size={14} />
                      <span>14-Day ARY Workmanship Guarantee</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    fullWidth={true}
                    icon={Calendar}
                    className="book-provider-btn"
                    onClick={() => onBookProvider(provider)}
                  >
                    Book Service / Request Quote
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={selectedCategory ? `No verified providers in ${selectedCategory.name} yet.` : 'No matching providers found.'}
            description="Are you a qualified Sri Lankan tradesperson or shop owner? Join ARY Services as a verified partner!"
            actionLabel="Register as Service Provider"
            onAction={() => openAuthModal('register')}
          />
        )}
      </section>

      <section className="how-section">
        <div>
          <span className="eyebrow">SIMPLE BY DESIGN</span>
          <h2>Help, in a few easy steps.</h2>
        </div>
        <div className="steps">
          <div>
            <span className="step-num">01</span>
            <b>Choose a service</b>
            <small>Browse verified trades, shops, and on-demand mobility.</small>
          </div>
          <div>
            <span className="step-num">02</span>
            <b>Select a verified provider</b>
            <small>Compare ratings, warranty, distance, and base charges.</small>
          </div>
          <div>
            <span className="step-num">03</span>
            <b>Confirm & Track</b>
            <small>Book your preferred slot; track delivery with secure 4-digit PIN.</small>
          </div>
        </div>
      </section>
    </>
  );
}
