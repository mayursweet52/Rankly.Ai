---
name: ui-ux-pro-max
description: "Comprehensive UI/UX Pro Max design and interaction framework. Use when designing, reviewing, or refactoring full frontend architectures, responsive design systems, micro-interactions, WCAG AAA accessibility, 60fps scrolling, layout shifts (CLS), and stateful interactive components."
---

# UI/UX Pro Max Architecture & Interaction Guide

UI/UX Pro Max is an industrial-grade framework for engineering world-class digital products. It bridges user psychology, visual hierarchy, ergonomics, speed optimization, and robust engineering.

---

## 1. Ergonomics & Cognitive Load Optimization

- **Fitts's Law in Action**:
  - Primary conversion actions (e.g., "Submit Application", "Run Pipeline") must have generous hitboxes (min 44×44px mobile, 40px desktop) and sit in natural visual anchoring positions (sticky bottoms on mobile, prominent right/top headers on desktop).
- **Hick's Law & Progressive Disclosure**:
  - Never overwhelm the user with > 7 primary options simultaneously.
  - Use progressive disclosure (collapsible advanced filters, step wizards, slide-over sheets) to keep primary flows focused.
- **Miller's Law (Chunking)**:
  - Break complex candidate profiles, AI inference outputs, or long forms into distinct contextual cards with thematic headers and dividers.

---

## 2. Design System Architecture

### A. The 8-Point Spatial Grid
- Space tokens:
  - `space-1` = 4px (micro padding inside badges)
  - `space-2` = 8px (icon to label gaps)
  - `space-3` = 12px (form input inner padding)
  - `space-4` = 16px (card inner padding on mobile)
  - `space-6` = 24px (card inner padding on desktop)
  - `space-8` = 32px (section gaps)
  - `space-12` = 48px (page hero spacing)

### B. Typography Scale & Hierarchy
- **Display 1**: 36px–48px / Bold / Tracking -0.03em / Line-height 1.1
- **Heading 1**: 28px–32px / SemiBold / Tracking -0.025em / Line-height 1.2
- **Heading 2**: 20px–24px / SemiBold / Tracking -0.02em / Line-height 1.3
- **Body Large**: 16px / Regular & Medium / Line-height 1.6
- **Body Regular**: 14px / Regular / Line-height 1.5
- **Caption / Meta**: 12px / Medium / Tracking +0.01em / Uppercase or Monospace

---

## 3. Responsive Breakpoints & Device Targets

```
Mobile (Portrait)   : 320px  - 480px  -> Single column, bottom navigation, full-width sheets
Tablet / Foldable   : 481px  - 768px  -> 2-column adaptive layout, collapsible sidebar
Laptop / Desktop    : 769px  - 1280px -> Multi-pane split views, fixed sidebar + main scroll
Ultra-wide Monitors : 1281px+         -> Centered max-w-[1440px] or max-w-[1600px] container
```

---

## 4. Interaction States & Micro-Feedback Matrix

Every UI element must have distinct interactive signatures:
1. **Idle**: Pristine resting contrast.
2. **Hover**: Background luminance shift + border highlight + cursor pointer.
3. **Focus-Visible**: High-contrast outline ring (2px with 2px offset).
4. **Active/Pressed**: 2% tactile scale-down (`scale-[0.98]`).
5. **Disabled**: Reduced opacity (`opacity-50 cursor-not-allowed pointer-events-none`).
6. **Optimistic Loading**: Immediate UI update with subtle progress pulse.

---

## 5. Performance & Zero-Lag Guarantees
- **First Contentful Paint (FCP)**: `< 0.8s`
- **Cumulative Layout Shift (CLS)**: `< 0.05`
- **Interaction to Next Paint (INP)**: `< 100ms`
- **DOM Node Cap**: Keep page DOM count under `1,000` nodes via virtualization (`IntersectionObserver`, windowing) for large candidate lists.
