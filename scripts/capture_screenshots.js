const puppeteer = require('puppeteer-core');
const axios = require('axios');
const path = require('path');

async function captureScreenshots() {
  const artifactDir = 'C:\\Users\\vaibh\\.gemini\\antigravity\\brain\\8491a5cf-f2e3-4264-875b-ee9bdf0f40e7';
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Capture Login / Welcome Screen
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 1440, height: 900 });
  await page1.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const loginShotPath = path.join(artifactDir, 'webpage_login.png');
  await page1.screenshot({ path: loginShotPath, fullPage: false });
  console.log('Saved login screenshot to:', loginShotPath);
  await page1.close();

  // 2. Capture Authenticated Dashboard
  const loginRes = await axios.post('http://127.0.0.1:3000/api/auth/login', {
    email: 'test.hr.admin@company.com',
    password: 'Password123!'
  });

  const cookiesHeader = loginRes.headers['set-cookie'];
  const cookieParts = cookiesHeader[0].split(';')[0].split('=');
  const sessionCookie = {
    name: cookieParts[0].trim(),
    value: cookieParts[1].trim(),
    domain: '127.0.0.1',
    path: '/'
  };

  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await page2.setCookie(sessionCookie);
  await page2.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const dashShotPath = path.join(artifactDir, 'webpage_dashboard.png');
  await page2.screenshot({ path: dashShotPath, fullPage: false });
  console.log('Saved dashboard screenshot to:', dashShotPath);

  // 3. Switch to Kanban Pipeline & capture
  await page2.evaluate(() => {
    if (typeof window.switchTab === 'function') window.switchTab('pipeline');
  });
  await new Promise(r => setTimeout(r, 600));
  const pipelineShotPath = path.join(artifactDir, 'webpage_pipeline.png');
  await page2.screenshot({ path: pipelineShotPath, fullPage: false });
  console.log('Saved pipeline screenshot to:', pipelineShotPath);

  await browser.close();
  console.log('All screenshots captured successfully!');
}

captureScreenshots().catch(console.error);
