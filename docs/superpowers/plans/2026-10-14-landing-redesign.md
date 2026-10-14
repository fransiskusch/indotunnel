# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the IndoTunnel landing page (`/`) into a sharpened dark-devtool layout, split into per-section components with cinematic motion.

**Architecture:** `app/page.tsx` becomes a thin composer that renders one component per section from `components/landing/`. Visual tokens live in `app/globals.css`; shared motion wrappers live in `components/landing/reveal.tsx`. Server Components by default; only `hero.tsx`, `reveal.tsx`, and `terminal-demo.tsx` are Client Components.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, `lucide-react`, `motion` (framer-motion), `next/font` (Geist).

**Spec:** `docs/superpowers/specs/2026-10-14-landing-redesign-design.md`

## Global Constraints

- Do not change any user-facing copy. Text is copied verbatim from the current `apps/dashboard/app/page.tsx`; only structure, layout, and styling change.
- Section order is unchanged: Header → Hero → Quickstart → Features → AI → Pricing → Footer.
- Palette is unchanged: base `#080c14`, surfaces `slate-900/40`, borders `zinc-800`, emerald = primary accent, cyan = secondary accent, amber = status/warning only. No purple/blue accent icons.
- Only one new dependency: `motion`. No GSAP. No pinning or scroll-scrub.
- Animations must respect `prefers-reduced-motion: reduce`.
- Content must stay visible if JS fails (animate from visible-with-CSS fallback, never hide content permanently).
- Working directory for all commands: `apps/dashboard`.
- Every task's verification is `npm run build` and `npm run lint` (UI-only project; no test framework).

## Review Focus

- **Reduced motion**: a user with `prefers-reduced-motion: reduce` should see the full page immediately, with no element stuck at `opacity: 0`. Owned by Task 2.
- **Mobile navigation**: on a 375px-wide viewport the nav links must be reachable (currently they vanish). Owned by Task 3.
- **No-JS content visibility**: with JavaScript disabled, all section text should still be readable. Owned by Task 2.
- **Domain consistency**: the tunnel URL shown in the terminal demo currently mixes `app-dev.indotunnel.com` and `a8f2x.indotunnel.id`. One canonical host must appear. Owned by Task 8.
- **Layout shift**: the hero terminal demo must not jump or overflow horizontally on narrow viewports. Owned by Task 4.

---

### Task 1: Foundation — motion, fonts, and design tokens

**Files:**
- Modify: `apps/dashboard/package.json` (via install)
- Modify: `apps/dashboard/app/layout.tsx`
- Modify: `apps/dashboard/app/globals.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `motion` available as a dependency; Geist Sans applied to `<body>`; CSS custom properties `--surface`, `--surface-hover`, `--accent`, `--accent-2`; utility classes `.bg-noise`, `.glow-emerald`, `.glow-cyan`, `.bg-grid-pattern`, `.text-balance`; keyframes `fade-up`, `shimmer`, `pulse-glow`, `grid-drift`.

- [ ] **Step 1: Install `motion`**

Run: `npm install motion`
Expected: `motion` appears in `dependencies` in `package.json`; install exits 0.

- [ ] **Step 2: Add Geist fonts in `app/layout.tsx`**

Import `Geist` and `Geist_Mono` from `next/font/google`, instantiate with `variable: "--font-geist-sans"` / `"--font-geist-mono"` and `subsets: ["latin"]`, then set `className` on `<body>` to include both CSS variables plus `font-sans antialiased`. Keep the existing `metadata` object unchanged.

- [ ] **Step 3: Add tokens, keyframes, and utilities in `app/globals.css`**

Keep the existing `:root` block, `@theme inline` block, `body` rule, and scrollbar rules. Add:

- `--surface: 217 33% 11%` and `--surface-hover: 217 33% 14%` to `:root`, exposed via `@theme inline` as `--color-surface` / `--color-surface-hover`.
- `--font-sans: var(--font-geist-sans)` and `--font-mono: var(--font-geist-mono)` inside `@theme inline` so `font-sans` / `font-mono` resolve to Geist.
- `.text-balance { text-wrap: balance; }`
- `.bg-noise` — a subtle `background-image` using an inline SVG `feTurbulence` data URI at ~4% opacity.
- `@keyframes fade-up` (translateY(16px) + opacity 0 → 0), `@keyframes shimmer` (background-position sweep), `@keyframes pulse-glow` (box-shadow opacity), `@keyframes grid-drift` (background-position shift).
- `@media (prefers-reduced-motion: reduce)` block that sets `animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important` on `*`.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build; npm run lint`
Expected: both exit 0. The page renders unchanged at this point.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/package.json apps/dashboard/package-lock.json apps/dashboard/app/layout.tsx apps/dashboard/app/globals.css
git commit -m "feat(landing): add motion dep, Geist fonts, and design tokens"
```

---

### Task 2: Motion wrappers (`reveal.tsx`)

**Files:**
- Create: `apps/dashboard/components/landing/reveal.tsx`

**Interfaces:**
- Consumes: `motion` (Task 1).
- Produces:
  - `Reveal({ children, delay?: number, className?: string })` — Client Component that fades its children up on first viewport entry.
  - `Stagger({ children, className?: string })` and `StaggerItem({ children, className?: string })` — container/child pair for staggered grids.

- [ ] **Step 1: Create `reveal.tsx`**

Add `"use client"`. Import `motion` from `"motion/react"`. Implement `Reveal` as `motion.div` with `initial={{ opacity: 0, y: 24 }}`, `whileInView={{ opacity: 1, y: 0 }}`, `viewport={{ once: true, margin: "-80px" }}`, `transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}`.

Implement `Stagger` as `motion.div` with `initial="hidden"` / `whileInView="visible"` / `viewport={{ once: true, margin: "-80px" }}` and a `variants` object where `visible.transition.staggerChildren = 0.08`. `StaggerItem` uses `variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}` and `transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}`.

All three accept `className` and forward it. `children: React.ReactNode`.

- [ ] **Step 2: Verify reduced-motion and no-JS behavior**

Motion's `useReducedMotion` is not required here: the CSS override from Task 1 neutralizes transitions, and `whileInView` still resolves to the visible state. Confirm by reasoning against the `globals.css` media query — if `whileInView` leaves elements hidden under reduced motion, add `useReducedMotion()` and render `initial={false}` in that case. Document which branch you took in the commit message.

- [ ] **Step 3: Verify build and lint**

Run: `npm run build; npm run lint`
Expected: both exit 0. The file is not imported yet.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/components/landing/reveal.tsx
git commit -m "feat(landing): add Reveal and Stagger motion wrappers"
```

---

### Task 3: Header and footer components

**Files:**
- Create: `apps/dashboard/components/landing/site-header.tsx`
- Create: `apps/dashboard/components/landing/site-footer.tsx`
- Modify: `apps/dashboard/app/page.tsx` (replace the `<header>` block, lines 23–69, and the `<footer>` block, lines 453–464)

**Interfaces:**
- Consumes: `Reveal` (Task 2) for the footer.
- Produces: `SiteHeader()` and `SiteFooter()` — both Server Components except `SiteHeader`, which needs `"use client"` for the mobile menu state.

- [ ] **Step 1: Create `site-header.tsx`**

Add `"use client"`. Render the existing brand block (terminal icon, `IndoTunnel`, `v1.0` badge) and the four anchor links (`#features`, `#quickstart`, `#ai`, `#pricing`) verbatim. Add a hamburger button visible below `md:` that toggles a state variable and controls a dropdown panel holding the same four links plus `Sign In` and `Dashboard`. Give the button `aria-expanded={open}` and `aria-controls="mobile-nav"`; give the panel `id="mobile-nav"`. Close the panel on Escape and on link click. Add a scroll listener that adds a stronger background blur and a bottom border once `window.scrollY > 8`.

- [ ] **Step 2: Create `site-footer.tsx`**

Render three link columns (Product, Developers, Company) with placeholder-free anchors pointing at existing routes only (`/`, `/login`, `/signup`, `/dashboard`) and the section anchors. Keep the existing operational-status line and copyright line verbatim. Wrap the whole footer in `<Reveal>`.

- [ ] **Step 3: Wire into `app/page.tsx`**

Replace the inline `<header>` block with `<SiteHeader />` and the inline `<footer>` block with `<SiteFooter />`. Remove the now-unused `lucide-react` imports from `page.tsx` (keep `Terminal` and `ArrowRight` only if still referenced elsewhere in the file; otherwise remove them). Add the imports for both new components.

- [ ] **Step 4: Verify build, lint, and mobile nav**

Run: `npm run build; npm run lint`
Expected: both exit 0.
Manual: `npm run dev`, open at 375px width, tap the hamburger — all four links, `Sign In`, and `Dashboard` are reachable; Escape closes the panel.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/components/landing/site-header.tsx apps/dashboard/components/landing/site-footer.tsx apps/dashboard/app/page.tsx
git commit -m "feat(landing): extract header with mobile nav and footer"
```

---

### Task 4: Hero component

**Files:**
- Create: `apps/dashboard/components/landing/hero.tsx`
- Modify: `apps/dashboard/app/page.tsx` (replace the hero `<section>`, lines 73–111)

**Interfaces:**
- Consumes: `Reveal` (Task 2), `TerminalDemo` from `@/components/landing/terminal-demo`.
- Produces: `Hero()` — a Client Component (uses `useScroll`/`useTransform`).

- [ ] **Step 1: Create `hero.tsx`**

Add `"use client"`. Copy the hero content verbatim: the pill badge, the `h1` ("Expose localhost to the internet in seconds."), the description paragraph, the command chip showing `$ npx indotunnel 3000`, and the "Get Started Free" link to `/signup`.

Changes:
- Enlarge the `h1` scale (e.g. `text-5xl sm:text-6xl lg:text-7xl`) and add `text-balance`.
- Make the command chip a `button` that copies `npx indotunnel 3000` to the clipboard and swaps to a check icon for 2s (reuse the pattern already in `terminal-demo.tsx`).
- Add a trust row under the CTAs: "Free to start", "No credit card", "Gateways in Indonesia".
- Wrap content in `<Reveal>` with staggered delays.
- Add `const { scrollY } = useScroll()` and derive a small parallax `y` for the background grid layer and the `<TerminalDemo />` wrapper with `useTransform`.

- [ ] **Step 2: Verify no layout shift**

Run: `npm run build; npm run lint` → both exit 0.
Manual: `npm run dev`; at 375px width confirm the hero and terminal demo do not overflow horizontally and do not jump on load.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/hero.tsx apps/dashboard/app/page.tsx
git commit -m "feat(landing): extract hero with parallax and copy chip"
```

---

### Task 5: Quickstart timeline

**Files:**
- Create: `apps/dashboard/components/landing/quickstart.tsx`
- Modify: `apps/dashboard/app/page.tsx` (replace the `#quickstart` `<section>`, lines 113–172)

**Interfaces:**
- Consumes: `Stagger`, `StaggerItem` (Task 2).
- Produces: `Quickstart()` — Server Component.

- [ ] **Step 1: Create `quickstart.tsx`**

Copy the three steps verbatim (titles, descriptions, command snippets). Replace the uniform three-card grid with a connected timeline: a horizontal connector line on `md:` and up, a vertical connector on mobile, numbered markers (`01`, `02`, `03`) on the line. Use emerald for all three markers and step numbers — no per-step purple/cyan differentiation. Wrap the steps in `<Stagger>` with each step as a `<StaggerItem>`.

- [ ] **Step 2: Verify build and lint**

Run: `npm run build; npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/quickstart.tsx apps/dashboard/app/page.tsx
git commit -m "feat(landing): rebuild quickstart as a connected timeline"
```

---

### Task 6: Features bento grid

**Files:**
- Create: `apps/dashboard/components/landing/features.tsx`
- Modify: `apps/dashboard/app/page.tsx` (replace the `#features` `<section>`, lines 174–251)

**Interfaces:**
- Consumes: `Stagger`, `StaggerItem` (Task 2).
- Produces: `Features()` — Server Component.

- [ ] **Step 1: Create `features.tsx`**

Copy all six feature titles and descriptions verbatim. Lay them out as an asymmetric bento grid: the first card (`Instant Subdomains`) spans two columns on `lg:` and carries a larger icon; the remaining five fill a `lg:grid-cols-3` grid. All icons use emerald (`text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/20`) — remove the purple, amber, and blue icon tints. Wrap the grid in `<Stagger>` with each card as a `<StaggerItem>`. Give cards a hover state that lifts the border to `border-emerald-500/40` and slightly raises the surface.

- [ ] **Step 2: Verify build and lint**

Run: `npm run build; npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/landing/features.tsx apps/dashboard/app/page.tsx
git commit -m "feat(landing): rebuild features as a bento grid"
```

---

### Task 7: AI section and pricing

**Files:**
- Create: `apps/dashboard/components/landing/ai-section.tsx`
- Create: `apps/dashboard/components/landing/pricing.tsx`
- Modify: `apps/dashboard/app/page.tsx` (replace the `#ai` `<section>`, lines 253–300, and the `#pricing` `<section>`, lines 302–451)

**Interfaces:**
- Consumes: `Reveal`, `Stagger`, `StaggerItem` (Task 2).
- Produces: `AiSection()` and `Pricing()` — both Server Components.

- [ ] **Step 1: Create `ai-section.tsx`**

Copy the three AI cards verbatim. Keep the section heading and eyebrow. Add a radial emerald spotlight behind the section (`bg-[radial-gradient(...)]`) so it reads differently from the plain features section. Unify icon tints to emerald; wrap the grid in `<Stagger>`.

- [ ] **Step 2: Create `pricing.tsx`**

Copy all three tiers verbatim, including the exact limits (`1 Concurrent Tunnel`, `5,000 Requests / day`, `10 GB Bandwidth / month`, and the Developer/Team lists), the `Coming Soon` badges, and the disabled button states. Preserve the featured treatment on the Developer tier. Improve hierarchy: larger price display, clearer separation between tier name, price, and feature list; keep the `Free` CTA linking to `/signup`. Wrap the grid in `<Stagger>` with each tier as a `<StaggerItem>`.

- [ ] **Step 3: Verify build and lint**

Run: `npm run build; npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/components/landing/ai-section.tsx apps/dashboard/components/landing/pricing.tsx apps/dashboard/app/page.tsx
git commit -m "feat(landing): extract AI section and pricing"
```

---

### Task 8: Compose the page and polish the terminal demo

**Files:**
- Modify: `apps/dashboard/app/page.tsx` (final composition)
- Modify: `apps/dashboard/components/landing/terminal-demo.tsx`

**Interfaces:**
- Consumes: every section component from Tasks 3–7.
- Produces: final `page.tsx` under ~40 lines.

- [ ] **Step 1: Reduce `app/page.tsx` to a composer**

The file should contain only: imports, the outer `<div>` with the base background and the fixed `.bg-grid-pattern` overlay, `<SiteHeader />`, `<main>` with `<Hero />`, `<Quickstart />`, `<Features />`, `<AiSection />`, `<Pricing />`, and `<SiteFooter />`. Remove every now-unused import. Confirm no `lucide-react` icon remains imported in `page.tsx`.

- [ ] **Step 2: Fix domain consistency in `terminal-demo.tsx`**

The demo currently shows `https://a8f2x.indotunnel.id` (CLI tab) and `Host: app-dev.indotunnel.com` (inspector tab). Make both use the same canonical host: `a8f2x.indotunnel.id`. Also update the `STATUS: ONLINE` gateway host only if it already matches that domain scheme — do not invent a new gateway hostname.

- [ ] **Step 3: Verify build, lint, and the full page**

Run: `npm run build; npm run lint`
Expected: both exit 0.
Manual: `npm run dev` and check at 375px, 768px, and 1440px widths — no horizontal scroll, header mobile menu works, every section reads cleanly, and enabling "reduce motion" in the OS renders the full page with no hidden content.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/app/page.tsx apps/dashboard/components/landing/terminal-demo.tsx
git commit -m "refactor(landing): compose page from sections and fix demo host"
```
