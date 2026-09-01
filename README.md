# Going Beyond — Freelance Design Order Platform

**Live site:** https://goingbeyond.netlify.app
**Owner:** Gaurav Adhikari (DTP Operator & Graphic Designer, Delhi NCR)
**Netlify site ID:** `3b262685-9fae-44ff-a2ef-156c89b12de7`
**Supabase project ID:** `ysujkmmwwknjraofcixr`

> 📌 **For Claude / any assistant reading this in a new chat:** This file + `ARCHITECTURE.md` + `ROADMAP.md` + `CHANGELOG.md` together explain the entire project. Read all four before making changes. This repo is the single source of truth — the working local sandbox gets wiped between sessions, so always pull from here first.

---

## What This Is

A full order-management website for a solo freelance graphic designer, with a client account system layered on top. Clients create an account (Google OAuth or passwordless email link), browse services, place an order, pay via UPI, and track everything from a personal account hub — order history, file downloads, revision requests, messaging with the designer, loyalty points, and referrals. Placing an order requires being logged in (no guest checkout). The owner manages everything (orders, pricing, coupons, social links, call requests, deliveries) from a password-protected Admin Dashboard — no code changes needed for day-to-day business operations.

## Tech Stack

- **Frontend:** Plain HTML + CSS + vanilla JavaScript. No framework. Each page is a single self-contained `.html` file (styles and scripts inline).
- **Backend:** Netlify Functions (`.mts`, TypeScript, Deno runtime, standard Fetch API `Request`/`Response`).
- **Database + Storage:** Supabase (Postgres).
- **Client Auth:** Supabase Auth — Google OAuth and passwordless email magic link (OTP). Live and in use (see `ARCHITECTURE.md` for how this differs from the separate admin login system).
- **Email:** Brevo API (switched from Resend — see `CHANGELOG.md`).
- **Hosting:** Netlify, auto-deploys from this repo's `main` branch (GitHub → Netlify continuous deployment).

## Design System

- Colors: paper background `#EFEDE2`, ink `#1F2A38`, carbon red `#B23A2E` (accent/CTA), mustard `#C9922A`, ledger green `#4C6B54` (success).
- Fonts: `Work Sans` (body), `JetBrains Mono` (labels/prices/mono accents).
- Same header/footer pattern on every page: sticky nav with "← Back to home", hamburger menu, dark/light toggle (localStorage), footer with social links + WhatsApp float button.

## Repo Structure

```
/                           → all frontend pages (flat, not in a subfolder)
  index.html                → Home
  about.html                → About + FAQ + Refund/Terms
  order.html                → Order form (coupon, quantity, dynamic services) — requires login
  portfolio.html             → Portfolio gallery (images embedded as base64)
  track-order.html          → Guest order lookup (Order ID + phone) — still present alongside My Orders, not yet retired (see ROADMAP)
  payment.html               → UPI QR/ID display
  login.html                → Client login/signup (Google OAuth or email magic link)
  account.html               → Client account hub — links to Profile, Orders, Settings, Billing, Activity, Refer & Earn, Help, Book a Call
  profile.html                → Edit client name/contact/preferences
  orders.html                  → My Orders — order history, file downloads, revision requests, per-order messaging with the designer
  settings.html                 → Notification preferences, self-service account deletion
  billing.html                   → Billing & invoice list
  invoice.html                    → Single invoice view
  activity.html                    → Client activity log
  refer.html                        → Refer & Earn — client's referral code and referral count
  call.html                          → Book a call with the designer
  help.html                          → Help & support
  admin-login.html          → Admin login (no public nav link to this page)
  admin.html                → Admin Dashboard (tabs: Orders, Pricing, Coupons, Payment & Social, Call Requests, and per-order messaging/delivery upload)
  netlify.toml               → tells Netlify where functions live
/netlify/functions/*.mts    → all backend endpoints (see ARCHITECTURE.md)
/netlify/lib/*.mts          → shared helpers — session verification, Brevo email sending, loyalty point calculation, notification preference lookup
```

## Where To Look Next

- **`ARCHITECTURE.md`** — database schema, every backend function, environment variables, security model.
- **`ROADMAP.md`** — what's built vs. what's still planned, with priority.
- **`CHANGELOG.md`** — history of what changed (entries are not currently dated — see note in that file).
- **`API-ENDPOINTS.md`** — list of backend endpoints and what each does.
- **`TESTING.md`** — manual testing checklist (no automated tests exist yet); also points to `INCIDENT-LOG.md` for post-incident write-ups.
- **`INCIDENT-LOG.md`** — dated record of production incidents and their root causes.
- **`ENVIRONMENT-VARIABLES.md`** — required env vars and naming gotchas.
- **`AI-CODING-GUIDELINES.md`** — house rules for AI-assisted changes to this codebase.
- **`Safety and security.md`** — security checklist and what's still outstanding (e.g. `_headers` file, admin audit logging).

## Known Operational Gotchas (Read Before Debugging)

1. **Supabase free-tier auto-pauses the database after ~7 days of inactivity.** If nothing is working, check project status first — it may just need `restore_project`.
2. **Netlify free plan has a monthly credit limit.** Every push to `main` triggers an auto-deploy, which spends credits. Batch changes before pushing when possible, or disable auto-publishing and trigger deploys manually.
3. **Environment variable names are case-sensitive.** `BREVO_API_KEY` must be exactly that — a wrong-case variant will silently break email sending with no obvious error. (This project switched from Resend to Brevo — `RESEND_API_KEY` is no longer used anywhere in the codebase.)
4. This repo's working copy is periodically re-fetched from GitHub because the assistant's local sandbox resets between sessions — **GitHub `main` is the real source of truth**, not any local copy.
5. **Two separate auth systems exist and are not interchangeable:** the admin login (custom HMAC-signed session token) and the client login (real Supabase Auth). Don't confuse an admin session token with a client Supabase access token when debugging.
