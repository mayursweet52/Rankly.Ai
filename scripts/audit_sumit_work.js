const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function comprehensiveSumitWorkAudit() {
  console.log('================================================================');
  console.log('🔍 COMPREHENSIVE AUDIT OF SUMIT (LEAD FRONTEND) CODE & UI WORK');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  const index3Path = path.join(__dirname, '..', 'public', 'index-3.html');
  const jsPath = path.join(__dirname, '..', 'public', 'js', 'sumitEnhancements.js');
  const queueJsPath = path.join(__dirname, '..', 'public', 'js', 'hrCandidateQueue.js');

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const index3Html = fs.readFileSync(index3Path, 'utf8');
  const sumitJs = fs.readFileSync(jsPath, 'utf8');
  const queueJs = fs.readFileSync(queueJsPath, 'utf8');

  // 1. Script Tag Inclusion Check
  console.log('--- 1. Script Inclusions in HTML Files ---');
  const hasScriptIndex = indexHtml.includes('src="/js/sumitEnhancements.js"');
  const hasScriptIndex3 = index3Html.includes('src="/js/sumitEnhancements.js"');
  if (hasScriptIndex && hasScriptIndex3) {
    console.log('✅ [1. Script Inclusions]: `sumitEnhancements.js` properly included in index.html & index-3.html');
    passed++;
  } else {
    console.error('❌ [1. Script Inclusions]: Missing script tag in HTML files');
    failed++;
  }

  // 2. DOM Parity Audit for All 5 Modals
  console.log('\n--- 2. DOM Parity Check for 5 Frontend Modules ---');
  const expectedDomIds = [
    // Module 1.1: Interview Calendar
    'interviewCalendarModal',
    'calendarCandName',
    'calendarCandRole',
    'calendarCandEmail',
    'interviewDateInput',
    'selectedInterviewTime',
    'interviewDurationSelect',
    'interviewRoundType',
    'interviewModeSelect',
    'btnSyncGoogleCalendar',
    'btnSyncOutlookCalendar',
    'btnConfirmScheduleInterview',

    // Module 1.2: In-Browser PDF/DOCX Resume Viewer
    'resumeViewerModal',
    'resumeViewerCandidateName',
    'resumeViewerScoreBadge',
    'resumeViewerSkillsBadge',
    'resumeViewerFrameContainer',
    'resumeViewerZoomPercent',

    // Module 1.3: HR Bulk Actions Toolbar
    'hrBulkActionsToolbar',
    'selectedCandidatesCount',
    'selectAllCandidatesCheckbox',

    // Module 1.4: Candidate Assessment Quiz
    'candidateAssessmentModal',
    'assessmentRoleTitle',
    'assessmentTimerDisplay',
    'assessmentCurrentQNumber',
    'assessmentTotalQCount',
    'assessmentQuestionText',
    'assessmentOptionsContainer',
    'btnAssessmentPrev',
    'btnAssessmentNext',
    'btnAssessmentSubmit',
    'assessmentScorecardView',
    'scorecardPercent',
    'scorecardCorrectCount',
    'scorecardStatusBadge',
    'scorecardRemarks',

    // Module 1.5: Voice Interview Simulator
    'voiceInterviewModal',
    'voiceQuestionCounter',
    'voiceCurrentQuestionText',
    'voiceWaveformCanvas',
    'voiceStatusBadge',
    'btnToggleVoiceRecord',
    'voiceFeedbackReport',
    'voiceClarityScore',
    'voicePaceWpm',
    'voiceFillerCount',
    'voiceFeedbackTips'
  ];

  let missingInIndex = expectedDomIds.filter(id => !indexHtml.includes(`id="${id}"`));
  let missingInIndex3 = expectedDomIds.filter(id => !index3Html.includes(`id="${id}"`));

  if (missingInIndex.length === 0 && missingInIndex3.length === 0) {
    console.log(`✅ [2. DOM Parity]: All ${expectedDomIds.length} required DOM IDs are 100% present in both index.html & index-3.html`);
    passed++;
  } else {
    console.error('❌ [2. DOM Parity Failed]: Missing IDs in index.html:', missingInIndex, 'in index-3.html:', missingInIndex3);
    failed++;
  }

  // 3. JavaScript Execution & Method Verification (VM Sandbox)
  console.log('\n--- 3. JavaScript VM Execution & Method Lifecycle Check ---');
  try {
    const fakeDom = {};
    const fakeElements = {};

    function createFakeElement(id, tag = 'div') {
      const el = {
        id,
        tagName: tag.toUpperCase(),
        textContent: '',
        innerHTML: '',
        value: '',
        style: {},
        classList: {
          classes: new Set(),
          add(...cls) { cls.forEach(c => this.classes.add(c)); },
          remove(...cls) { cls.forEach(c => this.classes.delete(c)); },
          contains(c) { return this.classes.has(c); },
          toggle(c) {
            if (this.classes.has(c)) { this.classes.delete(c); return false; }
            else { this.classes.add(c); return true; }
          },
          replace(oldC, newC) { this.classes.delete(oldC); this.classes.add(newC); }
        },
        dataset: {},
        setAttribute(k, v) { this[k] = v; },
        getAttribute(k) { return this[k]; }
      };
      fakeElements[id] = el;
      return el;
    }

    expectedDomIds.forEach(id => createFakeElement(id));

    const sandbox = {
      window: {},
      document: {
        getElementById: (id) => fakeElements[id] || null,
        querySelectorAll: () => [],
        querySelector: (sel) => null,
        createElement: (tag) => createFakeElement('temp', tag),
        body: createFakeElement('body')
      },
      navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [] }) } },
      setTimeout: (fn, ms) => fn(),
      setInterval: (fn, ms) => 123,
      clearInterval: () => {},
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
      Blob: class { constructor() {} },
      URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
      console: { log: () => {}, warn: () => {}, error: () => {} }
    };
    sandbox.window = sandbox;

    const script = new vm.Script(sumitJs);
    const context = vm.createContext(sandbox);
    script.runInContext(context);

    const requiredMethods = [
      'openInterviewCalendarModal',
      'closeInterviewCalendarModal',
      'selectInterviewTimeSlot',
      'downloadIcsCalendarFile',
      'confirmAndScheduleInterview',
      'openResumeViewerModal',
      'closeResumeViewerModal',
      'zoomResumeViewer',
      'toggleResumeViewerFullscreen',
      'toggleCandidateSelection',
      'toggleSelectAllCandidates',
      'clearCandidateSelection',
      'executeBulkCandidateAction',
      'openCandidateAssessmentModal',
      'closeCandidateAssessmentModal',
      'selectAssessmentAnswer',
      'nextAssessmentQuestion',
      'prevAssessmentQuestion',
      'submitCandidateAssessment',
      'openVoiceInterviewModal',
      'closeVoiceInterviewModal',
      'cycleNextMockQuestion',
      'toggleVoiceRecording',
      'analyzeVoiceAnswer',
      'stopVoiceRecording'
    ];

    let missingMethods = requiredMethods.filter(m => typeof sandbox.window[m] !== 'function');

    if (missingMethods.length === 0) {
      console.log(`✅ [3. JS VM Execution]: All ${requiredMethods.length} frontend functions loaded without syntax errors`);
      passed++;
    } else {
      console.error('❌ [3. JS VM Execution Failed]: Missing methods:', missingMethods);
      failed++;
    }

    // 4. Functional Test of Modal Logic in Sandbox
    console.log('\n--- 4. Interactive Logic Simulation ---');
    // Test Calendar
    sandbox.window.openInterviewCalendarModal({ name: 'Vikram Seth', role: 'Staff SRE' });
    const calName = fakeElements['calendarCandName']?.textContent;
    const calOpen = fakeElements['interviewCalendarModal']?.style.display === 'flex';
    sandbox.window.closeInterviewCalendarModal();
    const calClosed = fakeElements['interviewCalendarModal']?.style.display === 'none';

    // Test Resume Viewer
    sandbox.window.openResumeViewerModal('', 'Vikram Seth', 95, 'Kubernetes, Go, AWS');
    const viewName = fakeElements['resumeViewerCandidateName']?.textContent;
    const viewScore = fakeElements['resumeViewerScoreBadge']?.textContent;
    sandbox.window.zoomResumeViewer(20);
    const viewZoom = fakeElements['resumeViewerZoomPercent']?.textContent;
    sandbox.window.closeResumeViewerModal();

    // Test Assessment
    sandbox.window.openCandidateAssessmentModal('Cloud Architect');
    sandbox.window.selectAssessmentAnswer(1, 1);
    sandbox.window.submitCandidateAssessment();
    const scoreVal = fakeElements['scorecardPercent']?.textContent;
    sandbox.window.closeCandidateAssessmentModal();

    const logicOk = calOpen && calClosed && calName === 'Vikram Seth' && 
                    viewName === 'Vikram Seth' && viewScore === '95% Match' && viewZoom === '120%' &&
                    !!scoreVal;

    if (logicOk) {
      console.log('✅ [4. Interactive Logic Simulation]: Calendar, Resume Viewer, & Assessment passed all behavioral assertions');
      passed++;
    } else {
      console.error('❌ [4. Interactive Logic Simulation Failed]:', { calOpen, calClosed, calName, viewName, viewScore, viewZoom, scoreVal });
      failed++;
    }

  } catch (err) {
    console.error('❌ [JS VM Sandbox Error]:', err);
    failed += 2;
  }

  // 5. Verification of HR Queue Bulk Checkbox Integration
  console.log('\n--- 5. HR Candidate Queue Integration Check ---');
  const hasQueueBulkIntegration = queueJs.includes('candidate-bulk-checkbox') && 
                                  queueJs.includes('toggleCandidateSelection') &&
                                  queueJs.includes('openInterviewCalendarModal') &&
                                  queueJs.includes('openResumeViewerModal');

  if (hasQueueBulkIntegration) {
    console.log('✅ [5. HR Queue Integration]: Checkboxes, bulk actions, and modal triggers verified in hrCandidateQueue.js');
    passed++;
  } else {
    console.error('❌ [5. HR Queue Integration Failed]: Missing bindings in hrCandidateQueue.js');
    failed++;
  }

  console.log('\n================================================================');
  console.log(`🎯 SUMIT WORK AUDIT RESULT: Passed ${passed}/5 | Failed: ${failed}`);
  console.log('================================================================\n');
}

comprehensiveSumitWorkAudit();
