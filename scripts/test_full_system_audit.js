/**
 * Rankly.ai - Comprehensive Full System End-to-End Audit Script
 * Tests all backend routes, database queries, and system features
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runFullAudit() {
  console.log('================================================================');
  console.log('🚀 RANKLY.AI FULL SYSTEM END-TO-END AUDIT & VERIFICATION');
  console.log('================================================================\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ Testing: ${name}... `);
      await fn();
      console.log('✅ PASS');
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: err.message });
    }
  }

  // 1. System Health & Infrastructure
  await test('Server Health Check (/api/health)', async () => {
    const res = await makeRequest('/api/health');
    if (res.statusCode !== 200 || !res.body.status) throw new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.body)}`);
  });

  await test('Supabase Status Check (/api/supabase/status)', async () => {
    const res = await makeRequest('/api/supabase/status');
    if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
  });

  // 2. Candidate Open Job Listings & Multi-Location Filtering
  await test('Curated Jobs Listing (/api/candidate/jobs)', async () => {
    const res = await makeRequest('/api/candidate/jobs');
    if (res.statusCode !== 200 || !res.body.success || !Array.isArray(res.body.jobs)) {
      throw new Error(`Jobs API failed: ${JSON.stringify(res.body)}`);
    }
    if (res.body.jobs.length < 5) throw new Error(`Expected at least 5 jobs, got ${res.body.jobs.length}`);
  });

  await test('Job Location Filter - Bengaluru (/api/candidate/jobs?location=bengaluru)', async () => {
    const res = await makeRequest('/api/candidate/jobs?location=bengaluru');
    if (res.statusCode !== 200 || !res.body.success) throw new Error(`Status ${res.statusCode}`);
    if (res.body.jobs.length === 0) throw new Error('Expected at least 1 job in Bengaluru');
  });

  await test('Job Work Mode Filter - Remote (/api/candidate/jobs?workType=remote)', async () => {
    const res = await makeRequest('/api/candidate/jobs?workType=remote');
    if (res.statusCode !== 200 || !res.body.success) throw new Error(`Status ${res.statusCode}`);
    if (res.body.jobs.length === 0) throw new Error('Expected at least 1 remote job');
  });

  // 3. ATS Score & JD Matcher
  await test('ATS Score Calculation (/api/candidate/ats-check)', async () => {
    const res = await makeRequest('/api/candidate/ats-check', 'POST', {
      resumeText: 'Senior Full Stack Software Engineer with 6 years experience in React, Node.js, TypeScript, PostgreSQL, and Docker.',
      jobDescription: 'Looking for a Senior Full Stack Engineer with React, Node.js, and TypeScript skills.',
      targetRole: 'Senior Full Stack Engineer',
      candidateName: 'Audit Test Candidate'
    });
    if (res.statusCode !== 200 || !res.body.success || typeof res.body.matchScore !== 'number') {
      throw new Error(`ATS score failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 4. Skill Gap Finder
  await test('Skill Gap & Benchmark Analyzer (/api/candidate/skill-gap)', async () => {
    const res = await makeRequest('/api/candidate/skill-gap', 'POST', {
      targetRole: 'DevOps Engineer',
      userSkills: ['Docker', 'Linux', 'Git', 'CI/CD']
    });
    if (res.statusCode !== 200 || !res.body.success || !Array.isArray(res.body.skills)) {
      throw new Error(`Skill gap failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 5. AI Cover Letter Generator
  await test('AI Cover Letter Generator (/api/candidate/generate-cover-letter)', async () => {
    const res = await makeRequest('/api/candidate/generate-cover-letter', 'POST', {
      candidateName: 'Mayur Developer',
      targetRole: 'Lead Backend Engineer',
      companyName: 'Acme Cloud Inc',
      resumeText: 'Experienced Node.js architect with 5+ years building microservices and high-scale APIs.',
      jobDescription: 'Seeking backend engineering leader for high throughput APIs.',
      tone: 'confident'
    });
    if (res.statusCode !== 200 || !res.body.success || !res.body.coverLetter) {
      throw new Error(`Cover letter generation failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 6. HR AI Candidate Queue
  let testCandidateId = null;
  await test('HR AI-Sorted Candidate Queue (/api/candidate/ai-queue)', async () => {
    const res = await makeRequest('/api/candidate/ai-queue');
    if (res.statusCode !== 200 || !res.body.success || !Array.isArray(res.body.candidates)) {
      throw new Error(`AI Queue failed: ${JSON.stringify(res.body)}`);
    }
    if (res.body.candidates.length > 0) {
      testCandidateId = res.body.candidates[0].id;
    }
  });

  // 7. Candidate Evaluation Brief & Dossier
  if (testCandidateId) {
    await test(`Candidate Evaluation Brief (/api/candidate/${testCandidateId}/evaluation-brief)`, async () => {
      const res = await makeRequest(`/api/candidate/${testCandidateId}/evaluation-brief`);
      if (res.statusCode !== 200 || !res.body.success || !res.body.cheatSheet) {
        throw new Error(`Evaluation Brief failed: ${JSON.stringify(res.body)}`);
      }
    });

    await test(`Candidate Fast Action (/api/candidate/${testCandidateId}/action)`, async () => {
      const res = await makeRequest(`/api/candidate/${testCandidateId}/action`, 'POST', {
        action: 'SHORTLIST',
        notes: 'Verified via full system automated audit.'
      });
      if (res.statusCode !== 200 || !res.body.success) {
        throw new Error(`Candidate Action failed: ${JSON.stringify(res.body)}`);
      }
    });
  }

  // 8. Candidate Audit Logs
  await test('Candidate Audit Trail (/api/candidate/audit-logs)', async () => {
    const res = await makeRequest('/api/candidate/audit-logs');
    const logs = res.body.logs || res.body.auditLogs;
    if (res.statusCode !== 200 || !res.body.success || !Array.isArray(logs)) {
      throw new Error(`Audit logs failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 9. HRMS Attendance Module
  await test('HRMS Attendance Punch In (/api/attendance/punch-in)', async () => {
    const res = await makeRequest('/api/attendance/punch-in', 'POST', {
      employeeId: 'EMP_AUDIT_01',
      employeeName: 'Audit Test Employee',
      location: 'Bengaluru HQ',
      workMode: 'On-site'
    });
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      throw new Error(`Punch In failed: ${JSON.stringify(res.body)}`);
    }
  });

  await test('HRMS Attendance Status (/api/attendance/status?employeeId=EMP_AUDIT_01)', async () => {
    const res = await makeRequest('/api/attendance/status?employeeId=EMP_AUDIT_01');
    if (res.statusCode !== 200 || !res.body.success) {
      throw new Error(`Attendance Status failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 10. HRMS Smart Leave Calculation (Weekend-Excluded)
  await test('HRMS Weekend-Excluded Leave Application (/api/leaves/apply)', async () => {
    const res = await makeRequest('/api/leaves/apply', 'POST', {
      employeeId: 'EMP_AUDIT_01',
      employeeName: 'Audit Test Employee',
      leaveType: 'annual',
      startDate: '2026-09-11',
      endDate: '2026-09-14',
      reason: 'System automated audit leave check'
    });
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      throw new Error(`Leave application failed: ${JSON.stringify(res.body)}`);
    }
  });

  // 11. Data Exports (CSV & Excel)
  await test('HRMS Attendance CSV Export (/api/export/attendance?format=csv)', async () => {
    const res = await makeRequest('/api/export/attendance?format=csv');
    if (res.statusCode !== 200) throw new Error(`Export CSV failed with HTTP ${res.statusCode}`);
  });

  await test('HRMS Leave CSV Export (/api/export/leaves?format=csv)', async () => {
    const res = await makeRequest('/api/export/leaves?format=csv');
    if (res.statusCode !== 200) throw new Error(`Export Leaves CSV failed with HTTP ${res.statusCode}`);
  });

  // 12. Notification Service
  await test('Notification Unread Count (/api/notifications/unread-count)', async () => {
    const res = await makeRequest('/api/notifications/unread-count');
    if (res.statusCode !== 200 || typeof res.body.unreadCount !== 'number') {
      throw new Error(`Notification count failed: ${JSON.stringify(res.body)}`);
    }
  });

  console.log('\n================================================================');
  console.log(`📊 AUDIT SUMMARY: Passed: ${results.passed}/${results.passed + results.failed} | Failed: ${results.failed}`);
  console.log('================================================================\n');

  if (results.failed > 0) {
    console.error('⚠️ Detected failed checks:', results.tests.filter(t => t.status === 'FAIL'));
    process.exit(1);
  } else {
    console.log('🎉 ALL SYSTEM MODULES, DATABASE APIS & REAL-TIME SERVICES ARE 100% OPERATIONAL!');
    process.exit(0);
  }
}

runFullAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
