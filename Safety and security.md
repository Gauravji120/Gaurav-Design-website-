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

### 3.1 Admin session token storage — planned fix (not yet done)

**Current state (found in site scan):** after a successful admin login, `admin-login.html` stores the HMAC session token and its expiry directly in `localStorage` (`gd_admin_token`, `gd_admin_token_exp`), and `admin.html` reads it back from there on every page load.

**Why this needs to change:** anything in `localStorage` is readable by any JavaScript running on the page. If this site (or any script it loads — a font, an analytics snippet, a compromised npm/CDN dependency) is ever hit by a Cross-Site Scripting (XSS) bug, an attacker's script can read `localStorage.getItem('gd_admin_token')` in one line and steal the admin session outright — no password needed. OWASP's Authentication Cheat Sheet and HTML5 Security Cheat Sheet both call out `localStorage` as unsuitable for auth tokens for exactly this reason. Industry consensus in 2026 (OWASP, Auth0, Supabase, and others) is: **tokens the browser must send back to the server belong in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie**, not in `localStorage`, because `HttpOnly` cookies simply cannot be read by JavaScript — an XSS payload finds nothing to steal.

**Planned fix:**
1. Change `admin-login.mts` to respond with `Set-Cookie: admin_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<seconds>` instead of returning the token in the JSON body for `localStorage` to store.
2. Remove the `localStorage.setItem('gd_admin_token', ...)` / `gd_admin_token_exp` lines from `admin-login.html`.
3. Update every admin-only Netlify Function to read the session token from the incoming `Cookie` header instead of an `Authorization: Bearer` header sent from `localStorage`.
4. Because the cookie will be sent automatically on every request to the same origin, add basic CSRF protection for any admin function that changes data (e.g. a custom `X-Requested-With` header check, or a double-submit CSRF token) — `SameSite=Lax` already blocks most cross-site POSTs, but defense-in-depth is cheap here.
5. Update `ARCHITECTURE.md`'s auth section once implemented, and log the change in `CHANGELOG.md`.

This is tracked as a checklist item in `ROADMAP.md` under "Security & Performance — Found in Site Scan."

## 4. Data Trust Boundaries

- Price, discount percentage, and loyalty-point redemption are never trusted from the browser — always recomputed/re-validated server-side against the live `services`/`coupons` tables and the client's real point balance.
- Order ownership is verified server-side before returning or modifying any order-related data (messages, revisions, delivery files, invoices).
- Track Order (guest lookup) requires two matching pieces of information (order number + phone) — never allow lookup by a single guessable ID.
- Treat every Netlify Function as an independent, untrusted entry point: validate all incoming input at the top of each function, regardless of what the frontend is supposed to have already checked.

## 5. File Uploads & Storage

- Reference files, delivered final files, and message attachments stay in **private** buckets only — never public URLs. Access is granted exclusively via short-lived signed URLs (currently 1-hour expiry).
- Restrict uploads to expected file types/extensions at the function level before writing to storage, to reduce the risk of malicious file uploads.
- Re-validate file size limits server-side, not just in the frontend `<input>` element.
- **Portfolio images should not be inline base64** (see `portfolio.html`, currently ~4.9 MB as a single file). Base64-encoding inflates file size by roughly a third and defeats browser image caching entirely — every visit re-downloads the whole page. Move portfolio images to a public Supabase Storage bucket (or another CDN/host) and reference them with normal `<img src="https://...">` URLs, so the browser can cache and lazy-load them individually.

## 6. Netlify / Infrastructure

- Runtime secrets belong in Netlify Functions environment variables — never baked in at build time, where they could end up in a client-visible bundle.
- **Add security response headers — planned, not yet implemented.** Netlify does not add any application-level security headers (CSP, X-Frame-Options, HSTS, etc.) by default; without them, this site currently has no defense-in-depth against clickjacking or XSS-driven resource loading. Add a `_headers` file (in the site's publish/root directory, alongside the HTML files) with the following starting policy once the production domain is finalized:
  ```
  /*
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co; form-action 'self'; base-uri 'self'; frame-ancestors 'none'
  ```
  Notes on this starter policy:
  - `style-src` needs `'unsafe-inline'` for now because every page's CSS is written inline in a `<style>` block rather than a separate file — tightening this later would mean moving CSS to external files or adding per-page hashes/nonces.
  - `connect-src` must allow `https://*.supabase.co` for the client-side Supabase Auth calls (OAuth, magic link) to keep working.
  - `Permissions-Policy: payment=(self)` keeps the Payment Request API available for this origin only (relevant once real UPI/payment integration is deeper), while blocking camera/mic/geolocation entirely since the site doesn't use them.
  - Start with `Content-Security-Policy-Report-Only` instead of the enforcing header for the first deploy or two, to catch anything the policy accidentally blocks before it's enforced for real. Netlify supports this header the same way.
  - Test after deploying with browser DevTools (Network tab → response headers) or a header-checking tool, since `_headers` file formatting is whitespace-sensitive.
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
