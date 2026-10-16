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
