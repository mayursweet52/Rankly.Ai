# ?? Antigravity Multi-Agent Bridge

**Current Phase:** Geofenced Attendance Implementation (Awaiting Approval)
**Architectural Plan:** Implement HTML5 Geolocation API on frontend, Haversine distance formula on backend, and schema modifications for tracking coordinate data.

## ?? Strict Domain Briefings

### ????? Mayur (Backend Architect)
* **MUST DO:** Implement Haversine distance calculation in \hrmsController.js\ and handle lat/lng payload in punch API.
* **MUST NOT DO:** Do not touch HTML/CSS UI.

### ?? Sumit (Frontend Lead)
* **MUST DO:** Implement \
avigator.geolocation\ in frontend JS. Create loading states and verified/unverified badges.
* **MUST NOT DO:** Do not write backend logic or calculate distance on frontend (it is a spoofing security risk).

### ??? Vaibhav (Database Lead)
* **MUST DO:** Update \prisma/schema.prisma\ with \latitude\/\longitude\ fields for \Attendance\ and \Organization\ models.
* **MUST NOT DO:** Do not touch UI templates or Express controllers.
