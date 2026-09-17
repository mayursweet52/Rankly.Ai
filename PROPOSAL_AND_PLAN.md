# ??? PROPOSAL: Enterprise Identity & Access Management (IAM) Upgrade

## ?? Goal
Upgrade Rankly's authentication system to Zoho-level enterprise security by implementing **Contextual Security & IP Whitelisting**. This ensures employees can only log into the HRMS from approved office networks or devices.

## ??? Tripartite Task Division

### 1. ??? Vaibhav (Database & Infrastructure)
- **Target File:** \prisma/schema.prisma\
- **Action:** 
  - Add \llowedIps\ (String, representing comma-separated IPs) and \isIpRestrictionEnabled\ (Boolean) to \model Organization\.
  - Add \lastLoginIp\ (String) and \lastLoginDevice\ (String) to \model User\.
- **Validation:** Run \
px prisma db push\ to apply the schema migration.

### 2. ?? Mayur (Backend API & Security)
- **Target File:** \src/controllers/authController.js\ & \src/routes/organizationRoutes.js\
- **Action:**
  - Update \erifyOtp\ and login logic to extract the user's \eq.ip\ and \eq.headers['user-agent']\.
  - Check if the user belongs to an Organization with \isIpRestrictionEnabled == true\.
  - If enabled, verify the \eq.ip\ exists in the \llowedIps\ list. If not, **block access immediately** and throw a "Security Risk: Unrecognized Network" error.
  - Create an endpoint for HR to update Organization Security Settings (\PATCH /api/organization/security\).

### 3. ?? Sumit (Frontend UI/UX)
- **Target File:** \public/index.html\ & \public/js/securitySuite.js\
- **Action:**
  - Add a **"Security & IAM"** tab in the main settings area for HR Admins.
  - Create an interface with a toggle switch to enable "Strict Network Restrictions (IP Whitelisting)" and a tag-input for adding allowed IPv4/IPv6 addresses.
  - Update the Login screen to handle the new security error codes smoothly (e.g., "Access Denied: Please connect to office VPN").

## ?? Mandatory Developer Gate
This modifies core authentication and requires schema updates.
**Awaiting Developer Approval ("Proceed" / "Approved") before executing code.**
