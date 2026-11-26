import React, { Suspense, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bike,
  ShieldCheck,
  Zap,
  Navigation,
  Clock,
  Coins,
  MapPin,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Car,
  Fuel,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAppEvents } from '../../utils/events';
import DriverWorkspace from './DriverWorkspace';
import { Button, Skeleton } from '../../design-system';

const SectionFallback = () => (
  <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 960, margin: '0 auto' }}>
    <Skeleton height="36px" width="40%" />
    <Skeleton height="180px" width="100%" borderRadius="16px" />
    <Skeleton height="300px" width="100%" borderRadius="16px" />
  </div>
);

export default function DriverPortalView({ onNotice }) {
  const { currentUser, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const isDriver = currentUser?.accountType === 'driver';

  useEffect(() => {
    if (!isDriver || !currentUser?.token) return undefined;
    const notify = () => onNotice?.('Your driver dispatch activity has changed. Refreshing jobs...');
    return subscribeToAppEvents(currentUser?.token, {
      'driver:job_created': notify,
      'driver:job_updated': notify,
      'driver:application_reviewed': notify
    });
  }, [isDriver, currentUser?.token, onNotice]);

  // 1. If signed in as Driver, render full Driver Workspace with live radar and dispatches
  if (isDriver) {
    return (
      <div className="driver-portal-container" style={{ minHeight: '80vh', paddingBottom: '80px' }}>
        <Suspense fallback={<SectionFallback />}>
          <DriverWorkspace onNotice={onNotice} />
        </Suspense>
      </div>
    );
  }

  // 2. If not a driver, render the bespoke Driver & Courier Network Onboarding
  return (
    <div className="driver-onboarding-shell" style={{ maxWidth: 880, margin: '24px auto', padding: '0 16px 80px' }}>
      {/* Hero Card */}
      <section style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        borderRadius: '24px',
        padding: '36px 24px',
        boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.4)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(245, 158, 11, 0.2)',
          color: '#fbbf24',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          marginBottom: '16px',
          border: '1px solid rgba(245, 158, 11, 0.35)'
        }}>
          <Bike size={15} />
          <span>ARY MOBILITY & COURIER DISPATCH</span>
        </div>

        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25 }}>
          Drive Tuk, Car or Deliver Groceries Across Sri Lanka
        </h1>

        <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: 580, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Maximize your daily earnings by taking city passenger rides and retail/grocery merchant parcel deliveries with smart instant dispatch.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            className="ary-driver-primary-btn"
            onClick={() => openAuthModal('login')}
            style={{
              minHeight: '50px',
              padding: '0 26px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <LogIn size={18} /> Sign In to Driver Workspace
          </button>

          <button
            type="button"
            className="ary-driver-secondary-btn"
            onClick={() => openAuthModal('register')}
            style={{
              minHeight: '50px',
              padding: '0 24px',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease'
            }}
          >
            Register as Driver <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* 4 Driver Highlights Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '24px' }}>
        <div style={{
          background: 'var(--surface-primary, #ffffff)',
          border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
          borderRadius: '18px',
          padding: '20px',
          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#d1fae5', color: '#065f46', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <Coins size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Daily Cash Retention</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Collect cash directly from passengers and grocery customers. Settle platform commission easily through the driver wallet.
          </p>
        </div>

        <div style={{
          background: 'var(--surface-primary, #ffffff)',
          border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
          borderRadius: '18px',
          padding: '20px',
          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <Navigation size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Smart GPS Dispatch</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Fast turn-by-turn routing with pickup pin, customer direct calling, and delivery verification OTP.
          </p>
        </div>

        <div style={{
          background: 'var(--surface-primary, #ffffff)',
          border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
          borderRadius: '18px',
          padding: '20px',
          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dbeafe', color: '#2563eb', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <Car size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Tuk, Bike, Car & Mini-Van</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Register three-wheelers for passenger transit or motorbikes for fast food & grocery supermarket delivery.
          </p>
        </div>

        <div style={{
          background: 'var(--surface-primary, #ffffff)',
          border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
          borderRadius: '18px',
          padding: '20px',
          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <Smartphone size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Instant Online / Offline</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Go online with one tap whenever you are ready to work. No fixed shift requirements or penalties.
          </p>
        </div>
      </section>
    </div>
  );
}
