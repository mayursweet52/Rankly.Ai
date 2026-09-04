const prisma = require('../config/database');
const { sendCandidateStatusNotification } = require('../services/emailService');

function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatCandidate(c) {
  return {
    ...c,
    matchedSkills: safeJsonParse(c.matchedSkills, []),
    missingSkills: safeJsonParse(c.missingSkills, []),
    recommendations: safeJsonParse(c.recommendations, [])
  };
}

/**
 * Get All Pipeline Candidates (Kanban Board)
 */
async function getCandidates(req, res) {
  try {
    const { stage, targetRole, minScore, search } = req.query;
    const orgId = req.user?.organizationId;
    const userId = req.user?.id;

    const where = {};

    if (orgId) {
      where.OR = [{ organizationId: orgId }, { userId }];
    } else if (userId) {
      where.userId = userId;
    }

    if (stage) where.stage = stage;
    if (targetRole) where.targetRole = { contains: targetRole };
    if (minScore) where.score = { gte: parseFloat(minScore) };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { targetRole: { contains: search } }
      ];
    }

    const candidates = await prisma.candidate.findMany({
      where,
      take: 100,
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }]
    });

    return res.json({
      success: true,
      candidates: candidates.map(formatCandidate)
    });
  } catch (error) {
    console.error('Get Candidates Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve candidates.' });
  }
}

/**
 * Create Single Candidate in Pipeline
 */
async function createCandidate(req, res) {
  try {
    const {
      name,
      email,
      phone,
      targetRole,
      stage = 'applied',
      score = 0,
      notes,
      skillsScore = 0,
      experienceScore = 0,
      toolsScore = 0,
      educationScore = 0,
      fitVerdict = 'Potential Fit'
    } = req.body;

    if (!name || !targetRole) {
      return res.status(400).json({ success: false, message: 'Candidate name and target role are required.' });
    }

    const candidate = await prisma.candidate.create({
      data: {
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        targetRole: targetRole.trim(),
        stage,
        score: parseFloat(score) || 0,
        skillsScore: parseFloat(skillsScore) || 0,
        experienceScore: parseFloat(experienceScore) || 0,
        toolsScore: parseFloat(toolsScore) || 0,
        educationScore: parseFloat(educationScore) || 0,
        fitVerdict,
        notes: notes || '',
        organizationId: req.user?.organizationId || null,
        userId: req.user?.id || null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Candidate created successfully.',
      candidate
    });
  } catch (error) {
    console.error('Create Candidate Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create candidate.' });
  }
}

/**
 * Get Candidate Details by ID
 */
async function getCandidateById(req, res) {
  try {
    const { id } = req.params;
    const candidate = await prisma.candidate.findUnique({ where: { id } });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    return res.json({ success: true, candidate: formatCandidate(candidate) });
  } catch (error) {
    console.error('Get Candidate By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve candidate.' });
  }
}

/**
 * Update Candidate Pipeline Stage (Kanban Move)
 */
async function updateCandidateStage(req, res) {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;

    const validStages = ['applied', 'ai_screened', 'hm_review', 'interview', 'offered', 'rejected'];
    if (!stage || !validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Allowed: ${validStages.join(', ')}`
      });
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        stage,
        notes: notes !== undefined ? notes : undefined
      }
    });

    // Also sync evaluation if linked
    if (candidate.evaluationId) {
      await prisma.evaluation.update({
        where: { id: candidate.evaluationId },
        data: { pipelineStage: stage }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Candidate moved to stage "${stage}".`,
      candidate
    });
  } catch (error) {
    console.error('Update Stage Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update candidate stage.' });
  }
}

/**
 * Update Candidate Notes
 */
async function updateCandidateNotes(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: { notes }
    });

    return res.json({ success: true, message: 'Notes updated.', candidate });
  } catch (error) {
    console.error('Update Notes Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notes.' });
  }
}

/**
 * Notify Candidate via Email
 */
async function notifyCandidate(req, res) {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate || !candidate.email) {
      return res.status(400).json({ success: false, message: 'Candidate has no valid email address on file.' });
    }

    await sendCandidateStatusNotification(
      candidate.email,
      candidate.name,
      candidate.targetRole,
      candidate.stage,
      message
    );

    return res.json({
      success: true,
      message: `Notification email sent to ${candidate.email}.`
    });
  } catch (error) {
    console.error('Notify Candidate Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send notification email.' });
  }
}

/**
 * Delete Candidate
 */
async function deleteCandidate(req, res) {
  try {
    const { id } = req.params;
    await prisma.candidate.delete({ where: { id } });
    return res.json({ success: true, message: 'Candidate deleted from pipeline.' });
  } catch (error) {
    console.error('Delete Candidate Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete candidate.' });
  }
}

module.exports = {
  getCandidates,
  createCandidate,
  getCandidateById,
  updateCandidateStage,
  updateCandidateNotes,
  notifyCandidate,
  deleteCandidate
};
