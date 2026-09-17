

        /* ═══════════════════════════════════════════════════════════════════════
           LOGO.DEV API INTEGRATION ENGINE – LIVE COMPANY LOGOS AUTO-FETCH
           ═══════════════════════════════════════════════════════════════════════ */
        window.LOGO_DEV_TOKEN = 'pk_EJiYI6zfSfSYg_x25fXJSg';

        window.getCompanyLogoUrl = function(identifier, options = {}) {
            if (!identifier) return '';
            const token = window.LOGO_DEV_TOKEN;
            const format = options.format || 'png';
            const size = options.size || 128;
            const theme = options.theme || (document.body.classList.contains('dark-theme') ? 'dark' : 'light');
            const retina = options.retina !== false ? '&retina=true' : '';
            const fallback = options.fallback || 'monogram';

            const cleanId = identifier.trim().toLowerCase();
            const path = cleanId.includes('.') ? encodeURIComponent(cleanId) : `name/${encodeURIComponent(cleanId)}`;
            return `https://img.logo.dev/${path}?token=${token}&size=${size}&format=${format}&theme=${theme}&fallback=${fallback}${retina}`;
        };

        // Attach live logo preview to Organization & Company inputs
        document.addEventListener('DOMContentLoaded', () => {
            const orgInput = document.getElementById('orgNameInput');
            if (orgInput) {
                orgInput.addEventListener('input', (e) => {
                    const val = e.target.value.trim();
                    let preview = document.getElementById('orgLogoPreview');
                    if (!preview && val.length > 1) {
                        preview = document.createElement('img');
                        preview.id = 'orgLogoPreview';
                        preview.className = 'w-6 h-6 rounded-md object-contain border border-gray-200 dark:border-gray-700 bg-white p-0.5 ml-2 shadow-sm inline-block align-middle';
                        orgInput.parentNode.appendChild(preview);
                    }
                    if (preview) {
                        if (val.length > 1) {
                            preview.src = window.getCompanyLogoUrl(val, { size: 64 });
                            preview.style.display = 'inline-block';
                        } else {
                            preview.style.display = 'none';
                        }
                    }
                });
            }
        });

        // ─── INTERNAL HRMS WORKFORCE & EMPLOYEE DIRECTORY CONTROLLER ───
        let hrmsEmployeesList = [];

        async function loadEmployeesDirectory() {
            const tbody = document.getElementById('employeesTableBody');
            const emptyEl = document.getElementById('employeesEmptyState');
            if (!tbody) return;

            tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-gray-400 font-mono"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading workforce roster...</td></tr>';

            try {
                const res = await fetch('/api/employees', { credentials: 'include' });
                if (res.status === 403 || res.status === 401) {
                    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-red-500 font-bold">🔒 Access Restricted: Internal HRMS authorization required.</td></tr>';
                    return;
                }
                const data = await res.json();
                if (data && data.success && Array.isArray(data.data)) {
                    hrmsEmployeesList = data.data;
                    renderEmployeesTable(hrmsEmployeesList);
                    updateEmployeeMetrics(hrmsEmployeesList);
                } else {
                    hrmsEmployeesList = [];
                    renderEmployeesTable([]);
                    updateEmployeeMetrics([]);
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
                tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-red-500 font-mono">Failed to load employee records: ' + err.message + '</td></tr>';
            }
        }
        window.loadEmployeesDirectory = loadEmployeesDirectory;

        function updateEmployeeMetrics(list) {
            const totalEl = document.getElementById('empStatTotal');
            const activeEl = document.getElementById('empStatActive');
            const probationEl = document.getElementById('empStatProbation');
            const deptsEl = document.getElementById('empStatDepts');

            if (totalEl) totalEl.textContent = list.length;
            if (activeEl) activeEl.textContent = list.filter(e => (e.employment_details?.status || 'active').toLowerCase() === 'active').length;
            if (probationEl) probationEl.textContent = list.filter(e => {
                const st = (e.employment_details?.status || '').toLowerCase();
                return st === 'probation' || st === 'on_leave';
            }).length;
            
            const uniqueDepts = new Set(list.map(e => e.employment_details?.department).filter(Boolean));
            if (deptsEl) deptsEl.textContent = uniqueDepts.size || 0;
        }

        function renderEmployeesTable(list) {
            const tbody = document.getElementById('employeesTableBody');
            const emptyEl = document.getElementById('employeesEmptyState');
            if (!tbody) return;

            if (!list || list.length === 0) {
                tbody.innerHTML = '';
                if (emptyEl) emptyEl.classList.remove('hidden');
                return;
            }

            if (emptyEl) emptyEl.classList.add('hidden');

            tbody.innerHTML = list.map(emp => {
                const empId = emp.employee_id || emp.id || 'N/A';
                const name = emp.full_name || 'Staff Member';
                const email = emp.email || emp.contact_details?.work_email || '—';
                const dept = emp.employment_details?.department || 'General';
                const designation = emp.employment_details?.designation || 'Specialist';
                const type = (emp.employment_details?.employment_type || 'full_time').replace('_', ' ');
                const status = (emp.employment_details?.status || 'active').toLowerCase();

                let statusClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                if (status === 'probation') statusClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60';
                if (status === 'on_leave') statusClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/60';
                if (status === 'terminated') statusClass = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/60';

                const initial = (name[0] || 'E').toUpperCase();

                return '<tr class="hover:bg-[#FAFAF8] dark:hover:bg-zinc-800/40 transition-colors">' +
                    '<td class="py-3 px-4 flex items-center gap-2.5">' +
                        '<div class="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold flex items-center justify-center text-xs flex-shrink-0">' +
                            initial +
                        '</div>' +
                        '<div class="overflow-hidden">' +
                            '<p class="font-bold text-xs text-[#111111] dark:text-white truncate">' + name + '</p>' +
                            '<p class="text-[11px] text-gray-500 dark:text-zinc-400 truncate">' + email + '</p>' +
                        '</div>' +
                    '</td>' +
                    '<td class="py-3 px-4 font-mono text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">' + empId + '</td>' +
                    '<td class="py-3 px-4">' +
                        '<span class="font-medium text-xs text-zinc-800 dark:text-zinc-200">' + dept + '</span>' +
                        '<span class="text-[10px] text-gray-400 block">' + designation + '</span>' +
                    '</td>' +
                    '<td class="py-3 px-4 capitalize text-zinc-600 dark:text-zinc-400 text-xs">' + type + '</td>' +
                    '<td class="py-3 px-4">' +
                        '<span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ' + statusClass + '">' + status + '</span>' +
                    '</td>' +
                    '<td class="py-3 px-4 text-right">' +
                        '<div class="inline-flex items-center gap-1.5">' +
                            '<button onclick="deleteEmployeeRecord(\'' + empId + '\')" class="text-red-500 hover:text-red-700 dark:text-red-400 p-1" title="Delete record">' +
                                '<i class="fa-solid fa-trash-can text-xs"></i>' +
                            '</button>' +
                        '</div>' +
                    '</td>' +
                '</tr>';
            }).join('');
        }

        window.filterEmployeesTable = function() {
            const search = (document.getElementById('searchEmployeeInput')?.value || '').toLowerCase().trim();
            const dept = document.getElementById('filterEmployeeDept')?.value || 'all';
            const status = document.getElementById('filterEmployeeStatus')?.value || 'all';

            const filtered = hrmsEmployeesList.filter(emp => {
                const name = (emp.full_name || '').toLowerCase();
                const id = (emp.employee_id || emp.id || '').toLowerCase();
                const email = (emp.email || emp.contact_details?.work_email || '').toLowerCase();
                const empDept = (emp.employment_details?.department || '').toLowerCase();
                const empStatus = (emp.employment_details?.status || 'active').toLowerCase();

                const matchesSearch = !search || name.includes(search) || id.includes(search) || email.includes(search);
                const matchesDept = dept === 'all' || empDept.toLowerCase() === dept.toLowerCase();
                const matchesStatus = status === 'all' || empStatus === status.toLowerCase();

                return matchesSearch && matchesDept && matchesStatus;
            });

            renderEmployeesTable(filtered);
        };

        window.saveEmployeeRecord = async function(e) {
            if (e) e.preventDefault();
            const code = document.getElementById('newEmpCode')?.value?.trim();
            const name = document.getElementById('newEmpFullName')?.value?.trim();
            const email = document.getElementById('newEmpWorkEmail')?.value?.trim();
            const phone = document.getElementById('newEmpPhone')?.value?.trim();
            const dept = document.getElementById('newEmpDepartment')?.value;
            const desig = document.getElementById('newEmpDesignation')?.value?.trim();
            const type = document.getElementById('newEmpType')?.value || 'full_time';
            const status = document.getElementById('newEmpStatus')?.value || 'active';

            if (!code || !name || !email) {
                showToast('Please enter Employee Code, Full Name, and Work Email.', 'error');
                return;
            }

            const btn = document.getElementById('saveEmployeeBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
            }

            try {
                const payload = {
                    employee_id: code,
                    full_name: name,
                    email: email,
                    phone: phone || undefined,
                    employment_details: {
                        department: dept,
                        designation: desig,
                        employment_type: type,
                        status: status,
                        date_of_joining: new Date().toISOString().split('T')[0]
                    }
                };

                const res = await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    showToast(data.error || data.message || 'Failed to save employee record.', 'error');
                    return;
                }

                showToast('Employee ' + code + ' recorded successfully.', 'success');
                closeModal('addEmployeeModal');
                document.getElementById('addEmployeeForm')?.reset();
                loadEmployeesDirectory();
            } catch (err) {
                showToast('Save failed: ' + err.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Save Employee';
                }
            }
        };

        // Prompt 04 Optimization: Optimistic UI update with graceful rollback
        window.deleteEmployeeRecord = async function(id) {
            if (!confirm('Are you sure you want to delete employee ' + id + ' from the roster?')) return;

            // 1. Snapshot state for potential rollback
            const backupRoster = [...hrmsEmployeesList];

            // 2. Optimistically update local data & UI immediately (0ms reaction)
            hrmsEmployeesList = hrmsEmployeesList.filter(e => (e.employee_id || e.id) !== id);
            renderEmployeesRoster(hrmsEmployeesList);
            showToast('Employee removed from directory.', 'info');

            // 3. Reconcile with server in the background
            try {
                const res = await fetch('/api/employees/' + encodeURIComponent(id), {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    // Roll back state on server failure
                    hrmsEmployeesList = backupRoster;
                    renderEmployeesRoster(hrmsEmployeesList);
                    showToast('Failed to delete on server: ' + (data.error || data.message || 'Error') + '. Record restored.', 'error');
                    return;
                }
                showToast('Employee record permanently deleted.', 'success');
            } catch (err) {
                // Roll back state on network error
                hrmsEmployeesList = backupRoster;
                renderEmployeesRoster(hrmsEmployeesList);
                showToast('Network error: ' + err.message + '. Record restored.', 'error');
            }
        };

        // ─── INTERNAL HRMS COMPANY DOCUMENTS & POLICIES CONTROLLER ───
        let hrmsDocumentsList = [];
        let activeDocCategory = 'all';

        async function loadCompanyDocuments(category) {
            if (category) activeDocCategory = category;
            const grid = document.getElementById('documentsGrid');
            const emptyEl = document.getElementById('documentsEmptyState');
            if (!grid) return;

            grid.innerHTML = '<div class="col-span-full p-8 text-center text-xs text-gray-400 font-mono"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading company documents...</div>';

            try {
                const catParam = activeDocCategory !== 'all' ? '?category=' + encodeURIComponent(activeDocCategory) : '';
                const res = await fetch('/api/documents' + catParam, { credentials: 'include' });
                if (res.status === 403 || res.status === 401) {
                    grid.innerHTML = '<div class="col-span-full p-8 text-center text-xs text-red-500 font-bold">🔒 Access Restricted: Internal HRMS authorization required to view company policies.</div>';
                    return;
                }

                const data = await res.json();
                if (data && data.success && Array.isArray(data.data)) {
                    hrmsDocumentsList = data.data;
                    renderDocumentsGrid(hrmsDocumentsList);
                    updateDocumentMetrics(hrmsDocumentsList);
                } else {
                    hrmsDocumentsList = [];
                    renderDocumentsGrid([]);
                    updateDocumentMetrics([]);
                }
            } catch (err) {
                console.error('Error fetching documents:', err);
                grid.innerHTML = '<div class="col-span-full p-8 text-center text-xs text-red-500 font-mono">Failed to load company documents: ' + err.message + '</div>';
            }
        }
        window.loadCompanyDocuments = loadCompanyDocuments;

        function updateDocumentMetrics(list) {
            const totalEl = document.getElementById('docStatTotal');
            const policiesEl = document.getElementById('docStatPolicies');
            const ndasEl = document.getElementById('docStatNdas');
            const complianceEl = document.getElementById('docStatCompliance');

            if (totalEl) totalEl.textContent = list.length;
            if (policiesEl) policiesEl.textContent = list.filter(d => ['policy', 'handbook'].includes((d.category || '').toLowerCase())).length;
            if (ndasEl) ndasEl.textContent = list.filter(d => ['nda', 'contract'].includes((d.category || '').toLowerCase())).length;
            if (complianceEl) complianceEl.textContent = list.filter(d => ['compliance'].includes((d.category || '').toLowerCase())).length;
        }

        window.setDocCategoryFilter = function(category) {
            activeDocCategory = category;
            document.querySelectorAll('#docCategoryTabs .doc-cat-pill').forEach(pill => {
                if (pill.dataset.cat === category) {
                    pill.classList.add('active');
                } else {
                    pill.classList.remove('active');
                }
            });
            loadCompanyDocuments(category);
        };

        function renderDocumentsGrid(list) {
            const grid = document.getElementById('documentsGrid');
            const emptyEl = document.getElementById('documentsEmptyState');
            if (!grid) return;

            if (!list || list.length === 0) {
                grid.innerHTML = '';
                if (emptyEl) emptyEl.classList.remove('hidden');
                return;
            }

            if (emptyEl) emptyEl.classList.add('hidden');

            grid.innerHTML = list.map(doc => {
                const cat = (doc.category || 'policy').toLowerCase();
                let catIcon = 'fa-solid fa-scale-balanced text-amber-500';
                let catBadgeClass = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60';
                if (cat === 'handbook') {
                    catIcon = 'fa-solid fa-book-bookmark text-blue-500';
                    catBadgeClass = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60';
                } else if (cat === 'nda') {
                    catIcon = 'fa-solid fa-file-signature text-purple-500';
                    catBadgeClass = 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60';
                } else if (cat === 'compliance') {
                    catIcon = 'fa-solid fa-shield-halved text-emerald-500';
                    catBadgeClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                }

                const dateStr = doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : '2026-09-04';
                const author = doc.uploadedBy ? (doc.uploadedBy.name || doc.uploadedBy.email || 'HR Dept') : 'HR Dept';
                const size = doc.fileSize || '380 KB';

                return '<div class="card p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all border border-[#E5E5DF] dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-xs group">' +
                    '<div>' +
                        '<div class="flex justify-between items-start mb-3">' +
                            '<div class="w-9 h-9 rounded-xl bg-[#FAFAF8] dark:bg-zinc-800 flex items-center justify-center border border-[#E5E5DF] dark:border-zinc-700/60 shadow-2xs">' +
                                '<i class="' + catIcon + ' text-sm"></i>' +
                            '</div>' +
                            '<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ' + catBadgeClass + '">' +
                                cat +
                            '</span>' +
                        '</div>' +
                        '<h4 class="font-bold text-sm text-[#111111] dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 mb-1.5">' +
                            doc.title +
                        '</h4>' +
                        '<p class="text-xs text-[#4B5563] dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed">' +
                            (doc.description || doc.content || 'Official internal documentation for employees and contractors.') +
                        '</p>' +
                    '</div>' +
                    '<div>' +
                        '<div class="flex items-center justify-between text-[11px] text-gray-400 pb-3 border-t border-[#E5E5DF] dark:border-zinc-800/60 pt-3">' +
                            '<span><i class="fa-regular fa-calendar mr-1"></i> ' + dateStr + '</span>' +
                            '<span><i class="fa-solid fa-file-pdf mr-1 text-red-400"></i> ' + size + '</span>' +
                        '</div>' +
                        '<div class="flex items-center justify-between gap-2 pt-1">' +
                            '<button onclick="readDocument(\'' + doc.id + '\')" class="btn-primary text-xs flex-1 py-2 text-center justify-center font-bold bg-[#183B33] hover:bg-[#122e28] text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">' +
                                '<i class="fa-regular fa-eye text-xs"></i> <span>View Document</span>' +
                            '</button>' +
                            '<button onclick="downloadDocPrompt(\'' + doc.title.replace(/'/g, "\\'") + '\', \'' + (doc.fileName || '') + '\')" class="btn-secondary text-xs px-3 py-2 rounded-xl" title="Download Document">' +
                                '<i class="fa-solid fa-download"></i>' +
                            '</button>' +
                            '<button onclick="deleteDocumentRecord(\'' + doc.id + '\')" class="text-red-500 hover:text-red-700 dark:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all" title="Remove Document">' +
                                '<i class="fa-solid fa-trash-can text-xs"></i>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        window.filterDocumentsGrid = function() {
            const q = (document.getElementById('searchDocInput')?.value || '').toLowerCase().trim();
            const filtered = hrmsDocumentsList.filter(doc => {
                const title = (doc.title || '').toLowerCase();
                const desc = (doc.description || '').toLowerCase();
                const content = (doc.content || '').toLowerCase();
                return !q || title.includes(q) || desc.includes(q) || content.includes(q);
            });
            renderDocumentsGrid(filtered);
        };

        window.publishCompanyDocument = async function(e) {
            if (e) e.preventDefault();
            const title = document.getElementById('docTitle')?.value?.trim();
            const category = document.getElementById('docCategory')?.value || 'policy';
            const fileName = document.getElementById('docFileName')?.value?.trim();
            const desc = document.getElementById('docDescription')?.value?.trim();
            const content = document.getElementById('docContent')?.value?.trim();

            if (!title) {
                showToast('Document Title is required.', 'error');
                return;
            }

            const btn = document.getElementById('publishDocBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Publishing...';
            }

            try {
                const payload = {
                    title,
                    category,
                    fileName: fileName || (title.replace(/\s+/g, '_') + '.pdf'),
                    description: desc || null,
                    content: content || null
                };

                const res = await fetch('/api/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    showToast(data.error || data.message || 'Failed to publish document.', 'error');
                    return;
                }

                // Ingest into Supabase internal_documents vault
                try {
                    await fetch('/api/documents/internal/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            title,
                            category,
                            fileName: payload.fileName,
                            content: content || desc || title
                        })
                    });
                } catch (supaIngestErr) {}

                showToast('Document published successfully.', 'success');
                closeModal('publishDocModal');
                document.getElementById('publishDocForm')?.reset();
                loadCompanyDocuments(activeDocCategory);
            } catch (err) {
                showToast('Publish failed: ' + err.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Publish Document';
                }
            }
        };

        window.readDocument = function(id) {
            const doc = hrmsDocumentsList.find(d => d.id === id);
            if (!doc) {
                showToast('Document details not found.', 'error');
                return;
            }

            const titleEl = document.getElementById('readDocTitle');
            const badgeEl = document.getElementById('readDocBadge');
            const dateEl = document.getElementById('readDocDate');
            const descEl = document.getElementById('readDocDescription');
            const contentEl = document.getElementById('readDocContent');
            const authorEl = document.getElementById('readDocAuthor');

            if (titleEl) titleEl.textContent = doc.title;
            if (badgeEl) badgeEl.textContent = (doc.category || 'policy').toUpperCase();
            if (dateEl) dateEl.textContent = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '2026-09-04';
            if (descEl) descEl.textContent = doc.description || 'Corporate HRMS standard reference document.';
            if (contentEl) contentEl.textContent = doc.content || 'Detailed policy clauses and specifications are archived in official corporate files.';
            if (authorEl) authorEl.textContent = 'Uploaded by: ' + (doc.uploadedBy?.name || doc.uploadedBy?.email || 'HR Administration') + ' (' + (doc.fileName || 'PDF Document') + ')';

            openModal('readDocModal');
        };

        // Prompt 04 Optimization: Optimistic UI update with graceful rollback
        window.deleteDocumentRecord = async function(id) {
            if (!confirm('Are you sure you want to permanently delete this company document?')) return;

            // 1. Snapshot state for potential rollback
            const backupDocs = [...hrmsDocumentsList];

            // 2. Optimistically update local data & UI immediately (0ms reaction)
            hrmsDocumentsList = hrmsDocumentsList.filter(d => d.id !== id);
            renderCompanyDocuments(hrmsDocumentsList);
            showToast('Document removed from directory.', 'info');

            // 3. Reconcile with server in the background
            try {
                const res = await fetch('/api/documents/' + encodeURIComponent(id), {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    // Roll back state on server failure
                    hrmsDocumentsList = backupDocs;
                    renderCompanyDocuments(hrmsDocumentsList);
                    showToast('Server error: ' + (data.error || data.message || 'Error') + '. Document restored.', 'error');
                    return;
                }
                showToast('Document permanently deleted.', 'success');
            } catch (err) {
                // Roll back state on network error
                hrmsDocumentsList = backupDocs;
                renderCompanyDocuments(hrmsDocumentsList);
                showToast('Network error: ' + err.message + '. Document restored.', 'error');
            }
        };

        window.downloadDocPrompt = function(title, fileName) {
            showToast('Downloading ' + (fileName || title) + '...', 'success');
        };

        window.printDocumentText = function() {
            const title = document.getElementById('readDocTitle')?.textContent || 'Company Document';
            const text = document.getElementById('readDocContent')?.textContent || '';
            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write('<html><head><title>' + title + '</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;}h1{border-bottom:2px solid #333;padding-bottom:10px;}</style></head><body><h1>' + title + '</h1><pre style="white-space:pre-wrap;font-family:inherit;">' + text + '</pre></body></html>');
                printWin.document.close();
                printWin.focus();
                printWin.print();
            }
        };

        /* ─── DYNAMIC PAGE TITLE MANAGER & FAQ TOGGLE SCRIPT (PRD SEO COMPLIANCE) ─── */
        window.toggleFaqItem = function(btn) {
            const body = btn.nextElementSibling;
            const icon = btn.querySelector('i');
            const isHidden = body.classList.contains('hidden');
            document.querySelectorAll('#seoFaqAccordion > div > div').forEach(d => d.classList.add('hidden'));
            document.querySelectorAll('#seoFaqAccordion i').forEach(i => i.style.transform = 'rotate(0deg)');
            if (isHidden) {
                body.classList.remove('hidden');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        };

        const originalSwitchTab = window.switchTab;
        window.switchTab = function(tabId) {
            if (typeof originalSwitchTab === 'function') {
                originalSwitchTab(tabId);
            }
            const tabTitles = {
                'dashboard': 'Dashboard — Rankly.ai',
                'hr-ai-intelligence': 'AI Talent Intelligence — Rankly.ai',
                'analytics': 'Recruitment Analytics — Rankly.ai',
                'health': 'System Telemetry & Health — Rankly.ai',
                'employees': 'Employee Directory — Rankly.ai',
                'screening': 'Candidate Screening — Rankly.ai',
                'attendance': 'Attendance & Leaves — Rankly.ai',
                'documents': 'Company Documents — Rankly.ai',
                'settings': 'Enterprise Settings — Rankly.ai',
                'ats-checker': 'ATS Resume Checker — Rankly.ai'
            };
            if (tabTitles[tabId]) {
                document.title = tabTitles[tabId];
            }
        };


        // ─────────────────────────────────────────────────────────────
        // ─── RANKLY EXECUTIVE CALENDAR & MODERN DATEPICKER ENGINE ───
        // ─────────────────────────────────────────────────────────────
        let ranklyCalCurrentDate = new Date();
        let ranklyCalSelectedDate = null;
        let ranklyCalTargetInput = null;

        const ranklyMonthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        window.initRanklyCalendar = function() {
            const popover = document.getElementById('ranklyExecutiveDatePicker');
            if (!popover) return;

            // Populate Months dropdown
            const monthSelect = document.getElementById('ranklyCalMonthSelect');
            if (monthSelect && monthSelect.options.length === 0) {
                ranklyMonthNames.forEach((name, idx) => {
                    const opt = document.createElement('option');
                    opt.value = idx;
                    opt.textContent = name;
                    monthSelect.appendChild(opt);
                });
            }

            // Populate Years dropdown (1950 to current year + 2)
            const yearSelect = document.getElementById('ranklyCalYearSelect');
            if (yearSelect && yearSelect.options.length === 0) {
                const curYear = new Date().getFullYear();
                for (let y = curYear + 2; y >= 1950; y--) {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    yearSelect.appendChild(opt);
                }
            }

            // Bind handlers to date inputs across registration & portals
            const selector = 'input[type="date"], #orgDob, #slideRegDob, #signupDob, #empDob, #scheduleDateInput';
            const bindInputs = () => {
                document.querySelectorAll(selector).forEach(input => {
                    if (input.dataset.ranklyCalBound) return;
                    input.dataset.ranklyCalBound = 'true';
                    input.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.openRanklyCalendar(input);
                    });
                    input.addEventListener('focus', () => {
                        window.openRanklyCalendar(input);
                    });
                });
            };

            bindInputs();
            // Rebind dynamically if views switch
            document.addEventListener('click', () => setTimeout(bindInputs, 200));

            // Close on outside click
            document.addEventListener('click', (e) => {
                const cal = document.getElementById('ranklyExecutiveDatePicker');
                if (!cal || cal.classList.contains('hidden')) return;
                if (!cal.contains(e.target) && ranklyCalTargetInput !== e.target && !ranklyCalTargetInput?.contains(e.target)) {
                    window.closeRanklyCalendar();
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    window.closeRanklyCalendar();
                }
            });
        };

        window.openRanklyCalendar = function(inputEl) {
            const popover = document.getElementById('ranklyExecutiveDatePicker');
            if (!popover || !inputEl) return;
            ranklyCalTargetInput = inputEl;

            // Position popover relative to input
            const rect = inputEl.getBoundingClientRect();
            const popWidth = 320;
            const popHeight = 360;

            let top = rect.bottom + window.scrollY + 6;
            let left = rect.left + window.scrollX;

            // Flip above if not enough vertical space below
            if (rect.bottom + popHeight > window.innerHeight && rect.top > popHeight) {
                top = rect.top + window.scrollY - popHeight - 6;
            }
            // Constrain horizontally within viewport
            if (left + popWidth > window.innerWidth) {
                left = window.innerWidth - popWidth - 16;
            }
            if (left < 10) left = 10;

            popover.style.top = `${top}px`;
            popover.style.left = `${left}px`;
            popover.classList.remove('hidden');

            // Parse initial date from input or default smartly
            if (inputEl.value) {
                const parsed = new Date(inputEl.value);
                if (!isNaN(parsed.getTime())) {
                    ranklyCalSelectedDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
                    ranklyCalCurrentDate = new Date(ranklyCalSelectedDate);
                }
            } else {
                // If this is a DOB input, default year to 22 years ago for instant convenience
                const isDob = inputEl.id && inputEl.id.toLowerCase().includes('dob');
                const defaultYear = isDob ? (new Date().getFullYear() - 22) : new Date().getFullYear();
                ranklyCalSelectedDate = new Date(defaultYear, 0, 15);
                ranklyCalCurrentDate = new Date(defaultYear, 0, 1);
            }

            window.renderRanklyCalendarGrid();
        };

        window.closeRanklyCalendar = function() {
            const popover = document.getElementById('ranklyExecutiveDatePicker');
            if (popover) {
                popover.classList.add('hidden');
            }
        };

        window.renderRanklyCalendarGrid = function() {
            const monthSelect = document.getElementById('ranklyCalMonthSelect');
            const yearSelect = document.getElementById('ranklyCalYearSelect');
            const daysGrid = document.getElementById('ranklyCalDaysGrid');
            const ageBadgeText = document.getElementById('ranklyCalAgeText');

            const year = ranklyCalCurrentDate.getFullYear();
            const month = ranklyCalCurrentDate.getMonth();

            if (monthSelect) monthSelect.value = month;
            if (yearSelect) yearSelect.value = year;

            if (!daysGrid) return;
            daysGrid.innerHTML = '';

            const firstDayIndex = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();

            // Render empty padding cells
            for (let i = 0; i < firstDayIndex; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'rankly-cal-day-cell empty';
                daysGrid.appendChild(emptyCell);
            }

            // Render day cells
            for (let d = 1; d <= daysInMonth; d++) {
                const cell = document.createElement('div');
                cell.className = 'rankly-cal-day-cell';
                cell.textContent = d;

                const thisDate = new Date(year, month, d);
                const isToday = thisDate.toDateString() === today.toDateString();
                const isSelected = ranklyCalSelectedDate && thisDate.toDateString() === ranklyCalSelectedDate.toDateString();

                if (isToday) cell.classList.add('today');
                if (isSelected) cell.classList.add('selected');

                cell.onclick = (e) => {
                    e.stopPropagation();
                    ranklyCalSelectedDate = new Date(year, month, d);
                    window.renderRanklyCalendarGrid();
                    window.ranklyCalendarApply();
                };

                daysGrid.appendChild(cell);
            }

            // Update live age indicator badge
            if (ranklyCalSelectedDate && ageBadgeText) {
                let age = today.getFullYear() - ranklyCalSelectedDate.getFullYear();
                const m = today.getMonth() - ranklyCalSelectedDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < ranklyCalSelectedDate.getDate())) {
                    age--;
                }
                const formatted = ranklyCalSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                if (age >= 18) {
                    ageBadgeText.innerHTML = `<strong>${formatted}</strong> • <span class="text-emerald-600 dark:text-emerald-400 font-bold">${age} yrs (Eligible 18+)</span>`;
                } else if (age >= 15) {
                    ageBadgeText.innerHTML = `<strong>${formatted}</strong> • <span class="text-indigo-600 dark:text-indigo-400 font-bold">${age} yrs (Candidate 15+)</span>`;
                } else {
                    ageBadgeText.innerHTML = `<strong>${formatted}</strong> • <span class="text-amber-600 font-bold">${age} yrs old</span>`;
                }
            } else if (ageBadgeText) {
                ageBadgeText.textContent = 'Pick Date of Birth';
            }
        };

        window.ranklyCalendarPrevMonth = function() {
            ranklyCalCurrentDate.setMonth(ranklyCalCurrentDate.getMonth() - 1);
            window.renderRanklyCalendarGrid();
        };

        window.ranklyCalendarNextMonth = function() {
            ranklyCalCurrentDate.setMonth(ranklyCalCurrentDate.getMonth() + 1);
            window.renderRanklyCalendarGrid();
        };

        window.ranklyCalendarOnSelectChange = function() {
            const m = parseInt(document.getElementById('ranklyCalMonthSelect').value, 10);
            const y = parseInt(document.getElementById('ranklyCalYearSelect').value, 10);
            ranklyCalCurrentDate = new Date(y, m, 1);
            window.renderRanklyCalendarGrid();
        };

        window.ranklyCalendarSelectPreset = function(yearsAgo) {
            const now = new Date();
            const targetYear = now.getFullYear() - yearsAgo;
            ranklyCalSelectedDate = new Date(targetYear, now.getMonth(), now.getDate());
            ranklyCalCurrentDate = new Date(targetYear, now.getMonth(), 1);
            window.renderRanklyCalendarGrid();
            window.ranklyCalendarApply();
        };

        window.ranklyCalendarSetToday = function() {
            const now = new Date();
            ranklyCalSelectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            ranklyCalCurrentDate = new Date(now.getFullYear(), now.getMonth(), 1);
            window.renderRanklyCalendarGrid();
            window.ranklyCalendarApply();
        };

        window.ranklyCalendarApply = function() {
            if (!ranklyCalTargetInput || !ranklyCalSelectedDate) return;
            const y = ranklyCalSelectedDate.getFullYear();
            const m = String(ranklyCalSelectedDate.getMonth() + 1).padStart(2, '0');
            const d = String(ranklyCalSelectedDate.getDate()).padStart(2, '0');
            const dateVal = `${y}-${m}-${d}`;

            ranklyCalTargetInput.value = dateVal;

            // Trigger change & input events so any age calculation functions trigger
            ranklyCalTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
            ranklyCalTargetInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Explicitly call candidate / org age helpers
            if (ranklyCalTargetInput.id === 'orgDob' && typeof window.calculateOrgAge === 'function') {
                window.calculateOrgAge(dateVal);
            }
            if (ranklyCalTargetInput.id === 'slideRegDob' && typeof window.calculateCandidateAge === 'function') {
                window.calculateCandidateAge(dateVal);
            }

            window.closeRanklyCalendar();
        };

        // ─────────────────────────────────────────────────────────────
        // ─── EXECUTIVE INTERVIEW SCHEDULING CALENDAR CONTROLLER ───
        // ─────────────────────────────────────────────────────────────
        let activeSchedulingCandidateId = null;

        window.openInterviewScheduleModal = function(candId = null, candName = null) {
            activeSchedulingCandidateId = candId;
            const modal = document.getElementById('interviewCalendarModal');
            if (!modal) return;

            const nameEl = document.getElementById('scheduleCandName');
            if (candName && nameEl) {
                nameEl.textContent = candName;
            } else if (!candId) {
                const interviewCand = (window.pipeline || []).find(c => c.stage === 'interview') || (window.pipeline || [])[0];
                if (interviewCand && nameEl) {
                    nameEl.textContent = interviewCand.name;
                    activeSchedulingCandidateId = interviewCand.id;
                } else if (nameEl) {
                    nameEl.textContent = 'Selected Candidate';
                }
            }

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const y = tomorrow.getFullYear();
            const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const d = String(tomorrow.getDate()).padStart(2, '0');
            const dateInput = document.getElementById('scheduleDateInput');
            if (dateInput) dateInput.value = `${y}-${m}-${d}`;

            modal.style.display = 'flex';
        };

        window.confirmInterviewSchedule = function() {
            const date = document.getElementById('scheduleDateInput')?.value;
            const time = document.getElementById('scheduleTimeSelect')?.value || '02:00 PM';
            const platform = document.getElementById('schedulePlatformSelect')?.value || 'Google Meet';
            const round = document.getElementById('scheduleRoundSelect')?.value || 'Technical Round';

            if (!date) {
                showToast('Please select an interview date', 'error');
                return;
            }

            if (activeSchedulingCandidateId && window.pipeline) {
                const cand = window.pipeline.find(c => c.id === activeSchedulingCandidateId);
                if (cand) {
                    cand.stage = 'interview';
                    cand.scheduledDate = date;
                    cand.scheduledTime = time;
                    cand.scheduledPlatform = platform;
                    cand.scheduledRound = round;
                    if (window.setStoredData) window.setStoredData('rankly_pipeline', window.pipeline);
                    if (window.renderPipeline) window.renderPipeline();
                    if (window.renderAnalytics) window.renderAnalytics();
                }
            }

            closeModal('interviewCalendarModal');
            showToast(`Interview booked for ${date} at ${time} via ${platform}!`, 'success');
        };

        // Initialize Calendar when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => window.initRanklyCalendar());
        } else {
            window.initRanklyCalendar();
        }

        // Dual-Portal Path & Error Handler on Load
        (function checkDualPortalPath() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const portalError = urlParams.get('error');
                if (portalError) {
                    window.addEventListener('DOMContentLoaded', () => {
                        setTimeout(() => {
                            if (window.showToast) {
                                showToast(decodeURIComponent(portalError), 'error');
                            }
                        }, 400);
                    });
                }
            } catch (e) {
                console.warn('Dual portal URL check error:', e);
            }
        })();

        // Auto-detect Password Reset Link clicked from Gmail (?action=reset-password&token=...&email=...)
        (function checkPasswordResetUrl() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const action = urlParams.get('action');
                const resetToken = urlParams.get('token');
                const resetEmail = urlParams.get('email');

                if (action === 'reset-password' && resetToken) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                    window.addEventListener('DOMContentLoaded', () => {
                        setTimeout(() => {
                            const linkModal = document.getElementById('resetPasswordFromLinkModal');
                            const emailInput = document.getElementById('linkResetEmail');
                            const tokenInput = document.getElementById('linkResetToken');
                            if (emailInput && resetEmail) emailInput.value = decodeURIComponent(resetEmail);
                            if (tokenInput) tokenInput.value = resetToken;
                            if (linkModal) linkModal.classList.remove('hidden');
                            if (window.showToast) {
                                showToast('Reset link verified! Please enter your new password below.', 'success');
                            }
                        }, 250);
                    });
                }
            } catch (e) {
                console.warn('Reset URL check error:', e);
            }
        })();

        /* ─── CONFIDENTIAL GRIEVANCE BOX CLIENT LOGIC (REPORT DIRECTLY TO ADMIN) ─── */
        (function initGrievanceModule() {
            window._adminGrievancesData = [];
            window._activeGrievanceFilter = 'all';

            const gEscape = (str) => String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

            function formatDate(d) {
                if (!d) return '';
                try {
                    const date = new Date(d);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                    return String(d);
                }
            }

            window.loadGrievanceUI = function() {
                const user = window.currentUser || {};
                const userRole = (user.role || 'employee').toLowerCase();
                const isAdmin = ['admin', 'administrator'].includes(userRole);

                const toggleGroup = document.getElementById('grievanceRoleToggleBtnGroup');
                if (isAdmin) {
                    if (toggleGroup) toggleGroup.style.display = 'flex';
                    window.loadAdminGrievances();
                    // Default to admin view if not already on submit view
                    const adminView = document.getElementById('grievanceAdminView');
                    if (adminView && adminView.style.display !== 'block') {
                        window.switchGrievanceSubView('admin');
                    }
                } else {
                    if (toggleGroup) toggleGroup.style.display = 'none';
                    window.switchGrievanceSubView('submit');
                }
                window.loadMyGrievances();
            };

            window.switchGrievanceSubView = function(view) {
                const submitView = document.getElementById('grievanceSubmitView');
                const adminView = document.getElementById('grievanceAdminView');
                const btnSubmit = document.getElementById('btnGrievanceViewSubmit');
                const btnAdmin = document.getElementById('btnGrievanceViewAdmin');

                if (view === 'admin') {
                    if (submitView) submitView.style.display = 'none';
                    if (adminView) adminView.style.display = 'block';
                    if (btnAdmin) {
                        btnAdmin.className = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-[#183B33] bg-[#183B33] text-white';
                    }
                    if (btnSubmit) {
                        btnSubmit.className = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-[#E5E5DF] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#111111] dark:text-white';
                    }
                    window.loadAdminGrievances();
                } else {
                    if (adminView) adminView.style.display = 'none';
                    if (submitView) submitView.style.display = 'block';
                    if (btnSubmit) {
                        btnSubmit.className = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-[#183B33] bg-[#183B33] text-white';
                    }
                    if (btnAdmin) {
                        btnAdmin.className = 'px-3 py-1.5 text-xs font-bold rounded-xl border border-[#E5E5DF] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#111111] dark:text-white';
                    }
                    window.loadMyGrievances();
                }
            };

            window.handleGrievanceSubmit = async function(event) {
                if (event) event.preventDefault();
                const category = document.getElementById('grievanceCategory')?.value || 'HR Issue / Behavior';
                const priority = document.getElementById('grievancePriority')?.value || 'Normal';
                const subject = document.getElementById('grievanceSubject')?.value?.trim();
                const description = document.getElementById('grievanceDescription')?.value?.trim();
                const isAnonymous = !!document.getElementById('grievanceIsAnonymous')?.checked;
                const submitBtn = document.getElementById('grievanceSubmitBtn');

                if (!subject) {
                    if (window.showToast) showToast('Please enter a subject for your report.', 'warning');
                    return;
                }
                if (!description) {
                    if (window.showToast) showToast('Please describe your concern in detail.', 'warning');
                    return;
                }

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5 text-xs"></i> Submitting securely...';
                }

                try {
                    const res = await fetch('/api/grievances', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ category, priority, subject, description, isAnonymous })
                    });
                    const data = await res.json();

                    if (!res.ok || !data.success) {
                        if (window.showToast) showToast(data.message || data.error || 'Failed to submit complaint.', 'error');
                        return;
                    }

                    if (window.showToast) {
                        showToast(data.message || 'Complaint securely dispatched directly to Organization Admin.', 'success');
                    }

                    const form = document.getElementById('grievanceForm');
                    if (form) form.reset();

                    window.loadMyGrievances();

                    // If user is also admin, refresh admin view
                    const userRole = (window.currentUser?.role || '').toLowerCase();
                    if (['admin', 'administrator'].includes(userRole)) {
                        window.loadAdminGrievances();
                    }
                } catch (err) {
                    console.error('Grievance submission error:', err);
                    if (window.showToast) showToast('Network error during complaint submission.', 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane text-xs mr-1.5"></i> <span>Submit Complaint to Admin</span>';
                    }
                }
            };

            window.loadMyGrievances = async function() {
                const listEl = document.getElementById('myGrievancesList');
                if (!listEl) return;

                try {
                    const res = await fetch('/api/grievances/my', { credentials: 'include' });
                    const result = await res.json();

                    if (!res.ok || !result.success) {
                        listEl.innerHTML = `<div class="p-4 text-center text-xs text-red-500 font-medium">Failed to load complaints: ${gEscape(result.message || 'Error')}</div>`;
                        return;
                    }

                    const items = result.data || [];
                    if (items.length === 0) {
                        listEl.innerHTML = `
                            <div class="text-center py-8 px-4 rounded-xl border border-dashed border-[#E5E5DF] dark:border-gray-700">
                                <div class="w-10 h-10 mx-auto mb-2.5 rounded-full bg-[#FAFAF8] dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                    <i class="fa-solid fa-shield-check text-lg"></i>
                                </div>
                                <p class="text-xs font-semibold text-[#111111] dark:text-white">No complaints on record</p>
                                <p class="text-[11px] text-[#4B5563] dark:text-gray-400 mt-0.5">Your submitted reports and confidential status updates will appear here.</p>
                            </div>
                        `;
                        return;
                    }

                    listEl.innerHTML = items.map(item => {
                        let statusBadge = '';
                        switch (item.status) {
                            case 'Resolved':
                                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"><i class="fa-solid fa-circle-check text-[9px] mr-1"></i>Resolved</span>';
                                break;
                            case 'Under Review':
                                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700"><i class="fa-solid fa-clock text-[9px] mr-1"></i>Under Review</span>';
                                break;
                            case 'Dismissed':
                                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Dismissed</span>';
                                break;
                            default:
                                statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700"><i class="fa-solid fa-hourglass-half text-[9px] mr-1"></i>Pending Review</span>';
                        }

                        let priorityBadge = '';
                        if (item.priority === 'Critical') {
                            priorityBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200"><i class="fa-solid fa-triangle-exclamation text-[9px] mr-1"></i>Critical</span>';
                        } else if (item.priority === 'Urgent') {
                            priorityBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200">Urgent</span>';
                        } else {
                            priorityBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Normal</span>';
                        }

                        const anonBadge = item.isAnonymous ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200"><i class="fa-solid fa-mask text-[9px] mr-1"></i>Anonymous</span>' : '';

                        let adminResponseBox = '';
                        if (item.adminNotes) {
                            adminResponseBox = `
                                <div class="mt-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                                    <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                                        <i class="fa-solid fa-reply text-[11px]"></i> Administrator Resolution Response:
                                        ${item.resolvedAt ? `<span class="font-normal text-[10px] text-emerald-600 dark:text-emerald-400">(${formatDate(item.resolvedAt)})</span>` : ''}
                                    </div>
                                    <div class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">${gEscape(item.adminNotes)}</div>
                                </div>
                            `;
                        }

                        return `
                            <div class="p-4 rounded-xl border border-[#E5E5DF] dark:border-gray-700 bg-[#FAFAF8] dark:bg-gray-900/60 hover:shadow-xs transition-all">
                                <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                                    <div>
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-xs font-black text-[#111111] dark:text-white">${gEscape(item.subject)}</span>
                                            ${statusBadge}
                                            ${priorityBadge}
                                            ${anonBadge}
                                        </div>
                                        <div class="text-[11px] text-[#4B5563] dark:text-gray-400 mt-1 flex items-center gap-2">
                                            <span class="font-medium text-[#183B33] dark:text-emerald-400">${gEscape(item.category)}</span>
                                            <span>•</span>
                                            <span>Submitted ${formatDate(item.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-xs text-[#444440] dark:text-gray-300 leading-relaxed whitespace-pre-wrap mt-2 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-[#E5E5DF] dark:border-gray-700">
                                    ${gEscape(item.description)}
                                </div>
                                ${adminResponseBox}
                            </div>
                        `;
                    }).join('');
                } catch (err) {
                    console.error('Load My Grievances Error:', err);
                    listEl.innerHTML = `<div class="p-4 text-center text-xs text-red-500 font-medium">Failed to retrieve grievance records.</div>`;
                }
            };

            window.loadAdminGrievances = async function() {
                const listEl = document.getElementById('adminGrievancesList');
                if (!listEl) return;

                try {
                    const res = await fetch('/api/grievances/admin', { credentials: 'include' });
                    const result = await res.json();

                    if (!res.ok || !result.success) {
                        listEl.innerHTML = `<div class="p-6 text-center text-xs text-red-500 font-medium">Failed to load admin inbox: ${gEscape(result.message || 'Access denied')}</div>`;
                        return;
                    }

                    const items = result.data || [];
                    window._adminGrievancesData = items;

                    // Update Metrics
                    const totalEl = document.getElementById('statGrievancesTotal');
                    const pendingEl = document.getElementById('statGrievancesPending');
                    const reviewEl = document.getElementById('statGrievancesReview');
                    const resolvedEl = document.getElementById('statGrievancesResolved');
                    const countBadge = document.getElementById('adminGrievanceCountBadge');

                    const totalCount = items.length;
                    const pendingCount = items.filter(i => i.status === 'Pending').length;
                    const reviewCount = items.filter(i => i.status === 'Under Review').length;
                    const resolvedCount = items.filter(i => i.status === 'Resolved').length;

                    if (totalEl) totalEl.textContent = totalCount;
                    if (pendingEl) pendingEl.textContent = pendingCount;
                    if (reviewEl) reviewEl.textContent = reviewCount;
                    if (resolvedEl) resolvedEl.textContent = resolvedCount;
                    if (countBadge) countBadge.textContent = totalCount;

                    window.renderAdminGrievancesList(window._adminGrievancesData);
                } catch (err) {
                    console.error('Load Admin Grievances Error:', err);
                    listEl.innerHTML = `<div class="p-6 text-center text-xs text-red-500 font-medium">Network error loading grievances inbox.</div>`;
                }
            };

            window.filterAdminGrievances = function(filter) {
                window._activeGrievanceFilter = filter;
                document.querySelectorAll('.admin-g-filter-btn').forEach(btn => {
                    if (btn.getAttribute('data-filter') === filter) {
                        btn.className = 'admin-g-filter-btn px-3 py-1.5 text-xs font-bold rounded-lg border bg-[#111111] text-white';
                    } else {
                        btn.className = 'admin-g-filter-btn px-3 py-1.5 text-xs font-bold rounded-lg border border-[#E5E5DF] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#4B5563] dark:text-gray-300';
                    }
                });

                let filtered = window._adminGrievancesData;
                if (filter !== 'all') {
                    filtered = window._adminGrievancesData.filter(i => i.status === filter);
                }
                window.renderAdminGrievancesList(filtered);
            };

            window.renderAdminGrievancesList = function(items) {
                const listEl = document.getElementById('adminGrievancesList');
                if (!listEl) return;

                if (!items || items.length === 0) {
                    listEl.innerHTML = `
                        <div class="card text-center py-12 px-4 rounded-2xl border border-dashed border-[#E5E5DF] dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <i class="fa-solid fa-inbox text-xl"></i>
                            </div>
                            <h4 class="text-sm font-bold text-[#111111] dark:text-white mb-1">No Grievances Found</h4>
                            <p class="text-xs text-[#4B5563] dark:text-gray-400">There are no reports matching the active filter.</p>
                        </div>
                    `;
                    return;
                }

                listEl.innerHTML = items.map(item => {
                    const submitterLabel = item.isAnonymous
                        ? '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800"><i class="fa-solid fa-mask text-[10px]"></i> Anonymous Whistleblower</span>'
                        : `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700"><i class="fa-solid fa-user text-[10px] text-gray-500"></i> ${gEscape(item.employeeName)} ${item.employeeEmail ? `<span class="text-gray-500 font-normal">(${gEscape(item.employeeEmail)})</span>` : ''}</span>`;

                    let priorityBadge = '';
                    if (item.priority === 'Critical') {
                        priorityBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-300"><i class="fa-solid fa-triangle-exclamation text-[9px] mr-1"></i>Critical Priority</span>';
                    } else if (item.priority === 'Urgent') {
                        priorityBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">Urgent</span>';
                    } else {
                        priorityBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200">Normal</span>';
                    }

                    return `
                        <div class="card p-5 md:p-6 rounded-2xl border border-[#E5E5DF] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm space-y-4">
                            <!-- Top Info Header -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E5E5DF] dark:border-gray-700">
                                <div>
                                    <div class="flex flex-wrap items-center gap-2">
                                        <h4 class="text-sm font-black text-[#111111] dark:text-white mb-0">${gEscape(item.subject)}</h4>
                                        ${priorityBadge}
                                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">${gEscape(item.category)}</span>
                                    </div>
                                    <div class="flex flex-wrap items-center gap-2.5 mt-1.5">
                                        ${submitterLabel}
                                        <span class="text-[11px] text-gray-400 font-mono">• Received ${formatDate(item.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Description Body -->
                            <div class="p-3.5 rounded-xl bg-[#FAFAF8] dark:bg-gray-900 border border-[#E5E5DF] dark:border-gray-700 text-xs text-[#222220] dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                ${gEscape(item.description)}
                            </div>

                            <!-- Admin Action & Resolution Bar -->
                            <div class="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-3">
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div class="flex items-center gap-2">
                                        <label class="text-xs font-bold text-amber-900 dark:text-amber-200">Update Status:</label>
                                        <select id="adminGrievanceStatus_${item.id}" class="form-input text-xs font-semibold py-1 px-2.5 rounded-lg border border-[#E5E5DF] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#111111] dark:text-white" aria-label="Admin Grievance Status ${item.id}">
                                            <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending Action</option>
                                            <option value="Under Review" ${item.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                                            <option value="Resolved" ${item.status === 'Resolved' ? 'selected' : ''}>Mark Resolved</option>
                                            <option value="Dismissed" ${item.status === 'Dismissed' ? 'selected' : ''}>Dismiss Concern</option>
                                        </select>
                                    </div>
                                    <button type="button" onclick="updateGrievanceResolution('${item.id}')" id="btnUpdateGrievance_${item.id}" class="btn-primary text-xs py-1.5 px-4 rounded-lg font-bold bg-[#111111] text-white hover:bg-black transition-all cursor-pointer shadow-xs">
                                        <i class="fa-solid fa-check text-[10px] mr-1"></i> Save Resolution
                                    </button>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-[#4B5563] dark:text-gray-400 mb-1">Confidential Resolution Note (Visible to Submitter):</label>
                                    <textarea id="adminGrievanceNotes_${item.id}" rows="2" class="w-full text-xs form-input p-2.5 rounded-lg border border-[#E5E5DF] dark:border-gray-700 bg-white dark:bg-gray-900 text-[#111111] dark:text-white" placeholder="Enter findings, decisions or resolution notes for the employee..." aria-label="Enter findings, decisions or resolution">${gEscape(item.adminNotes || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            };

            window.updateGrievanceResolution = async function(id) {
                const statusEl = document.getElementById('adminGrievanceStatus_' + id);
                const notesEl = document.getElementById('adminGrievanceNotes_' + id);
                const btn = document.getElementById('btnUpdateGrievance_' + id);

                const status = statusEl ? statusEl.value : 'Pending';
                const adminNotes = notesEl ? notesEl.value.trim() : '';

                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px] mr-1"></i> Saving...';
                }

                try {
                    const res = await fetch(`/api/grievances/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ status, adminNotes })
                    });
                    const result = await res.json();

                    if (!res.ok || !result.success) {
                        if (window.showToast) showToast(result.message || result.error || 'Failed to update grievance.', 'error');
                        return;
                    }

                    if (window.showToast) showToast('Grievance status updated successfully.', 'success');
                    window.loadAdminGrievances();
                } catch (err) {
                    console.error('Update Grievance Error:', err);
                    if (window.showToast) showToast('Network error updating grievance.', 'error');
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fa-solid fa-check text-[10px] mr-1"></i> Save Resolution';
                    }
                }
            };
        })();
    