import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BriefcaseBusiness,
  ShieldCheck,
  Zap,
  Wrench,
  Clock,
  TrendingUp,
  MapPin,
  ArrowRight,
  LogIn,
  CheckCircle2,
  DollarSign,
  Star,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';
import { subscribeToAppEvents } from '../../utils/events';
import ProviderDashboard from './ProviderDashboard';
import { Button, Skeleton } from '../../design-system';

const SectionFallback = () => (
  <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 960, margin: '0 auto' }}>
    <Skeleton height="36px" width="40%" />
    <Skeleton height="180px" width="100%" borderRadius="16px" />
    <Skeleton height="300px" width="100%" borderRadius="16px" />
  </div>
);

export default function ProviderPortalView({ onNotice }) {
  const { currentUser, openAuthModal, switchRole } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const bookingsRequestRef = useRef(0);

  const isProvider = currentUser?.accountType === 'provider';

  const fetchBookings = useCallback(async () => {
    const requestId = ++bookingsRequestRef.current;
    if (!currentUser?.token || currentUser.accountType !== 'provider') {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load provider bookings.');
      if (requestId !== bookingsRequestRef.current) return;
      if (!Array.isArray(data.bookings)) throw new Error('The server returned an unexpected bookings list. Please refresh.');
      setBookings(data.bookings.filter(b => b && typeof b === 'object' && b.id !== null && b.id !== undefined));
    } catch (error) {
      if (requestId === bookingsRequestRef.current) {
        const msg = getFriendlyErrorMessage(error, 'Could not load bookings.');
        setNotice(msg);
        onNotice?.(msg);
      }
    } finally {
      if (requestId === bookingsRequestRef.current) setLoading(false);
    }
  }, [currentUser?.token, currentUser?.accountType, onNotice]);

  useEffect(() => {
    if (isProvider) {
      fetchBookings();
    }
    return () => { bookingsRequestRef.current += 1; };
  }, [fetchBookings, isProvider]);

  useEffect(() => {
    if (!isProvider || !currentUser?.token) return undefined;
    const refresh = () => fetchBookings();
    return subscribeToAppEvents(currentUser?.token, {
      'booking:created': refresh,
      'booking:status_updated': refresh,
      'booking:quote_sent': refresh,
      'booking:quote_decided': refresh,
      'booking:reschedule_requested': refresh,
      'booking:reschedule_decided': refresh,
      'grocery:order_created': refresh,
      'grocery:order_updated': refresh,
      'driver:job_updated': refresh
    });
  }, [isProvider, currentUser?.token, fetchBookings]);

  async function updateBookingStatus(bookingId, status) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update booking status.');
      const msg = `Booking status updated to ${status.replaceAll('_', ' ')}.`;
      setNotice(msg);
      onNotice?.(msg);
      await fetchBookings();
    } catch (error) {
      const err = getFriendlyErrorMessage(error, 'Could not update booking status.');
      setNotice(err);
      onNotice?.(err);
    }
  }

  async function confirmCashPayment(bookingId, amount) {
    if (!currentUser?.token || !bookingId) return false;
    try {
      const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId)}/cash-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ amount })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not record cash received.');
      const msg = data.message || 'Cash payment recorded.';
      setNotice(msg);
      onNotice?.(msg);
      await fetchBookings();
      return true;
    } catch (error) {
      const err = getFriendlyErrorMessage(error, 'Could not record cash received.');
      setNotice(err);
      onNotice?.(err);
      return false;
    }
  }

  async function decideReschedule(bookingId, decision) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId)}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ decision })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update reschedule request.');
      const msg = data.message || 'Reschedule request updated.';
      setNotice(msg);
      onNotice?.(msg);
      await fetchBookings();
    } catch (error) {
      const err = getFriendlyErrorMessage(error, 'Could not update reschedule request.');
      setNotice(err);
      onNotice?.(err);
    }
  }

  // 1. If authenticated as Service Provider, render full dedicated Partner Dashboard
  if (isProvider) {
    return (
      <div className="provider-portal-container" style={{ minHeight: '80vh', paddingBottom: '80px' }}>
        <Suspense fallback={<SectionFallback />}>
          <ProviderDashboard
            bookings={bookings}
            isLoading={loading}
            onRefresh={fetchBookings}
            onUpdateStatus={updateBookingStatus}
            onConfirmCashPayment={confirmCashPayment}
            onDecideReschedule={decideReschedule}
            notice={notice}
            onSetNotice={(msg) => { setNotice(msg); onNotice?.(msg); }}
          />
        </Suspense>
      </div>
    );
  }

  // 2. If not a provider, render the bespoke Partner Portal & Onboarding Experience
  return (
    <div className="provider-onboarding-shell" style={{ maxWidth: 880, margin: '24px auto', padding: '0 16px 80px' }}>
      {/* Hero Card */}
      <section style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        color: '#ffffff',
        borderRadius: '24px',
        padding: '36px 24px',
        boxShadow: '0 12px 36px -4px rgba(6, 95, 70, 0.35)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.15)',
          padding: '6px 14px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          marginBottom: '16px'
        }}>
          <Zap size={14} style={{ color: '#fbbf24' }} />
          <span>ARY SERVICE PARTNER NETWORK</span>
        </div>

        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25, color: '#ffffff' }}>
          Grow Your Service Business in Sri Lanka
        </h1>

        <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.95)', maxWidth: 580, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Connect with verified homeowners and businesses looking for electricians, plumbers, AC technicians and repair professionals in Colombo, Kandy, Galle and nationwide.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            className="ary-partner-primary-btn"
            onClick={() => openAuthModal('login')}
            style={{
              minHeight: '50px',
              padding: '0 26px',
              background: '#ffffff',
              color: '#065f46',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              transition: 'transform 0.15s ease'
            }}
          >
            <LogIn size={18} /> Sign In to Partner Workspace
          </button>

          <button
            type="button"
            className="ary-partner-secondary-btn"
            onClick={() => openAuthModal('register')}
            style={{
              minHeight: '50px',
              padding: '0 24px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.4)',
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
            Register as Service Partner <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* 4 Partner Highlights Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '24px' }}>
        <div style={{
          background: 'var(--surface-primary, #ffffff)',
          border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
          borderRadius: '18px',
          padding: '20px',
          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#d1fae5', color: '#065f46', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <ShieldCheck size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>100% Escrow Protection</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Never chase unpaid invoices. Customers deposit service funds into escrow before you start work.
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
            <MapPin size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Geofenced Job Leads</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Receive job requests strictly within your selected city and service radius in Sri Lanka.
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
            <Clock size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Flexible Working Schedule</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Toggle availability anytime. Accept emergency calls or schedule jobs days in advance.
          </p>
        </div>

        <div style={{
          background: 'var(--surface-primary, #ffffff)',
          border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
          borderRadius: '18px',
          padding: '20px',
          boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f3e8ff', color: '#7c3aed', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
            <TrendingUp size={24} />
          </div>
          <b style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Direct Bank Transfer</b>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Request weekly withdrawals straight to Commercial Bank, BOC, Sampath Bank or HNB.
          </p>
        </div>
      </section>
    </div>
  );
}
