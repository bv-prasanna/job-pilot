# Quick Apply by Email

Use **Quick Apply by Email** from the sidebar to respond to a recruiter's public job posting.

1. Paste the recruiter email and role. Optionally enter company and JD.
2. Save your real experience in **Resume & profile**. Only matching evidence from that profile is used when the JD is provided.
3. Upload the actual PDF, DOC or DOCX resume file. Profile text is NOT the attachment.
4. Generate and review the email. Edit its subject and message if necessary.
5. Select **Approve and send with Gmail**, confirm the recipient and file, and authorize the sending Gmail account.
6. Look for the sent email in Gmail's Sent folder. The UI shows Gmail's message ID after successful API submission.

With no JD, JobPilot prepares a professional generic email for the specified role. The optional score reflects keyword overlap, **not an official ATS score**. Emails are never automatically sent without user approval. No Gmail access token is persisted in local storage.

## Configure Google OAuth

1. Go to Google Cloud Console, select or create a project, and enable the **Gmail API**.
2. Configure Google Auth Platform consent, including the `https://www.googleapis.com/auth/gmail.send` scope. In Testing mode, include the sending Gmail account as a test user. Google's policies and verification requirements apply to public use.
3. Create an OAuth **Web application** client and register the exact deployed JobPilot HTTPS origin, such as `https://jobs.bvprasanna.com`, under **Authorized JavaScript origins**. For local use, optionally add `http://localhost:5173`.
4. Set `VITE_GOOGLE_CLIENT_ID` to that OAuth client ID in the frontend build environment and rebuild/redeploy.
5. Authorize your Gmail account when the UI requests it. Confirm recipient and attachment on each send.

Only the browser-safe OAuth **client ID** should be in frontend build variables. Never put Google client secrets, Gmail passwords, or refresh tokens into React code.

This uses Google Identity Services popup authorization and the Gmail REST API. The existing server-side Gmail helpers are not the same as a fully configured OAuth session service; the Quick Apply frontend does not require those server helpers.

## Release checks still required

- Run `npm install --no-audit --no-fund && npm run check` locally (GitHub Actions remains manual-only).
- Test valid and invalid recruiter addresses, missing JD, JD with zero overlap, large or unsupported resume, cancellation, expired permissions, Gmail 401/403 and provider outages.
- Verify MIME attachments open correctly in a real received test email.
- Confirm the chosen account, message contents and attachment before real applications are sent.
- Add application tracking only after successful Gmail acknowledgement if automatic tracking is introduced.
- A public hosted app requires a security review. Saved profile/JD data are currently browser-local, not secured by backend user accounts.

No use of paid LLM APIs is required for current template/keyword personalization. Google OAuth and any Gmail quota/policy limits are independent of JobPilot.
