import React, { useRef } from 'react';

function moveSelection(event, items, currentIndex, onSelect) {
  if (!items.length) return;
  let nextIndex = currentIndex;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = items.length - 1;
  else return;

  event.preventDefault();
  items[nextIndex]?.focus();
  onSelect?.(nextIndex);
}

export function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Navigation Tabs'
}) {
  const refs = useRef([]);
  const selectedIndex = Math.max(0, tabs.findIndex(tab => tab.id === activeTab));

  return (
    <div className={`ds-tabs ${className}`} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab || (activeTab == null && index === 0);
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={element => { refs.current[index] = element; }}
            type="button"
            role="tab"
            id={`ds-tab-${String(tab.id)}`}
            aria-selected={isActive}
            aria-controls={tab.panelId}
            tabIndex={isActive ? 0 : -1}
            className={`ds-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange?.(tab.id)}
            onKeyDown={event => moveSelection(
              event,
              refs.current.slice(0, tabs.length),
              selectedIndex,
              nextIndex => onChange?.(tabs[nextIndex]?.id)
            )}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
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
  options = [],
  value,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Segmented options'
}) {
  const refs = useRef([]);
  const selectedIndex = Math.max(0, options.findIndex(option => (option.id ?? option.value) === value));

  return (
    <div className={`ds-segmented ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option, index) => {
        const optionId = option.id ?? option.value;
        const isSelected = optionId === value || (value == null && index === 0);
        const Icon = option.icon;
        return (
          <button
            key={optionId}
            ref={element => { refs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`ds-segmented-btn ${isSelected ? 'active' : ''}`}
            onClick={() => onChange?.(optionId)}
            onKeyDown={event => moveSelection(
              event,
              refs.current.slice(0, options.length),
              selectedIndex,
              nextIndex => onChange?.(options[nextIndex]?.id ?? options[nextIndex]?.value)
            )}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
