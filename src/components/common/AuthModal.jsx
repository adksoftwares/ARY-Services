import React, { useState } from 'react';
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
  CheckCircle2,
  RefreshCw,
  Bike,
  ShieldCheck,
  Lock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCurrentLocationAddress } from '../../utils/location';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

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
    register
  } = useAuth();

  // Mode: 'login' | 'register'
  // Form Fields - Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form Fields - Register
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAccountType, setRegAccountType] = useState('customer');
  const [regCategory, setRegCategory] = useState('electrical-repair');
  const [regBaseCharge, setRegBaseCharge] = useState('');
  const [regNsnNumber, setRegNsnNumber] = useState('');
  const [regOperatingMode, setRegOperatingMode] = useState('mobile');
  const [regNicNumber, setRegNicNumber] = useState('');
  const [regNicDoc, setRegNicDoc] = useState('');
  const [regTradeCert, setRegTradeCert] = useState('');
  const [regDriverServices, setRegDriverServices] = useState([]);

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

  if (!isAuthModalOpen) return null;

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
      setAuthError(getFriendlyErrorMessage(err, 'Login failed. Please check your credentials.'));
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
    if (regAccountType === 'driver' && regDriverServices.length === 0) {
      setAuthError('Choose Passenger Ride, Shop & Grocery Delivery, or both.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        fullName: regFullName.trim(),
        phone: regPhone.trim(),
        email: regAccountType === 'customer' ? null : (regEmail.trim() || null),
        location: regLocation.trim(),
        password: regPassword,
        accountType: regAccountType,
        driverServices: regAccountType === 'driver' ? regDriverServices : [],
        category: regAccountType === 'provider' ? regCategory : null,
        categoryName: regAccountType === 'provider' ? (
          regCategory === 'electrical-repair' ? 'Electrical Repair' :
          regCategory === 'plumbing' ? 'Plumbing' :
          regCategory === 'food-shops' ? 'Food Shops' :
          regCategory === 'grocery-products' ? 'Grocery Products / Mini Mart' : 'Other Services'
        ) : null,
        baseCharge: regAccountType === 'provider' ? regBaseCharge : null,
        nsnNumber: regAccountType === 'provider' ? regNsnNumber.trim() : null,
        operatingMode: regAccountType === 'provider' ? regOperatingMode : null,
        nicNumber: ['provider', 'driver'].includes(regAccountType) ? regNicNumber.trim() : null,
        nicDocument: ['provider', 'driver'].includes(regAccountType) ? regNicDoc : null,
        tradeCertificate: ['provider', 'driver'].includes(regAccountType) ? regTradeCert : null
      };

      const data = await register(payload);
      closeAuthModal();
      resetForms();

      if (['provider', 'driver'].includes(regAccountType)) {
        if (onNotice) onNotice(regAccountType === 'driver' ? 'Driver account created! Submit your selected driver services for Admin approval before accepting jobs.' : 'Provider application submitted! Your account is pending Admin approval before activation.');
      } else {
        if (onNotice && data.user) {
          onNotice(`Welcome, ${data.user.fullName}! Registered successfully.`);
        }
      }
    } catch (err) {
      setAuthError(getFriendlyErrorMessage(err, 'Registration failed.'));
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
    } catch (err) {
      setAuthError(getFriendlyErrorMessage(err, 'Could not retrieve your current location.'));
    } finally {
      setIsLocatingReg(false);
    }
  }

  function resetForms() {
    setLoginIdentifier('');
    setLoginPassword('');
    setRegFullName('');
    setRegPhone('');
    setRegEmail('');
    setRegLocation('');
    setRegPassword('');
    setRegAccountType('customer');
    setRegNicNumber('');
    setRegNsnNumber('');
    setRegOperatingMode('mobile');
    setRegNicDoc('');
    setRegTradeCert('');
    setRegDriverServices(['food_delivery']);
  }

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={authMode === 'login' ? 'Sign in to ARY Services' : 'Create an ARY account'}
      >
        <div className="modal-header">
          <div>
            <h3>{authMode === 'login' ? 'Sign In to ARY Services' : 'Create an Account'}</h3>
            <p>
              {authMode === 'login'
                ? 'Enter your phone number or credentials to continue.'
                : 'Register as a Customer, Service Provider or Driver.'}
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
            <form className="modal-form" onSubmit={handlePasswordLoginSubmit}>
              <label>
                <span>Mobile Number or Email</span>
                <input
                  required
                  type="text"
                  value={loginIdentifier}
                  onChange={e => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. 077 123 4567 or user@example.com"
                  autoComplete="username"
                  inputMode="email"
                />
              </label>
              <label>
                <div className="label-with-btn">
                  <span>Password</span>
                </div>
                <div className="password-input-wrapper">
                  <input
                    required
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
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
                borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                fontSize: '12px',
                color: 'var(--text-muted, #94a3b8)'
              }}>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                  style={{
                    background: 'none',
                    border: 0,
                    color: 'var(--brand-primary, #ffffff)',
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
                <button
                  type="button"
                  className={`type-btn ${regAccountType === 'driver' ? 'selected' : ''}`}
                  onClick={() => setRegAccountType('driver')}
                >
                  <Bike size={15} /> Driver
                </button>
              </div>
            </label>

            {regAccountType === 'customer' ? (
              <>
                <div className="quick-reg-banner">
                  <Sparkles size={15} style={{ verticalAlign: "middle", marginRight: 4 }} /> <b>Quick Customer Sign-Up:</b> Just enter your Name, Mobile Number, Password and Address!
                </div>

                <label>
                  <span>Full Name *</span>
                  <input
                    required
                    type="text"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Kannan Kumar"
                    autoComplete="name"
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
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </label>

                <label>
                  <div className="label-with-btn">
                    <span>Create Password *</span>
                  </div>
                  <div className="password-input-wrapper">
                    <input
                      required
                      minLength={6}
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Create a password (min. 6 characters)"
                    autoComplete="new-password"
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
                  borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  fontSize: '12px',
                  color: 'var(--text-muted, #94a3b8)'
                }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    style={{
                      background: 'none',
                      border: 0,
                      color: 'var(--brand-primary, #ffffff)',
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

                {regAccountType === 'provider' && <label>
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
                    <option value="grocery-products">Grocery Products / Mini Mart</option>
                    <option value="other-services">Other Services (AC, Cleaning, Carpentry)</option>
                  </select>
                </label>}

                {regAccountType === 'provider' && <>
                  <label>
                    <span>Business Operating Mode *</span>
                    <select required value={regOperatingMode} onChange={e => setRegOperatingMode(e.target.value)} style={{width:'100%',padding:'11px',borderRadius:'8px',border:'1px solid #dce2d9',background:'white',fontSize:'13px',color:'#20332d'}}>
                      <option value="shop">Shop-based</option>
                      <option value="online">Online</option>
                      <option value="mobile">Mobile / On-location</option>
                    </select>
                  </label>
                  <label>
                    <span>Business Reg (BRN) / National Skills / Trade License (NSN) *</span>
                    <input
                      required
                      type="text"
                      value={regNsnNumber}
                      onChange={e => setRegNsnNumber(e.target.value)}
                      placeholder="e.g. BRN-12345 or NVQ-Level-4 or Trade Reg No"
                    />
                    <small style={{ fontSize: '11px', color: 'var(--color-neutral-500, #64748b)', marginTop: 2, display: 'block' }}>
                      Enter your Business Registration Number, NVQ Trade Certification, or Vocational License.
                    </small>
                  </label>
                </>}

                {regAccountType === 'provider' && <label>
                  <span>Base Service / Inspection Charge</span>
                  <input
                    type="text"
                    value={regBaseCharge}
                    onChange={e => setRegBaseCharge(e.target.value)}
                    placeholder="e.g. LKR 1,500"
                  />
                </label>}

                {regAccountType === 'driver' && <section style={{background:'#f0f7f3',border:'1px solid #cfe3d6',borderRadius:10,padding:12,margin:'8px 0 12px'}}>
                  <b style={{fontSize:13,color: 'var(--brand-primary, #ffffff)'}}>Choose your driver services *</b>
                  <p style={{fontSize:12,color:'#647268',margin:'5px 0 10px'}}>Register for one service or both using a single Driver Account.</p>
                  {[["ride","Passenger Ride Service"],["food_delivery","Shop & Grocery Delivery Service"]].map(([value,label]) => <label key={value} style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0',fontSize:13}}><input type="checkbox" checked={regDriverServices.includes(value)} onChange={e=>setRegDriverServices(prev=>e.target.checked?[...prev,value]:prev.filter(x=>x!==value))}/>{label}</label>)}
                </section>}

                {/* Sri Lankan KYC Verification */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px',
                  margin: '8px 0 12px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={16} /> Verified Partner KYC Documentation</span>
                  </div>

                  <label style={{ margin: '0 0 10px' }}>
                    <span style={{ fontSize: '12px' }}>National Identity Card (NIC) *</span>
                    <input
                      required
                      type="text"
                      value={regNicNumber}
                      onChange={e => setRegNicNumber(e.target.value.replace(/[\s-]/g, '').toUpperCase())}
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
                  <Lock size={15} /> Final Step: Set your login password to complete registration
                </div>

                <label>
                  <span>Login Password *</span>
                  <div className="password-input-wrapper">
                    <input
                      required
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder={regAccountType === 'driver' ? 'Create your driver password (min 6 characters)' : 'Create your provider password (min 6 characters)'}
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
                  ℹ️ {regAccountType === 'driver' ? 'Driver accounts require Super Admin approval before activation.' : 'Provider accounts require Super Admin approval before activation.'}
                </div>

                {authError && <div className="auth-error-msg" style={{ marginBottom: 12 }}>{authError}</div>}

                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={isSubmitting}
                  style={{
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: '#15803d',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {isSubmitting ? 'Submitting Registration...' : (regAccountType === 'driver' ? 'Register as Driver' : 'Register as Service Provider')} <ArrowRight size={18} />
                </button>

                <div style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  fontSize: '12px',
                  color: 'var(--text-muted, #94a3b8)'
                }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    style={{
                      background: 'none',
                      border: 0,
                      color: 'var(--brand-primary, #ffffff)',
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
