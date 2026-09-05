/**
 * Rankly.ai Attendance, Shift Timers, Leave Governance & Data Export Controller
 */

(function() {
    let clockInterval = null;
    let timerInterval = null;
    let isCheckedIn = false;
    let checkInTimestamp = null;

    // Start Realtime Digital Clock
    function startClock() {
        if (clockInterval) clearInterval(clockInterval);
        function update() {
            const now = new Date();
            const clockEl = document.getElementById('liveDigitalClock');
            const dateEl = document.getElementById('liveAttendanceDate');
            if (clockEl) {
                clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
            }
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            }

            // If checked in, calculate work duration timer
            if (isCheckedIn && checkInTimestamp) {
                const elapsedMs = Math.max(0, now - checkInTimestamp);
                const hrs = Math.floor(elapsedMs / (1000 * 60 * 60));
                const mins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((elapsedMs % (1000 * 60)) / 1000);
                const timerEl = document.getElementById('punchTimerDisplay');
                if (timerEl) {
                    timerEl.textContent = `Today's Work Hours: ${hrs}h ${mins}m ${secs}s`;
                }
            }
        }
        update();
        clockInterval = setInterval(update, 1000);
    }

    window.loadAttendanceLeaveDashboard = async function() {
        startClock();
        await Promise.all([
            fetchTodayAttendance(),
            loadAttendanceHistory(),
            loadLeavesHistory(),
            fetchLeaveSummary()
        ]);
    };

    async function fetchTodayAttendance() {
        try {
            const res = await fetch('/api/attendance/today', { credentials: 'include' });
            const data = await res.json();
            if (data && data.success) {
                updatePunchUI(data.today, data.isCheckedIn, data.isCheckedOut);
            }
        } catch (err) {
            console.error('Fetch today attendance error:', err);
        }
    }

    function updatePunchUI(today, checkedIn, checkedOut) {
        isCheckedIn = !!checkedIn;
        const btn = document.getElementById('btnPunchAction');
        const actionText = document.getElementById('punchActionText');
        const badge = document.getElementById('punchStatusBadge');
        const inEl = document.getElementById('todayCheckInTime');
        const outEl = document.getElementById('todayCheckOutTime');
        const timerEl = document.getElementById('punchTimerDisplay');

        if (today && today.check_in) {
            checkInTimestamp = new Date(today.check_in);
            if (inEl) inEl.textContent = new Date(today.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            checkInTimestamp = null;
            if (inEl) inEl.textContent = '--:--';
        }

        if (today && today.check_out) {
            if (outEl) outEl.textContent = new Date(today.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            if (outEl) outEl.textContent = '--:--';
        }

        if (checkedIn) {
            if (badge) {
                badge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30';
                badge.textContent = 'Shift Active (Checked In)';
            }
            if (btn) {
                btn.className = 'w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer';
            }
            if (actionText) actionText.textContent = 'Punch Out / End Shift';
        } else if (checkedOut) {
            if (badge) {
                badge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30';
                badge.textContent = 'Shift Completed Today';
            }
            if (btn) {
                btn.className = 'w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer';
            }
            if (actionText) actionText.textContent = 'Punch In Again';
            if (today && today.work_hours && timerEl) {
                timerEl.textContent = `Today's Work Hours: ${today.work_hours} hrs completed`;
            }
        } else {
            if (badge) {
                badge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700';
                badge.textContent = 'Not Punched In Today';
            }
            if (btn) {
                btn.className = 'w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer';
            }
            if (actionText) actionText.textContent = 'Punch In / Check-In';
            if (timerEl) timerEl.textContent = 'Work Hours Today: 0h 0m 0s';
        }
    }

    window.toggleAttendancePunch = async function() {
        const btn = document.getElementById('btnPunchAction');
        if (btn) btn.disabled = true;

        try {
            const endpoint = isCheckedIn ? '/api/attendance/check-out' : '/api/attendance/check-in';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notes: isCheckedIn ? 'Shift Checkout' : 'Morning Shift Check-in' })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Attendance action failed');

            if (typeof window.showToast === 'function') {
                window.showToast(data.message || 'Attendance updated successfully!', 'success');
            }

            await fetchTodayAttendance();
            await loadAttendanceHistory();
        } catch (err) {
            console.error('Punch error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Punch Error: ' + err.message, 'error');
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    window.loadAttendanceHistory = async function() {
        const tbody = document.getElementById('attendanceLogsTableBody');
        if (!tbody) return;

        try {
            const res = await fetch('/api/attendance/my', { credentials: 'include' });
            const data = await res.json();
            const logs = (data && data.success && Array.isArray(data.data)) ? data.data : [];

            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-xs text-gray-400">No attendance records logged yet.</td></tr>';
                return;
            }

            tbody.innerHTML = logs.map(l => {
                const dateStr = l.date ? new Date(l.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                const inStr = l.check_in ? new Date(l.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const outStr = l.check_out ? new Date(l.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const hrsStr = l.work_hours ? `${l.work_hours} hrs` : (l.check_in && !l.check_out ? 'In Progress' : '0.00 hrs');
                const isPres = l.status === 'present';
                const badge = isPres 
                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">PRESENT</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">ON LEAVE</span>';

                return `
                    <tr class="hover:bg-[#FAFAF8] dark:hover:bg-zinc-800/40 transition-colors">
                        <td class="py-2.5 px-3 font-semibold text-[#111111] dark:text-zinc-200">${dateStr}</td>
                        <td class="py-2.5 px-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">${inStr}</td>
                        <td class="py-2.5 px-3 font-mono text-gray-600 dark:text-zinc-400">${outStr}</td>
                        <td class="py-2.5 px-3 font-mono text-gray-600 dark:text-zinc-400">${hrsStr}</td>
                        <td class="py-2.5 px-3 text-right">${badge}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error('Error loading attendance logs:', err);
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-xs text-red-500">Failed to load attendance logs.</td></tr>';
        }
    };

    async function fetchLeaveSummary() {
        try {
            const res = await fetch('/api/leaves/summary', { credentials: 'include' });
            const data = await res.json();
            if (data && data.success && data.balances) {
                const b = data.balances;
                const cEl = document.getElementById('balCasual');
                const sEl = document.getElementById('balSick');
                const pEl = document.getElementById('balPaid');
                const pendEl = document.getElementById('balPending');

                if (cEl) cEl.textContent = b.casual;
                if (sEl) sEl.textContent = b.sick;
                if (pEl) pEl.textContent = b.paid;
                if (pendEl) pendEl.textContent = b.pendingCount;
            }
        } catch (e) {
            console.error('Leave summary fetch error:', e);
        }
    }

    window.loadLeavesHistory = async function() {
        const tbody = document.getElementById('leaveRequestsTableBody');
        if (!tbody) return;

        try {
            const res = await fetch('/api/leaves/my', { credentials: 'include' });
            const data = await res.json();
            const leaves = (data && data.success && Array.isArray(data.data)) ? data.data : [];

            if (leaves.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-xs text-gray-400">No leave requests found.</td></tr>';
                return;
            }

            tbody.innerHTML = leaves.map(l => {
                const sDate = l.start_date ? new Date(l.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A';
                const eDate = l.end_date ? new Date(l.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A';
                const typeLabel = (l.leave_type || 'casual').toUpperCase();
                const status = (l.status || 'pending').toLowerCase();
                const statusBadge = status === 'approved'
                    ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Approved</span>'
                    : status === 'rejected'
                        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">Rejected</span>'
                        : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Pending</span>';

                return `
                    <tr class="hover:bg-[#FAFAF8] dark:hover:bg-zinc-800/40 transition-colors">
                        <td class="py-2.5 px-3 font-semibold text-[#111111] dark:text-zinc-200">${typeLabel}</td>
                        <td class="py-2.5 px-3 font-mono text-gray-600 dark:text-zinc-400">${sDate} - ${eDate}</td>
                        <td class="py-2.5 px-3 font-mono text-gray-600 dark:text-zinc-400">${l.days_count || 1}d</td>
                        <td class="py-2.5 px-3 text-right">${statusBadge}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error('Error loading leaves history:', err);
            tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-xs text-red-500">Failed to load leave history.</td></tr>';
        }
    };

    // Modal controls
    window.openApplyLeaveModal = function() {
        const modal = document.getElementById('applyLeaveModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
            // Set default dates to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const sInp = document.getElementById('leaveStartDate');
            const eInp = document.getElementById('leaveEndDate');
            if (sInp) sInp.value = tomorrowStr;
            if (eInp) eInp.value = tomorrowStr;
            window.calculateLeaveDays();
        }
    };

    window.closeApplyLeaveModal = function() {
        const modal = document.getElementById('applyLeaveModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    window.calculateLeaveDays = function() {
        const sInp = document.getElementById('leaveStartDate');
        const eInp = document.getElementById('leaveEndDate');
        const display = document.getElementById('calculatedLeaveDays');
        if (!sInp || !eInp || !display) return;

        if (sInp.value && eInp.value) {
            const start = new Date(sInp.value);
            const end = new Date(eInp.value);
            const diffTime = end - start;
            const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
            display.textContent = `${diffDays}.0 Day(s)`;
        }
    };

    window.submitLeaveRequest = async function() {
        const typeEl = document.getElementById('leaveTypeSelect');
        const startEl = document.getElementById('leaveStartDate');
        const endEl = document.getElementById('leaveEndDate');
        const reasonEl = document.getElementById('leaveReasonInput');
        const btn = document.getElementById('btnSubmitLeave');

        if (!startEl.value || !endEl.value) {
            if (typeof window.showToast === 'function') window.showToast('Please select valid start and end dates.', 'warning');
            return;
        }

        if (!reasonEl.value.trim()) {
            if (typeof window.showToast === 'function') window.showToast('Please enter a reason for your leave.', 'warning');
            return;
        }

        const start = new Date(startEl.value);
        const end = new Date(endEl.value);
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Submitting...';
        }

        try {
            const res = await fetch('/api/leaves/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    leave_type: typeEl.value,
                    start_date: startEl.value,
                    end_date: endEl.value,
                    days_count: diffDays,
                    reason: reasonEl.value.trim()
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Leave application failed');

            if (typeof window.showToast === 'function') {
                window.showToast('✅ Leave request submitted successfully for approval!', 'success');
            }

            reasonEl.value = '';
            window.closeApplyLeaveModal();
            await fetchLeaveSummary();
            await loadLeavesHistory();
        } catch (err) {
            console.error('Leave submit error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Submission Error: ' + err.message, 'error');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Submit Request';
            }
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // DATA EXPORT HANDLERS (Excel .xlsx and PDF)
    // ─────────────────────────────────────────────────────────────────────────
    window.exportCandidates = function(format = 'xlsx') {
        const role = document.getElementById('targetScreeningRole')?.value || 'all';
        const url = `/api/export/candidates?format=${format}&role=${encodeURIComponent(role)}`;
        
        // Trigger download via anchor element
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = `Rankly_Candidates_Shortlist.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (typeof window.showToast === 'function') {
            window.showToast(`Generating ${format.toUpperCase()} export for candidates...`, 'info');
        }
    };

    window.exportEmployees = function(format = 'xlsx') {
        const dept = document.getElementById('filterEmployeeDept')?.value || 'all';
        const status = document.getElementById('filterEmployeeStatus')?.value || 'all';
        const url = `/api/export/employees?format=${format}&department=${encodeURIComponent(dept)}&status=${encodeURIComponent(status)}`;

        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = `Rankly_Employees_Directory.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (typeof window.showToast === 'function') {
            window.showToast(`Generating ${format.toUpperCase()} export for employee workforce roster...`, 'info');
        }
    };

    // Aliases
    window.exportCandidatesToExcel = () => window.exportCandidates('xlsx');
    window.exportCandidatesToPdf = () => window.exportCandidates('pdf');
    window.exportEmployeesToExcel = () => window.exportEmployees('xlsx');
    window.exportEmployeesToPdf = () => window.exportEmployees('pdf');
})();
