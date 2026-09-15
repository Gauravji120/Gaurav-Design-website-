# Incident Log

This file is referenced by `TESTING.md` ("add an entry to CHANGELOG.md and to INCIDENT-LOG.md with the root cause") but did not exist yet — created as part of a documentation audit.

Log format for each entry:

```
## YYYY-MM-DD — Short title
- **What happened:**
- **Root cause:**
- **Fix:**
- **Follow-up / prevention:**
```

---

## 2026-09-09 — Dark mode toggle references undefined SUN_ICON/MOON_ICON on index.html

- **What happened:** While adding the LocalBusiness JSON-LD schema (SEO Step 7), noticed that `index.html`'s theme-toggle script sets `toggle.innerHTML = saved === 'dark' ? SUN_ICON : MOON_ICON` and `toggle.innerHTML = isDark ? MOON_ICON : SUN_ICON`, but no `SUN_ICON` or `MOON_ICON` constant is declared anywhere in the file. This means clicking the dark-mode toggle (or loading the page with a saved dark-mode preference) sets the button's content to the literal string `"undefined"` instead of an icon.
- **Root cause:** This was introduced by whatever session/change migrated the theme-toggle button from an emoji (🌙/☀️) to inline SVG icons (the menu-open and menu-close buttons were migrated correctly with inline `<svg>` markup, but the theme-toggle button's `SUN_ICON`/`MOON_ICON` variables were referenced without ever being defined). Not something this session introduced — found already broken. The owner confirmed this was from a different AI tool making SVG edits earlier, separately from this session.
- **Fix (2026-09-10):** Defined `SUN_ICON` and `MOON_ICON` as inline SVG string constants (matching the stroke-based style already used for the menu open/close icons — a sun-rays icon and a crescent-moon icon respectively) right before the theme-toggle logic in `index.html`'s script block. Verified via byte-size diff and re-fetch from GitHub that the fix applied cleanly and the rest of the file (including the LocalBusiness schema and canonical tag from the same session) stayed intact.
- **Follow-up / prevention:** Re-test the dark mode toggle end-to-end in a real browser (click to switch, refresh to confirm the preference persists with the correct icon shown) since this was verified by code inspection, not a live browser test. When working across multiple AI tools/sessions on the same file, re-check that any new named variable/constant a tool references is actually defined somewhere before considering that edit complete — a partial migration (definition in one place, usage in another) is easy to introduce accidentally across tools.

## 2026-09-04 — order.html briefly truncated to 2 lines during a title/description edit

- **What happened:** While updating `order.html`'s `<title>`/meta description for SEO Step 3, a GitHub commit was pushed containing *only* the new `<title>` and `<meta name="description">` lines — the other ~32 KB of the file (all CSS, the form markup, and the order-submission JavaScript) was wiped out for one commit. The live page would have been completely broken (no styling, no form) until the next fix.
- **Root cause:** GitHub's file-update API (`create_or_update_file`) always replaces a file's entire content with whatever is sent — it has no partial-patch mode. The edit was mistakenly sent as if it were a small patch (just the two changed lines) instead of the complete file with those two lines changed.
- **Fix:** Reconstructed the full original `order.html` locally, applied only the intended title/description change within it, verified the reconstructed file's byte size and structure matched the original (DOCTYPE start, `</html>` end, exactly one `<title>` and one meta description) before pushing, then pushed the corrected full file as a follow-up commit.
- **Follow-up / prevention:** For any file-based edit tool that requires sending the full file content (as opposed to a true patch/diff API), always fetch the current full content first, make the change against that full copy, and verify the result's size/structure before pushing — never send just the changed fragment. This applies especially to large HTML files like `order.html`, `about.html`, `track-order.html`, and eventually `portfolio.html`.

## Historical incidents (from CHANGELOG.md, exact dates not recorded)

## Admin RLS gap
- **What happened:** Data intended to be admin-only was reachable in a way that didn't match the intended security model.
- **Root cause:** A table or policy did not have RLS locked down the way the rest of the schema assumes (see `Safety and security.md` §2 for the standard every table should meet).
- **Fix:** RLS policy corrected so only `service_role` (used inside Netlify Functions) can access the data.
- **Follow-up / prevention:** Run the RLS verification query in `Safety and security.md` §2 after every new table or schema change, not just at initial setup.

## QR-bucket exposure
- **What happened:** The Instagram QR code storage bucket was not scoped the way the rest of the storage buckets are.
- **Root cause:** Storage bucket policies are separate from database RLS and were not audited the same way.
- **Fix:** Bucket policy corrected; `qr-codes` remains the one intentionally-public bucket, others confirmed private.
- **Follow-up / prevention:** Whenever a new bucket is added, explicitly verify it's private unless there's a specific reason (like `qr-codes`) for it to be public.

## Core Backend Build — functions not deploying
- **What happened:** After a push, some Netlify Functions did not appear to be live, despite the code being merged into `main`.
- **Root cause:** The Netlify build did not pick up the expected number of functions during that deploy.
- **Fix:** Redeploy triggered; function count confirmed in the Netlify deploy log afterward.
- **Follow-up / prevention:** Always check the Netlify deploy log's function count after pushing (see `DEPLOYMENT.md` — "After Pushing").

## Email provider switch (Resend → Brevo)
- **What happened:** Email sending broke or needed migrating.
- **Root cause:** `RESEND_API_KEY` was replaced by `BREVO_API_KEY` as the project moved providers; environment variable names are case-sensitive, which has caused confusion here before.
- **Fix:** All email-sending code routed through the shared `send-email.mts` helper using `BREVO_API_KEY`. `RESEND_API_KEY` retired (see `ENVIRONMENT-VARIABLES.md`).
- **Follow-up / prevention:** Never hardcode a provider-specific key directly in a function — always go through the shared helper so a future provider switch only requires one change.

---

## Later Incidents

*(Add new entries above this line, most recent first, using the format at the top of this file.)*
