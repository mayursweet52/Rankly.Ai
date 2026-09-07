# 🎯 Proposal & Architecture Plan: Next-Gen HR Interview Scheduler, Bulk Actions, PDF Previewer & Automated Email Notifications
**Project:** Rankly.ai  
**Task Description:** Implementation of pending high-priority roadmap modules: Interactive Interview Calendar, In-Browser PDF Resume Previewer, HR Bulk Action Toolbar, and Automated Email Dispatcher.  
**Collaboration Model:** Tripartite Collaboration (Mayur [Backend] + Sumit [Frontend] + Vaibhav [Database])  
**Status:** 🟡 **AWAITING DEVELOPER PERMISSION / APPROVAL** (No source code will be modified until approved)

---

## 🏗️ 1. Module Breakdown & Technical Architecture

### A. 📅 Interactive Interview Scheduler & Calendar Sync (Lead: Sumit [Frontend] + Mayur [Backend]):
1. **UI / Modal (`#interviewScheduleModal`)**:
   - Date picker, Time slot selection (Morning, Afternoon, Evening), Round Type (Screening, Technical Deep-Dive, System Design, HR Cultural).
   - Video Platform selector (Google Meet, Microsoft Teams, Zoom, In-Person).
   - Generates instant **1-Click "Add to Google Calendar"** URL (`https://calendar.google.com/calendar/render?action=TEMPLATE...`).
2. **Backend API (`POST /api/candidates/schedule-interview`)**:
   - Saves interview schedule to database.
   - Triggers `sendSystemEmail` with branded HTML invitation containing meeting link, calendar attachments, and time slot.
   - Logs action to immutable audit trail.

### B. 📄 In-Browser Split-Screen PDF / CV Previewer (Lead: Sumit [Frontend]):
1. **Preview Modal (`#cvQuickPreviewModal`)**:
   - Sleek responsive modal to preview candidate CV directly in browser without downloading.
   - Supports zoom controls, page flipping, text selection, and 1-Click Print.

### C. ⚡ HR Candidate Bulk Actions Toolbar (Lead: Sumit [Frontend] + Mayur [Backend]):
1. **Floating Multi-Select Action Bar**:
   - Select multiple candidates via table checkboxes in the AI Candidate Queue.
   - Sticky bottom action bar: "Bulk Shortlist", "Bulk Schedule", "Bulk Reject", "Bulk Export Excel".
2. **Backend Endpoint (`POST /api/candidates/bulk-action`)**:
   - Atomic batch update in Prisma / SQLite with audit logging for every candidate.

### D. 💾 Automated Database Backup Service (Lead: Vaibhav [Database]):
1. **Service (`src/services/dbBackupService.js`)**:
   - Generates daily timestamped snapshots in `backups/`.
   - Endpoint `GET /api/export/backup` for 1-Click admin database archive download.

---

## 👥 2. Strict Tripartite Engineering Ownership

| Engineer / Agent | Role | Scope (MUST DO) | Restricted (MUST NOT DO) | Targeted Files |
| :--- | :--- | :--- | :--- | :--- |
| **Sumit**<br>`Antigravity-Agent-Sumit` | **Frontend Lead** | • Build Interview Scheduler Modal with Google Calendar link generator.<br>• Build In-Browser PDF Preview modal.<br>• Build HR Queue Bulk Action checkbox & floating toolbar in `public/js/hrCandidateQueue.js` & `public/index.html`. | • Do NOT alter Express route handlers or DB models directly. | `public/index.html`, `public/index-3.html`, `public/js/hrCandidateQueue.js` |
| **Mayur**<br>`Antigravity-Agent-Mayur` | **Backend Architect** | • Build `POST /api/candidates/schedule-interview` and `POST /api/candidates/bulk-action` in `src/routes/candidateRoutes.js`.<br>• Integrate branded HTML email notifications via `src/services/emailService.js`. | • Do NOT alter HTML/CSS layouts. | `src/routes/candidateRoutes.js`, `src/services/emailService.js` |
| **Vaibhav**<br>`Antigravity-Agent-Vaibhav` | **Database Lead** | • Create `src/services/dbBackupService.js` and `GET /api/export/backup`.<br>• Verify data integrity, Prisma schemas, and server daemon health. | • Do NOT touch frontend DOM. | `src/services/dbBackupService.js`, `src/routes/exportRoutes.js` |

---

## 🚦 3. Mandatory Developer Permission Gate

> [!IMPORTANT]
> **Developer Approval Required:**  
> Plan aur architecture ready hai! In pending modules (Interview Scheduler, PDF Previewer, Bulk Actions Toolbar, and Automated Email Notifications) ko execute karne ke liye kripya **"Proceed"** ya **"Approved"** kahein.  
> Aapke explicit approval ke bina koi code modify nahi kiya jayega.
