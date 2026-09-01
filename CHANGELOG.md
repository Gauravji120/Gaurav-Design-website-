# Changelog

History of what was built, newest first. **Note: entries here are not currently timestamped with actual dates** — this is a known documentation gap (see `README.md`). If a real date for a past entry becomes known, add it; otherwise don't guess one. For a properly dated record specifically for production incidents, see `INCIDENT-LOG.md`. New entries added to this file going forward should include a real date if known at the time of writing.

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
