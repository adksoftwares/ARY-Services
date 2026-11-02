# ARY Services

A browser-based service marketplace starter with Customer, Service Provider, Driver and Admin account areas.

## Included
- React + JavaScript responsive marketplace
- Customer, Provider and Admin views
- Service category discovery and search
- Express API starter
- PostgreSQL starter schema
- Environment example and setup instructions

## Run frontend
```bash
npm install
npm run dev
```

## Run API
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Configure PostgreSQL and apply `database/schema.sql` before using database features.

## Important
This is a development starter, not production-ready software. Authentication, provider verification, booking concurrency, payment gateway integration, file upload security, and end-to-end tests must be completed and audited before real-world use. Never commit real credentials or an `.env` file.

## Dedicated app entries

The root website (`/`) now opens the dedicated Customer app. Customer, Provider, Driver and Admin remain separate browser app entries sharing the same API and account identity.

Run the same development server:

```bash
npm install
npm run dev
```

- Customer app: `http://localhost:5173/customer.html`
- Provider app: `http://localhost:5173/provider.html`
- Driver app: `http://localhost:5173/driver.html`
- Admin dashboard: `http://localhost:5173/admin.html`
- Customer home: `http://localhost:5173/`

### Customer app
The Customer entry reuses ARY's existing customer components and shared API/auth services, including service discovery, grocery marketplace, mobility services, provider booking, booking history, reviews and disputes.

### Provider app
The Provider entry reuses ARY's existing provider workspace and shared API/auth services. It includes job bookings and response actions, customer ratings and reviews, earnings/escrow wallet, incoming job alerts, and the existing Grocery Inventory module for grocery providers. Provider activation remains subject to the existing Admin approval process.

### Driver app
The Driver entry reuses the existing DriverWorkspace and its API workflows for driver applications, Admin approval, eligible ride/delivery jobs, job acceptance and job status updates. Driver activation and service eligibility remain controlled by the existing Admin approval process.

### Admin dashboard
The Admin entry reuses ARY's existing AdminWorkspace and DriverApplicationsAdmin components. It includes registered account management, service categories, dispute arbitration, CEFT payout settlement and driver application approvals. Admin access is restricted in the UI to signed-in Admin accounts; backend authorization remains essential.

ARY's existing marketplace features are retained in the dedicated app components. The root route now points to Customer instead of loading the retired monolithic entry. Build/runtime integration must be verified before deployment.


## Shared session and integration
All four dedicated entries use the same `ary_user` browser session key and the shared `API_BASE` configuration. Login, logout and account changes are synchronized between ARY tabs through the browser storage event. Authentication is verified by the API; the frontend no longer creates a local Admin session when API login fails. Driver application submission and review events are broadcast through the existing SSE hub so the Admin queue and Driver portal can refresh/notify in real time.


## Required backend environment

Copy `server/.env.example` to `server/.env` and replace every placeholder with unique secrets. The API refuses to start if `JWT_SECRET` or `OTP_SHIELD_SECRET` is missing or shorter than 32 characters. Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` to provision the first Super Admin account; there is no shared default Admin password. Set `CLIENT_ORIGIN` to the exact deployed frontend origin(s), comma-separated when more than one is needed.

OTP codes are exposed by the simulator only outside production. A production SMS provider must be configured before real customer verification can be used. Do not commit `.env`, runtime user records, identity documents, or payment data.


### Storage and deployment notes

When `DATABASE_URL` is configured, account, booking, review, ledger, driver-dispatch and Grocery inventory state is stored in PostgreSQL using the shared `ary_documents` persistence layer. Grocery inventory mutations use the same transaction/advisory-lock storage helper, so concurrent API instances do not rely on a per-instance JSON file or ephemeral `/tmp` storage. Production startup requires PostgreSQL; the local JSON adapter is reserved for local development and tests. Set `PG_POOL_MAX` and `PGSSL` for deployment connection-pool/TLS policy. Run `node test/postgresStorage.js` from the `server` directory to verify the PostgreSQL adapter against a disposable test database.


## Production SMS OTP (Twilio Verify)

The API supports Twilio Verify for real production SMS delivery. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` in the server environment. Use a Twilio Verify Service configured for SMS and ensure the Twilio account is permitted to send to Sri Lankan mobile numbers. Phone numbers are normalized to Sri Lankan E.164 format (`+94XXXXXXXXX`).

Production never falls back to the in-memory development OTP simulator: if Twilio credentials are missing or the provider is unavailable, OTP send/verification returns a service-unavailable response. Development continues to use the local simulator and its `devCode` response. Keep Twilio credentials in deployment secrets only; never commit them.

See [Production setup](docs/PRODUCTION-SETUP.md) for the deployment environment checklist.


### Backend verification

From the `server` directory:

```bash
npm run test:security
npm run test:grocery-storage
npm run test:mobility
npm test
```

The focused Grocery persistence test verifies that concurrent inventory mutations are not lost. The PostgreSQL integration test remains separately available as `node test/postgresStorage.js` and requires a disposable test database through `DATABASE_URL`.


## Consolidated hardening update

See [Consolidated hardening](docs/CONSOLIDATED-HARDENING.md) for the current session-identity and provider-onboarding safeguards, verification commands and explicitly deferred production work.


## Mobility dispatch and location

Ride and food-delivery requests can include optional browser GPS coordinates. Approved drivers explicitly choose **Go online** and grant browser location permission before receiving new jobs. The Driver app refreshes location while online; stale GPS (older than 90 seconds) is excluded from new-job dispatch and cannot be used to claim a job. Eligible jobs are ordered by straight-line proximity to the ride pickup or food-delivery customer drop-off. This is a proximity estimate, not road routing or a guaranteed arrival time. Customers can view their own ride/delivery request status and the assigned driver's latest available GPS point, and can cancel while no driver has accepted the request.


## Mobility operations (excluding payment gateway)

- Admin-only dispatch monitoring API: `GET /api/admin/driver-dispatch` returns fresh, approved online drivers, active ride/delivery jobs and operational counts. It deliberately excludes KYC, NIC, phone, email and customer account identifiers.
- An assigned driver can release an accepted job before pickup with `PATCH /api/driver-jobs/:id/cancel`. The job is marked cancelled, its assignment is cleared, and the customer/admin views receive a job update. A job cannot be released through this action after pickup.
- Payment gateway integration remains intentionally excluded. Existing cash/ledger/CEFT workflows are not represented as online card/wallet payment processing.


## Additional marketplace workflows (payment gateway excluded)

- Customer parcel requests create jobs for the separately approved `parcel_delivery` driver network and collect sender/recipient contact details, parcel class and declared weight. Contact numbers are withheld from unassigned drivers.
- Ride start, food/parcel pickup and delivery handoffs use six-digit PINs. PIN hashes are stored server-side; customer-facing PINs are returned only to the owning customer and never included in dispatch events. Driver verification is limited to five failed attempts per handoff.
- A driver cannot accept another active job until the current job is completed or released. Ride and delivery status transitions require arrival and server-verified handoff PINs.
- Grocery customers can place single-shop orders with server-side stock reservation, order history and cash-on-delivery status. Grocery providers can accept, prepare, mark ready for pickup or cancel orders; cancellation restores reserved stock.
- Online card/wallet payments, escrow and automated payouts remain excluded. Grocery delivery fee is currently zero until a real delivery pricing policy is configured.


- Optional ride and parcel fare estimates are available only when the corresponding LKR base, per-kilometre and minimum rates are configured in the server environment. Estimates use straight-line GPS distance and must not be presented as road-route quotes.


## Road routing

ARY can request road distance and duration from a self-hosted OSRM-compatible service through `GET /api/mobility/route`. Configure `ROUTING_BASE_URL` to an HTTPS endpoint. The application does not silently substitute straight-line distance when road routing is unavailable. Driver proximity sorting remains a straight-line approximation and must be labelled as such in the UI.


## Native Android app bundles

Three Capacitor Android shells are maintained for Customer, Driver and Provider. They share the browser application code and require the production API endpoint to be injected at build time. Set `ARY_API_BASE` to the HTTPS backend base ending in `/api`, then run `npm run build:mobile` (or `build:mobile:customer`, `build:mobile:driver`, `build:mobile:provider`). The mobile build intentionally fails when this endpoint is missing instead of packaging an app that calls `localhost` on the user's phone. Cleartext HTTP is disabled in the native Capacitor configs. Android signing, Play Store release configuration, Firebase project files and device validation remain deployment-owner tasks.


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


## Independent application workspaces

ARY Services is one GitHub monorepo with four independently runnable web applications:

- `apps/customer` — Customer application
- `apps/provider` — Service Provider application, including Grocery
- `apps/driver` — Driver application
- `apps/admin-dashboard` — Admin dashboard

The apps share the existing API server and common UI/authentication/utilities. Grocery remains a Provider module, not a separate app. Run with `npm run dev:customer`, `npm run dev:provider`, `npm run dev:driver` or `npm run dev:admin`; build with the corresponding `build:` command. Build outputs are isolated under `dist/apps/`. Legacy root entry points are retained during transition.
