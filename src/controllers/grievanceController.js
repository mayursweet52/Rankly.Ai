const prisma = require('../config/database');
const { sendRanklyEmail } = require('../services/emailService');

/**
 * Submit Confidential Grievance (Employee -> Admin)
 * HR cannot view this; anonymous option hides submitter details
 */
async function submitGrievance(req, res) {
  try {
    const { category, priority = 'Normal', subject, description, isAnonymous } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required.' });
    }

    const cleanSubject = subject.trim();
    const cleanDescription = description.trim();
    const cleanCategory = (category || 'HR Issue').trim();
    const cleanPriority = ['Normal', 'Urgent', 'Critical'].includes(priority) ? priority : 'Normal';
    const anonymousFlag = isAnonymous === true || isAnonymous === 'true';

    const user = req.user;
    const orgId = user ? (user.organizationId || null) : null;

    let employeeName = 'Anonymous Employee';
    let employeeEmail = null;

    if (!anonymousFlag && user) {
      employeeName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Employee';
      employeeEmail = user.workEmail || user.email || null;
    }

    const grievance = await prisma.grievance.create({
      data: {
        organizationId: orgId,
        userId: user ? user.id : null,
        employeeName,
        employeeEmail,
        category: cleanCategory,
        priority: cleanPriority,
        subject: cleanSubject,
        description: cleanDescription,
        isAnonymous: anonymousFlag,
        status: 'Pending'
      }
    });

    // Notify Organization Admin via Email (Fire & Forget, does not block response)
    (async () => {
      try {
        let adminUser = null;
        if (orgId) {
          adminUser = await prisma.user.findFirst({
            where: { organizationId: orgId, role: 'admin' }
          });
        }
        if (!adminUser) {
          adminUser = await prisma.user.findFirst({
            where: { role: 'admin' }
          });
        }

        const adminEmail = adminUser ? adminUser.email : (process.env.SMTP_USER || 'rankly.ai.com@gmail.com');
        if (adminEmail) {
          const emailSubject = `🔒 [Confidential Grievance]: ${cleanSubject} (${cleanPriority})`;
          const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E5DF; border-radius: 12px; overflow: hidden;">
              <div style="background: #111111; color: #ffffff; padding: 20px 24px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.5px;">Rankly.ai Confidential Grievance System</h2>
                <p style="margin: 4px 0 0; font-size: 12px; color: #888880;">Strictly Confidential &bull; For Organization Admin Eyes Only</p>
              </div>
              <div style="padding: 24px;">
                <div style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; background: ${cleanPriority === 'Critical' ? '#FEE2E2; color: #991B1B;' : (cleanPriority === 'Urgent' ? '#FEF3C7; color: #92400E;' : '#E0F2FE; color: #075985;')}">
                  Priority: ${cleanPriority} &bull; ${cleanCategory}
                </div>
                <h3 style="margin: 0 0 12px; font-size: 16px; color: #111111;">${cleanSubject}</h3>
                <div style="background: #FAFAF8; border: 1px solid #E5E5DF; border-radius: 8px; padding: 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; color: #333330; white-space: pre-wrap;">${cleanDescription}</div>
                <div style="font-size: 12px; color: #666660; border-top: 1px solid #E5E5DF; padding-top: 12px;">
                  <strong>Submitter:</strong> ${anonymousFlag ? '🔒 Anonymous Employee (Identity Protected)' : `${employeeName} (${employeeEmail})`}<br/>
                  <strong>Submitted At:</strong> ${new Date().toLocaleString()}<br/>
                  <strong>Notice:</strong> This report has bypassed HR and is stored directly in your Admin portal.
                </div>
              </div>
            </div>
          `;
          await sendRanklyEmail(adminEmail, emailSubject, emailHtml);
        }
      } catch (mailErr) {
        console.warn('⚠️ [Grievance Admin Email Alert Failed]:', mailErr.message);
      }
    })();

    return res.status(201).json({
      success: true,
      message: 'Your confidential complaint has been delivered directly to the Administrator.',
      data: {
        id: grievance.id,
        category: grievance.category,
        priority: grievance.priority,
        subject: grievance.subject,
        isAnonymous: grievance.isAnonymous,
        status: grievance.status,
        createdAt: grievance.createdAt
      }
    });
  } catch (error) {
    console.error('Submit Grievance Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit grievance: ' + error.message });
  }
}

/**
 * Get My Submitted Grievances (For Employee tracking)
 */
async function getMyGrievances(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const grievances = await prisma.grievance.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        priority: true,
        subject: true,
        description: true,
        isAnonymous: true,
        status: true,
        adminNotes: true,
        resolvedAt: true,
        createdAt: true
      }
    });

    return res.status(200).json({
      success: true,
      data: grievances
    });
  } catch (error) {
    console.error('Get My Grievances Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load grievances: ' + error.message });
  }
}

/**
 * Get All Grievances (Admin Only)
 */
async function getAdminGrievances(req, res) {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Administrator privileges required.' });
    }

    const { status, category } = req.query;
    const where = {};

    if (user.organizationId) {
      where.organizationId = user.organizationId;
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (category && category !== 'all') {
      where.category = category;
    }

    const grievances = await prisma.grievance.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Sanitized output ensuring anonymous submitters remain untraceable
    const sanitized = grievances.map(g => ({
      id: g.id,
      category: g.category,
      priority: g.priority,
      subject: g.subject,
      description: g.description,
      isAnonymous: g.isAnonymous,
      employeeName: g.isAnonymous ? 'Anonymous Employee' : g.employeeName,
      employeeEmail: g.isAnonymous ? null : g.employeeEmail,
      status: g.status,
      adminNotes: g.adminNotes,
      resolvedAt: g.resolvedAt,
      createdAt: g.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: sanitized
    });
  } catch (error) {
    console.error('Get Admin Grievances Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve grievances: ' + error.message });
  }
}

/**
 * Update Grievance Status & Admin Notes (Admin Only)
 */
async function updateGrievanceStatus(req, res) {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Administrator privileges required.' });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['Pending', 'Under Review', 'Resolved', 'Dismissed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await prisma.grievance.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Grievance record not found.' });
    }

    if (user.organizationId && existing.organizationId && existing.organizationId !== user.organizationId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update grievance for another organization.' });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'Resolved' && !existing.resolvedAt) {
        updateData.resolvedAt = new Date();
      } else if (status !== 'Resolved') {
        updateData.resolvedAt = null;
      }
    }
    if (typeof adminNotes === 'string') {
      updateData.adminNotes = adminNotes.trim();
    }

    const updated = await prisma.grievance.update({
      where: { id },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'Grievance status updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Update Grievance Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update grievance: ' + error.message });
  }
}

module.exports = {
  submitGrievance,
  getMyGrievances,
  getAdminGrievances,
  updateGrievanceStatus
};
