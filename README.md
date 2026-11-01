# ARY Services

A browser-based service marketplace starter with three account areas: Customer, Service Provider, and Admin.

## Included
- React + JavaScript responsive customer website
- Customer, Provider, and Admin views
- Service category cards and search
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


## Dedicated Customer App (first extraction stage)

The existing root application remains available at `/`. A dedicated Customer app entry has been added at `/customer.html` and is included in the normal Vite multi-page build.

Run the same development server:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/customer.html`.

The Customer app reuses ARY's existing customer components and shared API/auth services, including service discovery, grocery marketplace, ride/food-delivery request flows, provider booking, booking history, reviews and disputes. The original root app has not been removed or replaced.

This is the first extraction stage only. Provider, Driver and Admin remain in the existing root application until their dedicated entries are extracted in later stages. Build/runtime integration should be verified in the project environment before deployment.
