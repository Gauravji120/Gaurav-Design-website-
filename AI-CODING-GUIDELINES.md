# AI Coding Guidelines

> Practices for keeping AI-assisted changes to this project lean, reviewable, and cheap to maintain. Read alongside `ARCHITECTURE.md` before making changes — this file is about *how* changes should be written, not *what* the system does.

---

## 1. The Problem: AI Code Bloat

AI coding assistants are trained to be "helpful," which often turns into **over-completion**. A simple request like "fix this bug" or "add validation" can silently turn into validation + logging + retries + extra typing + docs + tests + cleanup — most of which was never asked for. Models have also seen millions of enterprise codebases, so they default to patterns like managers, services, providers, and wrapper layers even when a plain function would do. The net effect: what should be a 1-line change becomes a 10-line (or more) change, using more tokens, more review time, and more surface area for bugs.

## 2. Signs of Bloat to Watch For

- A one-line fix comes back as a new helper function, a new file, or a new abstraction layer.
- **Speculative abstractions** — structure built for a future requirement that doesn't exist yet (e.g. a `PaymentStrategyFactory` for a single, simple payment path).
- Try-catch blocks around nearly every line, or defensive branches for cases that can't actually happen here.
- Comments that just restate what the code already says.
- New imports or dependencies that weren't there before, for something the existing code could already do.
- A new duplicate helper instead of editing/reusing the existing one.

## 3. Why It Matters (Not Just Line Count)

- Every extra line has to be reviewed, understood, secured, and maintained — bloat is a recurring cost, not a one-time annoyance.
- Verbose output also means higher token usage per change, and a bigger diff becomes part of the context for the *next* change, making future sessions slower to steer.
- More surface area (new deps, new abstractions) means more places a bug or a security issue can hide — see `Safety and security.md`.

## 4. How to Prompt for Leaner Code

- Give **scope constraints** — explicitly say what the AI should *not* do, not just what it should do.
- Use the word "concise" directly in the request — simply asking for concise code measurably reduces unnecessary output.
- Pair positive and negative examples, e.g.:
  - *Avoid:* try-catch on every line, nested if-else beyond 2 levels, unnecessarily long variable names.
  - *Prefer:* early returns, guard clauses, reusing existing helpers.
- Break big asks into smaller, single-responsibility requests instead of one vague "clean this up" or "improve this" prompt.
- For a new feature: ask for the smallest working version first. Only ask for a second "optimize / reduce lines" pass if it's actually needed — it's much easier to add complexity later than to strip it out of something already bloated.

## 5. Review Habit (Do This After Every AI-Made Change)

Before accepting a change, check:
- Does this do exactly what was asked — or did new "bonus" behavior sneak in?
- Are there any new files, imports, or dependencies that weren't there before? Every new import is one more thing to trust and maintain.
- Could this same result be written with fewer lines, using something that already exists in the repo, instead of something new?

If the answer suggests bloat, ask directly: *"List every part of this change and mark which parts I actually asked for."* This alone often produces a cleaner, self-corrected version.

## 6. Applying This to Going Beyond

- This project deliberately uses plain HTML/CSS/vanilla JS with no framework, and thin Netlify Functions per endpoint (see `ARCHITECTURE.md`) — any AI-assisted change should match that existing simplicity, not introduce a framework, build step, or abstraction layer on top of it.
- When asking for a fix or small feature, request the smallest diff that solves it, reusing existing shared helpers (`netlify/lib/*.mts`) instead of creating new near-duplicate ones.
- After any AI-assisted change lands, do a quick pass: does the size of the diff match the size of the ask? If a one-line bug fix turned into several new functions or files, that's a signal to simplify before merging.

---

**Goal:** the smallest, clearest change that actually solves the problem — not the most complete-looking one.
