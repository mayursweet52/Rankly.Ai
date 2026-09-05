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
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Analyzing with Nemotron AI...';
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
    // 4. INTERACTIVE SKILL GAP & BADGE FINDER
    // ─────────────────────────────────────────────────────────────────────────
    window.loadSkillGapAnalysis = async function(roleKey = null) {
        const select = document.getElementById('skillGapRoleSelect');
        const skillsInput = document.getElementById('skillGapSkillsInput');
        const selectedRole = roleKey || (select ? select.value : 'software-engineer');

        const userSkills = skillsInput && skillsInput.value ? skillsInput.value : (document.getElementById('resumeSkills')?.value || 'JavaScript, React, Node.js, SQL, Docker, Python');

        try {
            const res = await fetch('/api/candidate/skill-gap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: selectedRole,
                    skills: userSkills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean)
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to analyze skill gaps');

            renderSkillGapDashboard(data);
        } catch (err) {
            console.error('Skill Gap Error:', err);
        }
    };

    function renderSkillGapDashboard(data) {
        // Overall Readiness Score
        const meterVal = document.getElementById('skillGapReadinessVal');
        const roleLabel = document.getElementById('skillGapRoleTitle');
        if (meterVal) meterVal.textContent = data.roleReadiness + '%';
        if (roleLabel) roleLabel.textContent = data.roleTitle;

        // Render Skill Progress Bars
        const skillsContainer = document.getElementById('skillGapBarsList');
        if (skillsContainer) {
            skillsContainer.innerHTML = (data.skills || []).map(s => {
                const isExceed = s.status === 'Exceeds';
                const isTarget = s.status === 'Target Met';
                const colorClass = isExceed ? 'bg-emerald-500' : isTarget ? 'bg-indigo-500' : 'bg-amber-500';
                const badgeClass = isExceed 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                    : isTarget 
                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' 
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30';

                return `
                    <div class="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E5DF] dark:border-zinc-800 space-y-2 shadow-2xs">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-[#111111] dark:text-zinc-100">${s.skill}</span>
                                <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${badgeClass}">${s.status}</span>
                            </div>
                            <div class="text-xs font-mono font-bold text-[#666660] dark:text-zinc-400">
                                <span>${s.currentLevel}%</span>
                                <span class="text-[10px] opacity-70">/ ${s.requiredLevel}% req</span>
                            </div>
                        </div>
                        <div class="w-full h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden relative">
                            <div class="h-full rounded-full transition-all duration-700 ${colorClass}" style="width: ${s.currentLevel}%;"></div>
                            <div class="absolute top-0 bottom-0 w-0.5 bg-black/40 dark:bg-white/40 z-10" style="left: ${s.requiredLevel}%;" title="Required Target: ${s.requiredLevel}%"></div>
                        </div>
                        ${s.gap > 0 ? `<div class="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Missing Gap: ${s.gap}% below benchmark target</div>` : ''}
                    </div>
                `;
            }).join('');
        }

        // Render Gamified Badges
        const badgesContainer = document.getElementById('skillGapBadgesGrid');
        if (badgesContainer) {
            badgesContainer.innerHTML = (data.badges || []).map(b => {
                const isEarned = b.isEarned;
                return `
                    <div class="p-4 rounded-2xl border transition-all ${isEarned ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/10 border-emerald-500/40 shadow-sm' : 'bg-white dark:bg-zinc-900 border-[#E5E5DF] dark:border-zinc-800 opacity-75'}">
                        <div class="flex items-start gap-3.5">
                            <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${isEarned ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}">
                                <i class="${b.icon || 'fa-solid fa-award'}"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between gap-1">
                                    <h4 class="text-xs font-bold text-[#111111] dark:text-zinc-100 truncate">${b.title}</h4>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isEarned ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}">${b.status}</span>
                                </div>
                                <p class="text-[11px] text-[#666660] dark:text-zinc-400 mt-1 line-clamp-2">${b.desc}</p>
                                <div class="mt-2.5 flex items-center gap-2">
                                    <div class="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
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

})();
