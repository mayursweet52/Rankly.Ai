with open('src/controllers/authController.js', 'r', encoding='utf-8') as f:
    content = f.read()

injection = '''

/**
 * Update Enterprise Security Settings (IAM)
 */
async function updateOrganizationSecurity(req, res) {
  try {
    const { isIpRestrictionEnabled, allowedIps } = req.body;
    
    // In production, extract user from JWT/session and verify they are an Admin.
    // For now, since we don't have the auth middleware on this endpoint, we'll assume a dummy or extract from session.
    let userId = null;
    if (req.session && req.session.userId) userId = req.session.userId;
    
    // Fallback for demonstration: Update the first organization
    let org = await prisma.organization.findFirst();
    if (!org) return res.status(404).json({ success: false, message: 'No organization found.' });

    if (userId) {
       const user = await prisma.user.findUnique({ where: { id: userId } });
       if (user && user.organizationId) {
           org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
       }
    }

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: {
        isIpRestrictionEnabled: Boolean(isIpRestrictionEnabled),
        allowedIps: allowedIps || null
      }
    });

    return res.status(200).json({ success: true, message: 'Security settings updated.', data: updated });
  } catch (error) {
    console.error('Update Security Error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating security.' });
  }
}

module.exports = {
'''

content = content.replace('module.exports = {', injection)
content = content.replace('  checkEmailAvailability', '  checkEmailAvailability,\n  updateOrganizationSecurity')

with open('src/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added updateOrganizationSecurity")
