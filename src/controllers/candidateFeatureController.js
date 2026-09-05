const fs = require('fs');
const prisma = require('../config/database');
const { extractTextFromDocument } = require('../utils/helpers');
const { 
  calculateAtsScoreWithJd, 
  generateCoverLetterAi, 
  calculateSkillGap,
  ROLE_BENCHMARKS 
} = require('../services/aiService');
const { 
  generateResumeDocx, 
  generateResumePdf, 
  generateCoverLetterDocx 
} = require('../services/exportService');

/**
 * 1. ATS Score Checker (Resume + Job Description Matcher)
 */
async function checkAtsScoreHandler(req, res) {
  try {
    const file = req.file;
    const {
      targetRole = 'Software Engineer',
      jobDescription = '',
      candidateName = ''
    } = req.body || {};

    let resumeText = (req.body && req.body.resumeText) ? req.body.resumeText : '';
    let fileName = '';

    if (file) {
      fileName = file.originalname;
      try {
        const fileBuffer = fs.readFileSync(file.path);
        resumeText = await extractTextFromDocument(fileBuffer, file.mimetype, file.originalname);
      } catch (extractErr) {
        console.error('Text extraction error:', extractErr);
      }
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Please provide resume content by uploading a PDF/DOCX file or pasting resume text (min 20 characters).'
      });
    }

    const atsResult = await calculateAtsScoreWithJd(resumeText, jobDescription, targetRole);

    return res.json({
      success: true,
      targetRole,
      fileName,
      candidateName,
      ...atsResult
    });
  } catch (err) {
    console.error('ATS Score Check Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate ATS score: ' + err.message
    });
  }
}

/**
 * 2. Multi-Format Resume Exporter (Instant PDF & DOCX)
 */
async function exportResumeHandler(req, res) {
  try {
    const { format = 'docx', ...resumeData } = req.body || {};
    const candidateName = (resumeData.name || 'Candidate').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();

    if (String(format).toLowerCase() === 'pdf') {
      const pdfBuffer = await generateResumePdf(resumeData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${candidateName}_Resume.pdf"`);
      return res.send(pdfBuffer);
    } else {
      const docxBuffer = await generateResumeDocx(resumeData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${candidateName}_Resume.docx"`);
      return res.send(docxBuffer);
    }
  } catch (err) {
    console.error('Export Resume Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to export resume document: ' + err.message
    });
  }
}

/**
 * 3. AI Cover Letter Generator
 */
async function generateCoverLetterHandler(req, res) {
  try {
    const {
      candidateName = 'Candidate',
      targetRole = 'Software Engineer',
      companyName = 'Target Company',
      resumeText = '',
      jobDescription = '',
      tone = 'professional'
    } = req.body || {};

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the Target Company name.'
      });
    }

    const result = await generateCoverLetterAi({
      candidateName,
      targetRole,
      companyName,
      resumeText,
      jobDescription,
      tone
    });

    return res.json(result);
  } catch (err) {
    console.error('Cover Letter Generation Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate cover letter: ' + err.message
    });
  }
}

/**
 * Export Cover Letter as DOCX
 */
async function exportCoverLetterHandler(req, res) {
  try {
    const {
      candidateName = 'Candidate',
      candidateEmail = '',
      candidatePhone = '',
      targetRole = 'Software Engineer',
      companyName = 'Company',
      letterContent = ''
    } = req.body || {};

    const cleanCompany = (companyName || 'Company').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    const docxBuffer = await generateCoverLetterDocx({
      candidateName,
      candidateEmail,
      candidatePhone,
      targetRole,
      companyName: cleanCompany,
      letterContent
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Cover_Letter_${cleanCompany}.docx"`);
    return res.send(docxBuffer);
  } catch (err) {
    console.error('Export Cover Letter Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to export cover letter: ' + err.message
    });
  }
}

/**
 * 4. Interactive Skill Gap & Badge Finder
 */
async function getSkillGapHandler(req, res) {
  try {
    const skills = req.body?.skills || req.query?.skills || [];
    const role = req.body?.role || req.query?.role || 'software-engineer';

    const gapReport = calculateSkillGap(skills, role);
    return res.json(gapReport);
  } catch (err) {
    console.error('Skill Gap Analysis Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze skill gaps: ' + err.message
    });
  }
}

/**
 * 5. Candidate Application Tracker: List Applications
 */
async function getApplicationsHandler(req, res) {
  try {
    const userId = req.session?.userId || (req.user && req.user.id) || null;
    const sessionEmail = req.session?.user?.email || (req.user && req.user.email) || req.query?.email || null;

    const whereConditions = [];
    if (userId) {
      whereConditions.push({ userId });
    }
    if (sessionEmail) {
      whereConditions.push({ candidateEmail: sessionEmail.toLowerCase().trim() });
    }

    let applications = [];
    if (whereConditions.length > 0) {
      applications = await prisma.candidateApplication.findMany({
        where: { OR: whereConditions },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Also check for any linked employer candidate records for live updates
    let employerEvaluations = [];
    if (sessionEmail || userId) {
      const candWhere = [];
      if (sessionEmail) candWhere.push({ email: sessionEmail.toLowerCase().trim() });
      if (userId) candWhere.push({ userId });

      employerEvaluations = await prisma.candidate.findMany({
        where: { OR: candWhere },
        select: {
          id: true,
          targetRole: true,
          stage: true,
          score: true,
          createdAt: true,
          organization: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Default sample/starter applications if user has no records yet
    if (applications.length === 0 && employerEvaluations.length === 0) {
      applications = [
        {
          id: 'starter_app_1',
          companyName: 'TechCorp Solutions',
          jobTitle: 'Senior Full Stack Engineer',
          location: 'Remote / Bengaluru',
          salaryRange: '₹22 - 28 LPA',
          appliedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          stage: 'interview',
          notes: 'Technical round scheduled on Friday at 3:00 PM',
          nextStep: 'System Design Interview',
          matchScore: 88
        },
        {
          id: 'starter_app_2',
          companyName: 'Nexus AI Labs',
          jobTitle: 'AI Solutions Architect',
          location: 'Hyderabad (Hybrid)',
          salaryRange: '₹30 - 36 LPA',
          appliedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          stage: 'shortlisted',
          notes: 'ATS Screening passed with 92% match. Recruiter reached out via LinkedIn.',
          nextStep: 'Managerial Screening',
          matchScore: 92
        },
        {
          id: 'starter_app_3',
          companyName: 'Innovate Digital',
          jobTitle: 'Frontend Engineer (React/TypeScript)',
          location: 'Pune / Remote',
          salaryRange: '₹18 - 22 LPA',
          appliedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          stage: 'under_review',
          notes: 'Applied via company portal. Status shows Under Review.',
          nextStep: 'Awaiting Screening Results',
          matchScore: 78
        }
      ];
    }

    return res.json({
      success: true,
      count: applications.length,
      applications,
      employerEvaluations
    });
  } catch (err) {
    console.error('Get Applications Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications: ' + err.message
    });
  }
}

/**
 * Candidate Application Tracker: Create Application
 */
async function createApplicationHandler(req, res) {
  try {
    const {
      companyName,
      jobTitle,
      location = '',
      salaryRange = '',
      jobUrl = '',
      stage = 'applied',
      notes = '',
      nextStep = '',
      matchScore = null
    } = req.body || {};

    if (!companyName || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: 'Company name and Job title are required.'
      });
    }

    const userId = req.session?.userId || (req.user && req.user.id) || null;
    const candidateEmail = req.session?.user?.email || (req.user && req.user.email) || null;

    const newApp = await prisma.candidateApplication.create({
      data: {
        userId,
        candidateEmail,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        location: location.trim(),
        salaryRange: salaryRange.trim(),
        jobUrl: jobUrl.trim(),
        stage: stage || 'applied',
        notes: notes ? notes.trim() : null,
        nextStep: nextStep ? nextStep.trim() : null,
        matchScore: matchScore ? parseFloat(matchScore) : null
      }
    });

    return res.json({
      success: true,
      message: 'Application added to tracking pipeline!',
      application: newApp
    });
  } catch (err) {
    console.error('Create Application Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create application: ' + err.message
    });
  }
}

/**
 * Candidate Application Tracker: Update Application
 */
async function updateApplicationHandler(req, res) {
  try {
    const { id } = req.params;
    const { stage, notes, nextStep, salaryRange, location } = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, message: 'Application ID is required' });
    }

    // Handle starter demo items gracefully
    if (id.startsWith('starter_app_')) {
      return res.json({
        success: true,
        message: 'Demo application updated.',
        application: { id, stage, notes, nextStep, salaryRange, location }
      });
    }

    const updated = await prisma.candidateApplication.update({
      where: { id },
      data: {
        ...(stage ? { stage } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(nextStep !== undefined ? { nextStep } : {}),
        ...(salaryRange !== undefined ? { salaryRange } : {}),
        ...(location !== undefined ? { location } : {})
      }
    });

    return res.json({
      success: true,
      message: 'Application updated successfully.',
      application: updated
    });
  } catch (err) {
    console.error('Update Application Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update application: ' + err.message
    });
  }
}

/**
 * Candidate Application Tracker: Delete Application
 */
async function deleteApplicationHandler(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Application ID is required' });
    }

    if (id.startsWith('starter_app_')) {
      return res.json({ success: true, message: 'Demo application removed.' });
    }

    await prisma.candidateApplication.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Application removed from tracking pipeline.'
    });
  } catch (err) {
    console.error('Delete Application Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete application: ' + err.message
    });
  }
}

module.exports = {
  checkAtsScoreHandler,
  exportResumeHandler,
  generateCoverLetterHandler,
  exportCoverLetterHandler,
  getSkillGapHandler,
  getApplicationsHandler,
  createApplicationHandler,
  updateApplicationHandler,
  deleteApplicationHandler
};
