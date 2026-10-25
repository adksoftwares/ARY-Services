import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  ShoppingBasket
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCurrentLocationAddress, getLastDetectedCoordinates } from '../../utils/location';

export default function HeroSection({
  address,
  setAddress,
  query,
  setQuery,
  onNotice,
  onSearch,
  onLocationDetected
}) {
  const { isCustomerLoggedIn, openAuthModal } = useAuth();
  const [isLocating, setIsLocating] = useState(false);

  async function handleDetectLocation() {
    setIsLocating(true);
    try {
      const loc = await fetchCurrentLocationAddress();
      setAddress(loc);
      const coords = getLastDetectedCoordinates();
      if (onLocationDetected && coords) {
        onLocationDetected(coords);
      }
      if (onNotice) onNotice(`📍 Location updated: ${loc}`);
    } catch (err) {
      if (onNotice) onNotice(err.message || 'Could not retrieve current location.');
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="live-dot" /> LOCAL SERVICES, MADE SIMPLE
        </span>
        <h1>
          Good help is<br />
          <em>closer than you think.</em>
        </h1>
        <p>Discover local shops and trusted service providers for the things that matter every day.</p>

        {isCustomerLoggedIn ? (
          <div className="search-panel">
            <label className="search-field">
              <MapPin size={19} />
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter your area or address"
              />
              <button
                type="button"
                className="search-locate-btn"
                onClick={handleDetectLocation}
                disabled={isLocating}
                title="Use current location"
              >
                <Navigation size={14} className={isLocating ? 'spin' : ''} />
              </button>
            </label>
            <label className="search-field service-search">
              <Search size={19} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="What service do you need?"
              />
            </label>
            <button
              className="search-button"
              onClick={() => {
                if (onSearch) onSearch();
                else if (onNotice) onNotice('Showing services matching your search.');
              }}
            >
              Find services
            </button>
          </div>
        ) : (
          <div className="sign-in-prompt-card">
            <div className="sign-in-prompt-info">
              <span className="prompt-icon-badge"><Lock size={18} /></span>
              <div>
                <b>Sign in to search services</b>
                <small>Please log in to your customer account to search local providers and book services.</small>
              </div>
            </div>
            <button className="prompt-sign-in-btn" onClick={() => openAuthModal('login')}>
              Sign in now <ArrowRight size={15} />
            </button>
          </div>
        )}

        <div className="trust-row">
          <span><ShieldCheck size={17} /> Provider approval process</span>
          <span><CheckCircle2 size={17} /> Clear service details</span>
        </div>
      </div>

      <div className="hero-art" aria-hidden="true">
        <div className="art-circle circle-one" />
        <div className="art-circle circle-two" />
        <div className="art-card card-top">
          <span className="mini-icon green"><Wrench size={22} /></span>
          <span><b>Home repairs</b><small>Find local professionals</small></span>
          <CheckCircle2 className="art-check" size={18} />
        </div>
        <div className="art-card card-bottom">
          <span className="mini-icon orange"><ShoppingBasket size={22} /></span>
          <span><b>Local food shops</b><small>Explore shops around you</small></span>
        </div>
        <div className="art-monogram">A<span>.</span></div>
        <span className="float-star">✳</span>
      </div>
    </section>
  );
}
