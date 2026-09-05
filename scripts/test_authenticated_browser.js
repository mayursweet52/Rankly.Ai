const puppeteer = require('puppeteer-core');
const axios = require('axios');

async function testFullAuthenticatedExperience() {
  console.log('='.repeat(70));
  console.log('🚀 TESTING COMPLETE AUTHENTICATED USER & HRMS JOURNEY IN BROWSER');
  console.log('='.repeat(70));

  // 1. Establish session cookie via login API
  console.log('\n[1] Logging in as HR Admin (test.hr.admin@company.com)...');
  const loginRes = await axios.post('http://127.0.0.1:3000/api/auth/login', {
    email: 'test.hr.admin@company.com',
    password: 'Password123!'
  });

  const cookiesHeader = loginRes.headers['set-cookie'];
  if (!cookiesHeader) {
    throw new Error('No session cookie returned from login API!');
  }

  // Parse cookie for Puppeteer
  const cookieParts = cookiesHeader[0].split(';')[0].split('=');
  const sessionCookie = {
    name: cookieParts[0].trim(),
    value: cookieParts[1].trim(),
    domain: '127.0.0.1',
    path: '/'
  };

  console.log(`  ✅ Successfully authenticated! Cookie: ${sessionCookie.name}`);

  // 2. Launch Chrome and inject cookie
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setCookie(sessionCookie);

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('\n[2] Loading Dashboard http://127.0.0.1:3000 ...');
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2' });

  // 3. Check what tab is active on load
  const initialTabState = await page.evaluate(() => {
    const authWrapper = document.getElementById('authWrapper') || document.getElementById('authContainer');
    const appWrapper = document.getElementById('appContainer') || document.getElementById('mainContent') || document.getElementById('dashboardView');
    return {
      authVisible: authWrapper ? window.getComputedStyle(authWrapper).display !== 'none' : false,
      appVisible: appWrapper ? window.getComputedStyle(appWrapper).display !== 'none' : false,
      userWelcome: document.querySelector('.user-name, #headerUserName, #welcomeUser')?.innerText || 'Not displayed'
    };
  });
  console.log('  Initial Display State:', initialTabState);

  // 4. Test switching tabs and verifying content
  const tabsToTest = [
    { id: 'tab-dashboard', name: 'Dashboard' },
    { id: 'tab-screening', name: 'Resume Screening' },
    { id: 'tab-ats-checker', name: 'ATS JD Matcher' },
    { id: 'tab-cover-letter', name: 'AI Cover Letter' },
    { id: 'tab-skill-gap', name: 'Skill Gap & Badges' },
    { id: 'tab-applications', name: 'Application Tracker' },
    { id: 'tab-pipeline', name: 'Talent Pipeline' },
    { id: 'tab-employees', name: 'Employee Directory' },
    { id: 'tab-documents', name: 'Company Documents' },
    { id: 'tab-analytics', name: 'Analytics & Reports' },
    { id: 'tab-chatbot', name: 'AI Chatbot' }
  ];

  console.log('\n[3] Testing Tab Availability and Navigation:');
  const tabResults = await page.evaluate((tabs) => {
    const results = {};
    for (const t of tabs) {
      const el = document.getElementById(t.id);
      if (!el) {
        results[t.name] = { exists: false, status: 'Element not in DOM' };
        continue;
      }
      
      // Try to trigger switch function if available
      if (typeof window.switchTab === 'function') {
        try { window.switchTab(t.id.replace('tab-', '')); } catch(e) {}
      }

      const isDisplayed = window.getComputedStyle(el).display !== 'none';
      const childElements = el.children.length;
      results[t.name] = {
        exists: true,
        id: t.id,
        childCount: childElements,
        hasContent: el.innerText.trim().length > 10
      };
    }
    return results;
  }, tabsToTest);

  for (const [name, res] of Object.entries(tabResults)) {
    const sym = res.exists && res.hasContent ? '✅' : '❌';
    console.log(`  ${sym} ${name} (${res.id || 'N/A'}): ${res.hasContent ? 'Has Content & Rendered' : 'Empty / Missing'}`);
  }

  // 5. Test Live Supabase Data rendering in UI
  console.log('\n[4] Testing Live Data Rendering in Analytics Tab...');
  const analyticsUiData = await page.evaluate(async () => {
    if (typeof window.switchTab === 'function') {
      window.switchTab('analytics');
    }
    await new Promise(r => setTimeout(r, 600));

    return {
      totalCandidatesEl: document.getElementById('totalCandidatesMetric')?.innerText || document.querySelector('[data-metric="candidates"]')?.innerText || null,
      totalEmployeesEl: document.getElementById('totalEmployeesMetric')?.innerText || document.querySelector('[data-metric="employees"]')?.innerText || null,
      avgScoreEl: document.getElementById('averageScoreMetric')?.innerText || document.querySelector('[data-metric="score"]')?.innerText || null
    };
  });
  console.log('  Analytics UI Metric Elements:', analyticsUiData);

  // 6. Test Candidate Feature Form Submission (New Feature)
  console.log('\n[5] Testing AI Cover Letter Generator API...');
  const coverLetterTest = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/candidate/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: 'John Doe',
          targetRole: 'Full Stack Engineer',
          companyName: 'Acme Corp',
          resumeSummary: 'Experienced developer with 4 years building scalable web apps with React, Node, and PostgreSQL.',
          jobDescription: 'Seeking a Full Stack Engineer proficient in React, Node.js, and cloud architectures.'
        })
      });
      const data = await res.json();
      return { status: res.status, success: data.success, hasCoverLetter: !!data.coverLetter };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('  Cover Letter Generation Result:', coverLetterTest);

  // 7. Test Application Tracker API (New Feature)
  console.log('\n[6] Testing Application Tracker API...');
  const trackerTest = await page.evaluate(async () => {
    try {
      // Fetch applications
      const res = await fetch('/api/candidate/applications');
      const data = await res.json();
      return { status: res.status, success: data.success, applications: data.applications?.length || 0 };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('  Application Tracker API Result:', trackerTest);

  // 8. Test Employee Directory API
  console.log('\n[7] Testing Employee Directory API...');
  const empTest = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      return { status: res.status, count: Array.isArray(data) ? data.length : (data.employees?.length || 0) };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('  Employees Directory API Result:', empTest);

  console.log('\n[8] Browser Errors during Authenticated Session:');
  if (errors.length === 0) {
    console.log('  ✅ Clean! No runtime JavaScript errors caught.');
  } else {
    console.log(`  ⚠️ ${errors.length} error(s):`);
    errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
  }

  await browser.close();
  console.log('\n' + '='.repeat(70));
  console.log('🏁 AUTHENTICATED BROWSER AUDIT COMPLETE');
  console.log('='.repeat(70));
}

testFullAuthenticatedExperience().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
