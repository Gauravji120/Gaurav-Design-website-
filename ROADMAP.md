# Roadmap

> Status tracker. Update this file whenever a feature ships or a new one is requested. This is the checklist a new chat session should read to know exactly what's built and what isn't.

## ✅ Shipped

- [x] Home, About & FAQ, Portfolio, Order, Payment, Track Order pages
- [x] Admin Login + Admin Dashboard (Orders / Pricing & Offers / Coupons / Payment & Social / Call Requests tabs, plus per-order messaging and delivery upload)
- [x] Database (11 tables: orders, coupons, services, social_links, site_settings, admin_users, admin_login_attempts, email_log, call_requests, order_messages, plus auth.users via Supabase Auth) + 4 storage buckets, all RLS-locked
- [x] Order submit → save → confirmation email (client) + alert email (owner)
- [x] Coupon system — apply on order form, server-side re-validation, snapshotted on the order
- [x] Quantity selector + server-computed total price (order form, success screen, payment page)
- [x] Dynamic Services — admin adds/edits/removes services from the dashboard; Home page pricing and Order dropdown both read live from the `services` table
- [x] Dynamic Social Links — admin adds/removes unlimited platforms; renders in the **footer only**
- [x] Rebrand: "Gaurav Design" → "Going Beyond" across all pages, emails, order-ID prefix (`GD-` → `GB-`)
- [x] Reference-file viewing in Admin Dashboard via signed URLs
- [x] "Pause new orders" switch — admin toggle + custom message; enforced both in the UI (order form hidden) and server-side (submit-order.mts rejects with 503 even if someone bypasses the frontend)
- [x] Branded 404 error page
- [x] Fixed critical bug: Home page pricing was invisible (opacity:0 from scroll-reveal animation never triggering on dynamically-inserted cards) — see CHANGELOG for full root cause
- [x] **Client Account System** — Supabase Auth (Google OAuth + passwordless email magic link), `login.html`, account hub (`account.html`) with Profile / My Orders / Settings / Billing / Activity / Refer & Earn / Help / Book a Call, order placement now requires login (no guest checkout), self-service account deletion
- [x] Loyalty points — earn on paid orders (₹100 → 1 point), redeemable at checkout, balance always recomputed server-side
- [x] Refer & Earn — per-client referral code derived from their user id, captured via `?ref=` link on signup
- [x] File delivery system — admin uploads final files to a private bucket; client downloads via a signed URL from My Orders
- [x] Revision request — client can request a revision on their own order from My Orders; admin can mark it handled, which notifies the client
- [x] Order messaging — per-order chat thread between client and admin, with optional file attachments
- [x] Call booking — client requests a call from the account hub; admin manages requests from the dashboard
- [x] Notification preferences — client can choose all / important-only / none for order-status emails
- [x] Switched transactional email provider: Resend → Brevo

## 🔧 Tech Debt / Cleanup

- [ ] `track-order.html` / `track-order.mts` (guest lookup by Order ID + phone) is still present alongside My Orders. Decide: keep as a fallback for people who don't want an account, or retire it now that ordering requires login anyway.
- [ ] `site_settings` still has unused `price_poster`/`price_thumbnail`/`price_packaging`/`price_book` columns left over from before the dynamic `services` table — safe to drop whenever convenient.

## 🔴 High Priority — On Hold (owner's call, not being worked on right now)

- [ ] **Real UPI QR code + UPI ID** (payment page still shows a labeled sample/placeholder) — deliberately parked; do not start on this without the owner asking for it explicitly.

## 🛡️ Security & Performance — Found in Site Scan (active — being planned/fixed)

- [ ] **`portfolio.html` is ~4.9 MB** — portfolio images are embedded as inline base64 instead of being hosted as real image files/CDN assets. This makes the page very slow to load, especially on mobile. Move images to a public Supabase Storage bucket (or another CDN/host) and reference them with normal `<img src>` URLs instead. See `Safety and security.md` §5 for the detailed note.
- [ ] **Admin session token stored in `localStorage`** (`gd_admin_token` in `admin-login.html`) — vulnerable to theft via XSS since it isn't an httpOnly cookie. Full researched plan (move to `HttpOnly`/`Secure`/`SameSite=Lax` cookie + CSRF mitigation) is written up in `Safety and security.md` §3.1 — implement from there.
- [ ] **No security response headers configured** — Netlify doesn't add CSP/X-Frame-Options/HSTS by default. A ready-to-use starter `_headers` file (with a Supabase- and inline-CSS-aware Content-Security-Policy) is written up in `Safety and security.md` §6 — copy it in once the production domain is finalized, starting with `Content-Security-Policy-Report-Only` before enforcing it.
- [ ] **Zero automated tests** — everything is manually checked against `TESTING.md`'s checklist. A scoped plan for a small Playwright smoke-test suite (5–8 tests covering the highest-value flows, no CI required to start) is written up in `TESTING.md` under "Adding Automated Smoke Tests."
- [ ] **Emoji icons not actually migrated yet** — `EMOJI-TO-SVG-MIGRATION.md` says only `index.html` and `about.html` were checked, but emoji (🌙 ☀️ ☰ ✕ 👁 🙈) are still present in both of those plus `404.html` and `admin-login.html`. The migration hasn't been implemented on any page yet, only planned.
- [ ] **Leftover old-brand localStorage key names** — `gd-theme` (dark mode) and `gd_admin_token` (admin session) still use the pre-rebrand "gd" prefix from "Gaurav Design". Not broken, just inconsistent with the "Going Beyond" rebrand; rename if convenient (remember to migrate/ignore old stored values — this is a good one to batch together with the admin-cookie migration above since both touch `gd_admin_token`).
- [ ] **No shared JS/CSS file** — theme toggle and other repeated logic is copy-pasted inline into every page instead of a shared `/assets` file. Not urgent, but makes future changes (e.g. the localStorage key rename above) require editing every page individually.

## 🟡 New Services To Add (no code needed — just use the Admin Dashboard)

- [ ] Business Cards
- [ ] Certificates / ID Cards
- [ ] Invitation Cards
- [ ] Resume / CV Design
- [ ] Social Media Post Template Packages
- [ ] Menu Cards
- [ ] PDF / eBook Formatting
- [ ] Coaching-institute study-material package
- [ ] Small-shop starter kit (logo + business card + menu)

## 🟠 Order & Delivery Experience

- [ ] Estimated delivery date auto-calculation
- [ ] "What happens next" timeline on order success
- [ ] Rush order option
- [ ] Order edit/cancel window (~5 min after submit)
- [ ] "Request similar design" button from portfolio

## 🟢 Payment & Pricing

- [ ] Razorpay / Cashfree in addition to UPI
- [ ] Bulk order discount tiers
- [ ] Seasonal combo packages
- [ ] GST invoice generator

## 🔵 Retention & Growth

- [ ] Loyalty points redemption UI polish / balance display on more pages (core system is shipped — this is refinement)
- [ ] Birthday/anniversary discount
- [ ] "Verified Client" badges

## 🟣 Communication

- [ ] WhatsApp automation for status updates
- [ ] SMS notifications
- [ ] Live chat widget (order messaging is per-order and account-gated — this would be a site-wide, pre-account widget)
- [ ] FAQ chatbot

## ⚪ Admin Dashboard Improvements

- [ ] Bulk status-change actions
- [ ] CSV/Excel export of orders
- [ ] Most-ordered-service widget
- [ ] Monthly income report
- [ ] Client repeat-order rate
- [ ] Expense tracker
- [ ] Auto-backup reminder

## 🟤 SEO & Discoverability

- [ ] Sitemap.xml + robots.txt
- [ ] Open Graph tags (share previews)
- [ ] Favicon / app icon
- [ ] "Install as App" (PWA)
- [ ] Google Search Console registration
- [ ] Blog / Tips section
- [ ] **Standing rule (in effect now): every future page edit should also check/update its title + meta description**

## ⚫ Design & UX Polish

- [ ] Dark-mode auto-sync with device setting
- [ ] Skeleton loading states
- [ ] Instant click feedback on buttons
- [ ] Sticky "Order Now" button on mobile
- [ ] Form draft auto-save (localStorage)
- [ ] Larger tap targets / no auto-zoom on mobile inputs
- [ ] Contrast/accessibility pass
- [ ] "Recently viewed" portfolio section
- [ ] Before/After or process showcase in portfolio

## Other

- [ ] Visitor analytics
- [ ] WhatsApp Catalog sync
- [ ] Multi-language (Hindi/English toggle)

---

**Guidance for whoever picks this up next:** don't try to build everything at once. Ship one checkbox, verify it end-to-end (frontend + backend + DB), push to GitHub, confirm the Netlify deploy actually included the new function count, then move to the next box.
