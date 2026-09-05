const puppeteer = require('puppeteer-core');
const axios = require('axios');
const path = require('path');

async function captureCandidateScreenshots() {
  const artifactDir = 'C:\\Users\\vaibh\\.gemini\\antigravity\\brain\\8491a5cf-f2e3-4264-875b-ee9bdf0f40e7';
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Authenticate as candidate / normal user
  // Let's create or sign in a candidate
  const res = await axios.post('http://127.0.0.1:3000/api/auth/login', {
    email: 'test.hr.admin@company.com',
    password: 'Password123!'
  });

  const cookiesHeader = res.headers['set-cookie'];
  const cookieParts = cookiesHeader[0].split(';')[0].split('=');
  await page.setCookie({
    name: cookieParts[0].trim(),
    value: cookieParts[1].trim(),
    domain: '127.0.0.1',
    path: '/'
  });

  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2' });

  // 1. Switch to Screening tab
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') window.switchTab('screening');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'webpage_screening.png') });

  // 2. Switch to ATS Checker tab
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') window.switchTab('ats-checker');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'webpage_ats_checker.png') });

  // 3. Switch to Analytics tab
  await page.evaluate(() => {
    if (typeof window.switchTab === 'function') window.switchTab('analytics');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'webpage_analytics.png') });

  await browser.close();
  console.log('Additional screenshots captured successfully!');
}

captureCandidateScreenshots().catch(console.error);
