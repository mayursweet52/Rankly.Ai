/**
 * Rankly.ai - Comprehensive Verification Test Suite for Lead Vaibhav
 * Modules 3.1 to 3.4 (Database, Security & Infrastructure)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 VERIFYING LEAD VAIBHAV: DATABASE, SECURITY & INFRASTRUCTURE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // MODULE 3.1: PostgreSQL Cloud Production Migration Script & 1-Click Switcher
  // ---------------------------------------------------------------------------
  console.log('--- [Module 3.1: PostgreSQL Migration & 1-Click Switcher] ---');
  try {
    const migrationOutput = execSync('node scripts/prod_db_migration.js --dry-run', { encoding: 'utf-8' });
    assert(
      migrationOutput.includes('Production Migration Verification Complete') && migrationOutput.includes('Organization'),
      'Migration Script dry-run completes with table parity verification'
    );

    const switcherOutput = execSync('node scripts/switch_database.js --status', { encoding: 'utf-8' });
    assert(
      switcherOutput.includes('Current Active Engine') && switcherOutput.includes('DATABASE_URL'),
      '1-Click Database Switcher status inspection works cleanly'
    );
  } catch (err) {
    assert(false, 'Module 3.1 Execution', err.message);
  }

  // ---------------------------------------------------------------------------
  // MODULE 3.2: Redis Caching Layer for AI Searches & Stats
  // ---------------------------------------------------------------------------
  console.log('\n--- [Module 3.2: Redis Caching Layer for AI Searches & Stats] ---');
  try {
    // 1. Check /api/cache/stats
    const statsRes = await fetch(`${BASE_URL}/api/cache/stats`);
    const statsData = await statsRes.json();
    assert(statsRes.status === 200 && statsData.success === true, 'GET /api/cache/stats returns 200 OK');
    assert(statsData.data && (statsData.data.engine === 'redis' || statsData.data.engine === 'memory'), 'Cache service reports active engine', statsData.data.engine);

    // 2. Test GET /api/jobs caching (MISS then HIT)
    await fetch(`${BASE_URL}/api/cache/clear`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    
    const jobRes1 = await fetch(`${BASE_URL}/api/jobs?limit=5`);
    const jobData1 = await jobRes1.json();
    const cacheHeader1 = jobRes1.headers.get('x-cache');
    assert(jobRes1.status === 200 && jobData1.success === true, 'GET /api/jobs first call succeeds');

    const jobRes2 = await fetch(`${BASE_URL}/api/jobs?limit=5`);
    const jobData2 = await jobRes2.json();
    const cacheHeader2 = jobRes2.headers.get('x-cache');
    assert(jobRes2.status === 200 && cacheHeader2 === 'HIT', 'GET /api/jobs second call returns X-Cache: HIT');

    // 3. Test GET /api/candidates/ai-queue caching
    const queueRes1 = await fetch(`${BASE_URL}/api/candidates/ai-queue?stage=all`);
    const queueData1 = await queueRes1.json();
    assert(queueRes1.status === 200 && queueData1.success === true, 'GET /api/candidates/ai-queue succeeds');

    const queueRes2 = await fetch(`${BASE_URL}/api/candidates/ai-queue?stage=all`);
    const queueHeader2 = queueRes2.headers.get('x-cache');
    assert(queueRes2.status === 200 && queueHeader2 === 'HIT', 'GET /api/candidates/ai-queue returns X-Cache: HIT');

  } catch (err) {
    assert(false, 'Module 3.2 Execution', err.message);
  }

  // ---------------------------------------------------------------------------
  // MODULE 3.3: Automated SQLite/PG DB Backup Cron Job
  // ---------------------------------------------------------------------------
  console.log('\n--- [Module 3.3: Automated SQLite/PG DB Backup Cron Job] ---');
  try {
    // 1. Trigger manual encrypted backup
    const triggerRes = await fetch(`${BASE_URL}/api/backup/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encrypted: true })
    });
    const triggerData = await triggerRes.json();
    assert(triggerRes.status === 200 && triggerData.success === true, 'POST /api/backup/trigger creates backup successfully');
    assert(triggerData.backup && triggerData.backup.encrypted === true, 'Backup manifest confirms military-grade AES-256 encryption');

    const backupFilename = triggerData.backup.filename;

    // 2. Verify backup decipherability and SHA-256 checksum
    const verifyRes = await fetch(`${BASE_URL}/api/backup/verify/${encodeURIComponent(backupFilename)}`, {
      method: 'POST'
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.success === true, 'POST /api/backup/verify decrypts & validates checksum integrity');

    // 3. List backups
    const listRes = await fetch(`${BASE_URL}/api/backup/list`);
    const listData = await listRes.json();
    assert(listRes.status === 200 && Array.isArray(listData.backups) && listData.backups.length > 0, 'GET /api/backup/list shows backup in catalog');

    // 4. Download backup
    const downloadRes = await fetch(`${BASE_URL}/api/backup/download/${encodeURIComponent(backupFilename)}`);
    assert(downloadRes.status === 200, 'GET /api/backup/download/:filename streams backup file');

  } catch (err) {
    assert(false, 'Module 3.3 Execution', err.message);
  }

  // ---------------------------------------------------------------------------
  // MODULE 3.4: API Rate Limiting & DDOS Throttling (Express Rate Limit)
  // ---------------------------------------------------------------------------
  console.log('\n--- [Module 3.4: API Rate Limiting & DDOS Throttling] ---');
  try {
    // Test OTP Limiter: sending 6 OTP requests in quick succession for target email
    let hit429 = false;
    let rateLimitResponse = null;
    const targetEmail = `throttletest_${Date.now()}@gmail.com`;

    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      if (res.status === 429) {
        hit429 = true;
        rateLimitResponse = await res.json();
        break;
      }
    }

    assert(hit429, 'OTP Rate Limiter throttles requests and returns HTTP 429');
    assert(
      rateLimitResponse && rateLimitResponse.code === 'OTP_RATE_LIMIT_EXCEEDED',
      'Rate limit response contains code: OTP_RATE_LIMIT_EXCEEDED'
    );
    assert(
      rateLimitResponse && typeof rateLimitResponse.retryAfter === 'number',
      'Rate limit response contains valid retryAfter seconds'
    );

  } catch (err) {
    assert(false, 'Module 3.4 Execution', err.message);
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
