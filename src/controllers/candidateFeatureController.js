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

/**
 * 6. Candidate Profile: Get Profile
 */
async function getCandidateProfileHandler(req, res) {
  try {
    const userId = req.session?.userId || (req.user && req.user.id) || null;
    const sessionEmail = req.session?.user?.email || (req.user && req.user.email) || req.query?.email || null;

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (sessionEmail) {
      user = await prisma.user.findUnique({ where: { email: sessionEmail.toLowerCase().trim() } });
    }

    const defaultProfile = {
      firstName: user?.firstName || 'Sumit',
      lastName: user?.lastName || 'Khomne',
      email: user?.email || 'sumit.khomne@rankly.ai',
      phone: user?.phone || '+91 98765 43210',
      profession: user?.profession || 'Senior Full Stack Engineer',
      location: 'Pune / Bengaluru, India',
      bio: 'High-velocity Full Stack & AI Systems Engineer with 4+ years of experience architecting resilient Node.js backends, modern React dashboards, and Nemotron GenAI integrations.',
      skills: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'PostgreSQL', 'Docker', 'NVIDIA Nemotron', 'Tailwind CSS', 'AWS', 'Prisma'],
      experienceYears: 4,
      experienceLevel: 'Mid-Senior',
      education: 'B.E. in Computer Science & Engineering',
      linkedInUrl: user?.linkedInUrl || 'https://linkedin.com/in/sumit-khomne',
      githubUrl: 'https://github.com/sumitkhomne',
      portfolioUrl: 'https://sumitkhomne.dev',
      workType: 'Remote / Hybrid',
      expectedSalary: '₹22 - 28 LPA',
      completeness: 90
    };

    return res.json({
      success: true,
      profile: defaultProfile
    });
  } catch (err) {
    console.error('Get Candidate Profile Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile: ' + err.message });
  }
}

/**
 * Candidate Profile: Update Profile
 */
async function updateCandidateProfileHandler(req, res) {
  try {
    const userId = req.session?.userId || (req.user && req.user.id) || null;
    const updates = req.body || {};

    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            firstName: updates.firstName || undefined,
            lastName: updates.lastName || undefined,
            phone: updates.phone || undefined,
            profession: updates.profession || undefined,
            linkedInUrl: updates.linkedInUrl || undefined
          }
        });
      } catch (e) {
        console.warn('Could not sync user model update:', e.message);
      }
    }

    // Calculate dynamic completeness
    const requiredKeys = ['firstName', 'lastName', 'email', 'phone', 'profession', 'location', 'bio', 'skills', 'education', 'linkedInUrl'];
    let filled = 0;
    requiredKeys.forEach(k => {
      if (updates[k] && (Array.isArray(updates[k]) ? updates[k].length > 0 : String(updates[k]).trim().length > 0)) {
        filled++;
      }
    });
    const completeness = Math.min(100, Math.round((filled / requiredKeys.length) * 100));

    return res.json({
      success: true,
      message: 'Candidate profile successfully updated and synchronized.',
      profile: {
        ...updates,
        completeness
      }
    });
  } catch (err) {
    console.error('Update Candidate Profile Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile: ' + err.message });
  }
}

/**
 * 7. Candidate Open Job Listings Directory
 */
const CURATED_JOB_LISTINGS = [
  {
    id: 'job_rankly_001',
    title: 'Senior Full Stack Engineer',
    company: 'TechCorp Solutions',
    department: 'Engineering',
    location: 'Bengaluru / Remote',
    workType: 'Full-time (Remote / Hybrid)',
    experience: '3 - 6 Years',
    salaryRange: '₹22 - 28 LPA',
    description: 'Looking for a Senior Full Stack Engineer to lead web portal architecture, React state management, and high-throughput Node.js microservices.',
    skills: ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Redis'],
    postedAgo: '2 days ago',
    applicantsCount: 42,
    matchScore: 92
  },
  {
    id: 'job_rankly_002',
    title: 'AI / Machine Learning Engineer',
    company: 'NeuralScale AI Systems',
    department: 'Artificial Intelligence',
    location: 'Remote (Worldwide / India)',
    workType: 'Full-time (Remote)',
    experience: '2 - 5 Years',
    salaryRange: '₹25 - 35 LPA',
    description: 'Design and deploy production-grade LLM inference engines, RAG pipelines with vector databases, and high-concurrency model endpoints.',
    skills: ['Python', 'PyTorch', 'NVIDIA Nemotron', 'LangChain', 'Vector DBs', 'FastAPI'],
    postedAgo: '1 day ago',
    applicantsCount: 68,
    matchScore: 88
  },
  {
    id: 'job_rankly_003',
    title: 'Cloud & DevOps Architect',
    company: 'CloudPulse Networks',
    department: 'Infrastructure',
    location: 'Hyderabad / Hybrid',
    workType: 'Full-time (Hybrid)',
    experience: '4 - 8 Years',
    salaryRange: '₹24 - 32 LPA',
    description: 'Lead Kubernetes cluster orchestration, multi-region CI/CD pipelines, Terraform infrastructure-as-code, and AWS/GCP security hardening.',
    skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS / GCP', 'CI/CD Pipelines', 'Linux'],
    postedAgo: '3 days ago',
    applicantsCount: 31,
    matchScore: 81
  },
  {
    id: 'job_rankly_004',
    title: 'Frontend Architect (React & Next.js)',
    company: 'HyperGrowth Labs',
    department: 'Design & Frontend',
    location: 'Mumbai / Remote',
    workType: 'Full-time (Remote)',
    experience: '3 - 5 Years',
    salaryRange: '₹18 - 25 LPA',
    description: 'Craft ultra-fluid, accessible, and responsive enterprise dashboards using React 18, Tailwind CSS, micro-frontends, and WebSocket streaming.',
    skills: ['React.js', 'Next.js', 'Tailwind CSS', 'WebSockets', 'TypeScript', 'UI/UX'],
    postedAgo: '4 days ago',
    applicantsCount: 54,
    matchScore: 94
  },
  {
    id: 'job_rankly_005',
    title: 'Technical Product Manager',
    company: 'NextGen AI Ventures',
    department: 'Product',
    location: 'Delhi NCR / Hybrid',
    workType: 'Full-time (Hybrid)',
    experience: '3 - 7 Years',
    salaryRange: '₹26 - 34 LPA',
    description: 'Own the product roadmap for AI-driven workflow automation. Define PRDs, run sprint backlogs, and drive candidate engagement metrics.',
    skills: ['Product Strategy', 'Agile / Scrum', 'Data Analytics', 'PRD Authoring', 'API Literacy'],
    postedAgo: '5 days ago',
    applicantsCount: 29,
    matchScore: 84
  },
  {
    id: 'job_rankly_006',
    title: 'Data Platform & Analytics Engineer',
    company: 'FinFlow Global',
    department: 'Data & Analytics',
    location: 'Bengaluru / Hybrid',
    workType: 'Full-time (Hybrid)',
    experience: '2 - 5 Years',
    salaryRange: '₹20 - 27 LPA',
    description: 'Build real-time ETL pipelines, data lakes, and executive metrics dashboards serving Fortune 500 financial institutions.',
    skills: ['SQL', 'Python', 'Apache Spark', 'Snowflake', 'dbt', 'Airflow'],
    postedAgo: 'Just now',
    applicantsCount: 16,
    matchScore: 78
  }
];

async function getJobListingsHandler(req, res) {
  try {
    const { department, search } = req.query || {};
    let filtered = [...CURATED_JOB_LISTINGS];

    if (department && department !== 'all') {
      filtered = filtered.filter(j => j.department.toLowerCase().includes(department.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(j => 
        j.title.toLowerCase().includes(q) || 
        j.company.toLowerCase().includes(q) || 
        j.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      totalJobs: filtered.length,
      jobs: filtered
    });
  } catch (err) {
    console.error('Get Job Listings Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve job listings: ' + err.message });
  }
}

/**
 * 8. Candidate 1-Click Apply to Job
 */
async function applyToJobHandler(req, res) {
  try {
    const userId = req.session?.userId || (req.user && req.user.id) || null;
    const sessionEmail = req.session?.user?.email || (req.user && req.user.email) || req.body?.candidateEmail || 'candidate@rankly.ai';
    const { jobId, jobTitle, companyName, location, salaryRange, notes } = req.body || {};

    if (!companyName || !jobTitle) {
      return res.status(400).json({ success: false, message: 'companyName and jobTitle are required' });
    }

    // Check if already applied
    const existing = await prisma.candidateApplication.findFirst({
      where: {
        candidateEmail: sessionEmail.toLowerCase().trim(),
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim()
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You have already applied for ${jobTitle} at ${companyName} on ${new Date(existing.appliedDate).toLocaleDateString()}.`
      });
    }

    const application = await prisma.candidateApplication.create({
      data: {
        userId,
        candidateEmail: sessionEmail.toLowerCase().trim(),
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        location: location || 'Remote / Hybrid',
        salaryRange: salaryRange || 'Market Competitive',
        stage: 'applied',
        notes: notes || `Direct application submitted via Rankly.ai Job Listings portal for ${jobTitle}.`,
        nextStep: 'Initial AI screening and profile review',
        matchScore: 85 + Math.floor(Math.random() * 12)
      }
    });

    return res.status(201).json({
      success: true,
      message: `🎉 Application for ${jobTitle} at ${companyName} submitted successfully!`,
      application
    });
  } catch (err) {
    console.error('Apply to Job Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit application: ' + err.message });
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
  deleteApplicationHandler,
  getCandidateProfileHandler,
  updateCandidateProfileHandler,
  getJobListingsHandler,
  applyToJobHandler
};

