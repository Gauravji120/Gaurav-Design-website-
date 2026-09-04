# Changelog

History of what was built, newest first. **Note: entries here are not currently timestamped with actual dates** — this is a known documentation gap (see `README.md`). If a real date for a past entry becomes known, add it; otherwise don't guess one. For a properly dated record specifically for production incidents, see `INCIDENT-LOG.md`. New entries added to this file going forward should include a real date if known at the time of writing.

## SEO: Unique Title + Meta Description per Public Page (2026-09-04)

Continued the SEO plan from `SEO.md` — Step 3.

**Changed**
- `order.html` — title/description now target "order custom design online" intent, mentioning posters, thumbnails, packaging, book layout, UPI payment, and order tracking
- `about.html` — title/description now target "freelance graphic designer Delhi NCR" intent, mentioning the studio, FAQs, and terms/refund policy
- `track-order.html` — title/description now target "track order status" intent
- `index.html` already had a unique title/description from an earlier session, so it was left as-is

**Deferred**
- `portfolio.html` is not yet updated — see `INCIDENT-LOG.md`'s 2026-09-04 entry for why, and `ROADMAP.md`'s Security & Performance section for the plan to shrink it first (SEO Step 6) before editing its `<head>`.

**Next up (per `SEO.md`'s priority order)**
- Canonical tags (Step 4)
- Favicon (Step 5)
- Move `portfolio.html`'s base64 images to hosted files (Step 6)
- LocalBusiness JSON-LD structured data (Step 7)
- Google Business Profile + Search Console (Steps 8–9, external, no code)

## SEO: Sitemap + Robots.txt (2026-09-03)

Started the SEO plan documented in `SEO.md`, working through it step by step.

**Added**
- `sitemap.xml` — lists all public-facing pages (home, order, portfolio, about, track-order, terms, privacy, refund) with priority weights, so Google's crawler doesn't have to guess which pages exist
- `robots.txt` — disallows crawling of account/admin pages (`admin.html`, `admin-login.html`, `account.html`, `orders.html`, `profile.html`, `settings.html`, `billing.html`, `invoice.html`, `activity.html`, `refer.html`, `call.html`, `help.html`), and points crawlers to `sitemap.xml`

## Security Fixes: RLS Gap + Missing Brute-Force Table (2026-08-31, re-verified 2026-09-02)

Triggered by a Supabase security-advisor email flagging RLS disabled on a table.

**Fixed**
- **Critical:** `reviews`, `call_requests`, `rate_limit_log`, and `order_messages` had Row Level Security fully **disabled** — any client with the project's anon key could have read/written every row directly, bypassing the Netlify Functions layer entirely. Enabled RLS on all 4 (no public policies, matching every other table — service-role-only access per the documented architecture). Only `order_messages` had real data in it (15 rows) at the time this was found; no evidence of actual exploitation, just an open door.
- **Broken since it was first documented:** `admin_login_attempts` — the table this project's `CHANGELOG.md` (see "Admin Dashboard Build" below) says was created alongside `admin-login.mts` did not actually exist in the database. `admin-login.mts` queries it for brute-force lockout (6 failed attempts / 15 min); since the table was missing, that query silently failed, the failed-attempt count always read as 0, and the lockout never triggered — admin login had **no real rate limiting** in production. Recreated the table (`username`, `success`, `created_at`, indexed) with RLS enabled.

**Also checked, found already correct**: storage bucket public/private flags, `verify_admin_login()` execute privileges (service-role only) and `search_path` pinning on all 3 Postgres functions, no hardcoded secrets in function source.

**Re-verified 2026-09-02**: ran the Supabase security advisor again from a fresh chat session after a new copy of the same Supabase advisor email arrived. The same 4 tables were found with RLS disabled again, and `admin_login_attempts` was missing again — so whatever applied the 2026-08-31 fix did not persist (or the fix was only ever documented, not actually applied to the live database, in a prior session). Re-applied the same migrations (enable RLS on all 4 tables; recreate `admin_login_attempts`) and confirmed via a follow-up advisor scan that all CRITICAL/ERROR-level findings are clear. **If this recurs a third time, investigate whether something in the deploy/migration pipeline is resetting the schema, rather than just re-applying the fix again.**

**Still open (not fixable via SQL/API — requires the Supabase Dashboard):** "Leaked password protection" (HaveIBeenPwned check) is off under Authentication settings. Low priority since client login is Google OAuth + magic link, not passwords — but worth turning on before ever adding password-based signup.

## Order Form: Draft Auto-Save

**Added**
- `order.html` now auto-saves the in-progress order (service, quantity, size, deadline, details, delivery method, coupon code) to `localStorage` as the client types, keyed per logged-in user id (`gb_order_draft_<user_id>`) so a shared browser never shows one client's draft to another
- If a saved draft is found on return to the page, a banner offers **Resume draft** (refills the form) or **Start fresh** (discards it) — a client's own explicit "Reorder" action from My Orders always takes priority over a stale draft and replaces it
- The draft is cleared automatically only after a successful order submission; if submission fails (e.g. a network error), the draft — and the form's own typed values — are deliberately left in place so nothing has to be retyped to retry
- The reference-file attachment is not covered by this (files can't be stored in `localStorage`) — a client resuming a draft will need to reattach it

**Changed**
- `loadLiveServices()` (fetches the live service list for the dropdown) is now exposed as an awaited promise (`liveServicesPromise`) so the draft-restore and reorder logic can wait for the dropdown to be populated before trying to pre-select a service by its `service_key`, instead of racing it

## Client Account System + Retention & Delivery Feature Batch

**Added**
- Supabase Auth wired in for clients — Google OAuth and passwordless email magic link (`login.html`); first login also creates the account, no separate signup step
- Account hub (`account.html`) plus `profile.html` (edit profile), `orders.html` (My Orders), `settings.html` (notification preferences, delete account), `billing.html`, `invoice.html`, `activity.html`, `refer.html`, `call.html`, `help.html`
- Orders now require a logged-in client — no more guest checkout (decision recorded earlier in ROADMAP, now shipped); enforced both by hiding the order form on the frontend and rejecting with 401 server-side in `submit-order.mts`
- Loyalty points: clients earn 1 point per ₹100 on paid orders, redeemable at checkout; balance is always recomputed server-side from real order history, never trusted from the browser (`netlify/lib/loyalty-points.mts`, `get-loyalty-points.mts`)
- Refer & Earn: every client gets a referral code derived from their user id (`GB-XXXXXXXX`); a `?ref=CODE` link captures the code before login and writes it once to `user_metadata.referred_by` after signup, never overwritten, can't credit your own code to yourself (`get-referral-stats.mts`)
- File delivery: admin uploads final design files to a new private `deliverables` storage bucket; client downloads via a 1-hour signed URL from My Orders (`admin-upload-delivery.mts`)
- Revision requests: client can request a revision on their own order (ownership verified server-side); admin can mark it handled from the dashboard, which emails the client (`request-revision.mts`, `admin-orders.mts`'s new `clear_revision` action)
- Order messaging: a per-order chat thread between client and admin, with optional file attachments, backed by a new `order_messages` table and `message-attachments` storage bucket (`order-messages.mts` for the client side, `admin-order-messages.mts` for the admin side)
- Call booking: logged-in clients can request a call from the account hub; admin views/updates requests from the dashboard, backed by a new `call_requests` table (`book-call.mts`, `admin-call-requests.mts`)
- Notification preferences: clients can choose to receive all order emails, high-priority only (delivery + payment confirmations), or none (`netlify/lib/notification-pref.mts`)
- Self-service account deletion (`delete-account.mts`) — the Supabase Auth user is removed, but past orders keep their history since `orders.user_id` is set to null rather than the order being deleted
- Admin can now manually trigger a review/referral-request email to a client after delivery, from `admin-orders.mts`
- New `orders` columns: `user_id`, `delivery_method`, `points_redeemed`, `points_discount_amount`, `revision_requested`, `revision_notes`, `revision_requested_at`, `delivery_file_path`, `delivery_file_uploaded_at`

**Changed**
- Transactional email provider switched from Resend to Brevo — every function now sends through the shared `netlify/lib/send-email.mts` helper using the `BREVO_API_KEY` environment variable; `RESEND_API_KEY` is no longer referenced anywhere in the codebase
- Status-change emails (Order Confirmed / Design in Progress / Review / Order Delivered) now respect each client's notification preference — except delivery and payment confirmations, which always send regardless of preference

**Note**
- `track-order.html` / `track-order.mts` (guest lookup by Order ID + phone) is still present and functional alongside the new My Orders flow — not yet retired, tracked as a decision to make in ROADMAP's Tech Debt section.

## Fixed: Invisible Pricing Bug (Home Page)

**Bug:** Home page pricing section appeared completely blank to the user — but the text was actually present in the DOM (selectable/copyable), just not visible. Confirmed via direct API test (`/api/site-settings` returned correct data every time) that the backend, database, and env vars were all fine — the bug was 100% client-side.

**Root cause:** The site has a scroll-reveal animation system: elements with class `reveal` start at `opacity:0` and only become visible once an `IntersectionObserver` (set up once, at page load) adds a `.show` class to them. `querySelectorAll('.reveal')` runs synchronously at load time and only captures elements that already exist in the DOM at that moment. The dynamic price cards (rendered later, after the async `/api/site-settings` fetch resolves) were created with `class="price-card reveal"` — since they didn't exist yet when the observer was set up, they were never observed, never got `.show`, and stayed permanently invisible while still being real, selectable DOM text.

**Fix:** Removed the `reveal` class from the dynamically-generated price card template in `index.html`. Dynamically-inserted content doesn't need (and shouldn't have) the load-time scroll-reveal class — only static elements present at initial page load should use it.

**Lesson for future dynamic content:** Any HTML injected via JavaScript after page load (services, social links, coupons UI, etc.) must NOT include the `reveal` class, or it will silently render invisible-but-selectable, which is a very confusing bug to diagnose from database/API checks alone since the data layer looks completely correct.

## Pause New Orders + 404 Page + Data-Loss Fix

**Added**
- `orders_paused`, `orders_paused_message` columns on `site_settings`
- Admin Dashboard: "Pause new orders" toggle + custom client-facing message (Pricing & Offers tab)
- Order page hides the form and shows the admin's message when paused; enforced again server-side in `submit-order.mts` (503 response) so it can't be bypassed by posting directly to the API
- `404.html` — branded not-found page (Netlify serves this automatically for any unmatched route)
- `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md` — full project documentation added to the repo root so any future session can read the repo and understand the project without re-explaining from scratch

**Fixed**
- **Data loss:** the 4 original core services (Poster, YouTube thumbnail, Packaging design, Book design) had disappeared from the `services` table — only the later-added "Logo Design" row remained. This is why pricing showed correctly in the Admin Dashboard (which reads whatever rows exist) but the Home page looked broken/incomplete. Re-inserted all 4 with their original prices. Cause not fully confirmed — worth keeping an eye on if it recurs.

## Rebrand + Feature Batch (site renamed "Gaurav Design" → "Going Beyond")

**Added**
- `netlify/functions/admin-services.mts` — dynamic services CRUD
- `netlify/functions/admin-social-links.mts` — dynamic social links CRUD
- `services` table, `social_links` table (Supabase)
- Quantity selector on order form; `quantity`, `unit_price`, `total_price` columns on `orders`
- `netlify/functions/get-order-total.mts` — public endpoint for the Payment page to show the exact amount due

**Changed**
- `get-site-settings.mts` now also returns `services` and `socialLinks` arrays
- Home page pricing grid and Order page service dropdown now render dynamically from the `services` table instead of 4 hardcoded options
- Footer social icons render dynamically from `social_links` (previously hardcoded Instagram/Pinterest)
- All brand text, email "from" name, and the order-number prefix (`GD-` → `GB-`) updated site-wide
- `admin.html` Pricing tab replaced with a "Services" manager (add/edit price/toggle active/remove)
- `admin.html` Payment & Social tab replaced fixed Instagram/Pinterest URL fields with an "add unlimited social link" form

**Fixed**
- Social links were briefly rendered in the hamburger menu in addition to the footer — corrected to footer-only per explicit instruction
- Leftover `GD-0001` placeholder text in 3 files after the prefix rebrand (`payment.html`, `order.html`, `track-order.html`) — corrected to `GB-`
- `RESEND_API_KEY` had been saved with the wrong casing (`resend_api_key`) directly in the Netlify dashboard at least twice, silently breaking email — re-saved with correct casing (this env var is now retired entirely — see the Client Account System batch above)
- Supabase project had auto-paused from free-tier inactivity, which looked like "nothing works" — restored via `restore_project`

## Admin Dashboard Build

**Added**
- `admin-login.html`, `admin.html` (full dashboard: Orders, Pricing, Coupons, Payment & Social tabs, Overview stats)
- `netlify/functions/admin-login.mts` — rate-limited login, signed session tokens
- `netlify/functions/admin-orders.mts`, `admin-settings.mts`, `admin-coupons.mts`, `admin-upload-qr.mts`, `admin-send-email.mts`
- `netlify/lib/verify-session.mts` — shared token verification
- `admin_login_attempts` table, `verify_admin_login()` Postgres function (bcrypt via pgcrypto, security definer)
- Signed URLs for viewing private reference-file uploads from the dashboard

**Fixed**
- `verify_admin_login()` was initially callable by `anon`/`authenticated` roles (password-guessing risk) — execute privilege revoked, service-role only
- `qr-codes` storage bucket had an unnecessarily broad public SELECT policy — removed (public buckets serve files via their public URL without needing one)
- Two Postgres functions had a mutable `search_path` (security advisor warning) — pinned explicitly

## Coupon + Payment/Order-Total Batch

**Added**
- `coupons` table wiring: `netlify/functions/validate-coupon.mts`, coupon field + live discount preview on order form, discount snapshotted onto the order
- `netlify/functions/get-order-total.mts`, Payment page now shows the exact amount to pay

## Core Backend Build

**Added**
- Supabase project, 5 initial tables (`orders`, `coupons`, `site_settings`, `admin_users`, `email_log`), 2 storage buckets
- `netlify/functions/submit-order.mts` (replacing an earlier broken Netlify-Forms + client-side-Supabase-insert hybrid that couldn't work under RLS)
- `netlify/functions/track-order.mts` — real order lookup requiring order number + matching phone
- Resend integration for order-received / new-order-alert emails
- `netlify.toml` added after discovering plain drag-and-drop deploys don't bundle Netlify Functions at all — functions only deploy correctly via a build-based path (Netlify CLI or, as used here, GitHub-linked continuous deployment)

## Frontend Build (pre-backend)

**Added**
- `index.html`, `about.html`, `order.html` (initially Netlify-Forms only, no DB), `portfolio.html` (48 real client-provided images, base64-embedded after discovering the artifact preview panel can't resolve external relative asset paths), `track-order.html` (placeholder)
- Consistent "paper/carbon-red/mustard" design system across all pages
