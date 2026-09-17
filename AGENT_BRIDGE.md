# ?? Antigravity Multi-Agent Bridge

**Current Phase:** Enterprise IAM & IP Whitelisting (Awaiting Approval)
**Architectural Plan:** Modify Prisma schema to track allowed IPs for Orgs and last login IPs for Users. Inject IP validation middleware into authController. Build a UI in settings for HR to configure IAM.

## ?? Strict Domain Briefings

### ????? Mayur (Backend Architect)
* **MUST DO:** Implement IP capture (req.ip) and block logic in authController. Build PATCH API for updating org security.
* **MUST NOT DO:** Do not build frontend HTML.

### ?? Sumit (Frontend Lead)
* **MUST DO:** Create Security settings tab for HR to toggle IP restrictions and input IPs.
* **MUST NOT DO:** Do not write database queries.

### ??? Vaibhav (Database Lead)
* **MUST DO:** Add allowedIps, isIpRestrictionEnabled to Organization. Add lastLoginIp, lastLoginDevice to User.
* **MUST NOT DO:** Do not touch Express controllers.
