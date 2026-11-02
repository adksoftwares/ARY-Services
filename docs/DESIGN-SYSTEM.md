# ARY Services — Design System & Front-End Guidelines (v2.0)

A mobile-first, highly accessible, high-performance design system created for the ARY Services monorepo. Tailored for Sri Lankan users across 4G cellular networks and mid-range Android devices.

---

## 1. Brand Identity & Color Tokens

### Primary Palette
- **Brand Primary Green (`#174d3d`)**: Trust, durability, verified craft, national heritage.
  - Scales: `--color-brand-50` through `--color-brand-950`.
- **Warm Accent Copper (`#d18b54`)**: Warmth, energy, conversion CTAs, promotional badges.
  - Scales: `--color-accent-50` through `--color-accent-900`.
- **Cream Neutral Background (`#fbfaf7`)**: Premium, tactile, reduces eye strain compared to pure white.
  - Scales: `--color-neutral-50` through `--color-neutral-950`.

### Semantic Status Colors
- **Success (`#059669`)**: Approved partners, completed jobs, active subscriptions, green dots.
- **Warning (`#d97706`)**: Pending verification, urgent 30-min SLA timer, escrow held.
- **Danger (`#dc2626`)**: Disputed funds, cancelled bookings, failed attempts, suspension.
- **Info (`#2563eb`)**: Telematics, quotes sent, live GPS location updates.

### Themes & High-Contrast Modes
- **Light Theme**: Default theme with cream background and high-contrast text.
- **Dark Theme (`[data-theme="dark"]`)**: Deep midnight slate surfaces (`#0b1612`, `#12241d`) with WCAG AAA text contrast.
- **Sunlight Mode (`[data-theme="sunlight"]`)**: High-contrast outdoor mode with ultra-dense borders and maximum contrast for direct Sri Lankan sunlight.
- **Persistence**: Synced with system `prefers-color-scheme` and stored in `localStorage['ary_theme']`.

---

## 2. Typography Scale

Self-hosted local font stack with fallbacks for Sinhala and Tamil:
- **Headings**: `Manrope`, `Noto Sans Sinhala`, `Noto Sans Tamil`, sans-serif.
- **Body & Inputs**: `DM Sans`, `Noto Sans Sinhala`, `Noto Sans Tamil`, sans-serif.
- **Minimum Body Size**: 14px (`0.875rem`).
- **Minimum Input Font Size**: 16px (`1rem`) to prevent iOS/Android WebView auto-zoom on focus.

---

## 3. Reusable Component Primitives

Located in `src/design-system/`:

| Component | Variants / States | Accessibility / Touch Target |
| :--- | :--- | :--- |
| `Button` | `primary`, `secondary`, `accent`, `outline`, `ghost`, `danger` (sm, md, lg, loading) | 48px touch bounding box, active scale feedback |
| `IconButton` | `ghost`, `surface`, `primary` | 44px minimum tap target, `aria-label` enforced |
| `Input` | `Input`, `PasswordInput` (with toggle), `PhoneInput`, `Textarea`, `Select` | Labels above fields, 16px font, inline error slots |
| `Card` | `default`, `elevated`, `interactive` | Subtle borders, tactile lift on hover/press |
| `Badge` & `StatusPill` | `neutral`, `brand`, `accent`, `success`, `warning`, `danger` | Status dots, automatic label formatting |
| `Avatar` | Image with deterministic initials fallback | Online/offline presence dot indicator |
| `Tabs` & `SegmentedControl` | Multi-tab horizontal slider | `role="tablist"` with keyboard arrow navigation |
| `Modal` & `BottomSheet` | Modal dialog, mobile bottom sheet with drag handle | Focus trap, `ESC` key dismiss, body scroll lock |
| `Toast` & `ToastProvider` | Auto-dismissing banners with action buttons | `role="status"`, `aria-live="polite"` |
| `States` | `Skeleton` shimmer, `EmptyState`, `ErrorState` with retry | Zero blank screens or raw unformatted errors |
| `Feedback` | `Stepper`, `RatingStars`, `ConfirmDialog` | Replaces `window.alert` and `window.confirm` |
| `DataTable` | Desktop tabular display, mobile card list | Responsive breakpoint transition at 768px |
| `ThemeToggle` | 2-way toggle or 3-way segmented control | Switches light, dark, and sunlight modes |
| `LanguageSwitcher` | `EN` \| `සිං` \| `தமி` segmented toggle | Instant dynamic locale switching |

---

## 4. Internationalization (i18n)

Lightweight translation system in `src/utils/i18n.jsx`:
- **Supported Languages**:
  - English (`en`)
  - Sinhala (`si` — සිංහල)
  - Tamil (`ta` — தமிழ்)
- **Formatting APIs**:
  - `formatLKR(amount)`: Formats currency as `LKR 1,500` via `Intl.NumberFormat('en-LK')`.
  - `formatDate(date)`: Formats dates with native locale support (`en-LK`, `si-LK`, `ta-LK`).
  - `formatPhone(phone)`: Normalizes local numbers into Sri Lankan international format (`+94 XX XXX XXXX`).

---

## 5. Mobile-First & Capacitor Guidelines

1. **Safe-Area Insets**:
   - Headers and bottom navigation use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
   - `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
2. **Keyboard Handling**:
   - `inputmode="numeric"` for PIN keypads.
   - `inputmode="tel"` for mobile numbers.
   - 16px base font to prevent viewport shifts.
3. **PWA & Offline Resilience**:
   - Service worker caches static assets (`HTML`, `CSS`, `JS`).
   - Dynamic API requests (`/api/*`) are **never cached** to protect tokens and user privacy.
   - `OfflineBanner` alerts users during network interruptions.
