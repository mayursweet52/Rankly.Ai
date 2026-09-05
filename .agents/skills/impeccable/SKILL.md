---
name: impeccable
description: "Impeccable craft and engineering standard. Use whenever building, styling, or auditing frontend interfaces, components, or design implementations to enforce zero visual flaws, flawless typography, pixel-perfect alignment, fluid transitions, and pristine error/empty/loading states."
---

# Impeccable Craft & Frontend Engineering Standard

The `impeccable` standard demands absolute excellence in visual design, micro-interactions, layout precision, and edge-case resilience. An interface is not finished when it merely works; it is finished when it feels inevitable, effortless, and flawless.

---

## 1. The 10 Principles of Impeccable Craft

1. **Pixel-Level Alignment & Optical Balance**
   - Align to mathematical and optical grids (4px / 8px baseline rhythm).
   - Icons must be optically centered inside circular/square badges (account for visual weight, not just bounding boxes).
   - Text baselines must harmonize across adjacent inline badges, buttons, and avatar tags.

2. **Typography Hierarchy with Mathematical Scale**
   - Headings: Tight tracking (`tracking-tight` or `-0.02em` to `-0.04em`), intentional line-heights (`1.1` to `1.25`).
   - Body copy: Readable line-height (`1.5` to `1.6`), relaxed tracking, optimal measure (45–75 characters per line).
   - Monospace & Numbers: Use tabular numbers (`font-variant-numeric: tabular-nums` or `tabular-nums`) for currency, metrics, timestamps, and ranking scores to prevent jitter during updates.

3. **Color Precision & Contrast Discipline**
   - Strict adherence to WCAG 2.1 AA (minimum 4.5:1 for body, 3:1 for large text) and ideally WCAG AAA (7:1).
   - Never use pure black (`#000000`) for text on pure white (`#ffffff`). Use rich, calibrated neutrals (e.g., slate-900 `#0f172a`, zinc-900 `#18181b`).
   - Muted text must maintain contrast (`slate-500` / `slate-400` calibrated for dark/light modes).

4. **Zero-Flaw State Coverage (The 6 States)**
   Every interactive component and page must explicitly handle and beautifully render:
   - **Default / Pristine State**
   - **Hover / Focus-Visible State** (distinct keyboard focus rings, `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none`)
   - **Active / Pressed State** (subtle scale transform `active:scale-[0.98]` or micro-depth shift)
   - **Loading / Skeleton State** (content-matched skeleton shimmer with matching aspect ratio)
   - **Empty State** (delightful iconography, clear narrative, single high-contrast call-to-action)
   - **Error / Degraded State** (actionable retry button, human-friendly error explanation, inline validation)

5. **Fluid 60 FPS Transitions & Motion Physics**
   - Transitions must use realistic easing curves (`cubic-bezier(0.16, 1, 0.3, 1)` for snappy spring ease).
   - Duration bounds:
     - Micro-interactions (hover, focus, toggles): 150ms – 200ms.
     - Modals, drawers, tooltips: 200ms – 300ms.
     - Page transitions: 300ms – 400ms.
   - Never animate layout properties (`width`, `height`, `margin`, `top`). ONLY animate composite-friendly properties (`transform`, `opacity`, `filter`).

6. **Sub-Pixel Borders & Depth Stacking**
   - Use refined border opacity (`border-white/10` on dark surfaces, `border-slate-200/80` on light surfaces).
   - Layered elevation shadows: soft ambient occlusion + directional key shadow rather than a single harsh blur.
   - Subtle inner highlights (`inset 0 1px 0 0 rgba(255,255,255,0.08)`) on cards and buttons for physical materiality.

7. **Responsive Rigor Across Viewports**
   - Fluid typography using `clamp()` or strict breakpoint scales (`sm`, `md`, `lg`, `xl`, `2xl`).
   - Touch targets must be at least 44×44px on mobile devices.
   - Tables and complex grids must gracefully degrade to cards or horizontal scrolling with sticky headers on small screens.

8. **Zero Cumulative Layout Shift (CLS < 0.05)**
   - Reserve dimensions for images, avatars, icons, and dynamic widgets (`aspect-ratio`, `min-h-[...]`, `w-8 h-8`).
   - Prevent content jumps when badges, tags, or async counters load.

9. **Accessible & Screen-Reader Native**
   - Valid semantic HTML5 landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>`).
   - Interactive elements must be real `<button>` or `<a>` tags with `aria-label` when text is absent.
   - Keyboard navigable: Tab order logical, Escape key closes overlays, Arrow keys navigate lists/tabs.

10. **Defensive UI & Overflow Protection**
    - Text truncation with tooltips for user-generated strings (`truncate`, `line-clamp-2`).
    - Long unbroken strings must break (`break-words`, `overflow-hidden`).
    - Flex containers with children that shrink must have `min-w-0` to avoid horizontal layout breaking.

---

## 2. Impeccable Verification Checklist

Before marking any UI code complete, verify:
- [ ] Are all 6 UI states handled (Default, Hover, Focus, Active, Loading, Error, Empty)?
- [ ] Is tabular numbers (`tabular-nums`) enabled on metrics, scores, and currency?
- [ ] Does keyboard navigation work seamlessly with clear focus indicators?
- [ ] Is layout shift completely absent during asynchronous data fetching?
- [ ] Are animations running on GPU-accelerated properties (`transform`, `opacity`)?
- [ ] Is mobile touch responsiveness verified with 44px min touch targets?
