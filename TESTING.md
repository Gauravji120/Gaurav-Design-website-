# Testing

> Manual test checklist for this project. There is no automated test suite and no staging environment (see `README.md` — Known Operational Gotchas, and `PRD.md` §7 Constraints) — changes are verified directly against the live Supabase project and deployed via GitHub → Netlify. This file exists so nothing critical gets skipped when testing a change by hand.

---

## Before Testing Anything

- Confirm the Supabase project isn't paused (free tier auto-pauses after ~7 days idle — see `README.md`).
- Know which environment variables the change touches, and confirm they're set correctly in Netlify (see `ENVIRONMENT-VARIABLES.md`).
- Prefer testing on a fresh incognito/private browser window for anything touching login state, so cached sessions don't hide a bug.

## Critical Flows to Re-Test After Any Change That Touches Them

Test the specific flow your change affects, but if the change touches shared code (a lib helper, auth, or a page's shared header/footer), re-check the flows below that could be affected.

### Client Auth
- [ ] Sign up / log in via Google OAuth
- [ ] Sign up / log in via passwordless email magic link
- [ ] First-time login actually creates the account (no separate signup step)
- [ ] Logged-out user is redirected away from pages that require login (e.g. `order.html`)
- [ ] Session persists across a page refresh
- [ ] Log out actually clears the session

### Ordering & Payment
- [ ] Order form only appears when logged in
- [ ] Selecting a service shows the correct live price (from the `services` table, not a hardcoded value)
- [ ] Coupon code applies the correct discount and re-validates server-side (try an expired/invalid code too)
- [ ] Loyalty points redemption is capped at the real balance and at the order total
- [ ] Quantity selector updates the total price correctly
- [ ] Reference file upload succeeds and is retrievable later from the Admin Dashboard
- [ ] Order confirmation email arrives (client) and alert email arrives (admin)
- [ ] Payment page shows the exact order total
- [ ] "Pause new orders" toggle actually hides the form and blocks direct API submission (503)

### My Orders / Order Lifecycle
- [ ] Client sees only their own orders, never someone else's
- [ ] Order status updates (Order Placed → Confirmed → Design in Progress → Review → Delivered) trigger the correct client email
- [ ] Delivered file downloads via the signed URL and the link actually works
- [ ] Revision request saves notes and notifies admin; "clear revision" on the admin side notifies the client
- [ ] Order messaging (both client → admin and admin → client) delivers messages and attachments correctly
- [ ] Guest Track Order lookup requires both order number and matching phone (test with a wrong phone to confirm it's rejected)

### Account
- [ ] Profile edits save correctly
- [ ] Notification preference (all / high-priority / none) is respected by status emails (delivery and payment confirmations should always send regardless of preference)
- [ ] Self-service account deletion removes the Supabase Auth user but the order's history (with `user_id` set to null) is preserved
- [ ] Loyalty points balance displayed matches what's actually redeemable
- [ ] Referral code and referral count display correctly; using someone else's `?ref=` link doesn't let a user credit their own code to themselves

### Admin Dashboard
- [ ] Admin login rate limiting locks out after repeated failed attempts (6 within 15 minutes)
- [ ] Orders tab: search, status/payment updates, reference file viewing via signed URL
- [ ] Services CRUD reflects immediately on the Home page pricing and Order dropdown
- [ ] Coupons CRUD works (create, expiry, usage limit enforcement)
- [ ] Social links CRUD renders correctly in the footer only (not the hamburger menu)
- [ ] Call requests list/status update works
- [ ] Delivery file upload links correctly to the order and notifies the client

## Cross-Cutting Checks (Run Regardless of What Changed)

- [ ] Dark/light theme toggle works and persists (`localStorage`) on the page(s) you touched
- [ ] Page still works on mobile viewport widths — nav, forms, and buttons are usable
- [ ] No console errors on page load
- [ ] Page title and meta description are accurate (standing SEO rule from `ROADMAP.md`)
- [ ] A failed/delayed email never blocks the core action from completing (per the reliability rule in `PRD.md` §6)

## After Testing

- If a bug is found and fixed, add an entry to `CHANGELOG.md` and, if it was a real production issue, to `INCIDENT-LOG.md` with the root cause.
- Confirm the Netlify deploy after pushing actually picked up the expected number of functions (a known past failure mode — see `CHANGELOG.md`'s Core Backend Build entry).
