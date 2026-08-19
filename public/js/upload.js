// Enterprise File Upload & Pipeline Engine for Rankly.ai
document.addEventListener('DOMContentLoaded', function() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const uploadText = document.getElementById('uploadText');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    // Socket.io initialization
    const socket = (typeof io !== 'undefined') ? io() : null;
    try {
        if (socket) {
            socket.on('connect', () => console.debug('[upload.js] Socket connected:', socket.id));
        }
    } catch (e) {
        console.error('[upload.js] Socket error:', e);
    }

    const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
    const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
    ];

    function isAllowedFile(file) {
        const name = (file.name || '').toLowerCase();
        const mime = (file.type || '').toLowerCase();
        const hasExt = ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
        const hasMime = ALLOWED_MIME_TYPES.includes(mime);
        return hasExt || hasMime;
    }

    function getInitials(name) {
        if (!name) return 'CD';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function renderCandidate(c, index) {
        const candId = 'cand_' + (c.id || Math.random().toString(36).slice(2, 9));
        const initials = getInitials(c.name);
        
        let skillsList = [];
        let keyStrengths = [];
        let missingSkills = [];

        try {
            skillsList = Array.isArray(c.skills) ? c.skills : (typeof c.skills === 'string' ? JSON.parse(c.skills || '[]') : []);
        } catch (e) {
            skillsList = typeof c.skills === 'string' ? c.skills.split(',') : [];
        }

        try {
            keyStrengths = Array.isArray(c.keyStrengths) ? c.keyStrengths : (typeof c.keyStrengths === 'string' ? JSON.parse(c.keyStrengths || '[]') : skillsList);
        } catch (e) {
            keyStrengths = skillsList;
        }

        try {
            missingSkills = Array.isArray(c.missingSkills) ? c.missingSkills : (typeof c.missingSkills === 'string' ? JSON.parse(c.missingSkills || '[]') : []);
        } catch (e) {
            missingSkills = [];
        }

        const primarySkill = keyStrengths.length > 0 ? keyStrengths.slice(0, 2).join(', ') : 'Specialist';
        const score = c.atsScore || c.matchScore || 50;
        const summary = c.matchSummary || c.summary || 'Candidate evaluated by local Ollama AI.';

        // 1. Add to Leaderboard Table
        const leaderboardRows = document.getElementById('leaderboardRows');
        if (leaderboardRows && !document.getElementById('row_' + candId)) {
            const tr = document.createElement('tr');
            tr.id = 'row_' + candId;
            tr.className = 'border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors';

            const strengthsTags = keyStrengths.slice(0, 3).map(s => 
                `<span class="pill-strength">${s}</span>`
            ).join(' ');

            const safeName = (c.name || '').replace(/'/g, "\\'");
            const safeSummary = (summary || '').replace(/'/g, "\\'");

            tr.innerHTML = `
                <td class="p-2.5 font-bold text-[var(--text-muted)]">${index || '•'}</td>
                <td class="p-2.5">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-center text-[#6366f1] font-bold text-xs">${initials}</div>
                        <div>
                            <p class="font-bold text-[var(--text-primary)]">${c.name}</p>
                            <p class="text-[10px] text-[var(--text-muted)]">${primarySkill}</p>
                        </div>
                    </div>
                </td>
                <td class="p-2.5">
                    <div class="flex items-center gap-2">
                        <span class="font-extrabold text-[#6366f1] text-sm">${score}%</span>
                        <div class="w-14 bg-[var(--border-color)] h-1.5 rounded-full overflow-hidden">
                            <div class="bg-[#6366f1] h-full" style="width:${score}%"></div>
                        </div>
                    </div>
                </td>
                <td class="p-2.5"><div class="flex gap-1 flex-wrap">${strengthsTags}</div></td>
                <td class="p-2.5 text-[var(--text-muted)] max-w-[180px] truncate">${summary}</td>
                <td class="p-2.5 text-right">
                    <button onclick="openScorecard('${safeName}', '${score}%', '${primarySkill}', ${JSON.stringify(keyStrengths)}, '${safeSummary}', ${JSON.stringify(keyStrengths)}, ${JSON.stringify(missingSkills)})" class="text-[var(--text-muted)] hover:text-[#6366f1] p-1 rounded-full" title="View Scorecard">
                        <span class="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                    ${(window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'hr')) ? `
                        <button onclick="deleteCandidate('${c.id}', '${candId}')" class="text-red-400 hover:text-red-600 p-1" title="Delete Candidate">
                            <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                    ` : ''}
                </td>
            `;
            leaderboardRows.insertBefore(tr, leaderboardRows.firstChild);
        }

        // 2. Add to Kanban Pipeline
        const dropzone = document.getElementById('dropzone-screened');
        if (dropzone && !document.getElementById(candId)) {
            const card = document.createElement('div');
            card.className = 'card p-3 rounded-xl cursor-grab hover:shadow-md transition-all candidate-card';
            card.draggable = true;
            card.id = candId;
            card.dataset.candidateId = candId;
            card.dataset.stage = 'screened';
            card.dataset.match = score;
            card.dataset.name = c.name;
            card.ondragstart = (e) => window.drag ? window.drag(e) : null;

            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex gap-2 items-center">
                        <div class="w-8 h-8 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-center text-[#6366f1] font-bold text-xs">${initials}</div>
                        <div>
                            <h4 class="font-bold text-xs text-[var(--text-primary)]">${c.name}</h4>
                            <p class="text-[10px] text-[var(--text-muted)]">${primarySkill}</p>
                        </div>
                    </div>
                    <span class="text-[#6366f1] font-bold text-xs bg-[var(--bg-input)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">${score}%</span>
                </div>
                <div class="flex gap-1 mt-2 pt-2 border-t border-[var(--border-color)] items-center justify-between text-[11px]">
                    <button onclick="openScorecard('${c.name.replace(/'/g, "\\'")}', '${score}%', '${primarySkill}', ${JSON.stringify(keyStrengths)}, '${summary.replace(/'/g, "\\'")}', ${JSON.stringify(keyStrengths)}, ${JSON.stringify(missingSkills)})" class="text-[#6366f1] hover:underline font-bold">Scorecard</button>
                    ${(window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'hr')) ? `
                        <button onclick="deleteCandidate('${c.id}', '${candId}')" class="text-red-500 hover:text-red-700">Remove</button>
                    ` : ''}
                </div>
            `;
            dropzone.insertBefore(card, dropzone.firstChild);
        }
    }

    function renderCandidates(candidates) {
        if (!Array.isArray(candidates)) return;
        candidates.forEach((c, idx) => renderCandidate(c, idx + 1));

        const totalCards = document.querySelectorAll('#pipeline-container .candidate-card').length;
        const totalEl = document.getElementById('totalCandidatesCount');
        if (totalEl) totalEl.textContent = totalCards.toLocaleString();

        const rankedEl = document.getElementById('rankedCount');
        if (rankedEl) rankedEl.textContent = `${totalCards} candidate${totalCards === 1 ? '' : 's'}`;

        if (window.updateStageCounts) window.updateStageCounts();
    }
    window.renderCandidates = renderCandidates;

    // Delete candidate handler
    window.deleteCandidate = function(dbId, domId) {
        if (!confirm('Are you sure you want to delete this candidate?')) return;
        fetch(`/api/candidates/${dbId}?apiKey=rankly-secret-key`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const row = document.getElementById('row_' + domId);
                    if (row) row.remove();
                    const card = document.getElementById(domId);
                    if (card) card.remove();
                    if (window.updateStageCounts) window.updateStageCounts();
                    showToast('🗑️ Candidate deleted', 'info');
                }
            });
    };

    // Fetch existing candidates from backend
    window.fetchCandidates = function() {
        const userId = (window.currentUser && window.currentUser.id) ? window.currentUser.id : 'guest_user';
        return fetch(`/api/candidates/job_1?apiKey=rankly-secret-key&userId=${encodeURIComponent(userId)}`, {
            credentials: 'include'
        })
        .then(res => res.json())
        .then(candidates => {
            if (Array.isArray(candidates) && candidates.length > 0) {
                renderCandidates(candidates);
            }
        })
        .catch(err => console.debug('Candidates fetch error:', err));
    };

    // Auto-fetch candidates on load
    window.fetchCandidates();

    function handleFiles(files) {
        if (!files || files.length === 0) return;

        // RBAC check: Only Admin & HR can upload
        if (window.currentUser && (window.currentUser.role === 'jr_manager' || window.currentUser.role === 'guest_pending')) {
            showToast("⛔ Permission Denied: Only Admins and HR Recruiters can upload resumes.", "error");
            return;
        }

        // Check if all files are allowed formats (.pdf, .docx, .doc, .txt)
        for (let i = 0; i < files.length; i++) {
            if (!isAllowedFile(files[i])) {
                showToast("❌ Only PDF, DOCX, DOC, and TXT files are allowed", "error");
                return;
            }
        }

        uploadStatus.textContent = "⏳ Uploading " + files.length + " resume(s)...";
        uploadText.textContent = "Drop more or click to replace";
        uploadProgress.classList.add('active');
        progressBar.style.width = '20%';
        progressText.style.display = 'block';
        progressText.textContent = `📄 Uploading ${files.length} document(s)...`;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("resumes", files[i]);
        }

        const role = document.getElementById("targetRole") ? document.getElementById("targetRole").value : "Senior AI / ML Engineer";
        const uploadId = `upload_${Date.now()}`;
        const userId = (window.currentUser && window.currentUser.id) ? window.currentUser.id : 'guest_user';
        formData.append("jobId", "job_1");
        formData.append("jobDescription", role || "Senior AI Engineer");
        formData.append("uploadId", uploadId);
        formData.append("userId", userId);

        // Connect socket room
        if (socket) {
            socket.emit('join_upload', uploadId);

            socket.on('processing_update', (payload) => {
                if (payload && typeof payload === 'object') {
                    const percent = Math.min(100, Math.round((payload.processed / payload.total) * 100));
                    progressBar.style.width = percent + '%';
                    progressText.textContent = `🧠 Local Ollama AI evaluating candidate ${payload.processed} of ${payload.total} (${payload.current || ''})...`;
                }
            });

            socket.on('ranking_complete', (payload) => {
                try {
                    if (payload && Array.isArray(payload.candidates)) {
                        renderCandidates(payload.candidates);
                        showToast(`✅ Evaluated & ranked ${payload.candidates.length} candidate(s)!`, 'success');
                        uploadStatus.textContent = `🧠 Ollama AI evaluation complete – ${payload.candidates.length} processed`;
                        progressBar.style.width = '100%';
                        progressText.textContent = '✅ All candidates ranked!';
                        setTimeout(() => {
                            uploadProgress.classList.remove('active');
                            progressText.style.display = 'none';
                            progressBar.style.width = '0%';
                        }, 2200);
                    }
                } catch (e) { console.error(e); }
            });
        }

        // Send API upload request
        fetch("/api/upload?apiKey=rankly-secret-key", {
            method: "POST",
            body: formData,
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                progressBar.style.width = '45%';
                progressText.textContent = '📄 Parsing text & executing local Ollama inference...';
            } else {
                showToast("❌ " + (data.error || "Upload failed"), "error");
                uploadProgress.classList.remove('active');
                progressText.style.display = 'none';
            }
        })
        .catch(error => {
            console.error("Upload error:", error);
            showToast("❌ Upload failed. Please check connection.", "error");
            uploadProgress.classList.remove('active');
            progressText.style.display = 'none';
        });
    }

    // Attach drag & drop / file picker events
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', function(e) {
            if (e.target.closest('#fileInput')) return;
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            handleFiles(this.files);
            this.value = '';
        });

        uploadZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drop-zone-highlight');
            uploadText.textContent = 'Release to upload';
        });

        uploadZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('drop-zone-highlight');
            uploadText.textContent = 'Drag & drop PDF, DOCX, DOC, TXT';
        });

        uploadZone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drop-zone-highlight');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFiles(files);
            }
        });
    }
});
