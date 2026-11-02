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
npm run test:grocery-storage
npm test
```

The focused Grocery persistence test verifies that concurrent inventory mutations are not lost. The PostgreSQL integration test remains separately available as `node test/postgresStorage.js` and requires a disposable test database through `DATABASE_URL`.
