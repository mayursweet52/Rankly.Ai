# ?? PROPOSAL: Complete the Employee Login & Invitation Flow

## ?? Goal
Currently, when an employee is added via the dashboard, an \Employee\ record is created, but no \User\ authentication profile is built. We need to auto-create their login credentials and send them an invitation email so they can log into the Rankly HRMS.

## ??? Task Division

### 1. ?? Mayur (Backend Architect)
- **Target File:** \src/services/employeeService.js\
- **Action:**
  - After creating the \Employee\ record, check if a \User\ with that \workEmail\ exists.
  - If not, create a \User\ profile with \ole: 'employee'\ and link it to the employee's \organizationId\.
  - Link the \User.id\ to the \Employee.userId\.
  - Use \emailService.sendInvitationEmail()\ to email the new employee telling them they have been added to the organization and instructing them to log in via OTP.

### 2. ?? Sumit (Frontend UI/UX)
- No new UI changes needed. The existing "Add Employee" modal will now trigger the backend to send an email seamlessly.

## ?? Mandatory Developer Gate
This connects the HR database to the Auth system and triggers outbound emails. 
**Awaiting Developer Approval ("Proceed" / "Approved") before executing code.**
