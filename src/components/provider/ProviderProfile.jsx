import React, { useEffect, useState } from 'react';
import {
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Volume2,
  VolumeX,
  Vibrate,
  Globe,
  Sun,
  Moon,
  ArrowLeftRight,
  LogOut,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { Card, Badge, Button, ThemeToggle, LanguageSwitcher } from '../../design-system';
import ProviderVerificationBanner from './ProviderVerificationBanner';
import { API_BASE } from '../../config';

export default function ProviderProfile({
  currentUser,
  soundEnabled = true,
  onToggleSound,
  vibrationEnabled = true,
  onToggleVibration,
  onSwitchRole,
  onLogout
}) {
  const [bankDetails, setBankDetails] = useState({ bankName: '', bankAccountName: '', bankBranch: '', bankAccount: '', accountLast4: '', hasBankAccount: false });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankNotice, setBankNotice] = useState('');
  const [bankError, setBankError] = useState('');

  useEffect(() => {
    if (!currentUser?.token) return;
    let cancelled = false;
    setBankLoading(true);
    fetch(`${API_BASE}/providers/profile/bank-details`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load bank details.');
        if (!cancelled) setBankDetails(prev => ({ ...prev, bankName: data.bankName || '', bankAccountName: data.bankAccountName || '', bankBranch: data.bankBranch || '', accountLast4: data.accountLast4 || '', hasBankAccount: Boolean(data.hasBankAccount) }));
      })
      .catch(error => { if (!cancelled) setBankError(error.message); })
      .finally(() => { if (!cancelled) setBankLoading(false); });
    return () => { cancelled = true; };
  }, [currentUser?.token]);

  async function saveBankDetails(event) {
    event.preventDefault();
    setBankSaving(true);
    setBankNotice('');
    setBankError('');
    try {
      if (!bankDetails.bankName.trim()) throw new Error('Please enter your bank name.');
      if (!bankDetails.bankAccountName.trim()) throw new Error('Please enter the account holder name.');
      if (!bankDetails.bankBranch.trim()) throw new Error('Please enter the bank branch name or code.');
      if (!bankDetails.hasBankAccount && !bankDetails.bankAccount.trim()) throw new Error('Please enter your bank account number.');
      const payload = { bankName: bankDetails.bankName.trim(), bankAccountName: bankDetails.bankAccountName.trim(), bankBranch: bankDetails.bankBranch.trim() };
      if (bankDetails.bankAccount.trim()) payload.bankAccount = bankDetails.bankAccount.trim();
      const response = await fetch(`${API_BASE}/providers/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save bank details.');
      setBankDetails(prev => ({ ...prev, bankAccount: '', accountLast4: data.provider?.bankAccountLast4 || prev.accountLast4, hasBankAccount: Boolean(data.provider?.bankAccountLast4 || prev.hasBankAccount) }));
      setBankNotice('Bank details saved. Your account number is masked on this screen.');
    } catch (error) {
      setBankError(error.message || 'Could not save bank details.');
    } finally {
      setBankSaving(false);
    }
  }

  return (
    <div className="provider-profile-view" style={{ display: 'grid', gap: '20px' }}>
      {/* 1. Verification Status Banner */}
      <ProviderVerificationBanner currentUser={currentUser} />

      {/* 2. Profile Details Card */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--color-brand-600, #174d3d)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '24px',
            fontWeight: 800,
            flexShrink: 0
          }}>
            {currentUser?.fullName?.slice(0, 2).toUpperCase() || 'SP'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-primary, #f8fafc)' }}>
                {currentUser?.fullName}
              </h2>
              <Badge variant="success" dot={false}>
                <CheckCircle2 size={13} /> {currentUser?.accountType?.toUpperCase() || 'PROVIDER'}
              </Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-neutral-500, #64748b)' }}>
              {currentUser?.categoryName || 'Professional Trade Specialist'}
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          padding: '16px',
          background: 'var(--color-surface-subtle, #f8faf8)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border-subtle, #e5ebe2)',
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Contact Phone</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{currentUser?.phone || 'Not configured'}</b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Primary Service Base</span>
            <b style={{ color: 'var(--color-neutral-900, #0f172a)' }}>{currentUser?.location || 'Colombo, Sri Lanka'}</b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Account ID</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--color-neutral-600, #475569)' }}>{currentUser?.id || '—'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.75rem', display: 'block' }}>Registered Roles</span>
            <b style={{ color: 'var(--color-brand-700, #174d3d)' }}>{(currentUser?.roles || ['provider']).join(', ')}</b>
          </div>
        </div>
      </Card>

      {/* 3. Bank Details for Manual Wallet Payouts */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Bank Details for Wallet Payouts
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--color-neutral-500, #64748b)' }}>
          Add the beneficiary name, bank, branch and account that should receive your earnings. ARY administrators prepare transfers manually; saving these details does not initiate a payment.
        </p>
        <form onSubmit={saveBankDetails} style={{ display: 'grid', gap: 12, maxWidth: 620 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
            Bank Name *
            <input
              required
              value={bankDetails.bankName}
              onChange={event => setBankDetails(prev => ({ ...prev, bankName: event.target.value }))}
              placeholder="e.g. Bank of Ceylon"
              autoComplete="organization"
              style={{ padding: '11px 12px', border: '1px solid var(--color-border-subtle, #cbd5e1)', borderRadius: 8, background: 'var(--color-surface, #fff)', color: 'var(--text-primary, #0f172a)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
            Account Holder Name *
            <input
              required
              value={bankDetails.bankAccountName}
              onChange={event => setBankDetails(prev => ({ ...prev, bankAccountName: event.target.value }))}
              placeholder="Name exactly as shown on bank account"
              autoComplete="name"
              style={{ padding: '11px 12px', border: '1px solid var(--color-border-subtle, #cbd5e1)', borderRadius: 8, background: 'var(--color-surface, #fff)', color: 'var(--text-primary, #0f172a)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
            Bank Branch / Branch Code *
            <input
              required
              value={bankDetails.bankBranch}
              onChange={event => setBankDetails(prev => ({ ...prev, bankBranch: event.target.value }))}
              placeholder="e.g. Colombo 03 / 7010"
              autoComplete="off"
              style={{ padding: '11px 12px', border: '1px solid var(--color-border-subtle, #cbd5e1)', borderRadius: 8, background: 'var(--color-surface, #fff)', color: 'var(--text-primary, #0f172a)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
            Bank Account Number {bankDetails.hasBankAccount ? '(leave blank to keep saved account)' : '*'}
            <input
              value={bankDetails.bankAccount}
              onChange={event => setBankDetails(prev => ({ ...prev, bankAccount: event.target.value }))}
              placeholder={bankDetails.hasBankAccount ? 'Saved account ending ' + bankDetails.accountLast4 : 'Enter your bank account number'}
              autoComplete="off"
              inputMode="numeric"
              style={{ padding: '11px 12px', border: '1px solid var(--color-border-subtle, #cbd5e1)', borderRadius: 8, background: 'var(--color-surface, #fff)', color: 'var(--text-primary, #0f172a)' }}
            />
          </label>
          {bankLoading && <small>Loading saved bank details…</small>}
          {bankDetails.hasBankAccount && <small style={{ color: 'var(--color-success-700, #15803d)' }}>Saved account ending {bankDetails.accountLast4}</small>}
          {bankError && <p role="alert" style={{ margin: 0, color: 'var(--color-danger-700, #b91c1c)', fontSize: '0.82rem' }}>{bankError}</p>}
          {bankNotice && <p role="status" style={{ margin: 0, color: 'var(--color-success-700, #15803d)', fontSize: '0.82rem' }}>{bankNotice}</p>}
          <div><Button type="submit" variant="primary" loading={bankSaving} disabled={bankSaving || bankLoading}>Save Bank Details</Button></div>
        </form>
      </Card>

      {/* 3. Notification & Hardware Sound Alerts */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Real-Time Dispatch & Audio Alert Settings
        </h3>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--color-surface-subtle, #f8faf8)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, #e5ebe2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: soundEnabled ? 'var(--color-brand-100, #d9ebe1)' : '#f1f5f9', color: soundEnabled ? 'var(--color-brand-700, #174d3d)' : '#64748b', display: 'grid', placeItems: 'center' }}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </div>
              <div>
                <b style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                  Audio Chime on Incoming Booking Requests
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                  Plays dual-tone alert frequency when clients book services
                </p>
              </div>
            </div>

            <Button
              variant={soundEnabled ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleSound}
            >
              {soundEnabled ? 'Sound On' : 'Muted'}
            </Button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--color-surface-subtle, #f8faf8)',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, #e5ebe2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: vibrationEnabled ? 'var(--color-brand-100, #d9ebe1)' : '#f1f5f9', color: vibrationEnabled ? 'var(--color-brand-700, #174d3d)' : '#64748b', display: 'grid', placeItems: 'center' }}>
                <Vibrate size={16} />
              </div>
              <div>
                <b style={{ fontSize: '0.88rem', color: 'var(--color-neutral-900, #0f172a)' }}>
                  Haptic Vibration on Mobile
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
                  Triggers hardware pulse vibration on Android / Capacitor WebView
                </p>
              </div>
            </div>

            <Button
              variant={vibrationEnabled ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleVibration}
            >
              {vibrationEnabled ? 'Vibration On' : 'Off'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 5. Display, Language & Account Actions */}
      <Card style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: 'var(--color-neutral-900, #0f172a)' }}>
          Preferences & Role Switching
        </h3>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--color-border-subtle, #edf2ee)' }}>
          {(currentUser?.roles || []).includes('customer') && (
            <Button
              variant="outline"
              onClick={() => onSwitchRole?.('customer')}
            >
              <ArrowLeftRight size={14} /> Switch to Customer Mode
            </Button>
          )}

          <Button
            variant="danger"
            onClick={onLogout}
          >
            <LogOut size={14} /> Sign Out of Workspace
          </Button>
        </div>
      </Card>
    </div>
  );
}
