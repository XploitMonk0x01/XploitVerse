---
name: new-ui
description: Design and refactor the XploitVerse frontend (React 18 + TypeScript + Vite + Tailwind 3 + Framer Motion + Lucide) into a professional cyber-security platform UI at the quality level of TryHackMe and HackTheBox. Use when creating or editing any file under client/src (pages, components, layout, ui), changing tailwind.config.js theme tokens, or when the user says the UI looks AI-generated, generic, unpolished, cluttered, or "make it look like THM/HTB".
---

# XploitVerse Frontend Design

The goal is a **product UI**, not a demo. "Looks AI-generated" almost always means: too many glows, too many gradients, too many font sizes, inconsistent spacing, centered hero text everywhere, emoji icons, and no information density. Fix the system, not the individual screen.

## 0. Non-negotiables (check before finishing any task)

- Every color, radius, shadow, and font size comes from `tailwind.config.js` tokens. No arbitrary values like `text-[13.5px]`, `bg-[#1a1a2e]`, `shadow-[0_0_40px_#0f0]` in components.
- Max **2** font families: one UI sans (Inter / Geist), one mono (JetBrains Mono / IBM Plex Mono). Mono is for terminals, flags, IPs, ports, IDs, hashes — never for body copy or headings.
- Max **1** accent color used for action + state. Difficulty/severity colors are a separate, fixed semantic scale.
- **No** neon glow on text. Glow (if any) only as a 1px border highlight or a very low-opacity radial behind a single hero element, once per page.
- **No** emoji as UI icons. Use Lucide, size 16 or 20, `strokeWidth={1.75}`.
- **No** full-width centered marketing text inside the app shell. Marketing centering is for the landing page only; authenticated pages are left-aligned, dense, and grid-based.
- Every interactive element has hover, focus-visible, active, and disabled states. Focus ring is always visible for keyboard users.
- Every list/table has real empty, loading (skeleton, not spinner-in-the-middle), and error states.

## 1. Design tokens (put these in `tailwind.config.js`)

Dark-first, near-black but never pure black. THM/HTB feel = dark neutral surfaces + one accent + generous but consistent spacing.

```js
// tailwind.config.js -> theme.extend
colors: {
  bg:      { base: '#0B0E14', raised: '#11151D', overlay: '#161B25' },
  border:  { subtle: '#1E242F', DEFAULT: '#2A323F', strong: '#3A4553' },
  fg:      { DEFAULT: '#E6EAF2', muted: '#9BA6B7', subtle: '#6B7687' },
  accent:  { DEFAULT: '#3DDC97', hover: '#5FE7AD', press: '#2CB87C', fg: '#07130D' },
  danger:  '#F2555A',
  warn:    '#F5B335',
  info:    '#5AA9FF',
  // fixed semantic scale - never reuse accent for these
  difficulty: { easy: '#3DDC97', medium: '#F5B335', hard: '#F2555A', insane: '#B96BFF' },
},
fontFamily: {
  sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
},
fontSize: {
  xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
  sm: ['0.8125rem', { lineHeight: '1.25rem' }],
  base: ['0.875rem', { lineHeight: '1.375rem' }], // app default is 14px, not 16px
  lg: ['1rem', { lineHeight: '1.5rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
  '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
  '3xl': ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }],
},
borderRadius: { sm: '4px', DEFAULT: '6px', lg: '10px', xl: '14px' },
boxShadow: {
  card: '0 1px 2px rgba(0,0,0,.4)',
  pop:  '0 8px 24px -8px rgba(0,0,0,.6)',
},
```

Spacing: use only `1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24` (4px grid). Card padding is `p-4` or `p-5`; page gutters `px-6`; section gap `gap-6`.

## 2. App shell

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar 56px: logo | search (⌘K) | streak/points | avatar     │
├────────────┬─────────────────────────────────────────────────┤
│ Sidebar    │ Page header: breadcrumb, H1, subtitle, actions   │
│ 240px      │ ─────────────────────────────────────────────    │
│ (collapse  │ Content: max-w-[1280px], 12-col grid, gap-6      │
│  to 64px)  │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

- Sidebar groups: `Learn` (Paths, Rooms, Modules) · `Practice` (Labs, Challenges, Active Sessions) · `Compete` (Leaderboard, Achievements) · bottom: Settings, Docs.
- Active nav item: `bg-bg-overlay text-fg` + 2px left accent bar. Not a filled accent pill.
- Sticky topbar with `border-b border-border-subtle`, `backdrop-blur` only over scrollable content.
- Persistent "active lab session" bar (container name, remaining TTL countdown, Terminal / Extend / Terminate) pinned under the topbar whenever a session is running. This one component makes the platform feel real.

## 3. Core component specs

**Button** — variants `primary | secondary | ghost | danger`, sizes `sm (28px) | md (34px) | lg (40px)`. Primary = `bg-accent text-accent-fg`, flat, no gradient, no glow. Icon+label gap `gap-2`. Loading state swaps the icon for a spinner and keeps the width stable.

**Badge** — `xs` uppercase, `tracking-wide`, `px-2 py-0.5`, `rounded-sm`, 10% color background + full-color text (e.g. `bg-difficulty-easy/10 text-difficulty-easy`). Used for difficulty, status, tags. Never pure white text on saturated fill.

**Card (room/lab/challenge)** — this is the platform's signature unit. Fixed structure:
1. Top row: 32px square icon/logo tile (`bg-bg-overlay border border-border-subtle rounded`), title (`text-lg font-medium truncate`), difficulty badge pushed right.
2. Two-line clamped description in `text-fg-muted`.
3. Meta row in `text-xs text-fg-subtle`: points · est. time · vuln tags · completion count.
4. Footer: thin 2px progress bar (accent) + `Deploy` / `Continue` button.
   Hover = `border-border-strong` + `-translate-y-px` only. No scale, no rotate, no glow pulse.

**Table (leaderboard, sessions, admin)** — 40px rows, `text-sm`, sticky header in `text-xs uppercase text-fg-subtle`, zebra off, `divide-y divide-border-subtle`, numeric columns right-aligned and `tabular-nums font-mono`. Rank 1–3 get a subtle medal tint on the rank cell only.

**Terminal / LabWorkspace** — split layout: left 60% terminal (`bg-[#07090D]`, xterm-style, `font-mono text-sm`, real scrollback), right 40% task panel with tasks, hints (collapsed, shows `-N pts` penalty), and flag submission input (`font-mono`, inline validation, shake + red border on wrong, green tick + points toast on correct). Terminal header shows container name, target IP:port, and TTL countdown.

**Inputs** — 34px height, `bg-bg-raised border border-border`, focus `border-accent ring-1 ring-accent/30`. Label `text-xs text-fg-muted` above, error `text-xs text-danger` below. No floating labels.

## 4. Motion (Framer Motion)

- Durations: 120ms (hover/press), 180ms (enter/exit), 240ms (modal/drawer). Easing `[0.2, 0.8, 0.2, 1]`.
- Allowed: opacity + `y: 4px` enter, layout shift for lists, modal scale `0.98 → 1`, progress/count-up on score change.
- Banned: page-load stagger over 3+ items, typewriter text, infinite pulsing/floating/scanline overlays, matrix rain, animated gradient borders, parallax on app pages.
- Respect `prefers-reduced-motion`: wrap in a `useReducedMotion()` guard.

## 5. Refactor workflow

1. **Token pass** — update `tailwind.config.js`, then grep and remove arbitrary values:
   `rg -n "(bg|text|border|shadow)-\\[" client/src` and `rg -n "drop-shadow|blur-3xl|animate-pulse" client/src`.
2. **Primitive pass** — make `client/src/components/ui/` the single source: `Button`, `Badge`, `Card`, `Input`, `Select`, `Modal`, `Tabs`, `Table`, `Skeleton`, `EmptyState`, `Toast`, `Tooltip`, `ProgressBar`, `Stat`. Typed props, `cn()` class merge, `forwardRef`. Delete one-off styled divs as you go.
3. **Shell pass** — rebuild `layout/` (Topbar, Sidebar, PageHeader, ActiveSessionBar) and route every page through `PageHeader` + content grid.
4. **Page pass** — in this order: Dashboard → Rooms list → Room detail → LabWorkspace → Leaderboard → Profile → Auth. Each page must ship loading skeletons, empty state, and error state.
5. **Polish pass** — keyboard nav, `focus-visible` rings, `aria-label` on icon-only buttons, ⌘K command palette, contrast check (body text ≥ 4.5:1 against `bg-base`), 1280px / 768px / 390px screenshots.

## 6. Page briefs

- **Dashboard** — 4 compact stat tiles (points, rooms completed, streak, rank) in one row; then "Continue where you left off" (1 wide card), "Recommended labs" (3-up grid), "Recent activity" (dense list). No hero banner.
- **Rooms/Labs index** — left filter rail (difficulty, vuln class, status) or a sticky filter bar; result count + sort; responsive 3/2/1 card grid; pagination or infinite scroll with skeletons.
- **Room detail** — 2-col: left = overview, prerequisites, ordered module/task list with checkmarks; right sticky panel = deploy target, difficulty, points, progress ring, attempt count.
- **Leaderboard** — global/weekly/friends tabs, current-user row pinned and highlighted, rank delta arrows.
- **Auth** — split screen: left form (max-w-sm, left-aligned), right a static dark panel with the product logo and one line of positioning. No animated background.

## 7. Anti-AI-slop checklist (run before declaring done)

- [ ] Zero purple→blue gradients; zero glassmorphism cards stacked on a gradient background.
- [ ] Zero glowing text; zero `animate-pulse` on decoration.
- [ ] ≤ 6 distinct font sizes and ≤ 3 font weights (400/500/600) in the whole app.
- [ ] Same card component everywhere; no two visually different "lab card" designs.
- [ ] Copy is specific and terse: "Deploy target", "Submit flag", "Terminate session" — not "Let's get started on your amazing cyber journey!".
- [ ] Screens look useful at a glance: real data density, aligned columns, consistent 4px-grid spacing.
- [ ] Screenshot at 1280px looks like a paid product, not a template.
