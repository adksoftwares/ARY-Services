import React, { useState } from 'react';
import {
  Wrench,
  Zap,
  ShoppingBag,
  Bike,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Smartphone,
  Monitor,
  Maximize2,
  Sun,
  Moon,
  Info,
  Phone,
  Mail,
  Search,
  Star,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  PasswordInput,
  PhoneInput,
  Textarea,
  Select,
  FormField,
  Icon,
  Card,
  Badge,
  StatusPill,
  Avatar,
  Tabs,
  SegmentedControl,
  Modal,
  BottomSheet,
  ConfirmDialog,
  Skeleton,
  EmptyState,
  ErrorState,
  Stepper,
  RatingStars,
  DataTable,
  Pagination,
  Tooltip,
  OfflineBanner,
  PageHeader,
  ThemeToggle,
  LanguageSwitcher,
  useToast
} from '../../design-system';

export default function DesignSystemShowcase() {
  const toast = useToast();

  // Preview Frame Controls
  const [viewportWidth, setViewportWidth] = useState('100%'); // '360px' | '768px' | '1280px' | '100%'
  const [previewTheme, setPreviewTheme] = useState('light'); // 'light' | 'dark' | 'sunlight'

  // Interactive Component States
  const [sampleInput, setSampleInput] = useState('');
  const [samplePassword, setSamplePassword] = useState('');
  const [samplePhone, setSamplePhone] = useState('077 123 4567');
  const [sampleSelect, setSampleSelect] = useState('colombo');
  const [sampleRating, setSampleRating] = useState(4);
  const [sampleStep, setSampleStep] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal Dialogs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const sampleUsersTable = [
    { id: '1', name: 'Ramesh Perera', role: 'Electrician', area: 'Colombo 03', rating: 4.9, status: 'active' },
    { id: '2', name: 'Nimal Silva', role: 'Plumber', area: 'Kandy City', rating: 4.8, status: 'pending' },
    { id: '3', name: 'Kamal Fernando', role: 'Driver', area: 'Galle Fort', rating: 4.7, status: 'in_progress' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f0d',
      color: '#e6ede9',
      fontFamily: 'var(--font-body)',
      paddingBottom: '80px'
    }}>
      {/* Showcase Sticky Toolbar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#121c17',
        borderBottom: '1px solid #1f302a',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'var(--color-brand-600, #174d3d)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}>A</span>
          <div>
            <b style={{ color: '#fff', fontSize: '0.95rem' }}>ARY Design System Showcase</b>
            <span style={{ fontSize: '0.72rem', color: '#788a81', marginLeft: 8 }}>v2.0 Living Component Catalog</span>
          </div>
        </div>

        {/* Viewport Width Switches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#17241f', padding: '3px', borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewportWidth('360px')}
            style={{
              background: viewportWidth === '360px' ? '#236c4f' : 'transparent',
              color: '#fff',
              border: 0,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Smartphone size={13} /> Mobile 360px
          </button>
          <button
            type="button"
            onClick={() => setViewportWidth('1280px')}
            style={{
              background: viewportWidth === '1280px' ? '#236c4f' : 'transparent',
              color: '#fff',
              border: 0,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Monitor size={13} /> Desktop 1280px
          </button>
          <button
            type="button"
            onClick={() => setViewportWidth('100%')}
            style={{
              background: viewportWidth === '100%' ? '#236c4f' : 'transparent',
              color: '#fff',
              border: 0,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Maximize2 size={13} /> Fluid 100%
          </button>
        </div>

        {/* Theme Preview Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['light', 'dark', 'sunlight'].map(th => (
            <button
              key={th}
              type="button"
              onClick={() => setPreviewTheme(th)}
              style={{
                background: previewTheme === th ? '#d18b54' : '#1f302a',
                color: previewTheme === th ? '#000' : '#c5d4cd',
                border: 0,
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {th}
            </button>
          ))}
        </div>
      </div>

      {/* Frame Container */}
      <div style={{
        maxWidth: viewportWidth,
        margin: '24px auto',
        transition: 'max-width 0.25s ease',
        boxShadow: viewportWidth !== '100%' ? '0 0 0 1px #2b3d35, 0 20px 60px rgba(0,0,0,0.8)' : 'none',
        borderRadius: viewportWidth !== '100%' ? 16 : 0,
        overflow: 'hidden'
      }}>
        {/* Render Frame with selected [data-theme] */}
        <div
          data-theme={previewTheme}
          style={{
            background: 'var(--surface-canvas, #fbfaf7)',
            color: 'var(--text-primary, #182922)',
            padding: '24px',
            minHeight: '800px'
          }}
        >
          {/* Header */}
          <PageHeader
            eyebrow="ARY DESIGN SYSTEM SPECIFICATION"
            title="Living Component Catalog"
            subtitle="Accessible, mobile-first design tokens and primitives for Sri Lankan cellular networks."
            badge={<Badge variant="brand">Version 2.0.0</Badge>}
            actions={
              <>
                <LanguageSwitcher />
                <ThemeToggle />
              </>
            }
          />

          <hr style={{ border: 0, borderTop: '1px solid var(--border-subtle, #eeece4)', margin: '20px 0 30px' }} />

          {/* Section 1: Color Palette */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              1. Brand & Semantic Color Scales
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <div style={{ background: '#174d3d', color: '#fff', padding: 14, borderRadius: 10 }}>
                <b style={{ fontSize: '0.85rem' }}>Brand 700</b>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>#174d3d</div>
              </div>
              <div style={{ background: '#d18b54', color: '#000', padding: 14, borderRadius: 10 }}>
                <b style={{ fontSize: '0.85rem' }}>Accent 500</b>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>#d18b54</div>
              </div>
              <div style={{ background: '#fbfaf7', color: '#000', padding: 14, borderRadius: 10, border: '1px solid #ddd' }}>
                <b style={{ fontSize: '0.85rem' }}>Cream 50</b>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>#fbfaf7</div>
              </div>
              <div style={{ background: '#059669', color: '#fff', padding: 14, borderRadius: 10 }}>
                <b style={{ fontSize: '0.85rem' }}>Success</b>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>#059669</div>
              </div>
              <div style={{ background: '#d97706', color: '#fff', padding: 14, borderRadius: 10 }}>
                <b style={{ fontSize: '0.85rem' }}>Warning</b>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>#d97706</div>
              </div>
              <div style={{ background: '#dc2626', color: '#fff', padding: 14, borderRadius: 10 }}>
                <b style={{ fontSize: '0.85rem' }}>Danger</b>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>#dc2626</div>
              </div>
            </div>
          </section>

          {/* Section 2: Buttons & Actions */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              2. Buttons & IconButtons (48px Accessible Touch Targets)
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Warm Accent</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" loading>Loading</Button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <IconButton icon={Search} aria-label="Search items" />
              <IconButton icon={Wrench} variant="primary" aria-label="Tools" />
              <IconButton icon={RotateCcw} variant="surface" aria-label="Reset" />
              <IconButton icon={Phone} variant="ghost" aria-label="Call" />
            </div>
          </section>

          {/* Section 3: Form Controls */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              3. Accessible Form Controls (Labels + 16px Inputs)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <Input
                label="Full Customer Name"
                placeholder="Ramesh Kumar"
                value={sampleInput}
                onChange={e => setSampleInput(e.target.value)}
                helperText="Enter your official name as shown on Sri Lankan NIC"
                required
              />

              <PasswordInput
                label="Account Password"
                value={samplePassword}
                onChange={e => setSamplePassword(e.target.value)}
                placeholder="Enter password"
                required
              />

              <PhoneInput
                label="Sri Lankan Mobile Number"
                value={samplePhone}
                onChange={e => setSamplePhone(e.target.value)}
                helperText="Standard +94 mobile format"
                required
              />

              <Select
                label="Service District / Province"
                value={sampleSelect}
                onChange={e => setSampleSelect(e.target.value)}
                options={[
                  { value: 'colombo', label: 'Western Province — Colombo' },
                  { value: 'gampaha', label: 'Western Province — Gampaha' },
                  { value: 'kandy', label: 'Central Province — Kandy' },
                  { value: 'galle', label: 'Southern Province — Galle' }
                ]}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <FormField
                label="Work Description & Requirements (FormField Wrapper)"
                hint="Be detailed about the issue, spare parts needed and preferred appointment time."
                required
              >
                <Textarea
                  placeholder="Describe electrical repairs, fixtures or delivery details..."
                  rows={3}
                />
              </FormField>
            </div>
          </section>

          {/* Section 4: Cards & Badges */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              4. Cards, Status Pills & Avatars
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 16 }}>
              <Card style={{ padding: 18 }}>
                <b style={{ display: 'block', marginBottom: 4 }}>Default Surface Card</b>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Clean border and subtle elevation.</p>
              </Card>

              <Card variant="elevated" style={{ padding: 18 }}>
                <b style={{ display: 'block', marginBottom: 4 }}>Elevated Card</b>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Elevated with soft atmospheric shadow.</p>
              </Card>

              <Card variant="interactive" style={{ padding: 18, cursor: 'pointer' }}>
                <b style={{ display: 'block', marginBottom: 4 }}>Interactive Card (Hover/Press)</b>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lifts up by 2px on interaction.</p>
              </Card>
            </div>

            {/* Badges & Status Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <Badge variant="brand">Brand Badge</Badge>
              <Badge variant="accent">Accent Badge</Badge>
              <Badge variant="success">Verified Partner</Badge>
              <Badge variant="warning">30-min SLA</Badge>
              <Badge variant="danger">Disputed</Badge>
              <StatusPill status="requested" />
              <StatusPill status="accepted" />
              <StatusPill status="in_progress" />
              <StatusPill status="completed" />
            </div>

            {/* Avatars */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name="Anura Dissanayake" size="sm" isOnline />
              <Avatar name="Ramesh Kumar" size="md" isOnline />
              <Avatar name="Nimal Silva" size="lg" isOnline={false} />
              <Avatar name="Kamal Perera" size="xl" />
            </div>
          </section>

          {/* Section 5: Tabs & Segmented Control */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              5. Tabs & Segmented Controls
            </h2>
            <div style={{ maxWidth: 440, marginBottom: 16 }}>
              <SegmentedControl
                options={[
                  { value: 'overview', label: 'All Jobs' },
                  { value: 'rides', label: 'Rides' },
                  { value: 'food', label: 'Food Orders' }
                ]}
                value={activeTab}
                onChange={setActiveTab}
              />
            </div>
          </section>

          {/* Section 6: Modals, Sheets & Interactive Feedback */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              6. Modals, BottomSheets & Dialogs
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Open Modal Dialog
              </Button>
              <Button variant="secondary" onClick={() => setIsSheetOpen(true)}>
                Open Mobile BottomSheet
              </Button>
              <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
                Open Confirm Dialog
              </Button>
            </div>

            {/* Toast System Triggers */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast?.success ? toast.success('Booking confirmed successfully!') : alert('Success Toast')}
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast?.error ? toast.error('Connection timed out. Retrying...') : alert('Error Toast')}
              >
                Trigger Error Toast
              </Button>
            </div>
          </section>

          {/* Section 7: Stepper & Rating */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              7. Timeline Stepper & Rating Stars
            </h2>
            <Card style={{ padding: 20, marginBottom: 14 }}>
              <Stepper
                currentStep={sampleStep}
                steps={[
                  { label: 'Requested' },
                  { label: 'Accepted' },
                  { label: 'In Progress' },
                  { label: 'Completed' }
                ]}
              />
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <Button size="sm" variant="ghost" onClick={() => setSampleStep(s => Math.max(0, s - 1))}>Previous Step</Button>
                <Button size="sm" variant="primary" onClick={() => setSampleStep(s => Math.min(3, s + 1))}>Next Step</Button>
              </div>
            </Card>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Interactive Rating:</span>
              <RatingStars value={sampleRating} onChange={setSampleRating} size={22} />
              <b>({sampleRating}.0 / 5)</b>
            </div>
          </section>

          {/* Section 8: States (Skeleton, Empty, Error) */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              8. Async States (Skeleton Shimmer, Empty, Error)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <Card style={{ padding: 18 }}>
                <b>Skeleton Shimmer</b>
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <Skeleton height="20px" width="60%" />
                  <Skeleton height="14px" />
                  <Skeleton height="14px" width="80%" />
                </div>
              </Card>

              <Card style={{ padding: 18 }}>
                <EmptyState
                  icon={ShoppingBag}
                  title="Cart is empty"
                  description="Explore local grocery items to add your first product."
                />
              </Card>

              <Card style={{ padding: 18 }}>
                <ErrorState
                  title="Failed to load dispatch telematics"
                  message="Could not connect to GPS cluster."
                  onRetry={() => alert('Retrying fetch...')}
                />
              </Card>
            </div>
          </section>

          {/* Section 9: DataTable */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: 14 }}>
              9. Responsive DataTable (Table on Desktop, Cards on Mobile)
            </h2>
            <DataTable
              columns={[
                { key: 'name', title: 'Contractor Name', render: (row) => <b>{row.name}</b> },
                { key: 'role', title: 'Trade / Role' },
                { key: 'area', title: 'Location' },
                { key: 'rating', title: 'Rating', render: (row) => `⭐ ${row.rating}` },
                { key: 'status', title: 'Status', render: (row) => <StatusPill status={row.status} /> }
              ]}
              data={sampleUsersTable}
            />
          </section>
        </div>
      </div>

      {/* Modal Instances */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Sample Accessible Modal"
      >
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
          This modal features an automatic focus trap, ESC key close, and background body scroll lock.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>Confirm Action</Button>
        </div>
      </Modal>

      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Mobile BottomSheet Dialog"
      >
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
          Slide-up sheet optimized for one-handed mobile navigation with touch drag-down handle.
        </p>
        <Button variant="primary" fullWidth onClick={() => setIsSheetOpen(false)}>
          Got it
        </Button>
      </BottomSheet>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          alert('Confirmed destructive action!');
        }}
        title="Delete Account?"
        message="Are you sure you want to permanently delete this contractor profile? This action cannot be undone."
        variant="danger"
      />
    </div>
  );
}
