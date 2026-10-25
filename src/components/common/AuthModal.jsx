import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Briefcase,
  ArrowRight,
  Eye,
  EyeOff,
  MapPin,
  Navigation,
  KeyRound,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCurrentLocationAddress } from '../../utils/location';

export default function AuthModal({ onNotice }) {
  const navigate = useNavigate();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authMode,
    setAuthMode,
    authError,
    setAuthError,
    login,
    register,
    sendOtp,
    verifyOtpAndLogin
  } = useAuth();

  // Mode: 'login' | 'register'
  // Login method: 'otp' | 'password'
  const [loginMethod, setLoginMethod] = useState('otp');

  // Form Fields - Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // OTP State
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [simulatedSmsCode, setSimulatedSmsCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [needsNameForNewUser, setNeedsNameForNewUser] = useState(false);
  const [registrationToken, setRegistrationToken] = useState('');
  const [otpFullName, setOtpFullName] = useState('');
  const [otpLocation, setOtpLocation] = useState('');

  // Form Fields - Register
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAccountType, setRegAccountType] = useState('customer');
  const [regCategory, setRegCategory] = useState('electrical-repair');
  const [regBaseCharge, setRegBaseCharge] = useState('LKR 1,500');
  const [regNicNumber, setRegNicNumber] = useState('');
  const [regNicDoc, setRegNicDoc] = useState('');
  const [regTradeCert, setRegTradeCert] = useState('');

  function handleFileUpload(e, setter) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocatingReg, setIsLocatingReg] = useState(false);

  // Resend timer countdown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isAuthModalOpen) return null;

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    const phoneToUse = (otpPhone || loginIdentifier).trim();
    if (!phoneToUse) {
      setAuthError('Please enter your mobile phone number.');
      return;
    }
    setIsSendingOtp(true);
    setAuthError('');
    try {
      const data = await sendOtp(phoneToUse);
      setOtpSent(true);
      setSimulatedSmsCode(data.devCode || '');
      setResendCooldown(30);
      if (onNotice) {
        onNotice(`📱 SMS Sent! Simulation Code: [ ${data.devCode} ]`);
      }
    } catch (err) {
      setAuthError(err.message || 'Could not send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyOtpSubmit(e) {
    e.preventDefault();
    const phoneToUse = (otpPhone || loginIdentifier).trim();
    if (!phoneToUse || (!registrationToken && !otpCode.trim())) {
      setAuthError('Please enter both mobile number and 6-digit OTP code.');
      return;
    }
    if (needsNameForNewUser && !otpFullName.trim()) {
      setAuthError('Please enter your full name to complete registration.');
      return;
    }
    setIsVerifyingOtp(true);
    setAuthError('');

    try {
      const data = await verifyOtpAndLogin(
        phoneToUse,
        otpCode.trim(),
        otpFullName.trim(),
        otpLocation.trim(),
        registrationToken
      );
      if (data.needsRegistration) {
        setNeedsNameForNewUser(true);
        if (data.registrationToken) {
          setRegistrationToken(data.registrationToken);
        }
        setAuthError('');
        setIsVerifyingOtp(false);
        return;
      }

      closeAuthModal();
      resetForms();
      if (onNotice && data.user) {
        onNotice(data.isNewUser ? `Welcome, ${data.user.fullName}! Account created.` : `Welcome back, ${data.user.fullName}!`);
      }
      if (data.user?.accountType === 'provider') {
        navigate('/provider');
      } else if (data.user?.accountType === 'admin') {
        navigate('/admin');
      }
    } catch (err) {
      setAuthError(err.message || 'OTP verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handlePasswordLoginSubmit(e) {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      const user = await login(loginIdentifier, loginPassword);
      closeAuthModal();
      resetForms();
      if (onNotice) {
        onNotice(user.accountType === 'admin' ? `Welcome back, Super Admin ${user.fullName}!` : `Welcome back, ${user.fullName}!`);
      }
      if (user?.accountType === 'provider') {
        navigate('/provider');
      } else if (user?.accountType === 'admin') {
        navigate('/admin');
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const cleanPhoneDigits = regPhone.trim().replace(/[\s-]/g, '');
    if (!cleanPhoneDigits) {
      setAuthError('Mobile number is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        fullName: regFullName.trim(),
        phone: regPhone.trim(),
        email: regAccountType === 'customer' ? null : (regEmail.trim() || null),
        location: regLocation.trim(),
        password: regAccountType === 'customer' ? (regPassword || 'customer123') : regPassword,
        accountType: regAccountType,
        category: regAccountType === 'provider' ? regCategory : null,
        categoryName: regAccountType === 'provider' ? (
          regCategory === 'electrical-repair' ? 'Electrical Repair' :
          regCategory === 'plumbing' ? 'Plumbing' :
          regCategory === 'food-shops' ? 'Food Shops' : 'Other Services'
        ) : null,
        baseCharge: regAccountType === 'provider' ? regBaseCharge : null,
        nicNumber: regAccountType === 'provider' ? regNicNumber.trim() : null,
        nicDocument: regAccountType === 'provider' ? regNicDoc : null,
        tradeCertificate: regAccountType === 'provider' ? regTradeCert : null
      };

      const data = await register(payload);
      closeAuthModal();
      resetForms();

      if (regAccountType === 'provider') {
        if (onNotice) {
          onNotice('📋 Provider application submitted! Your account is pending Admin approval before activation.');
        }
      } else {
        if (onNotice && data.user) {
          onNotice(`Welcome, ${data.user.fullName}! Registered successfully.`);
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDetectRegLocation() {
    setIsLocatingReg(true);
    setAuthError('');
    try {
      const loc = await fetchCurrentLocationAddress();
      setRegLocation(loc);
      if (needsNameForNewUser) {
        setOtpLocation(loc);
      }
    } catch (err) {
      setAuthError(err.message || 'Could not retrieve your current location.');
    } finally {
      setIsLocatingReg(false);
    }
  }

  function resetForms() {
    setLoginIdentifier('');
    setLoginPassword('');
    setOtpPhone('');
    setOtpCode('');
    setOtpSent(false);
    setSimulatedSmsCode('');
    setRegistrationToken('');
    setNeedsNameForNewUser(false);
    setOtpFullName('');
    setOtpLocation('');
    setRegFullName('');
    setRegPhone('');
    setRegEmail('');
    setRegLocation('');
    setRegPassword('');
    setRegAccountType('customer');
    setRegNicNumber('');
    setRegNicDoc('');
    setRegTradeCert('');
  }

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h3>{authMode === 'login' ? 'Sign In to ARY Services' : 'Create an Account'}</h3>
            <p>
              {authMode === 'login'
                ? 'Enter your phone number or credentials to continue.'
                : 'Register as a Customer or Service Provider.'}
            </p>
          </div>
          <button className="modal-close" onClick={closeAuthModal} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Tabs for Sign In vs Register */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => { setAuthMode('login'); setAuthError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => { setAuthMode('register'); setAuthError(''); }}
          >
            Create Account
          </button>
        </div>

        {authError && <div className="auth-error-msg">{authError}</div>}

        {authMode === 'login' ? (
          <div>
            {/* Toggle Login Method */}
            <div style={{
              display: 'flex',
              background: '#f2f6f3',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '15px'
            }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 0,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: loginMethod === 'otp' ? 'white' : 'transparent',
                  color: loginMethod === 'otp' ? '#174d3d' : '#68776d',
                  boxShadow: loginMethod === 'otp' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => { setLoginMethod('otp'); setAuthError(''); }}
              >
                <PhoneCall size={13} /> Mobile OTP (Customer)
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 0,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: loginMethod === 'password' ? 'white' : 'transparent',
                  color: loginMethod === 'password' ? '#174d3d' : '#68776d',
                  boxShadow: loginMethod === 'password' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => { setLoginMethod('password'); setAuthError(''); }}
              >
                <KeyRound size={13} /> Password (Admin / Provider)
              </button>
            </div>

            {loginMethod === 'otp' ? (
              <form className="modal-form" onSubmit={otpSent ? handleVerifyOtpSubmit : handleSendOtp}>
                {!otpSent ? (
                  <>
                    <label>
                      <span>Mobile Number</span>
                      <input
                        required
                        type="tel"
                        value={otpPhone}
                        onChange={e => setOtpPhone(e.target.value)}
                        placeholder="e.g. 077 123 4567"
                        autoFocus
                      />
                    </label>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.75rem',
                      color: '#047857',
                      margin: '2px 0 12px'
                    }}>
                      <ShieldCheck size={14} color="#059669" />
                      <span>Protected by Anti-Fraud Shield (HMAC Proof-of-Work Challenge)</span>
                    </div>

                    <button
                      type="submit"
                      className="modal-submit-btn"
                      disabled={isSendingOtp || !otpPhone.trim()}
                    >
                      {isSendingOtp ? 'Sending 6-Digit Code...' : 'Send SMS Verification Code'} <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Simulated SMS banner for dev/testing */}
                    {simulatedSmsCode && (
                      <div className="sms-simulation-box" style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>📱 <b>SMS Simulator:</b> Your OTP code is <b>{simulatedSmsCode}</b></span>
                        <button
                          type="button"
                          style={{
                            background: '#166534',
                            color: 'white',
                            border: 0,
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setOtpCode(simulatedSmsCode)}
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#55665b' }}>
                      Enter the 6-digit code sent to <b>{otpPhone}</b>
                    </div>

                    <label>
                      <span>6-Digit Verification Code</span>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        style={{
                          fontSize: '18px',
                          letterSpacing: '4px',
                          textAlign: 'center',
                          fontWeight: 700
                        }}
                        autoFocus
                      />
                    </label>

                    {needsNameForNewUser && (
                      <>
                        <div className="quick-reg-banner">
                          🌟 <b>Almost done!</b> Please enter your name to complete your new customer profile.
                        </div>
                        <label>
                          <span>Your Full Name *</span>
                          <input
                            required
                            type="text"
                            value={otpFullName}
                            onChange={e => setOtpFullName(e.target.value)}
                            placeholder="e.g. Kannan Kumar"
                          />
                        </label>
                        <label>
                          <div className="label-with-btn">
                            <span>Your Area / Address</span>
                            <button
                              type="button"
                              className="locate-inline-btn"
                              onClick={handleDetectRegLocation}
                              disabled={isLocatingReg}
                            >
                              <Navigation size={12} className={isLocatingReg ? 'spin' : ''} />
                              {isLocatingReg ? 'Detecting...' : 'Detect'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={otpLocation}
                            onChange={e => setOtpLocation(e.target.value)}
                            placeholder="e.g. Colombo 03"
                          />
                        </label>
                      </>
                    )}

                    <button
                      type="submit"
                      className="modal-submit-btn"
                      disabled={isVerifyingOtp || (!registrationToken && otpCode.trim().length !== 6) || (needsNameForNewUser && !otpFullName.trim())}
                    >
                      {isVerifyingOtp ? 'Verifying Code...' : (needsNameForNewUser ? 'Complete Registration' : 'Verify & Sign In')} <ArrowRight size={16} />
                    </button>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#65776d',
                      marginTop: '4px'
                    }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 0, color: '#174d3d', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => { setOtpSent(false); setOtpCode(''); setNeedsNameForNewUser(false); }}
                      >
                        Change number
                      </button>

                      <button
                        type="button"
                        disabled={resendCooldown > 0 || isSendingOtp}
                        style={{
                          background: 'none',
                          border: 0,
                          color: resendCooldown > 0 ? '#99a39d' : '#174d3d',
                          cursor: resendCooldown > 0 ? 'default' : 'pointer',
                          fontWeight: 600
                        }}
                        onClick={handleSendOtp}
                      >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            ) : (
              <form className="modal-form" onSubmit={handlePasswordLoginSubmit}>
                <label>
                  <span>Email or Phone</span>
                  <input
                    required
                    type="text"
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. arikarran14@gmail.com or 0771234567"
                    autoFocus
                  />
                </label>
                <label>
                  <div className="label-with-btn">
                    <span>Password</span>
                    <span style={{ fontSize: '11px', color: '#7a8c80' }}>(Required for Admin & Providers)</span>
                  </div>
                  <div className="password-input-wrapper">
                    <input
                      required
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowLoginPassword(prev => !prev)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                <button type="submit" className="modal-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'} <ArrowRight size={16} />
                </button>

                <div style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #edf0ec',
                  fontSize: '12px',
                  color: '#65736b'
                }}>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    style={{
                      background: 'none',
                      border: 0,
                      color: '#174d3d',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '12px',
                      padding: 0
                    }}
                  >
                    Create Account / Register
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleRegisterSubmit}>
            {/* Account Type Selector at top */}
            <label>
              <span>Select Account Type:</span>
              <div className="account-type-selector">
                <button
                  type="button"
                  className={`type-btn ${regAccountType === 'customer' ? 'selected' : ''}`}
                  onClick={() => setRegAccountType('customer')}
                >
                  <User size={15} /> Customer (Quick)
                </button>
                <button
                  type="button"
                  className={`type-btn ${regAccountType === 'provider' ? 'selected' : ''}`}
                  onClick={() => setRegAccountType('provider')}
                >
                  <Briefcase size={15} /> Service Provider
                </button>
              </div>
            </label>

            {regAccountType === 'customer' ? (
              <>
                <div className="quick-reg-banner">
                  ⚡ <b>Quick Customer Sign-Up:</b> Just enter your Name, Mobile Number and Address!
                </div>

                <label>
                  <span>Full Name *</span>
                  <input
                    required
                    type="text"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Kannan Kumar"
                    autoFocus
                  />
                </label>

                <label>
                  <span>Mobile Number *</span>
                  <input
                    required
                    type="tel"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="e.g. 077 123 4567"
                  />
                </label>

                <label>
                  <div className="label-with-btn">
                    <span>Address / Area *</span>
                    <button
                      type="button"
                      className="locate-inline-btn"
                      onClick={handleDetectRegLocation}
                      disabled={isLocatingReg}
                      title="Auto-detect current location"
                    >
                      <Navigation size={12} className={isLocatingReg ? 'spin' : ''} />
                      {isLocatingReg ? 'Detecting...' : 'Get Current Location'}
                    </button>
                  </div>
                  <div className="input-with-icon">
                    <MapPin size={16} className="field-inner-icon" />
                    <input
                      required
                      type="text"
                      value={regLocation}
                      onChange={e => setRegLocation(e.target.value)}
                      placeholder="e.g. Colombo 03, Western Province (or click detect)"
                    />
                  </div>
                </label>

                <button type="submit" className="modal-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering Customer...' : 'Register as Customer'} <ArrowRight size={16} />
                </button>

                <div style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #edf0ec',
                  fontSize: '12px',
                  color: '#65736b'
                }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    style={{
                      background: 'none',
                      border: 0,
                      color: '#174d3d',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '12px',
                      padding: 0
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </>
            ) : (
              <>
                <label>
                  <span>Full Name *</span>
                  <input
                    required
                    type="text"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    autoFocus
                  />
                </label>

                <label>
                  <span>Mobile Number *</span>
                  <input
                    required
                    type="tel"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="e.g. 077 765 4321"
                  />
                </label>

                <label>
                  <span>Email Address *</span>
                  <input
                    required
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="e.g. provider@example.com"
                  />
                </label>

                <label>
                  <div className="label-with-btn">
                    <span>Business Address / Service Area *</span>
                    <button
                      type="button"
                      className="locate-inline-btn"
                      onClick={handleDetectRegLocation}
                      disabled={isLocatingReg}
                      title="Auto-detect current location"
                    >
                      <Navigation size={12} className={isLocatingReg ? 'spin' : ''} />
                      {isLocatingReg ? 'Detecting...' : 'Get Current Location'}
                    </button>
                  </div>
                  <div className="input-with-icon">
                    <MapPin size={16} className="field-inner-icon" />
                    <input
                      required
                      type="text"
                      value={regLocation}
                      onChange={e => setRegLocation(e.target.value)}
                      placeholder="e.g. Wellawatte, Colombo (or click detect)"
                    />
                  </div>
                </label>

                <label>
                  <span>Primary Service Category *</span>
                  <select
                    value={regCategory}
                    onChange={e => setRegCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '8px',
                      border: '1px solid #dce2d9',
                      background: 'white',
                      fontSize: '13px',
                      color: '#20332d',
                      outline: 'none'
                    }}
                  >
                    <option value="electrical-repair">Electrical Repair</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="food-shops">Food Shops & Groceries</option>
                    <option value="other-services">Other Services (AC, Cleaning, Carpentry)</option>
                  </select>
                </label>

                <label>
                  <span>Base Service / Inspection Charge</span>
                  <input
                    type="text"
                    value={regBaseCharge}
                    onChange={e => setRegBaseCharge(e.target.value)}
                    placeholder="e.g. LKR 1,500"
                  />
                </label>

                {/* Sri Lankan KYC Verification */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px',
                  margin: '8px 0 12px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                    🛡️ Verified Partner KYC Documentation
                  </div>

                  <label style={{ margin: '0 0 10px' }}>
                    <span style={{ fontSize: '12px' }}>National Identity Card (NIC) *</span>
                    <input
                      required
                      type="text"
                      value={regNicNumber}
                      onChange={e => setRegNicNumber(e.target.value)}
                      placeholder="e.g. 951234567V or 199512345678"
                    />
                  </label>

                  <label style={{ margin: '0 0 10px' }}>
                    <span style={{ fontSize: '12px' }}>Upload NIC Front/Back Photo (Optional)</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => handleFileUpload(e, setRegNicDoc)}
                      style={{ fontSize: '12px', padding: '6px' }}
                    />
                    {regNicDoc && (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'block', marginTop: 4 }}>
                        ✓ NIC document attached for Admin inspection
                      </span>
                    )}
                  </label>

                  <label style={{ margin: 0 }}>
                    <span style={{ fontSize: '12px' }}>Trade Certificate / License (Optional)</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => handleFileUpload(e, setRegTradeCert)}
                      style={{ fontSize: '12px', padding: '6px' }}
                    />
                    {regTradeCert && (
                      <span style={{ fontSize: '11px', color: '#059669', display: 'block', marginTop: 4 }}>
                        ✓ Trade certificate attached
                      </span>
                    )}
                  </label>
                </div>

                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: '#166534',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  🔒 Final Step: Set your login password to complete registration
                </div>

                <label>
                  <span>Login Password *</span>
                  <div className="password-input-wrapper">
                    <input
                      required
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Create your provider password (min 6 characters)"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowRegPassword(prev => !prev)}
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <div className="provider-helper-note">
                  ℹ️ Provider accounts require Super Admin approval before activation.
                </div>

                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={isSubmitting}
                  style={{
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: '#15803d',
                    boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)'
                  }}
                >
                  {isSubmitting ? 'Submitting Registration...' : 'Register as Service Provider'} <ArrowRight size={18} />
                </button>

                <div style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #edf0ec',
                  fontSize: '12px',
                  color: '#65736b'
                }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    style={{
                      background: 'none',
                      border: 0,
                      color: '#174d3d',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '12px',
                      padding: 0
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
