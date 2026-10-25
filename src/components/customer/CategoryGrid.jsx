import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function CategoryGrid({
  services,
  selectedCategory,
  onSelectCategory
}) {
  return (
    <section className="services-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">WHAT DO YOU NEED TODAY?</span>
          <h2>Explore services & providers</h2>
        </div>
        <span className="section-note">
          Click a service to view verified local providers <ArrowRight size={15} />
        </span>
      </div>

      <div className="service-grid">
        {services.map(service => {
          const Icon = service.icon || Sparkles;
          const isSelected = selectedCategory?.id === service.id;
          return (
            <button
              className={`service-card ${isSelected ? 'active-category-card' : ''}`}
              key={service.id}
              style={isSelected ? { borderColor: '#174d3d', background: '#f5faf6', transform: 'translateY(-2px)' } : {}}
              onClick={() => onSelectCategory(service)}
            >
              <span className={'service-icon ' + (service.color || 'lilac')}>
                <Icon size={25} />
              </span>
              <span className="service-card-copy">
                <b>{service.name}</b>
                <small>{service.description}</small>
              </span>
              <ArrowRight className="card-arrow" size={18} />
            </button>
          );
        })}
      </div>
      {services.length === 0 && <p className="empty">No categories match your search.</p>}
    </section>
  );
}
