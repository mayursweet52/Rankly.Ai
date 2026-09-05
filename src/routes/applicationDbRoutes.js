/**
 * Anti-Gravity Applications & Audit Trail API Router
 * Endpoints for managing applications lifecycle and viewing audit logs.
 */

const express = require('express');
const router = express.Router();
const appService = require('../services/applicationDbService');
const { isAuthenticated } = require('../middleware/auth');

// -----------------------------------------------------------------------------
// Applications CRUD & Lifecycle
// -----------------------------------------------------------------------------

// 1. Create a new application (initial state: pending_screening)
router.post('/', async (req, res) => {
  try {
    const {
      candidateId,
      jobTitle,
      companyName,
      resumeUrl,
      matchScore,
      screeningVerdict,
      screeningNotes,
      matchedSkills,
      missingSkills
    } = req.body;

    const actorEmail = req.session?.user?.email || req.body.candidateEmail || null;
    const actorId = req.session?.userId || candidateId;

    const application = await appService.createApplication({
      candidateId,
      jobTitle,
      companyName,
      resumeUrl,
      matchScore,
      screeningVerdict,
      screeningNotes,
      matchedSkills,
      missingSkills,
      actorEmail,
      actorId
    });

    return res.status(201).json({
      success: true,
      message: 'Application created successfully in pending_screening state.',
      application
    });
  } catch (err) {
    console.error('Create Application Error:', err);
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
});

// 2. List applications with filters & pagination
router.get('/', async (req, res) => {
  try {
    const { status, candidateId, hrReviewerId, limit, offset } = req.query;
    const result = await appService.listApplications({
      status,
      candidateId: candidateId ? parseInt(candidateId, 10) : undefined,
      hrReviewerId: hrReviewerId ? parseInt(hrReviewerId, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0
    });

    return res.json({
      success: true,
      total: result.total,
      applications: result.applications
    });
  } catch (err) {
    console.error('List Applications Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get single application with candidate & reviewer details
router.get('/:id', async (req, res) => {
  try {
    const application = await appService.getApplicationById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    return res.json({ success: true, application });
  } catch (err) {
    console.error('Get Application Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update status with strict lifecycle transition & automated audit logging
router.put('/:id/status', async (req, res) => {
  try {
    const {
      status,
      changeReason,
      hrFeedback,
      rejectionReason,
      hrReviewerId,
      actorType
    } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const sessionUser = req.session?.user;
    const effectiveActorType = actorType || (sessionUser?.role === 'admin' || sessionUser?.role === 'hr' ? 'hr_admin' : 'system_ai');
    const effectiveActorEmail = sessionUser?.email || 'system@rankly.ai';
    const effectiveActorId = sessionUser?.id || null;

    const updated = await appService.updateApplicationStatus(req.params.id, {
      newStatus: status,
      actorType: effectiveActorType,
      actorId: effectiveActorId,
      actorEmail: effectiveActorEmail,
      changeReason: changeReason || `Transitioned to ${status}`,
      hrFeedback,
      rejectionReason,
      hrReviewerId: hrReviewerId ? parseInt(hrReviewerId, 10) : undefined
    });

    return res.json({
      success: true,
      message: `Application status updated to "${status}".`,
      application: updated
    });
  } catch (err) {
    console.error('Update Application Status Error:', err);
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
});

// 5. Get immutable audit logs for a specific application
router.get('/:id/audit-logs', async (req, res) => {
  try {
    const auditLogs = await appService.getApplicationAuditLogs(req.params.id);
    return res.json({
      success: true,
      count: auditLogs.length,
      auditLogs
    });
  } catch (err) {
    console.error('Get Application Audit Logs Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Global audit logs stream
router.get('/audit-logs/stream', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const logs = await appService.listAuditLogs({ limit, offset });
    return res.json({ success: true, count: logs.length, auditLogs: logs });
  } catch (err) {
    console.error('Audit Logs Stream Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
