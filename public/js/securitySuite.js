
window.toggleIpConfig = function() {
    const toggle = document.getElementById('ipRestrictionToggle');
    const container = document.getElementById('ipListContainer');
    if (toggle.checked) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
};

window.saveSecuritySettings = async function() {
    const isIpRestrictionEnabled = document.getElementById('ipRestrictionToggle').checked;
    const allowedIps = document.getElementById('allowedIpsInput').value;

    const btn = document.querySelector('#ipListContainer button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/organization/security', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isIpRestrictionEnabled, allowedIps })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            if (typeof showToast !== 'undefined') showToast('Enterprise Security Policy updated.', 'success');
        } else {
            if (typeof showToast !== 'undefined') showToast('Failed to update policy: ' + (data.message || 'Error'), 'error');
        }
    } catch (e) {
        console.error(e);
        if (typeof showToast !== 'undefined') showToast('Network Error', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// Optionally load existing settings when settings tab opens
// Assuming backend gives us organization data
