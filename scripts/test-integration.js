require('dotenv').config();
const axios = require('axios');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/database');
const supabase = require('../src/config/supabaseClient');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function runSuite() {
  console.log('\n' + '='.repeat(65));
  console.log('🧪 RANKLY.AI — FULL SYSTEM INTEGRATION & AI MODULE TEST SUITE');
  console.log('='.repeat(65) + '\n');

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
  // Step 0: Ensure Test User exists
  // -------------------------------------------------------------
  console.log('📋 STEP 0: Preparing Test Account & Database Baseline...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123!', salt);
  const org = await prisma.organization.findFirst();

  await prisma.user.upsert({
    where: { email: 'test.hr.admin@company.com' },
    update: {
      password: hashedPassword,
      isEmailVerified: true,
      role: 'admin',
      accountType: 'employee',
      status: 'active',
      organizationId: org ? org.id : undefined
    },
    create: {
      email: 'test.hr.admin@company.com',
      firstName: 'Admin',
      lastName: 'Tester',
      password: hashedPassword,
      isEmailVerified: true,
      role: 'admin',
      accountType: 'employee',
      status: 'active',
      organizationId: org ? org.id : undefined
    }
  });
  console.log('  Baseline test account: test.hr.admin@company.com (Password123!)\n');

  // -------------------------------------------------------------
  // Step 1: Health & Infrastructure Checks
  // -------------------------------------------------------------
  console.log('🌐 STEP 1: Health & Connectivity Checks');
  try {
    const healthRes = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    assert(healthRes.status === 200 && healthRes.data.status, 'Server Health Check (/api/health) returned 200 OK');
  } catch (e) {
    assert(false, `Server Health Check failed: ${e.message}`);
  }

  try {
    const supaStatus = await axios.get(`${BASE_URL}/api/supabase/status`, { timeout: 5000 });
    assert(supaStatus.status === 200 && supaStatus.data.success, `Supabase Live Connectivity (/api/supabase/status) confirmed: ${supaStatus.data.employeeCount} employees`);
  } catch (e) {
    assert(false, `Supabase Status check failed: ${e.message}`);
  }

  // -------------------------------------------------------------
  // Step 2: CORS Verification
  // -------------------------------------------------------------
  console.log('\n🔒 STEP 2: CORS & Header Resilience');
  try {
    const corsRes = await axios.get(`${BASE_URL}/api/health`, {
      headers: { Origin: 'http://localhost:5173' }
    });
    const allowOrigin = corsRes.headers['access-control-allow-origin'];
    const allowCreds = corsRes.headers['access-control-allow-credentials'];
    assert(allowOrigin === 'http://localhost:5173' || allowOrigin === '*', `CORS Origin accepted for Frontend (Allow-Origin: ${allowOrigin})`);
    assert(allowCreds === 'true', 'CORS Credentials enabled (Allow-Credentials: true)');
  } catch (e) {
    assert(false, `CORS Check failed: ${e.message}`);
  }

  // -------------------------------------------------------------
  // Step 3: Authentication & Session
  // -------------------------------------------------------------
  console.log('\n🔑 STEP 3: Frontend Authentication (Login, Session, Me)');
  let sessionCookie = '';
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
      sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
    }

    assert(loginRes.status === 200 && loginRes.data.success, `User Login (/api/auth/login) successful for ${loginRes.data.user?.email || 'admin'}`);
    assert(!!sessionCookie, 'Session cookie issued upon authentication');
  } catch (e) {
    assert(false, `Login failed: ${e.response?.data?.message || e.message}`);
  }

  try {
    const meRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie }
    });
    assert(meRes.status === 200 && meRes.data.success, `Authenticated User Profile (/api/auth/me) matches: ${meRes.data.user?.email} (${meRes.data.user?.role})`);
  } catch (e) {
    assert(false, `Auth Profile check failed: ${e.response?.data?.message || e.message}`);
  }

  // -------------------------------------------------------------
  // Step 4: Employee Directory (HRMS + Supabase PostgreSQL)
  // -------------------------------------------------------------
  console.log('\n👥 STEP 4: Employee Directory (Supabase Direct & Unified HRMS)');
  try {
    const pgEmpsRes = await axios.get(`${BASE_URL}/api/pg/employees`);
    assert(pgEmpsRes.status === 200 && pgEmpsRes.data.success, `Supabase Live Employees (/api/pg/employees) returned ${pgEmpsRes.data.count} records`);
  } catch (e) {
    assert(false, `Supabase Employees fetch failed: ${e.message}`);
  }

  try {
    const hrmsEmpsRes = await axios.get(`${BASE_URL}/api/employees`, {
      headers: { Cookie: sessionCookie }
    });
    assert(hrmsEmpsRes.status === 200 && hrmsEmpsRes.data.success, `Internal HRMS Employees (/api/employees) returned ${hrmsEmpsRes.data.count} records`);
  } catch (e) {
    assert(false, `HRMS Employees fetch failed: ${e.response?.data?.error || e.message}`);
  }

  // Test inserting new employee into Supabase PostgreSQL
  const newEmpEmail = `test.eng.${Date.now()}@rankly.ai`;
  let createdEmpId = null;
  try {
    const insertEmpRes = await axios.post(`${BASE_URL}/api/pg/employees`, {
      full_name: 'Integration Test Engineer',
      email: newEmpEmail,
      role: 'Staff QA Engineer',
      department: 'Quality Engineering',
      contact_number: '+91 91234 56789',
      status: 'Active',
      access_control_level: 'Level_2'
    });
    assert(insertEmpRes.status === 201 && insertEmpRes.data.employee_id, `Insert Employee into Supabase (/api/pg/employees) succeeded: ID #${insertEmpRes.data.employee_id}`);
    createdEmpId = insertEmpRes.data.employee_id;
  } catch (e) {
    assert(false, `Insert Employee into Supabase failed: ${e.response?.data?.error || e.message}`);
  }

  // Cleanup created test employee
  if (createdEmpId) {
    try {
      await axios.delete(`${BASE_URL}/api/pg/employees/${createdEmpId}`);
      console.log(`    (Cleaned up temporary employee #${createdEmpId})`);
    } catch {}
  }

  // -------------------------------------------------------------
  // Step 5: ATS Candidate Pipeline
  // -------------------------------------------------------------
  console.log('\n📊 STEP 5: ATS Candidate Pipeline & Stage Transition');
  let firstCandidateId = null;
  try {
    const candsRes = await axios.get(`${BASE_URL}/api/candidates`);
    assert(candsRes.status === 200 && candsRes.data.success, `Candidate Pipeline (/api/candidates) returned ${candsRes.data.candidates.length} candidates`);
    if (candsRes.data.candidates && candsRes.data.candidates.length > 0) {
      firstCandidateId = candsRes.data.candidates[0].id;
    }
  } catch (e) {
    assert(false, `Candidate pipeline fetch failed: ${e.message}`);
  }

  if (firstCandidateId) {
    try {
      const updateRes = await axios.post(`${BASE_URL}/api/pipeline/update`, {
        id: firstCandidateId,
        stage: 'interview',
        notes: 'Live integration test moved candidate to interview stage'
      });
      assert(updateRes.status === 200 && updateRes.data.success, `Pipeline Stage Update (/api/pipeline/update) moved candidate to "${updateRes.data.candidate?.stage}"`);
    } catch (e) {
      assert(false, `Pipeline stage update failed: ${e.response?.data?.message || e.message}`);
    }
  }

  // -------------------------------------------------------------
  // Step 6: AI Module & Skill Recommendations
  // -------------------------------------------------------------
  console.log('\n🤖 STEP 6: AI Module (Skills Marketplace & Recommendations)');
  try {
    const skillsRes = await axios.get(`${BASE_URL}/api/skills`);
    assert(skillsRes.status === 200 && skillsRes.data.success, `Skill Catalog (/api/skills) returned ${skillsRes.data.count} tracked skills`);
  } catch (e) {
    assert(false, `Skills fetch failed: ${e.message}`);
  }

  try {
    const recsRes = await axios.get(`${BASE_URL}/api/skills/recommendations`);
    assert(recsRes.status === 200 && recsRes.data.success, `AI Training Recommendations (/api/skills/recommendations) returned ${recsRes.data.count} courses`);
  } catch (e) {
    assert(false, `Training recommendations fetch failed: ${e.message}`);
  }

  try {
    const snapRes = await axios.get(`${BASE_URL}/api/skills/employees/EMP-101`);
    assert(snapRes.status === 200 && snapRes.data.skills, `Employee Skill Snapshot (/api/skills/employees/EMP-101) retrieved: Skill "${snapRes.data.skills?.name}"`);
  } catch (e) {
    assert(false, `Employee snapshot fetch failed: ${e.response?.data?.error || e.message}`);
  }

  // -------------------------------------------------------------
  // Step 7: AI Agents Endpoint & Chat Turn
  // -------------------------------------------------------------
  console.log('\n🧠 STEP 7: AI Autonomous Agents & Inference');
  try {
    const agentsRes = await axios.get(`${BASE_URL}/api/agents`);
    assert(agentsRes.status === 200 && agentsRes.data.success, `AI Agents List (/api/agents) returned ${agentsRes.data.count} agent(s)`);
  } catch (e) {
    assert(false, `AI Agents list failed: ${e.message}`);
  }

  try {
    const singleAgentRes = await axios.get(`${BASE_URL}/api/agents/agent_ai_8892`);
    assert(singleAgentRes.status === 200 && singleAgentRes.data.agent_id, `AI Agent Metadata (/api/agents/agent_ai_8892) retrieved: "${singleAgentRes.data.name}" (${singleAgentRes.data.model_type})`);
  } catch (e) {
    assert(false, `AI Agent metadata failed: ${e.message}`);
  }

  try {
    console.log('  Executing live AI Agent chat turn (Groq/OpenRouter fallback)...');
    const chatRes = await axios.post(`${BASE_URL}/api/agents/agent_ai_8892/chat`, {
      message: 'Draft a welcome onboarding email for our new Full Stack Developer.',
      recipient: 'rohan.sharma@rankly.ai'
    }, { timeout: 15000 });
    assert(chatRes.status === 200 && chatRes.data.success, `AI Agent Chat Turn executed successfully! Reply length: ${chatRes.data.reply?.length || 0} chars`);
    if (chatRes.data.staged_draft) {
      console.log(`    ✉️ Autonomous Draft Staged: ID ${chatRes.data.staged_draft.draft_id} to ${chatRes.data.staged_draft.recipient}`);
    }
  } catch (e) {
    assert(false, `AI Agent chat failed: ${e.response?.data?.error || e.message}`);
  }

  // -------------------------------------------------------------
  // Step 8: Direct Supabase Queries (Simulating AI Developer / Python SDK)
  // -------------------------------------------------------------
  console.log('\n⚡ STEP 8: Direct Supabase Queries (Simulating AI Developer / Python SDK)');
  try {
    const { data: sbSkills, error: sErr } = await supabase.from('skills').select('*');
    assert(!sErr && sbSkills && sbSkills.length > 0, `Supabase Direct SDK: "skills" table has ${sbSkills ? sbSkills.length : 0} records`);
  } catch (e) {
    assert(false, `Supabase direct skills query failed: ${e.message}`);
  }

  try {
    const { data: sbTrain, error: tErr } = await supabase.from('recommended_training').select('*');
    assert(!tErr && sbTrain && sbTrain.length > 0, `Supabase Direct SDK: "recommended_training" table has ${sbTrain ? sbTrain.length : 0} records`);
  } catch (e) {
    assert(false, `Supabase direct recommended_training query failed: ${e.message}`);
  }

  try {
    const { data: sbAgents, error: aErr } = await supabase.from('ai_agents').select('*');
    assert(!aErr && sbAgents && sbAgents.length > 0, `Supabase Direct SDK: "ai_agents" table has ${sbAgents ? sbAgents.length : 0} records`);
  } catch (e) {
    assert(false, `Supabase direct ai_agents query failed: ${e.message}`);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(65));
  console.log(`🏁 INTEGRATION TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('='.repeat(65) + '\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Check if server is already running, else start it for test
const req = http.get(`${BASE_URL}/api/health`, (res) => {
  console.log('Detected active Rankly.ai server on port 3000. Running tests against live instance...');
  runSuite().catch(err => {
    console.error('Fatal suite error:', err);
    process.exit(1);
  });
});

req.on('error', () => {
  console.log('Server not currently listening on port 3000. Starting local server for test run...');
  const { server } = require('../server');
  setTimeout(() => {
    runSuite().then(() => {
      console.log('Integration test complete. Closing temporary server instance...');
      server.close();
      process.exit(0);
    }).catch(err => {
      console.error('Fatal suite error:', err);
      server.close();
      process.exit(1);
    });
  }, 1500);
});
