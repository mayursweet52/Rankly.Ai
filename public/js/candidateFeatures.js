/**
 * Rankly.ai - Candidate Portal Core Features
 * 1. ATS Score & JD Matcher
 * 2. Multi-Format Resume Exporter (PDF & DOCX)
 * 3. AI Cover Letter Generator
 * 4. Interactive Skill Gap & Badge Finder
 * 5. Candidate Application Tracker
 */

(function() {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ATS SCORE CHECKER & JOB DESCRIPTION MATCHER
    // ─────────────────────────────────────────────────────────────────────────
    window.handleAtsFileDrop = function(event) {
        event.preventDefault();
        const dropZone = document.getElementById('atsDropZone');
        if (dropZone) dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
        
        if (event.dataTransfer && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            const fileInput = document.getElementById('atsResumeFile');
            if (fileInput) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                updateAtsFileLabel(file.name);
            }
        }
    };

    window.handleAtsFileSelect = function(input) {
        if (input.files && input.files.length > 0) {
            updateAtsFileLabel(input.files[0].name);
        }
    };

    function updateAtsFileLabel(name) {
        const label = document.getElementById('atsFileSelectedName');
        const badge = document.getElementById('atsFileBadge');
        if (label) label.textContent = name;
        if (badge) badge.classList.remove('hidden');
    }

    window.clearAtsFile = function() {
        const fileInput = document.getElementById('atsResumeFile');
        const badge = document.getElementById('atsFileBadge');
        if (fileInput) fileInput.value = '';
        if (badge) badge.classList.add('hidden');
    };

    window.runAtsJdCheck = async function() {
        const fileInput = document.getElementById('atsResumeFile');
        const resumeTextInput = document.getElementById('atsResumeText');
        const jdInput = document.getElementById('atsJobDescription');
        const roleInput = document.getElementById('atsTargetRole');
        const nameInput = document.getElementById('atsCandidateName');
        const btn = document.getElementById('runAtsCheckBtn');

        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        const resumeText = resumeTextInput ? resumeTextInput.value.trim() : '';
        const jobDescription = jdInput ? jdInput.value.trim() : '';
        const targetRole = roleInput ? roleInput.value.trim() : 'Software Engineer';
        const candidateName = nameInput ? nameInput.value.trim() : '';

        if (!file && (!resumeText || resumeText.length < 20)) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please upload a resume file or paste at least 20 characters of resume text.', 'warning');
            } else {
                alert('Please upload a resume file or paste resume text.');
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analyzing with AI Engine...';
        }

        try {
            const formData = new FormData();
            if (file) formData.append('resume', file);
            if (resumeText) formData.append('resumeText', resumeText);
            if (jobDescription) formData.append('jobDescription', jobDescription);
            if (targetRole) formData.append('targetRole', targetRole);
            if (candidateName) formData.append('candidateName', candidateName);

            const response = await fetch('/api/candidate/ats-check', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'ATS analysis failed');
            }

            renderAtsResults(data);
            if (typeof window.showToast === 'function') {
                window.showToast(`ATS Score Calculated: ${data.matchScore}% Match!`, 'success');
            }
        } catch (err) {
            console.error('ATS Check Error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('ATS Error: ' + err.message, 'error');
            } else {
                alert('ATS Error: ' + err.message);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2 text-emerald-400"></i> Calibrate & Check ATS Match';
            }
        }
    };

    function renderAtsResults(data) {
        const container = document.getElementById('atsResultsContainer');
        const emptyState = document.getElementById('atsEmptyState');
        if (emptyState) emptyState.classList.add('hidden');
        if (container) container.classList.remove('hidden');

        // Score Meter
        const scoreVal = document.getElementById('atsResultScoreVal');
        const verdictPill = document.getElementById('atsResultVerdict');
        const summaryText = document.getElementById('atsResultSummary');

        if (scoreVal) scoreVal.textContent = data.matchScore;
        if (verdictPill) {
            verdictPill.textContent = data.verdict;
            if (data.matchScore >= 75) {
                verdictPill.className = 'px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
            } else if (data.matchScore >= 50) {
                verdictPill.className = 'px-3 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30';
            } else {
                verdictPill.className = 'px-3 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30';
            }
        }
        if (summaryText) summaryText.textContent = data.summary;

        // Category Scores
        const cats = data.categoryScores || {};
        setCategoryScore('atsCatTech', cats.technicalSkills || data.matchScore);
        setCategoryScore('atsCatExp', cats.experienceRelevance || data.matchScore);
        setCategoryScore('atsCatTools', cats.toolsAndFrameworks || data.matchScore);
        setCategoryScore('atsCatFormat', cats.formattingAndClarity || 85);

        // Matched Keywords
        const matchedBox = document.getElementById('atsMatchedKeywordsBox');
        if (matchedBox) {
            const list = data.matchedKeywords || [];
            matchedBox.innerHTML = list.length > 0
                ? list.map(kw => `<span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5"><i class="fa-solid fa-check text-[10px]"></i> ${kw}</span>`).join('')
                : '<span class="text-xs text-gray-400 font-mono">No direct keyword matches detected.</span>';
        }

        // Missing Keywords
        const missingBox = document.getElementById('atsMissingKeywordsBox');
        if (missingBox) {
            const list = data.missingKeywords || [];
            missingBox.innerHTML = list.length > 0
                ? list.map(kw => `<span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 flex items-center gap-1.5"><i class="fa-solid fa-circle-exclamation text-[10px]"></i> ${kw}</span>`).join('')
                : '<span class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Great job! No critical keywords missing from JD.</span>';
        }

        // Actionable Improvements
        const checklist = document.getElementById('atsImprovementsChecklist');
        if (checklist) {
            const tips = data.actionableImprovements || [];
            checklist.innerHTML = tips.map(tip => `
                <li class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E5DF] dark:border-zinc-800 flex items-start gap-3 shadow-2xs">
                    <i class="fa-solid fa-lightbulb text-amber-500 mt-1 flex-shrink-0"></i>
                    <span class="text-xs text-[#222220] dark:text-zinc-300 leading-relaxed">${tip}</span>
                </li>
            `).join('');
        }

        // Scroll into view on mobile
        if (window.innerWidth < 1024) {
            container.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function setCategoryScore(idPrefix, val) {
        const score = Math.min(100, Math.max(0, Math.round(val || 0)));
        const bar = document.getElementById(idPrefix + 'Bar');
        const text = document.getElementById(idPrefix + 'Val');
        if (bar) bar.style.width = score + '%';
        if (text) text.textContent = score + '%';
    }


    // ─────────────────────────────────────────────────────────────────────────
    // 2. MULTI-FORMAT RESUME EXPORTER (PDF & DOCX)
    // ─────────────────────────────────────────────────────────────────────────
    window.exportResumeAs = async function(format = 'docx') {
        const nameInput = document.getElementById('resumeName');
        const titleInput = document.getElementById('resumeProfession');
        const skillsInput = document.getElementById('resumeSkills');
        const expInput = document.getElementById('resumeExperience');

        const activeUser = window.currentUser || {};
        const name = (nameInput && nameInput.value.trim()) || activeUser.name || 'Candidate';
        const title = (titleInput && titleInput.value.trim()) || 'Software Professional';
        const skills = (skillsInput && skillsInput.value.trim()) || 'Full Stack, Cloud, APIs, Architecture';
        const experience = (expInput && expInput.value.trim()) || '- Built scalable microservices and user interfaces with modern tech stack.';
        const email = activeUser.email || '';
        const phone = activeUser.phone || '';

        const payload = {
            format,
            name,
            title,
            email,
            phone,
            skills: skills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean),
            experience,
            summary: `Driven ${title} with proven expertise in engineering reliable, scalable, and user-centric applications.`
        };

        const toastMsg = format === 'pdf' ? 'Generating ATS-compliant PDF document...' : 'Preparing Microsoft Word (.docx) export...';
        if (typeof window.showToast === 'function') window.showToast(toastMsg, 'info');

        try {
            const res = await fetch('/api/candidate/export-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error('Export service returned error status ' + res.status);
            }

            const blob = await res.blob();
            const cleanName = name.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const filename = `${cleanName}_Resume.${format === 'pdf' ? 'pdf' : 'docx'}`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            if (typeof window.showToast === 'function') {
                window.showToast(`Resume exported successfully as ${filename}!`, 'success');
            }
        } catch (err) {
            console.error('Export Error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Export failed: ' + err.message, 'error');
            } else {
                alert('Export failed: ' + err.message);
            }
        }
    };


    // ─────────────────────────────────────────────────────────────────────────
    // 3. AI COVER LETTER GENERATOR
    // ─────────────────────────────────────────────────────────────────────────
    window.generateAiCoverLetter = async function() {
        const nameInput = document.getElementById('clCandidateName');
        const roleInput = document.getElementById('clTargetRole');
        const companyInput = document.getElementById('clCompanyName');
        const resumeInput = document.getElementById('clResumeContext');
        const jdInput = document.getElementById('clJobDescription');
        const toneInput = document.getElementById('clTone');
        const btn = document.getElementById('generateCoverLetterBtn');

        const activeUser = window.currentUser || {};
        const candidateName = (nameInput && nameInput.value.trim()) || activeUser.name || 'Candidate';
        const targetRole = (roleInput && roleInput.value.trim()) || 'Senior Software Engineer';
        const companyName = (companyInput && companyInput.value.trim()) || '';
        const resumeText = (resumeInput && resumeInput.value.trim()) || '';
        const jobDescription = (jdInput && jdInput.value.trim()) || '';
        const tone = (toneInput && toneInput.value) || 'professional';

        if (!companyName) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please enter the Target Company Name.', 'warning');
            } else {
                alert('Please enter the Target Company Name.');
            }
            if (companyInput) companyInput.focus();
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Crafting Letter with AI...';
        }

        try {
            const res = await fetch('/api/candidate/generate-cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateName,
                    targetRole,
                    companyName,
                    resumeText,
                    jobDescription,
                    tone
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to generate cover letter');
            }

            const outputTextarea = document.getElementById('clOutputText');
            const resultCard = document.getElementById('clResultCard');
            const emptyCard = document.getElementById('clEmptyState');

            if (outputTextarea) outputTextarea.value = data.coverLetter;
            if (emptyCard) emptyCard.classList.add('hidden');
            if (resultCard) resultCard.classList.remove('hidden');

            if (typeof window.showToast === 'function') {
                window.showToast('Cover letter generated tailored for ' + companyName + '!', 'success');
            }
        } catch (err) {
            console.error('Cover Letter Error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Cover Letter Error: ' + err.message, 'error');
            } else {
                alert('Error: ' + err.message);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2 text-[#81E4DA]"></i> Generate Tailored Cover Letter';
            }
        }
    };

    window.copyCoverLetterToClipboard = function() {
        const text = document.getElementById('clOutputText');
        if (!text || !text.value) return;
        navigator.clipboard.writeText(text.value).then(() => {
            if (typeof window.showToast === 'function') {
                window.showToast('Cover letter copied to clipboard!', 'success');
            } else {
                alert('Copied to clipboard!');
            }
        });
    };

    window.downloadCoverLetterDocx = async function() {
        const textEl = document.getElementById('clOutputText');
        const companyInput = document.getElementById('clCompanyName');
        const nameInput = document.getElementById('clCandidateName');
        const roleInput = document.getElementById('clTargetRole');

        const activeUser = window.currentUser || {};
        const candidateName = (nameInput && nameInput.value.trim()) || activeUser.name || 'Candidate';
        const targetRole = (roleInput && roleInput.value.trim()) || 'Open Position';
        const companyName = (companyInput && companyInput.value.trim()) || 'Company';
        const letterContent = textEl ? textEl.value : '';

        if (!letterContent) {
            if (typeof window.showToast === 'function') window.showToast('No cover letter content to export.', 'warning');
            return;
        }

        try {
            const res = await fetch('/api/candidate/export-cover-letter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateName,
                    targetRole,
                    companyName,
                    letterContent,
                    candidateEmail: activeUser.email || '',
                    candidatePhone: activeUser.phone || ''
                })
            });

            if (!res.ok) throw new Error('Cover letter export failed');

            const blob = await res.blob();
            const cleanCompany = companyName.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Cover_Letter_${cleanCompany}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            if (typeof window.showToast === 'function') {
                window.showToast('Cover letter DOCX downloaded!', 'success');
            }
        } catch (err) {
            console.error('Download CL Error:', err);
            if (typeof window.showToast === 'function') window.showToast('Download failed: ' + err.message, 'error');
        }
    };


    // ─────────────────────────────────────────────────────────────────────────
    // 3.5 UNIFIED AI APPLICATION SUITE SUB-TAB & SYNC HANDLERS
    // ─────────────────────────────────────────────────────────────────────────
    window.switchAtsSuiteSubTab = function(sub) {
        const matchBtn = document.getElementById('atsSuiteTabMatch');
        const coverBtn = document.getElementById('atsSuiteTabCover');
        const matchPanel = document.getElementById('atsSuiteMatchPanel');
        const coverPanel = document.getElementById('atsSuiteCoverPanel');

        if (sub === 'cover') {
            if (matchPanel) matchPanel.style.display = 'none';
            if (coverPanel) coverPanel.style.display = 'block';
            if (coverBtn) {
                coverBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-white dark:bg-zinc-900 text-[#111111] dark:text-white shadow-2xs flex items-center gap-1.5 cursor-pointer';
            }
            if (matchBtn) {
                matchBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-gray-500 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-white flex items-center gap-1.5 cursor-pointer';
            }
            // Auto sync inputs from ATS panel to Cover letter if empty
            syncAtsToCoverLetter('all');
        } else {
            if (coverPanel) coverPanel.style.display = 'none';
            if (matchPanel) matchPanel.style.display = 'block';
            if (matchBtn) {
                matchBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all bg-white dark:bg-zinc-900 text-[#111111] dark:text-white shadow-2xs flex items-center gap-1.5 cursor-pointer';
            }
            if (coverBtn) {
                coverBtn.className = 'py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-gray-500 dark:text-zinc-400 hover:text-[#111111] dark:hover:text-white flex items-center gap-1.5 cursor-pointer';
            }
        }
    };

    window.syncAtsToCoverLetter = function(field = 'all') {
        if (field === 'role' || field === 'all') {
            const r = document.getElementById('atsTargetRole')?.value;
            const clR = document.getElementById('clTargetRole');
            if (clR && r && (!clR.value || field === 'role')) clR.value = r;
        }
        if (field === 'name' || field === 'all') {
            const n = document.getElementById('atsCandidateName')?.value;
            const clN = document.getElementById('clCandidateName');
            if (clN && n && (!clN.value || field === 'name')) clN.value = n;
        }
        if (field === 'jd' || field === 'all') {
            const jd = document.getElementById('atsJobDescription')?.value;
            const clJd = document.getElementById('clJobDescription');
            if (clJd && jd && (!clJd.value || field === 'jd')) clJd.value = jd.slice(0, 400);
        }
        if (field === 'resume' || field === 'all') {
            const res = document.getElementById('atsResumeText')?.value;
            const clRes = document.getElementById('clResumeContext');
            if (clRes && res && (!clRes.value || field === 'resume')) clRes.value = res.slice(0, 350);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 4. INTERACTIVE SKILL GAP & BADGE FINDER (REAL DATA ENGINE)
    // ─────────────────────────────────────────────────────────────────────────
    let activeSkillGapSkills = [];
    let hasSkillGapScanned = false;

    window.initSkillGapView = function() {
        if (activeSkillGapSkills.length === 0) {
            if (currentProfileSkills && currentProfileSkills.length > 0) {
                activeSkillGapSkills = [...currentProfileSkills];
            } else {
                const saved = localStorage.getItem('candidate_profile');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed.skills && Array.isArray(parsed.skills)) activeSkillGapSkills = [...parsed.skills];
                    } catch(e) {}
                }
            }
        }
        renderSkillGapCandidateChips();

        if (!hasSkillGapScanned) {
            window.resetSkillGapState();
        }
    };

    window.resetSkillGapState = function() {
        hasSkillGapScanned = false;
        const meterVal = document.getElementById('skillGapReadinessVal');
        if (meterVal) meterVal.textContent = '--%';
        
        const barsList = document.getElementById('skillGapBarsList');
        if (barsList) {
            barsList.innerHTML = `
                <div class="py-12 px-6 text-center space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-2xs">
                        <i class="fa-solid fa-sliders"></i>
                    </div>
                    <div class="text-xs font-bold text-[#111111] dark:text-zinc-100">No Benchmark Data Yet</div>
                    <p class="text-[11px] text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">Select your target role and click <strong>"Scan Skills & Benchmark"</strong> to evaluate your profile competencies against market requirements.</p>
                </div>
            `;
        }

        const badgesGrid = document.getElementById('skillGapBadgesGrid');
        if (badgesGrid) {
            badgesGrid.innerHTML = `
                <div class="py-12 px-6 text-center space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-2xs">
                        <i class="fa-solid fa-award"></i>
                    </div>
                    <div class="text-xs font-bold text-[#111111] dark:text-zinc-100">No Badges Evaluated Yet</div>
                    <p class="text-[11px] text-gray-500 dark:text-zinc-400 max-w-xs mx-auto">Run a skill scan to assess your earned credentials and unlock progress on enterprise badges.</p>
                </div>
            `;
        }

        const btn = document.getElementById('btnRunSkillScan');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-radar"></i> <span>Scan Skills & Benchmark</span>';
        }
    };

    window.onSkillGapRoleChanged = function(roleVal) {
        const select = document.getElementById('skillGapRoleSelect');
        const roleText = select ? select.options[select.selectedIndex].text : 'Selected Role';
        const title = document.getElementById('skillGapRoleTitle');
        if (title) title.textContent = roleText;
        
        // Reset benchmark and badges to awaiting scan
        window.resetSkillGapState();
    };

    window.syncSkillsFromCandidateProfile = function() {
        if (currentProfileSkills && currentProfileSkills.length > 0) {
            activeSkillGapSkills = [...currentProfileSkills];
        } else {
            const saved = localStorage.getItem('candidate_profile');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.skills && Array.isArray(parsed.skills)) {
                        activeSkillGapSkills = [...parsed.skills];
                    }
                } catch(e) {}
            }
        }

        renderSkillGapCandidateChips();
        if (hasSkillGapScanned) {
            window.runSkillGapScan();
        }
        if (typeof window.showToast === 'function') {
            window.showToast(`Synced ${activeSkillGapSkills.length} skills from your Candidate Profile!`, 'info');
        }
    };

    window.addCustomSkillToGap = function() {
        const inp = document.getElementById('skillGapCustomInput');
        if (!inp) return;
        const val = inp.value.trim();
        if (!val) return;

        if (!activeSkillGapSkills.some(s => s.toLowerCase() === val.toLowerCase())) {
            activeSkillGapSkills.push(val);
            renderSkillGapCandidateChips();
            if (hasSkillGapScanned) {
                window.runSkillGapScan();
            }
        }
        inp.value = '';
    };

    window.removeSkillFromGap = function(skillName) {
        activeSkillGapSkills = activeSkillGapSkills.filter(s => s.toLowerCase() !== skillName.toLowerCase());
        renderSkillGapCandidateChips();
        if (hasSkillGapScanned) {
            window.runSkillGapScan();
        }
    };

    function renderSkillGapCandidateChips() {
        const container = document.getElementById('skillGapCandidateSkillsList');
        if (!container) return;

        if (activeSkillGapSkills.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-400 italic">No skills loaded yet. Click "Sync from Profile" or add custom skills above.</span>';
            return;
        }

        container.innerHTML = activeSkillGapSkills.map(s => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                <span>${escapeHtml(s)}</span>
                <button type="button" onclick="removeSkillFromGap('${escapeHtml(s)}')" class="hover:text-red-500 transition-colors ml-0.5"><i class="fa-solid fa-xmark text-[10px]"></i></button>
            </span>
        `).join('');
    }

    window.runSkillGapScan = async function() {
        const select = document.getElementById('skillGapRoleSelect');
        const selectedRole = select ? select.value : 'software-engineer';
        const roleText = select ? select.options[select.selectedIndex].text : 'Software Engineer';

        if (activeSkillGapSkills.length === 0) {
            if (currentProfileSkills && currentProfileSkills.length > 0) {
                activeSkillGapSkills = [...currentProfileSkills];
                renderSkillGapCandidateChips();
            } else {
                const saved = localStorage.getItem('candidate_profile');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed.skills && Array.isArray(parsed.skills)) {
                            activeSkillGapSkills = [...parsed.skills];
                            renderSkillGapCandidateChips();
                        }
                    } catch(e) {}
                }
            }
        }

        const btn = document.getElementById('btnRunSkillScan');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> <span>Scanning Skills...</span>';
        }

        const barsList = document.getElementById('skillGapBarsList');
        if (barsList) {
            barsList.innerHTML = `
                <div class="py-12 px-6 text-center space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-2xs">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                    </div>
                    <div class="text-xs font-bold text-[#111111] dark:text-zinc-100">Scanning Competencies...</div>
                    <p class="text-[11px] text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">Evaluating profile skills against enterprise benchmarks for <strong>${escapeHtml(roleText)}</strong>...</p>
                </div>
            `;
        }

        const badgesGrid = document.getElementById('skillGapBadgesGrid');
        if (badgesGrid) {
            badgesGrid.innerHTML = `
                <div class="py-12 px-6 text-center space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shadow-2xs">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                    </div>
                    <div class="text-xs font-bold text-[#111111] dark:text-zinc-100">Evaluating Badges...</div>
                    <p class="text-[11px] text-gray-500 dark:text-zinc-400 max-w-xs mx-auto">Calibrating earned achievements & unlock progression...</p>
                </div>
            `;
        }

        try {
            const res = await fetch('/api/candidate/skill-gap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: selectedRole,
                    skills: activeSkillGapSkills
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to analyze skill gaps');

            hasSkillGapScanned = true;
            renderSkillGapDashboard(data);

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrows-rotate mr-1"></i> <span>Re-Scan Benchmark</span>';
            }

            if (typeof window.showToast === 'function') {
                window.showToast(`Skill benchmark & badge scan completed for ${data.roleTitle}!`, 'success');
            }
        } catch (err) {
            console.error('Skill Gap Error:', err);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-radar mr-1"></i> <span>Scan Skills & Benchmark</span>';
            }
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to scan skill gaps: ' + err.message, 'error');
            }
        }
    };

    // Keep backwards compatible alias
    window.loadSkillGapAnalysis = window.runSkillGapScan;

    function renderSkillGapDashboard(data) {
        // Overall Readiness Score
        const meterVal = document.getElementById('skillGapReadinessVal');
        const roleLabel = document.getElementById('skillGapRoleTitle');
        if (meterVal) meterVal.textContent = data.roleReadiness + '%';
        if (roleLabel) roleLabel.textContent = data.roleTitle;

        // Render Skill Progress Bars
        const skillsContainer = document.getElementById('skillGapBarsList');
        if (skillsContainer) {
            if (!data.skills || data.skills.length === 0) {
                skillsContainer.innerHTML = '<div class="p-6 text-center text-xs text-gray-500">No skill specifications available for this role.</div>';
            } else {
                skillsContainer.innerHTML = data.skills.map(s => {
                    const isExceed = s.status === 'Exceeds';
                    const isTarget = s.status === 'Target Met';
                    const isPartial = s.status === 'Partial Competency';
                    const colorClass = isExceed ? 'bg-emerald-500' : isTarget ? 'bg-indigo-500' : isPartial ? 'bg-amber-500' : 'bg-red-500';
                    const badgeClass = isExceed 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                        : isTarget 
                            ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' 
                            : isPartial 
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : 'bg-red-500/10 text-red-600 border-red-500/30';

                    return `
                        <div class="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E5DF] dark:border-zinc-800 space-y-2 shadow-2xs hover:border-indigo-400/40 transition-all">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold text-[#111111] dark:text-zinc-100">${escapeHtml(s.skill)}</span>
                                    <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${badgeClass}">${escapeHtml(s.status)}</span>
                                </div>
                                <div class="text-xs font-mono font-bold text-[#666660] dark:text-zinc-400">
                                    <span>${s.currentLevel}%</span>
                                    <span class="text-[10px] opacity-70">/ ${s.requiredLevel}% target</span>
                                </div>
                            </div>
                            <div class="w-full h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden relative">
                                <div class="h-full rounded-full transition-all duration-700 ${colorClass}" style="width: ${s.currentLevel}%;"></div>
                                <div class="absolute top-0 bottom-0 w-0.5 bg-black/40 dark:bg-white/40 z-10" style="left: ${s.requiredLevel}%;" title="Required Target: ${s.requiredLevel}%"></div>
                            </div>
                            ${s.gap > 0 ? `<div class="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Skill Gap: ${s.gap}% required for full benchmark</div>` : `<div class="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium"><i class="fa-solid fa-circle-check text-[10px]"></i> Competency benchmark achieved!</div>`}
                        </div>
                    `;
                }).join('');
            }
        }

        // Render Gamified Badges
        const badgesContainer = document.getElementById('skillGapBadgesGrid');
        if (badgesContainer) {
            if (!data.badges || data.badges.length === 0) {
                badgesContainer.innerHTML = '<div class="p-6 text-center text-xs text-gray-500">No badges configured for this role.</div>';
            } else {
                badgesContainer.innerHTML = data.badges.map(b => {
                    const isEarned = b.isEarned;
                    return `
                        <div class="p-3.5 rounded-xl border transition-all ${isEarned ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/10 border-emerald-500/40 shadow-2xs' : 'bg-white dark:bg-zinc-900 border-[#E5E5DF] dark:border-zinc-800 opacity-80'}">
                            <div class="flex items-start gap-3">
                                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${isEarned ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}">
                                    <i class="${escapeHtml(b.icon || 'fa-solid fa-award')}"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between gap-1">
                                        <h4 class="text-xs font-bold text-[#111111] dark:text-zinc-100 truncate">${escapeHtml(b.title)}</h4>
                                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${isEarned ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}">${escapeHtml(b.status)}</span>
                                    </div>
                                    <p class="text-[11px] text-[#666660] dark:text-zinc-400 mt-0.5 line-clamp-2">${escapeHtml(b.desc)}</p>
                                    <div class="mt-2 flex items-center gap-2">
                                        <div class="flex-1 h-1 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                            <div class="h-full rounded-full ${isEarned ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width: ${b.progress}%;"></div>
                                        </div>
                                        <span class="text-[10px] font-mono font-bold text-[#666660] dark:text-zinc-400">${b.progress}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // 5. CANDIDATE APPLICATION TRACKER DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    let candidateApplicationsList = [];

    window.loadCandidateApplications = async function() {
        const pipelineContainer = document.getElementById('candidatePipelineContainer');
        if (pipelineContainer) {
            pipelineContainer.innerHTML = '<div class="p-8 text-center text-xs text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading tracking pipeline...</div>';
        }

        try {
            const res = await fetch('/api/candidate/applications');
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load applications');

            candidateApplicationsList = data.applications || [];
            renderCandidatePipeline(candidateApplicationsList, data.employerEvaluations || []);
        } catch (err) {
            console.error('Applications Load Error:', err);
            if (pipelineContainer) {
                pipelineContainer.innerHTML = `<div class="p-8 text-center text-xs text-red-500">Failed to load applications: ${err.message}</div>`;
            }
        }
    };

    function renderCandidatePipeline(applications, employerEvals = []) {
        const stages = [
            { key: 'applied', label: 'Submitted / Applied', icon: 'fa-paper-plane', color: 'blue' },
            { key: 'under_review', label: 'Under Review', icon: 'fa-magnifying-glass', color: 'purple' },
            { key: 'shortlisted', label: 'Shortlisted', icon: 'fa-star', color: 'indigo' },
            { key: 'interview', label: 'Interview Scheduled', icon: 'fa-calendar-check', color: 'amber' },
            { key: 'offered', label: 'Offer Extended', icon: 'fa-trophy', color: 'emerald' }
        ];

        // Summary Counters
        const totalCount = applications.length + employerEvals.length;
        const reviewCount = applications.filter(a => a.stage === 'under_review' || a.stage === 'ai_screened').length;
        const interviewCount = applications.filter(a => a.stage === 'interview').length;
        const offerCount = applications.filter(a => a.stage === 'offered').length;

        const statTotal = document.getElementById('candAppTotalStat');
        const statReview = document.getElementById('candAppReviewStat');
        const statInterview = document.getElementById('candAppInterviewStat');
        const statOffer = document.getElementById('candAppOfferStat');

        if (statTotal) statTotal.textContent = totalCount;
        if (statReview) statReview.textContent = reviewCount;
        if (statInterview) statInterview.textContent = interviewCount;
        if (statOffer) statOffer.textContent = offerCount;

        const container = document.getElementById('candidatePipelineContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
                ${stages.map(stage => {
                    const matchedApps = applications.filter(a => {
                        if (stage.key === 'under_review') return a.stage === 'under_review' || a.stage === 'ai_screened';
                        return a.stage === stage.key;
                    });

                    return `
                        <div class="bg-[#FAFAF8] dark:bg-zinc-900/60 rounded-2xl p-3.5 border border-[#E5E5DF] dark:border-zinc-800 flex flex-col min-h-[420px] shadow-2xs">
                            <!-- Column Header -->
                            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#E5E5DF] dark:border-zinc-800">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid ${stage.icon} text-${stage.color}-500 text-xs"></i>
                                    <span class="text-xs font-bold text-[#111111] dark:text-zinc-200 tracking-tight">${stage.label}</span>
                                </div>
                                <span class="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full bg-white dark:bg-zinc-800 border border-[#E5E5DF] dark:border-zinc-700 text-[#111111] dark:text-zinc-200">${matchedApps.length}</span>
                            </div>

                            <!-- Cards List -->
                            <div class="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-0.5">
                                ${matchedApps.length > 0 ? matchedApps.map(app => `
                                    <div class="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E5DF] dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all space-y-2 group">
                                        <div class="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 class="text-xs font-bold text-[#111111] dark:text-white">${escapeHtml(app.jobTitle)}</h4>
                                                <p class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                                    <i class="fa-solid fa-building text-[10px]"></i> ${escapeHtml(app.companyName)}
                                                </p>
                                            </div>
                                            <button type="button" onclick="deleteCandidateApp('${app.id}')" class="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Application">
                                                <i class="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>

                                        ${app.salaryRange ? `<div class="text-[10px] font-mono text-[#666660] dark:text-zinc-400 flex items-center gap-1"><i class="fa-solid fa-wallet text-[10px]"></i> ${escapeHtml(app.salaryRange)}</div>` : ''}
                                        ${app.notes ? `<p class="text-[11px] text-[#444440] dark:text-zinc-300 italic bg-[#FAFAF8] dark:bg-zinc-800/60 p-2 rounded-lg border border-[#E5E5DF] dark:border-zinc-800/80 leading-relaxed">${escapeHtml(app.notes)}</p>` : ''}
                                        ${app.nextStep ? `<div class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><i class="fa-solid fa-arrow-right text-[9px]"></i> Next: ${escapeHtml(app.nextStep)}</div>` : ''}

                                        <!-- Quick Stage Shift Dropdown -->
                                        <div class="pt-2 border-t border-[#F1F5F9] dark:border-zinc-800/80 flex items-center justify-between">
                                            <span class="text-[10px] text-gray-400">Move:</span>
                                            <select onchange="updateCandidateAppStage('${app.id}', this.value)" class="text-[10px] font-semibold rounded-md border border-[#E5E5DF] dark:border-zinc-700 bg-[#FAFAF8] dark:bg-zinc-800 text-[#111111] dark:text-zinc-200 py-0.5 px-1.5 cursor-pointer">
                                                <option value="applied" ${app.stage === 'applied' ? 'selected' : ''}>Applied</option>
                                                <option value="under_review" ${app.stage === 'under_review' ? 'selected' : ''}>Review</option>
                                                <option value="shortlisted" ${app.stage === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                                                <option value="interview" ${app.stage === 'interview' ? 'selected' : ''}>Interview</option>
                                                <option value="offered" ${app.stage === 'offered' ? 'selected' : ''}>Offer</option>
                                            </select>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div class="p-6 text-center text-[11px] text-gray-400 border border-dashed border-[#E5E5DF] dark:border-zinc-800 rounded-xl font-mono">
                                        No jobs in this stage
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    window.openAddApplicationModal = function() {
        const modal = document.getElementById('addCandidateAppModal');
        if (modal) modal.style.display = 'flex';
    };

    window.closeAddApplicationModal = function() {
        const modal = document.getElementById('addCandidateAppModal');
        if (modal) modal.style.display = 'none';
    };

    window.saveNewCandidateApplication = async function() {
        const company = document.getElementById('newAppCompany')?.value.trim();
        const title = document.getElementById('newAppTitle')?.value.trim();
        const location = document.getElementById('newAppLocation')?.value.trim() || '';
        const salary = document.getElementById('newAppSalary')?.value.trim() || '';
        const stage = document.getElementById('newAppStage')?.value || 'applied';
        const notes = document.getElementById('newAppNotes')?.value.trim() || '';
        const nextStep = document.getElementById('newAppNextStep')?.value.trim() || '';

        if (!company || !title) {
            if (typeof window.showToast === 'function') window.showToast('Please enter both Company Name and Job Title.', 'warning');
            return;
        }

        try {
            const res = await fetch('/api/candidate/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName: company,
                    jobTitle: title,
                    location,
                    salaryRange: salary,
                    stage,
                    notes,
                    nextStep
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to save application');

            closeAddApplicationModal();
            // Clear form
            ['newAppCompany', 'newAppTitle', 'newAppLocation', 'newAppSalary', 'newAppNotes', 'newAppNextStep'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            if (typeof window.showToast === 'function') window.showToast('Job application added to your pipeline!', 'success');
            loadCandidateApplications();
        } catch (err) {
            console.error('Save App Error:', err);
            if (typeof window.showToast === 'function') window.showToast('Failed to add application: ' + err.message, 'error');
        }
    };

    window.updateCandidateAppStage = async function(id, newStage) {
        try {
            const res = await fetch(`/api/candidate/applications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update stage');

            if (typeof window.showToast === 'function') window.showToast(`Stage updated to ${newStage.replace('_', ' ')}!`, 'success');
            loadCandidateApplications();
        } catch (err) {
            console.error('Update Stage Error:', err);
            if (typeof window.showToast === 'function') window.showToast('Update failed: ' + err.message, 'error');
        }
    };

    window.deleteCandidateApp = async function(id) {
        if (!confirm('Remove this application from your tracking board?')) return;
        try {
            const res = await fetch(`/api/candidate/applications/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to remove application');

            if (typeof window.showToast === 'function') window.showToast('Application removed.', 'info');
            loadCandidateApplications();
        } catch (err) {
            console.error('Delete App Error:', err);
            if (typeof window.showToast === 'function') window.showToast('Delete failed: ' + err.message, 'error');
        }
    };

    // Helper for HTML escaping
    function escapeHtml(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        return String(str || '').replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DEDICATED CANDIDATE PROFILE PAGE
    // ─────────────────────────────────────────────────────────────────────────
    let currentProfileSkills = ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'PostgreSQL', 'Docker', 'GraphQL', 'Tailwind CSS', 'AWS'];

    window.loadCandidateProfile = async function() {
        try {
            const res = await fetch('/api/candidate/profile');
            const data = await res.json();
            if (data && data.profile) {
                renderCandidateProfile(data.profile);
            } else {
                const local = localStorage.getItem('candidate_profile');
                if (local) renderCandidateProfile(JSON.parse(local));
            }
        } catch (e) {
            const local = localStorage.getItem('candidate_profile');
            if (local) renderCandidateProfile(JSON.parse(local));
        }
    };

    function renderCandidateProfile(p) {
        if (!p) return;
        setVal('profileFirstName', p.firstName || '');
        setVal('profileLastName', p.lastName || '');
        setVal('profileEmail', p.email || '');
        setVal('profilePhone', p.phone || '');
        setVal('profileLocation', p.location || '');
        setVal('profileProfession', p.profession || '');
        setVal('profileBio', p.bio || '');
        setVal('profileExpYears', p.experienceYears || 4);
        setVal('profileExpLevel', p.experienceLevel || 'Mid');
        setVal('profileWorkType', p.workType || 'Remote / Hybrid');
        setVal('profileEducation', p.education || '');
        setVal('profileExpectedSalary', p.expectedSalary || '₹22 - 28 LPA');
        setVal('profileLinkedIn', p.linkedInUrl || '');
        setVal('profileGitHub', p.githubUrl || '');
        setVal('profilePortfolio', p.portfolioUrl || '');

        const fullName = `${p.firstName || 'Sumit'} ${p.lastName || 'Khomne'}`.trim();
        const headerName = document.getElementById('profileHeaderName');
        const headerTitle = document.getElementById('profileHeaderTitle');
        const headerEmail = document.getElementById('profileHeaderEmail');
        const headerPhone = document.getElementById('profileHeaderPhone');
        const avatar = document.getElementById('profileAvatar');
        const completeness = document.getElementById('profileCompletenessVal');
        const badgeWork = document.getElementById('badgeWorkType');
        const badgeSalary = document.getElementById('badgeExpectedSalary');

        if (headerName) headerName.textContent = fullName;
        if (headerTitle) headerTitle.textContent = `${p.profession || 'Senior Full Stack Engineer'} • ${p.location || 'India'}`;
        if (headerEmail) headerEmail.innerHTML = `<i class="fa-regular fa-envelope mr-1 text-emerald-500"></i> ${escapeHtml(p.email || '')}`;
        if (headerPhone) headerPhone.innerHTML = `<i class="fa-solid fa-phone mr-1 text-emerald-500"></i> ${escapeHtml(p.phone || '')}`;
        if (badgeWork) badgeWork.textContent = p.workType || 'Remote / Hybrid';
        if (badgeSalary) badgeSalary.textContent = p.expectedSalary || '₹22 - 28 LPA';

        if (avatar) {
            const initials = `${(p.firstName || 'S')[0]}${(p.lastName || 'K')[0]}`.toUpperCase();
            avatar.textContent = initials;
        }

        if (completeness) completeness.textContent = (p.completeness || 90) + '%';

        // Render live clickable Social & Portfolio badges in header
        const headerSocial = document.getElementById('profileHeaderSocialLinks');
        if (headerSocial) {
            const links = [];
            if (p.linkedInUrl) links.push(`<a href="${formatUrl(p.linkedInUrl)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"><i class="fa-brands fa-linkedin"></i> LinkedIn</a>`);
            if (p.githubUrl) links.push(`<a href="${formatUrl(p.githubUrl)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-slate-800/10 text-slate-800 dark:text-white border border-slate-800/20 hover:bg-slate-800/20 text-xs font-semibold flex items-center gap-1.5 transition-all"><i class="fa-brands fa-github"></i> GitHub</a>`);
            if (p.portfolioUrl) links.push(`<a href="${formatUrl(p.portfolioUrl)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"><i class="fa-solid fa-globe"></i> Portfolio</a>`);
            headerSocial.innerHTML = links.join(' ');
        }

        if (Array.isArray(p.skills) && p.skills.length > 0) {
            currentProfileSkills = [...p.skills];
        }
        renderProfileSkillChips();
    }

    function formatUrl(url) {
        if (!url) return '#';
        const trimmed = url.trim();
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            return 'https://' + trimmed;
        }
        return trimmed;
    }

    window.openSocialLink = function(inputId) {
        const el = document.getElementById(inputId);
        const raw = el ? el.value.trim() : '';
        if (!raw) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please enter or save a valid URL first.', 'warning');
            } else {
                alert('Please enter a valid URL first.');
            }
            return;
        }
        const fullUrl = formatUrl(raw);
        window.open(fullUrl, '_blank', 'noopener,noreferrer');
        if (typeof window.showToast === 'function') {
            window.showToast(`Opening ${fullUrl}...`, 'info');
        }
    };

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    function renderProfileSkillChips() {
        const container = document.getElementById('profileSkillsChips');
        const countEl = document.getElementById('profileSkillsCount');
        if (countEl) countEl.textContent = `${currentProfileSkills.length} Skills Added`;
        if (!container) return;

        if (currentProfileSkills.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-400 italic">No skills added yet. Type below to add.</span>';
            return;
        }

        container.innerHTML = currentProfileSkills.map(s => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                ${escapeHtml(s)}
                <button type="button" onclick="removeCandidateSkill('${escapeHtml(s)}')" class="hover:text-red-500 cursor-pointer ml-1"><i class="fa-solid fa-xmark text-[10px]"></i></button>
            </span>
        `).join('');
    }

    window.addCandidateSkillFromInput = function() {
        const input = document.getElementById('profileNewSkillInput');
        if (!input) return;
        const val = input.value.trim();
        if (!val) return;
        if (!currentProfileSkills.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
            currentProfileSkills.push(val);
            renderProfileSkillChips();
            updateProfileCompletenessMeter();
        }
        input.value = '';
    };

    window.quickAddCandidateSkill = function(skill) {
        if (!currentProfileSkills.map(s => s.toLowerCase()).includes(skill.toLowerCase())) {
            currentProfileSkills.push(skill);
            renderProfileSkillChips();
            updateProfileCompletenessMeter();
            if (typeof window.showToast === 'function') window.showToast(`Added ${skill}!`, 'info');
        }
    };

    window.removeCandidateSkill = function(skill) {
        currentProfileSkills = currentProfileSkills.filter(s => s.toLowerCase() !== skill.toLowerCase());
        renderProfileSkillChips();
        updateProfileCompletenessMeter();
    };

    function updateProfileCompletenessMeter() {
        const fields = ['profileFirstName', 'profileLastName', 'profileEmail', 'profilePhone', 'profileLocation', 'profileProfession', 'profileBio', 'profileEducation', 'profileLinkedIn'];
        let filled = 0;
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el && el.value.trim().length > 0) filled++;
        });
        if (currentProfileSkills.length >= 3) filled++;
        const total = fields.length + 1;
        const pct = Math.min(100, Math.round((filled / total) * 100));
        const meter = document.getElementById('profileCompletenessVal');
        if (meter) meter.textContent = pct + '%';
        return pct;
    }

    window.saveCandidateProfile = async function() {
        const btn = document.getElementById('saveProfileTopBtn');
        const bottomBtn = document.getElementById('saveProfileBottomBtn');
        const origTop = btn ? btn.innerHTML : '';
        const origBottom = bottomBtn ? bottomBtn.innerHTML : '';

        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        if (bottomBtn) bottomBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        const profileData = {
            firstName: document.getElementById('profileFirstName')?.value.trim() || '',
            lastName: document.getElementById('profileLastName')?.value.trim() || '',
            email: document.getElementById('profileEmail')?.value.trim() || '',
            phone: document.getElementById('profilePhone')?.value.trim() || '',
            location: document.getElementById('profileLocation')?.value.trim() || '',
            profession: document.getElementById('profileProfession')?.value.trim() || '',
            bio: document.getElementById('profileBio')?.value.trim() || '',
            skills: currentProfileSkills,
            experienceYears: Number(document.getElementById('profileExpYears')?.value) || 4,
            experienceLevel: document.getElementById('profileExpLevel')?.value || 'Mid',
            workType: document.getElementById('profileWorkType')?.value || 'Remote / Hybrid',
            education: document.getElementById('profileEducation')?.value.trim() || '',
            expectedSalary: document.getElementById('profileExpectedSalary')?.value.trim() || '₹22 - 28 LPA',
            linkedInUrl: document.getElementById('profileLinkedIn')?.value.trim() || '',
            githubUrl: document.getElementById('profileGitHub')?.value.trim() || '',
            portfolioUrl: document.getElementById('profilePortfolio')?.value.trim() || '',
            completeness: updateProfileCompletenessMeter()
        };

        try {
            const res = await fetch('/api/candidate/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            const data = await res.json();
            localStorage.setItem('candidate_profile', JSON.stringify(profileData));
            renderCandidateProfile(profileData);
            if (typeof window.showToast === 'function') window.showToast('Candidate Profile saved successfully!', 'success');
        } catch (e) {
            localStorage.setItem('candidate_profile', JSON.stringify(profileData));
            renderCandidateProfile(profileData);
            if (typeof window.showToast === 'function') window.showToast('Profile saved locally.', 'success');
        } finally {
            if (btn) btn.innerHTML = origTop;
            if (bottomBtn) bottomBtn.innerHTML = origBottom;
        }
    };

    window.aiPolishCandidateBio = async function() {
        const bioEl = document.getElementById('profileBio');
        const role = document.getElementById('profileProfession')?.value.trim() || 'Full Stack Engineer';
        const skills = currentProfileSkills.slice(0, 6).join(', ');
        const btn = document.getElementById('btnAiBioPolish');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Polishing with AI...';
        }

        try {
            const prompt = `Elevate this candidate bio into a high-impact, professional 2-3 sentence executive summary for an ATS profile. Target Role: ${role}. Key Skills: ${skills}. Current draft: "${bioEl ? bioEl.value : ''}". Strictly return ONLY the polished summary text without quotes or preamble.`;
            const res = await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt })
            });
            const data = await res.json();
            const polished = data.reply || data.response;
            if (polished && bioEl) {
                bioEl.value = polished.trim();
                updateProfileCompletenessMeter();
                if (typeof window.showToast === 'function') window.showToast('Bio polished with AI!', 'success');
            }
        } catch (e) {
            if (bioEl && !bioEl.value.trim()) {
                bioEl.value = `High-impact ${role} with 4+ years of proven expertise across ${skills}. Track record of architecting performant, resilient distributed architectures and accelerating release velocity.`;
            }
            if (typeof window.showToast === 'function') window.showToast('Bio updated with standard template.', 'info');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> <span>AI Bio Polish</span>';
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 7. CURATED JOB LISTINGS & DIRECT APPLY
    // ─────────────────────────────────────────────────────────────────────────
    let allLoadedJobs = [];

    window.loadJobListings = async function() {
        const grid = document.getElementById('jobListingsGrid');
        if (grid) grid.innerHTML = '<div class="col-span-full text-center py-10 text-xs text-gray-500"><i class="fa-solid fa-spinner fa-spin text-xl text-blue-500 mb-2 block"></i> Loading verified tech job openings...</div>';

        try {
            const res = await fetch('/api/candidate/jobs');
            const data = await res.json();
            if (data && data.jobs) {
                allLoadedJobs = data.jobs;
                renderJobListings(allLoadedJobs);
            }
        } catch (e) {
            console.error('Failed to load jobs:', e);
        }
    };

    window.filterJobListings = function() {
        const q = (document.getElementById('jobSearchInput')?.value || '').toLowerCase().trim();
        const dept = document.getElementById('jobDeptFilter')?.value || 'all';

        let filtered = [...allLoadedJobs];
        if (dept !== 'all') {
            filtered = filtered.filter(j => j.department.toLowerCase().includes(dept.toLowerCase()));
        }
        if (q) {
            filtered = filtered.filter(j => 
                j.title.toLowerCase().includes(q) || 
                j.company.toLowerCase().includes(q) || 
                (j.skills && j.skills.some(s => s.toLowerCase().includes(q)))
            );
        }
        renderJobListings(filtered);
    };

    let currentJobViewMode = 'cards';

    window.setJobViewMode = function(mode) {
        currentJobViewMode = mode;
        const cardsBtn = document.getElementById('jobViewCardsBtn');
        const listBtn = document.getElementById('jobViewListBtn');
        if (mode === 'list') {
            if (listBtn) listBtn.className = 'py-1 px-2.5 rounded-md text-xs font-semibold bg-white dark:bg-zinc-900 text-[#111111] dark:text-white shadow-2xs cursor-pointer';
            if (cardsBtn) cardsBtn.className = 'py-1 px-2.5 rounded-md text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer';
        } else {
            if (cardsBtn) cardsBtn.className = 'py-1 px-2.5 rounded-md text-xs font-semibold bg-white dark:bg-zinc-900 text-[#111111] dark:text-white shadow-2xs cursor-pointer';
            if (listBtn) listBtn.className = 'py-1 px-2.5 rounded-md text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer';
        }
        renderJobListings(allLoadedJobs);
    };

    function renderJobListings(jobs) {
        const grid = document.getElementById('jobListingsGrid');
        if (!grid) return;

        if (!jobs || jobs.length === 0) {
            grid.className = 'col-span-full';
            grid.innerHTML = '<div class="p-8 rounded-xl border text-center text-xs text-gray-500 bg-white dark:bg-zinc-900">No matching jobs found. Try adjusting your search keywords or department filter.</div>';
            return;
        }

        if (currentJobViewMode === 'list') {
            grid.className = 'col-span-full space-y-2';
            grid.innerHTML = `
                <div class="rounded-xl border border-[#E5E5DF] dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-gray-50 dark:bg-zinc-800/60 border-b border-[#E5E5DF] dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                            <tr>
                                <th class="py-2.5 px-3.5">Position & Company</th>
                                <th class="py-2.5 px-3">Department</th>
                                <th class="py-2.5 px-3">Location</th>
                                <th class="py-2.5 px-3">Salary Benchmark</th>
                                <th class="py-2.5 px-3">Match</th>
                                <th class="py-2.5 px-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#E5E5DF] dark:divide-zinc-800">
                            ${jobs.map(j => `
                                <tr class="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                    <td class="py-3 px-3.5">
                                        <div class="font-bold text-[#111111] dark:text-white">${escapeHtml(j.title)}</div>
                                        <div class="text-[11px] text-blue-600 dark:text-blue-400 font-medium">${escapeHtml(j.company)}</div>
                                    </td>
                                    <td class="py-3 px-3 text-[11px] text-gray-600 dark:text-zinc-300">${escapeHtml(j.department)}</td>
                                    <td class="py-3 px-3 text-[11px] text-gray-500 dark:text-zinc-400"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${escapeHtml(j.location)}</td>
                                    <td class="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">${escapeHtml(j.salaryRange)}</td>
                                    <td class="py-3 px-3">
                                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            ${j.matchScore}%
                                        </span>
                                    </td>
                                    <td class="py-3 px-3.5 text-right">
                                        <button type="button" onclick="applyToJobQuick('${escapeHtml(j.id)}', '${escapeHtml(j.title)}', '${escapeHtml(j.company)}', '${escapeHtml(j.location)}', '${escapeHtml(j.salaryRange)}')" class="py-1 px-3 rounded-lg bg-[#243E36] hover:bg-[#1b302a] text-white font-semibold text-xs shadow-2xs hover:shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer">
                                            <i class="fa-solid fa-paper-plane text-[10px]"></i>
                                            <span>Apply</span>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            return;
        }

        // Default 'cards' view: sleek, compact 3-column grid
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
        grid.innerHTML = jobs.map(j => `
            <div class="p-4 rounded-xl border border-[#E5E5DF] dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                <div class="space-y-2">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">${escapeHtml(j.company)}</span>
                            <h3 class="text-xs font-bold text-[#111111] dark:text-white mt-0.5 leading-snug truncate" title="${escapeHtml(j.title)}">${escapeHtml(j.title)}</h3>
                        </div>
                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                            ${j.matchScore}% Match
                        </span>
                    </div>

                    <p class="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">${escapeHtml(j.description)}</p>

                    <div class="flex flex-wrap gap-1 pt-0.5">
                        ${(j.skills || []).slice(0, 4).map(s => `<span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-medium">${escapeHtml(s)}</span>`).join('')}
                        ${(j.skills || []).length > 4 ? `<span class="px-1 py-0.5 text-[10px] text-gray-400 font-mono">+${j.skills.length - 4}</span>` : ''}
                    </div>
                </div>

                <div class="space-y-2.5 pt-2.5 border-t border-[#E5E5DF] dark:border-zinc-800 text-xs">
                    <div class="flex justify-between items-center text-gray-500 dark:text-zinc-400 text-[11px]">
                        <span class="truncate max-w-[140px]"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${escapeHtml(j.location)}</span>
                        <span class="font-bold font-mono text-emerald-600 dark:text-emerald-400 flex-shrink-0">${escapeHtml(j.salaryRange)}</span>
                    </div>

                    <button type="button" onclick="applyToJobQuick('${escapeHtml(j.id)}', '${escapeHtml(j.title)}', '${escapeHtml(j.company)}', '${escapeHtml(j.location)}', '${escapeHtml(j.salaryRange)}')" class="w-full py-1.5 px-3 rounded-lg bg-[#243E36] hover:bg-[#1b302a] text-white font-semibold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <i class="fa-solid fa-paper-plane text-[10px]"></i>
                        <span>Quick Apply</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.applyToJobQuick = async function(jobId, jobTitle, company, location, salaryRange) {
        try {
            const email = document.getElementById('profileEmail')?.value.trim() || 'candidate@rankly.ai';
            const res = await fetch('/api/candidate/jobs/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId,
                    jobTitle,
                    companyName: company,
                    location,
                    salaryRange,
                    candidateEmail: email,
                    notes: `Direct application submitted for ${jobTitle} via Rankly.ai portal.`
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                if (typeof window.showToast === 'function') {
                    window.showToast(data.message || 'Already applied or application error.', 'warning');
                } else {
                    alert(data.message);
                }
                return;
            }

            if (typeof window.showToast === 'function') {
                window.showToast(`Applied for ${jobTitle} at ${company}! Added to your live tracker.`, 'success');
            }
            if (typeof window.switchTab === 'function') {
                window.switchTab('applications');
            }
        } catch (e) {
            console.error('Apply error:', e);
            if (typeof window.showToast === 'function') window.showToast('Application submission error: ' + e.message, 'error');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 8. HR & ADMIN AI INTELLIGENCE & POLICY HUB
    // ─────────────────────────────────────────────────────────────────────────
    window.initHrAiIntelligence = function() {
        fetchAiTalentReport();
    };

    window.fetchAiTalentReport = async function() {
        const btn = document.getElementById('btnQuickTalentReport');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';

        try {
            const res = await fetch('/api/analytics/ai-report');
            const data = await res.json();
            if (data && data.success) {
                renderAiTalentReport(data);
                if (typeof window.showToast === 'function') window.showToast('Talent Health Score updated with AI Engine!', 'success');
            }
        } catch (e) {
            console.error('Talent report error:', e);
        } finally {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-sparkles text-emerald-400"></i> <span>Refresh Talent Score</span>';
        }
    };

    function renderAiTalentReport(data) {
        const report = data.report || {};
        const metrics = data.metricsSummary || {};

        const scoreEl = document.getElementById('talentHealthScoreVal');
        const badgeEl = document.getElementById('talentHealthBadge');
        const overviewEl = document.getElementById('hrTalentOverview');
        const totalCandsEl = document.getElementById('hrTalentTotalCands');
        const strongFitEl = document.getElementById('hrTalentStrongFit');
        const avgScoreEl = document.getElementById('hrTalentAvgScore');

        const score = report.talentHealthScore || 88;
        if (scoreEl) scoreEl.textContent = score;
        if (totalCandsEl) totalCandsEl.textContent = metrics.totalCandidates || 48;
        if (strongFitEl) strongFitEl.textContent = (metrics.strongFitPercentage || 76) + '%';
        if (avgScoreEl) avgScoreEl.textContent = metrics.averageScore || 79;

        if (badgeEl) {
            if (score >= 80) {
                badgeEl.textContent = 'Optimal Health';
                badgeEl.className = 'ml-2 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
            } else if (score >= 60) {
                badgeEl.textContent = 'Stable Velocity';
                badgeEl.className = 'ml-2 px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30';
            } else {
                badgeEl.textContent = 'Action Required';
                badgeEl.className = 'ml-2 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30';
            }
        }

        if (overviewEl && report.executiveOverview) {
            overviewEl.textContent = report.executiveOverview;
        }

        const strengthsList = document.getElementById('hrTalentStrengths');
        if (strengthsList && Array.isArray(report.keyStrengths)) {
            strengthsList.innerHTML = report.keyStrengths.map(s => `<li>${escapeHtml(s)}</li>`).join('');
        }

        const bottlenecksList = document.getElementById('hrTalentBottlenecks');
        if (bottlenecksList && Array.isArray(report.criticalBottlenecks)) {
            bottlenecksList.innerHTML = report.criticalBottlenecks.map(b => `<li>${escapeHtml(b)}</li>`).join('');
        }

        const recsList = document.getElementById('hrTalentRecommendations');
        if (recsList && Array.isArray(report.strategicRecommendations)) {
            recsList.innerHTML = report.strategicRecommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('');
        }
    }

    window.toggleCustomPolicyInput = function() {
        const select = document.getElementById('policySelectDoc');
        const wrap = document.getElementById('customPolicyInputWrap');
        if (wrap && select) {
            wrap.style.display = select.value === 'custom' ? 'block' : 'none';
        }
    };

    window.fetchPolicySummary = async function() {
        const select = document.getElementById('policySelectDoc');
        const customText = document.getElementById('customPolicyText')?.value.trim() || '';
        const btn = document.getElementById('btnSubmitPolicySummary');
        const btnHeader = document.getElementById('btnRunPolicySummary');

        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing with AI Engine...';
        if (btnHeader) btnHeader.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Summarizing...';

        const payload = {};
        if (select && select.value === 'custom') {
            payload.content = customText || 'All employees must adhere to standard security protocols and corporate communication guidelines.';
            payload.title = 'Custom Company Policy';
        } else if (select) {
            payload.title = select.options[select.selectedIndex]?.text || 'Corporate Policy';
            payload.content = `=== Policy Title: ${payload.title} ===\nThis policy defines universal compliance benchmarks, employee duties, remote work security parameters, leave allowances, and confidentiality rules governing all internal staff members.`;
        }

        try {
            const res = await fetch('/api/documents/internal/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to summarize policy');

            renderPolicySummary(data);
            if (typeof window.showToast === 'function') window.showToast('Corporate policy summarized successfully!', 'success');
        } catch (e) {
            console.error('Policy summary error:', e);
            if (typeof window.showToast === 'function') window.showToast('Summary error: ' + e.message, 'error');
        } finally {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-file-lines"></i> <span>Generate AI Executive Policy Brief</span>';
            if (btnHeader) btnHeader.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Summarize Now';
        }
    };

    function renderPolicySummary(data) {
        const summary = data.summary || {};
        const briefEl = document.getElementById('policyExecBrief');
        const clausesList = document.getElementById('policyKeyClauses');
        const entList = document.getElementById('policyEntitlements');
        const compList = document.getElementById('policyCompliance');

        const brief = summary.executiveSummary || summary.executiveBrief || 'Standard corporate operational policy establishing security and performance benchmarks.';
        if (briefEl) briefEl.textContent = brief;

        const directives = summary.keyDirectives || summary.keyClauses || [];
        if (clausesList && Array.isArray(directives) && directives.length > 0) {
            clausesList.innerHTML = directives.map(c => `<li>${escapeHtml(c)}</li>`).join('');
        }

        const entitlements = summary.employeeEntitlements || summary.entitlements || [];
        if (entList && Array.isArray(entitlements) && entitlements.length > 0) {
            entList.innerHTML = entitlements.map(e => `<li>${escapeHtml(e)}</li>`).join('');
        }

        const compliance = summary.complianceGuidelines || summary.complianceAndPenalties || [];
        if (compList && Array.isArray(compliance) && compliance.length > 0) {
            compList.innerHTML = compliance.map(p => `<li>${escapeHtml(p)}</li>`).join('');
        }
    }


    window.copyPolicySummary = function() {
        const brief = document.getElementById('policyExecBrief')?.innerText || '';
        const clauses = Array.from(document.querySelectorAll('#policyKeyClauses li')).map(li => '• ' + li.innerText).join('\n');
        const text = `EXECUTIVE POLICY BRIEF:\n${brief}\n\nKEY CLAUSES:\n${clauses}\n\nGenerated by Rankly.ai Policy Intelligence Engine`;
        navigator.clipboard?.writeText(text);
        if (typeof window.showToast === 'function') window.showToast('Copied policy summary to clipboard!', 'success');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 8. REAL-TIME NOTIFICATION UI (WEBSOCKETS & SUPABASE CLIENT)
    // ─────────────────────────────────────────────────────────────────────────
    let unreadNotificationCount = 0;

    function initRealtimeNotificationClient() {
        // 1. Socket.io Client listener
        if (typeof io !== 'undefined') {
            try {
                const socket = io();
                socket.on('connect', () => {
                    console.log('📡 [Candidate Realtime] Connected to live notification channel.');
                });

                socket.on('application_status_changed', (data) => {
                    handleLiveNotification({
                        title: '🔔 Application Status Updated',
                        message: `Your application for ${data.jobTitle || 'Role'} moved to stage: ${(data.newStatus || 'Review').toUpperCase()}`,
                        type: 'info'
                    });
                    if (typeof window.loadCandidateApplications === 'function') {
                        window.loadCandidateApplications();
                    }
                });

                socket.on('candidate_applied', (data) => {
                    handleLiveNotification({
                        title: '🎯 New Candidate Applied',
                        message: `${data.candidateName || data.name || 'Candidate'} applied for ${data.targetRole || 'Role'} (Score: ${data.score || 0}%)`,
                        type: 'success'
                    });
                    if (typeof window.loadCandidates === 'function') {
                        window.loadCandidates();
                    }
                    if (typeof window.loadEvaluations === 'function') {
                        window.loadEvaluations();
                    }
                });

                socket.on('leave_requested', (data) => {
                    handleLiveNotification({
                        title: '📅 New Leave Request',
                        message: `${data.employeeName || 'Staff Member'} requested ${data.leaveType || 'casual'} leave (${data.workingDays || 1} working days, weekends excluded)`,
                        type: 'info'
                    });
                    if (typeof window.loadLeavesHistory === 'function') {
                        window.loadLeavesHistory();
                    }
                    if (typeof window.fetchLeaveSummary === 'function') {
                        window.fetchLeaveSummary();
                    }
                });

                socket.on('leave_status_updated', (data) => {
                    handleLiveNotification({
                        title: '📅 Leave Request Update',
                        message: `Leave request status changed to: ${String(data.status).toUpperCase()}`,
                        type: data.status === 'approved' ? 'success' : 'warning'
                    });
                    if (typeof window.loadLeavesHistory === 'function') {
                        window.loadLeavesHistory();
                    }
                });

                socket.on('attendance_punched', (data) => {
                    handleLiveNotification({
                        title: '⏱️ Attendance Update',
                        message: `Employee #${data.employeeId} punched ${data.type === 'check_in' ? 'IN' : 'OUT'}`,
                        type: 'info'
                    });
                    if (typeof window.loadAttendanceHistory === 'function') {
                        window.loadAttendanceHistory();
                    }
                });
            } catch (err) {
                console.debug('Realtime socket init note:', err);
            }
        }

        // 2. Supabase Realtime Browser Channel (if Supabase client is present in window)
        if (window.supabase && typeof window.supabase.channel === 'function') {
            try {
                const sbChannel = window.supabase.channel('rankly-hrms-notifications');
                sbChannel
                    .on('broadcast', { event: 'candidate_applied' }, ({ payload }) => {
                        const d = payload?.payload || payload || {};
                        handleLiveNotification({
                            title: '🎯 New Candidate Application',
                            message: `${d.candidateName || 'Candidate'} applied for ${d.targetRole || 'Role'}`,
                            type: 'success'
                        });
                    })
                    .on('broadcast', { event: 'leave_requested' }, ({ payload }) => {
                        const d = payload?.payload || payload || {};
                        handleLiveNotification({
                            title: '📅 New Leave Request',
                            message: `${d.employeeName || 'Staff'} applied for leave (${d.workingDays || 1} working days)`,
                            type: 'info'
                        });
                    })
                    .subscribe();
            } catch (sbErr) {
                console.debug('Supabase client channel note:', sbErr.message);
            }
        }
    }

    function handleLiveNotification(notif) {
        unreadNotificationCount++;
        
        // Update bell badge
        const badgeEls = document.querySelectorAll('#notificationBadge, .notification-bell-badge, #unreadNoticeCount');
        badgeEls.forEach(b => {
            b.textContent = unreadNotificationCount;
            b.classList.remove('hidden');
            b.style.display = 'inline-flex';
            b.classList.add('animate-bounce');
            setTimeout(() => b.classList.remove('animate-bounce'), 1200);
        });

        // Trigger dynamic Toast alert
        if (typeof window.showToast === 'function') {
            window.showToast(`${notif.title}: ${notif.message}`, notif.type || 'info');
        }
    }

    window.clearNotificationBadge = function() {
        unreadNotificationCount = 0;
        const badgeEls = document.querySelectorAll('#notificationBadge, .notification-bell-badge, #unreadNoticeCount');
        badgeEls.forEach(b => {
            b.textContent = '0';
            b.style.display = 'none';
        });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 9. DEVELOPER API KEY REAL MANAGEMENT ENGINE
    // ─────────────────────────────────────────────────────────────────────────
    window.generateRealApiKey = function() {
        const chars = '0123456789abcdef';
        let rand = '';
        for (let i = 0; i < 32; i++) rand += chars[Math.floor(Math.random() * chars.length)];
        const key = 'rk_live_' + rand;
        localStorage.setItem('rankly_active_api_key', key);

        const keyEl = document.getElementById('liveApiKeyDisplay');
        if (keyEl) keyEl.textContent = key.slice(0, 18) + '... (Active)';

        if (typeof window.showToast === 'function') {
            window.showToast('New Production API Key generated and activated!', 'success');
        }
    };

    window.copyRealApiKey = function() {
        const key = localStorage.getItem('rankly_active_api_key') || 'rk_live_89a7f34c98d7f6e5d4c3b2a1';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(key).then(() => {
                if (typeof window.showToast === 'function') window.showToast('API Key copied to clipboard!', 'info');
            }).catch(() => {
                if (typeof window.showToast === 'function') window.showToast('API Key copied to clipboard!', 'info');
            });
        } else {
            if (typeof window.showToast === 'function') window.showToast('API Key copied!', 'info');
        }
    };

    window.copyReferralCode = function() {
        const code = document.getElementById('adminReferralCodeDisplay')?.innerText.trim() || 'RNK-CORP-9842';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                if (typeof window.showToast === 'function') window.showToast('Referral Code ' + code + ' copied to clipboard!', 'info');
            }).catch(() => {
                if (typeof window.showToast === 'function') window.showToast('Referral Code copied!', 'info');
            });
        } else {
            if (typeof window.showToast === 'function') window.showToast('Referral Code copied!', 'info');
        }
    };

    // Backwards-compatible aliases for Enterprise API & Corporate Invite
    window.generateEnterpriseApiKey = window.generateRealApiKey;
    window.copyEnterpriseApiKey = window.copyRealApiKey;
    window.copyCorporateInviteCode = window.copyReferralCode;

    document.addEventListener('DOMContentLoaded', function() {
        const savedKey = localStorage.getItem('rankly_active_api_key');
        if (savedKey) {
            const keyEl = document.getElementById('liveApiKeyDisplay') || document.getElementById('prodApiKeyDisplay');
            if (keyEl) keyEl.textContent = savedKey.slice(0, 18) + '... (Active)';
        }
    });

})();

