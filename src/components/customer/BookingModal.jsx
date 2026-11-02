import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Navigation,
  MapPin,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Banknote,
  Check
} from 'lucide-react';
import { fetchCurrentLocationAddress } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { Button, Input, Textarea, Badge, Stepper } from '../../design-system';

export default function BookingModal({
  isOpen,
  onClose,
  provider,
  selectedCategory,
  initialAddress,
  onBookingSuccess
}) {
  const { currentUser } = useAuth();

  const [step, setStep] = useState(1); // 1: Details -> 2: Date/Time -> 3: Address -> 4: Review -> 5: Success
  const [bookingAddress, setBookingAddress] = useState(() => initialAddress || currentUser?.location || '');
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookingTimeSlot, setBookingTimeSlot] = useState('Morning (9 AM - 12 PM)');
  const [bookingProblem, setBookingProblem] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
      setCreatedBooking(null);
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

  async function handleSubmitBooking() {
    if (!currentUser?.token) return;
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        providerId: provider.id,
        categorySlug: selectedCategory?.slug || provider.category || 'general',
        categoryName: selectedCategory?.name || provider.categoryName || 'General Service',
        serviceAddress: bookingAddress.trim() || currentUser.location || 'Local Area',
        bookingDate,
        bookingTime: bookingTimeSlot,
        problemDescription: bookingProblem.trim() || 'General inspection and service.',
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

      setCreatedBooking(data.booking);
      setStep(5); // Success step
      if (onBookingSuccess) {
        onBookingSuccess(data.booking, provider);
      }
    } catch (err) {
      setError(err.message || 'Could not submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const TIME_SLOTS = [
    'Morning (9 AM - 12 PM)',
    'Afternoon (1 PM - 4 PM)',
    'Evening (4 PM - 7 PM)',
    'Emergency / As Soon As Possible'
  ];

  return (
    <div
      className="ds-modal-backdrop ds-bottom-sheet"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ds-modal-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 540 }}
      >
        <div className="ds-sheet-handle" aria-hidden="true" />

        <div className="ds-modal-header">
          <div>
            <h2 className="ds-modal-title">Book Service Request</h2>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
              with <b>{provider.fullName}</b> ({provider.categoryName || 'Service Specialist'})
            </div>
          </div>
          <button
            type="button"
            className="ds-icon-btn sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {step < 5 && (
          <div style={{ padding: '0 var(--space-6)' }}>
            <Stepper
              steps={['Details', 'Date & Time', 'Address', 'Review']}
              currentStep={step - 1}
            />
          </div>
        )}

        <div className="ds-modal-body">
          {error && (
            <div className="ds-toast ds-toast-error" style={{ marginBottom: 'var(--space-4)' }} role="alert">
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="booking-step-content">
              <div className="booking-rate-card">
                <div>
                  <span className="rate-card-label">Estimated Visit Charge</span>
                  <div className="rate-card-price">{provider.baseCharge || 'LKR 1,500'}</div>
                </div>
                <Badge variant="success" dot={false}>
                  <ShieldCheck size={13} /> Verified Professional
                </Badge>
              </div>

              <Textarea
                label="Describe your problem or service requirement"
                required={true}
                placeholder="e.g. Main power tripping in kitchen, or water leakage under sink..."
                value={bookingProblem}
                onChange={e => setBookingProblem(e.target.value)}
                helperText="Be as specific as possible so the technician brings the correct tools and equipment."
                rows={4}
              />
            </div>
          )}

          {/* STEP 2: Date & Time */}
          {step === 2 && (
            <div className="booking-step-content">
              <Input
                label="Preferred Service Date"
                type="date"
                required={true}
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                icon={Calendar}
              />

              <div className="ds-form-field">
                <label className="ds-label"><span>Preferred Time Slot *</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {TIME_SLOTS.map(slot => (
                    <label
                      key={slot}
                      className={`slot-radio-card ${bookingTimeSlot === slot ? 'active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="timeSlot"
                        value={slot}
                        checked={bookingTimeSlot === slot}
                        onChange={() => setBookingTimeSlot(slot)}
                      />
                      <Clock size={16} />
                      <span>{slot}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Address */}
          {step === 3 && (
            <div className="booking-step-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Job Location Address *</span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Navigation}
                  onClick={handleDetectLocation}
                  loading={isLocating}
                >
                  Use GPS
                </Button>
              </div>

              <Input
                placeholder="e.g. No. 45, Galle Road, Colombo 03"
                value={bookingAddress}
                onChange={e => setBookingAddress(e.target.value)}
                icon={MapPin}
                required={true}
                helperText="Include building name, floor number or landmark if applicable."
              />

              {currentUser?.location && (
                <button
                  type="button"
                  className="quick-fill-btn"
                  onClick={() => setBookingAddress(currentUser.location)}
                >
                  Fill saved profile address: <b>{currentUser.location}</b>
                </button>
              )}
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="booking-step-content">
              <div className="review-summary-card">
                <div className="review-row">
                  <span className="review-label">Provider</span>
                  <span className="review-val"><b>{provider.fullName}</b></span>
                </div>
                <div className="review-row">
                  <span className="review-label">Service</span>
                  <span className="review-val">{selectedCategory?.name || provider.categoryName || 'General Service'}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Date & Time</span>
                  <span className="review-val">{bookingDate} ({bookingTimeSlot})</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Location</span>
                  <span className="review-val">{bookingAddress}</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Estimated Visit Fee</span>
                  <span className="review-val" style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>
                    {provider.baseCharge || 'LKR 1,500'}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="ds-label"><span>Payment Option</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <label className={`slot-radio-card ${paymentMethod === 'cash' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                    />
                    <Banknote size={18} />
                    <span>Cash on Completion</span>
                  </label>

                  <label className="slot-radio-card disabled" title="Online payment via PayHere available on delivery">
                    <input type="radio" disabled name="payment" value="online" />
                    <CreditCard size={18} />
                    <span>Card (PayHere)</span>
                  </label>
                </div>
              </div>

              <div className="warranty-guarantee-badge" style={{ marginTop: 'var(--space-4)' }}>
                <ShieldCheck size={16} />
                <span>Backed by ARY 14-Day Free Re-service Guarantee</span>
              </div>
            </div>
          )}

          {/* STEP 5: Success Confirmation Screen */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--color-success-50)',
                color: 'var(--color-success-600)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <Check size={36} />
              </div>
              <h3 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-heading)' }}>Booking Request Sent!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-6)' }}>
                Booking ID: <b>#{createdBooking?.id?.slice(0, 8)}</b>. {provider.fullName} has received your request and will confirm shortly.
              </p>
              <Button
                variant="primary"
                size="lg"
                fullWidth={true}
                onClick={onClose}
              >
                Track in My Bookings
              </Button>
            </div>
          )}
        </div>

        {step < 5 && (
          <div className="ds-modal-footer">
            {step > 1 && (
              <Button
                variant="ghost"
                size="md"
                icon={ArrowLeft}
                onClick={() => setStep(s => s - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}

            {step < 4 ? (
              <Button
                variant="primary"
                size="md"
                iconRight={ArrowRight}
                onClick={() => {
                  if (step === 3 && !bookingAddress.trim()) {
                    setError('Please specify a valid service address.');
                    return;
                  }
                  setError('');
                  setStep(s => s + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                loading={isSubmitting}
                onClick={handleSubmitBooking}
              >
                Confirm Request
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
