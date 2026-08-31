# API Endpoints

> Quick reference for every Netlify Function (`/netlify/functions/*.mts`) in this project — what it does, who can call it, and what it depends on. For full schema and security model, see `ARCHITECTURE.md`. Keep this updated whenever a function is added, removed, or changes its auth requirement.

---

## Public Endpoints (no login required to call)

| Endpoint | Method(s) | Requires login? | Notes |
|---|---|---|---|
| `get-site-settings.mts` | GET | No | Returns prices/offer/UPI/social links/services. Public and read-only by design. |
| `validate-coupon.mts` | POST | No | Live "Apply" button feedback on the order form. `submit-order.mts` re-validates independently. |
| `get-order-total.mts` | GET | No | Public, returns only order_number/service/quantity/total_price/payment_status for the Payment page — deliberately excludes name/phone/email/details. |
| `track-order.mts` | GET | No (requires order_number + matching phone) | Guest-style lookup. Two matching pieces of info required to prevent guessing. |
| `admin-login.mts` | POST | No (this *is* the login) | Rate-limited (6 failed attempts / 15 min lockout), generic error message on failure, issues a signed session token. |

## Client Endpoints (require a logged-in Supabase Auth user)

Each of these independently verifies the `Authorization: Bearer <access_token>` header server-side — never trust a user id sent as a form field.

| Endpoint | Method(s) | Notes |
|---|---|---|
| `submit-order.mts` | POST | Re-validates coupon and price server-side, re-validates loyalty point redemption, rejects with 401 if not logged in, rejects with 503 if orders are paused. Uploads reference file, sends 2 emails (client + owner), logs to `email_log`. |
| `my-orders.mts` | GET | Returns only the caller's own orders, plus a signed download URL for any delivered file. |
| `book-call.mts` | POST | Inserts into `call_requests`, emails the admin. |
| `delete-account.mts` | POST | Deletes the Supabase Auth user; `orders.user_id` is set to null via `ON DELETE SET NULL` so order history is preserved. Emails admin a notification. |
| `get-loyalty-points.mts` | GET | Returns the real, server-computed balance — never trust a client-sent balance. |
| `get-referral-stats.mts` | GET | Returns the caller's referral code (`GB-XXXXXXXX`, derived from user id) and referral count. |
| `order-messages.mts` | GET, POST | Confirms the order belongs to the caller before returning or accepting messages. Supports an optional file attachment. |
| `request-revision.mts` | POST | Confirms order ownership before setting `revision_requested`; emails the admin. |

## Admin Endpoints (require a valid session token via `verify-session.mts`)

| Endpoint | Method(s) | Notes |
|---|---|---|
| `admin-orders.mts` | GET, PATCH | List/search orders, generate signed reference-file URLs; PATCH updates status/payment_status, clears a revision flag, or triggers a review/referral-request email. |
| `admin-settings.mts` | PATCH | Update offer/UPI/whatsapp fields — allow-listed fields only. |
| `admin-coupons.mts` | GET, POST, PATCH, DELETE | Coupon CRUD. |
| `admin-services.mts` | GET, POST, PATCH, DELETE | Services CRUD; auto-generates a unique `service_key` slug from the name. |
| `admin-social-links.mts` | GET, POST, DELETE | Add/list/delete social links. |
| `admin-upload-qr.mts` | POST | Uploads a QR image to the `qr-codes` bucket, updates `site_settings`. |
| `admin-send-email.mts` | POST | Sends a free-text custom email to a client for a given order. |
| `admin-call-requests.mts` | GET, PATCH | List call requests, update status. |
| `admin-order-messages.mts` | GET, POST | Admin side of the per-order chat thread; emails the client if their notification preference allows it. |
| `admin-upload-delivery.mts` | POST | Uploads final file to the `deliverables` bucket, links it to the order, emails the client. |

## Shared Helpers (`/netlify/lib/*.mts`)

Not endpoints themselves — imported by the functions above. Reuse these instead of duplicating logic (see `AI-CODING-GUIDELINES.md`).

| Helper | Purpose |
|---|---|
| `verify-session.mts` | Verifies admin session tokens server-side. |
| `send-email.mts` | Shared Brevo email-sending helper used by every function that sends email. |
| `loyalty-points.mts` | Server-side loyalty point balance calculation. |
| `notification-pref.mts` | Looks up a client's notification preference before sending a status email. |

## When Adding a New Endpoint

1. Decide its category (public / client / admin) and follow the matching auth pattern already established above — don't invent a new auth style.
2. If it touches personal data or another table, verify the caller owns the record before reading or writing anything (see `ARCHITECTURE.md`'s Security Checklist).
3. Add a row to the correct table in this file in the same change.
