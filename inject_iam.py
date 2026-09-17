with open('src/controllers/authController.js', 'r', encoding='utf-8') as f:
    content = f.read()

injection = '''
      // --- CONTEXTUAL SECURITY & IAM CHECK ---
      let securityError = null;
      if (user && user.organizationId) {
        try {
          const org = await prisma.organization.findUnique({
             where: { id: user.organizationId }
          });
          if (org && org.isIpRestrictionEnabled && org.allowedIps) {
             const userIp = req.ip || req.connection.remoteAddress || 'unknown';
             const allowed = org.allowedIps.split(',').map(ip => ip.trim());
             if (userIp !== 'unknown' && !allowed.includes(userIp) && userIp !== '::1' && userIp !== '127.0.0.1') {
                 // Throw IAM Block Error
                 console.log([IAM BLOCK] User  blocked from unauthorized IP: );
                 securityError = Access Denied: Your IP address () is not whitelisted for this organization's network.;
             }
          }
        } catch(e) {
          console.error("IAM Check Error:", e);
        }
      }

      if (securityError) {
         return failAuth(res, req, securityError, recipientEmail, 403);
      }

      // Update Last Login details
      if (user) {
         await prisma.user.update({
            where: { id: user.id },
            data: { 
              lastLoginIp: req.ip || req.connection.remoteAddress || 'unknown',
              lastLoginDevice: req.headers['user-agent'] || 'unknown'
            }
         });
      }
      // ---------------------------------------

      // Generate secure JWT Token (7-day validity)'''

content = content.replace('      // Generate secure JWT Token (7-day validity)', injection)

with open('src/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected IAM checks into Auth Controller")
