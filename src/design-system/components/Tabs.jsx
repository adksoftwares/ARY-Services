import React from 'react';

export function Tabs({
  tabs = [], // [{ id, label, icon: Icon, badge }]
  activeTab,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Navigation Tabs'
}) {
  return (
    <div className={`ds-tabs ${className}`} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ds-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange && onChange(tab.id)}
          >
            {Icon && <Icon size={16} />}
            <span>{tab.label}</span>
            {tab.badge != null && (
              <span className={`ds-badge ds-badge-${isActive ? 'brand' : 'neutral'}`} style={{ padding: '2px 6px', fontSize: '11px' }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl({
  options = [], // [{ id, label, icon: Icon }]
  value,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Segmented options'
}) {
  return (
    <div className={`ds-segmented ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isSelected = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`ds-segmented-btn ${isSelected ? 'active' : ''}`}
            onClick={() => onChange && onChange(opt.id)}
          >
            {Icon && <Icon size={15} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
