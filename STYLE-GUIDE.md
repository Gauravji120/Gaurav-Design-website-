# Style Guide

> The visual design system for the Going Beyond site — colors, typography, and component conventions. Every page should draw from these tokens rather than introducing new ad-hoc values, so the site stays visually consistent as pages are added or edited (including by AI tools — see `AI-CODING-GUIDELINES.md`).

---

## Colors (CSS Custom Properties)

Defined once per page in `:root`, with a `[data-theme="dark"]` override block. Never hardcode a hex value directly in markup or inline styles — always reference the variable.

| Variable | Light value | Dark value | Used for |
|---|---|---|---|
| `--paper` | `#EFEDE2` | `#171A1E` | Page background |
| `--paper-alt` | `#E6E2D3` | `#1E2228` | Alternating section background |
| `--ink` | `#1F2A38` | `#ECE8DC` | Primary text, icon color (via `currentColor`) |
| `--ink-soft` | `#4A5563` | `#A9A79B` | Secondary/muted text, arrows |
| `--carbon-red` | `#B23A2E` | `#E0574A` | Primary accent — CTAs, prices, active states |
| `--stamp-mustard` | `#C9922A` | `#E0AC4D` | Secondary accent — offer banners, highlights |
| `--ledger-green` | `#4C6B54` | `#7FA98C` | Tertiary accent — WhatsApp button |
| `--line` | `#C9C4B2` | `#3A3E44` | Borders, dividers |
| `--white` | `#FFFDF8` | `#20242A` | Card backgrounds (an off-white/near-black, not literal white/black) |

Every page implementing the theme toggle must define these same variable names and values so switching pages mid-session doesn't shift the palette.

## Typography

| Variable | Font | Used for |
|---|---|---|
| `--mono` | `'JetBrains Mono', monospace` | Eyebrows/labels, prices, badges, technical/structured text |
| `--sans` | `'Work Sans', sans-serif` | Body text, headings, everything else |

Both are loaded from Google Fonts with `preconnect` hints — keep that pattern when adding a new page rather than adding another font.

## Icons

- All UI icons are inline SVG (see `EMOJI-TO-SVG-MIGRATION.md`) — never emoji characters for buttons or controls.
- Every icon SVG uses `stroke="currentColor"` (or `fill="currentColor"` for solid icons like the WhatsApp glyph and social icons) so it inherits the surrounding text color and adapts automatically between light and dark theme.
- Standard stroke style: `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"` — match this for any new icon so line weight stays consistent.
- Common sizes in use: 14–18px for header icons (theme toggle, back link, menu), 16px for card arrows, 20–26px for nav-card icons. Pick the size matching the nearest existing icon of the same role rather than inventing a new size.

## Components

- **Buttons:** `.btn-primary` (solid `--carbon-red` background, white text) for the main call-to-action per page; `.btn-ghost` (outlined, `--ink` border and text) for secondary actions. Border-radius is a small `2px` throughout — not fully rounded, not sharp.
- **Icon buttons:** circular (`border-radius:50%`), bordered with `--line`, background `--paper`, sized 36–38px — used for the theme toggle, menu open/close, and similar single-icon controls.
- **Cards:** background `--white`, `1px solid var(--line)` border, no shadow by default; on hover, a subtle `translateY(-2px)` lift and border color shifts to `--carbon-red`.
- **Price display:** always `--mono` font, `--carbon-red` color, formatted with the ₹ symbol and Indian digit grouping (`toLocaleString('en-IN')`).

## Layout

- No CSS framework or build step — plain CSS in a `<style>` block per page (see `ARCHITECTURE.md`). Keep new pages consistent with this rather than introducing Tailwind, a bundler, or a component library.
- Content is wrapped in a `max-width` container (`1080px` on the homepage, `700–900px` on account/inner pages) centered with `margin:0 auto`.
- Mobile responsiveness is handled with simple `@media` breakpoints per component rather than a utility-class grid system — follow the existing pattern in a page's `<style>` block rather than introducing a new responsive approach.

## When Adding a New Page

1. Copy the `:root` / `[data-theme="dark"]` variable block from an existing page rather than retyping values.
2. Reuse the existing header/menu/theme-toggle markup and script rather than writing a new version — see `AI-CODING-GUIDELINES.md` on reusing existing patterns instead of duplicating.
3. If a new UI icon is needed, follow the icon conventions above rather than reaching for an emoji or a new stroke style.
