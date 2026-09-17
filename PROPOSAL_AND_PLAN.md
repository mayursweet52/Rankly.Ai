# ?? PROPOSAL: Onboarding Checklists & Workflows (Zoho Parity - Phase 2)

## ?? Goal
Build an automated **Employee Onboarding Workflow** system. When a candidate is hired, HR needs an organized checklist of tasks (e.g., 'Allocate Laptop', 'Create Email ID', 'Sign NDA') distributed across departments (IT, HR, Finance).

## ??? Tripartite Task Division

### 1. ??? Vaibhav (Database & Infrastructure)
- **Target File:** \prisma/schema.prisma\
- **Action:** 
  - Create \OnboardingTemplate\ and \OnboardingTaskTemplate\ for standard reusable workflows.
  - Create \EmployeeOnboarding\ and \EmployeeOnboardingTask\ to track individual employee progress.
  - Link them to the \Employee\ model.
- **Validation:** Run \
px prisma db push\ to apply the migration.

### 2. ?? Mayur (Backend API)
- **Target File:** \src/controllers/onboardingController.js\ & \src/routes/onboardingRoutes.js\
- **Action:**
  - Build endpoints to create templates.
  - Build \POST /api/onboarding/assign\ to automatically generate a task checklist for a specific employee.
  - Build \PATCH /api/onboarding/tasks/:taskId\ to tick off completed tasks.
  - Mount routes in \server.js\ under \/api/onboarding\.

### 3. ?? Sumit (Frontend UI/UX)
- **Target File:** \public/index.html\ & \public/js/onboardingSuite.js\
- **Action:**
  - Add a new "Onboarding" menu item in the main Sidebar.
  - Build \#tab-onboarding\ featuring a progress-bar driven Kanban/List view of new hires.
  - Create an interface to check off tasks dynamically.

## ?? Mandatory Developer Gate
**Awaiting Developer Approval ("Proceed" / "Approved") before executing code.**
