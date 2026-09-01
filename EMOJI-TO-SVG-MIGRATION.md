# Emoji to SVG Migration

> Plan for replacing emoji characters used as UI icons with inline SVG, so icons render consistently across devices/browsers and can be styled with the site's design system colors. Read alongside `ARCHITECTURE.md` and `AI-CODING-GUIDELINES.md` before making changes.

---

## 1. Why Replace Emoji Icons With SVG

Emoji characters are rendered by the operating system's own emoji font, not by the website. This causes:
- **Inconsistent appearance** — the same emoji looks different on Windows, macOS, Android, iOS, and can even be missing entirely on some systems.
- **No color control** — emoji can't be recolored with CSS, so they can't match the site's design tokens (`--carbon-red`, `--stamp-mustard`, `--ledger-green`, etc.) or automatically adapt between light and dark theme.
- **Inconsistent sizing/alignment** — emoji baseline and sizing behave differently from text and other icons, causing small alignment issues in buttons.

An inline SVG, by contrast, is drawn by the browser from code the site controls — it looks identical everywhere, can use `fill="currentColor"` to inherit the surrounding text color (so it automatically flips color with the dark/light theme toggle), and scales cleanly at any size.

## 2. Emoji Found In This Repo (confirmed so far)

**Status: nothing has been migrated yet — this whole section is still an open audit, not a completed one.** Confirmed emoji, page by page:

| Emoji | Used for | Confirmed in |
|---|---|---|
| 🌙 | Dark/light theme toggle button (light mode state) | `index.html`, `404.html`, and by extension likely every other page sharing the same header pattern |
| ☀️ | Dark/light theme toggle button (dark mode state) | `index.html`, `404.html`, likely all pages |
| ☰ | Hamburger menu open button | `index.html` |
| ✕ | Menu close button | `index.html` |
| 👁 | Show-password toggle (admin login form) | `admin-login.html` |
| 🙈 | Hide-password toggle (admin login form, after clicking 👁) | `admin-login.html` |

**Before implementing:** only `index.html`, `404.html`, and `admin-login.html` have actually been checked so far, out of ~23 HTML files. Do a full pass across every remaining `.html` file to confirm the complete list before starting the SVG swap — there are very likely more theme-toggle emoji instances on pages not yet audited (about.html, login.html, order.html, and the rest of the account/admin pages).

## 3. Migration Plan

1. Audit every `.html` file for emoji characters used as UI icons (buttons, indicators) — this repo has ~23 HTML files, most sharing the same header/menu markup, so most occurrences will repeat the same handful of emoji.
2. For each emoji, pick one clear, simple SVG icon (see starter snippets below) rather than an overly detailed illustration — this matches the site's plain, functional design system.
3. Use `fill="currentColor"` (or `stroke="currentColor"` for line icons) so the icon inherits the button's text color and automatically adapts between `[data-theme="light"]` and `[data-theme="dark"]`.
4. Replace one page first (e.g. `about.html`), verify visually in both themes, confirm the toggle/menu JS logic still works (some JS currently sets `toggle.textContent = '🌙'` — this needs to change to swapping an SVG or toggling a CSS class instead of setting text).
5. Once confirmed, apply the same change to the remaining pages that share the same header markup, and to `admin-login.html`'s password show/hide toggle separately (see the 👁/🙈 icon below).
6. Do a final check per `AI-CODING-GUIDELINES.md`: the diff size should roughly match the number of icons changed — this is a like-for-like swap, not a redesign, so no new dependencies or build steps should be introduced.

## 4. Starter SVG Snippets

Simple line-style icons matching the site's minimal aesthetic. All use `currentColor` so they inherit the button's color automatically.

**Moon (dark mode icon, replaces 🌙):**
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>
```

**Sun (light mode icon, replaces ☀️):**
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="5"/>
  <line x1="12" y1="1" x2="12" y2="3"/>
  <line x1="12" y1="21" x2="12" y2="23"/>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
  <line x1="1" y1="12" x2="3" y2="12"/>
  <line x1="21" y1="12" x2="23" y2="12"/>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
</svg>
```

**Hamburger menu (replaces ☰):**
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <line x1="3" y1="6" x2="21" y2="6"/>
  <line x1="3" y1="12" x2="21" y2="12"/>
  <line x1="3" y1="18" x2="21" y2="18"/>
</svg>
```

**Close / X (replaces ✕):**
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <line x1="18" y1="6" x2="6" y2="18"/>
  <line x1="6" y1="6" x2="18" y2="18"/>
</svg>
```

**Eye / show password (replaces 👁):**
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
```

**Eye-off / hide password (replaces 🙈):**
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>
```

## 5. What NOT to Change

- Emoji used only as casual decoration in plain text content (not part of a clickable UI element) don't need to be touched — this migration is specifically about icons used in buttons and controls.
- Don't introduce an icon library/dependency (e.g. an npm icon package) for this — the site deliberately has no build step (`ARCHITECTURE.md`), so inline SVG keeps that constraint intact.

## 6. Ongoing Rule

Any new button or icon added to the site going forward should use inline SVG from the start, not an emoji character, to avoid reintroducing this same inconsistency.
