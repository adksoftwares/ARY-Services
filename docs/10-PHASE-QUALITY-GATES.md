# ARY Services — 10-Phase Upgrade Quality Gates

This plan is additive: preserve existing ARY marketplace features and app areas (Customer, Provider, Driver, Admin) while hardening them. A completed code change or CI run is not a 10/10 certification. Every phase must pass its acceptance gates and be reviewed against the deployed environment.

## Phase 1 — Security & access
- [x] Remove hard-coded customer login bypass.
- [x] Reject unknown CORS origins; remove allow-all callback.
- [x] Remove direct HTTP/IP failover from browser API config.
- [ ] Audit all auth routes, OTP lifecycle, token expiry/revocation and role switching.
- [ ] Add security regression checks and automated scanning.

## Phase 2 — Backend/data consistency
- [ ] Replace whole-collection read/modify/write with database-level atomic operations.
- [ ] Add schema migrations with rollback strategy and explicit migration version.
- [ ] Use transaction boundaries for booking, inventory, wallet, and ledger operations.
- [ ] Add conflict/idempotency handling for retried requests.
- [ ] Define a durable storage contract for all serverless/runtime environments.

## Phase 3 — Marketplace workflow
- [ ] Define and enforce allowed booking state transitions on the server.
- [ ] Validate ownership and role for every transition.
- [ ] Add idempotency keys and booking/status history.
- [ ] Handle cancel, reschedule, reject, dispute and refund flows.
- [ ] Prevent provider/service activation until Admin approval.

## Phase 4 — Mobility & driver operations
- [ ] Validate driver application and service scopes.
- [ ] Expire location/presence and require freshness before dispatch.
- [ ] Dispatch ranking with fairness, service area, availability, and stale GPS exclusion.
- [ ] Protect pickup/delivery PINs with expiry, attempt limits, and audit.
- [ ] Implement ride lifecycle, cancellation, reassignment, emergency escalation and incident review.

## Phase 5 — Grocery/shop
- [ ] Validate product units and currency using server-side allowlists.
- [ ] Prevent overselling with atomic stock reservations.
- [ ] Recalculate cart/order totals on the server; ignore client-supplied totals.
- [ ] Support stock expiry, availability, order cancellation, substitutions and delivery states.
- [ ] Keep delivery jobs and inventory/order records transactionally aligned.

## Phase 6 — Admin & operations
- [ ] Role-based admin capabilities and protected sensitive actions.
- [ ] KYC moderation, service/category approvals, audit log and reason fields.
- [ ] Search, filters, bulk operations with safe per-item validation.
- [ ] Dispute/refund queue and double-entry reconciliation.
- [ ] Avoid exposing NIC/NSN/KYC document contents in logs or public responses.

## Phase 7 — UI/UX quality
- [ ] Preserve design system/tokens, languages, theme options, responsive shell.
- [ ] Accessibility: keyboard operation, focus visibility, labels, contrast, screen-reader states.
- [ ] Customer: service discovery, transparent quote/booking states.
- [ ] Provider: requests, schedules, service approvals, availability and clear earnings.
- [ ] Driver: high-contrast, outdoor-readable, one-handed active-job flow.
- [ ] Admin: queue triage, audit trails, exceptions and undo/recovery where safe.

## Phase 8 — Mobile reliability
- [ ] Verify Android permissions, location freshness and background policy.
- [ ] Handle network loss, retry queues, offline UX and stale data.
- [ ] Verify push notification lifecycle and deep links.
- [ ] Ensure builds and signing are reproducible; secrets are not stored in repo.
- [ ] Test on supported Android versions/devices and a real release build.

## Phase 9 — Test and release confidence
- [ ] Frontend unit tests and production build.
- [ ] API integration tests, role/access tests, database concurrency tests.
- [ ] Critical customer/provider/driver/admin journeys in E2E.
- [ ] Accessibility, mobile viewport and regression coverage.
- [ ] CI checks must pass; document any intentional skipped tests.

## Phase 10 — Production launch
- [ ] HTTPS, DNS, reverse proxy, secure headers, secret rotation.
- [ ] Postgres backup schedule and successful restore drill.
- [ ] Observability, alerts, error tracking, privacy-safe logging and rate limits.
- [ ] Terms/privacy/consent/retention and incident-response procedures.
- [ ] Canary launch, rollback procedure, support process, and launch checklist signed off.

## Release rule

A phase is considered complete only when implementation, automated checks, manual review, operational requirements and rollout validation are all satisfied. The checklist is deliberately not marked complete merely because source code exists.
