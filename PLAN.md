# Implementation Plan: Remove All Pre-filled Dummy Data

## Objective
Remove all hardcoded pre-filled dummy values (e.g. `mayursweet52@gmail.com`, `Mayur`, `Sweet`, etc.) from all auth form inputs in `public/index.html` and `public/index-3.html`, replacing them with clean, neutral placeholders.

## Step-by-Step Execution
1. **Front Side Login Form:**
   - Ensure `id="loginUsername"` has neutral placeholder `placeholder="Email or username"`.
   - Remove any dummy pre-filled values.

2. **Back Side Register Organization Form:**
   - `id="orgWorkEmailInput"`: remove `value="mayursweet52@gmail.com"`, use `placeholder="admin@company.com"`.
   - `id="orgFirstName"`: change placeholder to `placeholder="First Name"`.
   - `id="orgLastName"`: change placeholder to `placeholder="Last Name"`.
   - `id="orgRole"`: convert to a select dropdown (`Administrator / Lead`, `HR / Recruiter`, `Hiring Manager`) without hardcoded readonly text.
   - `id="orgPhone"`: change placeholder to `placeholder="Enter 10-digit mobile number"`.

3. **Verification & Deployment:**
   - Sync `public/index-3.html` to `public/index.html`.
   - Test forms to ensure inputs are completely clean and unpolluted.
   - Commit & push to Git repository.
