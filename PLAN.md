# Implementation Plan: Global Feature Search vs Candidate Search Architecture

## Objective
Implement two strictly separated, purpose-built search mechanisms:
1. **Global Feature Navigation Search Bar (`GlobalFeatureSearch`)**: Placed in the top header/navbar (`.dash-topbar`) to search and redirect across all application pages, features, settings, modals, and actions (zero candidate results).
2. **Candidate Search Bar (`CandidateSearch`)**: Placed strictly on the Candidate/Screening management page to filter candidates by First Name, Last Name (Surname), or Email/Gmail ID.

## Step-by-Step Execution
1. **Global Feature Search (`.dash-topbar` in `public/index-3.html`):**
   - Implement `globalFeatureSearchBox` in the topbar with keyboard shortcut (`Ctrl + K`).
   - Define comprehensive `APP_FEATURES` navigation map:
     - `Dashboard / Overview` -> `switchTab('dashboard')`
     - `Chatbot AI Assistant` -> `switchTab('chatbot')`
     - `Screening Matrix` -> `switchTab('screening')`
     - `Talent Pipeline` -> `switchTab('pipeline')`
     - `Analytics Hub & Reports` -> `switchTab('analytics')`
     - `Resume Builder` -> `switchTab('resume')`
     - `System Health & Diagnostics` -> `switchTab('health')`
     - `Account Settings` -> `switchTab('settings')`
     - `Feedback & Support` -> `switchTab('feedback')`
     - `User Profile Modal` -> `openModal('updateProfileModal')`
     - `Theme Mode Toggle` -> `toggleAppTheme()`
     - `Sign Out / Session Termination` -> `logoutUser()`
   - Style dropdown with `var(--bg-card)`, `var(--border-color)`, `var(--text-primary)`, `var(--text-muted)` for seamless Light/Dark mode support.

2. **Candidate Search (`#candidateSearchInput` in `public/index-3.html`):**
   - Ensure candidate search strictly matches `firstName`, `lastName`, `fullName`, and `email`.
   - Provide live candidate filtering and dropdown selection.

3. **Sync & Verification:**
   - Copy `public/index-3.html` to `public/index.html`.
   - Verify both search bars in browser.
   - Commit & push to Git repository.
