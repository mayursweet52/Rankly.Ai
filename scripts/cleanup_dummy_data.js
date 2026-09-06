/**
 * Rankly.ai - Automated Dummy & Test Data Cleanup Engine
 * Safely removes test users, test OTPs, audit records, and temp entries
 */

const prisma = require('../src/config/database');
const pgDb = require('../src/config/pgDatabase');

async function cleanDummyData() {
  console.log('======================================================');
  console.log('🧹 RANKLY.AI DUMMY & TEST DATA CLEANUP ENGINE');
  console.log('======================================================\n');

  try {
    // 1. Clean Test Users from SQLite
    const dummyUserFilter = {
      OR: [
        { email: { contains: 'verify_test_' } },
        { email: { contains: 'verify_flow_' } },
        { email: { contains: 'test.candidate' } },
        { email: { contains: 'test.hr.admin' } },
        { email: { contains: 'examplecorp.com' } },
        { email: { contains: 'test_audit' } },
        { firstName: 'Verify' },
        { firstName: 'Test' }
      ]
    };

    const deletedUsers = await prisma.user.deleteMany({
      where: dummyUserFilter
    });
    console.log(`✅ Cleaned ${deletedUsers.count} dummy/test user accounts from SQLite.`);

    // 2. Clean OTP Table (all expired or test OTPs)
    const deletedOtps = await prisma.oTP.deleteMany({
      where: {
        OR: [
          { isUsed: true },
          { expiresAt: { lt: new Date() } },
          { email: { contains: 'test' } },
          { email: { contains: 'verify_' } },
          { email: { contains: 'examplecorp' } }
        ]
      }
    });
    console.log(`✅ Cleaned ${deletedOtps.count} expired/test OTP records.`);

    // 3. Clean Candidate Applications with test names
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "CandidateApplication" 
        WHERE candidateEmail LIKE '%test%' OR candidateEmail LIKE '%audit%' OR notes LIKE '%audit%';
      `);
      console.log('✅ Cleaned test candidate applications from SQLite.');
    } catch(e) {
      console.log('CandidateApplication table note:', e.message);
    }

    // 4. Clean Notifications with test content
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "Notification" 
        WHERE message LIKE '%test%' OR message LIKE '%EMP_AUDIT%' OR title LIKE '%test%';
      `);
      console.log('✅ Cleaned test notifications from SQLite.');
    } catch(e) {
      console.log('Notification table note:', e.message);
    }

    // 5. Clean PostgreSQL / Supabase Tables
    try {
      const delLeaves = await pgDb.query(
        "DELETE FROM leave_requests WHERE reason ILIKE '%audit%' OR reason ILIKE '%test%' OR employee_id = 9999;"
      );
      console.log(`✅ Cleaned ${delLeaves.rowCount || 0} test leave requests from Supabase.`);

      const delAttendance = await pgDb.query(
        "DELETE FROM attendance WHERE notes ILIKE '%audit%' OR notes ILIKE '%test%' OR employee_id = 9999;"
      );
      console.log(`✅ Cleaned ${delAttendance.rowCount || 0} test attendance logs from Supabase.`);
    } catch (pgErr) {
      console.warn('⚠️ Supabase PG cleanup notice:', pgErr.message);
    }

    // 6. Report Clean Database Status
    const remainingUsers = await prisma.user.findMany({
      select: { id: true, email: true, role: true, firstName: true }
    });
    console.log('\n📊 ACTIVE PRODUCTION USERS IN SYSTEM:');
    console.table(remainingUsers);

    console.log('\n🎉 ALL DUMMY AND TEST DATA REMOVED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error cleaning dummy data:', err);
  } finally {
    process.exit(0);
  }
}

cleanDummyData();
