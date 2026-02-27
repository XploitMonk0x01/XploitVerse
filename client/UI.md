# XploitVerse — UI Design Reference

> TryHackMe-inspired dark theme. Minimal, professional, human-crafted.

---

## Design Philosophy

- **Solid dark backgrounds** — no gradients, no neon
- **Muted green accent** — `#88cc14` for CTAs and success
- **Blue-gray surfaces** — layered depth without flashiness
- **Clean typography** — Ubuntu + Source Sans Pro
- **Subtle interactions** — color transitions only, no glow effects

---

## Color Palette

### Backgrounds

| Token | Hex | Use |
|-------|-----|-----|
| `gray-950` | `#101624` | Deepest level |
| `gray-900` | `#151c2b` | Page / body background |
| `gray-800` | `#1f2839` | Cards, panels, sidebar |
| `gray-700` | `#2a3244` | Elevated surfaces, borders |
| `gray-600` | `#3d4555` | Dividers, subtle borders |

### Text

| Token | Hex | Use |
|-------|-----|-----|
| Root color | `#d0d4db` | Default text |
| `gray-300` | `#d0d4db` | Body text |
| `gray-400` | `#9ea4b0` | Secondary / muted |
| `gray-500` | `#6c7280` | Placeholder, disabled |

### Accent

| Token | Hex | Use |
|-------|-----|-----|
| `green-400` | `#88cc14` | Hover, active states |
| `green-500` | `#6ABF15` | Primary — buttons, CTAs |
| `green-600` | `#549a10` | Pressed / focus |

### Semantic

| Token | Hex | Use |
|-------|-----|-----|
| `cyber-red` | `#C11111` | Danger, errors |
| `cyber-orange` | `#EF8D4C` | Warnings |
| `cyber-blue` | `#2f80ed` | Info, links |

---

## Typography

### Fonts (Google Fonts)

| Font | Use |
|------|-----|
| **Ubuntu** (300–700) | Primary UI font |
| **Source Sans Pro** (400–700) | Alternate body font |
| **Bungee** | Display / logo |
| **JetBrains Mono** (400–700) | Code, terminal |

### Font Stack

```css
/* Sans (default) */
font-family: "Ubuntu", "Source Sans Pro", system-ui, sans-serif;

/* Monospace */
font-family: "JetBrains Mono", "Fira Code", monospace;

/* Display (headings, branding) */
font-family: "Bungee", "Ubuntu", sans-serif;
```

### Type Scale

| Role | Classes |
|------|---------|
| Page title (H1) | `text-3xl font-bold text-white` |
| Section heading (H2) | `text-xl font-semibold text-white` |
| Card title (H3) | `text-lg font-medium text-white` |
| Body | `text-gray-300 leading-relaxed` |
| Muted | `text-gray-400 text-sm` |
| Code | `font-mono text-green-400 text-sm` |
| Labels | `text-sm font-medium text-gray-300` |

---

## CSS Utility Classes

| Class | Description |
|-------|-------------|
| `.btn-cyber` | Solid green button |
| `.btn-cyber-outline` | Green bordered button |
| `.card-cyber` | Dark card with subtle hover |
| `.input-cyber` | Dark input with green focus |
| `.gradient-text` | Green → blue gradient text |
| `.text-glow` | Very subtle green text shadow |
| `.cyber-glow` | Minimal green box shadow |

---

## Scrollbar

| Part | Color |
|------|-------|
| Track | `#1f2839` |
| Thumb | `#3d4555` |
| Thumb hover | `#4e576a` |

---

## Animations

| Class | Effect |
|-------|--------|
| `animate-spin` | Rotation |
| `animate-pulse` | Opacity pulse |
| `animate-pulse-slow` | Slow 3s pulse |
| `animate-float` | Vertical bob |
| `animate-scan` | Vertical scan |

---

## File References

| File | Purpose |
|------|---------|
| `tailwind.config.js` | Colors, fonts, animations |
| `src/index.css` | Global styles, utilities |
| `index.html` | Google Fonts imports |
| `src/components/ui/Button.jsx` | Button component |
| `src/components/ui/Input.jsx` | Input component |
