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

The original root application remains available at `/`. Dedicated Customer, Provider, Driver and Admin app entries are included in the Vite multi-page build.

Run the same development server:

```bash
npm install
npm run dev
```

- Customer app: `http://localhost:5173/customer.html`
- Provider app: `http://localhost:5173/provider.html`
- Driver app: `http://localhost:5173/driver.html`
- Admin dashboard: `http://localhost:5173/admin.html`
- Original combined app: `http://localhost:5173/`

### Customer app
The Customer entry reuses ARY's existing customer components and shared API/auth services, including service discovery, grocery marketplace, mobility services, provider booking, booking history, reviews and disputes.

### Provider app
The Provider entry reuses ARY's existing provider workspace and shared API/auth services. It includes job bookings and response actions, customer ratings and reviews, earnings/escrow wallet, incoming job alerts, and the existing Grocery Inventory module for grocery providers. Provider activation remains subject to the existing Admin approval process.

### Driver app
The Driver entry reuses the existing DriverWorkspace and its API workflows for driver applications, Admin approval, eligible ride/delivery jobs, job acceptance and job status updates. Driver activation and service eligibility remain controlled by the existing Admin approval process.

### Admin dashboard
The Admin entry reuses ARY's existing AdminWorkspace and DriverApplicationsAdmin components. It includes registered account management, service categories, dispute arbitration, CEFT payout settlement and driver application approvals. Admin access is restricted in the UI to signed-in Admin accounts; backend authorization remains essential.

The original root app and its existing features have not been removed or replaced. All four dedicated application entry pages are now present. Build/runtime integration should be verified in the project environment before deployment. Build/runtime integration should be verified in the project environment before deployment.


## Shared session and integration
All four dedicated entries use the same `ary_user` browser session key and the shared `API_BASE` configuration. Login, logout and account changes are synchronized between ARY tabs through the browser storage event. Authentication is verified by the API; the frontend no longer creates a local Admin session when API login fails. Driver application submission and review events are broadcast through the existing SSE hub so the Admin queue and Driver portal can refresh/notify in real time.
