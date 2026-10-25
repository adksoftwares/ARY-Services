import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Navigation, MapPin, ArrowRight, ShieldCheck, CreditCard, Banknote } from 'lucide-react';
import { fetchCurrentLocationAddress } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

export default function BookingModal({
  isOpen,
  onClose,
  provider,
  selectedCategory,
  initialAddress,
  onBookingSuccess
}) {
  const { currentUser } = useAuth();

  const [bookingAddress, setBookingAddress] = useState(() => initialAddress || currentUser?.location || '');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTimeSlot, setBookingTimeSlot] = useState('Morning (9 AM - 12 PM)');
  const [bookingProblem, setBookingProblem] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('escrow_online'); // 'escrow_online' | 'cash'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialAddress) {
        setBookingAddress(initialAddress);
      } else if (currentUser?.location) {
        setBookingAddress(currentUser.location);
      }
    }
  }, [isOpen, initialAddress, currentUser]);

  if (!isOpen || !provider) return null;

  async function handleDetectLocation() {
    setIsLocating(true);
    setError('');
    try {
      const loc = await fetchCurrentLocationAddress();
      setBookingAddress(loc);
    } catch (err) {
      setError(err.message || 'Could not detect location.');
    } finally {
      setIsLocating(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser?.token) return;
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        providerId: provider.id,
        categorySlug: provider.category || selectedCategory?.slug || 'general',
        categoryName: provider.categoryName || selectedCategory?.name || 'General Service',
        serviceAddress: bookingAddress.trim() || currentUser.location || 'Local Area',
        bookingDate,
        bookingTime: bookingTimeSlot,
        problemDescription: bookingProblem.trim(),
        paymentMethod
      };

      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit booking.');
      }

      onClose();
      setBookingProblem('');
      if (onBookingSuccess) {
        onBookingSuccess(data.booking, provider);
      }
    } catch (err) {
      setError(err.message || 'Could not submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div>
            <h3>Book Service Request</h3>
            <p>with <b>{provider.fullName}</b> ({provider.categoryName || 'Service Specialist'})</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div style={{
          background: '#f4f8f5',
          border: '1px solid #d5e8dc',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '12.5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ color: '#4a6254' }}>Estimated Visit Rate:</span>{' '}
            <b style={{ color: '#144c35' }}>{provider.baseCharge || 'LKR 1,500'}</b>
          </div>
          <span className="verified-provider-badge">
            <CheckCircle2 size={12} /> Verified Contractor
          </span>
        </div>

        {error && <div className="auth-error-msg">{error}</div>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            <div className="label-with-btn">
              <span>Service Address / Job Location *</span>
              <button
                type="button"
                className="locate-inline-btn"
                onClick={handleDetectLocation}
                disabled={isLocating}
              >
                <Navigation size={12} className={isLocating ? 'spin' : ''} />
                {isLocating ? 'Detecting...' : 'Auto-detect'}
              </button>
            </div>
            <div className="input-with-icon">
              <MapPin size={16} className="field-inner-icon" />
              <input
                required
                type="text"
                value={bookingAddress}
                onChange={e => setBookingAddress(e.target.value)}
                placeholder="e.g. No. 45, Galle Road, Colombo 03"
              />
            </div>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              <span>Preferred Date *</span>
              <input
                required
                type="date"
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </label>

            <label>
              <span>Time Slot *</span>
              <select
                value={bookingTimeSlot}
                onChange={e => setBookingTimeSlot(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '8px',
                  border: '1px solid #dce2d9',
                  background: 'white',
                  fontSize: '13px'
                }}
              >
                <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                <option value="Afternoon (1 PM - 5 PM)">Afternoon (1 PM - 5 PM)</option>
                <option value="Evening (5 PM - 8 PM)">Evening (5 PM - 8 PM)</option>
                <option value="Emergency (ASAP)">Emergency (ASAP)</option>
              </select>
            </label>
          </div>

          <label>
            <span>Describe your problem or request *</span>
            <textarea
              required
              rows={3}
              value={bookingProblem}
              onChange={e => setBookingProblem(e.target.value)}
              placeholder="e.g. Main circuit breaker keeps tripping when AC is turned on, needs inspection."
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                border: '1px solid #dce2d9',
                fontFamily: 'inherit',
                fontSize: '13px',
                resize: 'vertical'
              }}
            />
          </label>

          {/* Payment Method & Escrow Protection */}
          <div style={{ margin: '14px 0' }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Payment & Guarantee Protection:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div
                onClick={() => setPaymentMethod('escrow_online')}
                style={{
                  border: `2px solid ${paymentMethod === 'escrow_online' ? '#059669' : '#e2e8f0'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: paymentMethod === 'escrow_online' ? '#ecfdf5' : '#fff',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', color: '#065f46' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span>Online Escrow</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#047857', lineHeight: 1.3 }}>
                  Protected by 14-Day ARY Workmanship Guarantee. Released only when satisfied.
                </p>
              </div>

              <div
                onClick={() => setPaymentMethod('cash')}
                style={{
                  border: `2px solid ${paymentMethod === 'cash' ? '#059669' : '#e2e8f0'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: paymentMethod === 'cash' ? '#ecfdf5' : '#fff',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  <Banknote size={16} color="#475569" />
                  <span>Direct Cash</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.3 }}>
                  Pay cash directly to technician upon visit completion.
                </p>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#68776d', margin: '4px 0 14px', lineHeight: 1.4 }}>
            ℹ️ The provider will receive this request with your registered contact number (<b>{currentUser?.phone}</b>) to confirm the appointment.
          </div>

          <button type="submit" className="modal-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Sending Request...' : 'Send Booking Request'} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
