import React, { useState, useEffect } from 'react';
import {
  UserRound,
  ShieldCheck,
  Briefcase,
  Bike,
  Globe,
  Sun,
  Moon,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Avatar, Badge, StatusPill, Stepper, ThemeToggle, LanguageSwitcher, Card, Input, Select, Textarea } from '../../design-system';

export default function AccountView({ onNotice, onClose }) {
  const { currentUser, applyForRole, switchRole, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'upgrade' | 'settings'
  const [roleToApply, setRoleToApply] = useState('provider');
  const [upgradeStep, setUpgradeStep] = useState(1); // 1: Role -> 2: Verification Details -> 3: Review & Submit
  const [category, setCategory] = useState('electrical-repair');
  const [categoryName, setCategoryName] = useState('Electrical Repair');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [nicNumber, setNicNumber] = useState('');
  const [operatingMode, setOperatingMode] = useState('mobile');
  const [nsnNumber, setNsnNumber] = useState('');
  const [baseCharge, setBaseCharge] = useState('LKR 1,500');
  const [driverServices, setDriverServices] = useState(['ride']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  const roles = currentUser?.roles || (currentUser ? [currentUser.accountType] : []);
  const applications = currentUser?.roleApplications || {};

  useEffect(() => {
    if (roles.includes('provider') && !roles.includes('driver')) {
      setRoleToApply('driver');
    } else if (!roles.includes('provider')) {
      setRoleToApply('provider');
    }
  }, [roles.join(',')]);

  if (!currentUser) return null;

  async function handleRoleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setUpgradeError('');

    try {
      const details = roleToApply === 'provider'
        ? { category, categoryName, location, nicNumber, operatingMode, nsnNumber, baseCharge }
        : { driverServices };

      await applyForRole(roleToApply, details);
      onNotice?.(`${roleToApply === 'provider' ? 'Provider' : 'Driver'} application submitted for Admin approval.`);
      setUpgradeStep(1);
      setActiveTab('profile');
    } catch (err) {
      setUpgradeError(err.message || 'Could not submit application.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSwitchRole(targetRole) {
    try {
      await switchRole(targetRole);
      window.location.href = targetRole === 'provider' ? '/provider.html' : targetRole === 'driver' ? '/driver.html' : '/';
    } catch (err) {
      onNotice?.(err.message);
    }
  }

  const providerApp = applications.provider;
  const driverApp = applications.driver;

  return (
    <div className="account-view-container" role="region" aria-label="Account and Profile Management">
      {/* User Identity Header Card */}
      <div className="account-profile-hero">
        <Avatar name={currentUser.fullName} size="xl" isOnline={true} />
        <div className="profile-hero-info">
          <div className="profile-hero-name-row">
            <h3>{currentUser.fullName}</h3>
            <Badge variant="brand" dot={false} className="primary-role-badge">
              {currentUser.accountType.toUpperCase()}
            </Badge>
          </div>
          <div className="profile-contact-meta">
            {currentUser.phone && (
              <span><Phone size={13} /> {currentUser.phone}</span>
            )}
            {currentUser.email && (
              <span><Mail size={13} /> {currentUser.email}</span>
            )}
            {currentUser.location && (
              <span><MapPin size={13} /> {currentUser.location}</span>
            )}
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="account-sub-nav">
        <button
          type="button"
          className={`account-nav-pill ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Overview & Roles
        </button>
        <button
          type="button"
          className={`account-nav-pill ${activeTab === 'upgrade' ? 'active' : ''}`}
          onClick={() => setActiveTab('upgrade')}
        >
          Role Upgrade Request
        </button>
        <button
          type="button"
          className={`account-nav-pill ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Language & Display
        </button>
      </div>

      {/* Tab 1: Profile & Roles */}
      {activeTab === 'profile' && (
        <div className="account-tab-content">
          {/* Active Roles & App Switchers */}
          <div className="account-section-card">
            <h4>Your Active Monorepo Roles</h4>
            <p className="account-section-sub">You can hold Customer, Provider, and Driver access under the same phone number.</p>

            <div className="roles-action-grid">
              <div className="role-status-card active">
                <div className="role-card-header">
                  <UserRound size={18} className="role-icon" />
                  <b>Customer Marketplace</b>
                  <Badge variant="success" dot={false}>Active</Badge>
                </div>
                <p>Browse services, order groceries, and book rides/deliveries.</p>
              </div>

              {roles.includes('provider') ? (
                <div className="role-status-card active">
                  <div className="role-card-header">
                    <Briefcase size={18} className="role-icon" />
                    <b>Service Provider</b>
                    <Badge variant="success" dot={false}>Approved</Badge>
                  </div>
                  <p>Manage customer bookings, send quotations, and track earnings.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => handleSwitchRole('provider')}
                  >
                    Open Provider Dashboard
                  </Button>
                </div>
              ) : (
                <div className="role-status-card">
                  <div className="role-card-header">
                    <Briefcase size={18} className="role-icon" />
                    <b>Service Provider</b>
                    {providerApp?.status === 'pending' ? (
                      <Badge variant="warning">Under Review</Badge>
                    ) : (
                      <Badge variant="neutral">Not Active</Badge>
                    )}
                  </div>
                  <p>List services, set rates, and accept customer work orders.</p>
                  {providerApp?.status !== 'pending' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setRoleToApply('provider'); setActiveTab('upgrade'); }}
                    >
                      Apply for Provider Role
                    </Button>
                  )}
                </div>
              )}

              {roles.includes('driver') ? (
                <div className="role-status-card active">
                  <div className="role-card-header">
                    <Bike size={18} className="role-icon" />
                    <b>Driver & Courier</b>
                    <Badge variant="success" dot={false}>Approved</Badge>
                  </div>
                  <p>Accept passenger rides, restaurant orders, and courier packages.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => handleSwitchRole('driver')}
                  >
                    Open Driver App
                  </Button>
                </div>
              ) : (
                <div className="role-status-card">
                  <div className="role-card-header">
                    <Bike size={18} className="role-icon" />
                    <b>Driver & Courier</b>
                    {driverApp?.status === 'pending' ? (
                      <Badge variant="warning">Under Review</Badge>
                    ) : (
                      <Badge variant="neutral">Not Active</Badge>
                    )}
                  </div>
                  <p>Turn on GPS, accept rides, and earn with flexible hours.</p>
                  {driverApp?.status !== 'pending' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setRoleToApply('driver'); setActiveTab('upgrade'); }}
                    >
                      Apply for Driver Role
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Application Status Tracker */}
          {(providerApp || driverApp) && (
            <div className="account-section-card">
              <h4>Application Status Tracker</h4>
              <div className="application-status-list">
                {providerApp && (
                  <div className="app-status-row">
                    <div className="status-row-left">
                      <Briefcase size={16} />
                      <div>
                        <b>Provider Application ({providerApp.categoryName || 'Trades'})</b>
                        <small>Submitted: {providerApp.appliedAt ? new Date(providerApp.appliedAt).toLocaleDateString() : 'Recently'}</small>
                      </div>
                    </div>
                    <Badge variant={providerApp.status === 'approved' ? 'success' : providerApp.status === 'rejected' ? 'danger' : 'warning'}>
                      {providerApp.status?.toUpperCase() || 'PENDING'}
                    </Badge>
                  </div>
                )}

                {driverApp && (
                  <div className="app-status-row">
                    <div className="status-row-left">
                      <Bike size={16} />
                      <div>
                        <b>Driver Application ({driverApp.driverServices?.join(', ') || 'Ride & Delivery'})</b>
                        <small>Submitted: {driverApp.appliedAt ? new Date(driverApp.appliedAt).toLocaleDateString() : 'Recently'}</small>
                      </div>
                    </div>
                    <Badge variant={driverApp.status === 'approved' ? 'success' : driverApp.status === 'rejected' ? 'danger' : 'warning'}>
                      {driverApp.status?.toUpperCase() || 'PENDING'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Guided Multi-step Role Upgrade Form */}
      {activeTab === 'upgrade' && (
        <div className="account-tab-content">
          <div className="account-section-card">
            <h4>Become a Verified Partner on ARY Services</h4>
            <p className="account-section-sub">Upgrade your account to earn as a qualified tradesperson, local shop owner, or delivery courier.</p>

            {upgradeError && (
              <div className="ds-toast ds-toast-error" style={{ marginBottom: 'var(--space-4)' }} role="alert">
                <AlertCircle size={15} />
                <span>{upgradeError}</span>
              </div>
            )}

            <div style={{ margin: '14px 0 20px' }}>
              <Stepper
                steps={['Select Role', 'Verification Details', 'Review & Submit']}
                currentStep={upgradeStep - 1}
              />
            </div>

            <form onSubmit={handleRoleSubmit}>
              {upgradeStep === 1 && (
                <div className="upgrade-step-box">
                  <label className="wizard-form-label">
                    <span>Choose which role you would like to add:</span>
                    <div className="role-choice-grid">
                      <button
                        type="button"
                        className={`role-choice-card ${roleToApply === 'provider' ? 'active' : ''}`}
                        disabled={roles.includes('provider')}
                        onClick={() => setRoleToApply('provider')}
                      >
                        <Briefcase size={22} className="choice-icon" />
                        <b>Service Provider</b>
                        <small>Electricians, plumbers, AC technicians, food/grocery shops.</small>
                        {roles.includes('provider') && <span className="already-active-tag">Already Approved</span>}
                      </button>

                      <button
                        type="button"
                        className={`role-choice-card ${roleToApply === 'driver' ? 'active' : ''}`}
                        disabled={roles.includes('driver')}
                        onClick={() => setRoleToApply('driver')}
                      >
                        <Bike size={22} className="choice-icon" />
                        <b>Driver & Courier</b>
                        <small>Passenger rides, restaurant food deliveries, parcel couriers.</small>
                        {roles.includes('driver') && <span className="already-active-tag">Already Approved</span>}
                      </button>
                    </div>
                  </label>

                  {roleToApply === 'provider' ? (
                    <Select
                      label="Primary Service Category *"
                      value={category}
                      onChange={e => {
                        setCategory(e.target.value);
                        setCategoryName(e.target.selectedOptions[0]?.text || e.target.value);
                      }}
                      options={[
                        { value: 'electrical-repair', label: 'Electrical Repair' },
                        { value: 'plumbing', label: 'Plumbing Services' },
                        { value: 'food-shops', label: 'Food Shop / Restaurant' },
                        { value: 'grocery-products', label: 'Grocery Storefront' },
                        { value: 'other-services', label: 'Other Skilled Services' }
                      ]}
                    />
                  ) : (
                    <div className="driver-services-select-box">
                      <span className="wizard-label-text">Select Driver Fleets *</span>
                      <div className="driver-checkbox-list">
                        {[
                          ['ride', 'Passenger Rides (Car / Tuk Tuk)'],
                          ['food_delivery', 'Restaurant Meal Delivery'],
                          ['parcel_delivery', 'Peer-to-Peer Parcel Courier']
                        ].map(([val, label]) => (
                          <label key={val} className="driver-service-check-item">
                            <input
                              type="checkbox"
                              checked={driverServices.includes(val)}
                              onChange={e => {
                                const checked = e.target.checked;
                                setDriverServices(old => checked ? [...old, val] : old.filter(x => x !== val));
                              }}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                    <Button
                      variant="primary"
                      size="md"
                      type="button"
                      onClick={() => setUpgradeStep(2)}
                    >
                      Next: Verification Details <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {upgradeStep === 2 && (
                <div className="upgrade-step-box">
                  <Input
                    label="Service Location / Town *"
                    required={true}
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Wellawatte, Colombo 06"
                  />

                  <Input
                    label="National Identity Card (NIC) *"
                    required={true}
                    value={nicNumber}
                    onChange={e => setNicNumber(e.target.value)}
                    placeholder="951234567V or 199512345678"
                  />

                  {roleToApply === 'provider' && (
                    <>
                      <Select
                        label="Operating Mode *"
                        value={operatingMode}
                        onChange={e => setOperatingMode(e.target.value)}
                        options={[
                          { value: 'mobile', label: 'Mobile / On-Location Technician' },
                          { value: 'shop', label: 'Physical Storefront / Workshop' },
                          { value: 'online', label: 'Online Orders Only' }
                        ]}
                      />
                      <Input
                        label="Business / Trade NSN Registration Number *"
                        required={true}
                        value={nsnNumber}
                        onChange={e => setNsnNumber(e.target.value)}
                        placeholder="Enter official NSN or trade registration"
                      />
                      <Input
                        label="Standard Base Inspection Charge *"
                        value={baseCharge}
                        onChange={e => setBaseCharge(e.target.value)}
                        placeholder="e.g. LKR 1,500"
                      />
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
                    <Button
                      variant="secondary"
                      size="md"
                      type="button"
                      onClick={() => setUpgradeStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      type="button"
                      disabled={!nicNumber.trim() || !location.trim()}
                      onClick={() => setUpgradeStep(3)}
                    >
                      Review & Submit <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {upgradeStep === 3 && (
                <div className="upgrade-step-box">
                  <div className="upgrade-summary-card">
                    <b>Application Summary</b>
                    <div className="summary-line">
                      <span>Target Role:</span>
                      <b>{roleToApply === 'provider' ? 'Service Provider' : 'Driver & Courier'}</b>
                    </div>
                    {roleToApply === 'provider' ? (
                      <>
                        <div className="summary-line">
                          <span>Service Category:</span>
                          <b>{categoryName}</b>
                        </div>
                        <div className="summary-line">
                          <span>Base Inspection Rate:</span>
                          <b>{baseCharge}</b>
                        </div>
                      </>
                    ) : (
                      <div className="summary-line">
                        <span>Selected Fleets:</span>
                        <b>{driverServices.join(', ')}</b>
                      </div>
                    )}
                    <div className="summary-line">
                      <span>Operating Town:</span>
                      <b>{location}</b>
                    </div>
                    <div className="summary-line">
                      <span>NIC Number:</span>
                      <b>{nicNumber}</b>
                    </div>
                  </div>

                  <div className="security-notice-box">
                    <ShieldCheck size={16} />
                    <span>Your customer privileges remain active throughout. Admin verifies KYC credentials within 24-48 business hours.</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
                    <Button
                      variant="secondary"
                      size="md"
                      type="button"
                      onClick={() => setUpgradeStep(2)}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      type="submit"
                      loading={isSubmitting}
                    >
                      Submit Application for Verification
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Language & Display Settings */}
      {activeTab === 'settings' && (
        <div className="account-tab-content">
          <div className="account-section-card">
            <h4>Language & Regional Settings</h4>
            <p className="account-section-sub">Choose your preferred marketplace language. All service categories and interface texts will adapt.</p>
            <div style={{ margin: '14px 0' }}>
              <LanguageSwitcher />
            </div>
          </div>

          <div className="account-section-card">
            <h4>Display & Appearance</h4>
            <p className="account-section-sub">Switch between Light mode, Dark mode, or Outdoor Sunlight mode for high-contrast visibility.</p>
            <div style={{ margin: '14px 0' }}>
              <ThemeToggle />
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-4)' }}>
            <Button
              variant="danger"
              size="md"
              fullWidth={true}
              onClick={() => { logout(); if (onClose) onClose(); }}
            >
              Sign Out of Account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
