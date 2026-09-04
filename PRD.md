# 📋 Product Requirements Document (PRD) – Rankly.ai

**Project Name:** Rankly.ai  
**Tagline:** Next-Gen Executive AI Candidate Screening & Recruitment Intelligence Operating System  
**Version:** 2.0.0  
**Target URL:** [https://ranklyai-production.up.railway.app](https://ranklyai-production.up.railway.app)

---

## 1. 🎯 Executive Summary & Vision
Rankly.ai is a full-stack, enterprise-grade AI talent acquisition and career optimization platform. It bridges the gap between candidates and recruitment teams by providing:
1. **Multi-Metric Semantic ATS Resume Screening** with granular weighted scoring (Skills, Tenure, Toolsets, Education).
2. **Dynamic Talent Pipeline (Kanban Board)** with candidate lifecycle transitions and direct HR dispatch.
3. **Interactive Career & Recruitment AI Assistant** (Chatbot) offering real-time candidate advisory and JD matching.
4. **AI Resume Blueprint Builder & Optimizer** generating high-impact STAR achievements and target ATS keywords.
5. **Dual-Track Access Architecture** supporting both individual jobseekers and enterprise multi-role organizations (Admin, HR, Hiring Manager).

---

## 2. 👥 User Personas & Role Matrix

| Persona | Track | Permissions & Features |
| :--- | :--- | :--- |
| **Normal Jobseeker** | Candidate Track | Signup/Login via Email or Google/GitHub OAuth, AI Resume Builder & Blueprint, 1-on-1 AI Career Advisory Chatbot, Personal Screening History, Profile & Password Management. |
| **HR Specialist** | Enterprise Track | Ingest candidate resume datasets (PDF, DOCX, TXT), view real-time ATS match breakdown, inspect skill gaps & recommendations, assign candidate photo/avatar, advance candidates across stages. |
| **Hiring Manager (HM)** | Enterprise Track | Filter evaluated vector index by skills/role, attach interview notes, dispatch shortlisted profiles directly to HR records (`/api/resume/evaluations/:id/send-to-hr`). |
| **Organization Admin** | Enterprise Track | Full system provisioning, generate & revoke role-specific Referral Invite Codes (`Admin`, `HR`, `HM`), manage company members, monitor team usage analytics. |

---

## 3. 🚀 Core Functional Requirements

### 3.1 Authentication & User Lifecycle
* **Dual Login Tabs:** Segmented *Normal User* vs *Company / Employee* interfaces.
* **Authentication Provider Options:**
  * Standard Email + Password (Bcrypt hashed, 12 rounds).
  * 1-Click Google OAuth & GitHub OAuth integration with automatic callback redirection and role provisioning.
* **Password Recovery & OTP:**
  * 6-digit secure numerical OTP dispatched via Nodemailer (Gmail App Password).
  * 10-minute expiry verification with 3-step UI workflow (Email -> OTP -> New Password).
* **Profile Management:**
  * Update name, phone, age, profession, LinkedIn URL, profile pictures.
  * Permanent account & data deletion with confirmation modal.

### 3.2 Multi-Metric ATS Resume Screening Engine
* **File Uploads:** Drag-and-drop or file browser supporting `.pdf`, `.docx`, `.txt` up to 10MB.
* **Semantic & Rule-Based Fallback Parsing:**
  * Parses structured candidate name, email, phone, skills, experience, and education.
  * Fallback algorithm normalizes messy CV names and ignores section headers.
* **Weighted Scoring Formulation:**
  $$\text{Match Score} = (0.40 \times \text{Skills}) + (0.25 \times \text{Experience}) + (0.20 \times \text{Tools}) + (0.15 \times \text{Education})$$
* **Detailed Breakdown:**
  * Matched Competencies tags (Emerald).
  * Skill Gaps & Deficiencies tags (Rose).
  * Strategic Hiring Recommendations.
  * Executive AI Evaluation Summary.

### 3.3 Aceternity Gooey Candidate Search & Filtering
* **Interactive Fluid Input:** Aceternity UI Gooey liquid SVG morphing filter with organic blob physics.
* **Instant Dynamic Filtering:** Real-time search across candidate names, target roles, matched skills, and summary keywords with instant clear `✕` action.

### 3.4 Talent Pipeline (Kanban Board)
* **4-Stage Workflow:** `Screening` $\rightarrow$ `Interview` $ightarrow$ `Offer` $ightarrow$ `Hired`.
* Drag-and-drop or 1-click stage transition with dynamic counter badges.
* Candidate photo attachment & HR forwarding capabilities.

### 3.5 AI Resume Builder & Blueprint Studio
* Generates ATS-optimized executive summary, quantifiable bullet achievements, and keyword matrices for any designated target profession and skill stack.
* 1-Click copy to clipboard functionality.

### 3.6 Interactive AI Chatbot & Career Advisory
* 10-provider fallback cascade for uninterrupted AI responses.
* Streaming response simulation, quick suggestion chips, conversation history persistence.

---

## 4. 🔒 Non-Functional & Reliability Requirements
* **Session Persistence:** Stateful cookie-based authentication via `express-session` with SQLite session store (`sessions.db`).
* **Uptime & Keep-Alive:** Periodic ping endpoints (`/ping`, `/api/health`) configured for cron monitoring to prevent cold starts on free/hobby tiers.
* **Performance:** Sub-300ms evaluation parsing latency for cached resumes; instant UI feedback with non-blocking async network calls.
