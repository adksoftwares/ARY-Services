import React from 'react';
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Star,
  Calendar,
  Users,
  Briefcase,
  Navigation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProviderCatalog({
  selectedCategory,
  providers,
  isLoading,
  onRefresh,
  onBookProvider
}) {
  const { openAuthModal } = useAuth();

  // If no category selected, no search results and not loading, keep catalog hidden
  if (!selectedCategory && providers.length === 0 && !isLoading) {
    return null;
  }

  const catalogTitle = selectedCategory
    ? `Available Providers for ${selectedCategory.name}`
    : `Matching Verified Providers (${providers.length})`;

  return (
    <>
      <section className="providers-section" id="providers-catalog">
        <div className="providers-header">
          <div>
            <span className="eyebrow">VERIFIED CONTRACTORS</span>
            <h3>
              <ShieldCheck size={22} color="#166534" />
              {catalogTitle}
            </h3>
          </div>
          <button
            type="button"
            className="locate-inline-btn"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            {isLoading ? 'Loading...' : 'Refresh List'}
          </button>
        </div>

        {providers.some(p => p.distanceKm !== null && p.distanceKm !== undefined) && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            color: '#065f46',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '4px 12px',
            borderRadius: 20,
            marginBottom: 16
          }}>
            <Navigation size={12} color="#059669" />
            <span><b>Geofence Active:</b> Showing verified contractors within 25 km service boundary</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#68776d' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
            Loading verified service providers...
          </div>
        ) : providers.length > 0 ? (
          <div className="providers-grid">
            {providers.map(provider => (
              <div key={provider.id} className="provider-card-item">
                <div>
                  <div className="provider-card-top">
                    <div className="provider-name-block">
                      <b>{provider.fullName}</b>
                      <span className="provider-category-tag">
                        {provider.categoryName || selectedCategory?.name || 'General Services'}
                      </span>
                    </div>
                    <span className="verified-provider-badge">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  </div>

                  <div className="provider-meta-row">
                    <div className="provider-meta-item">
                      <MapPin size={14} color="#52705e" />
                      <span>{provider.location || 'Local Area'}</span>
                    </div>
                    {provider.distanceKm !== undefined && provider.distanceKm !== null && (
                      <div className="provider-meta-item" style={{
                        color: '#047857',
                        fontWeight: 600,
                        background: '#ecfdf5',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid #a7f3d0'
                      }}>
                        <Navigation size={12} color="#059669" />
                        <span>📍 {provider.distanceKm} km away · ~{provider.etaMinutes} mins arrival</span>
                      </div>
                    )}
                    <div className="provider-meta-item">
                      <Star size={14} color="#d97706" fill="#d97706" />
                      <span>
                        ⭐ {provider.rating ? Number(provider.rating).toFixed(1) : '5.0'} ({provider.reviewCount ?? 0} reviews) · {provider.experienceYears || 3} yrs exp
                      </span>
                    </div>
                    <div className="provider-meta-item provider-rate">
                      <span>Starting from: <b>{provider.baseCharge || 'LKR 1,500'}</b></span>
                    </div>
                  </div>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    color: '#166534',
                    fontWeight: 600,
                    margin: '8px 0 10px'
                  }}>
                    <ShieldCheck size={14} color="#16a34a" />
                    <span>🛡️ 14-Day ARY Workmanship Guarantee</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="book-provider-btn"
                  onClick={() => onBookProvider(provider)}
                >
                  <Calendar size={15} /> Book Service / Request Quote
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-providers-box">
            <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <b>
              {selectedCategory
                ? `No approved providers listed in ${selectedCategory.name} yet.`
                : 'No approved service providers match your current search.'}
            </b>
            <p style={{ fontSize: '12px', margin: '6px 0 16px' }}>
              Are you an electrician, plumber, or service specialist? Join ARY Services as an approved partner!
            </p>
            <button
              type="button"
              className="prompt-sign-in-btn"
              style={{ margin: '0 auto' }}
              onClick={() => openAuthModal('register')}
            >
              <Briefcase size={14} /> Register as Service Provider
            </button>
          </div>
        )}
      </section>

      <section className="how-section">
        <div>
          <span className="eyebrow">SIMPLE BY DESIGN</span>
          <h2>Help, in a few easy steps.</h2>
        </div>
        <div className="steps">
          <div><span>01</span><b>Choose a service</b><small>Select from verified local categories.</small></div>
          <div><span>02</span><b>Select a provider</b><small>Check verified badges, ratings and rates.</small></div>
          <div><span>03</span><b>Confirm booking</b><small>Schedule your preferred date, time and address.</small></div>
        </div>
      </section>
    </>
  );
}
