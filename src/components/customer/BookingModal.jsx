import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { fetchCurrentLocationAddress } from '../../utils/location';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { Button, Input, Textarea, Badge, Stepper, Modal } from '../../design-system';

export default function BookingModal({
  isOpen,
  onClose,
  provider,
  selectedCategory,
  initialAddress,
  onBookingSuccess
}) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Service/Problem -> 2: Date/Time -> 3: Address -> 4: Review -> 5: Success
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
      setError(err.message || 'Could not detect location. Please type your address manually.');
    } finally {
      setIsLocating(false);
    }
  }

  // Inline Validation for Each Step
  function canProceedNext() {
    if (step === 1) {
      return Boolean(bookingProblem.trim());
    }
    if (step === 2) {
      return Boolean(bookingDate) && Boolean(bookingTimeSlot);
    }
    if (step === 3) {
      return Boolean(bookingAddress.trim());
    }
    return true;
  }

  function handleNextStep() {
    setError('');
    if (!canProceedNext()) {
      if (step === 1) setError('Please briefly describe the service required.');
      if (step === 2) setError('Please select a valid service date and time slot.');
      if (step === 3) setError('Please provide your service address.');
      return;
    }
    setStep(s => s + 1);
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
    'Afternoon (1 PM - 5 PM)',
    'Evening (5 PM - 8 PM)',
    'Emergency (ASAP)'
  ];

  const STEP_TITLES = ['Describe Need', 'Date & Time', 'Address', 'Review & Pay'];

  const footerContent = step < 5 ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 'var(--space-3)' }}>
      {step > 1 ? (
        <Button
          variant="secondary"
          size="md"
          icon={ArrowLeft}
          onClick={() => { setStep(s => s - 1); setError(''); }}
          disabled={isSubmitting}
        >
          Back
        </Button>
      ) : <div />}

      {step < 4 ? (
        <Button
          variant="primary"
          size="md"
          className="wizard-next-btn"
          onClick={handleNextStep}
        >
          Continue <ArrowRight size={15} />
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          className="wizard-next-btn"
          loading={isSubmitting}
          onClick={handleSubmitBooking}
        >
          Confirm Booking Request
        </Button>
      )}
    </div>
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 5 ? 'Booking Confirmed!' : `Book ${provider.fullName}`}
      isBottomSheet={true}
      size="md"
      footer={footerContent}
    >
      <div className="booking-wizard-content">
        {/* Multi-step Progress Bar (Steps 1-4) */}
        {step < 5 && (
          <div className="booking-stepper-container">
            <Stepper
              steps={STEP_TITLES}
              currentStep={step - 1}
            />
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="wizard-error-banner" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Service & Problem Description */}
        {step === 1 && (
          <div className="wizard-step-pane">
            <div className="provider-quick-card">
              <b>{provider.fullName}</b>
              <span>{selectedCategory?.name || provider.categoryName || 'Trades Specialist'} • Starting at {provider.baseCharge || 'LKR 1,500'}</span>
            </div>

            <label className="wizard-form-label">
              <span>What service or issue do you need help with? *</span>
              <Textarea
                rows={4}
                value={bookingProblem}
                onChange={e => { setBookingProblem(e.target.value); setError(''); }}
                placeholder="e.g. Kitchen light tripping the main breaker, need circuit inspection and new switch installed."
                required={true}
                className="wizard-textarea"
                aria-describedby="problem-hint"
              />
              <small id="problem-hint" className="wizard-input-hint">
                Provide as much detail as possible so the technician can bring the right tools and parts.
              </small>
            </label>
          </div>
        )}

        {/* Step 2: Date & Time Picker */}
        {step === 2 && (
          <div className="wizard-step-pane">
            <label className="wizard-form-label">
              <span>Preferred Service Date *</span>
              <Input
                type="date"
                value={bookingDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { setBookingDate(e.target.value); setError(''); }}
                required={true}
              />
            </label>

            <div className="time-slots-group">
              <span className="slots-title">Select Arrival Window *</span>
              <div className="time-slots-grid">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    className={`time-slot-btn ${bookingTimeSlot === slot ? 'active' : ''}`}
                    onClick={() => { setBookingTimeSlot(slot); setError(''); }}
                  >
                    <Clock size={14} className="slot-icon" />
                    <span>{slot}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Service Address with GPS */}
        {step === 3 && (
          <div className="wizard-step-pane">
            <div className="address-detect-header">
              <span className="wizard-label-text">Where should the provider visit? *</span>
              <button
                type="button"
                className="use-gps-pill"
                onClick={handleDetectLocation}
                disabled={isLocating}
                aria-label="Use current GPS location"
              >
                <Navigation size={13} className={isLocating ? 'spin' : ''} />
                <span>{isLocating ? 'Locating...' : 'Use my current location'}</span>
              </button>
            </div>

            <Textarea
              rows={3}
              value={bookingAddress}
              onChange={e => { setBookingAddress(e.target.value); setError(''); }}
              placeholder="House/Apartment #, Street, Landmark, Town"
              required={true}
              className="wizard-textarea"
            />
            <small className="wizard-input-hint">
              Accurate address helps the verified provider estimate travel time and reach you punctually.
            </small>
          </div>
        )}

        {/* Step 4: Review & Payment Selection */}
        {step === 4 && (
          <div className="wizard-step-pane">
            <div className="booking-summary-card">
              <div className="summary-row">
                <span className="sum-label">Provider</span>
                <b className="sum-val">{provider.fullName}</b>
              </div>
              <div className="summary-row">
                <span className="sum-label">Category</span>
                <span className="sum-val">{selectedCategory?.name || provider.categoryName || 'Service'}</span>
              </div>
              <div className="summary-row">
                <span className="sum-label">Schedule</span>
                <span className="sum-val">{bookingDate} • {bookingTimeSlot}</span>
              </div>
              <div className="summary-row">
                <span className="sum-label">Address</span>
                <span className="sum-val">{bookingAddress}</span>
              </div>
              <div className="summary-row">
                <span className="sum-label">Starting Rate</span>
                <b className="sum-val" style={{ color: 'var(--brand-primary)' }}>{provider.baseCharge || 'LKR 1,500'}</b>
              </div>
            </div>

            <div className="payment-method-selector">
              <span className="payment-title">Payment Method</span>
              <div className="payment-options-grid">
                <button
                  type="button"
                  className={`payment-option-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote size={18} />
                  <div>
                    <b>Cash on Completion (Recommended)</b>
                    <small>Pay directly to the provider after inspection and satisfaction.</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="payment-option-btn disabled"
                  style={{ opacity: 0.65, cursor: 'not-allowed' }}
                  onClick={() => {
                    setError('Online card escrow is temporarily paused pending LankaPay gateway certification. Please use Cash on Completion.');
                    setPaymentMethod('cash');
                  }}
                >
                  <CreditCard size={18} />
                  <div>
                    <b>ARY Escrow Shield (Cards / Online)</b>
                    <small>Coming soon · Please choose Cash on Completion for now.</small>
                  </div>
                </button>
              </div>
            </div>

            <div className="trust-guarantee-note">
              <ShieldCheck size={16} />
              <span>Includes 14-day ARY workmanship warranty. Quote changes require your approval.</span>
            </div>
          </div>
        )}

        {/* Step 5: Success Screen */}
        {step === 5 && (
          <div className="wizard-success-pane">
            <div className="success-icon-badge">
              <CheckCircle2 size={44} className="success-check-icon" />
            </div>

            <h3 className="success-heading">Booking Request Sent!</h3>
            <p className="success-subtext">
              We've dispatched your service request to <b>{provider.fullName}</b>.
              {createdBooking?.id && (
                <span className="booking-ref-chip">Ref #{createdBooking.id.slice(0, 8)}</span>
              )}
            </p>

            <div className="next-steps-card">
              <b>What happens next?</b>
              <ol className="next-steps-list">
                <li>Provider reviews your schedule request within 15-30 minutes.</li>
                <li>If special parts or scope is needed, they will send a formal quote.</li>
                <li>You can accept or decline quotes anytime in <b>My Bookings</b>.</li>
              </ol>
            </div>

            <div className="success-actions-row">
              <Button
                variant="primary"
                size="lg"
                fullWidth={true}
                onClick={() => {
                  onClose();
                  navigate('/bookings');
                }}
              >
                Go to My Bookings <ArrowRight size={16} />
              </Button>
              <Button
                variant="ghost"
                size="md"
                fullWidth={true}
                onClick={onClose}
              >
                Done / Keep Exploring
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
