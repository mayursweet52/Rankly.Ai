# Rankly.ai — Project Memory

## Project Overview
- **Name:** Rankly.ai
- **Type:** AI-Powered Recruitment Platform
- **Stack:** Node.js + Express + SQLite + Prisma + Ollama (Local AI)
- **Frontend:** HTML + Tailwind CSS + Vanilla JS
- **Backend:** Node.js + Express + SQLite
- **Database:** SQLite (Prisma ORM)
- **AI:** Ollama (Local) — Llama 3.2 3B
- **Deployment:** Local Network (Company HR/HM use karein)

## Recent Decisions
1. Pure local mode: Koi cloud nahi, koi API key nahi.
2. Cohere-style dark theme: Glassmorphism, indigo-purple gradient.
3. Multi-user system: Admin, HR, Hiring Manager, Employee.
4. "Send to HR" feature: HM se HR ko candidate forward.

## Known Issues
- OTP email nahi bhejna (local mode mein console log).
- SSL certificate self-signed hai (local network ke liye).
- Mobile responsive thoda improve karna hai.

## File Structure
- `index-3.html`: Main UI (login + dashboard)
- `server.js`: Backend entry point
- `hybridAiService.js`: Local AI (Ollama)
- `src/controllers/`: All API controllers
- `src/routes/`: API routes
- `prisma/schema.prisma`: Database schema
