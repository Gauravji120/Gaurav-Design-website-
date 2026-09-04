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

## 2026-09-04 — order.html briefly truncated to 2 lines during a title/description edit

- **What happened:** While updating `order.html`'s `<title>`/meta description for SEO Step 3, a GitHub commit was pushed containing *only* the new `<title>` and `<meta name="description">` lines — the other ~32 KB of the file (all CSS, the form markup, and the order-submission JavaScript) was wiped out for one commit. The live page would have been completely broken (no styling, no form) until the next fix.
- **Root cause:** GitHub's file-update API (`create_or_update_file`) always replaces a file's entire content with whatever is sent — it has no partial-patch mode. The edit was mistakenly sent as if it were a small patch (just the two changed lines) instead of the complete file with those two lines changed.
- **Fix:** Reconstructed the full original `order.html` locally, applied only the intended title/description change within it, verified the reconstructed file's byte size and structure matched the original (DOCTYPE start, `</html>` end, exactly one `<title>` and one meta description) before pushing, then pushed the corrected full file as a follow-up commit.
- **Follow-up / prevention:** For any file-based edit tool that requires sending the full file content (as opposed to a true patch/diff API), always fetch the current full content first, make the change against that full copy, and verify the result's size/structure before pushing — never send just the changed fragment. This applies especially to large HTML files like `order.html`, `about.html`, `track-order.html`, and eventually `portfolio.html`.
