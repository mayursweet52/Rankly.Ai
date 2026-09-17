// -------------------------------------------------------------------
// Rankly.Ai - Onboarding Suite
// -------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // We can hook into the tab switch logic if needed.
});

window.loadOnboardingData = async function() {
    const grid = document.getElementById('onboardingGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl"></i><p class="mt-2 text-sm">Loading pipelines...</p></div>';

    try {
        const res = await fetch('/api/onboarding/active');
        const data = await res.json();

        if (res.ok && data.success) {
            renderOnboardingGrid(data.data);
        } else {
            grid.innerHTML = '<div class="col-span-full text-center py-10 text-red-400">Failed to load onboarding data.</div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-red-400">Network error loading onboarding data.</div>';
    }
};

function renderOnboardingGrid(onboardings) {
    const grid = document.getElementById('onboardingGrid');
    if (!onboardings || onboardings.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl border-dashed">
                <div class="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center text-2xl mb-4">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>
                <h3 class="text-lg mb-1 font-bold text-gray-900 dark:text-white">No Active Onboardings</h3>
                <p class="text-sm text-gray-500 mb-4">Assign an onboarding template to a new hire to get started.</p>
                <button class="btn-primary" onclick="openAssignOnboardingModal()"><i class="fa-solid fa-plus"></i> Assign Onboarding</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    onboardings.forEach(ob => {
        const emp = ob.employee;
        const progressColor = ob.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500';
        const tasksHtml = ob.tasks.map(t => {
            const isCompleted = t.status === 'completed';
            const icon = isCompleted ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-regular fa-circle text-gray-300 dark:text-zinc-600';
            const textStyle = isCompleted ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-700 dark:text-zinc-300';
            
            return `
                <div class="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg#ursor-pointer transition-colors" onclick="toggleOnboardingTask('${t.id}', '${isCompleted ? 'pending' : 'completed'}')">
                    <i class="${icon} mt-1 transition-colors"></i>
                    <div class="flex-1">
                        <p class="text-sm font-semibold ${textStyle} transition-all">${t.title}</p>
                        ${t.assignedRole ? `<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 border border-gray-200 dark:border-zinc-700 mt-1 inline-block">${t.assignedRole}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col';
        card.innerHTML = `
            <div class="p-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center uppercase">
                        ${emp.firstName.charAt(0)}${emp.lastName ? emp.lastName.charAt(0) : ''}
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 dark:text-white">${emp.firstName} ${emp.lastName || ''}</h4>
                        <p class="text-xs text-gray-500">${emp.designation} • ${emp.employeeCode}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-xs font-bold text-gray-900 dark:text-white">${ob.progress}%</span>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider">${ob.status.replace('_', ' ')}</p>
                </div>
            </div>
            <div class="h-1.5 w-full bg-gray-100 dark:bg-zinc-800">
                <div class="h-full ${progressColor} transition-all duration-500" style="width: ${ob.progress}%"></div>
            </div>
            <div class="p-4 flex-1 space-y-1">
                ${tasksHtml}
            </div>
        `;
        grid.appendChild(card);
    });
}

window.toggleOnboardingTask = async function(taskId, newStatus) {
    try {
        const res = await fetch(`/api/onboarding/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (res.ok) {
            loadOnboardingData();
        } else {
            if (typeof showToast !== 'undefined') showToast('Failed to update task', 'error');
        }
    } catch (e) {
        console.error(e);
        if (typeof showToast !== 'undefined') showToast('Network error', 'error');
    }
};

window.openAssignOnboardingModal = function() {
    if (typeof showToast !== 'undefined') showToast('To assign an onboarding template, please use the API directly or finish the backend template setup.', 'info');
};

const originalSwitchMainTab = window.switchMainTab;
window.switchMainTab = function(tabId) {
    if (originalSwitchMainTab) originalSwitchMainTab(tabId);
    if (tabId === 'tab-onboarding') {
        loadOnboardingData();
    }
};