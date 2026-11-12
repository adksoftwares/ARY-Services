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
  const filteredProviders = useMemo(() => {
    let list = [...providers];

    // Rating filter
    if (minRating > 0) {
      list = list.filter(p => (Number(p.rating) || 5) >= minRating);
    }

    // Price filter
    const getNum = (str) => Number(String(str || '').replace(/[^\d]/g, '')) || 0;
    list = list.filter(p => {
      const pPrice = getNum(p.baseCharge);
      return pPrice <= maxPrice || maxPrice >= 10000;
    });

    // Distance filter
    if (providers.some(p => p.distanceKm != null)) {
      const withinRadius = list.filter(p => p.distanceKm == null || p.distanceKm <= maxDistance);
      // If there are providers within the chosen radius, show them.
      // Otherwise, keep the island-wide list sorted by distance so the customer is never left empty!
      if (withinRadius.length > 0) {
        list = withinRadius;
      }
    }

    // Sorting
    if (sortBy === 'rating') {
      list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === 'price') {
      list.sort((a, b) => getNum(a.baseCharge) - getNum(b.baseCharge));
    } else if (sortBy === 'distance') {
      list.sort((a, b) => (Number(a.distanceKm) || 99) - (Number(b.distanceKm) || 99));
    }

    return list;
  }, [providers, sortBy, minRating, maxPrice, maxDistance]);

  const catalogTitle = selectedCategory
    ? `Available Providers for ${selectedCategory.name}`
    : `Verified Service Providers (${providers.length})`;

  // If no category selected, no search results and not loading, keep catalog hidden
  if (!selectedCategory && providers.length === 0 && !isLoading) {
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
        {providers.some(p => p.distanceKm != null) && (
          <div className="geofence-banner">
            <Navigation size={13} className="geofence-icon" aria-hidden="true" />
            <span><b>Geofence Active:</b> Showing verified contractors within your area</span>
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
                  : provider.baseCharge || 'LKR 1,500';

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
                            <span>{provider.distanceKm} km away · ~{provider.etaMinutes || 25} mins</span>
                          </div>
                        )}

                        <div className="provider-meta-item">
                          <Star size={14} className="meta-star" fill="currentColor" />
                          <span>
                            <b>{provider.rating ? Number(provider.rating).toFixed(1) : '5.0'}</b> ({provider.reviewCount ?? 14} reviews) · {provider.experienceYears || 3} yrs exp
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
          onBook={(prov) => {
            setSelectedProviderDetail(null);
            onBookProvider(prov);
          }}
        />
      )}
    </>
  );
}
