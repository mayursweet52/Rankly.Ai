js_content = '''
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
'''

with open('public/js/securitySuite.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

# Include in index.html
with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<!-- Include our App Logic -->', '<!-- Include our App Logic -->\n    <script src="/js/securitySuite.js"></script>')

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Added securitySuite.js")
