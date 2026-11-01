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

The original root application remains available at `/`. Dedicated Customer and Provider app entries are included in the Vite multi-page build.

Run the same development server:

```bash
npm install
npm run dev
```

- Customer app: `http://localhost:5173/customer.html`
- Provider app: `http://localhost:5173/provider.html`
- Original app (including Admin and Driver areas): `http://localhost:5173/`

### Customer app
The Customer entry reuses ARY's existing customer components and shared API/auth services, including service discovery, grocery marketplace, mobility services, provider booking, booking history, reviews and disputes.

### Provider app
The Provider entry reuses ARY's existing provider workspace and shared API/auth services. It includes job bookings and response actions, customer ratings and reviews, earnings/escrow wallet, incoming job alerts, and the existing Grocery Inventory module for grocery providers. Provider activation remains subject to the existing Admin approval process.

The original root app and its existing features have not been removed or replaced. Driver and Admin dedicated entries are still future extraction stages. Build/runtime integration should be verified in the project environment before deployment.
