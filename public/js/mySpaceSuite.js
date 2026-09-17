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

// --- Geofenced Web Check-In ---
window.handleWebCheckIn = async function() {
    const btn = document.getElementById('webCheckInBtn');
    const statusDiv = document.getElementById('geofenceStatus');
    
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Getting Location...';
    
    statusDiv.classList.remove('hidden', 'text-emerald-500', 'text-amber-500', 'text-red-500');
    statusDiv.innerHTML = 'Requesting GPS coordinate access...';
    
    if (!navigator.geolocation) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        statusDiv.classList.add('text-red-500');
        statusDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Geolocation not supported by browser.';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            statusDiv.innerHTML = 'Location found. Verifying with office geofence...';

            try {
                // Hardcoded employee ID for demo purposes if not logged in.
                // In production, backend reads from session/JWT.
                const empId = window.currentUser?.employeeId || 'DEMO_EMP_ID'; 

                const res = await fetch('/api/hrms/attendance/punch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: empId,
                        type: 'checkIn',
                        latitude,
                        longitude
                    })
                });

                const data = await res.json();
                
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Checked In';
                
                if (data.isGeofenceValid) {
                    statusDiv.classList.add('text-emerald-500');
                    statusDiv.innerHTML = '<i class="fa-solid fa-shield-check"></i> ' + (data.message || 'Location Verified (Within Geofence)');
                } else if (data.isGeofenceValid === false && data.distance) {
                    statusDiv.classList.add('text-amber-500');
                    statusDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (data.message || 'Outside Office Geofence (' + Math.round(data.distance) + 'm away)');
                } else {
                    statusDiv.classList.add('text-emerald-500');
                    statusDiv.innerHTML = '<i class="fa-solid fa-check"></i> ' + (data.message || 'Checked In');
                }
                
                if (!res.ok) {
                   btn.disabled = false;
                   btn.innerHTML = originalText;
                   statusDiv.classList.add('text-red-500');
                   statusDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error: ' + (data.message || 'Failed to punch in');
                }

            } catch (err) {
                console.error('Punch API Error:', err);
                btn.disabled = false;
                btn.innerHTML = originalText;
                statusDiv.classList.add('text-red-500');
                statusDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Network error during verification.';
            }
        },
        (error) => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            statusDiv.classList.add('text-red-500');
            let errStr = 'Location access denied.';
            if (error.code === 2) errStr = 'Position unavailable.';
            if (error.code === 3) errStr = 'Location request timed out.';
            statusDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + errStr + ' Please allow location access.';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
};
