/**
 * Automated Verification Script: Document AI Routes RBAC & UI Integration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:3000';

function makeRequest(method, endpoint, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const headers = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            data = raw;
          }
          const setCookie = res.headers['set-cookie'];
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data,
            cookie: setCookie ? setCookie[0].split(';')[0] : null
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('?? Starting RBAC & AI Document Engine Verification Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ? PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ? FAIL: ${message}`);
    }
  }

  // 1. Check Unauthenticated access
  console.log('--- Test Suite 1: Unauthenticated Endpoint Protection ---');
  const unauthUpload = await makeRequest('POST', '/api/documents/internal/upload', { title: 'Secret Policy', content: 'Confidential' });
  assert(unauthUpload.status === 401, `POST /api/documents/internal/upload rejected unauthenticated request with 401 (Received ${unauthUpload.status})`);

  const unauthProcess = await makeRequest('POST', '/api/documents/internal/process', { promptText: 'What is PTO?' });
  assert(unauthProcess.status === 401, `POST /api/documents/internal/process rejected unauthenticated request with 401 (Received ${unauthProcess.status})`);

  const unauthList = await makeRequest('GET', '/api/documents/internal');
  assert(unauthList.status === 401, `GET /api/documents/internal rejected unauthenticated request with 401 (Received ${unauthList.status})`);

  // 2. Login as Admin / HR user
  console.log('\n--- Test Suite 2: Admin HR User Authentication & RBAC Authorization ---');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'test.hr.admin@company.com',
    password: 'Password123!'
  });
  assert(loginRes.status === 200 && loginRes.data.success, `HR Admin login succeeded (Status ${loginRes.status})`);
  const adminCookie = loginRes.cookie;
  assert(Boolean(adminCookie), 'Session cookie established for HR Admin');

  // 3. Admin / HR uploads an internal document to Supabase
  console.log('\n--- Test Suite 3: Ingest Document via POST /api/documents/internal/upload ---');
  const uploadRes = await makeRequest(
    'POST',
    '/api/documents/internal/upload',
    {
      title: 'Q3 Enterprise Remote Work and Overtime Directive',
      category: 'policy',
      fileName: 'Remote_Work_Q3_2026.txt',
      content: 'Standard core collaboration hours are 10:00 AM to 4:00 PM Eastern. Employees working overtime on weekends require prior manager approval. Paid Time Off (PTO) is capped at 24 days annually with up to 5 days rollover allowed into next calendar year.'
    },
    adminCookie
  );
  assert(uploadRes.status === 201 && uploadRes.data.success, `Document uploaded and ingested with 201 Created (Status ${uploadRes.status})`);
  const uploadedDocId = uploadRes.data?.document?.id;
  assert(Boolean(uploadedDocId), `Document ID generated: ${uploadedDocId}`);

  // 4. Admin / HR queries Nemotron AI document processor
  console.log('\n--- Test Suite 4: Process Document with Nemotron AI (Ollama HRMS Engine) ---');
  const aiProcessRes = await makeRequest(
    'POST',
    '/api/documents/internal/process',
    {
      documentId: uploadedDocId,
      promptText: 'What are the rules regarding PTO rollover and core collaboration hours?'
    },
    adminCookie
  );
  assert(aiProcessRes.status === 200 && aiProcessRes.data.success, `Nemotron AI document processing returned 200 OK (Status ${aiProcessRes.status})`);
  assert(typeof aiProcessRes.data?.result === 'string' && aiProcessRes.data.result.length > 10, 'Nemotron AI returned a detailed policy analysis result');
  console.log(`      ?? Nemotron Result snippet: "${aiProcessRes.data?.result?.slice(0, 120)}..."`);

  // 5. Admin / HR lists internal documents
  console.log('\n--- Test Suite 5: List Internal Documents via GET /api/documents/internal ---');
  const listRes = await makeRequest('GET', '/api/documents/internal', null, adminCookie);
  assert(listRes.status === 200 && listRes.data.success, `GET /api/documents/internal returned 200 OK (Status ${listRes.status})`);
  assert(Array.isArray(listRes.data?.data) && listRes.data.data.length > 0, `Documents retrieved: count = ${listRes.data?.count || listRes.data?.data?.length}`);

  // 6. Test Candidate / Normal User RBAC Rejection
  console.log('\n--- Test Suite 6: Candidate / Normal User RBAC 403 Forbidden Rejection ---');
  const candLogin = await makeRequest('POST', '/api/auth/login', {
    email: 'test.candidate.portal@gmail.com',
    password: 'Password123!'
  });
  assert(candLogin.status === 200 && candLogin.data.success, `Candidate logged in successfully (Status ${candLogin.status})`);
  const candidateCookie = candLogin.cookie;
  assert(Boolean(candidateCookie), 'Candidate session established');

  const candUpload = await makeRequest(
    'POST',
    '/api/documents/internal/upload',
    { title: 'Attempted Candidate Upload', content: 'Unauthorized' },
    candidateCookie
  );
  assert(candUpload.status === 403, `Candidate upload rejected with 403 Forbidden (Received ${candUpload.status})`);

  const candProcess = await makeRequest(
    'POST',
    '/api/documents/internal/process',
    { promptText: 'Hack internal policy' },
    candidateCookie
  );
  assert(candProcess.status === 403, `Candidate AI process rejected with 403 Forbidden (Received ${candProcess.status})`);

  // 7. Verify UI Elements in public/index.html
  console.log('\n--- Test Suite 7: Frontend UI Verification in public/index.html ---');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  assert(indexHtml.includes('id="tab-employees"'), 'tab-employees container rendered in index.html');
  assert(indexHtml.includes('id="tab-documents"'), 'tab-documents container rendered in index.html');
  assert(indexHtml.includes('id="aiDocAssistantModal"'), 'aiDocAssistantModal rendered in index.html');
  assert(indexHtml.includes('openAiDocAssistant'), 'openAiDocAssistant controller function implemented');
  assert(indexHtml.includes('submitAiDocQuery'), 'submitAiDocQuery controller function implemented');
  assert(indexHtml.includes('openAiDocAssistant('), 'Document card contains Ask AI button calling openAiDocAssistant');

  console.log(`\n========================================`);
  console.log(`?? Test Run Completed: ${passed}/${total} assertions passed`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
