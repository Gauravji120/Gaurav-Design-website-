# Deployment

> How this project ships to production, and what to check when something goes wrong. This is a GitHub → Netlify auto-deploy setup — there is no separate staging environment (see `README.md`).

---

## How a Deploy Happens

1. A commit is pushed to the `main` branch on GitHub (`Gauravji120/Gaurav-Design-website-`).
2. Netlify automatically detects the push and starts a new build.
3. Netlify builds the static HTML/CSS/JS pages and the `netlify/functions/*.mts` serverless functions together.
4. On success, Netlify creates a new **atomic deploy** and switches the live site (`https://goingbeyond.netlify.app`) to it.
5. There is no manual approval step — every push to `main` goes live automatically.

## Before Pushing to Main

- Confirm the environment variables a change depends on are already set in Netlify (see `ENVIRONMENT-VARIABLES.md`) — a missing variable fails silently in some functions rather than erroring loudly.
- Run through the relevant section of `TESTING.md` for whatever the change touches.
- For anything touching RLS, auth, or money (price/coupon/loyalty logic), double-check against `Safety and security.md` before pushing.

## After Pushing

- Check the Netlify deploy log to confirm the build succeeded and picked up the expected number of functions — a past incident involved functions silently not deploying (see `INCIDENT-LOG.md` and `CHANGELOG.md`'s Core Backend Build entry).
- Do a quick smoke test on the live site: load the homepage, toggle the theme, and check the page(s) the change touched.

## Rolling Back

Netlify keeps every previous deploy as an atomic, immutable snapshot. If a deploy causes a problem:

1. Go to the Netlify dashboard → the site's **Deploys** tab.
2. Find the last known-good deploy in the list.
3. Use **Publish deploy** (sometimes shown as a rollback option) on that older deploy — this instantly repoints the live site to it, with no rebuild needed.
4. Fix the issue in a new commit and push again once ready — don't leave the site pinned to an old deploy long-term, since it will drift from `main`.

## Known Constraints

- **No staging environment** — changes are tested locally/manually and then verified directly against production, per `README.md` and `PRD.md` §7.
- **Netlify free-tier build/function credit limits** — batch multiple small changes into fewer pushes where practical, since every push triggers a full build (see `README.md`'s Known Operational Gotchas).
- **Supabase free-tier auto-pause** — if the database has been idle ~7 days, the first request after a deploy may be slow or fail while it wakes up; retry after a short wait.
