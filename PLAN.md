# Implementation Plan: Interactive Motion Animation for Custom Logout Button

## Objective
Add high-performance, ultra-smooth CSS micro-motion animation to the custom logout SVG icon on hover and active states, creating a modern interactive experience where the exit arrow smoothly slides outward upon interaction.

## Step-by-Step Execution
1. **SVG Hierarchy Update (`public/index-3.html`):**
   - Wrap the arrow paths of the logout SVG into `<g class="logout-arrow">`.
   - Add class `logout-frame` to the door/frame path.
   - Add class `logout-icon-svg` to the root SVG.

2. **CSS Motion & Keyframes Animation:**
   - Define physics-inspired transition `cubic-bezier(0.34, 1.56, 0.64, 1)` on `.logout-arrow`.
   - On `.btn-signout:hover` and `.btn-secondary:hover`, animate `.logout-arrow` with `transform: translateX(3.5px)`.
   - Add active tactile bounce `transform: scale(0.96)`.
   - Enhance dark-theme hover styling with smooth accent glow.

3. **Sync & Verification:**
   - Copy `public/index-3.html` to `public/index.html`.
   - Verify smooth motion in the browser.
   - Commit & push to Git repository.
