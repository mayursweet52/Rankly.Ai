const prisma = require('../config/database');
const { sendCandidateStatusNotification } = require('../services/emailService');
const { recordAuditLog, getRecentAuditLogs } = require('../services/auditLogService');
const { createNotification } = require('./notificationController');

function safeJsonParse(str, fallback = []) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatCandidate(c) {
  let cheatSheet = null;
  try {
    if (c.notes && (c.notes.startsWith('{') || c.notes.includes('"summaryLines"'))) {
      cheatSheet = JSON.parse(c.notes);
    }
  } catch (_) {}

  return {
    ...c,
    matchedSkills: safeJsonParse(c.matchedSkills, []),
    missingSkills: safeJsonParse(c.missingSkills, []),
    recommendations: safeJsonParse(c.recommendations, []),
    cheatSheet
  };
}

/**
 * Synthesize AI Cheat Sheet for any candidate
 */
function buildAiCheatSheet(candidate) {
  // If already stored in notes as JSON
  if (candidate.notes) {
    try {
      const parsed = JSON.parse(candidate.notes);
      if (parsed.summaryLines && parsed.interviewQuestions) {
        return parsed;
      }
    } catch (_) {}
  }

  const name = candidate.name || 'Candidate';
  const role = candidate.targetRole || 'Software Engineer';
  const score = Math.round(candidate.score || 75);
  const matched = safeJsonParse(candidate.matchedSkills, ['Problem Solving', 'Engineering Fundamentals']);
  const missing = safeJsonParse(candidate.missingSkills, ['Advanced System Design']);

  const matchedStr = matched.slice(0, 3).join(', ');
  const missingStr = missing.slice(0, 2).join(', ');

  const summaryLines = [
    `${name} demonstrates a strong ${score}% calibrated match for the ${role} position.`,
    `Demonstrated execution in key competencies including ${matchedStr || 'core domain skills'} with solid architectural awareness.`,
    score >= 80 
      ? `High velocity potential; recommended for fast-track technical interview evaluation.`
      : `Moderate fit; recommend verifying depth in ${missingStr || 'secondary domain tools'} during interview.`
  ];

  const coreStrengths = matched.length > 0 ?
    matched.slice(0, 3).map(s => `Demonstrated hands-on competence with ${s} in production environments`)
    : [`Solid grasp of ${role} core methodologies`, 'Adaptable engineering problem-solving mindset'];

  const potentialRisks = missing.length > 0 ?
    missing.slice(0, 2).map(m => `May require ramp-up or targeted onboarding on ${m}`)
    : ['Verify practical breadth of edge-case error recovery mechanisms'];

  const interviewQuestions = [
    {
      question: `Given a high-throughput requirement in ${role}, how would you architect your solution using ${matched[0] || 'your core stack'} to handle unexpected spikes in latency?`,
      signalHint: 'Looks for horizontal scaling patterns, asynchronous processing, and distributed caching.'
    },
    {
      question: `Walk us through a past project where you had to debug a difficult production issue or performance bottleneck. What was your root cause analysis approach?`,
      signalHint: 'Looks for structured diagnostic telemetry, profiling tools, and regression prevention.'
    }
  ];

  return {
    summaryLines,
    coreStrengths,
    potentialRisks,
    interviewQuestions
  };
}

/**
 * 1. Get All Pipeline Candidates (Kanban Board)
 */
async function getCandidates(req, res) {
  try {
    const { stage, targetRole, minScore, search } = req.query;
    const orgId = req.user?.organizationId;
    const userId = req.user?.id;
    const userRole = (req.user?.role || req.session?.user?.role || '').toLowerCase();
    const isHrOrAdmin = ['admin', 'administrator', 'hr', 'human_resources', 'hiring', 'hiring_manager'].includes(userRole);

    const where = {};

    if (orgId) {
      where.OR = [{ organizationId: orgId }, { organizationId: null }, { userId }];
    } else if (userId && !isHrOrAdmin) {
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
      take: 150,
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
 * 2. AI-Sorted Candidate Queue (Highest Match Scores 90%+ on Top) - Redis / Memory Cached
 */
async function getAiCandidateQueue(req, res) {
  try {
    const { targetRole = 'all', minScore = '', stage = 'all', search = '' } = req.query;
    const redisCacheService = require('../services/redisCacheService');
    const orgId = req.session?.organizationId || 'global';
    const cacheKey = `candidates:queue:${orgId}:${targetRole}:${stage}:${minScore}:${search}`;

    const { data, cached } = await redisCacheService.getOrSet(cacheKey, async () => {
      const where = {};

      if (stage && stage !== 'all') {
        where.stage = stage;
      }
      if (targetRole && targetRole !== 'all') {
        where.targetRole = { contains: targetRole };
      }
      if (minScore && !isNaN(parseFloat(minScore))) {
        where.score = { gte: parseFloat(minScore) };
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
          { targetRole: { contains: search } }
        ];
      }

      // Always sort by AI Fit Score descending (90%+ matches on top!)
      const candidates = await prisma.candidate.findMany({
        where,
        take: 150,
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }]
      });

      const enriched = candidates.map(c => {
        const formatted = formatCandidate(c);
        const cheatSheet = buildAiCheatSheet(c);
        return {
          ...formatted,
          cheatSheet
        };
      });

      return {
        total: enriched.length,
        topMatchesCount: enriched.filter(c => c.score >= 90).length,
        candidates: enriched
      };
    }, 45); // 45 seconds TTL

    res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
    return res.json({
      success: true,
      cached,
      ...data
    });
  } catch (error) {
    console.error('AI Candidate Queue Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve AI candidate queue.' });
  }
}

/**
 * 3. Candidate Evaluation Brief / Dossier Details for a Candidate
 */
async function getCandidateCheatSheet(req, res) {
  try {
    const { id } = req.params;
    const candidate = await prisma.candidate.findUnique({ where: { id } });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    const cheatSheet = buildAiCheatSheet(candidate);

    return res.json({
      success: true,
      candidate: formatCandidate(candidate),
      cheatSheet
    });
  } catch (error) {
    console.error('Candidate Evaluation Brief Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve Candidate Evaluation Brief.' });
  }
}

/**
 * 4. Fast Action & Status Buttons: Move to HR Shortlist or Reject with Audit Logs
 */
async function performCandidateAction(req, res) {
  try {
    const id = req.params?.id || req.body?.id || req.body?.candidateId;
    const { action, notes, targetStage } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, message: 'Candidate ID is required.' });
    }

    const candidate = await prisma.candidate.findUnique({ where: { id } });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    const oldStage = candidate.stage || 'applied';
    let newStage = targetStage;

    if (!newStage) {
      if (action === 'shortlist' || action === 'move_to_shortlist') {
        newStage = 'shortlisted';
      } else if (action === 'reject') {
        newStage = 'rejected';
      } else if (action === 'interview') {
        newStage = 'interview';
      } else {
        newStage = 'shortlisted';
      }
    }

    const hrNotes = notes || (action === 'shortlist' ?
      'Shortlisted by HR based on high AI Fit Score calibration.' 
      : (action === 'reject' ? 'Rejected after HR screening review.' : `Stage moved to ${newStage}.`));

    // 1. Update candidate record
    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        stage: newStage,
        notes: candidate.notes ? `${candidate.notes}\n[HR Update]: ${hrNotes}` : hrNotes
      }
    });

    // 2. Update linked evaluation if present
    if (candidate.evaluationId) {
      await prisma.evaluation.update({
        where: { id: candidate.evaluationId },
        data: {
          pipelineStage: newStage,
          status: newStage === 'rejected' ? 'rejected' : 'shortlisted',
          hmNotes: hrNotes
        }
      }).catch(() => {});
    }

    // Invalidate candidate queue caches
    const redisCacheService = require('../services/redisCacheService');
    await redisCacheService.delPattern('candidates:*');

    // 3. Record permanent Audit Log
    const actorEmail = req.user?.email || req.session?.user?.email || 'hr@rankly.ai';
    const actorId = req.user?.id || req.session?.userId || null;
    const actorRole = req.user?.role || req.session?.user?.role || 'hr';

    await recordAuditLog({
      action: action === 'reject' ? 'CANDIDATE_REJECTED' : 'HR_SHORTLIST_CANDIDATE',
      actorId,
      actorEmail,
      actorRole,
      targetType: 'candidate',
      targetId: candidate.id,
      targetName: candidate.name,
      previousStage: oldStage,
      newStage,
      details: {
        notes: hrNotes,
        score: candidate.score,
        targetRole: candidate.targetRole,
        actionTriggered: action || 'status_change',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null
      }
    });

    // 4. Automated Candidate Email Notification
    if (candidate.email) {
      sendCandidateStatusNotification(
        candidate.email,
        candidate.name,
        candidate.targetRole,
        newStage,
        hrNotes
      ).catch(e => console.warn('[Auto-Email] Notification warning:', e.message));

      if (candidate.userId) {
        createNotification(
          candidate.userId,
          'Application Status Updated',
          `Your application for ${candidate.targetRole} is now: ${newStage.toUpperCase().replace('_', ' ')}.`,
          newStage === 'rejected' ? 'warning' : 'success',
          '#tab-applications'
        ).catch(e => console.warn('[Auto-Notification] Warning:', e.message));
      }
    }

    return res.json({
      success: true,
      message: action === 'reject' 
        ? `Candidate ${candidate.name} has been rejected. Audit log recorded.`
        : `Candidate ${candidate.name} moved to HR Shortlist successfully! Audit log recorded.`,
      candidate: formatCandidate(updated),
      auditLogged: true
    });
  } catch (error) {
    console.error('Candidate Fast Action Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process candidate action: ' + error.message });
  }
}

/**
 * 5. Get Candidate Audit Logs
 */
async function getCandidateAuditLogs(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await getRecentAuditLogs(limit);
    return res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
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

    // Record audit log for new candidate creation
    await recordAuditLog({
      action: 'CANDIDATE_CREATED',
      actorEmail: req.user?.email || req.session?.user?.email || 'hr@rankly.ai',
      actorRole: req.user?.role || 'hr',
      targetType: 'candidate',
      targetId: candidate.id,
      targetName: candidate.name,
      newStage: stage,
      details: { targetRole, score }
    });

    return res.status(201).json({
      success: true,
      message: 'Candidate created successfully.',
      candidate: formatCandidate(candidate)
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
    const id = req.params?.id || req.body?.id || req.body?.candidateId;
    const { stage, notes } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, message: 'Candidate ID is required.' });
    }

    const validStages = ['applied', 'ai_screened', 'screening', 'shortlisted', 'hm_review', 'interview', 'offer', 'offered', 'hired', 'rejected'];
    if (!stage || !validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Allowed: ${validStages.join(', ')}`
      });
    }

    const prevCandidate = await prisma.candidate.findUnique({ where: { id } });
    const oldStage = prevCandidate ? prevCandidate.stage : 'unknown';

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        stage,
        notes: notes !== undefined ? notes : undefined
      }
    });

    if (candidate.evaluationId) {
      await prisma.evaluation.update({
        where: { id: candidate.evaluationId },
        data: { pipelineStage: stage }
      }).catch(() => {});
    }

    // Record audit log
    await recordAuditLog({
      action: 'STAGE_UPDATED',
      actorEmail: req.user?.email || req.session?.user?.email || 'hr@rankly.ai',
      actorRole: req.user?.role || 'hr',
      targetType: 'candidate',
      targetId: candidate.id,
      targetName: candidate.name,
      previousStage: oldStage,
      newStage: stage,
      details: { notes }
    });

    // Send candidate email
    if (candidate.email) {
      sendCandidateStatusNotification(
        candidate.email,
        candidate.name,
        candidate.targetRole,
        stage,
        notes || `Your application status has been moved to ${stage.toUpperCase()}.`
      ).catch(e => console.warn('[Auto-Email] Notification warning:', e.message));

      if (candidate.userId) {
        createNotification(
          candidate.userId,
          'Application Stage Changed',
          `Your application for ${candidate.targetRole} has transitioned to: ${stage.toUpperCase().replace('_', ' ')}.`,
          stage === 'rejected' ? 'warning' : 'success',
          '#tab-applications'
        ).catch(e => console.warn('[Auto-Notification] Warning:', e.message));
      }
    }

    return res.json({
      success: true,
      message: `Candidate moved to stage "${stage}". Audit log recorded.`,
      candidate: formatCandidate(candidate)
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

    return res.json({ success: true, message: 'Notes updated.', candidate: formatCandidate(candidate) });
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
 * 6. Schedule Candidate Interview & Dispatch Calendar Invite
 */
async function scheduleCandidateInterview(req, res) {
  try {
    const {
      candidateId,
      interviewRound,
      scheduledDate,
      scheduledTime,
      meetingPlatform,
      meetingLink,
      notes
    } = req.body || {};

    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'Candidate ID is required to schedule interview.' });
    }

    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate record not found.' });
    }

    const round = interviewRound || 'Technical Interview Round';
    const dateStr = scheduledDate || new Date().toISOString().split('T')[0];
    const timeStr = scheduledTime || '10:00 AM IST';
    const platform = meetingPlatform || 'Google Meet';
    const link = meetingLink || 'https://meet.google.com';

    // 1. Update candidate stage to 'interview'
    const updatedNotes = candidate.notes ?
      `${candidate.notes}\n[Interview Scheduled]: ${round} on ${dateStr} at ${timeStr} (${platform})`
      : `[Interview Scheduled]: ${round} on ${dateStr} at ${timeStr} (${platform})`;

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        stage: 'interview',
        notes: updatedNotes
      }
    });

    // 2. Update linked evaluation
    if (candidate.evaluationId) {
      await prisma.evaluation.update({
        where: { id: candidate.evaluationId },
        data: {
          pipelineStage: 'interview',
          status: 'shortlisted',
          hmNotes: updatedNotes
        }
      }).catch(() => {});
    }

    // 3. Record Audit Log
    const actorEmail = req.user?.email || req.session?.user?.email || 'hr@rankly.ai';
    await recordAuditLog({
      action: 'INTERVIEW_SCHEDULED',
      actorId: req.user?.id || req.session?.userId || null,
      actorEmail,
      actorRole: req.user?.role || req.session?.user?.role || 'hr',
      targetType: 'candidate',
      targetId: candidate.id,
      targetName: candidate.name,
      previousStage: candidate.stage,
      newStage: 'interview',
      details: {
        round,
        scheduledDate: dateStr,
        scheduledTime: timeStr,
        platform,
        meetingLink: link,
        notes
      }
    });

    // 4. Dispatch Email with Calendar Invite
    if (candidate.email) {
      const { sendInterviewScheduledEmail } = require('../services/emailService');
      sendInterviewScheduledEmail({
        to: candidate.email,
        candidateName: candidate.name,
        roleTitle: candidate.targetRole,
        interviewRound: round,
        scheduledDate: dateStr,
        scheduledTime: timeStr,
        meetingPlatform: platform,
        meetingLink: link,
        notes
      }).catch(e => console.warn('[Auto-Email] Interview scheduling email warning:', e.message));
    }

    return res.json({
      success: true,
      message: `Interview for ${candidate.name} scheduled on ${dateStr} at ${timeStr} (${platform}). Email invitation dispatched.`,
      candidate: formatCandidate(updated)
    });
  } catch (error) {
    console.error('Schedule Interview Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule interview: ' + error.message });
  }
}

/**
 * 7. Bulk Action on Multiple Candidates (Bulk Shortlist / Bulk Reject / Bulk Export)
 */
async function performBulkCandidateAction(req, res) {
  try {
    const { candidateIds, action, notes } = req.body || {};

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of candidate IDs is required.' });
    }

    let targetStage = 'shortlisted';
    if (action === 'reject' || action === 'bulk_reject') targetStage = 'rejected';
    if (action === 'interview' || action === 'bulk_interview') targetStage = 'interview';

    const actorEmail = req.user?.email || req.session?.user?.email || 'hr@rankly.ai';
    const hrNotes = notes || `Bulk action: ${action.toUpperCase()} performed by HR.`;

    const updatedCandidates = [];

    for (const cid of candidateIds) {
      try {
        const c = await prisma.candidate.findUnique({ where: { id: cid } });
        if (!c) continue;

        const updated = await prisma.candidate.update({
          where: { id: cid },
          data: {
            stage: targetStage,
            notes: c.notes ? `${c.notes}\n[Bulk Update]: ${hrNotes}` : hrNotes
          }
        });

        // Audit Log per candidate
        await recordAuditLog({
          action: action === 'reject' ? 'BULK_CANDIDATE_REJECTED' : 'BULK_CANDIDATE_SHORTLISTED',
          actorEmail,
          targetType: 'candidate',
          targetId: c.id,
          targetName: c.name,
          previousStage: c.stage,
          newStage: targetStage,
          details: { action, hrNotes }
        });

        // Auto Email per candidate
        if (c.email) {
          sendCandidateStatusNotification(c.email, c.name, c.targetRole, targetStage, hrNotes)
            .catch(e => console.warn('[Bulk-Email Warning]:', e.message));
        }

        updatedCandidates.push(updated);
      } catch (innerErr) {
        console.warn(`[Bulk-Action] Failed for candidate ${cid}:`, innerErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Successfully processed ${updatedCandidates.length} of ${candidateIds.length} candidates with action: ${action}.`,
      processedCount: updatedCandidates.length,
      targetStage
    });
  } catch (error) {
    console.error('Bulk Candidate Action Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process bulk candidate action: ' + error.message });
  }
}

/**
 * Delete Candidate
 */
async function deleteCandidate(req, res) {
  try {
    const { id } = req.params;
    const candidate = await prisma.candidate.findUnique({ where: { id } });
    await prisma.candidate.delete({ where: { id } });

    if (candidate) {
      const redisCacheService = require('../services/redisCacheService');
      await redisCacheService.delPattern('candidates:*');

      await recordAuditLog({
        action: 'CANDIDATE_DELETED',
        actorEmail: req.user?.email || req.session?.user?.email || 'hr@rankly.ai',
        targetType: 'candidate',
        targetId: id,
        targetName: candidate.name,
        details: { targetRole: candidate.targetRole }
      });
    }

    return res.json({ success: true, message: 'Candidate deleted from pipeline.' });
  } catch (error) {
    console.error('Delete Candidate Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete candidate.' });
  }
}

module.exports = {
  getCandidates,
  getAiCandidateQueue,
  getCandidateCheatSheet,
  performCandidateAction,
  scheduleCandidateInterview,
  performBulkCandidateAction,
  getCandidateAuditLogs,
  createCandidate,
  getCandidateById,
  updateCandidateStage,
  updateCandidateNotes,
  notifyCandidate,
  deleteCandidate
};

