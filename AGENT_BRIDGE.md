# Antigravity Agent Bridge Briefing

## Architectural State
We are in **Phase 2 (Dynamic Employee Database)** of the Enterprise HRMS Upgrade. 
We have successfully replaced the static Employee setup with a fully dynamic Custom Fields engine (`CustomField`, `EmployeeCustomFieldValue`).
We have built:
1. `public/admin-fields.html` - Admin Field Builder
2. `public/employees.html` - Directory View
3. `public/employee-form.html` - Add/Edit Form supporting dynamic sections.

## Tripartite Briefing

### For Sumit (Frontend Lead)
- **MUST DO**: Review the newly created UI screens (`/employees.html`, `/employee-form.html`, `/admin-fields.html`). Integrate links to them in the massive main dashboard (`index.html`) sidebar. Add any missing animations and ensure WCAG AAA accessibility.
- **MUST NOT DO**: Do not modify the API routes or Prisma schema. 

### For Mayur (Backend Architect)
- **MUST DO**: Prepare the API layer for Phase 3 (Time & Attendance). Ensure the newly created Employee APIs and `dataScope.js` correctly enforce the dynamic Data Scopes (MY_DATA, SUBORDINATES, etc.).
- **MUST NOT DO**: Do not modify the DOM UI layouts directly.

### For Vaibhav (Database Lead)
- **MUST DO**: Monitor the SQLite database structure. Phase 2 dropped old rigid HR tables to implement dynamic CustomFields. Ensure future tables for Phase 3 (Attendance) link correctly to the new `Employee` (UUID) model and are scoped by `organizationId`.
- **MUST NOT DO**: Do not modify the frontend UI or backend Express business logic.
