# Landing Page Taste-Skill Redesign (One Motif) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the IndoTunnel landing page (`/`) under the `one-motif` art direction from taste-skill v2, with GSAP motion, passing `lint.mjs` and `inspect.mjs`.

**Architecture:** `app/page.tsx` stays a thin composer. Each section is its own component in `components/landing/`. A shared `arch.tsx` supplies the tunnel-arch motif (clip-path) used at four scales; a shared `motion.tsx` supplies the GSAP setup helper. Visual tokens live in `app/globals.css`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, `lucide-react`, GSAP 3 + `@gsap/react`, General Sans (Fontshare CDN).

**Spec:** `docs/superpowers/specs/2026-10-15-landing-taste-redesign-design.md`

## Global Constraints

- Palette stays dark devtool: ground `#0b0f14`, ink `#f4f6f8`, accent emerald. One ground, one ink, one accent. Surface = a small step in tone, never a line or a shadow.
- Exactly one typeface: General Sans, loaded from `https://api.fontshare.com/v2/css?f[]=general-sans@400,500,700&display=swap`. No `font-mono` outside `<pre>`/`<code>`.
- Banned everywhere (taste-skill house rules): gradients, box-shadow on resting elements, glows, pill badges above a headline, uppercase letter-spaced micro-labels, `01`/`02`/`03` index numbering, thin rules / hairline dividers, violet/indigo, emoji as UI, rows of identical icon-topped cards, glass / backdrop-blur panels.
- Every headline (`h1`–`h6`, and the hero's main line whatever its tag) is two lines or fewer at every width, and contains no styled accent word.
- Body text is 16px or more; running text uses the full ink, not a soft grey. Grey is for secondary notes only.
- The motif is the arch (tunnel mouth), from `clip-path`. One motif only — no second shape.
- Section spacing is 120–220px on desktop; neighbouring sections must not share a layout; no section is a card grid.
- Motion: GSAP only, `transform` / `opacity` / `clip-path` only, wrapped in `gsap.matchMedia()` under `(prefers-reduced-motion: no-preference)`. Under `reduce`, content is fully visible with no travel.
- No content may be hidden when JavaScript fails: the hidden pre-animation state applies only under a `html.js` class set by an inline script.
- Working directory for all commands: `apps/dashboard`.
- Every task's verification is `npm run build` and `npx tsc --noEmit` (UI-only project; no test framework), plus the skill gates where named.

## Review Focus

- **Reduced motion:** with `prefers-reduced-motion: reduce`, every section's content is visible at its end state, no element at `opacity: 0`, no pinned or scrubbed motion. Owned by Task 2 and re-checked in Task 12.
- **No-JS:** with JavaScript disabled, all section text is readable (the `html.js` gate is the only thing that hides pre-animation state). Owned by Task 2.
- **Headline line count:** the hero `h1` and every section heading is two lines or fewer at 1440, 768 and 390 px. Owned by the section tasks and measured by `inspect.mjs` in Task 12.
- **Accordion / pricing / FAQ keyboard use:** each is operable by keyboard with visible focus and correct ARIA. Owned by Tasks 6, 8, 9.
- **Contrast:** every text run meets WCAG AA (4.5:1) against its ground. Owned by Task 2's tokens and measured by `inspect.mjs` in Task 12.

---

### Task 1: Foundation — font, tokens, motif, motion helper

**Files:**
- Modify: `apps/dashboard/app/layout.tsx`
- Modify: `apps/dashboard/app/globals.css`
- Create: `apps/dashboard/components/landing/arch.tsx`
- Create: `apps/dashboard/components/landing/motion.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - General Sans loaded for the whole app.
  - CSS custom properties `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-muted`, `--accent`, `--accent-ink`, `--ease-out`, `--ease-soft`, `--t-press`, `--t-hover`, `--t-ui`, `--t-reveal`, and the type steps `--step-small`, `--step-body`, `--step-lead`, `--step-head`, `--step-display`.
  - `.arch-top` utility (a top-corner arch cut via `clip-path`).
  - `Arch({ children, className })` — a div whose top-left corner is cut with the arch shape.
  - `useReveal(ref, selector)` and `shutter(el)` in `motion.tsx` (exact signatures in Step 4).

- [ ] **Step 1: Load General Sans in `app/layout.tsx`**

Remove the `Geist` / `Geist_Mono` imports and their `next/font` setup. In `<head>`, add the Fontshare preconnects and stylesheet link:
`<link rel="preconnect" href="https://api.fontshare.com">`, `<link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>`, `<link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,700&display=swap" rel="stylesheet">`.
Keep `<html lang="en">`, `metadata`, and the `MotionConfig` wrapper around `children` in `<body>`. Set `<body>` class to `font-sans antialiased` only (no font-variable classes).

- [ ] **Step 2: Rewrite `app/globals.css` tokens and remove banned CSS**

Keep `@import "tailwindcss";` and the existing shadcn-compatible `:root` / `@theme inline` blocks (the dashboard uses them) but:
- Add the token block from the spec section 5: `--bg: #0b0f14`, `--surface: #12171f`, `--surface-2: #171d27`, `--ink: #f4f6f8`, `--ink-muted: #9aa4b2`, `--accent: #10b981`, `--accent-ink: #04140d`, and the motion tokens `--ease-out: cubic-bezier(0.22,1,0.36,1)`, `--ease-soft: cubic-bezier(0.33,1,0.68,1)`, `--t-press: 140ms`, `--t-hover: 180ms`, `--t-ui: 240ms`, `--t-reveal: 800ms`.
- Add the fluid type steps: `--step-small: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)`, `--step-body: clamp(1rem, 0.96rem + 0.2vw, 1.125rem)`, `--step-lead: clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)`, `--step-head: clamp(2rem, 1.3rem + 3.2vw, 4rem)`, `--step-display: clamp(3.25rem, 1.6rem + 6.6vw, 8rem)`.
- Map `--font-sans` to `"General Sans", ui-sans-serif, system-ui, sans-serif` in `@theme inline`; delete the `--font-mono` mapping to Geist and set `--font-mono` to a plain `ui-monospace, SFMono-Regular, Menlo, monospace`.
- Delete `.glow-emerald`, `.glow-cyan`, `.bg-noise`, `.bg-grid-pattern`, the `.reveal` block and its `@supports`, and the `shimmer` / `pulse-glow` / `grid-drift` keyframes. Keep `fade-up` only if `motion.tsx` uses it; otherwise delete it too.
- Add `.arch-top { clip-path: path(...); }` OR implement the arch with `border-top-left-radius` plus a `clip-path: polygon()` — pick one and use it in `arch.tsx`. (Arch shape: a rectangular block whose top-left corner is replaced by a quarter-circle of radius equal to ~18% of the block width. Use `clip-path: polygon()` with a quarter-circle approximated by two points, or an inline SVG path; the implementer chooses the simpler that renders identically in Chrome.)
- Keep the `prefers-reduced-motion: reduce` global block and the scrollbar rules.

- [ ] **Step 3: Create `components/landing/arch.tsx`**

Export `Arch({ children, className }: { children: React.ReactNode; className?: string })` — a `<div>` with the arch top-left cut applied via the `.arch-top` class, merging `className`. Server Component (no `"use client"`). This is the single source of the motif shape.

- [ ] **Step 4: Create `components/landing/motion.tsx`**

Add `"use client"`. Import `gsap`, `ScrollTrigger`, `useGSAP` from `@gsap/react`. Register the plugin once: `gsap.registerPlugin(ScrollTrigger, useGSAP)`.
Export:
- `useReveal<T extends HTMLElement>(ref: React.RefObject<T>, selector: string)` — runs a `useGSAP` scope that, only inside `gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", ...)`, sets each element matching `selector` to `{ opacity: 0, y: 24 }` and animates to `{ opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }` with a `ScrollTrigger` at `start: "top 80%"`, `once: true`. Under reduced motion the elements are left untouched (visible).
- `shutter(el: Element)` — sets `clipPath: "inset(0 0 100% 0)"`, `scale: 1.12` then animates to `clipPath: "inset(0)"`, `scale: 1`, `duration: 1.1`, `ease: "power2.inOut"`. Called only inside the no-preference matchMedia block.

- [ ] **Step 5: Verify build and typecheck**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0. The page still renders the old components (unchanged) at this point.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/app/layout.tsx apps/dashboard/app/globals.css apps/dashboard/components/landing/arch.tsx apps/dashboard/components/landing/motion.tsx
git commit -m "feat(landing): taste-skill foundation - General Sans, tokens, arch motif, GSAP helper"
```

---

### Task 2: Plain navigation bar

**Files:**
- Modify: `apps/dashboard/components/landing/site-header.tsx`

**Interfaces:**
- Consumes: tokens from Task 1.
- Produces: `SiteHeader()` — Client Component (mobile menu state). Same export name as now.

- [ ] **Step 1: Rebuild `site-header.tsx`**

Remove all glass / glow / pill styling. A plain bar: wordmark "IndoTunnel" left (General Sans, no mono, no `v1.0` pill badge), four text links right (`Features` → `#features`, `How it works` → `#how-it-works`, `Pricing` → `#pricing`, `FAQ` → `#faq`), one action link `Dashboard` → `/dashboard`. Keep the mobile hamburger with `aria-expanded` + `aria-controls="mobile-nav"` and Escape-to-close. Remove the `backdrop-blur`, the `border-b` on the header itself (separate with space, not a line), and the scroll listener's blur switch — replace with a solid `--bg` background when scrolled, transparent at top, transition on `background-color` only.

- [ ] **Step 2: Verify build, typecheck, and keyboard**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: `npm run dev`, Tab to the hamburger, Enter opens the panel, Escape closes it.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/site-header.tsx
git commit -m "feat(landing): plain navigation bar"
```

---

### Task 3: Hero — fragment on a shaped stage

**Files:**
- Modify: `apps/dashboard/components/landing/hero.tsx`
- Modify: `apps/dashboard/components/landing/terminal-demo.tsx` (add `data-ui`, drop mono-only styling)

**Interfaces:**
- Consumes: `Arch` (Task 1), `useReveal` and `shutter` (Task 1), `TerminalDemo`.
- Produces: `Hero()` — Client Component.

- [ ] **Step 1: Rebuild `hero.tsx`**

Layout per spec section 4.1 and the direction sheet hero: headline occupies the upper-left third, two lines maximum, flush left on a 40px margin, at `--step-display`; one supporting sentence at `--step-body`, max 40ch; one primary action button (`Get Started Free` → `/signup`) as a small rectangle. Below/right, one flat stage in the accent colour shaped by `Arch`, bleeding off the right and bottom edges, holding the `TerminalDemo` fragment cropped by the bottom edge (not a whole window, no device frame). Headline copy stays: "Expose localhost to the internet in seconds." — split into two authored lines with the masked-line markup so it is exactly two lines at desktop. Remove the pill badge, the trust row of dots, and the gradient overlay.
Apply the shutter to the stage: the stage element gets `data-shutter`, and `useReveal` on `[data-rise]` for the headline, sentence, and button. Call `shutter(stageRef.current)` inside the no-preference matchMedia block only.

- [ ] **Step 2: Add `data-ui` to `terminal-demo.tsx`**

Put `data-ui` on the root element of `TerminalDemo` and on any nested panel root so the inspector treats its borders as a real interface fragment. Remove `font-mono` from labels that are not code (keep it on the `<pre>` blocks and the command text). Keep the interactive "Trigger Request" button and the tab switch — this is the page's live thing.

- [ ] **Step 3: Verify build, typecheck, and no overflow**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: `npm run dev` at 390px and 1440px — the headline is two lines, the stage bleeds off the right and bottom, no horizontal page scroll.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/components/landing/hero.tsx apps/dashboard/components/landing/terminal-demo.tsx
git commit -m "feat(landing): hero fragment on a shaped stage with shutter"
```

---

### Task 4: Features — mosaic board

**Files:**
- Modify: `apps/dashboard/components/landing/features.tsx`

**Interfaces:**
- Consumes: tokens (Task 1), `useReveal` (Task 1).
- Produces: `Features()` — Server Component.

- [ ] **Step 1: Rebuild `features.tsx`**

A 12-column grid (`grid-flow-dense`), no empty cells, 8px gaps. Six tiles at mixed spans; each tile is a flat surface step holding one enlarged real UI element built in HTML (a status word on its block, one readout figure, a toggle, a pair of key caps, a slider thumb on its track, three stacked initials discs) plus, bottom-left, the capability name at 18px medium and one line at 15px. Keep the six capability names verbatim: Instant Subdomains, Webhook Replaying, Ultra Low Latency, Token Authorization, Traffic Metrics & Logs, WebSocket Support, with their existing one-line descriptions. One tile carries only the heading "Built for high-speed engineering" (no eyebrow). No icons, no identical icon-topped cards, no borders, no shadows.

- [ ] **Step 2: Verify build, typecheck, and grid density**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: at 1440px, confirm the grid has no empty cell and every tile is filled.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/features.tsx
git commit -m "feat(landing): features as a gapless mosaic board"
```

---

### Task 5: How it works — accordion of tinted panels

**Files:**
- Create: `apps/dashboard/components/landing/how-it-works.tsx`
- Delete: `apps/dashboard/components/landing/quickstart.tsx`

**Interfaces:**
- Consumes: tokens (Task 1), `useReveal` (Task 1).
- Produces: `HowItWorks()` — Client Component (accordion state). Section id `how-it-works`.

- [ ] **Step 1: Create `how-it-works.tsx`**

Two-column intro (heading "Three steps to a public URL" in the left columns; one paragraph in the right columns), then a horizontal accordion of three panels, no gaps. Each panel is a flat tint of the accent hue, dark to light left to right; a closed panel shows only its step name rotated 90° reading upward; the open panel shows the name, a short paragraph, and its command. Content is the existing quickstart copy: step 1 "Run via NPX or CLI" (`npx indotunnel 3000`), step 2 "Instant Public URL" (`https://*.indotunnel.id`), step 3 "Inspect & Replay" (`/dashboard`). The first panel is open on load. Each panel header is a `<button>` with `aria-expanded` and `aria-controls`; opening one closes the others; keyboard operable; visible focus. On mobile the accordion stacks vertically as full-width bars. Remove all `01`/`02`/`03` numbering.

- [ ] **Step 2: Verify build, typecheck, and keyboard**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: Tab through the three panel headers, Enter/Space opens each, focus is visible, only one is open at a time.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/how-it-works.tsx
git rm apps/dashboard/components/landing/quickstart.tsx
git commit -m "feat(landing): how-it-works as a tinted accordion"
```

---

### Task 6: Showcase — object on an arch

**Files:**
- Create: `apps/dashboard/components/landing/showcase.tsx`
- Delete: `apps/dashboard/components/landing/ai-section.tsx`

**Interfaces:**
- Consumes: `Arch` (Task 1), tokens (Task 1), `useReveal` (Task 1).
- Produces: `Showcase()` — Client Component (selection state). Section id `showcase`.

- [ ] **Step 1: Create `showcase.tsx`**

One section about a viewport tall. A flat filled arch (the motif at large scale, one accent or surface step) with a real interface fragment standing in front of it: the HTTP inspector from `terminal-demo.tsx`, marked `data-ui`. To its left, a vertical list of four to six item names at `clamp(28px, 2.9vw, 44px)` — the heading "Inspect every request" is the first line, then real request rows (e.g. `POST /api/webhooks/stripe`, `GET /healthz`, `POST /api/auth/callback`). Selecting a row swaps the fragment's contents (300ms crossfade). Selected row is full ink; unselected rows are `--ink-muted` at full strength (never faded below AA). Each row is a `<button>`. One fact about the selected request sits beside the arch at 17px.

- [ ] **Step 2: Verify build, typecheck, and selection**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: click and keyboard-select each row; the fragment swaps; contrast of unselected rows is readable.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/showcase.tsx
git rm apps/dashboard/components/landing/ai-section.tsx
git commit -m "feat(landing): showcase as object on an arch"
```

---

### Task 7: Pricing — plan names, one live figure

**Files:**
- Modify: `apps/dashboard/components/landing/pricing.tsx`

**Interfaces:**
- Consumes: tokens (Task 1), `useReveal` (Task 1).
- Produces: `Pricing()` — Client Component (plan selection). Section id `pricing`.

- [ ] **Step 1: Rebuild `pricing.tsx`**

Replace the three-card grid. Left columns: the three plan names (Free, Developer, Team) stacked at about 5vw as `<button>`s; the selected name is full ink with a solid accent dot at its left; the others are `--ink-muted`. Right columns: one stage that stays in place while its contents change — the selected plan's price at about 9vw, the period beside it at 18px, a three-to-four-line paragraph of what the plan includes, and one rectangular button. Keep the existing content verbatim: Free `$0` "/ forever free" with its six features; Developer "Coming Soon" with its five features; Team "Coming Soon" with its four features. Free's button is `Get Started Free` → `/signup`; the other two are disabled "Coming Soon". The middle plan (Developer) is selected on load. Selection follows click and keyboard focus; the figure's position never moves. No heading and no eyebrow — the names are the heading. No borders, no shadows, no badges.

- [ ] **Step 2: Verify build, typecheck, and keyboard**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: Tab between plan names, the figure swaps without moving, Developer is selected on load.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/pricing.tsx
git commit -m "feat(landing): pricing as plan names with one live figure"
```

---

### Task 8: FAQ — tabbed stacked cards

**Files:**
- Create: `apps/dashboard/components/landing/faq.tsx`

**Interfaces:**
- Consumes: tokens (Task 1), `useReveal` (Task 1).
- Produces: `Faq()` — Client Component (open card state). Section id `faq`.

- [ ] **Step 1: Create `faq.tsx`**

A heading of two to four words ("Questions, answered"), then five stacked filled panels overlapping so each shows ~96px, each with a tab on its top edge cut with `clip-path: polygon()` so card and tab are one shape. The tab carries a one-or-two-word topic; the visible strip shows the question at 20px. Selecting a card expands it to show the answer at 17px over at most 50ch and pushes the rest down; one open at a time; the first is open on load. Each card header is a `<button>` with `aria-expanded` + `aria-controls`; keyboard operable; visible focus.
Write five real questions/answers in the project's voice, drawn from the spec and product docs: (1) "How does a tunnel work?" — the CLI opens a persistent connection to the gateway and public requests are forwarded to your local port. (2) "Is it free?" — yes, the Free plan has no expiry, 1 concurrent tunnel and 5,000 requests/day. (3) "Do I need a domain?" — no, you get a random `*.indotunnel.id` HTTPS subdomain. (4) "Can I replay webhooks?" — yes, captured requests can be replayed from the dashboard. (5) "Which protocols are supported?" — HTTP/1.1, HTTP/2, WebSocket and SSE.

- [ ] **Step 2: Verify build, typecheck, and keyboard**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: keyboard-open each card; only one open; answers readable.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/faq.tsx
git commit -m "feat(landing): FAQ as tabbed stacked cards"
```

---

### Task 9: CTA — first step, already open

**Files:**
- Create: `apps/dashboard/components/landing/cta.tsx`

**Interfaces:**
- Consumes: `Arch` (Task 1), tokens (Task 1).
- Produces: `Cta()` — Client Component (field + choice state).

- [ ] **Step 1: Create `cta.tsx`**

A full-bleed accent field ~90svh tall. Right columns, vertically centred: the product's own "create workspace" dialog at true size (440px), marked `data-ui`, with its real title ("Name your workspace"), one text field holding an editable believable example, a two-option segmented choice, and the page's primary button. Inside the fragment the product's conventions apply, including the dialog's shadow (the one place a shadow is allowed). The field accepts typing and the choice switches. Left columns, anchored to the bottom: the closing line "Start in seconds" at `clamp(56px, 7vw, 112px)` on two lines, and one sentence beneath at 17px. The upper-left stays empty. On mobile the closing line leads at 13vw and the dialog follows full-width.

- [ ] **Step 2: Verify build, typecheck, and interaction**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: type in the field, switch the segmented choice, the primary button is reachable.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/cta.tsx
git commit -m "feat(landing): closing CTA with an open create dialog"
```

---

### Task 10: Footer — the mark, built large

**Files:**
- Modify: `apps/dashboard/components/landing/site-footer.tsx`

**Interfaces:**
- Consumes: tokens (Task 1), `useReveal` (Task 1).
- Produces: `SiteFooter()` — Server Component.

- [ ] **Step 1: Rebuild `site-footer.tsx`**

On a flat field, close the page with the wordmark built from blocks: "INDOTUNNEL" (or "IndoTunnel") as inline SVG from flat rectangles, letters knocked out of solid blocks, blocks differing in height, 4px gaps, bottoms on one line. Below, four columns of plain links at 15px and two contact lines. A last row: copyright left, one small filled button right. Keep the existing footer links and the "IndoTunnel Gateways Operational" line and the copyright text. Remove the `animate-ping` dot, the mono styling, and the `Reveal` gradient treatment.

- [ ] **Step 2: Verify build and typecheck**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/site-footer.tsx
git commit -m "feat(landing): footer as a block-built wordmark"
```

---

### Task 11: Compose the page and wire the motion layer

**Files:**
- Modify: `apps/dashboard/app/page.tsx`
- Delete: `apps/dashboard/components/landing/reveal.tsx` (replaced by `motion.tsx`)

**Interfaces:**
- Consumes: every section from Tasks 2–10.
- Produces: final `page.tsx`.

- [ ] **Step 1: Reduce `app/page.tsx` to a composer**

Imports and structure only: `<SiteHeader />`, then `<main className="overflow-x-hidden w-full max-w-full">` containing `<Hero />`, `<Features />`, `<HowItWorks />`, `<Showcase />`, `<Pricing />`, `<Faq />`, `<Cta />`, and `<SiteFooter />`. Remove the fixed `bg-grid-pattern` overlay div, the `bg-[#080c14]` class (the ground is on `body` now), and every now-unused import. Section order in the page is: hero, features, how-it-works, showcase, pricing, faq, cta, footer.

- [ ] **Step 2: Add the `html.js` gate**

Add a one-line inline script in `app/layout.tsx` `<head>` (before the body): `document.documentElement.classList.add('js')`. Confirm every pre-animation hidden state in `globals.css` and `motion.tsx` is scoped to `.js` so no-JS users see all content.

- [ ] **Step 3: Delete the obsolete reveal wrapper**

`git rm apps/dashboard/components/landing/reveal.tsx`. Confirm no file still imports `@/components/landing/reveal` (grep for it).

- [ ] **Step 4: Verify build, typecheck, and the full page**

Run: `npm run build; npx tsc --noEmit`
Expected: both exit 0.
Manual: `npm run dev`; at 390/768/1440 the page has no horizontal scroll, every section reads, and scrolling triggers the section entrances once.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/app/page.tsx apps/dashboard/app/layout.tsx
git rm apps/dashboard/components/landing/reveal.tsx
git commit -m "refactor(landing): compose page from sections and wire the motion layer"
```

---

### Task 12: Gate — lint, inspect, look, fix

**Files:**
- Modify: whichever files the gate findings name.

**Interfaces:**
- Consumes: the whole page.
- Produces: a page with 0 FAIL from both gates.

- [ ] **Step 1: Run `lint.mjs`**

Run: `node "C:/Users/user/.agents/skills/design-taste-frontend/scripts/lint.mjs" apps/dashboard/app apps/dashboard/components/landing`
Expected: no `FAIL` lines. Fix every `FAIL` (each names the file, line and the banned pattern). Treat each `WARN` as wrong unless it can be defended in one sentence.

- [ ] **Step 2: Run `inspect.mjs`**

Start the dev server (`npm run dev`), then run:
`node "C:/Users/user/.agents/skills/design-taste-frontend/scripts/inspect.mjs" http://localhost:3000`
Expected: `0 FAIL` at 1440, 768 and 390. Fix every `FAIL` — headline line count, contrast, covered/clipped text, empty screens, motion count (`still-page` needs at least eight moving elements on desktop), horizontal overflow.

- [ ] **Step 3: Look at the screenshots**

Open every screenshot the inspector lists (in `.taste-skill/inspect/`) and critique them with `references/critique.md`. Write the critique down, fix the top three problems, re-run `inspect.mjs`, look again. Three rounds at most.

- [ ] **Step 4: Verify the reduced-motion and no-JS states**

Manual: with `prefers-reduced-motion: reduce` (DevTools → Rendering → Emulate CSS media feature), every section is fully visible with no travel. With JavaScript disabled, all text is readable.

- [ ] **Step 5: Commit**

```bash
git add -A apps/dashboard
git commit -m "fix(landing): pass the taste-skill lint and inspect gates"
```
