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


## Shared identity and cross-app session
The four browser entries share the existing AuthContext implementation, API base configuration and `ary_user` session storage key. The AuthProvider listens for browser storage events so login/logout changes in one ARY tab update other open ARY apps. API authentication remains authoritative; a failed API login must never create a frontend-only Admin session.

Driver application creation and Admin review now emit explicit SSE events (`driver:application_created` and `driver:application_reviewed`). The Admin application queue refreshes on those events, and the Driver portal displays a notice when its application is reviewed. Driver job events continue using the existing `driver:job_created` and `driver:job_updated` names.

**Role model:** the legacy `accountType` remains the active role encoded in the signed session for backward compatibility. Approved additional roles are stored separately in `roles`, and role applications are stored in `roleApplications`. Non-admin accounts also receive the baseline Customer experience. The backend validates each requested active role against the live account record; frontend-only role selection cannot grant access.


## Multi-role accounts (incremental implementation)

A single Customer identity can request additional Provider or Driver access without registering a second phone/email account. The original account remains available while each additional role is reviewed separately.

### Role lifecycle
- Legacy accounts remain compatible: their existing `accountType` is treated as their initial role when no `roles` array exists.
- Approved roles are stored in `roles`; role requests are stored independently in `roleApplications`.
- Provider approval sets `providerStatus=active` and copies the reviewed provider profile details. The existing account-level Customer status is not changed.
- Driver role approval grants access to the Driver app. Driver network applications (Ride / Food Delivery) remain a separate approval step before jobs can be claimed.
- Admin cannot be requested through the public role application API.

### API
- `GET /api/auth/roles` — approved roles, pending/reviewed role applications, and active role.
- `POST /api/auth/active-role` — issues a signed session token for an already-approved role only.
- `POST /api/account/role-applications` — submit a Provider or Driver role request for the signed-in account.
- `GET /api/admin/role-applications` — Admin-only pending role request queue.
- `PATCH /api/admin/role-applications/:userId/:role` — Admin-only approval or rejection.

The server validates the active role against the live account record on every authenticated request. A role value stored in browser state alone does not grant access. Existing single-role accounts and the existing Driver network approval process are retained.


## Mobility integration update

- Driver availability is explicit and opt-in. The Driver workspace asks the browser for location only after the driver chooses Go online.
- Driver presence is stored in the shared driver-services persistence collection. The driver client refreshes GPS while online and can switch offline.
- New jobs are shown only to drivers with an approved matching network and a fresh GPS update (maximum age 90 seconds). Job cards are ordered by proximity to the ride pickup or food-delivery destination where customer coordinates are supplied.
- Customer mobility requests can include optional GPS coordinates, show their own request lifecycle, and expose the assigned driver's most recent fresh location. Customers can cancel only while the request remains unclaimed.
- Distance is Haversine straight-line distance and ETA is a coarse estimate. This is not turn-by-turn navigation, road-distance routing, guaranteed dispatch, or a production SLA.


## Mobility handoff and grocery order workflows

Ride requests receive a customer-only trip-start PIN. Food delivery and parcel jobs use pickup and delivery PINs. The assigned driver verifies these through protected API actions after marking arrival; the API stores only PIN digests and limits failed attempts. Parcel requests are visible only to drivers approved for the parcel delivery network, and contact numbers are exposed only after assignment.

Grocery checkout validates current product availability, reserves stock, creates a single-provider cash-on-delivery order and exposes order history to the customer and fulfilment actions to the owning provider. Provider order states are pending, accepted, preparing, ready for pickup or cancelled. Cancelled orders restore reserved stock.


## Remaining marketplace workflows added

- **Authenticated live updates:** clients obtain short-lived signed SSE tickets through an authenticated API. Connections expire with the ticket and reconnect through authenticated APIs. Event payloads are invalidation-only; customer, provider and driver event delivery is role/account scoped. Request logs exclude query strings so tickets are not written to logs.
- **Persistent notifications:** booking, quote, reschedule, driver and grocery events create account-scoped notification inbox entries. Customers, providers, drivers and Admin can mark individual or all notifications read. Browser OS alerts are opt-in and work while the browser app is active; background Web Push / FCM delivery still requires deployment credentials and native push integration.
- **Service quotations:** the assigned provider can send a dated LKR quote with a scope description. The customer can accept or decline it. Acceptance updates the agreed booking amount and commission breakdown; settlement remains cash-based and no payment gateway is called.
- **Booking rescheduling:** customers can request a new date/time for pending or accepted bookings. The assigned provider or Admin confirms or declines the request.
- **Grocery fulfilment:** checkout creates a food-delivery dispatch job for the approved driver network. The job becomes visible only after the shop marks the order ready for pickup. Pickup and recipient PIN verification update the grocery order's delivery status. Customer-only PINs are hidden from provider and Admin order views. Cancelling before driver acceptance cancels the dispatch and restores stock; once a driver has accepted, cancellation is blocked for support handling.
- **Booking access hardening:** booking lists and review/cancel/progress actions use immutable account IDs rather than mutable phone-number matches. Provider booking status transitions are constrained by role and current lifecycle state.

## Operational items that still require owner configuration

- Configure ROUTING_BASE_URL with a self-hosted HTTPS OSRM-compatible service for real road distance/duration. Without it, the road-route endpoint returns unavailable; proximity ranking is still a straight-line approximation.
- Configure RIDE_*_LKR and DELIVERY_*_LKR fare variables to enable indicative fare estimates. Grocery delivery fee remains zero until a real delivery pricing policy is approved.
- Native Android bundles require ARY_API_BASE to point to the deployed HTTPS /api endpoint. Android signing, Firebase project credentials, store release setup and real-device validation are deployment-owner tasks.
- True background push notifications require a configured FCM/Web Push provider and its credentials; the current notification inbox and browser alerts do not claim background push delivery.
- Payment gateway, online escrow and automated payouts remain excluded.
