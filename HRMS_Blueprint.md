# HRMS Features Blueprint (Zoho People Inspired)

**Source Reference:** [Zoho People - Rankly.ai MySpace](https://people.zoho.in/ranklyai/zp#home/myspace/overview-actionlist)

## 1. Page Structure Map
```text
Rankly.ai HRMS
├── education
├── **Services**
├── **Custom Services**
├── Manage onboarding flows
├── Enable or disable the onboarding flows based on your organizational requirements
│   ├── Candidate onboarding
│   └── Employee onboarding
├── Offer and Appointment Letters
│   ├── Offer Letter
│   └── Appointment Letter
│       └── Note
├── Methods
│   └── Compensatory Off
├── Methods (Attendance)
│   ├── Regularization
│   ├── On Duty
│   ├── Hourly Permission
│   ├── Break
│   ├── Kiosk
│   ├── Office In and Remote In
│   └── Location Tracking
├── Select the default work shift for employees
├── Shift mapping permission
├── Notify employees on a shift change through
├── Eligibility for shift allowance
├── Methods (Timesheets)
│   ├── Projects
│   ├── Clients
│   ├── Timesheets
│   ├── Job Schedule
│   ├── Billing
│   └── Break
└── Primary evaluation methods
    ├── KRA and Goals
    ├── _Choose type_
    │   └── **Preview**
    ├── Feedback
    ├── Skill Set
    ├── Competency
    └── Summary
```

---

## 2. Core Modules Breakdown

### User Profile & Licensing
*   **User License Usage:** e.g., 1 / 10
*   **Active User:** Mayur Jadhav (Super Administrator)

### Onboarding Flows
*   **Candidate onboarding:** Pre-onboarding to collect essential details from candidates who have been offered a job. Distributes offer letters and tracks acceptance.
*   **Employee onboarding:** Comprehensive introduction to company policies, team members on joining date, outlines goals and required training.
*   **Offer and Appointment Letters:** Customized letters with independent tracking.
    *   *Offer Letter:* Formal document extending a job offer and terms of employment.
    *   *Appointment Letter:* Formal contract confirming employment, sent shortly before the joining date.

### Leave Management (Methods)
*   **Compensatory Off:** Entitled leave an employee can take on a regular working day as compensation for working on a holiday/weekend.

### Attendance Management (Methods)
*   **Regularization:** Raise a request to rectify incorrect or missed attendance entries.
*   **On Duty:** Mark presence for working away from office (work site, client location, WFH).
*   **Hourly Permission:** Short requests for time away during office hours.
*   **Break:** Log time away from work.
*   **Kiosk:** Onsite check-in/out through quick photo capture.
*   **Office In and Remote In:** Differentiate office-goers vs remote workers.
*   **Location Tracking:** GPS tracking between work shift hours via mobile app.

### Shift Management
*   **Default Work Shift:** E.g., General [09AM - 06PM].
*   **Shift Mapping Permissions:** Reporting manager vs Employee self-service capabilities.
*   **Notifications:** Email/Feeds for shift changes.
*   **Shift Allowance Eligibility:** Minimum clocked hours requirement for allowance.

### Timesheets & Billing
*   **Projects:** Deliverables linked to clients for effort tracking.
*   **Clients:** Customers for whom work is delivered.
*   **Timesheets:** Track and record time logs for a period, submitted for approval.
*   **Job Schedule:** Schedule jobs via calendar, track planned vs actual hours.
*   **Billing:** Generate bills from time logs to track budgets.

### Performance & Evaluation
*   **KRA and Goals:** Key Result Areas and Goals (Independent or Linked: KRA vs Goals).
*   **Feedback:** Continuous improvement feedback from managers/peers.
*   **Skill Set:** Abilities helping an employee perform (e.g., accounting, coding).
*   **Competency:** Combination of knowledge, skills, and personal attributes (e.g., leadership).
*   **Summary:** Questionnaire and final rating by reviewer.

### Employee Dashboard View (MySpace)
*   **Tabs:** Activities, Feeds, Profile, Approvals, Leave, Attendance, Time Logs, Timesheets, Jobs, Files, Career History, Feedback, Related Data.
*   **Widgets:** Work Schedule, Today's Time Logs status.
