# Implementation Plan: Register Organization Form Strict Color & Token Enforcement

## Objective
Update `.panel-back` in `public/index.html` (and `public/index-3.html`) to strictly adhere to design system variables (`var(--bg-card)`, `var(--bg-input)`, `var(--border-color)`, `var(--text-muted)`, `var(--text-primary)`) with zero hardcoded background colors or raw hex mismatches.

## Step-by-Step Execution
1. **Define Core Theme CSS Variables:**
   - Ensure `:root` defines `--bg-card: #FFFFFF; --bg-input: #FAFAF8; --border-color: #E5E5DF; --text-primary: #111111; --text-muted: #666660;`
   - Ensure dark theme overrides: `--bg-card: #090B10; --bg-input: rgba(30, 27, 75, 0.4); --border-color: rgba(255, 255, 255, 0.1); --text-primary: #FFFFFF; --text-muted: #9CA3AF;`

2. **Refactor `.panel-back` Form Markup:**
   - Container: uses `background: var(--bg-card)` and `text-[var(--text-primary)]`.
   - Header: "Register Organization" (`text-[#6366f1]`) + subtitle with `text-[var(--text-muted)]`.
   - OTP Box: `border border-[var(--border-color)] bg-[var(--bg-input)] rounded-10 p-3`.
   - Section Labels: strictly `class="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1"`.
   - Inputs & Selects: strictly `class="login-input"`.
   - Action Buttons: `class="login-btn"` for submit; `border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--border-color)]` for secondary actions.
   - Phone Input: prefix with `border-r border-[var(--border-color)] text-[var(--text-muted)] bg-[var(--bg-card)]`.
   - Security Notice: themed subtle warning banner with zero jarring colors.
   - Back Link: `id="backToLogin"` returning to user sign in.

3. **Verification & Deployment:**
   - Mirror `public/index-3.html` to `public/index.html`.
   - Test in both Light and Dark modes.
   - Commit & push to Git repository.
