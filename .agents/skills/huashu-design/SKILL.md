---
name: huashu-design
description: "Hyper-refined modern tech aesthetic inspired by high-end design systems (Huashu / dynamic fluid neo-minimalism). Use when crafting luxury tech interfaces, dark/light glowing micro-accents, crisp mathematical borders, glassmorphism with sub-pixel borders, fluid physics, and ultra-high-density data dashboards."
---

# Huashu Design System & Neo-Minimalist Engineering Standard

Huashu Design represents the pinnacle of modern Asian and international high-tech aesthetic engineering: razor-sharp architectural layouts, ultra-clean geometry, atmospheric light glows, refined information density, and fluid tactile feedback.

---

## 1. Core Visual Pillars

### A. Surface & Material Physics
- **Layered Obsidian & Frosted Glass**:
  - Dark surfaces: Primary background `bg-slate-950` / `#090d16`, elevated cards `bg-slate-900/70 backdrop-blur-xl`.
  - Light surfaces: Primary background `bg-slate-50` / `#f8fafc`, elevated cards `bg-white/80 backdrop-blur-lg`.
- **Sub-Pixel Luminous Borders**:
  - Cards and dialogs feature hairline borders (`border border-white/[0.08]` or `border-slate-200/60`).
  - Active/Focused cards introduce a directional gradient border or faint neon halo (`ring-1 ring-cyan-500/30`).
- **Controlled Atmospheric Glows**:
  - Avoid blinding neon washes; use radial gradients with low opacity (`bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-slate-950/0 to-transparent`).

### B. High-Density Dashboard Typography
- **Monospace Telemetry Badges**:
  - Latency, timestamps, git hashes, API quotas, and numeric statuses rendered in clean monospace font (`font-mono text-xs text-cyan-400/90`).
- **Dual-Tone Status Indicators**:
  - Live pulse dot (`relative flex h-2 w-2` with `animate-ping bg-emerald-400` + solid inner `bg-emerald-500`).
- **Precision Metric Callouts**:
  - Bold tabular metrics (`text-2xl font-bold tracking-tight text-white tabular-nums`) paired with subtle delta pill badges (`+14.2%` in `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`).

### C. Kinetic Motion & Spring Physics
- **Snappy Micro-Gestures**:
  - Button presses: `transition-all duration-150 active:scale-[0.98]`
  - Card hover reveals: Reveal subtle highlight beam or gradient shift on hover (`group-hover:border-cyan-500/40 transition-colors duration-200`).
- **Fluid Layout Transitions**:
  - Accordions and tab switches must feel instantaneous without abrupt height snaps.
  - Zero heavy CPU 3D tilt effects; prefer GPU composited opacity & transform shifts.

---

## 2. Color Tokens & Palette

| Token Role | Dark Theme Value | Light Theme Value | Accent Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#080c14` / `slate-950` | `#f8fafc` / `slate-50` | Root background |
| **Elevated Surface** | `#0f172a` / `slate-900/80` | `#ffffff` / `white` | Cards, panels, modals |
| **Sub-Surface** | `#1e293b` / `slate-800/60` | `#f1f5f9` / `slate-100` | Input wells, nested tables |
| **Primary Accent** | `#06b6d4` / `cyan-500` | `#0284c7` / `sky-600` | Brand actions, primary CTA |
| **Secondary Accent** | `#8b5cf6` / `violet-500` | `#7c3aed` / `violet-600` | AI features, intelligence tags |
| **Success / Live** | `#10b981` / `emerald-500` | `#059669` / `emerald-600` | Online nodes, verified status |
| **Warning / Notice** | `#f59e0b` / `amber-500` | `#d97706` / `amber-600` | Rate limits, pending sync |
| **Destructive** | `#f43f5e` / `rose-500` | `#e11d48` / `rose-600` | Terminate, delete, revoke |

---

## 3. Implementation Patterns

### 1. The Huashu Hero Card
```html
<div class="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-cyan-500/30">
  <div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
  <div class="flex items-center justify-between">
    <span class="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-400 font-mono">
      <span class="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
      NEURAL ACTIVE
    </span>
    <span class="text-xs font-mono text-slate-400">v2.4.0</span>
  </div>
  <h3 class="mt-4 text-xl font-semibold text-white tracking-tight">Real-time Candidate Analytics</h3>
  <p class="mt-1 text-sm text-slate-400">Multi-provider inference pipeline running with 0.8s benchmark target.</p>
</div>
```

---

## 4. Quality Rules
- Never use heavy drop shadows without ambient blur matching.
- Keep contrast strictly legible; avoid low-contrast cyan-on-light backgrounds.
- Always provide immediate visual confirmation on every user interaction.
