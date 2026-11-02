# ARY Services — Production Setup

This guide covers the browser marketplace and API deployment. Online payment/escrow is intentionally not enabled in this release.

## 1. API environment

Configure these values in the backend hosting provider's secret/environment settings:

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Platform-dependent | API listening port |
| `DATABASE_URL` | Yes | Managed PostgreSQL connection string |
| `PG_POOL_MAX` | Recommended | PostgreSQL pool size |
| `PGSSL` | Provider-dependent | Set `true` when the database requires TLS |
| `CLIENT_ORIGIN` | Yes | Exact HTTPS origin(s) of the deployed browser app, comma-separated |
| `JWT_SECRET` | Yes | Unique random secret, minimum 32 bytes |
| `OTP_SHIELD_SECRET` | Yes | Separate unique random secret, minimum 32 bytes |
| `ADMIN_NAME` | Recommended | Initial Super Admin display name |
| `ADMIN_EMAIL` | Yes for bootstrap | Initial Super Admin email |
| `ADMIN_PASSWORD` | Yes for bootstrap | Unique password with at least 14 characters |
| `ADMIN_PHONE` | Optional | Initial Super Admin phone |
| `TWILIO_ACCOUNT_SID` | Yes for production OTP | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes for production OTP | Twilio API auth token |
| `TWILIO_VERIFY_SERVICE_SID` | Yes for production OTP | SID of an SMS-enabled Twilio Verify Service |

Generate JWT and OTP shield secrets independently. Never reuse sample values or commit real secrets. Use the hosting platform's secret manager.

## 2. Twilio Verify

1. Create a Twilio account and a Verify Service.
2. Enable SMS as a verification channel and configure the service for the target countries.
3. Confirm the account has permission and sufficient balance/limits to send SMS to Sri Lankan mobile numbers.
4. Add the three Twilio variables to the API deployment environment.
5. Deploy the API with `NODE_ENV=production`.

ARY submits normalized Sri Lankan mobile numbers to Twilio in E.164 format (`+94XXXXXXXXX`). Twilio Verify generates, delivers, expires and checks the one-time code. ARY does not return OTP codes in production. If provider credentials are missing or Twilio is unavailable, the API fails closed with HTTP 503; it does not silently issue a development code.

## 3. PostgreSQL

- Use a managed PostgreSQL database with automated backups enabled.
- Configure the connection string and TLS policy supplied by the database host.
- Restrict database network access to the API deployment where possible.
- Keep credentials out of source control.
- Before migrating an existing installation, take a full database and JSON-data backup and prepare a separately reviewed migration plan. Do not overwrite existing customer/provider data with seed data.

## 4. Browser application

Deploy the Vite frontend with the correct API base URL for the production API. Configure the API's `CLIENT_ORIGIN` to the exact HTTPS origin used by the browser apps. The app entry points are:

- `/` — Customer
- `/provider.html` — Provider
- `/driver.html` — Driver
- `/admin.html` — Admin

All four browser entries use the shared API and identity system. Protect the Admin entry at the hosting layer if desired, but retain backend role authorization as the actual security boundary.

## 5. Release scope and operational requirements

- Direct cash booking is available; online escrow/payment gateway integration is deliberately deferred.
- Configure a real SMS provider before enabling customer OTP sign-in in production.
- Configure unique JWT, shield and Admin bootstrap secrets before starting the API.
- Set up database backups, restore procedures, monitoring and alerting.
- Review data retention, privacy notices, provider identity-document handling and incident response for the operating jurisdiction.
- Complete the organization's release approval and manual browser/device checks before opening the service to the public.

This document describes configuration requirements; it does not claim that any hosting environment, Twilio account, domain, database or production secret has already been provisioned.


## Mobility dispatch operations (no payment gateway)

The Admin API provides a protected dispatch snapshot at `GET /api/admin/driver-dispatch`. It lists only drivers with an approved network and a GPS update within the dispatch freshness window, plus active ride and delivery jobs. The response is intentionally privacy-minimised and excludes NIC/KYC documents, phone numbers, email addresses and internal customer account IDs.

Drivers may release an accepted job before pickup using `PATCH /api/driver-jobs/:id/cancel`. The assignment is cleared and the job is marked cancelled for audit visibility. This action is rejected after pickup. This is not a substitute for a future customer-support cancellation and reassignment policy.
