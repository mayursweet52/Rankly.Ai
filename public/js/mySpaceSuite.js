/**
 * mySpaceSuite.js
 * Frontend engine for Rankly HRMS (Zoho Blueprint)
 * Implements lazy loading and optimized DOM updates for high traffic scale.
 */

document.addEventListener('DOMContentLoaded', () => {
    initMySpace();
});

async function initMySpace() {
    // 1. Set contextual greeting based on local time
    setGreeting();

    // 2. Fetch User Profile & Shift Info (Simulated employee ID for now)
    const employeeId = 'emp_current_user_123';
    
    // Asynchronously fetch shift info and timesheets
    fetchShiftInfo();
    fetchTimesheets(employeeId);
}

function setGreeting() {
    const hour = new Date().getHours();
    const title = document.getElementById('greeting-title');
    if (hour < 12) title.innerText = 'Good Morning';
    else if (hour < 18) title.innerText = 'Good Afternoon';
    else title.innerText = 'Good Evening';

    // Mock setting the name
    document.getElementById('employee-name-display').innerText = 'Mayur Jadhav';
}

async function fetchShiftInfo() {
    try {
        const response = await fetch('/api/hrms/shifts');
        const result = await response.json();
        
        document.getElementById('shift-loader').style.display = 'none';
        const shiftContent = document.getElementById('shift-content');
        shiftContent.style.display = 'block';

        if (result.success && result.data.length > 0) {
            const defaultShift = result.data.find(s => s.isDefault) || result.data[0];
            document.getElementById('shift-name').innerText = defaultShift.name;
            document.getElementById('shift-time').innerText = `${defaultShift.startTime} - ${defaultShift.endTime}`;
        } else {
            document.getElementById('shift-name').innerText = 'General [09AM - 06PM]';
            document.getElementById('shift-time').innerText = '09:00 - 18:00';
        }
    } catch (e) {
        console.error('Failed to fetch shifts:', e);
        document.getElementById('shift-loader').style.display = 'none';
        document.getElementById('shift-content').style.display = 'block';
        document.getElementById('shift-name').innerText = 'General (Default)';
        document.getElementById('shift-time').innerText = '09:00 - 18:00';
    }
}

async function fetchTimesheets(employeeId) {
    try {
        const response = await fetch(`/api/hrms/timesheets?employeeId=${employeeId}`);
        const result = await response.json();
        
        const tbody = document.getElementById('timesheets-list');
        if (result.success && result.data.length > 0) {
            tbody.innerHTML = ''; // clear loading state
            result.data.forEach(ts => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors';
                
                const dateStr = new Date(ts.date).toLocaleDateString();
                const statusColor = ts.status === 'approved' ? 'text-green-500' : 'text-yellow-500';

                tr.innerHTML = `
                    <td class="py-3 text-gray-900 dark:text-gray-300 font-medium">${dateStr}</td>
                    <td class="py-3 text-gray-600 dark:text-gray-400">${ts.project?.name || 'Internal Project'}</td>
                    <td class="py-3 text-gray-900 dark:text-gray-300">${ts.hoursWorked} hrs</td>
                    <td class="py-3 font-medium ${statusColor} capitalize">${ts.status}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        // If empty, leave the default "yet to submit" message
    } catch (e) {
        console.error('Failed to fetch timesheets:', e);
    }
}
