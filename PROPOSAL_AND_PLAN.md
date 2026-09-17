# ?? PROPOSAL: Geofenced Attendance System (Zoho Parity)

## ?? Goal
Implement a highly requested enterprise feature: **Geofenced Attendance**. Employees will only be marked "Verified" if they punch in from within the office radius (e.g., 100 meters).

## ??? Tripartite Task Division

### 1. ??? Vaibhav (Database & Infrastructure)
- **Target File:** \prisma/schema.prisma\
- **Action:** 
  - Update \model Organization\ to include: \officeLatitude Float?\, \officeLongitude Float?\, \geofenceRadius Int? @default(100)\.
  - Update \model Attendance\ to include: \latitude Float?\, \longitude Float?\, \isGeofenceValid Boolean @default(false)\.
- **Validation:** Run \
px prisma db push\ and verify schema integrity.

### 2. ?? Mayur (Backend & AI Architecture)
- **Target File:** \src/controllers/hrmsController.js\ & \src/routes/hrmsRoutes.js\
- **Action:**
  - Create a utility function using the **Haversine formula** to calculate the distance (in meters) between two GPS coordinates.
  - Update the Punch In/Out API endpoint (\POST /api/hrms/attendance/punch\) to receive \latitude\ and \longitude\ from the client.
  - Compare the employee's coordinates with the Organization's office coordinates. If the distance is <= \geofenceRadius\, set \isGeofenceValid: true\, else \alse\.

### 3. ?? Sumit (Frontend UI/UX)
- **Target File:** \public/employee-myspace.html\ & \public/js/mySpaceSuite.js\
- **Action:**
  - Enhance the "Punch In" button to trigger \
avigator.geolocation.getCurrentPosition()\.
  - Add a "Getting Location..." loading spinner state (using Tailwind/GSAP) to prevent double-clicking.
  - Send the coordinates to the backend via Fetch API.
  - Show a green "? Location Verified" or red "? Outside Geofence" badge on the attendance card.

## ?? Mandatory Developer Gate
This is a core architectural upgrade touching the database and geolocation APIs. 
**Awaiting Developer Approval ("Proceed" / "Approved") before executing code.**
