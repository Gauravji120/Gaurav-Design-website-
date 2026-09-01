# SEO Strategy — Going Beyond

> This file is the SEO plan for the **Going Beyond** website (goingbeyond.netlify.app). Written for someone who has never done SEO before — every section explains *why*, not just *what*. This is a planning/reference document only — **no code has been changed as part of this file**. Cross-reference `ROADMAP.md` §"SEO & Discoverability" for the tracked checklist items this expands on.

**What SEO actually is, in one line:** making it easy for (a) Google's crawler to find, understand, and trust every page, and (b) an actual human searching "poster design Delhi" or "YouTube thumbnail designer near me" to land on this site instead of a competitor's.

**2026 context worth knowing:** Google's own ranking systems and AI Overviews/ChatGPT/Perplexity now increasingly answer local "who can do X near me" questions by pulling from Google Business Profile + on-page content directly, not just classic blue-link ranking. That means the checklist below matters for both "ranking on Google" and "being the AI's answer."

---

## Priority Order

Do these roughly in this order — each phase builds on the last, and phase 1 (technical) is close to worthless if skipped, because a page Google can't properly read or index won't rank no matter how good the content is.

1. **Technical foundation** (sitemap, robots.txt, one title/description per page, HTTPS — already have HTTPS via Netlify)
2. **Google Business Profile** (single biggest lever for a local service business — free, and usually the fastest visible result)
3. **On-page content & keywords** (titles, headings, service pages, alt text)
4. **Structured data** (LocalBusiness + Service schema — helps both Google and AI answer engines)
5. **Off-page** (reviews, backlinks, social signals) — ongoing, slower to show results

---

## 1. Technical Foundation

### 1.1 `sitemap.xml`
A sitemap is a simple XML file listing every real page you want indexed, so Google's crawler doesn't have to guess. Create `/sitemap.xml` at the site root listing the public-facing pages (skip `admin.html`, `admin-login.html`, and any pure account pages that need login — those shouldn't be indexed anyway):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://goingbeyond.netlify.app/</loc><priority>1.0</priority></url>
  <url><loc>https://goingbeyond.netlify.app/order.html</loc><priority>0.9</priority></url>
  <url><loc>https://goingbeyond.netlify.app/portfolio.html</loc><priority>0.8</priority></url>
  <url><loc>https://goingbeyond.netlify.app/about.html</loc><priority>0.7</priority></url>
  <url><loc>https://goingbeyond.netlify.app/track-order.html</loc><priority>0.3</priority></url>
  <url><loc>https://goingbeyond.netlify.app/terms.html</loc><priority>0.2</priority></url>
  <url><loc>https://goingbeyond.netlify.app/privacy.html</loc><priority>0.2</priority></url>
  <url><loc>https://goingbeyond.netlify.app/refund.html</loc><priority>0.2</priority></url>
</urlset>
```
(Update the domain in every `<loc>` if a custom domain replaces `goingbeyond.netlify.app` later.)

### 1.2 `robots.txt`
Tells crawlers what *not* to bother indexing (account/admin pages have no SEO value and shouldn't show up in search results) and points them at the sitemap:

```
User-agent: *
Disallow: /admin.html
Disallow: /admin-login.html
Disallow: /account.html
Disallow: /orders.html
Disallow: /profile.html
Disallow: /settings.html
Disallow: /billing.html
Disallow: /invoice.html
Disallow: /activity.html
Disallow: /refer.html
Disallow: /call.html
Disallow: /help.html

Sitemap: https://goingbeyond.netlify.app/sitemap.xml
```

### 1.3 One unique `<title>` and meta description per page
Right now `index.html` has a good title/description. Every *other* public page needs its own — a generic or duplicate title across pages actively hurts ranking. Rules of thumb:
- **Title:** 50–60 characters, put the most important keyword near the front, end with the brand name. Example for `portfolio.html`: `Portfolio — Poster, Packaging & Book Design | Going Beyond`
- **Meta description:** 150–160 characters, written like ad copy — what the page offers + a reason to click. It doesn't directly boost ranking but strongly affects click-through rate from search results.
- **Never duplicate** the same title/description across two pages.

Suggested titles/descriptions for the key public pages (write these into each page's `<title>` and `<meta name="description">` when doing the code pass):

| Page | Title | Description |
|---|---|---|
| `order.html` | Order Custom Design Online — Posters, Thumbnails & More \| Going Beyond | Place your design order in minutes. Posters, YouTube thumbnails, packaging, book layout — pick a service, pay via UPI, track your job online. |
| `portfolio.html` | Design Portfolio — Posters, Packaging, Book Layout \| Going Beyond | Browse real client work: posters, YouTube thumbnails, packaging designs, and book layouts from a Delhi NCR freelance DTP operator & graphic designer. |
| `about.html` | About & FAQ — Going Beyond DTP & Graphic Design, Delhi NCR | Meet Gaurav Adhikari, freelance DTP operator & graphic designer based in Burari, Delhi NCR. How ordering works, turnaround times, and answers to common questions. |
| `track-order.html` | Track Your Design Order \| Going Beyond | Check the status of your poster, thumbnail, or packaging design order using your order number and phone number. |

This is a planning table — apply it to the actual `<head>` of each page in a follow-up code change, not in this file.

### 1.4 Canonical tags
Add `<link rel="canonical" href="https://goingbeyond.netlify.app/order.html">` (with each page's own URL) to every page's `<head>`. This tells Google the "official" URL for a page, which matters once/if a custom domain is added later and both the old Netlify URL and new domain briefly resolve — without it, Google can see them as duplicate content.

### 1.5 Favicon
A missing favicon is a small but real trust signal loss (already tracked in `ROADMAP.md`). A generated favicon set (favicon.ico + apple-touch-icon + a few PNG sizes) referenced from every page's `<head>` closes this gap.

### 1.6 Page speed
This directly affects ranking (Google's Core Web Vitals). The single biggest speed problem already found: **`portfolio.html` is ~4.9 MB** because images are inline base64 (see `Safety and security.md` §5 and `ROADMAP.md`). Fixing that is as much an SEO fix as a UX one — a slow page ranks worse, especially on mobile, where most "near me" searches happen.

### 1.7 Mobile-friendliness
Google indexes the **mobile** version of a page first ("mobile-first indexing"). The site is already responsive (per `ARCHITECTURE.md`/existing CSS), so this is mostly about not regressing it — keep testing every page on a real mobile viewport (already a step in `TESTING.md`'s cross-cutting checks).

---

## 2. Google Business Profile (do this even before finishing the website changes)

This is free, usually the fastest-moving lever for a *local* service business, and is what makes the business show up on Google Maps and in the "local pack" (the map + 3 listings block) for searches like "graphic designer near me" or "poster design Delhi."

- [ ] Create/claim a **Google Business Profile** (business.google.com) for "Going Beyond" if one doesn't exist yet.
- [ ] Fill in every field completely: exact business name, category (**Graphic Designer**, plus secondary categories like **Commercial Printer** / **Marketing Consultant** if relevant), service area (Delhi NCR — since this looks like a home-based/online business rather than a walk-in shop, set it as a **service-area business** with no public address, rather than a storefront address), phone, website URL, hours, and a keyword-aware business description.
- [ ] Add photos: actual finished designs (posters, thumbnails, packaging, book covers), and if comfortable, a photo of the owner — profiles with photos get more clicks.
- [ ] Use the **Services** section to list each offering (Poster Design, YouTube Thumbnails, Packaging Design, Book Layout, etc.) — this list should match the `services` table on the website so pricing/offerings stay consistent everywhere.
- [ ] Turn on **messaging** so people can inquire directly from the Google listing.
- [ ] Post updates/offers periodically (Google Posts) — profiles that are actively updated are favored over dormant ones.
- [ ] Ask happy clients for **Google reviews** after delivery (a short WhatsApp message with the review link works well) — reviews are one of the strongest local ranking signals and also build trust for anyone who lands on the profile.
- [ ] Keep **NAP** (Name, Address, Phone) **100% consistent** everywhere it appears — website footer, Google Business Profile, Instagram bio, WhatsApp Business profile. Mismatched phone numbers or business names across platforms actively hurt local ranking.

---

## 3. On-Page Content & Keyword Targeting

### 3.1 What people are actually searching for
Realistic search terms for this business (mix of broad and long-tail — long-tail terms are less competitive and easier to rank for as a new/small site):
- "poster design Delhi" / "poster designer near me"
- "YouTube thumbnail designer India" / "custom YouTube thumbnail design"
- "packaging design freelancer Delhi NCR"
- "book cover design India" / "book layout designer"
- "DTP operator freelance Delhi"
- "affordable graphic design Delhi NCR"

### 3.2 Where keywords should naturally appear (never force-stuffed)
- Page `<title>` and meta description (see §1.3 above)
- The main `<h1>` on each page
- Naturally in the first paragraph of visible text
- Image `alt` text (e.g. `alt="Custom YouTube thumbnail design sample by Going Beyond, Delhi"` instead of a generic or empty `alt`) — this also helps Google Images traffic, which is a real source of clicks for a visual business like this.
- Portfolio captions/descriptions, if added

### 3.3 Content gap: dedicated service detail
Right now pricing/services live in one grid on the homepage. Search engines and AI answer engines reward pages that go *deep* on one topic. Consider (as a future content project, not urgent): a short paragraph or two per major service category directly on the homepage or portfolio page — what it is, typical turnaround, what the client needs to provide — rather than just a name + price. This also doubles as the answer-first content AI Overviews/ChatGPT pull from when someone asks "who does poster design in Delhi."

### 3.4 Blog / Tips section (already in `ROADMAP.md`, elaborating here)
A simple, occasional blog post ("5 things to send your designer before ordering a poster," "How to prep a book manuscript for layout") does two SEO jobs at once: targets extra long-tail keywords, and gives Google fresh content signals that a purely static 8-page site doesn't generate on its own. Not urgent — low priority, but worth keeping on the list since it compounds over time.

---

## 4. Structured Data (Schema Markup)

Structured data is a block of JSON added to a page that explicitly tells Google (and AI answer engines) facts about the business, rather than making them guess from prose. Add a `LocalBusiness` schema block to `index.html`'s `<head>` (as `<script type="application/ld+json">`):

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Going Beyond",
  "image": "https://goingbeyond.netlify.app/[a real photo/logo URL]",
  "description": "Freelance DTP and graphic design services in Delhi NCR — posters, YouTube thumbnails, packaging design, and book layout.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Burari, Delhi",
    "addressRegion": "Delhi NCR",
    "addressCountry": "IN"
  },
  "telephone": "+91-83681-25261",
  "email": "gauravadhikari9289@gmail.com",
  "url": "https://goingbeyond.netlify.app",
  "priceRange": "₹₹",
  "areaServed": "Delhi NCR"
}
```
Notes:
- Use the exact same phone number/address format as the Google Business Profile (§2) — consistency matters here too.
- If the business is service-area-only (no public walk-in address), it's fine to omit a street address and rely on `areaServed` — don't publish a home address if that's not desired.
- Google's Rich Results Test tool can validate this JSON once it's added to a page.
- A matching `Service` schema block per major offering (Poster Design, Packaging Design, etc.) can be added later as a refinement — not required to start.

---

## 5. Off-Page SEO (Slower, Ongoing)

- **Backlinks:** ask past clients (especially any business clients — shops, YouTubers, authors) if they'd link to "Going Beyond" from their own site/channel description when crediting the designer. A handful of genuine, relevant backlinks matter far more than many low-quality ones.
- **Social profiles:** keep Instagram (already linked in the footer) active and consistent — bio should include the same NAP details, and posts showcasing finished work double as portfolio content that can also be linked from the website.
- **Directory listings:** list the business on relevant free directories (JustDial, Sulekha, IndiaMART for design/print services) with identical NAP details — these act as additional trust/citation signals for local SEO, similar in spirit to the Google Business Profile.
- **Reviews everywhere, not just Google:** the same review-asking habit from §2 applies to Instagram/WhatsApp Business/any directory listing used.

---

## 6. Monitoring — Set This Up Once, Check Monthly

- [ ] **Google Search Console** (already tracked in `ROADMAP.md`) — register the site, submit the sitemap from §1.1, and check the "Coverage" and "Performance" reports monthly to see what's actually indexed and what people are searching to find the site.
- [ ] **Google Analytics** (or a simpler privacy-friendly alternative) — see which pages get traffic and from where; this also validates whether the SEO work above is working.
- [ ] Re-check Google Business Profile insights (views, calls, direction requests) monthly alongside the above.

None of this monitoring requires code changes — Search Console verification can be done via a DNS/meta-tag method without touching the site's HTML beyond one verification tag, and Analytics is a small script snippet addition when it's time to implement.

---

## What This File Deliberately Does Not Cover

- Paid ads (Google Ads / Meta Ads) — a different budget-based channel, not SEO.
- The UPI/payment page — intentionally out of scope right now per current project priorities (see `ROADMAP.md`).
- Actual code changes — this file is the plan; implementing titles/meta tags/sitemap/schema in the HTML is a separate, later step.

---

**Guidance for whoever implements this next:** don't try to do all of §1–§6 in one sitting. Phase 1 (technical: sitemap, robots.txt, unique titles/descriptions, favicon) gives the fastest, most certain win and touches only the `<head>` of each page. Phase 2 (Google Business Profile) needs zero code at all and can be done in parallel, today, by the business owner alone. Phases 3–5 are ongoing habits, not one-time tasks.
