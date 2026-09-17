with open('src/controllers/authController.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# 1. Inject Layer 1 and 2 inside verifyOtp right after user and org retrieval
# The old code had:
#       if (securityError) {
#          return failAuth(res, req, securityError, recipientEmail, 403);
#       }
# We will replace that whole block with our new Zero-Trust logic

zero_trust_logic = '''
      // --- ZERO-TRUST DOMAIN SECURITY & IAM CHECK ---
      let securityError = null;
      let tenantCode = null;
      let orgId = null;

      if (user && user.organizationId) {
        try {
          const org = await prisma.organization.findUnique({
             where: { id: user.organizationId }
          });
          if (org) {
             tenantCode = org.tenantCode;
             orgId = org.id;

             // LAYER 1: STRICT DOMAIN & ANTI-SPOOFING
             if (org.allowedDomains) {
                const userDomain = recipientEmail.split('@')[1];
                const allowedDomainsList = org.allowedDomains.split(',').map(d => d.trim().toLowerCase());
                
                // Exempt public domains if explicitly invited? Or strict block? Strict block as per Zero-Trust.
                if (!allowedDomainsList.includes(userDomain)) {
                    console.log([ZERO-TRUST BLOCK] Email domain \ is not whitelisted for Organization \);
                    securityError = ?? Security Alert: This Database is not connected with your company. Domain (\) is strictly prohibited.;
                }
             }

             // LAYER 2: IP WHITELISTING (Contextual)
             if (!securityError && org.isIpRestrictionEnabled && org.allowedIps) {
                 const userIp = req.ip || req.connection.remoteAddress || 'unknown';
                 const allowed = org.allowedIps.split(',').map(ip => ip.trim());
                 if (userIp !== 'unknown' && !allowed.includes(userIp) && userIp !== '::1' && userIp !== '127.0.0.1') {
                     console.log([IAM BLOCK] User \ blocked from unauthorized IP: \);
                     securityError = Access Denied: Your IP address (\) is not whitelisted for this organization's network.;
                 }
             }
          }
        } catch(e) {
          console.error("Zero-Trust Check Error:", e);
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

      // Generate secure JWT Token (7-day validity)
      const jwtSecret = process.env.JWT_SECRET || 'antigravity_jwt_super_secure_secret_key_2026';
      const tokenPayload = {
        id: user ? user.id : recipientEmail,
        userId: user ? user.id : recipientEmail,
        email: recipientEmail,
        role: user ? user.role : 'authenticated',
        verified: true,
        // LAYER 3: CRYPTOGRAPHIC JWT BINDING
        tenantCode: tenantCode,
        organizationId: orgId
      };'''

content = re.sub(
    r'// --- CONTEXTUAL SECURITY & IAM CHECK ---.*?const tokenPayload = \{[^\}]+\};',
    zero_trust_logic,
    content,
    flags=re.DOTALL
)

with open('src/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected Zero-Trust Logic into authController")
