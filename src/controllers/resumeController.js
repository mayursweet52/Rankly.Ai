const fs = require('fs');
const prisma = require('../config/database');
const { extractTextFromDocument, extractCandidateInfoFromText } = require('../utils/helpers');
const { screenResume, detectRole } = require('../services/aiService');

/**
 * Screen Resume (Single Candidate Upload)
 */
async function screenResumeHandler(req, res) {
  try {
    const file = req.file;
    const {
      targetRole = 'Software Engineer',
      jobDescription = '',
      isPractice = false,
      candidateName: inputName,
      candidateEmail: inputEmail,
      candidatePhone: inputPhone
    } = req.body;

    let resumeText = req.body.resumeText || '';
    let resumeFileName = '';
    let resumeFilePath = '';

    if (file) {
      resumeFileName = file.originalname;
      resumeFilePath = file.path;
      let fileBuffer = fs.readFileSync(file.path);
      resumeText = await extractTextFromDocument(fileBuffer, file.mimetype, file.originalname);
      fileBuffer = null; // Explicitly release binary buffer for immediate GC
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from the uploaded document. Please upload a clear PDF, DOCX, or TXT file.'
      });
    }

    // Auto extract candidate contact info from text
    const extractedInfo = extractCandidateInfoFromText(resumeText, resumeFileName);
    const candidateName = inputName || extractedInfo.name;
    const candidateEmail = inputEmail || extractedInfo.email;
    const candidatePhone = inputPhone || extractedInfo.phone;

    // Execute Multi-Tier AI Screening
    const evaluation = await screenResume(resumeText, targetRole, jobDescription, resumeFileName);

    const userId = req.user ? req.user.id : null;
    const organizationId = req.user ? req.user.organizationId : null;

    // Save Evaluation to SQLite via Prisma
    const savedEvaluation = await prisma.evaluation.create({
      data: {
        userId,
        organizationId,
        isPractice: isPractice === true || isPractice === 'true',
        candidateName,
        candidateEmail,
        candidatePhone,
        targetRole,
        resumeFileName,
        resumeFilePath,
        extractedText: resumeText.slice(0, 5000), // store preview
        matchScore: evaluation.matchScore || 0,
        skillsScore: evaluation.scoreBreakdown?.skills || 0,
        experienceScore: evaluation.scoreBreakdown?.experience || 0,
        toolsScore: evaluation.scoreBreakdown?.tools || 0,
        educationScore: evaluation.scoreBreakdown?.education || 0,
        fitVerdict: evaluation.fitVerdict || 'Potential Fit',
        summary: evaluation.summary || '',
        matchedSkills: JSON.stringify(evaluation.matchedSkills || []),
        missingSkills: JSON.stringify(evaluation.missingSkills || []),
        recommendations: JSON.stringify(evaluation.recommendations || []),
        pipelineStage: 'ai_screened',
        status: 'screened'
      }
    });

    // If Enterprise / HR user, also automatically register in Pipeline Candidates
    let pipelineCandidate = null;
    if (organizationId || req.user?.accountType === 'employee') {
      pipelineCandidate = await prisma.candidate.create({
        data: {
          name: candidateName,
          email: candidateEmail,
          phone: candidatePhone,
          targetRole,
          stage: 'ai_screened',
          score: evaluation.matchScore || 0,
          skillsScore: evaluation.scoreBreakdown?.skills || 0,
          experienceScore: evaluation.scoreBreakdown?.experience || 0,
          toolsScore: evaluation.scoreBreakdown?.tools || 0,
          educationScore: evaluation.scoreBreakdown?.education || 0,
          fitVerdict: evaluation.fitVerdict || 'Potential Fit',
          summary: evaluation.summary || '',
          matchedSkills: JSON.stringify(evaluation.matchedSkills || []),
          missingSkills: JSON.stringify(evaluation.missingSkills || []),
          recommendations: JSON.stringify(evaluation.recommendations || []),
          organizationId,
          userId,
          evaluationId: savedEvaluation.id,
          resumeUrl: resumeFilePath ? `/uploads/${file.filename}` : null
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Resume screening completed successfully.',
      evaluation: {
        id: savedEvaluation.id,
        candidateName,
        candidateEmail,
        candidatePhone,
        targetRole,
        matchScore: evaluation.matchScore,
        scoreBreakdown: evaluation.scoreBreakdown,
        fitVerdict: evaluation.fitVerdict,
        summary: evaluation.summary,
        matchedSkills: evaluation.matchedSkills,
        missingSkills: evaluation.missingSkills,
        recommendations: evaluation.recommendations,
        pipelineStage: savedEvaluation.pipelineStage,
        status: savedEvaluation.status,
        createdAt: savedEvaluation.createdAt,
        candidateId: pipelineCandidate?.id
      }
    });
  } catch (error) {
    console.error('Resume Screening Error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during resume screening: ' + error.message
    });
  }
}

/**
 * Detect Job Role from Resume
 */
async function detectRoleHandler(req, res) {
  try {
    const file = req.file;
    let resumeText = req.body.resumeText || '';

    if (file) {
      let fileBuffer = fs.readFileSync(file.path);
      resumeText = await extractTextFromDocument(fileBuffer, file.mimetype, file.originalname);
      fileBuffer = null;
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({ success: false, message: 'Please upload a valid resume to detect role.' });
    }

    const detection = await detectRole(resumeText);

    return res.json({
      success: true,
      detection
    });
  } catch (error) {
    console.error('Detect Role Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to detect role from resume.' });
  }
}

/**
 * Batch Resume Upload & Screening
 */
async function batchUploadHandler(req, res) {
  try {
    const files = req.files;
    const { targetRole = 'Software Engineer' } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No resume files were uploaded.' });
    }

    const results = [];
    const userId = req.user?.id || null;
    const organizationId = req.user?.organizationId || null;

    for (const file of files) {
      try {
        let fileBuffer = fs.readFileSync(file.path);
        const resumeText = await extractTextFromDocument(fileBuffer, file.mimetype, file.originalname);
        fileBuffer = null;
        const extracted = extractCandidateInfoFromText(resumeText, file.originalname);

        const evaluation = await screenResume(resumeText, targetRole, '', file.originalname);

        const savedEval = await prisma.evaluation.create({
          data: {
            userId,
            organizationId,
            candidateName: extracted.name,
            candidateEmail: extracted.email,
            candidatePhone: extracted.phone,
            targetRole,
            resumeFileName: file.originalname,
            resumeFilePath: file.path,
            matchScore: evaluation.matchScore || 0,
            skillsScore: evaluation.scoreBreakdown?.skills || 0,
            experienceScore: evaluation.scoreBreakdown?.experience || 0,
            toolsScore: evaluation.scoreBreakdown?.tools || 0,
            educationScore: evaluation.scoreBreakdown?.education || 0,
            fitVerdict: evaluation.fitVerdict || 'Potential Fit',
            summary: evaluation.summary || '',
            matchedSkills: JSON.stringify(evaluation.matchedSkills || []),
            missingSkills: JSON.stringify(evaluation.missingSkills || []),
            recommendations: JSON.stringify(evaluation.recommendations || []),
            pipelineStage: 'ai_screened',
            status: 'screened'
          }
        });

        const candidate = await prisma.candidate.create({
          data: {
            name: extracted.name,
            email: extracted.email,
            phone: extracted.phone,
            targetRole,
            stage: 'ai_screened',
            score: evaluation.matchScore || 0,
            skillsScore: evaluation.scoreBreakdown?.skills || 0,
            experienceScore: evaluation.scoreBreakdown?.experience || 0,
            toolsScore: evaluation.scoreBreakdown?.tools || 0,
            educationScore: evaluation.scoreBreakdown?.education || 0,
            fitVerdict: evaluation.fitVerdict,
            summary: evaluation.summary,
            matchedSkills: JSON.stringify(evaluation.matchedSkills || []),
            missingSkills: JSON.stringify(evaluation.missingSkills || []),
            recommendations: JSON.stringify(evaluation.recommendations || []),
            organizationId,
            userId,
            evaluationId: savedEval.id,
            resumeUrl: `/uploads/${file.filename}`
          }
        });

        results.push({
          candidateId: candidate.id,
          candidateName: extracted.name,
          score: evaluation.matchScore,
          fitVerdict: evaluation.fitVerdict,
          status: 'success'
        });
      } catch (fileErr) {
        results.push({
          fileName: file.originalname,
          status: 'failed',
          error: fileErr.message
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Processed ${results.length} resumes.`,
      results
    });
  } catch (error) {
    console.error('Batch Upload Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process batch upload.' });
  }
}

/**
 * Get Evaluations History
 */
async function getEvaluations(req, res) {
  try {
    const userId = req.user?.id;
    const orgId = req.user?.organizationId;
    const { targetRole, search } = req.query;

    const where = {};
    if (orgId) {
      where.OR = [{ organizationId: orgId }, { userId }];
    } else if (userId) {
      where.userId = userId;
    }

    if (targetRole) {
      where.targetRole = { contains: targetRole };
    }

    if (search) {
      where.OR = [
        { candidateName: { contains: search } },
        { targetRole: { contains: search } }
      ];
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    const parsed = evaluations.map(e => ({
      ...e,
      matchedSkills: JSON.parse(e.matchedSkills || '[]'),
      missingSkills: JSON.parse(e.missingSkills || '[]'),
      recommendations: JSON.parse(e.recommendations || '[]')
    }));

    return res.json({ success: true, evaluations: parsed });
  } catch (error) {
    console.error('Get Evaluations Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve evaluations.' });
  }
}

/**
 * Get Evaluation By ID
 */
async function getEvaluationById(req, res) {
  try {
    const { id } = req.params;
    const evaluation = await prisma.evaluation.findUnique({ where: { id } });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluation not found.' });
    }

    const parsed = {
      ...evaluation,
      matchedSkills: JSON.parse(evaluation.matchedSkills || '[]'),
      missingSkills: JSON.parse(evaluation.missingSkills || '[]'),
      recommendations: JSON.parse(evaluation.recommendations || '[]')
    };

    return res.json({ success: true, evaluation: parsed });
  } catch (error) {
    console.error('Get Evaluation By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve evaluation.' });
  }
}

/**
 * Send Evaluation to HR
 */
async function sendToHR(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        status: 'sent_to_hr',
        hmNotes: notes || undefined
      }
    });

    // Update candidate if exists
    await prisma.candidate.updateMany({
      where: { evaluationId: id },
      data: { stage: 'hm_review', notes: notes || undefined }
    });

    return res.json({ success: true, message: 'Evaluation sent to HR successfully.', evaluation: updated });
  } catch (error) {
    console.error('Send To HR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to forward evaluation.' });
  }
}

/**
 * Delete Evaluation
 */
async function deleteEvaluation(req, res) {
  try {
    const { id } = req.params;
    await prisma.evaluation.delete({ where: { id } });
    await prisma.candidate.deleteMany({ where: { evaluationId: id } });

    return res.json({ success: true, message: 'Evaluation deleted successfully.' });
  } catch (error) {
    console.error('Delete Evaluation Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete evaluation.' });
  }
}

module.exports = {
  screenResumeHandler,
  detectRoleHandler,
  batchUploadHandler,
  getEvaluations,
  getEvaluationById,
  sendToHR,
  deleteEvaluation
};
