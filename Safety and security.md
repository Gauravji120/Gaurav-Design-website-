# Safety and Security

> Living security checklist for the **Going Beyond** platform. Cross-reference with `ARCHITECTURE.md` (current implementation) and `ROADMAP.md` (build status). Update this file whenever a new security practice is adopted or a gap is closed.

---

## 1. Secrets & Environment Variables

- All secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `ADMIN_SESSION_SECRET`, `ADMIN_NOTIFY_EMAIL`) live **only** in Netlify's Environment Variables UI — never in `.env` files, `netlify.toml`, or committed anywhere in this repo.
- Environment variable names are case-sensitive — a wrong-case variant (e.g. `resend_api_key` instead of `RESEND_API_KEY`) will silently break functionality with no obvious error. Double-check exact casing after every save.
- Generate a unique secret per site/project; avoid reusing the same secret value across unrelated projects.
- Scope environment variables narrowly (functions-only where possible) rather than exposing them to the entire build/runtime.
- Rotate secrets periodically and immediately after any suspected leak.
- Never log secret values, even in error messages or debug output.

## 2. Row Level Security (RLS) — Supabase

- RLS must be enabled on **every** table in the `public` schema, with **zero public policies**. Only `service_role` (used exclusively inside Netlify Functions) may read/write data tables.
- After creating any new table, verify RLS is actually on:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
  ```
- A table with RLS enabled but no policies blocks all access except `service_role` — this is the safe default, not a bug.
- Audit RLS status after every schema change (new table, new column, new migration). The most common real-world failure mode is: a new table gets added during a feature push, RLS is never turned on, and the entire table becomes queryable via the anon key.
- Supabase Storage buckets have their own RLS policies, separate from database tables — verify bucket policies whenever a new bucket is added (reference-files, deliverables, message-attachments should stay private; qr-codes stays public by design).

## 3. Authentication

- Two separate, non-interchangeable auth systems exist (admin vs. client) — never mix an admin session token with a client Supabase access token when debugging or writing new code.
- Every backend function that needs to trust a client's identity must independently verify the `Authorization: Bearer <access_token>` header against Supabase Auth server-side — never trust a user id sent as a form field or JSON body value.
- Admin password is never compared in application code — only inside the Postgres `security definer` function `verify_admin_login()`, whose `EXECUTE` privilege is revoked from `anon`/`authenticated` roles.
- Configure Supabase Auth rate limits under Authentication → Rate Limits: a sensible starting point is 5 sign-ups/hour/IP and 10 sign-in attempts/hour/IP, adjusted as real usage patterns emerge.
- Admin login already has brute-force lockout (6 failed attempts per username within 15 minutes) — keep this enforced server-side, not just in the UI.

## 4. Data Trust Boundaries

- Price, discount percentage, and loyalty-point redemption are never trusted from the browser — always recomputed/re-validated server-side against the live `services`/`coupons` tables and the client's real point balance.
- Order ownership is verified server-side before returning or modifying any order-related data (messages, revisions, delivery files, invoices).
- Track Order (guest lookup) requires two matching pieces of information (order number + phone) — never allow lookup by a single guessable ID.
- Treat every Netlify Function as an independent, untrusted entry point: validate all incoming input at the top of each function, regardless of what the frontend is supposed to have already checked.

## 5. File Uploads & Storage

- Reference files, delivered final files, and message attachments stay in **private** buckets only — never public URLs. Access is granted exclusively via short-lived signed URLs (currently 1-hour expiry).
- Restrict uploads to expected file types/extensions at the function level before writing to storage, to reduce the risk of malicious file uploads.
- Re-validate file size limits server-side, not just in the frontend `<input>` element.

## 6. Netlify / Infrastructure

- Runtime secrets belong in Netlify Functions environment variables — never baked in at build time, where they could end up in a client-visible bundle.
- Add a `_headers` file with baseline security headers (CSP, X-Frame-Options, HSTS) once the domain and asset sources are finalized.
- If deploy previews are ever enabled, password-protect them — preview URLs can otherwise expose unreleased features publicly.
- Be aware of the Netlify free-tier monthly function/build credit cap; batch changes before pushing to `main` where practical, since every push triggers an auto-deploy.
- Supabase free-tier auto-pauses the database after ~7 days of inactivity — check project status first if something suddenly "stops working."

## 7. Email

- All transactional email goes through the shared Brevo helper — never construct ad-hoc email-sending code that bypasses the shared `send-email` lib, to keep sender reputation and error handling consistent.
- A failed or delayed email must never block an order or account action from completing — email sending stays best-effort, after the core database action has already succeeded.
- Log every sent email (recipient, type, status) to the `email_log` table for auditability.

## 8. Logging & Auditing

- Keep the `email_log` and `admin_login_attempts` tables as the audit trail for email activity and admin login attempts respectively.
- Consider extending audit logging to cover admin actions that change money-related data (price/coupon edits, manual "Paid" status changes) — who did it and when.
- Don't rely on application-level logs alone for anything security-relevant; database-level records (like the tables above) catch issues application logs might miss.

## 9. Ongoing Practice

- Security is not a one-time setup — re-run the RLS check and review this file after every schema change or new feature that touches data access.
- Before merging or pushing any change that adds a new table, storage bucket, or function, confirm: RLS is on, the function verifies identity/ownership where needed, and no secret or credential is hardcoded anywhere in the diff.
- If a security-relevant bug is found and fixed, add a short entry to `CHANGELOG.md` describing the root cause — this has already proven useful for this project (see the admin RLS and QR-bucket fixes documented there).

---

**This file intentionally contains no actual keys, tokens, passwords, or environment variable values — only practices and checks. All real secrets stay exclusively in Netlify's Environment Variables UI.**
