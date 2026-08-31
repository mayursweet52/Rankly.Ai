# Implementation Plan: Remove Microsoft Login Button

## Objective
Remove the Microsoft OAuth login button from the user login card (`#standardLoginView`), leaving the Google authentication button as a clean, full-width single OAuth action button.

## Step-by-Step Execution
1. **Markup Update:**
   - In `public/index-3.html`, locate the OAuth button container in `#standardLoginView`.
   - Remove the Microsoft button element (`oauthLogin('Microsoft')`) and the `grid-cols-2` wrapper.
   - Render the Google button (`oauthLogin('Google')`) with `Continue with Google` as a full-width `.oauth-google-btn`.

2. **Sync & Verification:**
   - Copy `public/index-3.html` to `public/index.html`.
   - Verify layout and commit to Git repository.
