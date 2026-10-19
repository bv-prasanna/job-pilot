# Personal job discovery — current scope

JobPilot is a personal job-search helper, not a recruiting or staffing product.

## Find Jobs for Me

The sidebar screen accepts a role/keyword search and resume text. You may upload `.txt` or `.md` as a source for matching, or paste text from a PDF/DOCX resume. For PDF/DOCX job applications, continue to attach the actual resume file via Quick Apply by Email. Native PDF/DOCX text extraction for search is **not yet implemented**.

Search currently uses the public **Remotive remote-jobs API**. The results link back to Remotive and identify the source, as its API terms require. This is one feed, **not every job vacancy worldwide**, and some remote postings have country restrictions. Avoid frequent polling; Remotive recommends no more than a few updates daily.

Results have a heuristic keyword-overlap indicator using the user's resume text. The value is not an employer's ATS score or a guarantee of eligibility. Jobs can be saved in the personal local workspace. No resume contents are sent to Remotive, only the search phrase.

## Applying

- **Open job & apply:** opens the employer/job-board listing and the user submits any required application form manually. The application is **not automatically submitted**.
- **Apply by Email:** user supplies the recipient from the job post, includes a relevant JD if available, reviews the draft, attaches their actual PDF/DOC(X), grants Gmail permission and explicitly approves sending.
- Jobs with ATS application forms cannot safely be submitted by a generic one-click API. Provider-specific integrations and explicit user confirmation would be needed. Never misrepresent an external page opening as an application submission.

## Before declaring feature production-ready

Run `npm run check` locally, verify the new screen in Cloudflare Pages, exercise network errors and API feed availability, test Gmail attachment on the user's test mailbox, and review source terms. OAuth Testing mode allows only configured test accounts.

## Planned extensions

- PDF/DOCX text extraction and selectable resume variants.
- More authorized public/partner job feeds with location and remote filters, including India/Bengaluru sources where permitted.
- Better evidence-grounded JD matching and structured explanations.
- Save a verified application's confirmation and status; avoid duplicate submissions.
