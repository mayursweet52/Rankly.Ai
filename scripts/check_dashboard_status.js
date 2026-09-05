const puppeteer = require('puppeteer-core');
const axios = require('axios');

async function checkDashboardStatus() {
  console.log('='.repeat(70));
  console.log('📊 CHECKING LIVE DASHBOARD METRICS & SYSTEM STATUS');
  console.log('='.repeat(70));

  // 1. Fetch Backend API Status Directly
  const [healthRes, analyticsRes, pipelineRes] = await Promise.all([
    axios.get('http://127.0.0.1:3000/api/health').catch(e => ({ data: { error: e.message } })),
    axios.get('http://127.0.0.1:3000/api/analytics/overview').catch(e => ({ data: { error: e.message } })),
    axios.get('http://127.0.0.1:3000/api/pipeline').catch(e => ({ data: { error: e.message } }))
  ]);

  // 2. Launch Puppeteer Browser with Authenticated HR Admin Session
  const loginRes = await axios.post('http://127.0.0.1:3000/api/auth/login', {
    email: 'test.hr.admin@company.com',
    password: 'Password123!'
  });

  const cookiesHeader = loginRes.headers['set-cookie'];
  const cookieParts = cookiesHeader[0].split(';')[0].split('=');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setCookie({
    name: cookieParts[0].trim(),
    value: cookieParts[1].trim(),
    domain: '127.0.0.1',
    path: '/'
  });

  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // 3. Extract UI DOM Elements & Texts from HRMS Overview
  const uiOverview = await page.evaluate(() => {
    // Metric cards
    const cards = Array.from(document.querySelectorAll('.card, [class*="card"]')).map(c => c.innerText.trim()).filter(t => t.length > 0 && t.length < 200);
    
    // User profile in sidebar
    const userBadge = {
      name: document.querySelector('.user-name, #headerUserName, .font-bold.text-sm')?.innerText || '',
      role: document.querySelector('.user-role, .badge-role, [class*="role"]')?.innerText || '',
      initials: document.querySelector('.avatar, .avatar-initials, [class*="avatar"]')?.innerText || ''
    };

    // Header title
    const headerTitle = document.querySelector('h1, h2, .page-title, #dashTitle')?.innerText || '';

    // Quick stats on dashboard page
    const stats = {};
    document.querySelectorAll('.text-3xl, .text-4xl, .stat-value, [class*="text-2xl"]').forEach(el => {
      const label = el.previousElementSibling?.innerText || el.nextElementSibling?.innerText || el.parentElement?.innerText?.replace(el.innerText, '').trim();
      if (label && el.innerText.trim()) {
        stats[label.slice(0, 30)] = el.innerText.trim();
      }
    });

    return {
      headerTitle,
      userBadge,
      stats,
      sampleCards: cards.slice(0, 8)
    };
  });

  // 4. Switch to Pipeline & Extract Stage Counts
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') window.switchTab('pipeline');
  });
  await new Promise(r => setTimeout(r, 800));

  const pipelineUi = await page.evaluate(() => {
    const stages = {};
    document.querySelectorAll('[data-stage], .kanban-column, .kanban-stage').forEach(col => {
      const stageName = col.getAttribute('data-stage') || col.querySelector('h3, h4, .column-title')?.innerText || 'unknown';
      const countEl = col.querySelector('.badge, .count, .counter, span')?.innerText || '';
      const items = col.querySelectorAll('.candidate-card, .kanban-item, [data-candidate-id]').length;
      stages[stageName] = { badgeCount: countEl, renderedCards: items };
    });
    return stages;
  });

  await browser.close();

  console.log('\n[A] SYSTEM HEALTH STATUS:');
  console.log(JSON.stringify(healthRes.data, null, 2));

  console.log('\n[B] SUPABASE LIVE ANALYTICS DATA:');
  console.log(JSON.stringify(analyticsRes.data, null, 2));

  console.log('\n[C] HRMS OVERVIEW DOM STATUS:');
  console.log(JSON.stringify(uiOverview, null, 2));

  console.log('\n[D] TALENT PIPELINE (KANBAN) STATUS:');
  console.log(JSON.stringify(pipelineUi, null, 2));
}

checkDashboardStatus().catch(console.error);
