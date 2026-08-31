# Implementation Plan: Register Organization Form on 3D Flip Card Back Side

## Objective
Update the back side (`.panel-back` / `.back`) of the 3D flip card in `public/index.html` (and `public/index-3.html`) to implement the full "Register Organization" enterprise recruitment workspace setup form with Email + OTP verification, personal & corporate profile fields, age validation, and action buttons.

## Step-by-Step Execution
1. **Header & Subtitle:**
   - Title: "Register Organization" with brand accent.
   - Subtitle: "Provision an enterprise recruitment workspace & verify admin credentials."

2. **Corporate Email & OTP Verification Box:**
   - Corporate Email input pre-filled with `"mayursweet52@gmail.com"`.
   - "Resend OTP" / "Send OTP" button.
   - 6-digit OTP input field (`id="orgOtpInput"`).
   - "Verify" button (`id="verifyOrgOtpBtn"`).
   - Security status notice banner unlocking the profile fields below.

3. **Profile & Corporate Fields:**
   - Grid with First Name (`id="orgFirstName"`) & Last Name (`id="orgLastName"`).
   - Work Username (`id="orgUsername"`, "Corporate username").
   - Grid with Date of Birth (`id="orgDob"`, type="date" or "dd-mm-yyyy") and Age calculation / input (`id="orgAge"`, Min 18+).
   - Phone number with locked country code badge (`IN +91`) and 10-digit mobile field (`id="orgPhone"`).
   - Role / Access Level (`id="orgRole"` pre-filled with `"HR / Recruiter"`).

4. **Actions & Navigation:**
   - Submit Button: "Complete Registration" (`id="registerOrgSubmitBtn"`).
   - Back Link: `id="backToLogin"` to flip the 3D card back to standard login.

5. **Styling & Theming:**
   - Strict usage of `.login-input`, `.login-select`, `.login-btn`, and native theme CSS variables.
   - Smooth custom scrollbar for `.panel-back` if needed.
   - Sync `public/index-3.html` to `public/index.html`, test and commit to Git.
