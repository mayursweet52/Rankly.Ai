---
name: taste
description: "Editorial taste, artistic direction, and bespoke design curation. Use to eliminate generic AI/Bootstrap looks, enforce typographic rhythm, curated color temperature, intentional asymmetry, bespoke negative space, and elevated visual sophistication."
---

# Taste: Curated Visual Direction & Anti-Generic Aesthetics

`taste` is the antidote to bland, formulaic, cookie-cutter AI and template UI designs. It sets the standard for high-end editorial curation, nuanced negative space, sophisticated palettes, and bespoke craft.

---

## 1. The Anti-Patterns of Low Taste (What to Avoid)

| Low-Taste Anti-Pattern | High-Taste Alternative |
| :--- | :--- |
| Harsh, saturated primary purple/blue gradient backgrounds | Deep, warm/cool slate neutrals with precise, low-opacity ambient backdrops |
| Cluttered cards with identical border radii and harsh drop shadows | Asymmetric visual hierarchy with hairline borders and multi-layered elevation |
| Centered walls of text with uniform font weights | Dynamic typographic contrast (large bold display headings + subtle muted subtext) |
| Generic stock illustrations or meaningless confetti icons | Clean, purposeful iconography (Lucide, Heroicons, or bespoke SVG tokens) |
| Everything shouting for attention with vibrant colors | 80% calm neutral surface, 15% supportive structure, 5% high-impact accent color |
| Over-animated dizzying 3D tilts and bouncing elements | Restrained, physics-based micro-interactions that feel crisp, fast, and tactile |

---

## 2. The 5 Tenets of Exceptional Taste

### A. Intentional Negative Space
- Negative space is not empty space; it is a primary design element that creates rhythm, focuses cognitive attention, and gives the interface breathing room.
- Give heroes and key metric summaries generous margin: `py-16 md:py-24`.
- Tightly group related content: `gap-1.5` between label and input, `gap-4` between form fields, `gap-8` between sections.

### B. Curated Color Temperature & Harmony
- Do not mix mismatched color temperatures. If the theme is cool (slate, cyan, sky), keep all supporting grays in the slate family. If the theme is warm (zinc, amber, stone), harmonize across the entire layout.
- Use intentional opacity scales (`text-white`, `text-slate-300`, `text-slate-400`, `text-slate-500`) to create clear depth without introducing random hex colors.

### C. Typographic Soul & Editorial Contrast
- Pair high-character headings with ultra-clean body copy.
- Master the details: correct curly quotes (`“` `”`), em dashes (`—`), proper ellipsis (`…`), and non-breaking spaces before units (`10&nbsp;MB`).
- Use monospace font selectively to denote precision, data, or technical authority (e.g., timestamps, hash keys, metrics).

### D. Bespoke Details & Micro-Delight
- Refined empty states that tell a story rather than just saying "No data found".
- Subtle subtle status badges with glowing pulse dots.
- Seamless copy-to-clipboard interactions with instant tooltip feedback ("Copied!").

### E. Material Restraint
- Restraint is power. When in doubt, remove borders, lighten shadows, increase whitespace, and sharpen the typography.
