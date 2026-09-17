with open('src/controllers/authController.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = "await emailService.sendViaPythonSmtp({"

if target in content:
    # Just replace the first occurrence of this target that has 	argetOrg.admin.email
    idx = content.find("to: targetOrg.admin.email,")
    if idx != -1:
        start_idx = content.rfind("await emailService.sendViaPythonSmtp({", 0, idx)
        end_idx = content.find("});", idx) + 3
        
        replacement = '''// 1. Send Alert to the Company Admin
                        await emailService.sendViaPythonSmtp({
                            to: targetOrg.admin.email,
                            subject: ?? Security Alert: Brute-Force Attack Blocked (),
                            html: html,
                            text: Security Alert: Attack from IP  blocked targeting .
                        });
                        
                        // 2. Send Alert to Rankly Support Team
                        const supportHtml = html.replace('Hello <strong></strong>,', 'Hello <strong>Rankly Security Team</strong>,<br><br><b>ACTION REQUIRED: Verify and resolve attack on tenant.</b><br>');
                        await emailService.sendViaPythonSmtp({
                            to: 'support@rankly.ai',
                            subject: ?? [URGENT] DEFCON-1: Attack on  Detected,
                            html: supportHtml,
                            text: Rankly Support: Attack from IP  blocked targeting  for org .
                        });'''
        
        content = content[:start_idx] + replacement + content[end_idx:]
        
        with open('src/controllers/authController.js', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully injected dual alert logic.")
