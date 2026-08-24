# 📏 Coding Standards & Engineering Rules – Rankly.ai

Adhere strictly to the following engineering guidelines across all contributions in Rankly.ai.

---

## 1. 🔤 General Naming & Syntax Conventions
* **Variables & Functions:** Always use `camelCase` (e.g., `loadEvaluationsHistory`, `currentUser`, `candidateSearchInput`).
* **Classes & Models:** Always use `PascalCase` (e.g., `User`, `Organization`, `Evaluation`).
* **Constants & Enums:** Always use `UPPER_SNAKE_CASE` (e.g., `DEFAULT_ATS_WEIGHTS`, `MAX_OTP_EXPIRY`).
* **CSS Class Names:** Use `kebab-case` (e.g., `dash-sidebar`, `sidebar-dock`, `gooey-input-box`).

---

## 2. ⚡ Asynchronous Operations & Error Handling
* Every async operation **MUST** be written using `async/await` and wrapped inside a `try-catch` block.
* Never leave catch blocks empty. Always display a user-facing toast notification via `showToast(message, type)` or log structured error via Winston logger.
* API responses must always return a consistent JSON structure:
  ```json
  { "success": true, "data": { ... }, "message": "Optional feedback" }
  ```
  Or on failure:
  ```json
  { "success": false, "error": "Descriptive error message" }
  ```

---

## 3. 🎨 Frontend Standards (`public/index-3.html` & `public/index.html`)
* **File Synchronization:** Whenever frontend changes are made to `public/index-3.html`, they **MUST** be mirrored to `public/index.html` to ensure route consistency.
* **API URLs:** Always use root-relative paths in `fetch` calls (e.g., `fetch('/api/auth/login', ...)`, never hardcode `localhost` or absolute production domain).
* **Credentials:** Always include `credentials: 'include'` in all fetch requests to preserve the session cookie.
* **Icons:** Use **Font Awesome 6.x** standard classes (`fas fa-...`, `fa-brands fa-...`).
* **Themes:** All dark mode styles must be scoped under `body.dark-theme` or `#loginPage.dark-mode` without polluting light mode styles.

---

## 4. 🛡️ Backend & Security Standards (`server.js`, `src/*`)
* **Authentication:** Stateful cookie sessions via `express-session` (Do not replace with JWT unless explicitly required).
* **Passwords:** Salt and hash using `bcryptjs` with a work factor of 12.
* **Environment Configuration:** All secrets, keys, and connection strings must be read from `process.env` via `dotenv`.
* **Input Sanitization:** Sanitize and validate all user inputs before database execution.

---

## 5. 🗄️ Database Standards (Prisma)
* Standardize ID fields with `@id @default(uuid())` (or `cuid()`).
* Every persistent table must include `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
