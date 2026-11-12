import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Star,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Wrench,
  Navigation,
  Phone,
  Briefcase,
  Check,
  X
} from 'lucide-react';
import { Modal, Button, Badge, Avatar, RatingStars } from '../../design-system';

export default function ProviderDetailModal({
  isOpen,
  onClose,
  provider,
  selectedCategory,
  onBook
}) {
  const [selectedServiceId, setSelectedServiceId] = useState('');
  useEffect(() => { setSelectedServiceId(''); }, [provider?.id]);
  if (!isOpen || !provider) return null;

  const services = Array.isArray(provider.approvedServices) && provider.approvedServices.length > 0
    ? provider.approvedServices
    : [{ id: 'primary', serviceName: provider.categoryName || selectedCategory?.name || 'Primary Service', baseCharge: provider.baseCharge || null, description: '' }];
  const selectedService = services.find((service, index) => (service.id || `service-${index}`) === selectedServiceId) || services[0];
  const selectedServiceKey = selectedService ? (selectedService.id || `service-${services.indexOf(selectedService)}`) : '';
  const reviewCount = Number(provider.reviewCount) || 0;
  const rating = reviewCount > 0 && provider.rating != null ? Number(provider.rating) : null;
  const experienceYears = provider.experienceYears != null ? Number(provider.experienceYears) : null;
  const operatingMode = provider.operatingMode === 'shop' ? 'Shop-based' : provider.operatingMode === 'online' ? 'Online service' : provider.operatingMode === 'mobile' ? 'Mobile / on-location' : 'Not specified';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provider Details & Services"
      isBottomSheet={true}
      size="md"
    >
      <div className="provider-detail-content">
        {/* Header Profile Section */}
        <div className="provider-detail-header">
          <Avatar name={provider.fullName} size="xl" isOnline={true} />
          <div className="provider-detail-header-info">
            <div className="provider-title-row">
              <h3>{provider.fullName}</h3>
              <Badge variant="success" dot={false}>
                <CheckCircle2 size={13} /> Verified Partner
              </Badge>
            </div>
            <div className="provider-subtitle">
              <span>{provider.categoryName || selectedCategory?.name || 'Trade Specialist'}</span>
              <span>•</span>
              <span>{operatingMode}</span>
              <span>•</span>
              <span className="location-text">
                <MapPin size={13} /> {provider.location || 'Local Area'}
              </span>
            </div>

            <div className="provider-ratings-row">
              {rating != null ? <><RatingStars rating={Math.round(rating)} readonly={true} size="sm" /><b>{rating.toFixed(1)}</b><span className="reviews-subtext">({reviewCount} reviews)</span></> : <span className="reviews-subtext">No customer reviews yet</span>}
            </div>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="provider-highlights-grid">
          <div className="highlight-pill">
            <span className="highlight-label">Experience</span>
            <b>{experienceYears != null ? `${experienceYears} Years` : 'Not provided'}</b>
          </div>
          <div className="highlight-pill">
            <span className="highlight-label">Starting Rate</span>
            <b>{selectedService?.baseCharge ? `LKR ${Number(selectedService.baseCharge).toLocaleString('en-LK')}` : provider.baseCharge || 'Contact for rate'}</b>
          </div>
          <div className="highlight-pill">
            <span className="highlight-label">Warranty</span>
            <b>14-Day ARY</b>
          </div>
          {provider.distanceKm != null && (
            <div className="highlight-pill">
              <span className="highlight-label">Proximity</span>
              <b>{provider.distanceKm} km away</b>
            </div>
          )}
        </div>

        {/* Services & Rates */}
        <div className="detail-section">
          <h4 className="detail-section-title">
            <Wrench size={16} /> Services Offered & Base Rates
          </h4>
          <div className="detail-services-list">
            {services.map((srv, idx) => {
              const serviceKey = srv.id || `service-${idx}`;
              const isSelected = selectedServiceKey === serviceKey;
              return (
                <div
                  key={serviceKey}
                  className="detail-service-card"
                  style={{ border: isSelected ? '2px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)', background: isSelected ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #fff)', cursor: 'pointer' }}
                  onClick={() => setSelectedServiceId(serviceKey)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedServiceId(serviceKey); }}
                >
                  <div className="service-info-left">
                    <b className="service-item-name">{srv.serviceName}</b>
                    {srv.description && <p className="service-item-desc">{srv.description}</p>}
                    <small style={{ color: 'var(--color-brand-700, #174d3d)', fontWeight: 700 }}>{isSelected ? 'Selected service' : 'Select this service'}</small>
                  </div>
                  <div className="service-item-price">
                    <span>Starting at</span>
                    <b>{srv.baseCharge ? `LKR ${Number(srv.baseCharge).toLocaleString('en-LK')}` : provider.baseCharge || 'Contact for rate'}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workmanship Guarantee Banner */}
        <div className="warranty-callout-card">
          <ShieldCheck size={20} className="warranty-icon" />
          <div>
            <b>14-Day ARY Quality Guarantee</b>
            <p>Every booking comes with our escrow safety and 14-day warranty protection. Pay cash or escrow only after you inspect the work.</p>
          </div>
        </div>

        {/* Reviews Summary */}
        <div className="detail-section">
          <h4 className="detail-section-title">
            <Star size={16} /> Customer Feedback Summary
          </h4>
          <div className="reviews-summary-card">
            {rating != null ? (
              <div className="score-box">
                <span className="big-score">{rating.toFixed(1)}</span>
                <RatingStars rating={Math.round(rating)} readonly={true} size="sm" />
                <span className="total-reviews">{reviewCount} customer reviews</span>
              </div>
            ) : (
              <p style={{ margin: 0, padding: 16, color: 'var(--color-neutral-600, #475569)' }}>
                This provider has not received a customer review yet. A rating will appear after completed bookings are reviewed.
              </p>
            )}
          </div>
        </div>

        {/* Sticky Mobile Book Now Bar */}
        <div className="provider-sticky-book-bar">
          <div className="book-bar-price">
            <span>Starting rate</span>
            <b>{provider.baseCharge || 'Contact for rate'}</b>
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={Calendar}
            className="book-now-cta"
            onClick={() => {
              onClose();
              if (onBook) onBook(provider, selectedService);
            }}
          >
            Book Now / Request Quote
          </Button>
        </div>
      </div>
    </Modal>
  );
}
