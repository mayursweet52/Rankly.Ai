# 🔐 Proposal & Architecture Plan: Browser Close Session Termination (Transient Session Management)
**Project:** Rankly.ai  
**Task Description:** Close hone par website ka session terminate hona chahiye (Session must automatically terminate when browser/tab is closed unless user explicitly selects 'Remember Me').  
**Collaboration Model:** Tripartite Collaboration (Mayur [Backend] + Sumit [Frontend] + Vaibhav [Database])  
**Status:** 🟡 **AWAITING DEVELOPER PERMISSION / APPROVAL** (No source code will be modified until approved)

---

## 🎯 1. Executive Summary & Problem Diagnosis

### Current Behavior:
- Jab user browser ya website tab close karta hai aur wapas open karta hai, toh user automatically logged-in rehta hai.
- **Root Cause 1 (Frontend)**: Login hone par user session `localStorage.setItem('rankly_session', ...)` aur `localStorage.setItem('user', ...)` me unconditionally save hota hai. Kyunki `localStorage` browser close hone ke baad bhi permanent rehta hai, naya tab open karne par `localStorage.getItem('rankly_session')` user ko auto-login kar deta hai.
- **Root Cause 2 (Backend)**: `src/controllers/authController.js` me session cookie par `maxAge = 24 * 60 * 60 * 1000` set hai, jisse browser cookie ko disk par 24 ghante ke liye save kar leta hai bajaye transient session cookie ke.

### Desired Behavior (Secure Session Lifecycle):
- Website ya browser tab band karne par session **turant terminate / expire** hona chahiye.
- User jab dobara site kholega toh usse clean **Login Page** dikhna chahiye.
- Agar user ne explicitly **"Remember Me"** check kiya ho, tabhi persistent storage use hoga.

---

## 🏗️ 2. Architectural Solution & Implementation Plan

### A. Frontend Session Lifecycle (Sumit - Frontend Lead):
1. **Primary Session Store = `sessionStorage`**:
   - Active user session and JWT token will be stored strictly in `sessionStorage` (`sessionStorage.setItem('rankly_session', ...)`).
   - `sessionStorage` is automatically wiped out by the operating system / browser engine as soon as the tab or window is closed.
2. **Conditional "Remember Me" Support**:
   - `localStorage` will ONLY be used if the user checked "Remember Me" during login.
   - If not remembered, all legacy persistent tokens (`localStorage.removeItem('rankly_session')`, `localStorage.removeItem('user')`, `localStorage.removeItem('rankly_jwt')`) are cleared.
3. **Session Auto-Restoration on Tab Boot**:
   - On page load, the system checks `sessionStorage.getItem('rankly_session')`. If the browser was closed, `sessionStorage` is null $\longrightarrow$ User starts fresh on the Login page.

### B. Backend Session Cookie Tuning (Mayur - Backend Architect):
1. **Express Session Transient Cookies (`src/controllers/authController.js`)**:
   - When `rememberMe` is false/unchecked:
     ```javascript
     req.session.cookie.maxAge = null; // Browser deletes cookie on tab/window close
     req.session.cookie.expires = false;
     ```
   - When `rememberMe` is true:
     ```javascript
     req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30-day persistent cookie
     ```
2. **Google OAuth & Candidate Auth Sync**:
   - Apply the same transient cookie standard to Google login credentials endpoint (`/api/auth/google/credential`) and candidate auth routes.

### C. Database & Security Audit (Vaibhav - Database Lead):
1. **Database Session Integrity**:
   - Ensure Prisma session store and SQLite/PG sync cleanly handle session termination without dangling locks.

---

## 👥 3. Team Task Division (Strict Domain Boundaries)

| Engineer / Agent | Strict Domain | Scope / Tasks (MUST DO) | Restricted (MUST NOT DO) | Targeted Files |
| :--- | :--- | :--- | :--- | :--- |
| **Mayur**<br>`Antigravity-Agent-Mayur` | **BACKEND ARCHITECT** | • Configure transient session cookies (`cookie.maxAge = null`, `expires = false`) in auth controllers.<br>• Update `/api/auth/login`, `/api/auth/google/credential`, and candidate auth.<br>• Verify sub-5ms auth latency. | • Do NOT touch HTML/CSS UI layouts.<br>• Do NOT alter DB schema definitions. | `src/controllers/authController.js`, `src/routes/authRoutes.js` |
| **Sumit**<br>`Antigravity-Agent-Sumit` | **FRONTEND LEAD** | • Migrate session persistence to `sessionStorage` across `public/index.html` and `public/index-3.html`.<br>• Only save to `localStorage` if "Remember Me" is selected.<br>• Ensure zero layout shifts and seamless login experience. | • Do NOT touch Express route controllers.<br>• Do NOT touch DB models. | `public/index.html`, `public/index-3.html` |
| **Vaibhav**<br>`Antigravity-Agent-Vaibhav` | **DATABASE LEAD** | • Verify database models & Prisma session integrity.<br>• Check health monitor daemon (`status: HEALTHY`). | • Do NOT touch frontend DOM.<br>• Do NOT touch backend auth handlers. | `src/services/healthChecker.js`, `prisma/schema.prisma` |

---

## 🚦 4. Mandatory Developer Permission Gate

> [!IMPORTANT]
> **Developer Approval Required:**  
> Plan aur architecture ready hai! Browser/tab band hone par session terminate karne aur Login page par laane ke liye kripya **"Proceed"** ya **"Approved"** kahein.  
> Aapke explicit approval ke bina koi code modify nahi kiya jayega.
