# 🚀 Rankly.ai Collaborative Architecture Proposal & Engineering Plan
**Project:** Rankly.ai — Modern Candidate Profile & Intelligent Career Suite  
**Collaboration Model:** Tripartite Collaboration (Antigravity-Agent-Mayur + Antigravity-Agent-Vaibhav + Human Developers)  
**Status:** 🟡 **AWAITING DEVELOPER PERMISSION / APPROVAL** (No code will be executed until approved)

---

## 🎯 1. Executive Summary & Objective
Candidate ke liye ek world-class, responsive aur seamless **Candidate Profile & Career Experience Hub** build karna hai, jisse candidate apni profile complete kar sake, skills aur experience verify kar sake, matching AI jobs find kar sake aur application progress track kar sake.

Is proposal mein dono Antigravity Agents ne milkar modern web standards (WCAG AAA accessibility, 60fps responsiveness, secure RBAC endpoints, zero layout shift) ke mutabiq complete blueprint taiyyar kiya hai.

---

## 🏗️ 2. Architectural Blueprint & Component Division

### A. Candidate Profile Core Modules (Candidate View)
1. **Header & Profile Summary Card**:
   - Dynamic Profile Avatar, Full Name, Current Designation, Primary Location & Work Preference (Remote/Hybrid/Onsite).
   - Profile Strength Meter (0% to 100%) with actionable tips (e.g., *"Add 2 more skills to reach 95%"*).
   - Instant Resume One-Click Upload with AI auto-parsing preview.

2. **Core Information Tabs**:
   - **Tab 1: Personal & Contact**: Email, Phone, LinkedIn, GitHub/Portfolio, Location, Notice Period, Current CTC & Expected CTC.
   - **Tab 2: Experience & Work History**: Company, Role, Start/End Date, Key Achievements, Tech Stack used.
   - **Tab 3: Education & Certifications**: Degree, Institution, Graduation Year, Verified Credential Badges.
   - **Tab 4: Skills & AI Match Matrix**: Verified Top Skills, Proficiency level (Beginner/Intermediate/Expert), Target Job Roles.
   - **Tab 5: Preferences & Job Alerts**: Target Locations, Desired Salary Range, Industry, Work Culture preferences.

3. **Candidate Activity & Applications Hub**:
   - **Active Applications Tracker**: Kanban / List view showing application status (`Applied` ➡️ `Screening` ➡️ `Evaluation Brief & Shortlist` ➡️ `Interview` ➡️ `Offer`).
   - **Saved Jobs & AI Recommendations**: Personalized job feed based on candidate's skill matrix and location filters.
   - **Interview Schedule & Reminders**: Upcoming interviews with direct calendar link / meeting join button.

---

## 🛠️ 3. Backend Data Models & API Contracts

### REST Endpoints (`/api/candidate/...`):
- `GET /api/candidate/profile` — Fetch candidate's complete profile with strength score.
- `PUT /api/candidate/profile` — Update candidate profile details with Zod/Joi schema validation.
- `POST /api/candidate/resume-upload` — Upload resume (PDF/DOCX) & trigger AI auto-extraction.
- `GET /api/candidate/applications` — Fetch all applied jobs with realtime status tracking.
- `GET /api/candidate/recommendations` — Fetch AI-ranked jobs matched to candidate's skills and location.

---

## 👥 4. Team Task Division (Zero Merge Conflicts)

| Agent | Assigned Workstream | Targeted Files |
| :--- | :--- | :--- |
| **Antigravity-Agent-Mayur** (Architect & Frontend) | Candidate Profile UI Tabs, Profile Strength Visualizer, Application Tracker UI, Responsive Layouts | `public/candidateProfile.js`, `public/index.html`, `public/index-3.html` |
| **Antigravity-Agent-Vaibhav** (Backend & DB) | Candidate Profile REST APIs, Schema Validation, Supabase DB Sync, Realtime Status Hooks | `src/routes/candidateRoutes.js`, `src/controllers/candidateController.js`, `src/models/` |

---

## 🔒 5. Quality & Compliance Standards
1. **WCAG AAA Compliance**: High contrast ratios, aria-labels for all interactive elements, keyboard accessibility (Tab, Enter, Escape).
2. **Sub-millisecond State Updates**: Optimistic UI updates with instant feedback.
3. **Database Consistency**: SQLite & PostgreSQL dual-sync with zero test/dummy data pollution.
4. **Security**: JWT Authentication, RBAC 403 authorization middleware on all candidate routes.

---

## 🚦 6. Developer Approval Gate

> [!IMPORTANT]
> **Developer Action Required:**  
> Kripya is plan ko review karein. Agar aapko yeh architecture aur workflow sahi lagta hai, toh **"Proceed"** ya **"Approved"** kahein.  
> Jab tak aap approve nahi karenge, koi bhi agent source code modify nahi karega!
