# Environment Variables

> Names and purposes only — **never actual values**. All real secrets live exclusively in Netlify's Environment Variables UI (Site settings → Environment variables), never in `.env` files, `netlify.toml`, or anywhere in this repo. See `Safety and security.md` for the handling rules around these.

---

## Required Variables

| Variable | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL` | All Netlify Functions that touch the database | Base URL of the Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | All Netlify Functions that touch the database | Full-access key used server-side only — the public site never uses this from the browser |
| `BREVO_API_KEY` | `netlify/lib/send-email.mts` and every function that sends email | Authenticates with Brevo, the current transactional email provider |
| `ADMIN_SESSION_SECRET` | `admin-login.mts`, `verify-session.mts` | HMAC-SHA256 secret used to sign and verify admin session tokens |

## Optional Variables

| Variable | Used by | Purpose |
|---|---|---|
| `ADMIN_NOTIFY_EMAIL` | Functions that alert the admin (e.g. `submit-order.mts`, `book-call.mts`) | Destination address for admin alert emails. If unset, some functions fall back to a hardcoded admin email address — see `ARCHITECTURE.md` |

## Retired Variables (do not re-add)

| Variable | Status |
|---|---|
| `RESEND_API_KEY` | Retired — the project switched its email provider from Resend to Brevo (see `CHANGELOG.md`). No code references this anymore. If you see it referenced anywhere, that's stale code to remove. |

## Rules

- **Names are case-sensitive.** A wrong-case variant (e.g. `resend_api_key` instead of `RESEND_API_KEY`) has silently broken email sending in this project before, with no obvious error — always double check exact casing after setting a variable in Netlify.
- All variables are read via `Netlify.env.get()` inside Netlify Functions — never hardcoded, and never read from a `.env` file (this project doesn't use one; see `Safety and security.md`).
- If a function needs a new secret, add it to this table (name and purpose only) in the same change that introduces it, so this file stays a complete reference.
- Never commit an actual key, token, or value to this repo — not even temporarily, not even in a comment.
