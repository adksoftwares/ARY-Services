import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function CategoryGrid({
  services,
  selectedCategory,
  onSelectCategory
}) {
  const safeServices = Array.isArray(services) ? services.filter(service => service && typeof service === 'object' && service.id !== null && service.id !== undefined) : [];

  return (
    <section className="services-section customer-category-discovery">
      <div className="section-heading">
        <div>
          <span className="eyebrow">WHAT DO YOU NEED TODAY?</span>
          <h2>Explore services & providers</h2>
        </div>
        <span className="section-note">
          Select a category to browse available providers <ArrowRight size={15} />
        </span>
      </div>

      <div className="service-grid">
        {safeServices.map(service => {
          const Icon = service.icon || Sparkles;
          const isSelected = selectedCategory?.id === service.id;
          return (
            <button
              type="button"
              className={`service-card ${isSelected ? 'active-category-card' : ''}`}
              aria-pressed={isSelected}
              key={service.id}
              onClick={() => onSelectCategory?.(service)}
            >
              <span className={'service-icon ' + (service.color || 'lilac')}>
                <Icon size={25} />
              </span>
              <span className="service-card-copy">
                <b>{service.name || 'Service category'}</b>
                <small>{service.description || 'Browse providers in this category'}</small>
              </span>
              <ArrowRight className="card-arrow" size={18} />
            </button>
          );
        })}
      </div>
      {safeServices.length === 0 && <p className="empty">No categories match your search.</p>}
    </section>
  );
}
