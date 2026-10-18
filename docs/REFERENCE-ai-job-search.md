# Reference review: MadsLorentzen/ai-job-search

Source: https://github.com/MadsLorentzen/ai-job-search
Reviewed October 2026. Upstream is MIT-licensed (Copyright 2026 Mads Lorentzen); retain its license and attribution if copying substantial source code. The following are **architectural ideas only**: no upstream code was copied.

## Useful for JobPilot

1. **Candidate profile grounding**: build a reusable evidence bank of real career achievements and skills; use only evidence-backed claims in outreach, resume variants and cover letters.
2. **Job pipeline**: discover -> deduplicate -> evaluate -> rank -> review -> apply -> record outcome. Preserve posting content and provenance with the application.
3. **Fit score**: score by multiple explainable dimensions (core requirements, seniority, location/remote, compensation expectations, skills) and let hard deal-breakers veto a job. Show strengths, missing requirements, and confidence. Scores are internal decision aids, not official ATS percentages.
4. **Reviewer pass**: generate tailored CV/email/cover-letter draft; run a second rules-based consistency and tone pass, then require user approval.
5. **Outcome learning**: store the actual resume and message used, follow-up dates, stage progression, feedback and rejection reasons. Build a measurable funnel.
6. **Interview kit**: job-specific preparation based on the exact saved JD, candidate STAR examples, company facts with sources, and mock interview questions.
7. **Pluggable portal adapters**: provider modules should explicitly enforce source permissions, deduplication, pagination and error classification.

## Not appropriate to copy directly

- The upstream tool relies on Claude Code (paid subscription/API credits), Python, Bun and LaTeX. JobPilot is a React + TypeScript web application with free-tier-first infrastructure.
- Portal search is mainly tailored to Danish sources. Do not automatically scrape LinkedIn or transfer market-specific assumptions.
- No candidate personal data, credentials, CVs or previous application records should be committed to a public repository.
- Do not automatically submit job applications or message people without permission and explicit human review.

## Implementation sequence

P0: fix secure authentication and production storage, connect UI to authenticated API and establish end-to-end build/test baseline.
P1: add evidence-backed score breakdown, dedupe and saved-job snapshots.
P2: tailor draft -> reviewer -> approve workflow, referral recommendations grounded in authorized contacts.
P3: application outcome tracking and interview pack with source-backed research.
P4: additional authorized job feeds and optional salary benchmarking.

Maintain manual-only GitHub Actions to avoid unnecessary CI minutes. No external source code imported at this stage.
