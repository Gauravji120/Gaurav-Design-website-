# Roadmap

> Status tracker. Update this file whenever a feature ships or a new one is requested. This is the checklist a new chat session should read to know exactly what's built and what isn't.

## ✅ Shipped

- [x] Home, About & FAQ, Portfolio, Order, Payment, Track Order pages
- [x] Admin Login + Admin Dashboard (Orders / Pricing & Offers / Coupons / Payment & Social tabs)
- [x] Database (8 tables) + 2 storage buckets, all RLS-locked
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

## 🔴 High Priority — Not Started

- [ ] **Real UPI QR code + UPI ID** (payment page still shows a labeled sample/placeholder)
- [ ] **Client Account System** (biggest pending item)
  - [ ] Enable Supabase Auth + Google OAuth provider
  - [ ] New Login/Signup page
  - [ ] Order page requires login; auto-fills name/email/phone from account
  - [ ] New "My Account" page — profile + order history (replaces Track Order)
  - [ ] Remove `track-order.html` + `track-order.mts` once My Account ships
  - [ ] Add `user_id` to `orders`, RLS policy so a logged-in user can read only their own rows
  - [ ] **Decision already made:** account is mandatory to place an order — no guest checkout. Pre-account orders stay admin-only.

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

- [ ] Revision request button
- [ ] File delivery system (download final files from the site)
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

- [ ] Refer & Earn system
- [ ] Loyalty points
- [ ] Birthday/anniversary discount
- [ ] "Verified Client" badges

## 🟣 Communication

- [ ] WhatsApp automation for status updates
- [ ] SMS notifications
- [ ] Live chat widget
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
