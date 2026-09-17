with open('src/middleware/tenantMiddleware.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove the auto-lift logic and make it an indefinite jam
new_logic = '''
        // --- DEFCON 1 KILL SWITCH (INDEFINITE LOCKDOWN) ---
        if (organization.isUnderLockdown) {
            console.error(?? [DEFCON 1] Request blocked for locked-down domain: );
            return res.status(423).json({
                success: false,
                message: ?? SECURITY LOCKDOWN: We detected a severe hacking attempt on this domain. To protect your data, all access has been jammed. The Rankly Security Team is investigating the matter and will restore access once verified.,
                code: 'DEFCON_1_ACTIVE'
            });
        }
        // ----------------------------------------------'''

# Replace the old logic
content = re.sub(r'// --- DEFCON 1 KILL SWITCH \(2-HOUR LOCKDOWN\) ---.*?// ----------------------------------------------', new_logic.strip(), content, flags=re.DOTALL)

with open('src/middleware/tenantMiddleware.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated lockdown to be indefinite until support resolves it.")
