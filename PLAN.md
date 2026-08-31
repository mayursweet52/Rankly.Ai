# Implementation Plan: Update Logout Button Icon to Custom SVG

## Objective
Replace the generic FontAwesome logout icons in the sidebar and profile termination cards with the user's custom SVG logout icon (`id="Logout 2"`), ensuring perfect color adaptation via `currentColor` in both Light and Dark themes.

## Step-by-Step Execution
1. **Sidebar Logout Button Update (`public/index-3.html`):**
   - Replace `<i class="fas fa-arrow-right-from-bracket"></i>` inside `.btn-signout` with the custom SVG using `stroke="currentColor"` and appropriate dimensions.
2. **Profile Modal Session Termination Button Update:**
   - Replace `<i class="fas fa-right-from-bracket mr-2"></i>` with the custom SVG icon.
3. **CSS Adjustment:**
   - Ensure `body.dark-theme .dash-sidebar .btn-signout svg` has width/height and inherits colors properly on hover.
4. **Sync & Verification:**
   - Copy `public/index-3.html` to `public/index.html`.
   - Commit & push to Git repository.
