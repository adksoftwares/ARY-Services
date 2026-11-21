# Security Policy

## Supported deployment

ARY Services is a multi-role marketplace and should be deployed only with HTTPS, configured secrets, durable PostgreSQL storage, and approved origin settings. Do not use demo credentials or local file storage for production.

## Reporting a vulnerability

Please do not open a public issue with exploit details. Contact the repository maintainer privately through GitHub's private vulnerability reporting, if enabled, or another verified maintainer channel. Include:
- affected commit or release;
- affected endpoint/file;
- reproduction conditions and impact;
- suggested mitigation, if known.

Do not include real customer personal information, identity documents, tokens, OTPs, or secrets in reports.

## Security baseline

- Production: HTTPS-only API endpoints; no IP-address HTTP failover.
- Authentication: password hash verification for every account; no hard-coded credentials.
- CORS: exact allowlist; no wildcard or allow-all fallback.
- Secrets: deployment environment only; never commit secrets or production data.
- Storage: PostgreSQL-backed durable storage with backups and restore validation.
- KYC: private object storage, size/type validation, least-privilege access, and retention controls.
- Money movement: server-authoritative calculations, idempotent settlement, immutable audit records, and reconciliation.
- Roles: Admin approvals are server-side and role-specific.
- Releases: review CI/security alerts before production rollout.

Security hardening is not a certification. A production release requires deployment configuration review and verification of the running system.
