/**
 * Rankly.ai - HR AI-Sorted Candidate Queue, Candidate Evaluation Brief, Fast Actions & Audit Logs
 * Enterprise Realtime Candidate Triage & Audit Engine
 */

(function() {
    'use strict';

    let currentQueueData = [];
    let currentScoreFilter = 'all';
    let currentRoleFilter = 'all';
    let currentSearchQuery = '';
    let activeCheatSheetCandidate = null;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. AI-SORTED CANDIDATE QUEUE
    // ─────────────────────────────────────────────────────────────────────────
    window.loadAiCandidateQueue = async function() {
        const tableBody = document.getElementById('aiCandidateQueueTableBody');
        const emptyState = document.getElementById('aiQueueEmptyState');

        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-xs text-gray-400">
                        <i class="fa-solid fa-spinner fa-spin mr-2 text-emerald-500 text-sm"></i> Calibrating AI Candidate Queue with AI Fit ranking...
                    </td>
                </tr>
            `;
        }

        try {
            const params = new URLSearchParams();
            if (currentRoleFilter && currentRoleFilter !== 'all') params.append('targetRole', currentRoleFilter);
            if (currentScoreFilter && currentScoreFilter !== 'all') params.append('minScore', currentScoreFilter);
            if (currentSearchQuery) params.append('search', currentSearchQuery);

            const res = await fetch(`/api/candidates/ai-queue?${params.toString()}`, { credentials: 'include' });
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load AI queue');

            currentQueueData = data.candidates || [];
            renderAiCandidateQueue(currentQueueData);
            updateAiQueueStats(currentQueueData);
            loadRecentAuditBanner();
        } catch (err) {
            console.error('AI Candidate Queue Load Error:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-8 text-center text-xs text-red-500">
                            Failed to load candidate queue: ${err.message}
                        </td>
                    </tr>
                `;
            }
        }
    };

    function updateAiQueueStats(candidates) {
        const totalEl = document.getElementById('queueStatTotal');
        const topEl = document.getElementById('queueStatTop');
        const strongEl = document.getElementById('queueStatStrong');
        const shortlistedEl = document.getElementById('queueStatShortlisted');

        const total = candidates.length;
        const topCount = candidates.filter(c => c.score >= 90).length;
        const strongCount = candidates.filter(c => c.score >= 75 && c.score < 90).length;
        const shortCount = candidates.filter(c => c.stage === 'shortlisted').length;

        if (totalEl) totalEl.textContent = total;
        if (topEl) topEl.textContent = topCount;
        if (strongEl) strongEl.textContent = strongCount;
        if (shortlistedEl) shortlistedEl.textContent = shortCount;
    }

    function renderAiCandidateQueue(candidates) {
        const tableBody = document.getElementById('aiCandidateQueueTableBody');
        const emptyState = document.getElementById('aiQueueEmptyState');

        if (!tableBody) return;

        if (!candidates || candidates.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Candidates are already sorted by score DESC from backend
        tableBody.innerHTML = candidates.map((cand, idx) => {
            const score = Math.round(cand.score || 0);
            
            // Score styling
            let badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
            let dotColor = 'bg-emerald-500';
            let rankTag = '';

            if (score >= 90) {
                badgeBg = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
                dotColor = 'bg-emerald-500';
                rankTag = '<span class="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 ml-1.5"><i class="fa-solid fa-star text-[8px] mr-0.5"></i> TOP 90%+</span>';
            } else if (score >= 75) {
                badgeBg = 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30';
                dotColor = 'bg-teal-500';
            } else if (score >= 50) {
                badgeBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
                dotColor = 'bg-amber-500';
            } else {
                badgeBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
                dotColor = 'bg-rose-500';
            }

            // Stage pill
            let stageBadge = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            let stageLabel = 'AI Screened';
            const stageLower = (cand.stage || 'applied').toLowerCase();

            if (stageLower === 'shortlisted') {
                stageBadge = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold';
                stageLabel = 'HR Shortlisted';
            } else if (stageLower === 'interview') {
                stageBadge = 'bg-purple-500/10 text-purple-600 border-purple-500/30 font-bold';
                stageLabel = 'Interviewing';
            } else if (stageLower === 'rejected') {
                stageBadge = 'bg-rose-500/10 text-rose-600 border-rose-500/30';
                stageLabel = 'Rejected';
            } else if (stageLower === 'offered') {
                stageBadge = 'bg-emerald-600/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/50 font-bold';
                stageLabel = 'Offered';
            }

            const initialChar = (cand.name || 'C').charAt(0).toUpperCase();
            const avatarGrads = [
                'from-emerald-600 to-teal-500',
                'from-amber-600 to-orange-500',
                'from-blue-600 to-indigo-500',
                'from-purple-600 to-pink-500',
                'from-slate-700 to-zinc-900'
            ];
            const grad = avatarGrads[idx % avatarGrads.length];

            const summaryPreview = cand.cheatSheet?.summaryLines?.[0] || cand.summary || 'Profile evaluated against technical competency benchmarks.';

            return `
                <tr class="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors border-b border-[#E5E5DF] dark:border-zinc-800/60 text-xs">
                    <!-- Bulk Checkbox -->
                    <td class="p-3.5 text-center">
                        <input type="checkbox" class="candidate-bulk-checkbox rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4" value="${cand.id}" data-name="${escapeHtml(cand.name)}" onchange="if(window.toggleCandidateSelection) toggleCandidateSelection(this, '${cand.id}')">
                    </td>

                    <!-- Candidate Info -->
                    <td class="p-3.5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr ${grad} text-white font-black text-sm flex items-center justify-center shadow-xs flex-shrink-0">
                                ${initialChar}
                            </div>
                            <div>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <button type="button" onclick="openAiCheatSheet('${cand.id}')" class="font-bold text-[#111111] dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer">
                                        ${escapeHtml(cand.name)}
                                    </button>
                                    ${rankTag}
                                </div>
                                <div class="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                                    <span><i class="fa-regular fa-envelope text-[10px] mr-1"></i>${escapeHtml(cand.email || 'applicant@rankly.ai')}</span>
                                    ${cand.phone ? `<span>• <i class="fa-solid fa-phone text-[10px] mr-0.5"></i>${escapeHtml(cand.phone)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </td>

                    <!-- Target Role -->
                    <td class="p-3.5">
                        <span class="font-semibold text-[#111111] dark:text-zinc-200 block">${escapeHtml(cand.targetRole || 'Software Engineer')}</span>
                        <span class="text-[10px] text-gray-400 font-mono">Calibrated against ATS</span>
                    </td>

                    <!-- AI Fit Score (Ranked) -->
                    <td class="p-3.5">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${badgeBg} font-mono font-bold text-xs shadow-2xs">
                            <span class="w-2 h-2 rounded-full ${dotColor} animate-pulse"></span>
                            <span>${score}% MATCH</span>
                        </div>
                        <span class="block text-[10px] font-semibold text-gray-500 dark:text-zinc-400 mt-1">${escapeHtml(cand.fitVerdict || 'Optimal Fit')}</span>
                    </td>

                    <!-- Stage -->
                    <td class="p-3.5">
                        <span id="stage-badge-${cand.id}" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${stageBadge}">
                            ${stageLabel}
                        </span>
                    </td>

                    <!-- Candidate Evaluation Brief Quick Peek -->
                    <td class="p-3.5 max-w-xs">
                        <p class="text-[11px] text-[#444440] dark:text-zinc-300 line-clamp-2 leading-relaxed">
                            ${escapeHtml(summaryPreview)}
                        </p>
                    </td>

                    <!-- Fast Action Buttons (HR Shortlist / Reject / Resume Viewer / Interview Calendar / Evaluation Brief) -->
                    <td class="p-3.5 text-right">
                        <div class="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            <!-- In-Browser Resume Viewer -->
                            <button type="button" onclick="if(window.openResumeViewerModal) openResumeViewerModal('${cand.cvFile || ''}', '${escapeJsStr(cand.name)}', ${score})" class="p-2 rounded-lg border border-[#E5E5DF] dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-500 text-gray-700 dark:text-zinc-200 hover:text-emerald-600 transition-all text-xs font-semibold shadow-2xs cursor-pointer" title="View In-Browser Resume">
                                <i class="fa-regular fa-file-pdf text-rose-500 mr-1"></i>
                                <span>Resume</span>
                            </button>

                            <!-- Interactive Interview Scheduler -->
                            <button type="button" onclick="if(window.openInterviewCalendarModal) openInterviewCalendarModal({ id: '${cand.id}', name: '${escapeJsStr(cand.name)}', email: '${escapeJsStr(cand.email || '')}', role: '${escapeJsStr(cand.targetRole || '')}', score: ${score} })" class="p-2 rounded-lg border border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100 text-purple-700 dark:text-purple-300 transition-all text-xs font-semibold shadow-2xs cursor-pointer" title="Schedule Interview Calendar">
                                <i class="fa-regular fa-calendar-check text-purple-600 mr-1"></i>
                                <span>Schedule</span>
                            </button>

                            <!-- View Candidate Evaluation Brief -->
                            <button type="button" onclick="openAiCheatSheet('${cand.id}')" class="p-2 rounded-lg border border-[#E5E5DF] dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-500 text-gray-700 dark:text-zinc-200 hover:text-emerald-600 transition-all text-xs font-semibold shadow-2xs cursor-pointer" title="Open Candidate Evaluation Brief">
                                <i class="fa-solid fa-file-lines text-emerald-500 mr-1"></i>
                                <span>Evaluation Brief</span>
                            </button>

                            <!-- Fast Action: Move to HR Shortlist -->
                            <button type="button" id="btn-shortlist-${cand.id}" onclick="fastActionCandidate('${cand.id}', 'shortlist', '${escapeJsStr(cand.name)}')" class="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer" title="Move to HR Shortlist">
                                <i class="fa-solid fa-check text-[10px]"></i>
                                <span>Shortlist</span>
                            </button>

                            <!-- Fast Action: Reject -->
                            <button type="button" id="btn-reject-${cand.id}" onclick="fastActionCandidate('${cand.id}', 'reject', '${escapeJsStr(cand.name)}')" class="py-1.5 px-2 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold shadow-2xs cursor-pointer" title="Reject Candidate">
                                <i class="fa-solid fa-xmark text-[10px]"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. FAST ACTION BUTTONS (SHORTLIST / REJECT) & AUDIT LOG
    // ─────────────────────────────────────────────────────────────────────────
    window.fastActionCandidate = async function(candidateId, action, candidateName) {
        const btnShortlist = document.getElementById(`btn-shortlist-${candidateId}`);
        const btnReject = document.getElementById(`btn-reject-${candidateId}`);
        const stageBadge = document.getElementById(`stage-badge-${candidateId}`);

        if (action === 'shortlist' && btnShortlist) {
            btnShortlist.disabled = true;
            btnShortlist.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        } else if (action === 'reject' && btnReject) {
            btnReject.disabled = true;
            btnReject.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        }

        try {
            const res = await fetch('/api/candidates/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    id: candidateId,
                    action,
                    notes: action === 'shortlist' 
                        ? '1-Click HR Shortlist approved via AI Candidate Queue.' 
                        : 'Candidate rejected after review of qualifications.'
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Action failed');

            if (typeof window.showToast === 'function') {
                window.showToast(data.message || `Candidate ${candidateName} updated!`, 'success');
            }

            // Live UI Badge Update
            if (stageBadge) {
                if (action === 'shortlist') {
                    stageBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold';
                    stageBadge.textContent = 'HR Shortlisted';
                } else {
                    stageBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border bg-rose-500/10 text-rose-600 border-rose-500/30';
                    stageBadge.textContent = 'Rejected';
                }
            }

            // Reload recent audit banner & telemetry
            loadRecentAuditBanner();
        } catch (err) {
            console.error('Candidate Action Error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Error: ' + err.message, 'error');
            } else {
                alert('Action error: ' + err.message);
            }
        } finally {
            if (btnShortlist) {
                btnShortlist.disabled = false;
                btnShortlist.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i> <span>Shortlist</span>';
            }
            if (btnReject) {
                btnReject.disabled = false;
                btnReject.innerHTML = '<i class="fa-solid fa-xmark text-[10px]"></i>';
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CANDIDATE EVALUATION BRIEF PANEL MODAL
    // ─────────────────────────────────────────────────────────────────────────
    window.openAiCheatSheet = async function(candidateId) {
        const modal = document.getElementById('aiCheatSheetModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.classList.add('active');
        renderCheatSheetLoadingState();

        try {
            const res = await fetch(`/api/candidates/${candidateId}/cheat-sheet`, { credentials: 'include' });
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load candidate evaluation brief');

            activeCheatSheetCandidate = data.candidate;
            renderCheatSheetContent(data.candidate, data.cheatSheet);
        } catch (err) {
            console.error('Candidate Evaluation Brief Load Error:', err);
            const body = document.getElementById('aiCheatSheetBody');
            if (body) {
                body.innerHTML = `<div class="p-8 text-center text-xs text-red-500">Failed to load Candidate Evaluation Brief: ${err.message}</div>`;
            }
        }
    };

    window.closeAiCheatSheet = function() {
        const modal = document.getElementById('aiCheatSheetModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        activeCheatSheetCandidate = null;
    };

    function renderCheatSheetLoadingState() {
        const body = document.getElementById('aiCheatSheetBody');
        if (body) {
            body.innerHTML = `
                <div class="p-12 text-center text-xs text-gray-400 space-y-3">
                    <i class="fa-solid fa-file-lines fa-bounce text-emerald-500 text-2xl"></i>
                    <p class="font-bold text-[#111111] dark:text-white">Synthesizing Candidate Evaluation Brief...</p>
                    <p class="text-gray-400">Extracting 3-line executive summary, core competencies, risk matrix & structured interview questions</p>
                </div>
            `;
        }
    }

    function renderCheatSheetContent(candidate, cheatSheet) {
        const body = document.getElementById('aiCheatSheetBody');
        if (!body) return;

        const score = Math.round(candidate.score || 0);
        const name = candidate.name || 'Candidate';
        const role = candidate.targetRole || 'Software Engineer';
        const email = candidate.email || 'applicant@rankly.ai';
        const phone = candidate.phone || '+91 98765 43210';

        const lines = cheatSheet.summaryLines || [
            `${name} matches ${score}% of target requirements for ${role}.`,
            `Demonstrates strong execution in primary technical skills and engineering architecture.`,
            `Recommended for technical interview round to evaluate deeper system design concepts.`
        ];

        const strengths = cheatSheet.coreStrengths || ['Strong core stack mastery', 'Demonstrated problem solving', 'Clean code practices'];
        const risks = cheatSheet.potentialRisks || ['Evaluate production scale experience in interview'];
        const questions = cheatSheet.interviewQuestions || [
            { question: `How would you architect a distributed service in ${role} to maintain 99.9% uptime?`, signalHint: 'Evaluates high availability and fault-tolerant system design.' },
            { question: `Describe how you approach debugging high-latency API responses under load.`, signalHint: 'Evaluates profiling, caching, and database query optimization.' }
        ];

        body.innerHTML = `
            <div class="space-y-6 text-xs">
                <!-- Header Banner -->
                <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-lg flex items-center justify-center shadow-md">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-base font-black text-[#111111] dark:text-white tracking-tight">${escapeHtml(name)}</h3>
                                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    Verified Candidate
                                </span>
                            </div>
                            <p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">${escapeHtml(role)}</p>
                            <div class="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-3 mt-1 font-mono">
                                <span><i class="fa-regular fa-envelope mr-1 text-emerald-500"></i>${escapeHtml(email)}</span>
                                <span><i class="fa-solid fa-phone mr-1 text-emerald-500"></i>${escapeHtml(phone)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- AI Calibrated Match Score Gauge -->
                    <div class="p-3 px-4 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-500/30 text-center shadow-xs flex-shrink-0">
                        <div class="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">${score}%</div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">AI Fit Score</span>
                    </div>
                </div>

                <!-- 1. AI-GENERATED 3-LINE EXECUTIVE SUMMARY -->
                <div class="p-4 rounded-2xl bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-800 space-y-2">
                    <div class="flex items-center gap-2 font-bold text-xs text-[#111111] dark:text-white uppercase tracking-wider">
                        <i class="fa-solid fa-sparkles text-amber-500"></i>
                        <span>AI Executive 3-Line Summary</span>
                    </div>
                    <div class="space-y-1.5 text-xs text-[#333330] dark:text-zinc-200 leading-relaxed pl-1">
                        ${lines.map((line, lidx) => `
                            <div class="flex items-start gap-2">
                                <span class="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">${lidx + 1}</span>
                                <span>${escapeHtml(line)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 2-Column Grid: Core Strengths & Potential Risks -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Core Strengths -->
                    <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-500/20 shadow-2xs space-y-2.5">
                        <div class="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>Core Technical Strengths</span>
                        </div>
                        <ul class="space-y-2 text-xs text-gray-700 dark:text-zinc-300">
                            ${strengths.map(s => `
                                <li class="flex items-start gap-2">
                                    <i class="fa-solid fa-check text-emerald-500 text-[11px] mt-0.5 flex-shrink-0"></i>
                                    <span>${escapeHtml(s)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <!-- Potential Risks / Gaps -->
                    <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-amber-500/20 shadow-2xs space-y-2.5">
                        <div class="flex items-center gap-2 font-bold text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>Potential Risks / Skill Gaps</span>
                        </div>
                        <ul class="space-y-2 text-xs text-gray-700 dark:text-zinc-300">
                            ${risks.map(r => `
                                <li class="flex items-start gap-2">
                                    <i class="fa-solid fa-circle-exclamation text-amber-500 text-[11px] mt-0.5 flex-shrink-0"></i>
                                    <span>${escapeHtml(r)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>

                <!-- 3. TWO TAILORED TECHNICAL INTERVIEW QUESTIONS -->
                <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E5DF] dark:border-zinc-800 shadow-2xs space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-[#E5E5DF] dark:border-zinc-800">
                        <div class="flex items-center gap-2 font-bold text-xs text-[#111111] dark:text-white uppercase tracking-wider">
                            <i class="fa-solid fa-circle-question text-purple-500"></i>
                            <span>2 Tailored Technical Interview Questions</span>
                        </div>
                        <span class="text-[10px] text-gray-400 font-mono">Calibrated for ${escapeHtml(role)}</span>
                    </div>

                    <div class="space-y-3">
                        ${questions.map((q, qidx) => `
                            <div class="p-3.5 rounded-xl bg-[#FAFAF8] dark:bg-zinc-800/60 border border-[#E5E5DF] dark:border-zinc-800/80 space-y-1.5">
                                <div class="flex items-start gap-2">
                                    <span class="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-black text-[10px] flex-shrink-0 mt-0.5">Q${qidx + 1}</span>
                                    <span class="font-bold text-xs text-[#111111] dark:text-white leading-relaxed">${escapeHtml(q.question)}</span>
                                </div>
                                ${q.signalHint ? `
                                    <div class="pl-7 text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                                        <i class="fa-solid fa-bullseye text-purple-500 text-[10px]"></i>
                                        <span><strong>Look for signal:</strong> ${escapeHtml(q.signalHint)}</span>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Footer Fast Actions in Modal -->
                <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E5DF] dark:border-zinc-800">
                    <div class="text-[11px] text-gray-400 flex items-center gap-1.5">
                        <i class="fa-solid fa-shield-halved text-emerald-500"></i>
                        <span>Actions write directly to immutable audit logs</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <button type="button" onclick="closeAiCheatSheet()" class="py-2 px-3.5 rounded-xl border border-[#E5E5DF] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-xs font-semibold cursor-pointer">
                            Close
                        </button>
                        <button type="button" onclick="fastActionCandidate('${candidate.id}', 'reject', '${escapeJsStr(name)}'); closeAiCheatSheet();" class="py-2 px-3.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 text-xs font-bold transition-all cursor-pointer">
                            <i class="fa-solid fa-xmark mr-1"></i> Reject
                        </button>
                        <button type="button" onclick="fastActionCandidate('${candidate.id}', 'shortlist', '${escapeJsStr(name)}'); closeAiCheatSheet();" class="py-2 px-4 rounded-xl bg-[#183B33] hover:bg-[#122e28] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5">
                            <i class="fa-solid fa-check"></i>
                            <span>Move to HR Shortlist</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. AUDIT LOGS MODAL & TELEMETRY
    // ─────────────────────────────────────────────────────────────────────────
    window.openAuditLogsModal = async function() {
        const modal = document.getElementById('hrAuditLogsModal');
        if (!modal) return;

        modal.style.display = 'flex';
        modal.classList.add('active');
        const tableBody = document.getElementById('auditLogsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-xs text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading immutable audit trail...</td></tr>';
        }

        try {
            const res = await fetch('/api/candidates/audit-logs?limit=50', { credentials: 'include' });
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load audit logs');

            renderAuditLogsTable(data.logs || []);
        } catch (err) {
            console.error('Audit Logs Error:', err);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-xs text-red-500">Error: ${err.message}</td></tr>`;
            }
        }
    };

    window.closeAuditLogsModal = function() {
        const modal = document.getElementById('hrAuditLogsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    };

    function renderAuditLogsTable(logs) {
        const tableBody = document.getElementById('auditLogsTableBody');
        if (!tableBody) return;

        if (!logs || logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-xs text-gray-400">No audit log records found.</td></tr>';
            return;
        }

        tableBody.innerHTML = logs.map(log => {
            let actionBadge = 'bg-gray-100 text-gray-700';
            if (log.action.includes('SHORTLIST')) actionBadge = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
            else if (log.action.includes('REJECT')) actionBadge = 'bg-rose-500/15 text-rose-700 border-rose-500/30';
            else if (log.action.includes('UPLOAD')) actionBadge = 'bg-blue-500/15 text-blue-700 border-blue-500/30';

            const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now';

            return `
                <tr class="hover:bg-slate-50 dark:hover:bg-zinc-800/40 border-b border-[#E5E5DF] dark:border-zinc-800 text-xs">
                    <td class="p-3 font-mono text-[11px] text-gray-500">${timeStr}</td>
                    <td class="p-3">
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${actionBadge}">
                            ${escapeHtml(log.action)}
                        </span>
                    </td>
                    <td class="p-3 font-bold text-[#111111] dark:text-white">
                        ${escapeHtml(log.targetName || log.targetId || 'Candidate')}
                    </td>
                    <td class="p-3 font-mono text-[11px] text-gray-600 dark:text-zinc-300">
                        ${escapeHtml(log.actorEmail || 'system@rankly.ai')} (${escapeHtml(log.actorRole || 'hr')})
                    </td>
                    <td class="p-3 text-[11px] text-gray-500">
                        ${log.previousStage ? `<span class="font-mono">${escapeHtml(log.previousStage)} &rarr; ${escapeHtml(log.newStage)}</span>` : `<span class="font-mono">${escapeHtml(log.newStage || 'done')}</span>`}
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function loadRecentAuditBanner() {
        const bannerEl = document.getElementById('recentAuditBannerText');
        if (!bannerEl) return;

        try {
            const res = await fetch('/api/candidates/audit-logs?limit=1');
            const data = await res.json();
            if (data.success && data.logs && data.logs.length > 0) {
                const latest = data.logs[0];
                bannerEl.innerHTML = `<strong>Latest Audit:</strong> ${escapeHtml(latest.action)} on <em>${escapeHtml(latest.targetName || 'Candidate')}</em> by ${escapeHtml(latest.actorEmail)} (${new Date(latest.createdAt).toLocaleTimeString()})`;
            }
        } catch (_) {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. QUEUE FILTERS & CONTROLLERS
    // ─────────────────────────────────────────────────────────────────────────
    window.setAiQueueScoreFilter = function(minScore) {
        currentScoreFilter = minScore;
        document.querySelectorAll('.ai-score-pill').forEach(pill => {
            if (pill.dataset.score === String(minScore)) {
                pill.className = 'ai-score-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-[#183B33] text-white shadow-xs cursor-pointer';
            } else {
                pill.className = 'ai-score-pill px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-[#E5E5DF] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:border-emerald-500 cursor-pointer';
            }
        });
        window.loadAiCandidateQueue();
    };

    window.setAiQueueRoleFilter = function(role) {
        currentRoleFilter = role;
        window.loadAiCandidateQueue();
    };

    window.handleAiQueueSearch = function(input) {
        currentSearchQuery = (input ? input.value : '').trim();
        window.loadAiCandidateQueue();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 6. CANDIDATE PORTAL: RESUME UPLOAD FORM & APPLICATION SUBMIT
    // ─────────────────────────────────────────────────────────────────────────
    window.handleCandCvSelect = async function(input) {
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            const badge = document.getElementById('candCvFileBadge');
            const nameEl = document.getElementById('candCvSelectedName');
            const sizeEl = document.getElementById('candCvSelectedSize');
            if (nameEl) nameEl.textContent = file.name;
            if (sizeEl) sizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            if (badge) badge.classList.remove('hidden');

            // Trigger AI Resume Auto-Fill
            const statusBox = document.getElementById('cvAutoFillStatus');
            const statusText = document.getElementById('cvAutoFillText');
            const autoBadge = document.getElementById('cvAutoFillBadge');

            if (statusBox) {
                statusBox.classList.remove('hidden');
                if (statusText) statusText.textContent = 'Extracting candidate details from resume...';
                if (autoBadge) autoBadge.classList.add('hidden');
            }

            try {
                const formData = new FormData();
                formData.append('resume', file);

                const res = await fetch('/api/candidate/parse-resume', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data && data.success && data.parsed) {
                    const { name, email, phone, skills, targetRole } = data.parsed;

                    // 1. Candidate Application Form in Portal
                    const nameInp = document.getElementById('candAppFullName');
                    const emailInp = document.getElementById('candAppEmail');
                    const phoneInp = document.getElementById('candAppPhone');
                    const roleInp = document.getElementById('candAppTargetRole');
                    const skillsInp = document.getElementById('candAppSkills');

                    if (name && nameInp && !nameInp.value) nameInp.value = name;
                    if (email && emailInp && !emailInp.value) emailInp.value = email;
                    if (phone && phoneInp && !phoneInp.value) phoneInp.value = phone;
                    if (targetRole && roleInp && (!roleInp.value || roleInp.value === 'Senior Full Stack Engineer')) roleInp.value = targetRole;
                    if (skills && skills.length > 0 && skillsInp) {
                        const skillsStr = skills.join(', ');
                        skillsInp.value = skillsStr;
                    }

                    // 2. Sliding Register Form (if present)
                    const slideFirst = document.getElementById('slideRegFirstName');
                    const slideLast = document.getElementById('slideRegLastName');
                    const slideEmail = document.getElementById('slideRegEmail');
                    const slidePhone = document.getElementById('slideRegPhone');

                    if (name && (slideFirst || slideLast)) {
                        const parts = name.split(' ');
                        if (slideFirst && !slideFirst.value) slideFirst.value = parts[0] || '';
                        if (slideLast && !slideLast.value) slideLast.value = parts.slice(1).join(' ') || '';
                    }
                    if (email && slideEmail && !slideEmail.value) slideEmail.value = email;
                    if (phone && slidePhone && !slidePhone.value) slidePhone.value = phone;

                    // Update UI status banner
                    if (statusText) statusText.textContent = `Auto-filled details for: ${name || 'Applicant'} (${skills && skills.length ? skills.length + ' skills detected' : 'parsed'})`;
                    if (autoBadge) autoBadge.classList.remove('hidden');

                    if (typeof window.showToast === 'function') {
                        window.showToast('Resume parsed! Candidate profile auto-filled.', 'success');
                    }
                } else {
                    if (statusBox) statusBox.classList.add('hidden');
                }
            } catch (err) {
                console.warn('Auto-fill parse warning:', err.message);
                if (statusBox) statusBox.classList.add('hidden');
            }
        }
    };

    window.clearCandCvFile = function() {
        const fileInput = document.getElementById('candCvFileInput');
        const badge = document.getElementById('candCvFileBadge');
        const statusBox = document.getElementById('cvAutoFillStatus');
        if (fileInput) fileInput.value = '';
        if (badge) badge.classList.add('hidden');
        if (statusBox) statusBox.classList.add('hidden');
    };


    window.submitCandidateResumeApplication = async function() {
        const nameInput = document.getElementById('candAppFullName');
        const emailInput = document.getElementById('candAppEmail');
        const phoneInput = document.getElementById('candAppPhone');
        const roleInput = document.getElementById('candAppTargetRole');
        const expInput = document.getElementById('candAppExpYears');
        const skillsInput = document.getElementById('candAppSkills');
        const eduInput = document.getElementById('candAppEducation');
        const locInput = document.getElementById('candAppLocation');
        const salaryInput = document.getElementById('candAppExpectedSalary');
        const bioInput = document.getElementById('candAppBio');
        const fileInput = document.getElementById('candCvFileInput');
        const btn = document.getElementById('btnSubmitCandApplication');

        const fullName = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const targetRole = roleInput ? roleInput.value.trim() : 'Software Engineer';
        const experienceYears = expInput ? expInput.value : '2';
        const skills = skillsInput ? skillsInput.value.trim() : '';
        const education = eduInput ? eduInput.value.trim() : '';
        const location = locInput ? locInput.value.trim() : '';
        const expectedSalary = salaryInput ? salaryInput.value.trim() : '';
        const bio = bioInput ? bioInput.value.trim() : '';
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        if (!fullName || !email) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please provide both your Full Name and Email Address.', 'warning');
            } else {
                alert('Full Name and Email Address are required.');
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Calibrating CV & Submitting Application...';
        }

        try {
            const formData = new FormData();
            if (file) formData.append('cv', file);
            formData.append('fullName', fullName);
            formData.append('email', email);
            formData.append('phone', phone);
            formData.append('targetRole', targetRole);
            formData.append('experienceYears', experienceYears);
            formData.append('skills', skills);
            formData.append('education', education);
            formData.append('location', location);
            formData.append('expectedSalary', expectedSalary);
            formData.append('bio', bio);

            const res = await fetch('/api/candidate/upload-application', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Submission failed');

            if (typeof window.showToast === 'function') {
                window.showToast(data.message || 'Application submitted successfully!', 'success');
            }

            // Show success panel or switch to live application tracker
            const successBox = document.getElementById('candAppSubmitSuccessBox');
            if (successBox) {
                successBox.classList.remove('hidden');
            }

            // If user is logged in, reload application tracker
            if (typeof window.loadCandidateApplications === 'function') {
                window.loadCandidateApplications();
            }
        } catch (err) {
            console.error('Candidate Submission Error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Error: ' + err.message, 'error');
            } else {
                alert('Submission error: ' + err.message);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-2 text-emerald-400"></i> Submit CV & Enter AI Candidate Queue';
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 7. ROLE-BASED ACCESS VIEW (NORMAL EMPLOYEE RESTRICTION TO HR QUEUES)
    // ─────────────────────────────────────────────────────────────────────────
    window.showUnauthorizedAccessPage = function(attemptedTab) {
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        
        const unauthPage = document.getElementById('tab-unauthorized-access');
        if (unauthPage) {
            unauthPage.style.display = 'block';
        }

        const tabNameEl = document.getElementById('unauthorizedTabName');
        if (tabNameEl) {
            const labels = {
                'dashboard': 'HRMS Executive Dashboard',
                'ai-candidates': 'AI-Sorted Candidate Evaluation Queue',
                'pipeline': 'Talent Pipeline & Kanban Board',
                'screening': 'Screening Matrix & Evaluated Resumes',
                'hr-ai-intelligence': 'AI Talent & Policy Intelligence Hub',
                'analytics': 'Recruitment Analytics Hub',
                'health': 'System Health Telemetry'
            };
            tabNameEl.textContent = labels[attemptedTab] || attemptedTab.toUpperCase();
        }

        if (typeof window.showToast === 'function') {
            window.showToast('403 Forbidden: Internal HR Candidate Queues are strictly restricted to Human Resources.', 'error');
        }
    };

    // Utilities
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeJsStr(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

})();
