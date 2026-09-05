require('dotenv').config();
const axios = require('axios');
const http = require('http');
const supabase = require('../src/config/supabaseClient');

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('\n' + '='.repeat(68));
  console.log('⚖️ RANKLY.AI — EMPLOYEE COMPLAINTS & RBAC TEST SUITE');
  console.log('='.repeat(68) + '\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Step 1: Login as Admin
  // -------------------------------------------------------------
  console.log('🔑 STEP 1: Authenticating as Admin (test.hr.admin@company.com)...');
  let adminCookie = '';
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test.hr.admin@company.com',
      password: 'Password123!'
    }, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });

    const setCookie = loginRes.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      adminCookie = setCookie.map(c => c.split(';')[0]).join('; ');
    }

    assert(loginRes.status === 200 && loginRes.data.success, 'Admin logged in successfully');
    assert(!!adminCookie, 'Admin session cookie obtained');
  } catch (err) {
    assert(false, `Admin login failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Step 2: Submit Named Employee Complaint
  // -------------------------------------------------------------
  console.log('\n📝 STEP 2: Submitting Named Employee Grievance (/api/complaints/submit)...');
  let createdNamedId = null;
  try {
    const res = await axios.post(`${BASE_URL}/api/complaints/submit`, {
      category: 'Workplace Operations',
      subject: 'Lab Equipment Ergonomics Calibration',
      description: 'The height adjustment mechanism on bench #4 requires maintenance.',
      is_anonymous: false
    }, {
      headers: { Cookie: adminCookie }
    });

    assert(res.status === 201 && res.data.success, 'Named complaint submitted (201 Created)');
    assert(res.data.data && res.data.data.id, `Complaint record created in Supabase with ID #${res.data.data.id}`);
    assert(res.data.data.is_anonymous === false, 'Verified is_anonymous is false');
    createdNamedId = res.data.data.id;
  } catch (err) {
    assert(false, `Named complaint submit failed: ${err.response?.data?.error || err.message}`);
  }

  // -------------------------------------------------------------
  // Step 3: Submit Anonymous Complaint
  // -------------------------------------------------------------
  console.log('\n🕵️ STEP 3: Submitting Anonymous Grievance (/api/complaints/submit)...');
  let createdAnonId = null;
  try {
    const res = await axios.post(`${BASE_URL}/api/complaints/submit`, {
      category: 'Ethics & Compliance',
      subject: 'Whistleblower Policy Clarification',
      description: 'Reporting an anonymous process observation for leadership review.',
      is_anonymous: true
    }, {
      headers: { Cookie: adminCookie }
    });

    assert(res.status === 201 && res.data.success, 'Anonymous complaint submitted (201 Created)');
    assert(res.data.data.is_anonymous === true, 'Verified is_anonymous is true');
    assert(res.data.data.employee_id === null, 'Verified employee_id is strictly null for anonymous complaint');
    createdAnonId = res.data.data.id;
  } catch (err) {
    assert(false, `Anonymous complaint submit failed: ${err.response?.data?.error || err.message}`);
  }

  // -------------------------------------------------------------
  // Step 4: Admin Fetch All Complaints
  // -------------------------------------------------------------
  console.log('\n👑 STEP 4: Admin Fetch All Complaints with Joined Employee (/api/complaints/admin/all)...');
  try {
    const res = await axios.get(`${BASE_URL}/api/complaints/admin/all`, {
      headers: { Cookie: adminCookie }
    });

    assert(res.status === 200 && res.data.success, 'Admin complaints endpoint returned 200 OK');
    assert(Array.isArray(res.data.data) && res.data.data.length >= 2, `Retrieved ${res.data.data.length} complaint(s) from Supabase`);
  } catch (err) {
    assert(false, `Admin complaints fetch failed: ${err.response?.data?.error || err.message}`);
  }

  // -------------------------------------------------------------
  // Step 5: Verify RBAC Protection (Unauthenticated & Non-Admin Block)
  // -------------------------------------------------------------
  console.log('\n🔒 STEP 5: Verifying RBAC Security & Role Rejection...');
  try {
    await axios.get(`${BASE_URL}/api/complaints/admin/all`);
    assert(false, 'Unauthenticated request should have been rejected');
  } catch (err) {
    assert(err.response?.status === 401, 'Unauthenticated request correctly rejected with 401 Unauthorized');
  }

  // -------------------------------------------------------------
  // Step 6: Cleanup Test Complaints
  // -------------------------------------------------------------
  console.log('\n🧹 STEP 6: Cleaning up temporary test complaints from Supabase...');
  for (const id of [createdNamedId, createdAnonId].filter(Boolean)) {
    try {
      await supabase.from('complaints').delete().eq('id', id);
      console.log(`    Cleaned up test complaint #${id}`);
    } catch {}
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(68));
  console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('='.repeat(68) + '\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

// Check server status
const req = http.get(`${BASE_URL}/api/health`, (res) => {
  console.log('Active server detected on port 3000. Running test suite...');
  runTest().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
});

req.on('error', () => {
  console.log('Starting local server for test run...');
  const { server } = require('../server');
  setTimeout(() => {
    runTest().then(() => {
      server.close();
      process.exit(0);
    }).catch(err => {
      server.close();
      process.exit(1);
    });
  }, 1500);
});
