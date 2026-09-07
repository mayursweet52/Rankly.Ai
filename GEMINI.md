# Antigravity Agent Rules for Rankly.Ai

## Automatic Git Pull on Every Interaction (MANDATORY USER RULE)
- **Rule**: You MUST ALWAYS pull the latest changes from GitHub (`git pull origin main`) before starting any new task and after every result/turn. This ensures the workspace is always 100% in sync with changes committed by teammates and prevents merge conflicts.

## Automatic Git Push on Every Update (MANDATORY USER RULE)
- **Rule**: After completing ANY code modification, bug fix, feature addition, or file update requested by the user, you MUST ALWAYS immediately stage, commit, and push the changes directly to GitHub:
  1. Pull latest remote updates (`git pull origin main`).
  2. Stage all modified and added files (`git add .`).
  3. Commit with an informative, descriptive commit message.
  4. Push immediately to `origin main` (and the active feature branch) on GitHub (`git push origin main`).
- Do NOT wait for the user to remind you to push or pull. It must happen proactively on EVERY turn and update.
- Keep the local server daemon up to date and verified.

## Strict Tripartite Engineering Ownership (STRICT DOMAIN BOUNDARIES)
- **Mayur (Primary AI & Backend Architect)**:
  - **SCOPE**: Node.js/Express APIs (`src/routes/*`, `src/controllers/*`), NVIDIA Nemotron AI Engine (`src/services/aiMatcher.js`, `src/services/documentParser.js`), Authentication & Middleware (`src/middleware/*`), Supabase Realtime workers.
  - **DO NOT TOUCH**: Frontend HTML/CSS/DOM UI layouts or direct database schema definitions.
- **Sumit (Frontend & UI/UX Lead)**:
  - **SCOPE**: Frontend UI/UX (`public/*.html`, `public/js/*`, `public/candidateProfile.js`), Responsive Tailwind design, Forms, Modals, 4-Stage Stepper, Recruiter Queue Views, Animations & WCAG AAA Accessibility.
  - **DO NOT TOUCH**: Backend API endpoints or direct database models.
- **Vaibhav (Database & Infrastructure Lead)**:
  - **SCOPE**: Database Architecture (`prisma/schema.prisma`, SQLite & PostgreSQL sync), Migrations (`scripts/create_*`), DB Indexes & Relations, Data Integrity, ExcelJS/CSV Database Exports (`src/routes/exportRoutes.js`), Self-Healing Daemon (`src/services/healthChecker.js`).
  - **DO NOT TOUCH**: Frontend DOM elements or API business logic.

## Autonomous Multi-Agent Bridge & Briefing Protocol (AGENT_BRIDGE)
- **Rule**: On every interaction, update `AGENT_BRIDGE.json` and `AGENT_BRIDGE.md` with:
  1. The overall architectural plan.
  2. Clear, explicit briefing on what **Sumit MUST do vs MUST NOT do**.
  3. Clear, explicit briefing on what **Vaibhav MUST do vs MUST NOT do**.
  4. Clear, explicit briefing on what **Mayur MUST do vs MUST NOT do**.

## Tripartite Collaborative Planning & Mandatory Developer Permission Gate (MANDATORY RULE)
- **Rule**:
  1. **Collaborative Brainstorming**: All 3 Antigravity agents formulate the best-practice plan together, following modern web engineering rules (WCAG AAA accessibility, 60fps responsive UI, clean API contracts, zero layout shifts).
  2. **Clear Proposal & Explanation**: Write the proposal clearly in simple, understandable terms in `PROPOSAL_AND_PLAN.md` with options and visual breakdown.
  3. **STRICT DEVELOPER PERMISSION GATE**: You MUST NEVER execute code modifications without explicit developer approval. Present the plan clearly to the user/developers (Mayur, Sumit, Vaibhav), explain the rationale in detail, and wait for explicit permission ("Proceed / Approved") before writing code.
  4. **Divided Execution**: Once approved by the developers, all three agents execute their cleanly divided tasks with zero merge conflicts.


