# ARY Services — Consolidated hardening update

This branch groups the current cross-app onboarding and authentication corrections into one reviewable change set. It does not replace the existing Customer, Provider, Driver or Admin applications.

## Included in this update

- Session lookup is bound to the immutable account ID inside the signed token. A changed or recycled phone number/email can no longer cause an old session to resolve to another account.
- Signed token payloads are checked for a valid future expiry and the required identity fields. The short-lived OTP customer-registration token remains supported.
- Request correlation IDs accept only a bounded safe character set; otherwise the API generates a UUID.
- Provider registration now collects and validates the required NSN number and operating mode (shop, online or mobile/on-location), alongside the NIC number.
- Additional Provider role applications enforce the same NSN and operating-mode requirements.
- Customer quick registration no longer stores a shared predictable password. When no password is supplied, a cryptographically random password is generated server-side; customers should use the OTP sign-in flow.
- NIC validation uses the Sri Lankan legacy/new formats without accidentally accepting a pipe character.

## Verification

Run from `server/`:

```bash
npm run test:security
npm run test:grocery-storage
npm test
```

The focused session-identity test verifies that matching contact details cannot rebind a token to a different account. These commands are documented; they have not been executed in the GitHub connector environment. A full build, API integration run, browser/device regression pass and production configuration review are still required.

## Not represented as complete

This branch does not claim production-ready live driver GPS, map routing, automatic dispatch ranking, fare estimation, payment gateway/escrow settlement, push notifications, or a full security/compliance audit. Those need implementation and environment-backed verification before launch.
