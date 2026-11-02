# ARY Services (v2.0)

A high-performance, mobile-first Sri Lankan service marketplace monorepo featuring four specialized React 18 + Vite applications sharing a unified design system and backend Express API.

---

## Applications & Architecture

| Application | Workspace | Path | Target Users |
| :--- | :--- | :--- | :--- |
| **Customer App** | `@ary/customer` | `apps/customer` / `src/apps/customer` | Consumers discovering verified trades, booking rides, ordering groceries |
| **Provider Portal** | `@ary/provider` | `apps/provider` / `src/apps/provider` | Independent service contractors managing jobs, quotes, escrow wallet & reviews |
| **Driver Network** | `@ary/driver` | `apps/driver` / `src/apps/driver` | Mobility and delivery drivers with one-handed UI, GPS telematics & PIN keypad |
| **Admin Dashboard** | `@ary/admin-dashboard` | `apps/admin-dashboard` / `src/apps/admin` | Super Admins managing users, KYC documents, disputes arbitration & CEFT payouts |

Native Android packages are configured via Capacitor WebView wrappers under `mobile/customer`, `mobile/provider`, and `mobile/driver`.

---

## Design System & Features

- **Tokens & Theming**: Custom color scale for Brand Green (`#174d3d`), Warm Accent (`#d18b54`), and Cream Neutral (`#fbfaf7`). Includes Light mode, Dark mode (`[data-theme="dark"]`), and high-contrast Sunlight mode (`[data-theme="sunlight"]`).
- **Typography**: Self-hosted local fonts (`Manrope` + `DM Sans`) with full fallback support for Sinhala (`Noto Sans Sinhala`) and Tamil (`Noto Sans Tamil`).
- **Component Primitives**: Accessible `Button`, `IconButton`, `Input`, `Card`, `Badge`, `Avatar`, `Tabs`, `Modal`, `BottomSheet`, `ToastProvider`, `Stepper`, `DataTable`, `ThemeToggle`, and `LanguageSwitcher`.
- **Internationalization (i18n)**: Native dynamic switcher for English, Sinhala (සිංහල), and Tamil (தமிழ்), with `Intl` currency (`LKR`), date, and phone (`+94`) formatting.
- **PWA & Offline Resilience**: Service worker with offline static asset caching and an interactive `OfflineBanner` for intermittent 4G connectivity. Dynamic API endpoints are never cached offline.

---

## Development & Build Commands

### Web Workspaces

```bash
# Run Development Servers
npm run dev:customer     # Customer app on Vite
npm run dev:provider     # Provider workspace
npm run dev:driver       # Driver operations
npm run dev:admin        # Admin dashboard

# Build Production Bundles (with manualChunks code-splitting)
npm run build:customer
npm run build:provider
npm run build:driver
npm run build:admin
```

### Native Android Mobile (Capacitor)

```bash
# Build & sync all mobile bundles to Android Studio projects
npm run build:mobile

# Build & sync individual mobile applications
npm run build:mobile:customer
npm run build:mobile:provider
npm run build:mobile:driver
```

### Automated Quality Gates & Smoke Testing

```bash
# Run quality gate verification script
npm run test:smoke
```

---

## Security & Storage Constraints

1. **Authentication & Session**: Only `ary_user` session state is stored in localStorage.
2. **Zero Persisted User Lists**: `ary_persisted_users` is completely prohibited and omitted from the client.
3. **No Cached Auth Data**: Service workers enforce network-first live responses for all `/api/*` endpoints and never store tokens or user credentials in CacheStorage.
4. **Capacitor Releases**: Cleartext HTTP is restricted to local debug builds; production builds mandate HTTPS endpoints.

---

## Documentation

- **Design System Reference**: Detailed tokens, components, and accessibility guidelines can be found in [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).
