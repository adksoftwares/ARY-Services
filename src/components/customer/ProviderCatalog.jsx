import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Star,
  Calendar,
  Users,
  Navigation,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, Avatar, Skeleton, EmptyState, Modal } from '../../design-system';
import ProviderDetailModal from './ProviderDetailModal';

export default function ProviderCatalog({
  selectedCategory,
  providers = [],
  isLoading,
  onRefresh,
  onBookProvider,
  onSelectCategory
}) {
  const { openAuthModal } = useAuth();

  // Filters & Sorting state
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'rating' | 'price' | 'distance'
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [maxDistance, setMaxDistance] = useState(50);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Pagination / Load more
  const [visibleCount, setVisibleCount] = useState(6);

  // Provider Detail View Modal
  const [selectedProviderDetail, setSelectedProviderDetail] = useState(null);

  // Filter and sort logic
  const safeProviders = Array.isArray(providers) ? providers.filter(provider => provider && typeof provider === 'object') : [];
  const { filteredProviders, showingOutsideRadius } = useMemo(() => {
    let list = [...safeProviders];
    let outsideRadiusFallback = false;

    // Providers without a published rating must not be treated as 5-star.
    if (minRating > 0) {
      list = list.filter(p => p.rating != null && Number.isFinite(Number(p.rating)) && Number(p.rating) >= minRating);
    }

    const getNum = (value) => {
      if (value == null || value === '') return null;
      const parsed = Number(String(value).replace(/[^\d.]/g, ''));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    list = list.filter(p => {
      const pPrice = getNum(p.baseCharge);
      return pPrice == null || pPrice <= maxPrice || maxPrice >= 10000;
    });

    // Keep the catalog useful when the selected radius has no matches, but
    // make the fallback explicit and rank those alternatives by proximity.
    if (providers.some(p => p.distanceKm != null)) {
      const withinRadius = list.filter(p => p.distanceKm == null || Number(p.distanceKm) <= maxDistance);
      if (withinRadius.length > 0) {
        list = withinRadius;
      } else if (list.some(p => p.distanceKm != null)) {
        outsideRadiusFallback = true;
        list.sort((a, b) => {
          const distanceA = a.distanceKm != null && Number.isFinite(Number(a.distanceKm)) ? Number(a.distanceKm) : Number.POSITIVE_INFINITY;
          const distanceB = b.distanceKm != null && Number.isFinite(Number(b.distanceKm)) ? Number(b.distanceKm) : Number.POSITIVE_INFINITY;
          return distanceA - distanceB;
        });
      }
    }

    if (sortBy === 'rating') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === 'price') {
      list.sort((a, b) => {
        const priceA = getNum(a.baseCharge);
        const priceB = getNum(b.baseCharge);
        if (priceA == null && priceB == null) return 0;
        if (priceA == null) return 1;
        if (priceB == null) return -1;
        return priceA - priceB;
      });
    } else if (sortBy === 'distance') {
      list.sort((a, b) => {
        const distanceA = a.distanceKm != null && Number.isFinite(Number(a.distanceKm)) ? Number(a.distanceKm) : Number.POSITIVE_INFINITY;
        const distanceB = b.distanceKm != null && Number.isFinite(Number(b.distanceKm)) ? Number(b.distanceKm) : Number.POSITIVE_INFINITY;
        return distanceA - distanceB;
      });
    }

    return { filteredProviders: list, showingOutsideRadius: outsideRadiusFallback };
  }, [safeProviders, sortBy, minRating, maxPrice, maxDistance]);

  const catalogTitle = selectedCategory
    ? `Available Providers for ${selectedCategory.name}`
    : `Verified Service Providers (${safeProviders.length})`;

  // If no category selected, no search results and not loading, keep catalog hidden
  if (!selectedCategory && safeProviders.length === 0 && !isLoading) {
    return null;
  }

  const displayedProviders = filteredProviders.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProviders.length;

  const activeFiltersCount = (minRating > 0 ? 1 : 0) + (maxPrice < 10000 ? 1 : 0) + (maxDistance < 50 ? 1 : 0);

  function resetFilters() {
    setMinRating(0);
    setMaxPrice(10000);
    setMaxDistance(50);
    setSortBy('recommended');
  }

  return (
    <>
      <section className="providers-section" id="providers-catalog" aria-labelledby="catalog-title">
        {/* Header */}
        <div className="providers-header">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> VERIFIED CONTRACTORS
            </div>
            <h3 id="catalog-title" className="catalog-heading">
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

        {/* Catalog Filter & Sort Bar */}
        <div className="catalog-toolbar">
          <div className="catalog-filter-group">
            {/* Filter BottomSheet Trigger Button */}
            <button
              type="button"
              className={`catalog-filter-btn ${activeFiltersCount > 0 ? 'active' : ''}`}
              onClick={() => setIsFilterSheetOpen(true)}
              aria-label="Open Filter Sheet"
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="filter-badge-count">{activeFiltersCount}</span>
              )}
            </button>

            {/* Quick 4.5+ Rating Pill */}
            <button
              type="button"
              className={`catalog-pill-btn ${minRating === 4.5 ? 'active' : ''}`}
              onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
            >
              <Star size={13} fill="currentColor" /> 4.5+ Rated
            </button>
          </div>

          <div className="catalog-sort-group">
            <ArrowUpDown size={15} className="catalog-toolbar-icon" aria-hidden="true" />
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

        {/* Geofence Proximity Badge */}
        {safeProviders.some(p => p.distanceKm != null && Number.isFinite(Number(p.distanceKm)) && Number(p.distanceKm) >= 0) && (
          <div className="geofence-banner">
            <Navigation size={13} className="geofence-icon" aria-hidden="true" />
            <span><b>Geofence Active:</b> Showing verified contractors within your area</span>
          </div>
        )}

        {showingOutsideRadius && !isLoading && (
          <div className="geofence-banner geofence-banner--fallback" role="status" aria-live="polite">
            <MapPin size={14} aria-hidden="true" />
            <span>No providers were found within {maxDistance} km. Showing the nearest available providers outside your selected radius.</span>
          </div>
        )}

        {/* Provider Cards Grid / Loading Skeletons */}
        {isLoading ? (
          <div className="providers-grid">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="provider-card-item skeleton-card">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Skeleton variant="circle" width="48px" height="48px" />
                  <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height="18px" style={{ marginBottom: '6px' }} />
                    <Skeleton width="40%" height="14px" />
                  </div>
                </div>
                <Skeleton width="100%" height="60px" style={{ margin: '14px 0' }} />
                <Skeleton width="100%" height="42px" />
              </div>
            ))}
          </div>
        ) : displayedProviders.length > 0 ? (
          <>
            <div className="providers-grid">
              {displayedProviders.map(provider => {
                const selectedService = provider.approvedServices?.find(
                  service => service.categorySlug === selectedCategory?.slug
                );
                const serviceTitle = selectedService?.serviceName || provider.categoryName || selectedCategory?.name || 'General Services';
                const operatingModeLabel = provider.operatingMode === 'shop' ? 'Shop-based' : provider.operatingMode === 'online' ? 'Online service' : provider.operatingMode === 'mobile' ? 'Mobile / on-location' : '';
                const startingPrice = selectedService?.baseCharge
                  ? `LKR ${Number(selectedService.baseCharge).toLocaleString('en-LK')}`
                  : provider.baseCharge || 'Contact for rate';

                return (
                  <div key={provider.id} className="provider-card-item">
                    <div className="provider-card-body">
                      {/* Top Row: Avatar & Name */}
                      <div className="provider-card-top">
                        <div
                          className="provider-avatar-wrap clickable"
                          onClick={() => setSelectedProviderDetail(provider)}
                          title="Click to view details & services"
                        >
                          <Avatar name={provider.fullName} size="md" isOnline={provider.isOnline === true} />
                          <div className="provider-name-block">
                            <b className="provider-name">{provider.fullName}</b>
                            <span className="provider-category-tag">{serviceTitle}</span>
                          </div>
                        </div>
                        <Badge variant="success" dot={false} className="verified-badge">
                          <CheckCircle2 size={13} /> Verified
                        </Badge>
                      </div>

                      {/* Meta Row: Location, Distance, Rating, Experience */}
                      <div className="provider-meta-row">
                        <div className="provider-meta-item">
                          <MapPin size={14} className="meta-icon" />
                          <span>{provider.location || 'Local Area'}</span>
                        </div>

                        {operatingModeLabel && <div className="provider-meta-item"><Briefcase size={14} className="meta-icon" /><span>{operatingModeLabel}</span></div>}

                        {provider.distanceKm != null && (
                          <div className="provider-meta-item distance-badge">
                            <Navigation size={13} />
                            <span>{provider.distanceKm} km away{Number.isFinite(Number(provider.etaMinutes)) && Number(provider.etaMinutes) > 0 ? ` · ~${provider.etaMinutes} mins` : ''}</span>
                          </div>
                        )}

                        <div className="provider-meta-item">
                          <Star size={14} className="meta-star" fill={provider.reviewCount > 0 ? 'currentColor' : 'none'} />
                          <span>
                            {provider.reviewCount > 0 && provider.rating != null
                              ? <><b>{Number(provider.rating).toFixed(1)}</b> ({provider.reviewCount} reviews)</>
                              : 'No customer reviews yet'}
                            {provider.experienceYears != null ? ` · ${provider.experienceYears} yrs experience` : ''}
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

                    {/* Card Actions */}
                    <div className="provider-card-actions-row">
                      <Button
                        variant="secondary"
                        size="md"
                        className="view-details-btn"
                        onClick={() => setSelectedProviderDetail(provider)}
                      >
                        Profile & Rates
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        icon={Calendar}
                        className="book-provider-btn"
                        onClick={() => onBookProvider(provider)}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Pagination */}
            {hasMore && (
              <div className="catalog-load-more-bar">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setVisibleCount(c => c + 6)}
                  className="load-more-btn"
                >
                  Load More Providers ({filteredProviders.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={selectedCategory ? `No verified providers in ${selectedCategory.name} matching filters.` : 'No matching providers found.'}
            description="Try resetting your filters or exploring another service category across Sri Lanka."
            actionLabel="Reset All Filters"
            onAction={resetFilters}
          />
        )}
      </section>

      {/* Filter BottomSheet */}
      <Modal
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter & Refine Providers"
        isBottomSheet={true}
        footer={
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <Button variant="ghost" onClick={resetFilters} style={{ flex: 1 }}>
              Reset
            </Button>
            <Button variant="primary" onClick={() => setIsFilterSheetOpen(false)} style={{ flex: 2 }}>
              Apply Filters ({filteredProviders.length} results)
            </Button>
          </div>
        }
      >
        <div className="filter-sheet-form">
          {/* Minimum Rating */}
          <div className="filter-section">
            <label className="filter-label">Minimum Rating</label>
            <div className="filter-chip-row">
              {[0, 4.0, 4.5, 4.8].map(r => (
                <button
                  key={r}
                  type="button"
                  className={`filter-chip ${minRating === r ? 'active' : ''}`}
                  onClick={() => setMinRating(r)}
                >
                  {r === 0 ? 'Any' : `${r}+ Stars`}
                </button>
              ))}
            </div>
          </div>

          {/* Max Starting Charge */}
          <div className="filter-section">
            <div className="filter-label-row">
              <label className="filter-label">Max Base Charge</label>
              <b>{maxPrice >= 10000 ? 'Any Rate' : `Up to LKR ${maxPrice.toLocaleString()}`}</b>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="filter-range-input"
            />
            <div className="range-bounds">
              <span>LKR 1,000</span>
              <span>LKR 10,000+</span>
            </div>
          </div>

          {/* Max Distance (if geolocated) */}
          <div className="filter-section">
            <div className="filter-label-row">
              <label className="filter-label">Maximum Distance</label>
              <b>Within {maxDistance} km</b>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxDistance}
              onChange={e => setMaxDistance(Number(e.target.value))}
              className="filter-range-input"
            />
            <div className="range-bounds">
              <span>5 km</span>
              <span>50 km</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Provider Details View Modal */}
      {selectedProviderDetail && (
        <ProviderDetailModal
          isOpen={Boolean(selectedProviderDetail)}
          onClose={() => setSelectedProviderDetail(null)}
          provider={selectedProviderDetail}
          selectedCategory={selectedCategory}
          onBook={(prov, service) => {
            setSelectedProviderDetail(null);
            onBookProvider(prov, service);
          }}
        />
      )}
    </>
  );
}
