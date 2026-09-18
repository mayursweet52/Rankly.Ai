# Antigravity Tripartite Bridge Sync

## The Architectural Plan
We have successfully migrated the application from a Standard SaaS architecture to a **Zoho-Style Enterprise Multi-Tenant Architecture**. 
We also shipped **Auto-Link Employee Provisioning**: When HR creates an employee, they now get a magic link via email that perfectly connects their new Login to their HR data.

## Sumit (Frontend Lead)
- **MUST DO:** You need to design and implement a "Company/Workspace Switcher" dropdown in the main dashboard (`index.html`). It should look modern (Glassmorphism) and sit either next to the user profile or in the sidebar.
- **MUST NOT:** Do not touch `authController.js` or database schemas.

## Mayur (Backend Lead)
- **MUST DO:** Create the APIs that power the Switcher. Build `GET /api/auth/workspaces` (returns all `OrganizationMember` entries for the user) and `POST /api/auth/switch-workspace` (updates the user's active session to a different company).
- **MUST NOT:** Do not write CSS or touch the DOM in `index.html`.

## Vaibhav (Database Lead)
- **MUST DO:** Monitor the database performance for the new `OrganizationMember` queries and ensure the removal of `@unique` on `Employee.userId` doesn't cause orphaned records.
