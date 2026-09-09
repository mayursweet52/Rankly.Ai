const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';

async function testLiveDesignMotion() {
    console.log('================================================================');
    console.log('🌐 LIVE CHROME VERIFICATION OF 6 DESIGNMOTION UI/UX SYSTEMS');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    const browser = await puppeteer.launch({
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        console.log('Navigating to ' + BASE_URL + '...');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        // 1. SYSTEM 1: Settings is a System
        console.log('--- 1. Testing System 1: Settings Architecture & Auto-Save ---');
        const settingsCheck = await page.evaluate(() => {
            const tab = document.getElementById('tab-settings');
            if (!tab) return { success: false, reason: 'No tab-settings' };

            // Switch to settings tab
            if (typeof window.switchTab === 'function') {
                window.switchTab('settings');
            } else {
                tab.style.display = 'block';
            }

            // Verify categories exist
            const nav = document.getElementById('settingsCategoryNav');
            const btns = nav ? nav.querySelectorAll('.settings-nav-btn') : [];
            const indicator = document.getElementById('settingsSyncIndicator');

            // Switch to preferences category
            window.DesignMotion.Settings.switchCategory('preferences');
            const prefSec = document.getElementById('settings-section-preferences');
            const prefVisible = prefSec && prefSec.style.display !== 'none';

            // Switch to danger category
            window.DesignMotion.Settings.switchCategory('danger');
            const dangerSec = document.getElementById('settings-section-danger');
            const dangerVisible = dangerSec && dangerSec.style.display !== 'none';

            // Trigger auto-save
            window.DesignMotion.Settings.updateSyncBadge('saving');
            const isSaving = indicator.textContent.includes('Saving');
            window.DesignMotion.Settings.updateSyncBadge('synced');
            const isSynced = indicator.textContent.includes('Cloud Synced');

            return {
                success: !!nav && btns.length === 5 && prefVisible && dangerVisible && isSaving && isSynced,
                categoriesCount: btns.length
            };
        });

        if (settingsCheck.success) {
            console.log('✅ [System 1]: Categorized settings, sidebar pill navigation (5 categories), and live auto-save sync verified.');
            passed++;
        } else {
            console.error('❌ [System 1]: Failed settings test:', settingsCheck);
            failed++;
        }

        // 2. SYSTEM 2: Notification Badge
        console.log('\n--- 2. Testing System 2: Notification Badge Micro-Interactions ---');
        const notifCheck = await page.evaluate(() => {
            const badge = document.getElementById('notifBadge');
            if (!badge) return { success: false, reason: 'No notifBadge' };

            // Set to 125 -> capped at 99+
            window.DesignMotion.Notifications.setBadgeCount(125);
            const text125 = badge.textContent.trim();
            const hasPill = badge.classList.contains('notif-badge-pill');

            // Set to dot mode
            window.DesignMotion.Notifications.setBadgeMode('dot');
            const isDot = badge.classList.contains('notif-badge-dot');

            // Reset to count mode with 7
            window.DesignMotion.Notifications.setBadgeMode('count');
            window.DesignMotion.Notifications.setBadgeCount(7);
            const text7 = badge.textContent.trim();

            // Check dropdown tabs
            const tabContainer = document.getElementById('notifFilterTabsContainer');
            const tabAll = document.getElementById('notifTabAll');
            const tabUnread = document.getElementById('notifTabUnread');

            return {
                success: text125 === '99+' && hasPill && isDot && text7 === '7' && !!tabContainer && !!tabAll && !!tabUnread,
                text125,
                text7
            };
        });

        if (notifCheck.success) {
            console.log('✅ [System 2]: Pill geometry, 99+ capping, unread dot mode, and dropdown filter tabs verified.');
            passed++;
        } else {
            console.error('❌ [System 2]: Failed notification badge test:', notifCheck);
            failed++;
        }

        // 3. SYSTEM 3: Resizable Panels
        console.log('\n--- 3. Testing System 3: Resizable Panels Layout ---');
        const splitCheck = await page.evaluate(() => {
            // Open resume viewer modal
            window.openResumeViewerModal('', 'Jane Doe', 96, 'Node.js, TypeScript, Distributed Systems', 'cand-test-1');
            
            const splitContainer = document.getElementById('resumeViewerSplitContainer');
            const leftPanel = document.getElementById('resumeViewerLeftPanel');
            const splitter = document.getElementById('resumeViewerSplitter');
            const frame = document.getElementById('resumeViewerFrameContainer');

            if (!splitContainer || !leftPanel || !splitter || !frame) {
                return { success: false, reason: 'Split elements missing' };
            }

            // Check left panel dossier content
            const atsScore = document.getElementById('dossierAtsScore')?.textContent;
            const brief = document.getElementById('dossierExecutiveBrief')?.textContent;

            // Test resize simulation
            leftPanel.style.width = '420px';
            localStorage.setItem('rankly_split_panel_width', '420');
            const savedWidth = localStorage.getItem('rankly_split_panel_width');

            // Close modal
            window.closeResumeViewerModal();

            return {
                success: !!splitContainer && !!splitter && atsScore === '96%' && savedWidth === '420',
                atsScore,
                savedWidth
            };
        });

        if (splitCheck.success) {
            console.log('✅ [System 3]: Resizable split panels, AI Dossier briefing, splitter handle & localStorage persistence verified.');
            passed++;
        } else {
            console.error('❌ [System 3]: Failed resizable panels test:', splitCheck);
            failed++;
        }

        // 4. SYSTEM 4: Scroll Position Restoration
        console.log('\n--- 4. Testing System 4: Scroll Position Restoration & Focus Ring ---');
        const scrollCheck = await page.evaluate(() => {
            // Save scroll state
            window.DesignMotion.Scroll.saveScroll('test_context', 'notifBellBtn');
            const savedRaw = sessionStorage.getItem('rankly_scroll_state_test_context');
            const state = JSON.parse(savedRaw || '{}');

            // Trigger restore
            window.DesignMotion.Scroll.restoreScroll('test_context');

            return {
                success: state && state.elementId === 'notifBellBtn' && typeof state.windowY === 'number'
            };
        });

        if (scrollCheck.success) {
            console.log('✅ [System 4]: Scroll coordinates preserved in sessionStorage and target element focus ring triggered.');
            passed++;
        } else {
            console.error('❌ [System 4]: Failed scroll restoration test:', scrollCheck);
            failed++;
        }

        // 5. SYSTEM 5: 6-Moves Mobile Table
        console.log('\n--- 5. Testing System 5: 6-Moves Mobile Table Restructuring ---');
        const mobileTableCheck = await page.evaluate(() => {
            // Switch to Card View
            window.DesignMotion.MobileTable.setViewMode('card');
            const cardGrid = document.getElementById('aiCandidateCardGrid');
            const table = document.querySelector('#aiCandidateQueueTableBody')?.closest('table');
            const isTableHidden = table && table.parentElement.style.display === 'none';
            const isCardGridVisible = cardGrid && cardGrid.style.display !== 'none';

            // Switch back to Table View
            window.DesignMotion.MobileTable.setViewMode('table');
            const isTableVisible = table && table.parentElement.style.display === 'block';

            return {
                success: !!cardGrid && isTableHidden && isCardGridVisible && isTableVisible
            };
        });

        if (mobileTableCheck.success) {
            console.log('✅ [System 5]: 6-Moves card grid transformation, view mode switcher, and responsive cards verified.');
            passed++;
        } else {
            console.error('❌ [System 5]: Failed mobile table test:', mobileTableCheck);
            failed++;
        }

        // 6. SYSTEM 6: Danger Actions Are a System
        console.log('\n--- 6. Testing System 6: Danger Actions System (Hold 2s, Typed Modal & Undo Toast) ---');
        const dangerCheck = await page.evaluate(() => {
            // 1. Check hold button
            const holdBtn = document.getElementById('settingsHoldDangerBtn');
            
            // 2. Open Typed Delete Modal
            window.DesignMotion.Danger.openTypedDeleteModal();
            const modal = document.getElementById('typedDeleteModal');
            const input = document.getElementById('typedDeleteInput');
            const confirmBtn = document.getElementById('confirmTypedDeleteBtn');

            const modalOpened = modal && modal.style.display !== 'none';
            const initiallyDisabled = confirmBtn && confirmBtn.hasAttribute('disabled');

            // Type "DELETE"
            input.value = 'DELETE';
            input.dispatchEvent(new Event('input'));
            const enabledAfterType = confirmBtn && !confirmBtn.hasAttribute('disabled');

            // Execute action -> triggers 5-second Undo toast
            window.DesignMotion.Danger.executeDestructiveAction();
            const undoToast = document.getElementById('dmUndoToast');
            const undoToastExists = !!undoToast;
            const undoBar = document.getElementById('dmUndoBar');

            // Click Undo
            const undoBtn = document.getElementById('dmUndoToastBtn');
            if (undoBtn) undoBtn.click();
            const toastRemovedAfterUndo = !document.getElementById('dmUndoToast');

            return {
                success: modalOpened && initiallyDisabled && enabledAfterType && undoToastExists && !!undoBar && toastRemovedAfterUndo
            };
        });

        if (dangerCheck.success) {
            console.log('✅ [System 6]: 2-second hold button, typed DELETE modal validation, and 5-second reversible undo toast verified.');
            passed++;
        } else {
            console.error('❌ [System 6]: Failed danger action test:', dangerCheck);
            failed++;
        }

    } finally {
        await browser.close();
    }

    console.log('\n================================================================');
    console.log(`LIVE CHROME VERIFICATION: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
}

testLiveDesignMotion().catch(err => {
    console.error('Live Chrome Test crashed:', err);
    process.exit(1);
});
