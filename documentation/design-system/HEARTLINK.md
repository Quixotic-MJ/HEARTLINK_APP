# HeartLink on the design system

`DESIGN.md` (next to this file) is the base design system: white surfaces, thin warm-grey borders,
8px buttons, 12px cards, pastel tint cards, black pill chips. This file lists what HeartLink changes
or adds on top of it. When the two disagree, this file wins.

Reference designs: the onboarding canvas, https://claude.ai/artifact/VpoHKLy3p5R9oc6t2QPRqU

## What HeartLink changes

| Topic | DESIGN.md | HeartLink |
|---|---|---|
| Primary button | purple `#5645d4` | blue `#1478B8`, white text (4.8:1). Pressed `#0F639A` |
| Lines, rings, progress, focus, toggles | purple | brighter blue `#2E9AE8` (thin lines only, never under text) |
| Selected answer, soft tag | lavender | sky tint `#dcecfa` with navy `#0a1530` text, 2px `#2E9AE8` border when selected |
| Font | Notion Sans / Inter | the phone's built-in font (no font package). Same sizes and weights |
| Button and input height | 40–44px | 48px buttons and inputs on phones, 44px minimum for anything tappable |
| Logo | — | the HeartLink heart mark and its own colours, unchanged |
| Score | — | the score ring uses `#2E9AE8`; the band (Good, Moderate, …) is a tinted tag next to it |
| Emergency | — | rose tint card, red icon, dark text. Never red text on pink (fails contrast) |

## Colour tokens in code

Defined in `HeartLink-mobile/global.css` (as `--color-ds-*`), exposed as Tailwind classes
`bg-ds-*` / `text-ds-*` / `border-ds-*` in `tailwind.config.js`, and as hex values in
`constants/theme.ts` (`ds.light`, `ds.dark`) for animated, SVG and inline styles.

| Token | Light | Dark | Use |
|---|---|---|---|
| `ds-canvas` | `#ffffff` | `#191919` | screen background, cards |
| `ds-surface` | `#f6f5f4` | `#202020` | info boxes, "Why we ask" |
| `ds-surface-alt` | `#f0eeec` | `#2a2a2a` | neutral tags |
| `ds-hairline` | `#e5e3df` | `#2f2f2f` | card borders |
| `ds-hairline-soft` | `#ede9e4` | `#262626` | dividers, progress track |
| `ds-hairline-strong` | `#c8c4be` | `#454545` | input borders, empty radios |
| `ds-ink` | `#1a1a1a` | `#f2f1ee` | headings, main text |
| `ds-charcoal` | `#37352f` | `#e3e2de` | text and icons on pastel tints |
| `ds-slate` | `#5d5b54` | `#b5b3ad` | secondary text |
| `ds-steel` | `#787671` | `#9b9a97` | captions, small labels |
| `ds-primary` | `#1478B8` | `#1478B8` | main button |
| `ds-primary-pressed` | `#0F639A` | `#0F639A` | main button pressed |
| `ds-line` | `#2E9AE8` | `#4FB6E6` | progress, rings, focus, toggles |
| `ds-tint` | `#dcecfa` | `#1b3346` | selected answers, soft tags |
| `ds-on-tint` | `#0a1530` | `#dcecfa` | text on `ds-tint` |
| `ds-link` | `#0075de` | `#4da3ff` | inline text links only |
| `ds-peach` `ds-rose` `ds-mint` `ds-lavender` `ds-sky` `ds-yellow` | `#ffe8d4` `#fde0ec` `#d9f3e1` `#e6e0f5` `#dcecfa` `#fef7d6` | darker versions | icon badges and feature cards |
| `ds-yellow-bold` | `#f9e79f` | `#4a4020` | one high-emphasis banner per screen at most |
| `ds-warm-text` | `#793400` | `#ffb37a` | text on yellow and peach tags (e.g. "Moderate") |
| `ds-success` / `ds-danger` | `#1aae39` / `#e03131` | `#3ccb5a` / `#ff6b6b` | done ticks / emergency icons |

Pastel badges by topic (same order everywhere): About you = sky, Movement = mint,
Habits = lavender, Food & goals = peach, allergies and warnings = rose.

## Rules for new HeartLink screens

- Use the `ds-*` tokens, not hex values typed into components.
- One primary (blue) button per screen. Secondary actions are outlined or plain text.
- Black pill chips for multi-select options; full-width rows with a radio for single choice.
- Every health question explains itself in a short "Why we ask" note, in plain words.
- HeartLink supports healthy habits and is not a diagnosis. Say so wherever a score is first shown.
- Existing screens keep the older `constants/theme.ts` colours until they are redesigned. Move a screen
  over in one go, not piece by piece.
