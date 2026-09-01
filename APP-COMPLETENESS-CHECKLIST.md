# App Completeness Checklist — What's Missing

> This file tracks the things a production app needs *besides* its main features — the boring-but-critical states and safety nets that get skipped when building fast. This is a planning document only — nothing in this file has been implemented in code yet. Cross-reference `ROADMAP.md` for feature-level gaps (new services, payment gateways, etc.) — this file is specifically about *reliability and user-experience states*, not new functionality.

**Why this matters:** a site can have every feature "done" and still feel broken to a real user if it doesn't handle the moment something goes wrong, loads slowly, or is empty. These are the gaps found when checking Going Beyond against a standard pre-launch completeness list.

---

## 🔴 Missing — Should Be Built

### 1. Admin password reset flow
**Problem:** there is currently no way to reset the admin password except editing the database directly. If the admin ever forgets the password or it needs to be rotated after a suspected leak, there's no self-service path.
**To build:** a simple "forgot password" flow for the single admin account — e.g. a Netlify Function that emails a one-time reset link (using the existing Brevo integration) to the fixed `ADMIN_NOTIFY_EMAIL`, which lets the admin set a new password (re-hashed via the existing `pgcrypto`/bcrypt setup). Doesn't need to be elaborate — this is a single-admin system, not a multi-user one.

### 2. Empty states
**Problem:** unconfirmed what a client sees when a list is genuinely empty — e.g. My Orders with zero orders yet, Activity log with no activity, Billing with no invoices. If nothing was designed for this, the page likely just renders blank, which looks broken rather than "you have nothing here yet."
**To build:** a friendly empty-state message + relevant call-to-action for each list-type page:
- My Orders (empty) → "You haven't placed an order yet" + a button to Order Now
- Activity (empty) → "No activity yet"
- Billing/Invoices (empty) → "No invoices yet — they'll appear here once you place a paid order"
- Call requests, referral list, order messages (empty thread) → similar short, friendly messages

### 3. Loading states
**Problem:** pages that fetch data (My Orders, Account hub stats, Admin Dashboard tabs) likely show a blank or jumping layout while the fetch is in flight, since this is already flagged as "skeleton loading states — planned" in `ROADMAP.md`.
**To build:** a lightweight loading indicator (a simple CSS skeleton block or a small spinner is enough — no need for a fancy library) shown while each page's data fetch is pending, so the user sees something is happening instead of a flash of empty content.

### 4. Error states
**Problem:** unconfirmed what happens when something fails — an order submission fails, a file upload times out, the network drops mid-request. If nothing was explicitly built for this, the user might see nothing happen at all (silent failure) or a raw, confusing browser error.
**To build:** a consistent pattern for surfacing failure clearly, in plain language, on every form/action that hits the backend:
- Order form submit fails → visible message near the submit button ("Something went wrong — please try again" or the specific reason if known, e.g. "orders are currently paused")
- File upload fails → clear retry option, not a silent drop
- Login fails (magic link / OAuth) → clear message, not just a stuck spinner
- Every fetch call across the site should have a `.catch()` that shows *something* to the user, not just a `console.error`

### 5. Network / offline states
**Problem:** no specific handling exists for the case where the user's internet drops while using the site (common on mobile). A static site with fetch calls will typically just fail silently or hang if this isn't accounted for.
**To build:** nothing elaborate needed — at minimum, wrap fetch calls so a network failure (as opposed to a server error) shows a distinct message like "You appear to be offline — check your connection and try again," so it's not confused with a real server-side error.

### 6. Analytics
**Problem:** zero visitor/behavior tracking exists (already listed as ⏳ in `ROADMAP.md` and `PRD.md` §9). Without this, there's no way to know how many people visit, where they drop off (e.g. start an order but don't finish), or which pages/services get the most interest.
**To build:** add a privacy-respecting analytics tool (Google Analytics 4, or a lighter-weight alternative like Plausible/Umami) as a small script snippet — this also directly supports the SEO monitoring plan already written up in `SEO.md` §6.

### 7. Crash / error reporting
**Problem:** no automated way to find out when something breaks in production. Right now, a bug is only discovered if a client happens to report it or the admin happens to notice — there's no visibility into frontend JavaScript errors or backend function failures as they happen.
**To build:** add a lightweight error-tracking tool (e.g. Sentry has a free tier suitable for a small project) to both the frontend pages and the Netlify Functions, so errors are captured automatically with enough detail to debug, instead of relying on a client to describe what went wrong. Pair this with `INCIDENT-LOG.md` — a caught production error is exactly the kind of thing that should get logged there once diagnosed.

### 8. Onboarding
**Problem:** after a client's first login, they're dropped straight into the account hub with no guidance on what they can actually do there (place an order, check status, redeem points, refer a friend, etc.).
**To build:** doesn't need to be a multi-step tutorial — even a simple one-time welcome message or a short "here's what you can do" panel shown only on a client's very first visit to `account.html` would close most of this gap.

---

## 🟡 Partially Done — Needs Finishing

### 9. Accessibility
**Current state:** only a dark/light theme toggle exists; a full contrast/keyboard-navigation/screen-reader pass is already tracked as ⏳ in `ROADMAP.md`'s Design & UX Polish section.
**To build:** a proper accessibility pass — sufficient color contrast (especially the carbon-red accent on the paper background), visible keyboard focus states on every interactive element, meaningful `alt` text on all images (this also overlaps with the SEO plan in `SEO.md` §3.2), and proper form label associations.

---

## ✅ Already Covered (confirmed, no action needed)

These items from the same checklist are already handled and don't need rework:

- **Sign up and log in** — Google OAuth + passwordless email magic link
- **Email verification** — handled automatically by the magic-link flow itself
- **Account deletion** — self-service, already shipped
- **User permissions** — clear two-tier client/admin separation
- **Data persistence** — Supabase Postgres, fully RLS-locked
- **Notifications** — email notifications exist with a client-controlled preference setting
- **Privacy setup** — `privacy.html` already exists
- **Responsiveness** — site is already mobile-responsive
- **User flows** — client and admin journeys are already well-mapped in `PRD.md`

**Not applicable / already effectively handled:**
- **Password reset (client-side)** — not applicable; the client auth system is passwordless by design, so there's no client password to reset.
- **Beta testers** — the site is already live with real clients, so this pre-launch stage has effectively passed; ongoing client feedback going forward serves the same purpose.
- **Payment flow** — tracked separately in `ROADMAP.md` (UPI integration) — intentionally on hold per current project priority, not part of this checklist's scope.

---

## Suggested Build Order

Not all 8 missing items are equally urgent. A reasonable order, cheapest/highest-impact first:

1. **Error states** + **empty states** — cheapest to build (no new tools/services needed), and the most directly visible to every client using the site today.
2. **Loading states** — same category, quick visual win.
3. **Admin password reset** — low effort, closes a real operational risk (being locked out of the admin dashboard).
4. **Onboarding** — small addition, improves first impressions for new clients.
5. **Analytics** — needs an external tool account (GA4/Plausible) but no code complexity.
6. **Crash/error reporting** — needs an external tool account (Sentry or similar) — more valuable once the site has more real traffic to monitor.
7. **Network/offline states** — lowest urgency; nice-to-have polish once the above are done.
8. **Accessibility pass** — ongoing effort, can be tackled incrementally page by page.

---

**Reminder for whoever implements this next:** this file is planning only — no code has been changed. Pick one item, implement it fully (including testing it per `TESTING.md`'s cross-cutting checks), log it in `CHANGELOG.md`, and check it off here before moving to the next.
