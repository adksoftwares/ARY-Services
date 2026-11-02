import React, { useState } from 'react';
import {
  Bell,
  ShieldCheck,
  Scale,
  Banknote,
  Users,
  BriefcaseBusiness,
  Bike,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../../design-system';

export default function AdminNotifications({
  events = [],
  onClear,
  onNavigateTab
}) {
  const [filter, setFilter] = useState('all');

  // Sample seed events if empty
  const defaultEvents = [
    {
      id: 1,
      type: 'payout',
      title: 'LankaPay CEFT Batch Payout Executed',
      description: 'Disbursed LKR 48,500 across 6 service partners. Cryptographic checksum recorded.',
      timestamp: '10 mins ago',
      icon: Banknote,
      color: 'brand',
      targetTab: 'payouts'
    },
    {
      id: 2,
      type: 'dispute',
      title: 'Dispute Arbitration Completed: Job #bk-8291',
      description: '50/50 Mediated Split ruling executed by Super Admin. LKR 2,500 refunded to customer.',
      timestamp: '35 mins ago',
      icon: Scale,
      color: 'danger',
      targetTab: 'disputes'
    },
    {
      id: 3,
      type: 'kyc',
      title: 'New Driver Application: Kamal Perera',
      description: 'Submitted National ID and Driving License (Class B) for Ride and Food Delivery networks.',
      timestamp: '1 hour ago',
      icon: Bike,
      color: 'accent',
      targetTab: 'applications'
    },
    {
      id: 4,
      type: 'account',
      title: 'Provider Account Approved: Nuwan Silva',
      description: 'Status updated to active under Electrical Repairs category in Western Province.',
      timestamp: '2 hours ago',
      icon: Users,
      color: 'brand',
      targetTab: 'users'
    },
    {
      id: 5,
      type: 'service',
      title: 'New Service Addition Request: Solar Panel Cleaning',
      description: 'Provider SunPower Solutions requested category listing with LKR 3,500 base charge.',
      timestamp: '4 hours ago',
      icon: BriefcaseBusiness,
      color: 'neutral',
      targetTab: 'services'
    }
  ];

  const displayEvents = events.length > 0 ? events : defaultEvents;
  const filteredEvents = filter === 'all' ? displayEvents : displayEvents.filter(e => e.type === filter);

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. Header Card */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bell size={22} color="var(--color-brand-600, #174d3d)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-brand-900, #173b2f)' }}>
                Platform Audit Log & System Notifications
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
              Real-time audit log of administrative actions, compliance approvals, and financial disbursements.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'ALL EVENTS' },
              { id: 'payout', label: 'PAYOUTS' },
              { id: 'dispute', label: 'DISPUTES' },
              { id: 'kyc', label: 'KYC & ROLES' },
              { id: 'account', label: 'ACCOUNTS' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: filter === f.id ? '1.5px solid var(--color-brand-600, #174d3d)' : '1px solid var(--color-border-subtle, #e2e8f0)',
                  background: filter === f.id ? 'var(--color-brand-50, #edf7f2)' : 'var(--color-surface, #ffffff)',
                  color: filter === f.id ? 'var(--color-brand-900, #0c2d23)' : 'var(--color-neutral-600, #475569)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Audit Trail Feed */}
      <Card style={{ padding: '20px' }}>
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No events found"
            description="No recent audit logs match the selected filter category."
          />
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {filteredEvents.map(evt => {
              const Icon = evt.icon || ShieldCheck;

              return (
                <div
                  key={evt.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md, 10px)',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    background: 'var(--color-surface, #ffffff)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 14,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: evt.color === 'danger' ? '#fef2f2' : evt.color === 'accent' ? '#eff6ff' : 'var(--color-brand-50, #edf7f2)',
                      color: evt.color === 'danger' ? '#dc2626' : evt.color === 'accent' ? '#2563eb' : 'var(--color-brand-700, #174d3d)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>

                    <div>
                      <b style={{ color: 'var(--color-text, #0f172a)', fontSize: '0.92rem', display: 'block' }}>
                        {evt.title}
                      </b>
                      <p style={{ margin: '4px 0 0', color: 'var(--color-neutral-600, #475569)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                        {evt.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-400, #94a3b8)', display: 'block' }}>
                      {evt.timestamp}
                    </span>
                    {evt.targetTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab?.(evt.targetTab)}
                        style={{
                          marginTop: 6,
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-brand-600, #174d3d)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Inspect &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
