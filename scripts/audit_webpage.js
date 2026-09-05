const puppeteer = require('puppeteer-core');

async function auditWebPage() {
  console.log('='.repeat(70));
  console.log('🔍 STARTING IN-DEPTH CHROME BROWSER AUDIT: http://127.0.0.1:3000');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  const consoleWarnings = [];
  const failedRequests = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') consoleErrors.push(text);
    else if (msg.type() === 'warning') consoleWarnings.push(text);
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[Uncaught Error]: ${err.message}`);
  });

  page.on('requestfailed', req => {
    failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  console.log('\n[1] Navigating to http://127.0.0.1:3000 ...');
  const response = await page.goto('http://127.0.0.1:3000', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  const status = response.status();
  console.log(`  HTTP Response Status: ${status}`);

  const pageTitle = await page.title();
  console.log(`  Page Title: "${pageTitle}"`);

  // Evaluate DOM and UI components
  console.log('\n[2] Checking Core Elements & Sections...');
  const auditResults = await page.evaluate(() => {
    const checks = {};

    // 1. Navigation & Header
    checks.header = !!document.querySelector('header, nav, .navbar');
    checks.loginBtn = !!document.querySelector('[onclick*="login"], #loginBtn, .btn-login, #openLoginBtn');
    checks.themeToggle = !!document.querySelector('[onclick*="toggleTheme"], #themeToggle, .theme-toggle');

    // 2. Modals
    checks.authModal = !!document.getElementById('authModal') || !!document.getElementById('loginModal');
    checks.signupModal = !!document.getElementById('signupModal');

    // 3. Resume Screening
    checks.resumeUploadZone = !!document.getElementById('dropZone') || !!document.getElementById('resumeDropZone') || !!document.querySelector('.drop-zone, #uploadSection');
    checks.resumeFileInput = !!document.querySelector('input[type="file"]');
    checks.screenResumeBtn = !!document.querySelector('button[onclick*="screenResume"], #screenBtn, button[type="submit"]');

    // 4. Candidate Features (New from commit 8f6ad99)
    checks.atsDropZone = !!document.getElementById('atsDropZone');
    checks.atsResumeFile = !!document.getElementById('atsResumeFile');
    checks.atsJobDescription = !!document.getElementById('atsJobDescription');
    checks.coverLetterGenerator = !!document.getElementById('coverLetterJobDesc') || !!document.getElementById('generateCoverLetterBtn');
    checks.skillBadgeFinder = !!document.getElementById('skillSearchInput') || !!document.getElementById('skillBadgesContainer');
    checks.applicationTracker = !!document.getElementById('appTrackerContainer') || !!document.getElementById('newAppCompany');

    // 5. Talent Pipeline / Kanban Board
    checks.kanbanBoard = !!document.getElementById('pipelineBoard') || !!document.querySelector('.kanban-board, [data-stage]');
    checks.kanbanStages = Array.from(document.querySelectorAll('[data-stage], .kanban-column, .kanban-stage')).map(el => el.getAttribute('data-stage') || el.innerText.trim().slice(0, 20));

    // 6. AI Assistant / Chatbot
    checks.chatContainer = !!document.getElementById('chatContainer') || !!document.getElementById('chatDrawer') || !!document.querySelector('.chat-widget, #chatModal');
    checks.chatInput = !!document.getElementById('chatInput') || !!document.querySelector('input[placeholder*="Ask"]');
    checks.chatFloatingBtn = !!document.querySelector('[onclick*="chat"], .chat-toggle, #openChatBtn');

    // 7. HRMS & Employee Portal
    checks.hrmsSection = !!document.getElementById('tab-employees') || !!document.getElementById('employeesSection') || !!document.querySelector('[onclick*="employees"]');
    checks.attendancePunchBtn = !!document.getElementById('punchInBtn') || !!document.getElementById('checkInBtn');
    checks.leaveApplyModal = !!document.getElementById('applyLeaveModal') || !!document.getElementById('leaveModal');

    // 8. Global State & Scripts
    checks.hasCandidateFeaturesScript = typeof window.handleAtsFileDrop === 'function';
    checks.hasAtsMatcher = typeof window.runAtsMatcher === 'function' || typeof window.calculateAtsScore === 'function';
    checks.hasCoverLetterGen = typeof window.generateAiCoverLetter === 'function' || typeof window.handleGenerateCoverLetter === 'function';

    // 9. Interactive Elements Count
    checks.totalButtons = document.querySelectorAll('button').length;
    checks.totalInputs = document.querySelectorAll('input').length;
    checks.totalForms = document.querySelectorAll('form').length;

    return checks;
  });

  console.log('\n[3] Audit Results:');
  for (const [key, value] of Object.entries(auditResults)) {
    const symbol = value ? '✅' : '❌';
    console.log(`  ${symbol} ${key}: ${JSON.stringify(value)}`);
  }

  // Test Interactive Click Checks
  console.log('\n[4] Testing Interactive Click Actions...');

  // Try opening auth / login modal
  let loginModalOpened = false;
  try {
    const openLoginBtn = await page.$('#openLoginBtn, button[onclick*="authModal"], button[onclick*="loginModal"], [onclick*="openAuthModal"]');
    if (openLoginBtn) {
      await openLoginBtn.click();
      await new Promise(r => setTimeout(r, 600));
      loginModalOpened = await page.evaluate(() => {
        const m = document.getElementById('authModal') || document.getElementById('loginModal');
        return m ? window.getComputedStyle(m).display !== 'none' : false;
      });
    }
  } catch (e) {
    console.log(`  ⚠️ Login button click warning: ${e.message}`);
  }
  console.log(`  ${loginModalOpened ? '✅' : '⚠️'} Auth / Login Modal Open Test: ${loginModalOpened ? 'Opened Successfully' : 'Not triggered'}`);

  // Check Theme Toggle
  let themeToggled = false;
  try {
    const themeBtn = await page.$('#themeToggle, [onclick*="toggleTheme"]');
    if (themeBtn) {
      const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await themeBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const newTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      themeToggled = initialTheme !== newTheme;
    }
  } catch (e) {}
  console.log(`  ${themeToggled ? '✅' : '⚠️'} Theme Toggle Test: ${themeToggled ? 'Switched Themes Cleanly' : 'No theme class change'}`);

  // Test API calls directly in browser context
  console.log('\n[5] Testing Frontend-to-Backend API Calls from Browser Context...');
  const apiTestResults = await page.evaluate(async () => {
    const tests = {};
    
    // 1. Health API
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      tests.healthApi = { status: res.status, ok: data.status === 'HEALTHY' };
    } catch (e) {
      tests.healthApi = { error: e.message };
    }

    // 2. Analytics Overview API
    try {
      const res = await fetch('/api/analytics/overview');
      const data = await res.json();
      tests.analyticsApi = { 
        status: res.status, 
        success: data.success, 
        dataSource: data.dataSource,
        candidates: data.metrics?.totalCandidates,
        employees: data.metrics?.totalEmployees 
      };
    } catch (e) {
      tests.analyticsApi = { error: e.message };
    }

    // 3. Analytics Distribution API
    try {
      const res = await fetch('/api/analytics/distribution');
      const data = await res.json();
      tests.distributionApi = { status: res.status, success: data.success, distribution: data.distribution };
    } catch (e) {
      tests.distributionApi = { error: e.message };
    }

    // 4. Candidate Tracker API
    try {
      const res = await fetch('/api/candidate/applications');
      const data = await res.json();
      tests.candidateApplicationsApi = { status: res.status, success: data.success };
    } catch (e) {
      tests.candidateApplicationsApi = { error: e.message };
    }

    return tests;
  });

  console.log('  Browser In-Context API Responses:');
  console.log(JSON.stringify(apiTestResults, null, 2));

  // Console Errors & Warnings
  console.log('\n[6] Browser Console Report:');
  if (consoleErrors.length === 0) {
    console.log('  ✅ Clean! Zero (0) JavaScript console errors detected.');
  } else {
    console.log(`  ⚠️ ${consoleErrors.length} Console Error(s):`);
    consoleErrors.slice(0, 10).forEach(err => console.log(`    - ${err}`));
  }

  if (consoleWarnings.length > 0) {
    console.log(`  ℹ️ ${consoleWarnings.length} Console Warning(s) detected (e.g. font preloads / CDN hints).`);
  }

  if (failedRequests.length === 0) {
    console.log('  ✅ Clean! Zero (0) failed network requests.');
  } else {
    console.log(`  ⚠️ ${failedRequests.length} Failed Network Request(s):`);
    failedRequests.slice(0, 10).forEach(req => console.log(`    - ${req}`));
  }

  await browser.close();
  console.log('\n' + '='.repeat(70));
  console.log('🏁 CHROME BROWSER AUDIT COMPLETE');
  console.log('='.repeat(70));
}

auditWebPage().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
