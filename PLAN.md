# Implementation Plan: Update Login Page Markup with Original Details and 3D Flip Company Flow

## Objective
Update the `id="loginPage"` markup in `public/index.html` (and `public/index-3.html`) to include all original form elements (Username/Email, Password, Role selector with Admin/HR/Hiring Manager, Keep me signed in checkbox, Sign In button, Forgot Password view/toggle, OAuth buttons) on the Front side, and a corporate workspace creation form on the Back side with a seamless 3D flip card mechanism.

## Step-by-Step Execution
1. **Front Side (Normal User):**
   - Standard Login form with:
     - `id="loginUsername"` (Email / Username)
     - `id="loginPassword"` (Password with eye toggle)
     - `id="loginRole"` (Dropdown: Admin, HR Recruiter, Hiring Manager)
     - `id="rememberMe"` (Keep me signed in checkbox)
     - `id="loginBtn"` (Sign In submit button)
     - Toggleable Forgot Password section or link opening `forgotPasswordModal`
     - OAuth social buttons (Google & Microsoft)
     - `id="showCompanyForm"` link/button to trigger 3D flip to Back side.
2. **Back Side (Company / Organization):**
   - Enterprise Workspace form with:
     - Organization Name (`id="orgNameInput"`)
     - Corporate Admin Email (`id="orgWorkEmailInput"`)
     - Industry dropdown (`id="orgIndustryInput"`)
     - Team Size dropdown (`id="orgSizeInput"`)
     - Admin Full Name (`id="orgAdminNameInput"`)
     - Master Admin Password (`id="orgAdminPasswordInput"`)
     - Submit button (`id="createOrgBtn"`)
     - `id="backToLogin"` link/button to flip back to Front side.
3. **Styling & CSS Theme Consistency:**
   - Adhere to `DESIGN.md` tokens: `.login-input`, `.login-select`, `.login-btn`, `var(--bg-card)`, `var(--text-muted)`, `var(--border-color)`.
   - Ensure full compatibility with light/dark themes and sliding hero overlay.
4. **JS Event Listeners & Fallbacks:**
   - Ensure `showCompanyForm` / `backToLogin` add and remove `.flipped` on `loginFlipper` / `loginPanelFlipper`.
   - Ensure `loginBtn`, `slidingLoginForm`, `orgForm` submit handlers gracefully read inputs and authenticate.
5. **Sync & Verification:**
   - Mirror changes to `public/index-3.html` and `public/index.html`.
   - Test locally and push to GitHub repository.
