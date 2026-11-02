# ARY Services — Design System & Front-End Guidelines (v2.0)

A mobile-first, accessible (WCAG 2.2 AA), high-performance design system created for the ARY Services monorepo (`apps/customer`, `apps/provider`, `apps/driver`, `apps/admin-dashboard`). Designed specifically for Sri Lankan users across 4G cellular networks and mid-range Android devices.

---

## 1. Brand Identity & Design Tokens

### 1.1 Color Palette & Scales
All color tokens are exposed via CSS custom variables in `src/design-system/tokens.css`.

- **Brand Primary Green (`#174d3d`)**: Trust, durability, verified craft, national heritage.
  - Scale: `--color-brand-50` (`#eef6f2`) to `--color-brand-950` (`#071914`).
  - Semantic: `--brand-primary`, `--brand-hover`, `--brand-active`, `--brand-subtle`.
- **Warm Accent Copper (`#d18b54`)**: Warmth, energy, conversion CTAs, promotional badges.
  - Scale: `--color-accent-50` (`#fcf8f3`) to `--color-accent-900` (`#5c3718`).
  - Semantic: `--brand-accent`, `--accent-hover`, `--accent-subtle`.
- **Cream Neutral Canvas (`#fbfaf7`)**: Premium, tactile, reduces eye strain compared to pure white.
  - Scale: `--color-neutral-50` (`#fbfaf7`) to `--color-neutral-950` (`#0c1410`).
- **Semantic Feedback Colors**:
  - Success: `--color-success-600` (`#059669`) / `--surface-success`
  - Warning: `--color-warning-600` (`#d97706`) / `--surface-warning`
  - Danger: `--color-danger-600` (`#dc2626`) / `--surface-danger`
  - Info: `--color-info-600` (`#2563eb`) / `--surface-info`

### 1.2 Themes & Outdoor Sunlight Mode
- **Light Theme (`[data-theme="light"]`)**: Default theme with cream canvas, crisp surfaces, and 12:1 heading contrast.
- **Dark Theme (`[data-theme="dark"]`)**: Deep midnight slate surfaces (`#0b1612`, `#12241d`) with WCAG AAA contrast and reduced glare.
- **Sunlight Mode (`[data-theme="sunlight"]`)**: Specialized ultra-high-contrast outdoor mode with bold black borders and heightened color saturation for bright Sri Lankan outdoor sunlight.
- **Persistence**: Synced with OS `prefers-color-scheme` and persisted to `localStorage['ary_theme']`.

### 1.3 Typography Scale
Self-hosted Latin WOFF2 subsets with local system and Sinhala/Tamil fallbacks:
- Heading font: `Manrope`, `'Noto Sans Sinhala'`, `'Noto Sans Tamil'`, sans-serif (`font-display: swap`)
- Body font: `DM Sans`, `'Noto Sans Sinhala'`, `'Noto Sans Tamil'`, sans-serif (`font-display: swap`)

| Token | Size | Rem | Usage |
|---|---|---|---|
| `--text-2xs` | 11px | 0.6875rem | Eyebrow tags, micro status pills |
| `--text-xs` | 12px | 0.75rem | Timestamps, metadata, hints |
| `--text-sm` | 13px | 0.8125rem | Secondary buttons, table cells |
| `--text-base` | 15px | 0.9375rem | Accessible default body text |
| `--text-md` | 16px | 1.0000rem | Form inputs (prevents iOS/Android auto-zoom) |
| `--text-lg` | 18px | 1.1250rem | Section subtitles, card titles |
| `--text-xl` | 20px | 1.2500rem | Modal headers, metric cards |
| `--text-2xl` | 24px | 1.5000rem | Section headings |
| `--text-3xl` | 30px | 1.8750rem | Hero titles on tablet/mobile |
| `--text-4xl` | 36px | 2.2500rem | Main page display titles |

### 1.4 Spacing (4-pt Grid)
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px
- `--space-16`: 64px

---

## 2. Component Primitives Reference

All primitives are imported directly from `../../design-system`:

```javascript
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  PhoneInput,
  PasswordInput,
  FormField,
  Card,
  Badge,
  StatusPill,
  Avatar,
  Tabs,
  SegmentedControl,
  Modal,
  BottomSheet,
  ToastProvider,
  useToast,
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
  AppShell,
  Icon,
  ThemeToggle,
  LanguageSwitcher
} from '../../design-system';
```

---

### 2.1 Button & IconButton
Supports primary, secondary, ghost, danger, and accent variants with built-in loading spinners and 48px mobile touch targets.

**Props:**
- `variant`: `'primary'` | `'secondary'` | `'ghost'` | `'danger'` | `'accent'` (default: `'primary'`)
- `size`: `'sm'` | `'md'` | `'lg'` (default: `'md'`)
- `isLoading`: `boolean`
- `disabled`: `boolean`
- `icon`: React component
- `children`: ReactNode

```jsx
<Button variant="primary" size="lg" isLoading={isSubmitting} onClick={handleBook}>
  Confirm Booking
</Button>

<IconButton
  icon={Bell}
  aria-label="View notifications"
  variant="ghost"
  badge={3}
  onClick={toggleNotifications}
/>
```

---

### 2.2 Form Inputs & FormField
All inputs feature 16px minimum font size to eliminate mobile browser viewport zoom jumps.

#### `FormField`
Wraps any input with accessible label, optional hint, and WCAG error alert.
```jsx
<FormField label="Service Location" required hint="Enter city or street address" error={errors.location}>
  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Colombo 03" />
</FormField>
```

#### `PhoneInput` (+94 Sri Lanka Aware)
Includes country code prefix, automatic Sri Lankan formatting, and number sanitization.
```jsx
<PhoneInput
  value={mobileNumber}
  onChange={setMobileNumber}
  placeholder="77 123 4567"
/>
```

#### `PasswordInput`
Includes accessible toggle button with `Eye` / `EyeOff` icons.
```jsx
<PasswordInput
  value={password}
  onChange={e => setPassword(e.target.value)}
  placeholder="Enter account password"
/>
```

---

### 2.3 Card & Avatar
Structured elevation containers with responsive border colors across themes.

```jsx
<Card variant="raised" padding="lg">
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <Avatar name="Sunil Perera" status="online" size="lg" />
    <div>
      <h4>Sunil Perera</h4>
      <StatusPill status="approved" />
    </div>
  </div>
</Card>
```

---

### 2.4 Modal & BottomSheet
Accessible dialog containers featuring focus trapping, `Escape` key listeners, background scroll locking, and swipe-down-to-dismiss gesture on mobile.

```jsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setModalOpen(false)}
  title="Reschedule Service"
  size="md"
>
  <p>Select a new date and time for your booking.</p>
  <Button onClick={() => setModalOpen(false)}>Close</Button>
</Modal>

<BottomSheet
  isOpen={isFilterOpen}
  onClose={() => setFilterOpen(false)}
  title="Filter Services"
>
  <FilterControls />
</BottomSheet>
```

---

### 2.5 Toast System (`ToastProvider` & `useToast`)
Replaces browser `alert()` and ad-hoc toasts with smooth, stackable notifications and `aria-live` screen-reader announcements.

```jsx
// 1. Wrap app root
<ToastProvider>
  <CustomerApp />
</ToastProvider>

// 2. In any child component
const toast = useToast();
toast.success('Booking confirmed successfully!');
toast.error('Unable to connect to server. Retrying...');
```

---

### 2.6 Stepper & Timeline
Glanceable status progression for booking workflows, delivery handoffs, and verification progress.

```jsx
<Stepper
  steps={[
    { id: 'req', label: 'Requested' },
    { id: 'acc', label: 'Accepted' },
    { id: 'prog', label: 'In Progress' },
    { id: 'done', label: 'Completed' }
  ]}
  currentStepIndex={2}
/>
```

---

### 2.7 DataTable & Pagination
Responsive tabular data display that automatically transforms into card lists on mobile viewports (< 768px).

```jsx
<DataTable
  columns={[
    { key: 'id', title: 'Booking ID' },
    { key: 'customer', title: 'Customer' },
    { key: 'amount', title: 'Amount (LKR)', render: (row) => `LKR ${row.amount.toLocaleString()}` },
    { key: 'status', title: 'Status', render: (row) => <StatusPill status={row.status} /> }
  ]}
  data={bookings}
  keyExtractor={(row) => row.id}
/>
```

---

### 2.8 States: Skeleton, EmptyState, ErrorState
Standardized loading placeholders, empty states, and error recovery screens.

```jsx
// Loading
<Skeleton width="100%" height={120} borderRadius="12px" />

// Empty
<EmptyState
  icon={CalendarX}
  title="No upcoming bookings"
  description="You do not have any pending jobs scheduled for this week."
  action={<Button onClick={openCatalog}>Explore Services</Button>}
/>

// Error with Retry
<ErrorState
  title="Failed to load provider metrics"
  description="Check your network connection and retry."
  onRetry={refetchMetrics}
/>
```

---

### 2.9 AppShell & PageHeader
Standard responsive application shell with desktop topbar/sidebar and mobile bottom navigation.

```jsx
<AppShell
  currentRoute="/bookings"
  navItems={[
    { href: '/', label: 'Home', icon: Home },
    { href: '/bookings', label: 'Bookings', icon: Calendar, badge: 2 },
    { href: '/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/account', label: 'Account', icon: User }
  ]}
  user={currentUser}
  onSignOut={handleSignOut}
>
  <PageHeader
    title="Service Bookings"
    eyebrow="Active Jobs"
    subtitle="Manage quotations, appointments and payments"
    actions={<Button variant="primary">New Booking</Button>}
  />
  <BookingsContent />
</AppShell>
```

---

## 3. Front-End Do's & Don'ts

### DO:
1. **Always use CSS variables** (`var(--surface-primary)`, `var(--text-primary)`, `var(--brand-primary)`) instead of hardcoded hex values.
2. **Use `16px` minimum font size for form inputs** to prevent Android WebView and iOS Safari from auto-zooming on focus.
3. **Use `lucide-react` icons wrapped with `<Icon />`** instead of raw emoji characters.
4. **Ensure interactive touch targets are at least 44x44px** (preferably 48px) for mobile ergonomics.
5. **Always provide `aria-label` or visible text** for icon buttons so screen readers can interpret them.
6. **Support multi-language translation** using the `src/utils/i18n.js` dictionaries (`en`, `si`, `ta`).
7. **Use `useToast()`** instead of native `window.alert()` or `window.confirm()`.

### DON'T:
1. **Never store user PII or admin lists in `localStorage`** (only store session auth under `ary_user` and theme preference under `ary_theme`).
2. **Never hardcode hex values like `#174d3d` or `#ffffff`** directly in component JSX.
3. **Never modify `server/` code or API routes** during front-end styling tasks.
4. **Never use raw emojis** (`🚗`, `📍`, `🔒`, `⭐`) as primary UI controls or status icons.
5. **Never write static inline style objects** (`style={{ padding: '20px', background: '#fff' }}`) when design system classes or primitives exist.
