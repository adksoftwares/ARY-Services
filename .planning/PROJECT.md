# ARY Services Platform

## Vision & Architecture
ARY Services is Sri Lanka's on-demand local services, mobility, and grocery ecosystem.
It connects certified tradespeople, verified local merchants, and professional drivers with households nationwide across web and native mobile (Capacitor/Android).

## Monorepo Apps & Packages
- `@ary/customer` (`src/apps/customer`): Customer marketplace, booking flows, grocery ordering, and mobility hailing.
- `@ary/provider` (`src/apps/provider`): Service provider operations, schedules, earnings, and service category management.
- `@ary/driver` (`src/apps/driver`): Outdoor-readable driver HUD, proximity job dispatch, one-tap accept, and pickup PIN verification.
- `@ary/admin-dashboard` (`src/apps/admin`): Super Admin control center, KYC moderation, dispute resolution, and audit logs.
- `server` (`server/`): Node.js Express backend API, atomic JSON/PostgreSQL storage, double-entry escrow ledger, and real-time SSE stream.
- Shared Design System (`src/design-system/`): Unified CSS tokens, primitives, multi-language support (English, Sinhala, Tamil), and Dark Luxury OLED theme.

## Environment & Endpoints
- Production API Base: `https://aryservices.adksoftwares.com/api`
- VPS Server: `173.212.223.108:4000` (Nginx reverse proxy with TLS certificate)
- Mobile Target: Samsung Galaxy S24 Ultra (`RFCY40K7QAN`) and Android 8+ devices.
