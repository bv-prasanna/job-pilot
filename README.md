# JobPilot AI

A free, local-first React + TypeScript web workspace for job applications, recruiter contact management, referral outreach and explainable resume/JD matching.

## Current capabilities

- Store candidate profile and **resume text** in browser storage; `.txt` resume import supported.
- Manually save jobs (title, employer, JD, application URL, salary, status and notes).
- Transparent keyword-based resume/JD overlap with matched and missing skills. **Not an ATS score, hiring probability or AI model.**
- Separate HR/hiring-manager and referral-contact modules, deduplication and CSV import/export.
- Preview, copy and save tailored recruiter emails or referral requests; open the user's email client using `mailto:` to **approve and send**. The app never sends an email itself.
- Application and outreach status tracking; export/import full JSON backup.
- Responsive layout; no backend, external database, telemetry or paid API.

## Quick start

Requires Node.js 22+ and npm.

```bash
npm install --no-audit --no-fund
npm run dev
npm run check
```

Open the localhost address printed by Vite. Create production assets with `npm run build`, then deploy `dist/` to a free static host if within its free-tier limits.

## Constraints and safety

- **Single-browser prototype**: data persists in `localStorage`, which is not encrypted and not suitable for confidential or shared/public computers. Browser data loss is possible: export periodic backups. There is no sign-in, server authorization, or multi-device sync in this MVP.
- Resume input is `.txt` or pasted text only. PDF/DOCX extraction is not implemented yet.
- No unauthorized scraping, automatic LinkedIn activity, discovery of private emails, unsolicited bulk sending, Gmail OAuth, response synchronization, or unattended follow-ups.
- User-supplied application and profile links permit only `http`/`https` protocols.
- Messages intentionally avoid invented work history and do not claim an objective ATS probability.
- No external company/job API; users add verified listings themselves.
- Browser copy, `mailto:` and OS email client behavior differ. “Open email app” saves a draft locally but **does not confirm delivery**. Mark a record as sent only when you have actually sent it.
- This version is not production-deployment ready for multiuser handling of personal data. Future hosted versions require authenticated API, database encryption strategy, rate limiting, audit logs, consent/retention policy, and verified OAuth integrations.

## Quality and GitHub Actions cost

Local: `npm run test` runs built-in Node tests; `npm run build` runs TypeScript checking and Vite bundling. CI is **manual-only** (`workflow_dispatch`), has a 10-minute timeout, no artifact upload, no cron/push/PR triggers, and read-only permissions. The workflow uses `npm install --no-audit --no-fund` without a committed lockfile (dependency resolution is not yet reproducible).

No claim of bug-free software or guaranteed coverage is made. Browser E2E tests, real email integration tests, accessibility audits, security reviews and supported browser verification are future gates before production launch.

## Contact CSV format

`name,email,company,role,source,profile,relationship` (first row must be headers). Invalid email rows and duplicates are skipped. Only import contacts you have permission to use.

## Future roadmap

1. Add PDF/DOCX parsing and file-based unit tests.
2. Add authorized employer ATS / job board adapters; record freshness and provenance of each listing.
3. Add authenticated Gmail/Outlook OAuth sending with explicit approvals, idempotency and quota enforcement.
4. Add permissioned hiring contact discovery and private-network referral ranking from authorized sources.
5. Add real backend, secure storage, data deletion/export, security scanning and full browser E2E suite before broader deployment.


## Local API backend (single-owner MVP)

Requires Node.js 22 or newer. Set a random secret in `JOBPILOT_API_TOKEN` (24+ characters); never commit it.
Set `JOBPILOT_ALLOWED_ORIGIN` to the exact web frontend origin when requests come from a browser.

```bash
export JOBPILOT_API_TOKEN="replace-with-a-long-random-secret-value"
npm run api
npm test
```

API defaults to `http://127.0.0.1:8787` and stores records in `./data/jobpilot.json` (ignored by Git).
Authenticated resources: `/api/profiles`, `/api/jobs`, `/api/contacts`, `/api/outreach`, and `/api/applications`; each supports GET list/item, POST create, PUT update and DELETE.
Matching: `POST /api/match` with resume/JD text or `POST /api/jobs/:jobId/match` with `{"profileId":"..."}`.
Draft generation: `POST /api/draft`. All operations require `Authorization: Bearer <token>`.
No bulk email is sent and this API does not claim to verify third-party contact details. Never expose the API token in frontend browser code.

**Not production complete:** The current API uses a single long-lived token, single-file storage and per-process request limits. It lacks user login/OAuth, per-user authorization, multi-process DB locking, encrypted secret storage, email provider integration, external job-source connectors, and frontend API wiring. Use localhost for development only until those controls are added.


## Public ATS job discovery

Authenticated `POST /api/discover` accepts `{"provider":"greenhouse","board":"company-board-slug"}` or `{"provider":"lever","board":"company-slug"}`. It returns up to 500 public postings and their original application URLs. Results are preview-only, **not automatically applied to or emailed**. Employers may restrict or change their public feeds. No LinkedIn scraping or email guessing is used.

**Deployment blockers:** Gmail OAuth and approved sending, candidate accounts with per-user authorization, a transactional database and backups, secure sessions, PDF/DOCX resume extraction, comprehensive UI integration tests, and production deployment verification. Do not embed the API master token in browser code.


### Backend Gmail integration status (October 2026)

`server/gmail.mjs` provides Google OAuth PKCE authorization URL generation, code/refresh-token exchange, RFC 2047/MIME UTF-8 message generation and an explicitly approved Gmail send adapter. `tests/gmail.test.mjs` covers these functions with mocked network requests. No live Google requests were made, and no outbound email is sent by existing application endpoints.

**Not yet enabled:** server-side OAuth state/verifier persistence and callback, encrypted per-user refresh-token storage, token revocation, per-user identity/permissions, secure sending endpoint and consent UI. Do not expose Gmail credentials, refresh tokens or `JOBPILOT_API_TOKEN` in React. Google Cloud OAuth client setup and account authorization are prerequisites. Current local-only API and JSON store are not suitable for a publicly exposed multiuser app.

Job discovery is available through authenticated `POST /api/discover` with `{"provider":"greenhouse","board":"company-slug"}` or `{"provider":"lever","board":"company-slug"}`. It returns job previews; it does not apply or send email.


## Backend workflow endpoints

All routes require the configured API bearer token; the backend is currently localhost-only, single-owner software, not a production multiuser service.

- `GET /api/overview` — application/outreach pipeline summary.
- `POST /api/rank` with `{"profileId":"UUID","minimumScore":60}` — sort locally saved openings by heuristic keyword match. This is **not** a verified ATS rating.
- `GET /api/jobs/{jobId}/contacts?kind=recruiter` or `kind=referral` — suggest **previously saved** same-company contacts. Contact confidence is based on stored fields, not external identity verification.
- `GET /api/follow-ups?days=7` — identify sent outreach not recently updated.
- Referential integrity prevents deletion of jobs referenced by applications/outreach, or contacts referenced by outreach.

The Gmail helper is deliberately not exposed as an unsafe browser-accessible email endpoint. OAuth callbacks, secured token storage, tenant-scoped login, idempotent audited send-confirmation and real Gmail account connection remain prerequisites for actual sending.

**Release gate:** Complete production authentication, encrypted account tokens, transactional persistent storage, dependency/build checks, threat modeling, integration tests and deployment hardening before exposing the API publicly. No guarantee of zero defects is possible.
