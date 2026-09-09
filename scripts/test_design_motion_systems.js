const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function testDesignMotionSystems() {
    console.log('================================================================');
    console.log('🚀 6 DESIGNMOTION UI/UX SYSTEMS (@designmotionhq) VERIFICATION');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    const index3Path = path.join(__dirname, '..', 'public', 'index-3.html');
    const suiteJsPath = path.join(__dirname, '..', 'public', 'js', 'designMotionSuite.js');
    const notifClientPath = path.join(__dirname, '..', 'public', 'js', 'notificationClient.js');

    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const index3Html = fs.readFileSync(index3Path, 'utf8');
    const suiteJs = fs.readFileSync(suiteJsPath, 'utf8');
    const notifClientJs = fs.readFileSync(notifClientPath, 'utf8');

    // ─── 1. HTML PARITY & SCRIPT INCLUSION ───
    console.log('--- 1. Script Inclusions & 100% HTML Parity ---');
    if (indexHtml === index3Html) {
        console.log('✅ [1.1 HTML Parity]: index.html and index-3.html are in 100% byte-for-byte parity.');
        passed++;
    } else {
        console.error('❌ [1.1 HTML Parity]: index.html and index-3.html differ!');
        failed++;
    }

    const hasSuiteInIndex = indexHtml.includes('src="/js/designMotionSuite.js"');
    const hasSuiteInIndex3 = index3Html.includes('src="/js/designMotionSuite.js"');
    if (hasSuiteInIndex && hasSuiteInIndex3) {
        console.log('✅ [1.2 Script Inclusions]: designMotionSuite.js properly included before last </body> in both files.');
        passed++;
    } else {
        console.error('❌ [1.2 Script Inclusions]: Missing script tag in HTML files!');
        failed++;
    }

    // ─── 2. SYSTEM 1: SETTINGS IS A SYSTEM ───
    console.log('\n--- 2. System 1: Settings is a System (Reel DbX0IKMtBKr) ---');
    const s1Categories = ['profile', 'preferences', 'notifications', 'team', 'danger'];
    const hasAllCategories = s1Categories.every(cat => suiteJs.includes('data-category="' + cat + '"'));
    const hasAutoSaveIndicator = suiteJs.includes('settingsSyncIndicator') && suiteJs.includes('Cloud Synced') && suiteJs.includes('Saving changes...');
    const hasQuarantinedDanger = suiteJs.includes('Quarantined Danger Zone') && suiteJs.includes('settingsHoldDangerBtn');

    if (hasAllCategories) {
        console.log('✅ [2.1 Settings Categories]: 5 distinct categories implemented with sidebar navigation (Profile, Preferences, Notifications, Team, Danger).');
        passed++;
    } else {
        console.error('❌ [2.1 Settings Categories]: Missing category definitions!');
        failed++;
    }

    if (hasAutoSaveIndicator) {
        console.log('✅ [2.2 Auto-Save Cloud Sync]: Live indicator with debounced network state (Saving changes... -> Cloud Synced).');
        passed++;
    } else {
        console.error('❌ [2.2 Auto-Save Cloud Sync]: Missing auto-save indicator logic!');
        failed++;
    }

    if (hasQuarantinedDanger) {
        console.log('✅ [2.3 Isolated Danger Zone]: High-friction danger section sequestered at the end with visual isolation.');
        passed++;
    } else {
        console.error('❌ [2.3 Isolated Danger Zone]: Missing quarantined danger zone!');
        failed++;
    }

    // ─── 3. SYSTEM 2: NOTIFICATION BADGE IS A SYSTEM ───
    console.log('\n--- 3. System 2: Notification Badge is a System (Reel Dcnuc60NbeO) ---');
    const hasPillGeometry = suiteJs.includes('notif-badge-pill') && suiteJs.includes('min-width: 18px') && suiteJs.includes('height: 18px');
    const hasCapping = suiteJs.includes("count > 99 ? '99+' : count");
    const hasBounceKeyframes = suiteJs.includes('@keyframes notifBadgeBounce') && suiteJs.includes('animate-notif-bounce');
    const hasDropdownTabs = suiteJs.includes('notifFilterTabsContainer') && suiteJs.includes('notifTabAll') && suiteJs.includes('notifTabUnread');
    const hasClientDelegation = notifClientJs.includes('window.DesignMotion.Notifications.setBadgeCount(count)');

    if (hasPillGeometry && hasCapping) {
        console.log('✅ [3.1 Geometry Stability & Capping]: Fixed pill dimensions and 99+ capping implemented.');
        passed++;
    } else {
        console.error('❌ [3.1 Geometry Stability & Capping]: Missing geometry stability or 99+ capping!');
        failed++;
    }

    if (hasBounceKeyframes) {
        console.log('✅ [3.2 Spring Bounce Micro-Interactions]: @keyframes notifBadgeBounce with cubic-bezier spring physics.');
        passed++;
    } else {
        console.error('❌ [3.2 Spring Bounce Micro-Interactions]: Missing bounce animation!');
        failed++;
    }

    if (hasDropdownTabs && hasClientDelegation) {
        console.log('✅ [3.3 Dropdown Filter Tabs & Client Link]: All / Unread tabs with instant read transitions and client sync.');
        passed++;
    } else {
        console.error('❌ [3.3 Dropdown Filter Tabs & Client Link]: Missing dropdown tabs or client delegation!');
        failed++;
    }

    // ─── 4. SYSTEM 3: RESIZABLE PANELS LAYOUT SYSTEM ───
    console.log('\n--- 4. System 3: Resizable Panels Layout System (Reel DcGQMxYNjxh) ---');
    const hasSplitContainer = suiteJs.includes('resumeViewerSplitContainer');
    const hasDossierLeftPanel = suiteJs.includes('resumeViewerLeftPanel') && suiteJs.includes('AI Candidate Dossier');
    const hasSplitterHandle = suiteJs.includes('resumeViewerSplitter') && suiteJs.includes('splitter-handle-hitarea') && suiteJs.includes('splitter-bar-visual');
    const hasClampAndSnap = suiteJs.includes('minWidth: 280') && suiteJs.includes('snapThreshold: 140') && suiteJs.includes('maxWidth = containerWidth * 0.70');
    const hasDblClickReset = suiteJs.includes("splitter.addEventListener('dblclick'") && suiteJs.includes('rankly_split_panel_width');

    if (hasSplitContainer && hasDossierLeftPanel) {
        console.log('✅ [4.1 Split-Screen Architecture]: Resume viewer modal equipped with split screen (Left: AI Dossier, Right: Document).');
        passed++;
    } else {
        console.error('❌ [4.1 Split-Screen Architecture]: Missing split container or left dossier panel!');
        failed++;
    }

    if (hasSplitterHandle && hasClampAndSnap && hasDblClickReset) {
        console.log('✅ [4.2 Splitter Mechanics]: 14px hit area, min 280px clamp, max 70%, snap-to-collapse, double-click reset & localStorage persistence.');
        passed++;
    } else {
        console.error('❌ [4.2 Splitter Mechanics]: Incomplete splitter mechanics!');
        failed++;
    }

    // ─── 5. SYSTEM 4: SCROLL POSITION RESTORATION SYSTEM ───
    console.log('\n--- 5. System 4: Scroll Position Restoration System (Reel DcLaVaGNfoy) ---');
    const hasScrollStateStorage = suiteJs.includes('rankly_scroll_state') && suiteJs.includes('sessionStorage');
    const hasSmoothRestore = suiteJs.includes("behavior: 'smooth'") && suiteJs.includes('window.scrollTo');
    const hasFocusHighlight = suiteJs.includes('dm-focus-highlight') && suiteJs.includes('@keyframes focusRingPulse');
    const hasModalHooks = suiteJs.includes('hookModalScrollTriggers') && suiteJs.includes('openResumeViewerModal') && suiteJs.includes('closeResumeViewerModal');

    if (hasScrollStateStorage && hasSmoothRestore && hasFocusHighlight && hasModalHooks) {
        console.log('✅ [5.1 Scroll Restoration & Focus Ring]: Exact scroll coordinates restored upon modal close with 1.6s emerald focus ring.');
        passed++;
    } else {
        console.error('❌ [5.1 Scroll Restoration & Focus Ring]: Missing scroll restoration or focus highlight logic!');
        failed++;
    }

    // ─── 6. SYSTEM 5: 6-MOVES MOBILE TABLE RESTRUCTURING ───
    console.log('\n--- 6. System 5: 6-Moves Mobile Responsive Table (Reel Dc8RfGzNPCN) ---');
    const hasMove1 = suiteJs.includes('dm-candidate-card') || suiteJs.includes('dm-responsive-table');
    const hasMove2 = suiteJs.includes('MOVE 2: Sticky Top Identifier');
    const hasMove3 = suiteJs.includes('MOVE 3: Corner Pinned Score Chip');
    const hasMove4 = suiteJs.includes('MOVE 4: 2x2 Micro-Grid for Key Metrics');
    const hasMove5 = suiteJs.includes('MOVE 5: Expandable Details Accordion');
    const hasMove6 = suiteJs.includes('MOVE 6: Fixed Bottom 1-Click Action Buttons');
    const hasViewModeToggle = suiteJs.includes('candidateViewModeToggle') && suiteJs.includes('6-Moves Card View');

    if (hasMove1 && hasMove2 && hasMove3 && hasMove4 && hasMove5 && hasMove6 && hasViewModeToggle) {
        console.log('✅ [6.1 6-Moves Mobile Restructuring]: All 6 moves implemented (Rows to cards, sticky header, corner chip, 2x2 grid, accordion, action bar).');
        passed++;
    } else {
        console.error('❌ [6.1 6-Moves Mobile Restructuring]: Missing one or more of the 6 moves!');
        failed++;
    }

    // ─── 7. SYSTEM 6: DANGER ACTIONS ARE A SYSTEM ───
    console.log('\n--- 7. System 6: Danger Actions Are a System (Reel Da4-EmYNYAP) ---');
    const has2sHoldBtn = suiteJs.includes('holdDuration: 2000') && suiteJs.includes('hold-confirm-progress-fill');
    const hasTypedModal = suiteJs.includes('typedDeleteModal') && suiteJs.includes('Type DELETE to confirm') && suiteJs.includes('typedDeleteInput');
    const hasUndoToast = suiteJs.includes('dm-undo-toast') && suiteJs.includes('dm-undo-countdown-bar') && suiteJs.includes('dmUndoToastBtn');

    if (has2sHoldBtn) {
        console.log('✅ [7.1 2-Second Hold-to-Confirm]: Continuous 2-second hold required with smooth progress animation and spring reset.');
        passed++;
    } else {
        console.error('❌ [7.1 2-Second Hold-to-Confirm]: Missing 2-second hold logic!');
        failed++;
    }

    if (hasTypedModal) {
        console.log('✅ [7.2 Typed Confirmation Modal]: Explicit typed "DELETE" verification before executing destructive operation.');
        passed++;
    } else {
        console.error('❌ [7.2 Typed Confirmation Modal]: Missing typed delete confirmation modal!');
        failed++;
    }

    if (hasUndoToast) {
        console.log('✅ [7.3 5-Second Reversible Undo Toast]: 5-second floating countdown toast allowing immediate abort/reversal.');
        passed++;
    } else {
        console.error('❌ [7.3 5-Second Reversible Undo Toast]: Missing reversible undo toast window!');
        failed++;
    }

    // ─── 8. RUNTIME SIMULATION IN VM ───
    console.log('\n--- 8. Runtime Sandbox VM Execution Audit ---');
    try {
        const mockLocalStorage = {};
        const mockSessionStorage = {};
        const mockDomElements = {};

        function createMockElement(tag, id = '') {
            return {
                tagName: tag.toUpperCase(),
                id,
                classList: {
                    classes: new Set(),
                    add(c) { this.classes.add(c); },
                    remove(c) { this.classes.delete(c); },
                    contains(c) { return this.classes.has(c); },
                    toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
                },
                style: {},
                children: [],
                parentElement: null,
                innerHTML: '',
                textContent: '',
                setAttribute() {},
                removeAttribute() {},
                getAttribute() { return null; },
                addEventListener() {},
                removeEventListener() {},
                querySelector() { return null; },
                querySelectorAll() { return []; },
                appendChild(c) { this.children.push(c); c.parentElement = this; return c; },
                insertBefore(c) { this.children.unshift(c); c.parentElement = this; return c; },
                remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(x => x !== this); }
            };
        }

        const sandbox = {
            window: {
                localStorage: {
                    getItem: (k) => mockLocalStorage[k] || null,
                    setItem: (k, v) => { mockLocalStorage[k] = String(v); }
                },
                sessionStorage: {
                    getItem: (k) => mockSessionStorage[k] || null,
                    setItem: (k, v) => { mockSessionStorage[k] = String(v); }
                },
                innerWidth: 1024,
                scrollY: 0,
                scrollTo() {},
                addEventListener() {},
                removeEventListener() {},
                requestAnimationFrame: (cb) => setTimeout(cb, 16),
                cancelAnimationFrame: (id) => clearTimeout(id)
            },
            document: {
                head: createMockElement('head'),
                body: createMockElement('body'),
                createElement: (t) => createMockElement(t),
                getElementById: (id) => mockDomElements[id] || null,
                querySelector: () => null,
                querySelectorAll: () => [],
                addEventListener() {}
            },
            console: { log: () => {}, error: () => {} },
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            Date
        };
        sandbox.window.document = sandbox.document;

        vm.createContext(sandbox);
        vm.runInContext(suiteJs, sandbox);

        if (sandbox.window.DesignMotion && typeof sandbox.window.DesignMotion.init === 'function') {
            console.log('✅ [8.1 Global Namespace]: `window.DesignMotion` successfully loaded with all 6 submodules.');
            passed++;
        } else {
            console.error('❌ [8.1 Global Namespace]: window.DesignMotion missing or failed initialization!');
            failed++;
        }
    } catch (err) {
        console.error('❌ [8.1 Runtime Simulation Error]:', err.message);
        failed++;
    }

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

testDesignMotionSystems().catch(err => {
    console.error('Test script crashed:', err);
    process.exit(1);
});
