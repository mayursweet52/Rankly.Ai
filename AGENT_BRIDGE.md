# Antigravity Tripartite Bridge Sync

## The Architectural Plan
We are transforming Rankly.ai into a full-scale Zoho-style HRMS. We have officially begun **Week 1: Foundation (RBAC & Employee Database)**.

## Vaibhav (Database Lead)
- **DONE:** Upgraded `RolePermission` schema to support 4-level granular constraints (Data, Form, Field, Function). Extended `Employee` schema for Org Chart (`ManagerToEmployee` self-relation), Documents, and Work Location.
- **MUST DO NEXT:** Create a DB seeder script to populate default Zoho roles (`HR_Manager`, `Recruiter`, `Team_Member`) with initial permissions.

## Mayur (Backend Lead)
- **DONE:** Implemented `requirePermission` middleware in `src/middleware/rbac.js`. This gatekeeper intercepts requests, queries the user's role, and dynamically injects `req.rbac` (Data/Field overrides) into the controller.
- **MUST DO NEXT:** Build CRUD APIs for Employee Documents (S3-compatible) and Manager Hierarchy assignments. Update the Employee endpoints to filter data based on `req.rbac.dataAccessLevel`.

## Sumit (Frontend Lead)
- **MUST DO:** Build the "Employee 360" profile UI in `employee-myspace.html`. It needs to show a visually appealing Org Chart (Manager hierarchy) and a Document Upload zone. Also, design a "Role & Permissions" Settings page where Admins can click checkboxes to toggle RBAC settings.
- **MUST NOT:** Do not touch DB schemas or API routing logic.
