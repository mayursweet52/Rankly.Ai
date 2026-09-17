# ?? Antigravity Multi-Agent Bridge

**Current Phase:** Onboarding Workflows Implementation (Awaiting Approval)
**Architectural Plan:** Create Prisma models for Onboarding templates and employee tasks. Build Express APIs to manage checklists. Build new UI tab in index.html to track new hire progress.

## ?? Strict Domain Briefings

### ????? Mayur (Backend Architect)
* **MUST DO:** Create \onboardingController.js\ with assign and update-task endpoints. Mount to \server.js\.
* **MUST NOT DO:** Do not touch HTML UI or CSS styles.

### ?? Sumit (Frontend Lead)
* **MUST DO:** Add \#tab-onboarding\ in \index.html\. Write \onboardingSuite.js\ for fetching and checking off tasks.
* **MUST NOT DO:** Do not write Prisma queries or backend Express logic.

### ??? Vaibhav (Database Lead)
* **MUST DO:** Add Onboarding models to \schema.prisma\.
* **MUST NOT DO:** Do not touch UI templates or Express controllers.
