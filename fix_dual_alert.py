with open('src/controllers/authController.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Update the email service call to also send to Rankly Support
content = content.replace(
'''await emailService.sendViaPythonSmtp({
                            to: targetOrg.admin.email,
                            subject: ?? Security Alert: Brute-Force Attack Blocked (),
                            html: html,
                            text: Security Alert: Attack from IP  blocked targeting .
                        });''',
'''// 1. Send Alert to the Company Admin
                        await emailService.sendViaPythonSmtp({
                            to: targetOrg.admin.email,
                            subject: ?? Security Alert: Brute-Force Attack Blocked (),
                            html: html,
                            text: Security Alert: Attack from IP  blocked targeting .
                        });
                        
                        // 2. Send Alert to Rankly Support Team
                        const supportHtml = html.replace('Hello <strong></strong>,', 'Hello <strong>Rankly Security Team</strong>,<br>ACTION REQUIRED:');
                        await emailService.sendViaPythonSmtp({
                            to: 'security-support@rankly.ai',
                            subject: ?? [URGENT] DEFCON-1: Attack on  Detected,
                            html: supportHtml,
                            text: Rankly Support: Attack from IP  blocked targeting  for org .
                        });'''
)

with open('src/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(content)
