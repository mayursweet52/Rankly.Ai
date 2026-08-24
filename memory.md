# 🧠 Project Decisions & Memory Log – Rankly.ai

This log records major technical decisions, architectural pivots, bug fixes, and milestones established throughout the development of Rankly.ai.

---

## 📌 Architectural Decisions & Solutions Log

### 1. Multi-Metric ATS Scoring Engine (vs Single Generic Percentage)
* **Decision:** Replaced arbitrary flat match percentages with an objective 4-component weighted formula (40% skills, 25% experience tenure, 20% tools/frameworks, 15% education).
* **Rationale:** Ensures realistic, reliable candidate screening evaluations that differentiate junior vs senior talent.

### 2. Candidate Name Normalization Parser
* **Decision:** Engineered intelligent regular expression sanitization in `src/utils/helpers.js` and `renderEvaluatedCandidates()`.
* **Fix:** Prevents section headers (e.g., "EXPERIENCE", "SKILLS", "SUMMARY") or file extensions from showing up as the candidate's name.

### 3. Google OAuth & Railway Callback Resolution
* **Decision:** Configured Passport Google Strategy with dynamic callback detection supporting both local development and live Railway production environment (`https://rankly-ai-production.up.railway.app/api/auth/google/callback`).
* **Fix:** Solved redirect URI mismatch issues and preserved session cookies across domains.

### 4. Nodemailer Password Reset OTP
* **Decision:** Replaced third-party SMS dependencies with a 6-digit numeric OTP email dispatcher using Gmail App Passwords and SQLite timestamp expiration.
* **Fix:** Implemented a clean 3-step modal flow (Email -> OTP Verify -> New Password Update) with instant feedback.

### 5. Pure Matte Black Theme & Border Elimination
* **Decision:** Eliminated aggressive blue gradients in Dark Mode in favor of pure matte black (`#0a0a0f` / `#14141f`).
* **Fix:** Removed the harsh vertical sidebar border line in Dark Mode, aligning the navigation into a sleek Mac/iOS unified island floating dock container.

### 6. Aceternity UI Gooey Input Search Integration
* **Decision:** Implemented pure Vanilla SVG Gooey Filter (`feGaussianBlur` + `feColorMatrix`) with liquid morphing blobs for real-time candidate search in the Screening Matrix.
* **Fix:** Fixed icon text overlap by adding dedicated circular icon badges, proper padding, and high-contrast dark glassmorphic styling.

### 7. Railway Free-Tier Keep-Alive
* **Decision:** Created lightweight `/ping` and `/api/health` endpoints for integration with external cron services (e.g. `cron-job.org`) to prevent cold boot latency.
