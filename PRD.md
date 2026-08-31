# Product Requirements Document — Going Beyond

> This is the **product-level** doc (what to build and why). For implementation detail (schema, functions, security model) see `ARCHITECTURE.md`. For build status see `ROADMAP.md`. For dated history see `CHANGELOG.md`. Read all four together — this repo is the single source of truth.

**Product:** Going Beyond — order-management website for a solo freelance graphic designer
**Owner / sole operator:** Gaurav Adhikari (DTP Operator & Graphic Designer, Delhi NCR)
**Live site:** https://goingbeyond.netlify.app
**Status:** Live and in active use. This PRD documents both what's shipped and what's still planned — see the Status column in each requirement table, and cross-check `ROADMAP.md` for the current source of truth on build status.

---

## 1. Problem & Purpose

Gaurav is a solo freelance designer (posters, thumbnails, packaging, book covers, logos, and more). Before this platform, order intake, pricing, payment confirmation, and status updates were handled manually (WhatsApp/chat), which doesn't scale past a handful of clients at once and gives clients no visibility into their order status or history.

**Purpose:** give clients a self-serve way to discover services, place and pay for an order, track it end-to-end, and stay in touch with the designer — while giving the designer a single dashboard to run the entire business without writing code for day-to-day changes (pricing, coupons, social links, order status).

## 2. Goals

- Let a client go from "I need a design" to a placed, paid order with zero back-and-forth chat needed just to get started.
- Give clients visibility into their own order history, files, and communication — reducing "what's the status of my order?" messages.
- Let the designer run pricing, offers, coupons, and services changes himself, instantly, without a developer.
- Encourage repeat business and referrals without manual tracking (loyalty points, referral codes).
- Keep the whole system operable by one non-developer person day-to-day; only genuinely new features require developer/AI-assisted changes.

### Non-goals (out of scope for now)
- Multi-designer / team support — this is a single-operator platform by design.
- In-house payment processing (currently UPI, manually marked Paid by the admin after checking — see §5 Payments).
- Public marketplace / discovery beyond this one designer's direct site.

## 3. Users

| Persona | Description | Primary needs |
|---|---|---|
| **Client** | Someone who wants a design made — poster, thumbnail, packaging, logo, etc. May be a repeat customer. | Easy ordering, clear pricing, order tracking, a way to reach the designer, proof of past orders/invoices for their own records. |
| **Admin (Gaurav)** | The sole designer and business operator. | One dashboard for orders/pricing/coupons/social links/calls; minimal manual work; doesn't want to touch code for routine changes. |

## 4. Functional Requirements

Grouped by area. **Status:** ✅ Shipped / 🚧 Partial / ⏳ Planned (kept in sync with `ROADMAP.md` — that file is the tie-breaker if these ever disagree).

### 4.1 Public Site & Discovery
| Requirement | Status |
|---|---|
| Home page shows live, admin-managed service pricing (no hardcoded prices) | ✅ |
| Portfolio gallery of past work | ✅ |
| About page with FAQ, refund/terms info | ✅ |
| SEO: every page edit should also check/update its title + meta description (standing rule) | 🚧 (sitemap/OG tags/favicon/PWA still ⏳ — see ROADMAP) |

### 4.2 Client Accounts
| Requirement | Status |
|---|---|
| Client can sign up / log in with Google OAuth | ✅ |
| Client can sign up / log in with a passwordless email magic link (no password to manage) | ✅ |
| First login automatically creates the account — no separate signup step | ✅ |
| Client has an account hub linking to Profile, My Orders, Settings, Billing, Activity, Refer & Earn, Help, Book a Call | ✅ |
| Client can edit their profile (name, contact) | ✅ |
| Client can self-delete their account; past orders keep business/tax history but lose the personal link | ✅ |
| Client can set a notification preference (all order emails / high-priority only / none) | ✅ |

### 4.3 Ordering & Payment
| Requirement | Status |
|---|---|
| Placing an order requires a logged-in account (no guest checkout) — a deliberate decision to build a real client base, not anonymous one-offs | ✅ |
| Client selects a service, size, deadline, and describes what they need; can attach a reference file | ✅ |
| Price is always the live, current price from the admin's service list — never something the client's browser can influence | ✅ |
| Client can apply a coupon code for a discount, re-validated server-side | ✅ |
| Client can redeem loyalty points toward an order, capped at their real balance and the order total | ✅ |
| Quantity selector with server-computed total | ✅ |
| Order confirmation email to client + alert email to admin | ✅ |
| Admin can pause new orders site-wide with a custom message, enforced even against direct API calls | ✅ |
| Real UPI QR code + UPI ID on the payment page (currently a placeholder) | ⏳ High priority |
| Additional payment methods (Razorpay/Cashfree) | ⏳ |
| GST invoice generation | ⏳ |

### 4.4 Order Tracking, Delivery & Revisions
| Requirement | Status |
|---|---|
| Client can view their own order history, status, and totals ("My Orders") | ✅ |
| Guest-style order lookup by Order ID + phone (no login) still available | ✅ (kept alongside My Orders — see ROADMAP Tech Debt for the decision on whether to retire it) |
| Admin can update an order's status through a defined lifecycle (Order Placed → Confirmed → Design in Progress → Review → Delivered), triggering a matching client email | ✅ |
| Admin can upload final delivered files; client downloads them from My Orders via a time-limited link | ✅ |
| Client can request a revision on their own order with notes; admin can mark it handled, notifying the client | ✅ |
| Client and admin can message each other per-order, with file attachments | ✅ |
| "What happens next" timeline shown after placing an order | ⏳ |
| Estimated delivery date auto-calculated from service + deadline | ⏳ |
| Rush order option | ⏳ |
| Short edit/cancel window after submitting an order | ⏳ |

### 4.5 Loyalty & Referrals
| Requirement | Status |
|---|---|
| Client automatically earns loyalty points on paid orders | ✅ |
| Client can view and redeem their real points balance at checkout | ✅ |
| Every client has a unique referral code and can share it via a link | ✅ |
| Client can see how many people signed up using their referral code | ✅ |
| Referral rewards / incentive payout for successful referrals | ⏳ (currently tracks referral count only — no reward mechanic defined yet) |
| Birthday/anniversary discounts, "Verified Client" badges | ⏳ |

### 4.6 Communication
| Requirement | Status |
|---|---|
| Client can request a call with the designer, with a reason and preferred time | ✅ |
| Admin can view and update the status of call requests | ✅ |
| Admin can send a manual, one-off email to a client about an order | ✅ |
| Admin can manually trigger a review/referral-request email after delivery | ✅ |
| WhatsApp status-update automation | ⏳ |
| SMS notifications | ⏳ |
| Site-wide live chat widget (separate from per-order messaging) | ⏳ |
| FAQ chatbot | ⏳ |

### 4.7 Admin Dashboard
| Requirement | Status |
|---|---|
| Single password-protected dashboard, no code changes needed for routine operation | ✅ |
| Manage orders: search, view details, update status/payment, view reference files and revision requests | ✅ |
| Manage services (add/edit/remove, price, active toggle) — powers Home + Order page pricing live | ✅ |
| Manage coupons (create, usage limits, expiry) | ✅ |
| Manage social links (unlimited platforms, footer display) | ✅ |
| Manage payment/UPI display and offer banner | ✅ |
| Manage call requests | ✅ |
| Per-order messaging and delivery-file upload from the dashboard | ✅ |
| Bulk status-change actions, CSV/Excel export, income/repeat-order reports, expense tracker | ⏳ |

## 5. Payments

Payment is via UPI. The client sees the amount due and a UPI ID/QR on the Payment page; **there is no automated payment gateway confirmation yet** — the admin marks an order `Paid` manually in the dashboard after verifying receipt, which triggers a payment-confirmation email. This is a known manual step; automated payment verification (or a full gateway integration) is on the roadmap but not yet built. Until the real UPI QR/ID replaces the current placeholder (§4.3), payment collection is effectively still informal — **treat this as the top functional gap** for anyone picking up this project next.

## 6. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Security** | No client-submitted price, discount, or points value is ever trusted — always recomputed server-side. Every client-facing action that touches personal data verifies the requester's identity server-side and confirms they actually own the record in question. Admin and client auth are two separate, non-interchangeable systems (see `ARCHITECTURE.md`). |
| **Privacy** | Reference files, delivered final files, and message attachments are stored in private buckets, never public URLs — access only via short-lived signed links. |
| **Reliability** | A failed or delayed email must never block an order from being saved — email sending is always best-effort after the core action succeeds. |
| **Availability** | Runs on free-tier infrastructure (Netlify + Supabase); both have known free-tier limits (Supabase auto-pause after ~7 days idle, Netlify monthly build/function credit cap) that the admin needs to be aware of operationally — see `README.md`'s Known Operational Gotchas. |
| **Usability** | The admin must be able to run 100% of day-to-day operations (pricing, coupons, orders, social links) without a code change or developer involvement. |
| **Accessibility** | Dark/light theme toggle site-wide. Further contrast/accessibility pass still ⏳. |

## 7. Constraints & Assumptions

- Single-operator business — no team roles, permissions, or multi-admin support are planned.
- Free-tier hosting (Netlify) and database (Supabase) — cost-sensitive; deploy/build frequency should be batched where possible to conserve Netlify's monthly credit.
- India-first: phone number validation assumes Indian 10-digit mobile numbers (with optional `+91`), currency is ₹, and payment is UPI-first.
- No dedicated QA/staging environment — changes are verified directly against the live Supabase project and deployed via GitHub → Netlify continuous deployment.

## 8. Open Questions / Risks

- **Track Order (guest lookup) vs. My Orders (account-based):** both now exist side by side. Is Track Order still needed now that ordering requires an account, or should it be retired? (See `ROADMAP.md` Tech Debt.)
- **Referral incentive:** referral codes and counts are tracked, but there's no defined reward (discount, points, cash) for a successful referral yet. What should the incentive be?
- **Payment verification:** marking an order "Paid" is currently a fully manual admin step. Is a payment gateway (Razorpay/Cashfree) or at least a client-side "I've paid" confirmation button planned before order volume grows further?
- **Loyalty point value assumptions:** 1 point per ₹100 spent, 1 point = ₹1 at redemption — confirm this ratio is still the intended business rule as order volume grows.

## 9. Success Metrics (suggested — not yet instrumented)

No analytics are currently wired in (see `ROADMAP.md` — Visitor analytics is ⏳). Once built, useful metrics for this product would include: order conversion rate (visits → placed orders), % of orders requiring a revision, average time from "Order Placed" to "Order Delivered", repeat-order rate per client, and referral-driven signups as a % of total signups.
