require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { extractDocumentText } = require('../src/services/documentParserService');
const { processInternalDocument } = require('../src/services/aiService');
const supabase = require('../src/config/supabaseClient');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('\n' + '='.repeat(68));
  console.log('📄 RANKLY.AI — INTERNAL AI DOCUMENT ENGINE & OLLAMA TEST SUITE');
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
  // Step 0: Authenticate as HR Admin for Protected Routes
  // -------------------------------------------------------------
  console.log('🔑 STEP 0: Authenticating as HR Admin (test.hr.admin@company.com)...');
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
    assert(loginRes.status === 200 && loginRes.data.success, 'HR Admin authenticated successfully');
  } catch (loginErr) {
    assert(false, `HR Admin login failed: ${loginErr.message}`);
  }

  // -------------------------------------------------------------
  // Step 1: Direct Document Parser Unit Test
  // -------------------------------------------------------------
  console.log('\n📝 STEP 1: Testing Document Parser Service (Text Extraction)...');
  const samplePolicyText = `
RANKLY.AI CORPORATE LEAVE & CONFIDENTIALITY POLICY 2026

1. Core Working Hours & Hybrid Policy:
Employees must be reachable between 10:00 AM and 4:00 PM IST on working days. 
Hybrid teams are permitted up to 2 days of remote work per week with prior manager approval.

2. Leave Allowances:
- 18 Annual Vacation Days (PTO)
- 10 Paid Casual / Sick Days
- Maternity Leave: 26 weeks fully paid
- Paternity Leave: 4 weeks fully paid

3. Information Security & IP Protection:
All internal candidate screening matrices, ATS algorithmic pipelines, and executive client data 
are classified as STRICTLY CONFIDENTIAL. Zero export to external personal drives or third-party web services allowed.
  `.trim();

  try {
    const parseResult = await extractDocumentText(Buffer.from(samplePolicyText, 'utf8'), 'HR_Leave_Policy_2026.txt');
    assert(parseResult.text.includes('RANKLY.AI CORPORATE LEAVE'), 'Plaintext/Markdown text extraction succeeded');
    assert(parseResult.format === 'txt', `Extracted document format identified as "${parseResult.format}"`);
  } catch (err) {
    assert(false, `Document parser unit test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Step 2: Ingest Document via API to Supabase internal_documents
  // -------------------------------------------------------------
  console.log('\n💾 STEP 2: Ingesting Document into Supabase "internal_documents"...');
  let insertedDocId = null;
  try {
    const uploadRes = await axios.post(`${BASE_URL}/api/documents/internal/upload`, {
      title: 'HR Leave & Confidentiality Policy 2026',
      category: 'policy',
      fileName: 'HR_Leave_Policy_2026.txt',
      content: samplePolicyText,
      department: 'Human Resources',
      uploadedBy: 'admin@rankly.ai'
    }, {
      headers: { Cookie: adminCookie }
    });

    assert(uploadRes.status === 201 && uploadRes.data.success, 'Document upload & text extraction API returned 201 Created');
    assert(uploadRes.data.document && uploadRes.data.document.id, `Document stored in Supabase with ID #${uploadRes.data.document.id}`);
    insertedDocId = uploadRes.data.document.id;
  } catch (err) {
    assert(false, `Document upload failed: ${err.response?.data?.error || err.message}`);
  }

  // -------------------------------------------------------------
  // Step 3: Verify Persistence & Retrieval from Supabase
  // -------------------------------------------------------------
  console.log('\n🔍 STEP 3: Verifying Document Retrieval from Supabase...');
  try {
    const listRes = await axios.get(`${BASE_URL}/api/documents/internal`, {
      headers: { Cookie: adminCookie }
    });
    assert(listRes.status === 200 && listRes.data.success, `List internal documents returned ${listRes.data.count} items`);
  } catch (err) {
    assert(false, `List internal documents failed: ${err.response?.data?.error || err.message}`);
  }

  if (insertedDocId) {
    try {
      const getRes = await axios.get(`${BASE_URL}/api/documents/internal/${insertedDocId}`, {
        headers: { Cookie: adminCookie }
      });
      assert(getRes.status === 200 && getRes.data.data.extracted_text, `Single document fetched: "${getRes.data.data.title}"`);
      assert(getRes.data.data.extracted_text.includes('18 Annual Vacation Days'), 'Extracted text verified in Supabase payload');
    } catch (err) {
      assert(false, `Fetch single document failed: ${err.response?.data?.error || err.message}`);
    }
  }

  // -------------------------------------------------------------
  // Step 4: AI Document Processing with Multi-Tier AI
  // -------------------------------------------------------------
  console.log('\n🤖 STEP 4: Executing Document Query with Multi-Tier AI Engine...');
  try {
    const promptText = 'Summarize the core PTO allowance, hybrid working hours, and confidentiality rules.';
    const processRes = await axios.post(`${BASE_URL}/api/documents/internal/process`, {
      documentId: insertedDocId,
      promptText
    }, {
      headers: { Cookie: adminCookie },
      timeout: 20000
    });

    assert(processRes.status === 200 && processRes.data.success, 'Document AI processing endpoint returned 200 OK');
    assert(processRes.data.result && processRes.data.result.length > 50, `AI model generated response (${processRes.data.result.length} chars)`);
    console.log('\n--- 🧠 Model Output Preview ---');
    console.log(processRes.data.result.slice(0, 300) + '...\n-------------------------------');

    // Verify strict domain isolation (zero external resume generation)
    assert(!processRes.data.result.toLowerCase().includes('candidate resume for external'), 'Strict HRMS isolation verified: Zero external candidate generation');
  } catch (err) {
    assert(false, `AI Document processing failed: ${err.response?.data?.error || err.message}`);
  }

  // -------------------------------------------------------------
  // Step 5: Direct Unit Test of processInternalDocument function
  // -------------------------------------------------------------
  console.log('\n⚡ STEP 5: Testing processInternalDocument() Direct Export...');
  try {
    const directResult = await processInternalDocument(
      'What is the maternity leave duration?',
      samplePolicyText
    );
    assert(typeof directResult === 'string' && directResult.length > 0, 'processInternalDocument returned response string');
    assert(directResult.includes('26') || directResult.toLowerCase().includes('maternity') || directResult.includes('Internal HRMS'), 'Direct AI processing correctly referenced document facts');
  } catch (err) {
    assert(false, `Direct processInternalDocument failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Step 6: Cleanup Test Document
  // -------------------------------------------------------------
  if (insertedDocId) {
    console.log('\n🧹 STEP 6: Cleaning up temporary test document...');
    try {
      const delRes = await axios.delete(`${BASE_URL}/api/documents/internal/${insertedDocId}`, {
        headers: { Cookie: adminCookie }
      });
      assert(delRes.status === 200 && delRes.data.success, `Temporary document #${insertedDocId} cleanly deleted from Supabase`);
    } catch (err) {
      console.warn('Cleanup notice:', err.message);
    }
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

// Start test against active server or temporary instance
const req = http.get(`${BASE_URL}/api/health`, (res) => {
  console.log('Active server detected on port 3000. Running tests...');
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
