import React, { useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Zap,
  Landmark,
  ShieldCheck,
  Download,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, Badge, Button, EmptyState, Modal, ConfirmDialog } from '../../design-system';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function AdminPayouts({
  bookings = [],
  adminUsers = [],
  payoutResult,
  onRunPayout,
  isSettling = false
}) {
  const { currentUser } = useAuth();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [preview, setPreview] = useState({ candidates: [], eligibleCount: 0, missingBankDetailsCount: 0 });
  const [previewLoading, setPreviewLoading] = useState(false);
  const minThreshold = 1000;

  async function loadPayoutPreview() {
    if (!currentUser?.token) return;
    setPreviewLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/payouts/preview`, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load wallet balances');
      setPreview(data);
    } catch (error) {
      console.warn('Payout preview unavailable:', error);
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => { loadPayoutPreview(); }, [currentUser?.token]);
  const pendingSettlements = preview.candidates || [];
  const eligibleSettlements = pendingSettlements.filter(item => item.balance >= minThreshold && item.bankDetailsComplete);
  const totalEligibleAmount = eligibleSettlements.reduce((sum, item) => sum + item.balance, 0);

  // Client-side CSV Export for LankaPay CEFT
  function handleExportCsv() {
    const records = payoutResult?.disbursements?.length > 0 ? payoutResult.disbursements : eligibleSettlements;

    const headers = [
      'BeneficiaryName',
      'BankName',
      'AccountNumber',
      'AmountLKR',
      'Currency',
      'Narration',
      'BatchReference',
      'ExecutionDate'
    ];

    const rows = records.map(r => [
      `"${r.fullName || r.providerName || 'Contractor'}"`,
      `"${r.bankName || 'Commercial Bank'}"`,
      `"${r.accountNumber || ''}"`,
      r.amount || r.balance || 0,
      'LKR',
      '"ARY Services Partner Disbursal"',
      `"${payoutResult?.batchId || 'CEFT-DIRECT'}"`,
      `"${new Date().toISOString().split('T')[0]}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ary_ceft_batch_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrintManifest() {
    window.print();
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* 1. LankaPay CEFT Control Card */}
      <Card style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--color-brand-50, #edf7f2)',
                color: 'var(--color-brand-600, #174d3d)',
                display: 'grid',
                placeItems: 'center'
              }}>
                <Landmark size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-brand-900, #173b2f)' }}>
                  Bank Transfer Preparation
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-neutral-600, #475569)' }}>
                  Prepare a bank-transfer instruction file from actual wallet ledger balances. Transfers are completed outside ARY and confirmed by an administrator.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCsv}
              disabled={eligibleSettlements.length === 0 && !payoutResult}
            >
              <Download size={15} /> Export CEFT CSV
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => setConfirmModalOpen(true)}
              loading={isSettling}
              disabled={isSettling}
            >
              <Zap size={15} /> Prepare Transfer File
            </Button>
          </div>
        </div>

        {/* Financial Metrics Strip */}
        <div style={{
          marginTop: 18,
          padding: '14px 18px',
          background: 'var(--color-surface-raised, #f8fafc)',
          border: '1px solid var(--color-border-subtle, #e2e8f0)',
          borderRadius: 'var(--radius-md, 10px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.74rem', display: 'block', textTransform: 'uppercase' }}>
              Eligible Wallets
            </span>
            <b style={{ fontSize: '1.2rem', color: 'var(--color-brand-900, #0c2d23)' }}>
              {previewLoading ? 'Loading…' : `${eligibleSettlements.length} partners`}
            </b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.74rem', display: 'block', textTransform: 'uppercase' }}>
              Available Wallet Balance
            </span>
            <b style={{ fontSize: '1.2rem', color: 'var(--color-brand-700, #174d3d)' }}>
              LKR {totalEligibleAmount.toLocaleString()}
            </b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.74rem', display: 'block', textTransform: 'uppercase' }}>
              Missing Bank Details
            </span>
            <b style={{ fontSize: '1.2rem', color: 'var(--color-neutral-700, #334155)' }}>
              LKR {preview.missingBankDetailsCount || 0}
            </b>
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-500, #64748b)', fontSize: '0.74rem', display: 'block', textTransform: 'uppercase' }}>
              Minimum Threshold
            </span>
            <b style={{ fontSize: '1.2rem', color: '#64748b' }}>
              LKR {minThreshold.toLocaleString()}
            </b>
          </div>
        </div>
      </Card>

      {/* 2. Generated Settlement Manifest (if executed) */}
      {payoutResult && (
        <Card className="payout-manifest-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={24} color="var(--color-brand-600, #174d3d)" />
              <div>
                <b style={{ color: 'var(--color-brand-900, #0c2d23)', fontSize: '1.1rem' }}>
                  Transfer Instructions Prepared — Not Paid
                </b>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-brand-700, #174d3d)' }}>
                  Batch Reference: <code>{payoutResult.batchId}</code>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" onClick={handlePrintManifest}>
                <Printer size={14} /> Print Ledger
              </Button>
              <Button variant="primary" size="sm" onClick={handleExportCsv}>
                <FileSpreadsheet size={14} /> Download Bank CSV
              </Button>
            </div>
          </div>

          <div style={{
            background: 'var(--color-brand-50, #edf7f2)',
            border: '1px solid var(--color-brand-200, #b7decb)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '14px',
            marginBottom: 16
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: '0.85rem' }}>
              <div><b>Total to Transfer:</b> <span style={{ color: 'var(--color-brand-700, #174d3d)', fontWeight: 800 }}>LKR {payoutResult.totalPayoutAmount?.toLocaleString()}</span></div>
              <div><b>Providers Listed:</b> {payoutResult.providerCount || eligibleSettlements.length} partners</div>
              <div><b>Settlement Method:</b> Manual bank transfer</div>
              <div><b>Wallet Status:</b> No debit recorded yet</div>
            </div>
            {payoutResult.checksum && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--color-brand-200, #b7decb)', fontSize: '0.74rem', color: 'var(--color-brand-800, #154636)' }}>
                <b>Cryptographic SHA-256 Checksum:</b> <span className="payout-checksum-code">{payoutResult.checksum}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 3. Pending Settlements Table */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: '0.95rem', color: 'var(--color-text, #0f172a)' }}>
            Contractor Settlement Ledger ({pendingSettlements.length} partners)
          </b>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500, #64748b)' }}>
            LankaPay CEFT Clearing Queue
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Contractor Partner</th>
                <th style={{ width: '22%' }}>Bank Institution</th>
                <th style={{ width: '20%' }}>Account Reference</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Net Balance (LKR)</th>
                <th style={{ width: '15%', textAlign: 'right' }}>CEFT Eligibility</th>
              </tr>
            </thead>
            <tbody>
              {pendingSettlements.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    No contractor balances currently eligible for payout.
                  </td>
                </tr>
              ) : (
                pendingSettlements.map(item => (
                  <tr key={item.providerId}>
                    <td>
                      <b style={{ color: 'var(--color-text, #0f172a)', display: 'block' }}>{item.fullName}</b>
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-neutral-500, #64748b)' }}>{item.phone}</span>
                    </td>
                    <td>{item.bankName}</td>
                    <td>
                      <code style={{ fontSize: '0.78rem', background: 'var(--color-neutral-100, #f1f5f9)', padding: '2px 6px', borderRadius: 4 }}>
                        {item.accountNumber}
                      </code>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-brand-700, #174d3d)' }}>
                      LKR {item.balance.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Badge variant={item.status === 'ready' ? 'success' : 'neutral'} dot={false}>
                        {item.status === 'ready' ? 'READY' : '< MIN THRESHOLD'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Batch Settle Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={async () => {
          setConfirmModalOpen(false);
          await onRunPayout();
        }}
        title="Execute LankaPay CEFT Batch Disbursal?"
        message={`Are you sure you want to execute settlement of LKR ${totalEligibleAmount.toLocaleString()} across ${eligibleSettlements.length} active service partners? This will generate the signed LankaPay batch file and debit the platform clearing account.`}
        confirmLabel="Confirm & Disburse Funds"
        isDanger={false}
      />
    </div>
  );
}
