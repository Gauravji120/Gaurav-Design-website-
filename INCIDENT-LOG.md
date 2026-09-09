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
- **Root cause:** This was introduced by whatever session/change migrated the theme-toggle button from an emoji (🌙/☀️) to inline SVG icons (the menu-open and menu-close buttons were migrated correctly with inline `<svg>` markup, but the theme-toggle button's `SUN_ICON`/`MOON_ICON` variables were referenced without ever being defined). Not something this session introduced — found already broken.
- **Fix:** Not yet fixed — flagging here per `TESTING.md`'s process, since this session's task was the JSON-LD schema, not this bug. Tracked in `ROADMAP.md`'s Security & Performance section.
- **Follow-up / prevention:** Define `SUN_ICON` and `MOON_ICON` as inline SVG string constants (matching the style already used for the menu open/close icons) at the top of `index.html`'s script block, then re-test the dark mode toggle end-to-end (click to switch, refresh to confirm the preference persists with the correct icon shown).

## 2026-09-04 — order.html briefly truncated to 2 lines during a title/description edit

- **What happened:** While updating `order.html`'s `<title>`/meta description for SEO Step 3, a GitHub commit was pushed containing *only* the new `<title>` and `<meta name="description">` lines — the other ~32 KB of the file (all CSS, the form markup, and the order-submission JavaScript) was wiped out for one commit. The live page would have been completely broken (no styling, no form) until the next fix.
- **Root cause:** GitHub's file-update API (`create_or_update_file`) always replaces a file's entire content with whatever is sent — it has no partial-patch mode. The edit was mistakenly sent as if it were a small patch (just the two changed lines) instead of the complete file with those two lines changed.
- **Fix:** Reconstructed the full original `order.html` locally, applied only the intended title/description change within it, verified the reconstructed file's byte size and structure matched the original (DOCTYPE start, `</html>` end, exactly one `<title>` and one meta description) before pushing, then pushed the corrected full file as a follow-up commit.
- **Follow-up / prevention:** For any file-based edit tool that requires sending the full file content (as opposed to a true patch/diff API), always fetch the current full content first, make the change against that full copy, and verify the result's size/structure before pushing — never send just the changed fragment. This applies especially to large HTML files like `order.html`, `about.html`, `track-order.html`, and eventually `portfolio.html`.
