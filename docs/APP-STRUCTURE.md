# ARY Services — Monorepo Application Structure & Architecture

ARY Services is a multi-tier Sri Lankan marketplace monorepo hosting four React 18 applications, Capacitor mobile WebView packages, a unified Design System, and an Express API backend.

---

## 1. Monorepo Organization

```
ARY Services/
├── apps/                          # Standalone workspace app containers
│   ├── customer/                  # Customer portal (Vite workspace, port 5173)
│   ├── provider/                  # Provider & Grocery workspace (port 5174)
│   ├── driver/                    # Driver & Courier workspace (port 5175)
│   └── admin-dashboard/           # Super Admin workspace (port 5176)
├── mobile/                        # Capacitor native wrappers for Android
│   ├── customer/                  # Customer Android app
│   ├── provider/                  # Provider Android app
│   └── driver/                    # Driver Android app
├── src/                           # Single Source of Truth & Shared Code
│   ├── apps/                      # Core application implementations
│   │   ├── customer/              # CustomerApp.jsx, routes & views
│   │   ├── provider/              # ProviderApp.jsx, quotes, grocery inventory
│   │   ├── driver/                # DriverApp.jsx, live dispatch, tasks, PINs
│   │   └── admin/                 # AdminApp.jsx, approvals, dispatch, disputes
│   ├── components/                # Reusable domain components
│   │   ├── admin/                 # AdminApprovals, AdminDispatch, AdminDisputes, AdminWorkspace
│   │   ├── common/                # Navbar, Footer, AuthModal, NotificationCenter, OfflineBanner
│   │   ├── customer/              # BookingWizard, HeroSection, MobilitySection, GroceryMarketplace
│   │   ├── driver/                # DriverWorkspace, DriverEarningsSummary, DriverPinKeypadModal
│   │   └── provider/              # ProviderDashboard, ProviderWallet, ProviderServicesManager
│   ├── design-system/             # Shared Design System Foundation
│   │   ├── tokens.css             # Color scales, 4-pt grid, radii, elevation, themes
│   │   ├── base.css               # Accessible reset, typography, focus rings, .sr-only
│   │   ├── layout.css             # App shell, topbar, bottom nav, dashboard layouts
│   │   ├── components.css         # Component styling classes
│   │   ├── components/            # React primitives (Button, Card, Input, Modal, Toast, etc.)
│   │   ├── hooks/                 # useTheme (light, dark, sunlight)
│   │   └── index.js               # Barrel export for all primitives
│   ├── context/                   # React contexts (AuthContext, SocketContext)
│   ├── utils/                     # Formatting, i18n, storage, location, sound
│   └── styles.css                 # Unified stylesheet import aggregator
├── public/fonts/                  # Self-hosted WOFF2 fonts (Manrope, DM Sans)
└── server/                        # Express API backend & SQLite database (Port 4000)
```

---

## 2. Single Source of Truth: `src/apps/*`

To eliminate duplication across workspaces, all app routing, feature states, and core UI logic live directly under `src/apps/*`:
- `src/apps/customer/CustomerApp.jsx`
- `src/apps/provider/ProviderApp.jsx`
- `src/apps/driver/DriverApp.jsx`
- `src/apps/admin/AdminApp.jsx`

Each standalone workspace (`apps/<app>/src/main.jsx`) acts as a clean mounting shim that mounts the corresponding `src/apps/<app>` root component with the unified design system and React 18 `createRoot`.

---

## 3. Root Multi-Page Setup & HTML Entry Points

The root directory contains:
- `index.html` (portal / landing selector)
- `customer.html`
- `provider.html`
- `driver.html`
- `admin.html`

These entry points are configured in the root `vite.config.js` `rollupOptions.input`. They allow developers to run `npm run dev` from the root and access all four applications under a single unified development server, and allow building all applications in a single run (`npm run build`).

---

## 4. Design System Integration

All applications share the zero-dependency design system:
```jsx
import {
  Button,
  Card,
  Input,
  Badge,
  Modal,
  ToastProvider,
  useToast,
  ThemeToggle,
  LanguageSwitcher,
  PageHeader,
  AppShell
} from '../../design-system';
```

Tokens automatically handle:
- Light Theme (`[data-theme="light"]`)
- Dark Theme (`[data-theme="dark"]`)
- High-Contrast Sunlight Mode (`[data-theme="sunlight"]`)
- Sri Lankan Fallbacks: Noto Sans Sinhala & Noto Sans Tamil
- Reduced motion overrides via `@media (prefers-reduced-motion: reduce)`

---

## 5. Build & Development Commands

| Action | Command | Output Directory |
|---|---|---|
| Customer App Dev | `npm run dev:customer` | `http://localhost:5173` |
| Provider App Dev | `npm run dev:provider` | `http://localhost:5174` |
| Driver App Dev | `npm run dev:driver` | `http://localhost:5175` |
| Admin App Dev | `npm run dev:admin` | `http://localhost:5176` |
| Root Multi-Page Dev | `npm run dev` | `http://localhost:5173` (all apps) |
| Production Builds | `npm run build:customer` / `provider` / `driver` / `admin` | `dist/apps/<app>/` |
| Mobile Builds | `npm run build:mobile` | `mobile/<app>/android/` |
| Smoke Tests | `npm run test:smoke` | Automated Quality Gate |
