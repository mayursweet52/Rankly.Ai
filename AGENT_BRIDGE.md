# Rankly.Ai Agent Bridge Protocol

**Current Phase:** Phase 3 - Time & Attendance (Leave Management)
**Status:** In Progress (Leave Management Core Implemented)

## 🏗️ Architectural Plan
Implement a fully dynamic multi-tenant Leave Management System with custom Accruals, multi-level approvals, and RBAC visibility.
- **Database:** Prisma SQLite (`LeaveType`, `LeavePolicy`, `LeaveBalance`, `LeaveRequest`, `LeaveApproval`, `Holiday`, `LeaveAccrualLog` — all scoped by `organizationId`).
- **Backend:** Vanilla Node.js / Express Controllers (`leaveTypeController.js`, `leaveBalanceController.js`, `leaveRequestController.js`, `holidayController.js`).
- **Frontend:** Vanilla HTML/JS templates for Admin Configuration, Employee Application, and Manager Approvals.

---

## 👨‍💻 Tripartite Briefing

### Sumit (Frontend & UI/UX Lead)
✅ **MUST DO:**
- Review the new HTML pages: `apply-leave.html`, `my-leave-requests.html`, `leave-approvals.html`, `admin-leave-types.html`.
- Polish the Tailwind UI to match the Rankly dashboard design language (add animations, refine spacing).
- Replace raw browser `alert()` with modern toast notifications (e.g., SweetAlert).

🚫 **MUST NOT DO:**
- Do not change API endpoint paths or the JSON structure that the API expects.

### Vaibhav (Database & Infrastructure Lead)
✅ **MUST DO:**
- Review the updated `prisma/schema.prisma` models for Leave Management.
- Ensure all `organizationId` cascades are working properly for multi-tenancy.

🚫 **MUST NOT DO:**
- Do not touch frontend HTML DOM IDs as the Vanilla JS logic relies on them.

### Mayur (AI & Backend Architect)
✅ **MUST DO:**
- Review `src/controllers/leave*Controller.js` logic for accrual math (excluding weekends/holidays) and multi-level approvals.
- Ensure the custom RBAC scopes (`NO_DATA`, `MY_DATA`, `SUBORDINATES`, `ALL_DATA`) securely filter Leave Requests.

🚫 **MUST NOT DO:**
- Do not modify frontend CSS or Tailwind classes.
