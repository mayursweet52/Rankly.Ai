const axios = require('axios');
const { detectAndNormalizeLanguage } = require('../src/services/documentParserService');
const { searchCandidatesByVector, computeCosineSimilarity } = require('../src/services/vectorSearchService');
const emailService = require('../src/services/emailService');

const BASE_URL = 'http://localhost:3000';

async function runSection2Verification() {
  console.log('====================================================');
  console.log('🚀 SECTION 2: BACKEND & AI ARCHITECTURE VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Webhook Stats
  try {
    const statsRes = await axios.get(BASE_URL + '/api/webhooks/stats');
    console.log('✅ [1. Webhook Stats]:', statsRes.data.telemetry);
    passed++;
  } catch (err) {
    console.error('❌ [1. Webhook Stats Failed]:', err.message);
    failed++;
  }

  // 2. Greenhouse Ingestion
  try {
    const ghRes = await axios.post(BASE_URL + '/api/webhooks/greenhouse', {
      action: 'candidate_applied',
      payload: {
        candidate: {
          id: 'gh-auto-test-101',
          first_name: 'Vikram',
          last_name: 'Aditya',
          email_addresses: [{ value: 'vikram.aditya@example.com' }],
          phone_numbers: [{ value: '+919876543210' }],
          title: 'Senior Full Stack Engineer',
          notes: 'Extensive experience in React, Node.js, and Distributed Systems.'
        }
      }
    });
    console.log('✅ [2. Greenhouse Webhook Ingestion]:', ghRes.data.message, `(Candidate ID: ${ghRes.data.candidateId})`);
    passed++;
  } catch (err) {
    console.error('❌ [2. Greenhouse Webhook Failed]:', err.message);
    failed++;
  }

  // 3. Lever Ingestion
  try {
    const leverRes = await axios.post(BASE_URL + '/api/webhooks/lever', {
      event: 'candidateApplied',
      data: {
        id: 'lever-auto-test-202',
        name: 'Aarav Sharma',
        contact: {
          email: 'aarav.sharma@example.com',
          phone: '+919988776655'
        },
        headline: 'Lead AI Architect',
        summary: 'Specialized in LLM fine-tuning, RAG, and Vector Databases.'
      }
    });
    console.log('✅ [3. Lever Webhook Ingestion]:', leverRes.data.message, `(Candidate ID: ${leverRes.data.candidateId})`);
    passed++;
  } catch (err) {
    console.error('❌ [3. Lever Webhook Failed]:', err.message);
    failed++;
  }

  // 4. Vector Similarity Search
  try {
    const vectorRes = await axios.post(BASE_URL + '/api/candidates/vector-search', {
      query: 'Full Stack Engineer React Node',
      topK: 3
    });
    console.log('✅ [4. Vector Similarity Search]: Found', vectorRes.data.count, 'matching candidates');
    if (vectorRes.data.results && vectorRes.data.results.length > 0) {
      console.log('   Top Match:', vectorRes.data.results[0].name, `| Score: ${(vectorRes.data.results[0].similarityScore * 100).toFixed(1)}%`);
    }
    passed++;
  } catch (err) {
    console.error('❌ [4. Vector Similarity Search Failed]:', err.message);
    failed++;
  }

  // 5. Multi-Language Resume Normalization
  try {
    const sampleHindiResume = `
      नाम: राहुल शर्मा
      ईमेल: rahul.sharma@example.com
      कौशल: पायथन, मशीन लर्निंग, रिएक्ट, डेटा साइंस
      अनुभव: 5 वर्ष सॉफ्टवेयर इंजीनियर के रूप में
      शिक्षा: बी.टेक कंप्यूटर साइंस
    `;
    const normalized = detectAndNormalizeLanguage(sampleHindiResume);
    console.log('✅ [5. Multilingual Parser]: Detected Language:', normalized.detectedLanguage);
    console.log('   Language Confidence:', (normalized.languageConfidence * 100).toFixed(1) + '%');
    console.log('   Normalized Sections Found:', Object.keys(normalized.normalizedSections));
    passed++;
  } catch (err) {
    console.error('❌ [5. Multilingual Parser Failed]:', err.message);
    failed++;
  }

  // 6. Email Service Verification
  try {
    const isEmailServiceReady = typeof emailService.sendShortlistNotificationEmail === 'function' &&
                                typeof emailService.sendInterviewScheduledEmail === 'function' &&
                                typeof emailService.sendRejectionFeedbackEmail === 'function';
    if (isEmailServiceReady) {
      console.log('✅ [6. Email Notifications Worker]: All 3 new lifecycle dispatchers are active & typed.');
      passed++;
    } else {
      throw new Error('Email service functions are missing');
    }
  } catch (err) {
    console.error('❌ [6. Email Service Verification Failed]:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`🎯 VERIFICATION COMPLETE: Passed ${passed}/6 | Failed: ${failed}`);
  console.log('====================================================');
}

runSection2Verification();
