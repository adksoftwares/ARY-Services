import React from 'react';
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
  if (!isOpen || !provider) return null;

  const services = provider.approvedServices || [
    {
      id: 'default',
      serviceName: provider.categoryName || selectedCategory?.name || 'Standard Service',
      baseCharge: provider.baseCharge || 'LKR 1,500',
      description: 'Standard on-site inspection, diagnostics, and workmanship.'
    }
  ];

  const rating = Number(provider.rating) || 5.0;
  const reviewCount = provider.reviewCount ?? 14;
  const experienceYears = provider.experienceYears || 3;

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
              <span className="location-text">
                <MapPin size={13} /> {provider.location || 'Local Area'}
              </span>
            </div>

            <div className="provider-ratings-row">
              <RatingStars rating={Math.round(rating)} readonly={true} size="sm" />
              <b>{rating.toFixed(1)}</b>
              <span className="reviews-subtext">({reviewCount} verified reviews)</span>
            </div>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="provider-highlights-grid">
          <div className="highlight-pill">
            <span className="highlight-label">Experience</span>
            <b>{experienceYears} Years</b>
          </div>
          <div className="highlight-pill">
            <span className="highlight-label">Starting Rate</span>
            <b>{provider.baseCharge || 'LKR 1,500'}</b>
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
            {services.map((srv, idx) => (
              <div key={srv.id || idx} className="detail-service-card">
                <div className="service-info-left">
                  <b className="service-item-name">{srv.serviceName}</b>
                  {srv.description && (
                    <p className="service-item-desc">{srv.description}</p>
                  )}
                </div>
                <div className="service-item-price">
                  <span>Starting at</span>
                  <b>{srv.baseCharge ? `LKR ${Number(srv.baseCharge).toLocaleString('en-LK')}` : provider.baseCharge || 'LKR 1,500'}</b>
                </div>
              </div>
            ))}
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
            <div className="score-box">
              <span className="big-score">{rating.toFixed(1)}</span>
              <RatingStars rating={Math.round(rating)} readonly={true} size="sm" />
              <span className="total-reviews">{reviewCount} reviews</span>
            </div>
            <div className="score-bars">
              <div className="score-bar-row">
                <span>Punctuality</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '96%' }} /></div>
                <span>4.9</span>
              </div>
              <div className="score-bar-row">
                <span>Work Quality</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '98%' }} /></div>
                <span>5.0</span>
              </div>
              <div className="score-bar-row">
                <span>Communication</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '92%' }} /></div>
                <span>4.8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Mobile Book Now Bar */}
        <div className="provider-sticky-book-bar">
          <div className="book-bar-price">
            <span>Starting rate</span>
            <b>{provider.baseCharge || 'LKR 1,500'}</b>
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={Calendar}
            className="book-now-cta"
            onClick={() => {
              onClose();
              if (onBook) onBook(provider);
            }}
          >
            Book Now / Request Quote
          </Button>
        </div>
      </div>
    </Modal>
  );
}
