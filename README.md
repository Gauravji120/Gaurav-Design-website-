# Going Beyond — Freelance Design Order Platform

**Live site:** https://goingbeyond.netlify.app
**Owner:** Gaurav Adhikari (DTP Operator & Graphic Designer, Delhi NCR)
**Netlify site ID:** `3b262685-9fae-44ff-a2ef-156c89b12de7`
**Supabase project ID:** `ysujkmmwwknjraofcixr`

> 📌 **For Claude / any assistant reading this in a new chat:** This file + `ARCHITECTURE.md` + `ROADMAP.md` + `CHANGELOG.md` together explain the entire project. Read all four before making changes. This repo is the single source of truth — the working local sandbox gets wiped between sessions, so always pull from here first.

---

## What This Is

A full order-management website for a solo freelance graphic designer. Clients browse services, place an order, pay via UPI, and track status. The owner manages everything (orders, pricing, coupons, social links) from a password-protected Admin Dashboard — no code changes needed for day-to-day business operations.

## Tech Stack

- **Frontend:** Plain HTML + CSS + vanilla JavaScript. No framework. Each page is a single self-contained `.html` file (styles and scripts inline).
- **Backend:** Netlify Functions (`.mts`, TypeScript, Deno runtime, standard Fetch API `Request`/`Response`).
- **Database + Storage + Auth (planned):** Supabase (Postgres).
- **Email:** Resend API.
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
  order.html                → Order form (coupon, quantity, dynamic services)
  portfolio.html             → Portfolio gallery (images embedded as base64)
  track-order.html          → Order ID + phone lookup
  payment.html               → UPI QR/ID display
  admin-login.html          → Admin login (no public nav link to this page)
  admin.html                → Admin Dashboard (tabs: Orders, Pricing, Coupons, Payment & Social)
  netlify.toml               → tells Netlify where functions live
/netlify/functions/*.mts    → all backend endpoints (see ARCHITECTURE.md)
/netlify/lib/verify-session.mts → shared session-token verification helper
```

## Where To Look Next

- **`ARCHITECTURE.md`** — database schema, every backend function, environment variables, security model.
- **`ROADMAP.md`** — what's built vs. what's still planned, with priority.
- **`CHANGELOG.md`** — dated history of what changed.

## Known Operational Gotchas (Read Before Debugging)

1. **Supabase free-tier auto-pauses the database after ~7 days of inactivity.** If nothing is working, check project status first — it may just need `restore_project`.
2. **Netlify free plan has a monthly credit limit.** Every push to `main` triggers an auto-deploy, which spends credits. Batch changes before pushing when possible, or disable auto-publishing and trigger deploys manually.
3. **Environment variable names are case-sensitive.** `RESEND_API_KEY` must be exactly that — a lowercase `resend_api_key` will silently break email sending with no obvious error.
4. This repo's working copy is periodically re-fetched from GitHub because the assistant's local sandbox resets between sessions — **GitHub `main` is the real source of truth**, not any local copy.
