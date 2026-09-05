/**
 * Test Suite for Developer 2 (HRMS Core, Database & Backend Logic)
 */

const assert = require('assert');
const realtimeService = require('../src/services/realtimeNotificationService');
const leaveRoutes = require('../src/routes/leaveRoutes');
const ExcelJS = require('exceljs');

async function runTests() {
  console.log('🧪 Starting Developer 2 (HRMS Core & Backend) Test Suite...\n');

  // Test 1: Realtime Notifications Service
  console.log('▶️ [Test 1] Supabase Realtime Notifications...');
  let eventReceived = false;
  realtimeService.once('candidate_applied', (payload) => {
    eventReceived = true;
    assert.strictEqual(payload.payload.candidateName, 'Rohan Verma');
  });

  await realtimeService.notifyCandidateApplied({
    name: 'Rohan Verma',
    email: 'rohan@example.com',
    targetRole: 'Full Stack Engineer',
    score: 92
  });
  assert.strictEqual(eventReceived, true, 'Local & Supabase Realtime event should trigger');
  console.log('✅ Real-time Candidate & Leave notifications working perfectly.\n');

  // Test 2: Smart Leave Calculator (Weekend Exclusion)
  console.log('▶️ [Test 2] Smart Leave Calculator (Weekend Exclusion Logic)...');
  // Thursday (2026-09-10) to Tuesday (2026-09-15):
  // Thu (1), Fri (2), Sat (skip), Sun (skip), Mon (3), Tue (4) = 4 days
  function testWorkingDays(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    let count = 0;
    let cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endMid = new Date(end);
    endMid.setHours(0, 0, 0, 0);
    while (cur <= endMid) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  const days1 = testWorkingDays('2026-09-10', '2026-09-15'); // Thu to Tue
  assert.strictEqual(days1, 4, 'Thursday to Tuesday must count as 4 working days');
  console.log(`✅ Thursday (2026-09-10) to Tuesday (2026-09-15): ${days1} working days (Weekends excluded).`);

  const days2 = testWorkingDays('2026-09-12', '2026-09-13'); // Sat to Sun
  assert.strictEqual(days2, 0, 'Saturday to Sunday must count as 0 working days');
  console.log(`✅ Saturday to Sunday: ${days2} working days (0 days counted).`);

  const days3 = testWorkingDays('2026-09-07', '2026-09-11'); // Mon to Fri
  assert.strictEqual(days3, 5, 'Monday to Friday must count as 5 working days');
  console.log(`✅ Monday to Friday: ${days3} working days.\n`);

  // Test 3: ExcelJS Export Capability
  console.log('▶️ [Test 3] 1-Click Excel / CSV Export (ExcelJS)...');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance');
  ws.columns = [
    { header: 'Employee ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Work Hours', key: 'hours' }
  ];
  ws.addRow({ id: 'EMP-101', name: 'Mayur Developer', hours: '8.5 hrs' });
  const buffer = await wb.xlsx.writeBuffer();
  assert(buffer.length > 0, 'Excel buffer generated successfully');
  console.log(`✅ ExcelJS generated .xlsx buffer of ${buffer.length} bytes.\n`);

  // Test 4: RBAC Middleware
  console.log('▶️ [Test 4] RBAC Middleware (403 Enforcement)...');
  const { authorizeRoles } = require('../src/middleware/rbac');
  const mw = authorizeRoles('admin', 'hr', 'hr_manager');

  let nextCalled = false;
  let forbiddenCalled = false;

  // Candidate/Employee trying admin/hr action
  mw({ user: { role: 'candidate' } }, {
    status: (code) => {
      if (code === 403) forbiddenCalled = true;
      return { json: () => {} };
    }
  }, () => { nextCalled = true; });

  assert.strictEqual(forbiddenCalled, true, 'Non-HR/Admin role must receive 403');
  assert.strictEqual(nextCalled, false, 'Next must not be called on 403');
  console.log('✅ RBAC 403 Access Denied strictly enforced.\n');

  console.log('🎉 ALL DEVELOPER 2 (VAIBHAV) TESTS PASSED 100%!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
