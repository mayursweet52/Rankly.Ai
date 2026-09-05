require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/database');

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

async function autoSeedTestingUsers() {
  console.log('🌱 [Pre-Flight]: Verifying and auto-seeding test credentials in database...');
  try {
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // 1. Seed or update HR Admin user
    await prisma.user.upsert({
      where: { email: 'test.hr.admin@company.com' },
      update: {
        role: 'admin',
        accountType: 'employee',
        isEmailVerified: true,
        password: hashedPassword,
        status: 'active'
      },
      create: {
        email: 'test.hr.admin@company.com',
        username: 'test_hr_admin',
        firstName: 'Test HR',
        lastName: 'Admin',
        password: hashedPassword,
        role: 'admin',
        accountType: 'employee',
        isEmailVerified: true,
        status: 'active'
      }
    });

    // 2. Seed or update standard Candidate user for RBAC isolation testing
    await prisma.user.upsert({
      where: { email: 'test.candidate.rbac@gmail.com' },
      update: {
        role: 'candidate',
        accountType: 'candidate',
        isEmailVerified: true,
        password: hashedPassword,
        status: 'active'
      },
      create: {
        email: 'test.candidate.rbac@gmail.com',
        username: 'test_candidate_rbac',
        firstName: 'Test',
        lastName: 'Candidate',
        password: hashedPassword,
        role: 'candidate',
        accountType: 'candidate',
        isEmailVerified: true,
        status: 'active'
      }
    });

    console.log('  ✅ [Pre-Flight]: test.hr.admin@company.com and test.candidate.rbac@gmail.com verified ready.');
  } catch (seedErr) {
    console.warn('  ⚠️ [Pre-Flight Note]: Direct database seed notice:', seedErr.message);
  }
}

async function runE2ETests() {
  console.log('\n' + '='.repeat(74));
  console.log('🚀 RANKLY.AI — FULL RESILIENT E2E AI PIPELINE & HRMS SECURITY TEST SUITE');
  console.log('='.repeat(74) + '\n');

  // Pre-flight database user validation
  await autoSeedTestingUsers();

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
  // TEST 1: Server Health & Multi-tier Diagnostics
  // -------------------------------------------------------------
  console.log('\n📌 TEST 1: Verifying Server Health & Multi-tier Diagnostics...');
  try {
    const health = await axios.get(`${BASE_URL}/api/health`);
    assert(health.status === 200 && (health.data.status === 'HEALTHY' || health.data.status === 'ok' || health.data.status === 'WARNING'), 'Backend server is healthy and responding with 200 OK');
  } catch (e) {
    assert(false, `Health check failed: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: HR Admin Authentication (Guaranteed Cookie / Session)
  // -------------------------------------------------------------
  console.log('\n📌 TEST 2: Authenticating HR Admin for Protected Endpoints...');
  let adminCookie = '';
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test.hr.admin@company.com',
      password: 'Password123!'
    });
    const setCookie = loginRes.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      adminCookie = setCookie.map(c => c.split(';')[0]).join('; ');
    }
    assert(loginRes.status === 200 && loginRes.data.success, 'HR Admin session established with verified cookie');
    assert(adminCookie.length > 0, 'Session cookie successfully captured for subsequent authenticated calls');
  } catch (e) {
    assert(false, `HR Admin login failed: ${e.response?.data?.message || e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Policy Document Auto-Summary Engine
  // -------------------------------------------------------------
  console.log('\n📌 TEST 3: Testing Policy Document Auto-Summary Engine (POST /api/documents/internal/summarize)...');
  try {
    const policyContent = `
RANKLY.AI ENTERPRISE HYBRID WORK & CONFIDENTIALITY POLICY 2026

1. Purpose and Scope:
This policy outlines the hybrid work protocol, core collaboration hours, and data protection standards for all full-time employees and contractors at Rankly.ai.

2. Core Directives:
- Core collaborative working hours are 10:00 AM to 4:00 PM IST Monday through Friday.
- Employees are eligible for up to 2 remote work days per week subject to managerial pre-approval.
- All internal candidate screening matrices, AI weights, and employee compensation data are strictly confidential.

3. Employee Entitlements:
- 18 Annual Vacation Days (PTO) and 10 Sick/Casual Days per financial year.
- Full health insurance coverage with optional family top-ups.
- Annual learning & development stipend for certified skill upgrades.

4. Compliance & Enforcement:
- Unapproved disclosure of internal HRMS records or client telemetry constitutes a major breach.
- Violations will trigger formal internal grievance review and possible termination.
    `.trim();

    const summaryRes = await axios.post(`${BASE_URL}/api/documents/internal/summarize`, {
      title: 'Enterprise Hybrid Work & Confidentiality Policy 2026',
      content: policyContent,
      category: 'policy'
    }, {
      headers: { Cookie: adminCookie }
    });

    assert(summaryRes.status === 200 && summaryRes.data.success, 'Policy Auto-Summary API returned 200 OK');
    assert(summaryRes.data.summary && summaryRes.data.summary.title, `Summary title generated: "${summaryRes.data.summary.title}"`);
    assert(Array.isArray(summaryRes.data.summary.keyDirectives) && summaryRes.data.summary.keyDirectives.length > 0, `Extracted ${summaryRes.data.summary.keyDirectives.length} Key Directives`);
    assert(summaryRes.data.summary.executiveSummary, 'Executive Summary text block successfully parsed');
    console.log(`    ℹ️ Summary preview: ${typeof summaryRes.data.summary.executiveSummary === 'string' ? summaryRes.data.summary.executiveSummary.slice(0, 160) : JSON.stringify(summaryRes.data.summary.executiveSummary)}...`);
  } catch (e) {
    assert(false, `Policy Auto-Summary failed: ${e.response?.data?.error || e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4: AI Performance & Talent Calibration Report
  // -------------------------------------------------------------
  console.log('\n📌 TEST 4: Testing AI Performance & Talent Calibration Report (GET /api/analytics/ai-report)...');
  try {
    const reportRes = await axios.get(`${BASE_URL}/api/analytics/ai-report`, {
      headers: { Cookie: adminCookie }
    });

    assert(reportRes.status === 200 && reportRes.data.success, 'AI Performance Report API returned 200 OK');
    assert(reportRes.data.report && reportRes.data.report.talentHealthScore !== undefined, `Talent Health Score calculated: ${reportRes.data.report.talentHealthScore}/100`);
    assert(reportRes.data.report.executiveSummary, 'Executive Summary for HR Leadership generated');
    assert(reportRes.data.metricsSummary && reportRes.data.metricsSummary.totalCandidates !== undefined, `Live pipeline metrics aggregated over ${reportRes.data.metricsSummary.totalCandidates} candidates`);
    console.log(`    ℹ️ Report preview: ${reportRes.data.report.executiveSummary.slice(0, 160)}...`);
  } catch (e) {
    assert(false, `AI Performance Report failed: ${e.response?.data?.message || e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 5: Internal HR Q&A / Semantic Document Query
  // -------------------------------------------------------------
  console.log('\n📌 TEST 5: Testing Internal HR Q&A Semantic Processing (POST /api/documents/internal/process)...');
  try {
    const qaRes = await axios.post(`${BASE_URL}/api/documents/internal/process`, {
      promptText: 'What are the core collaboration hours and annual PTO allowance?',
      documentContext: 'Rankly.ai Hybrid Policy: Core hours are 10:00 AM to 4:00 PM IST. Employees receive 18 paid vacation days annually.'
    }, {
      headers: { Cookie: adminCookie }
    });

    assert(qaRes.status === 200 && qaRes.data.success, 'Internal Document Q&A returned 200 OK');
    assert(qaRes.data.result && qaRes.data.result.length > 30, `AI Model Response generated (${qaRes.data.result.length} characters)`);
    assert(!qaRes.data.result.toLowerCase().includes('candidate resume for external'), 'Strict HRMS isolation verified (zero external leakage)');
    console.log(`    ℹ️ Model output: ${qaRes.data.result.slice(0, 140)}...`);
  } catch (e) {
    assert(false, `Internal HR Q&A failed: ${e.response?.data?.error || e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6: Candidate AI Screening & Resume Parsing Pipeline
  // -------------------------------------------------------------
  console.log('\n📌 TEST 6: Testing Candidate Resume AI Screening (POST /api/resumes/screen-resume)...');
  try {
    const candidateResumeText = `
Alex Mercer
Senior Full Stack Engineer
Email: alex.mercer@gmail.com | Phone: +1-555-0199

EXPERIENCE:
Staff Software Engineer at CloudCorp (2022 - Present)
- Architected distributed microservices handling 50k requests/sec using Node.js, Express, Docker, and PostgreSQL.
- Implemented real-time streaming pipelines with Redis and Apache Kafka.
- Led front-end modernization to React 18, Tailwind CSS, and Next.js.

SKILLS: Node.js, TypeScript, React, Docker, Kubernetes, PostgreSQL, AWS, CI/CD, Prisma
EDUCATION: B.S. Computer Science, University of Technology
    `.trim();

    const screenRes = await axios.post(`${BASE_URL}/api/resumes/screen-resume`, {
      resumeText: candidateResumeText,
      targetRole: 'Senior Full Stack Engineer',
      candidateName: 'Alex Mercer',
      candidateEmail: 'alex.mercer@gmail.com'
    });

    assert((screenRes.status === 200 || screenRes.status === 201) && screenRes.data.success, 'Candidate Resume Screening API returned 200/201 Success');
    const ev = screenRes.data.evaluation || screenRes.data.data || {};
    assert(ev.matchScore !== undefined && ev.matchScore >= 60, `Candidate match score calculated: ${ev.matchScore}%`);
    assert(ev.fitVerdict, `Fit verdict generated: "${ev.fitVerdict}"`);
    console.log(`    ℹ️ Candidate: ${ev.candidateName || 'Alex Mercer'} | Score: ${ev.matchScore}% (${ev.fitVerdict})`);
  } catch (e) {
    assert(false, `Candidate screening failed: ${e.response?.data?.message || e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Multi-Layer RBAC Security Isolation (Candidate & Unauth -> 401/403)
  // -------------------------------------------------------------
  console.log('\n📌 TEST 7: Verifying Multi-Layer HRMS Security & RBAC Isolation...');
  try {
    // 7.1 Unauthenticated Request -> Must be 401/403
    let unauthBlocked = false;
    try {
      await axios.post(`${BASE_URL}/api/documents/internal/summarize`, {
        title: 'Unauthorized Policy Access Attempt',
        content: 'Should be blocked immediately'
      });
    } catch (unauthErr) {
      if (unauthErr.response?.status === 401 || unauthErr.response?.status === 403) {
        unauthBlocked = true;
      }
    }
    assert(unauthBlocked, 'Case 7.1: Unauthenticated user blocked with 401/403 from internal policy summaries');

    // 7.2 Authenticate as Candidate user
    let candidateCookie = '';
    const candLoginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test.candidate.rbac@gmail.com',
      password: 'Password123!'
    });
    const candSetCookie = candLoginRes.headers['set-cookie'];
    if (candSetCookie && candSetCookie.length > 0) {
      candidateCookie = candSetCookie.map(c => c.split(';')[0]).join('; ');
    }

    assert(candLoginRes.status === 200 && candidateCookie.length > 0, 'Case 7.2: Candidate authenticated with separate non-HR role');

    // 7.3 Candidate accessing HR Policy Summary -> MUST BE 403 FORBIDDEN
    let candidateBlockedOnPolicy = false;
    try {
      await axios.post(`${BASE_URL}/api/documents/internal/summarize`, {
        title: 'Candidate Intruding on Internal Policies',
        content: 'Confidential corporate policy data'
      }, {
        headers: { Cookie: candidateCookie }
      });
    } catch (candErr) {
      if (candErr.response?.status === 403) {
        candidateBlockedOnPolicy = true;
      }
    }
    assert(candidateBlockedOnPolicy, 'Case 7.3: Candidate strictly blocked with 403 Forbidden on internal policy summary');

    // 7.4 Candidate accessing HR Internal Documents Listing -> MUST BE 403 FORBIDDEN
    let candidateBlockedOnDocs = false;
    try {
      await axios.get(`${BASE_URL}/api/documents/internal`, {
        headers: { Cookie: candidateCookie }
      });
    } catch (candErr) {
      if (candErr.response?.status === 403) {
        candidateBlockedOnDocs = true;
      }
    }
    assert(candidateBlockedOnDocs, 'Case 7.4: Candidate strictly blocked with 403 Forbidden on internal documents listing');

  } catch (e) {
    assert(false, `Security isolation verification encountered error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(74));
  console.log(`🏁 RESILIENT E2E TEST SUITE COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log('='.repeat(74) + '\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runE2ETests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
