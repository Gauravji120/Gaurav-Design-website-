# Changelog

Dated history of what was built. Newest first.

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
- `RESEND_API_KEY` had been saved with the wrong casing (`resend_api_key`) directly in the Netlify dashboard at least twice, silently breaking email — re-saved with correct casing
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
