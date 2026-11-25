# ARY Services database storage contract

## Current production source of truth

The current Express API uses PostgreSQL-backed JSONB collections through `server/src/storage.js`. The API requires `DATABASE_URL` in production and initializes its runtime tables before serving requests.

The authoritative marketplace state is stored in `public.ary_documents`:

- `users`, `bookings`, `reviews`, and `ledger` are stored as collection records.
- `grocery_products`, `grocery_orders`, `driver-services`, notifications, and Admin audit events use collection state records.
- OTP phone rate limits and single-use challenge consumption use the dedicated `otp_rate_limits` and `otp_used_challenges` tables created by the runtime initializer.

The runtime storage layer is responsible for the transactional read/write contract. Do not directly edit JSONB payloads or treat the normalized tables below as the source of truth.

## About `database/schema.sql`

`database/schema.sql` describes a normalized relational reference model. It is not currently the runtime schema used by the application routes and it must not be treated as a drop-in production bootstrap. In particular, the API's IDs and data shape are not yet fully migrated to the relational foreign-key model.

A future relational migration must include an explicit data conversion, ID mapping, rollback plan, and verified cutover. Do not manually convert production data by running this file against a live database.

## Manual migration order

Take a full PostgreSQL backup and verify that it can be restored before applying changes. Review the SQL against the target environment first.

1. `2026-11-25-cash-only-payment-guard.sql` — guards the optional legacy `payment_transactions` table when present.
2. `2026-11-25-cash-only-jsonb-document-guard.sql` — ensures `ary_documents` exists and enforces cash-only payment method writes for live booking, grocery order, and driver-job JSONB collections. Unchanged historical values are preserved.
3. `2026-11-25-driver-account-role-constraint.sql` — permits the driver account role in installations using the normalized users table constraint.

Run the scripts in order using a migration-capable PostgreSQL client. Keep the output and applied migration filenames in the deployment record. These scripts are not automatically executed by the application and a successful GitHub merge does not mean they have been applied to the hosted database.

## Rollback and recovery

- Before each migration, take a backup and record the current schema version and row counts.
- For the cash-only triggers, rollback requires dropping the relevant triggers and functions. Do not remove the cash-only API validation when rolling back database guards.
- For the driver-role constraint, restore the previous constraint only after confirming that no driver accounts exist; otherwise the rollback would reject valid records.
- If a migration fails, stop and restore or repair from the backup. Do not continue with later migrations.
- Validate `ary_documents` record counts, users, bookings, grocery orders, driver jobs, cash-payment statuses and OTP tables after migration.

## Known architectural follow-up

The normalized relational schema and current JSONB runtime store are not yet unified. The next major database project should move one domain at a time to relational tables with explicit foreign keys and transaction boundaries, then remove legacy mirrors only after a verified production cutover.