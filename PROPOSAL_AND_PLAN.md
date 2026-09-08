# 🚀 Proposal & Architecture Plan: Dedicated NVIDIA Nemotron 550B AI Engine
**Project:** Rankly.ai  
**Primary Architect:** Mayur Jadhav (`Antigravity-Agent-Mayur`)  
**Status:** 🟡 **AWAITING DEVELOPER APPROVAL ("Proceed / Approved")**  
**Lead Assignment:**
- **Mayur (Primary AI & Backend Architect)**: 🟢 **100% ACTIVE & FOCUSED ON NEMOTRON**
- **Sumit (Frontend Lead)**: 💤 **RESTING / ON STANDBY**
- **Vaibhav (Database Lead)**: 💤 **RESTING / ON STANDBY**

---

## 🎯 1. Objective & Discovery

Aapki requirement ke mutabiq frontend aur doosre sabhi modules ko pause/rest karke humara pura focus **NVIDIA Nemotron AI Engine** par hai.

### 🔍 Live API Discovery:
Humne live NVIDIA API (`https://integrate.api.nvidia.com/v1`) ko test kiya:
1. **Puraani Problem**: Codebase me hardcoded model `nvidia/llama-3.1-nemotron-70b-instruct` tha, jo NVIDIA server par `404 Not Found` de raha tha (jiski wajah se Tier 0 fail ho kar doosre providers par cascade ho raha tha).
2. **Live Verified Solution**:
   - 🌟 **Primary Model**: `nvidia/nemotron-3-ultra-550b-a55b` — NVIDIA ka flagship 550 Billion parameter ultra-deep reasoning model (`enable_thinking: true`).
   - ⚡ **Fast Fallback Model**: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` — 30 Billion parameter ultra-fast reasoning model (verified working with live reasoning output).

---

## 🏛️ 2. Proposed Technical Implementation

### Module 1: Upgrade `src/services/aiService.js` (Tier 0 AI Engine)
- Replace non-existent 70B model with live dual-tier Nemotron engine:
  - **Tier 0A (Deep Reasoning)**: `nvidia/nemotron-3-ultra-550b-a55b` (temperature: 0.2, max_tokens: 4096, extra_body: `enable_thinking: true`).
  - **Tier 0B (Ultra-Fast Fallback)**: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` if 550B experiences temporary cloud queue congestion.
- Support extraction of `reasoning_content` alongside `content` so ATS recruiters get transparent AI reasoning.

### Module 2: Dedicated Nemotron Evaluator Service (`src/services/aiMatcher.js`)
- **`evaluateCandidateWithNemotron(resumeText, jobDescription)`**:
  - Scores candidate fit (0-100 clamped).
  - Semantic Skill Match & Missing Competencies.
  - Generates 3 targeted interview probe questions for candidate weak spots.
  - Returns chain-of-thought AI reasoning for full recruiter explainability.
- **`parseResumeWithNemotron(rawText)`**:
  - Deep semantic parsing of contact info, experience, skills, certifications, and achievements.

### Module 3: Dedicated REST API Endpoints (`src/routes/aiRoutes.js`)
- `POST /api/ai/nemotron/evaluate` — Direct resume vs JD assessment powered by Nemotron 550B.
- `POST /api/ai/nemotron/chat` — Career Counselor & HR Assistant chat backed by Nemotron reasoning.
- `GET /api/ai/nemotron/status` — Live health check of NVIDIA Nemotron models.

---

## 👥 3. Multi-Agent Domain Ownership

| Agent | Developer | Status | Scope |
| :--- | :--- | :--- | :--- |
| **Mayur** | **Mayur Jadhav** | 🟢 **ACTIVE** | `src/services/aiService.js`, `src/services/aiMatcher.js`, `src/routes/aiRoutes.js`, NVIDIA Nemotron inference. |
| **Sumit** | **Sumit Khomne** | 💤 **RESTING** | Frontend UI / HTML / CSS / Stepper / Views — **STRICTLY UNTOUCHED**. |
| **Vaibhav**| **Vaibhav Aakhade**| 💤 **RESTING** | Database / Prisma / Migrations — **STRICTLY UNTOUCHED**. |

---

## 🚦 4. Mandatory Developer Permission Gate

> [!IMPORTANT]
> **Awaiting Developer Permission:**  
> Plan aur architecture ready hai. Is execution ko start karne ke liye kripya **"Proceed"** ya **"Approved"** kahein.
