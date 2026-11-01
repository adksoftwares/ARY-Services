# ARY Services — Multi-App Ecosystem

## Architecture decision

ARY Services will evolve from the current single React application into a coordinated suite of applications. This is an application-boundary change, not a replacement of ARY's marketplace or business rules.

### Applications

| Application | Primary users | Responsibility |
|---|---|---|
| ARY Customer | Public customers | Discover services, search providers/products, place bookings and orders, track work, payments, reviews and disputes |
| ARY Provider | Service providers and merchants | Provider onboarding, business profile, service requests, product catalogue, grocery inventory, order handling, availability, earnings and reports |
| ARY Driver | Approved drivers/couriers | Go online/offline, receive and accept eligible jobs, navigation, pickup/drop-off, trip PINs, delivery status and earnings |
| ARY Admin | Super Admin and authorized staff | Provider/driver/service approvals, user management, marketplace configuration, disputes, finance oversight, moderation, reports and audit |

The Admin application is a web dashboard. Customer is the public-facing marketplace and should remain web-capable. Provider and Driver can have dedicated web clients initially; native mobile clients can be introduced later without changing the shared business services.

## Shared platform

All applications must use the same central backend and identity system:

- One user identity per person, with multiple independently approved roles where applicable.
- Role and permission checks enforced by the backend, not only by hiding frontend screens.
- Shared APIs for authentication, profiles, service catalogue, bookings, orders, payments, notifications and audit events.
- Service-specific approval and lifecycle rules. Approval for one provider service must not approve every other service automatically.
- Shared customer/provider/driver records and consistent identifiers across applications.
- Centralized configuration, observability, security controls and operational reporting.

A person may use Customer and Provider experiences with the same identity. Driver access is separately granted after the required driver approval. Each app must expose only the capabilities allowed by the signed-in user's approved roles.

## Existing ARY capabilities to preserve

The split must retain, not remove or silently redesign:

- The existing Customer, Service Provider and Admin account areas.
- Provider registration and verification workflow, including the currently collected identity/business details and operating mode.
- Admin approval before a provider becomes active.
- Provider requests to add services and Admin approval before those services become available.
- Existing service categories and local-services marketplace.
- Grocery Products, product catalogue and inventory workflows.
- Existing driver application/approval and driver service workflows.
- Existing booking lifecycle, customer booking history, reviews, disputes and real-time event updates.
- Existing payment/ledger/escrow-related capabilities and admin finance tools.
- Existing location and distance/ETA capabilities.

Before moving any feature, map its current UI, API routes, data ownership and permissions. Do not create a second implementation of an existing feature.

## Application boundaries

### Customer
- Home, service discovery, search and category browsing.
- Provider and product discovery.
- Grocery/food/market ordering where enabled.
- Service booking and booking history.
- Ride/transport and parcel request experiences as those modules are implemented.
- Job/order status tracking, reviews, complaints and disputes.
- Customer payment methods, receipts and notifications.

### Provider
- Provider onboarding and profile completion.
- Shop-based, online and mobile/on-location operating modes.
- Separate service applications and approval status per service.
- Service catalogue and service availability.
- Product catalogue, SKU/variants and grocery inventory.
- Incoming booking/order queue and lifecycle updates.
- Business hours, capacity, branch management where supported.
- Earnings, fees, wallet/settlement views and performance reports.

### Driver
- Driver application, document verification and approval state.
- Online/offline availability and eligible job offers.
- Ride, parcel and delivery job workflows.
- Accept/reject, pickup/drop-off, navigation and status transitions.
- Trip/job PIN verification where required.
- Earnings, history, safety and support.

### Admin
- User, provider and driver review/approval.
- Per-service provider approval and service-addition approval.
- Service categories, marketplace settings and operational controls.
- Bookings, orders, rides, deliveries and dispute oversight.
- Payment, ledger, commission, refund and settlement oversight.
- Moderation, fraud signals, notifications, audit trail and analytics.

## Migration approach

1. **Inventory and safety baseline** — map current routes, components, APIs, permissions, data stores and existing workflows. Identify security defects before exposing more app surfaces.
2. **Shared contracts** — define stable API contracts, shared authentication/session behavior, role permissions, common design tokens and shared UI primitives.
3. **Customer extraction** — move the public marketplace into its own app while preserving existing routes and customer journeys.
4. **Provider extraction** — move provider onboarding, approval-aware workspace, services, products, grocery inventory and order management.
5. **Driver extraction** — move approved-driver workflows, job dispatch UI, location and trip/delivery handling.
6. **Admin extraction** — move Super Admin operations into a dedicated web dashboard.
7. **Integration and regression** — verify cross-app identity, permissions, service approval, booking/order lifecycle, notifications and finance flows before release.

## Non-negotiable safeguards

- Do not delete existing features during extraction.
- Do not change business rules or approval policy without explicit product approval.
- Do not duplicate backend logic across apps.
- Do not trust frontend role checks as authorization.
- Do not expose admin or provider functions to customer sessions.
- Preserve existing data identifiers and API compatibility during migration.
- Keep secrets and personal data out of source control and logs.
- Do not describe a migration stage as complete until its code and integration checks are actually complete.

## Current repository baseline and extraction progress

The repository contains the original root Vite/React application with role-based Customer, Provider, Driver and Admin experiences, plus an Express API and storage/database support.

Dedicated multi-page Vite entries are now present for:
- `/` — original combined application, retained as the compatibility entry.
- `/customer.html` — dedicated Customer app reusing the existing customer components and API.
- `/provider.html` — dedicated Provider app reusing the existing ProviderDashboard and GroceryInventory components and API.
- `/driver.html` — dedicated Driver app reusing the existing DriverWorkspace and driver application/job APIs.
- `/admin.html` — dedicated Admin dashboard reusing the existing AdminWorkspace and DriverApplicationsAdmin components.

The Provider app currently provides the existing booking queue/status actions, reviews, earnings/escrow wallet, incoming booking alerts and grocery inventory for grocery providers. Provider activation remains subject to the existing Admin approval process. The Driver app reuses the existing driver application submission, Admin approval, job listing, job claim and job status workflows. The Admin dashboard reuses the existing account management, service category management, dispute arbitration, CEFT payout settlement and driver application approval workflows. All four dedicated app entry pages are now present; build/runtime and end-to-end integration checks remain necessary.

These entries are an incremental migration, not a claim of production readiness. Build/runtime and end-to-end integration checks remain necessary before release.
