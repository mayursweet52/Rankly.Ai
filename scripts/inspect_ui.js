const puppeteer = require('puppeteer-core');

async function inspectUi() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2' });

  const pageDetails = await page.evaluate(() => {
    // Collect all navigation items
    const navItems = Array.from(document.querySelectorAll('nav a, [data-tab], .nav-item, .tab-btn')).map(el => ({
      text: el.innerText.trim(),
      tab: el.getAttribute('data-tab') || el.getAttribute('href') || el.getAttribute('onclick')
    }));

    // Collect all visible buttons
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({
      id: b.id,
      text: b.innerText.trim().slice(0, 30),
      onclick: b.getAttribute('onclick') || '',
      visible: window.getComputedStyle(b).display !== 'none'
    })).filter(b => b.text.length > 0 || b.id.length > 0);

    // Collect all modals
    const modals = Array.from(document.querySelectorAll('[id*="Modal"], .modal')).map(m => ({
      id: m.id,
      classes: m.className
    }));

    // Collect all tabs / main views
    const tabPanels = Array.from(document.querySelectorAll('[id*="tab-"], [id*="Tab"], .tab-pane, .tab-content')).map(t => ({
      id: t.id,
      classes: t.className
    }));

    // Candidate Feature Elements (Commit 8f6ad99)
    const candidateFeatures = {
      atsSection: !!document.getElementById('atsJobDescription') || !!document.getElementById('atsDropZone'),
      exportSection: !!document.getElementById('exportPdfBtn') || !!document.getElementById('exportDocxBtn'),
      coverLetterSection: !!document.getElementById('coverLetterJobDesc') || !!document.getElementById('generateCoverLetterBtn'),
      skillBadgeSection: !!document.getElementById('skillSearchInput') || !!document.getElementById('skillBadgesContainer'),
      appTrackerSection: !!document.getElementById('appTrackerContainer') || !!document.getElementById('newAppCompany')
    };

    // HRMS Elements
    const hrmsFeatures = {
      employeeTable: !!document.getElementById('employeesTable') || !!document.querySelector('table'),
      addEmployeeBtn: !!document.querySelector('[onclick*="createEmployee"], [onclick*="addEmployee"]'),
      attendanceWidget: !!document.getElementById('attendanceWidget') || !!document.getElementById('checkInBtn'),
      leaveWidget: !!document.getElementById('leaveWidget') || !!document.getElementById('applyLeaveBtn'),
      documentsTable: !!document.getElementById('documentsTable') || !!document.querySelector('[onclick*="documents"]')
    };

    return {
      navCount: navItems.length,
      sampleNavs: navItems.slice(0, 15),
      buttonCount: allButtons.length,
      sampleButtons: allButtons.filter(b => b.visible).slice(0, 25),
      modalCount: modals.length,
      modals: modals.map(m => m.id).filter(Boolean),
      tabCount: tabPanels.length,
      tabs: tabPanels.map(t => t.id).filter(Boolean),
      candidateFeatures,
      hrmsFeatures
    };
  });

  console.log('--- DETAILED UI PAGE INSPECTION ---');
  console.log(JSON.stringify(pageDetails, null, 2));

  await browser.close();
}

inspectUi().catch(console.error);
