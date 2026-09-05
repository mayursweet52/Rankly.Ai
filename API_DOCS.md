# 🚀 Rankly.ai - API & Database Integration Guide

Welcome to the **Rankly.ai Engineering Reference**. This document contains all endpoints, data structures, and database connection details for **Frontend Engineers** and **AI/ML Engineers**.

---

## 🌐 1. Server & Environment Endpoints

- **Local Development Base URL:** `http://localhost:3000`
- **Alternative / Docker Host:** `http://127.0.0.1:3000`
- **Supabase Cloud API URL:** `https://baywowevjxteagnuhlgs.supabase.co`

### 🔑 Supabase Credentials for Clients:
```env
NEXT_PUBLIC_SUPABASE_URL=https://baywowevjxteagnuhlgs.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_-xMLGlxYiP_vkV22uz6efg_jnjmgPtv
```

---

## 🎨 2. For Frontend Developers (UI Integration)

All responses follow standard REST JSON conventions. For session persistence, always include credentials in `fetch` / `axios`:
```javascript
// Example in Frontend fetch:
const response = await fetch('/api/employees', {
  credentials: 'include'
});
```

### A. Employee Directory & HRMS
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/pg/employees` | Live list of employees directly from Supabase PostgreSQL (Public/Direct). |
| `POST`| `/api/pg/employees` | Insert a new employee directly into Supabase. |
| `GET` | `/api/employees` | Internal HRMS Employee list (Anti-Gravity unified JSON spec). |
| `POST`| `/api/employees` | Create or update an employee in HRMS. |
| `GET` | `/api/employees/:id` | Fetch single employee by ID or employeeCode. |
| `DELETE`| `/api/employees/:id` | Remove employee record. |

#### Sample Response (`GET /api/pg/employees`):
```json
{
  "success": true,
  "count": 4,
  "employees": [
    {
      "employee_id": 101,
      "full_name": "Rohan Sharma",
      "email": "rohan.sharma@rankly.ai",
      "role": "Senior Full Stack Engineer",
      "department": "Engineering",
      "contact_number": "+91 98765 43210",
      "status": "Active",
      "access_control_level": "Admin"
    }
  ]
}
```

### B. ATS Candidate Pipeline & Screening
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/candidates` | Get all candidates in ATS pipeline. |
| `POST`| `/api/pipeline/update` | Update candidate stage (`applied`, `ai_screened`, `interview`, `offered`, `rejected`). |
| `DELETE`| `/api/candidates/:id` | Remove a candidate from pipeline. |

#### Sample Stage Update Payload (`POST /api/pipeline/update`):
```json
{
  "id": "candidate-uuid",
  "stage": "interview",
  "notes": "Candidate shortlisted for technical round"
}
```

### C. Authentication & Session
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/create-account` | Register new user. |
| `POST` | `/api/auth/login` | Log in user and establish session cookie. |
| `GET`  | `/api/auth/me` | Fetch active logged-in user profile. |
| `POST` | `/api/auth/logout` | Terminate session. |

---

## 🤖 3. For AI & Agent Developers (AI Engine & Recommendations)

AI engineers can either consume our Express API or query Supabase directly via the official Python/JS SDKs.

### A. Direct Supabase Query (Python Example)
```python
from supabase import create_client

SUPABASE_URL = "https://baywowevjxteagnuhlgs.supabase.co"
SUPABASE_KEY = "sb_publishable_-xMLGlxYiP_vkV22uz6efg_jnjmgPtv"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1. Fetch AI Agents
agents = supabase.table("ai_agents").select("*").execute()
print("Configured Agents:", agents.data)

# 2. Fetch Skill Recommendations for an Employee
trainings = supabase.table("recommended_training").select("*").execute()
print("Recommended Trainings:", trainings.data)
```

### B. AI Agent API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`  | `/api/agents/:id` | Fetch AI Agent metadata, capabilities, and conversation history. |
| `POST` | `/api/agents/:id/chat` | Send a turn/message to the AI Agent. |
| `POST` | `/api/agents/drafts/:draftId/approve` | Approve an autonomous agent email draft. |
| `POST` | `/api/ai/code-review` | Autonomous bug hunting and architecture review via Nemotron/Cloud AI. |
| `POST` | `/api/ai/chat` | General AI career counseling and interview Q&A. |

#### Sample AI Agent Chat Request (`POST /api/agents/agent_ai_8892/chat`):
```json
{
  "message": "Draft a welcome email and schedule training for our new DevOps Engineer.",
  "recipient": "amit.verma@rankly.ai"
}
```

### C. Skill Marketplace & Gap Analysis
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET`  | `/api/skills` | List all tracked technical skills in the marketplace. |
| `GET`  | `/api/skills/recommendations` | Get AI-driven upskilling courses for employees. |

### D. Internal HRMS Document Engine (Supabase + Local Ollama Nemotron)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/internal/upload` | Upload & ingest internal corporate documents (PDF, DOCX, TXT) with automatic text extraction to Supabase `internal_documents`. |
| `POST` | `/api/documents/internal/process` | Query document context with Local Ollama Nemotron model (`temperature: 0.1`) under strict internal HRMS domain rules. |
| `GET`  | `/api/documents/internal` | List all ingested corporate documents from Supabase. |
| `GET`  | `/api/documents/internal/:id` | Fetch single document payload and extracted text from Supabase. |
| `DELETE`| `/api/documents/internal/:id` | Delete an internal document from Supabase. |

#### Sample Document AI Processing Request (`POST /api/documents/internal/process`):
```json
{
  "documentId": 1,
  "promptText": "Summarize the core PTO allowance, hybrid working hours, and medical leave guidelines."
}
```

---

## 🏥 4. Health & Status Checks

- **Server Health:** `GET /api/health` -> `{"status": "HEALTHY", "issuesFound": 0}`
- **Supabase Connectivity:** `GET /api/supabase/status` -> Live count and verification.

