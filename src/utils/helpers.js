const pdfParseModule = require('pdf-parse');
const mammoth = require('mammoth');
const crypto = require('crypto');

// Resolve pdf-parse module variations
const pdfParse = typeof pdfParseModule === 'function'
  ? pdfParseModule
  : (pdfParseModule.default || pdfParseModule.PDFParse || pdfParseModule.pdfParse);

/**
 * Extract clean text content from uploaded resume documents (PDF, DOCX, TXT)
 */
async function extractTextFromDocument(fileBuffer, mimeType = '', originalName = '') {
  const extension = (originalName.split('.').pop() || '').toLowerCase();

  try {
    // 1. PDF Files
    if (mimeType.includes('pdf') || extension === 'pdf') {
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(fileBuffer);
        return (data && data.text) ? data.text.trim() : '';
      }
    }

    // 2. Word Documents (DOCX)
    if (mimeType.includes('word') || mimeType.includes('officedocument') || extension === 'docx' || extension === 'doc') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return (result && result.value) ? result.value.trim() : '';
    }

    // 3. Plain Text Files
    if (mimeType.includes('text') || extension === 'txt') {
      return fileBuffer.toString('utf-8').trim();
    }

    // Fallback: try raw string conversion
    const fallbackText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    return fallbackText.length > 50 ? fallbackText : 'Text extraction completed from uploaded document.';
  } catch (error) {
    console.warn(`[Document Extraction Warning] Failed to parse ${originalName}:`, error.message);
    // Return graceful partial text if possible
    return fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim() || '';
  }
}

/**
 * Extract candidate contact info (Name, Email, Phone) from resume text
 */
function extractCandidateInfoFromText(text = '', fallbackFilename = '') {
  let email = '';
  let phone = '';
  let name = '';

  // 1. Email regex
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) email = emailMatch[0].toLowerCase();

  // 2. Phone regex (International & Indian formats)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,13}/);
  if (phoneMatch) phone = phoneMatch[0].trim();

  // 3. Clean Name extraction from Fallback Filename
  let filenameCandidateName = '';
  if (fallbackFilename) {
    let clean = fallbackFilename
      .replace(/\.[^/.]+$/, '') // remove extension
      .replace(/^(CV|Resume|Curriculum_Vitae|Bio)[\s_-]*/i, '') // remove leading CV/Resume
      .replace(/[\s_-]*(CV|Resume|Profile)[\s_-]*$/i, '') // remove trailing CV/Resume
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    clean = clean.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    if (clean.length >= 2 && !clean.toLowerCase().includes('document') && !clean.toLowerCase().includes('untitled')) {
      filenameCandidateName = clean;
    }
  }

  // 4. Name extraction from text lines (Skip URLs, phones, emails, headers, skills)
  const blacklistWords = [
    'http', 'https', 'www', '.com', '.io', '.org', '.net', '.in', '.dev', 'github', 'linkedin',
    'mobile', 'phone', 'tel', 'email', 'contact', 'address', 'curriculum', 'resume', 'profile',
    'developer', 'engineer', 'manager', 'lead', 'scientist', 'experience', 'skills', 'education',
    'summary', 'objective', 'page', 'portfolio', 'projects', 'certifications', 'work'
  ];

  const lines = text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => {
      if (l.length < 3 || l.length > 40) return false;
      const lower = l.toLowerCase();
      if (blacklistWords.some(w => lower.includes(w))) return false;
      if (/[0-9@:/\\_~#]/.test(l)) return false;
      return /^[a-zA-Z\s.]+$/.test(l);
    });

  if (lines.length > 0) {
    for (const candidateLine of lines.slice(0, 5)) {
      const words = candidateLine.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 4) {
        name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        break;
      }
    }
  }

  if (!name && filenameCandidateName) {
    name = filenameCandidateName;
  }

  return {
    name: name || filenameCandidateName || 'Candidate',
    email: email || '',
    phone: phone || ''
  };
}

/**
 * Generates secure random numeric OTP
 */
function generateOtp(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

/**
 * Generates unique uppercase referral code
 */
function generateReferralCode(prefix = 'RNK') {
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${randomChars}`;
}

/**
 * Safely parse JSON with fallback
 */
function safeJsonParse(data, fallback = {}) {
  if (typeof data === 'object' && data !== null) return data;
  if (!data || typeof data !== 'string') return fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    // Attempt extracting substring matching JSON
    const match = data.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        return fallback;
      }
    }
    return fallback;
  }
}

/**
 * Intelligent Rule-Based ATS Screening Engine (Fallback & Hybrid analysis)
 */
function evaluateResumeRuleBased(resumeText = '', targetRole = '') {
  const textLower = resumeText.toLowerCase();
  const roleLower = targetRole.toLowerCase();

  // Role Skill Dictionaries
  const roleTaxonomies = {
    frontend: ['javascript', 'react', 'typescript', 'html', 'css', 'tailwind', 'next.js', 'vue', 'redux', 'webpack', 'ui/ux', 'responsive design', 'rest api', 'git'],
    backend: ['node.js', 'express', 'python', 'django', 'fastapi', 'java', 'spring', 'sql', 'postgresql', 'mongodb', 'prisma', 'docker', 'rest api', 'microservices', 'redis', 'aws'],
    fullstack: ['javascript', 'typescript', 'react', 'node.js', 'express', 'sql', 'mongodb', 'docker', 'git', 'rest api', 'graphql', 'html', 'css'],
    datascience: ['python', 'pandas', 'numpy', 'scikit-learn', 'machine learning', 'sql', 'tensorflow', 'pytorch', 'data analysis', 'visualization', 'deep learning', 'statistics'],
    devops: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'terraform', 'jenkins', 'git', 'monitoring', 'bash', 'ansible', 'cloud'],
    product: ['product management', 'agile', 'scrum', 'jira', 'user stories', 'roadmap', 'analytics', 'kpis', 'market research', 'stakeholder management'],
    sales: ['crm', 'lead generation', 'negotiation', 'b2b sales', 'pipeline management', 'communication', 'closing', 'cold calling', 'presentations'],
    marketing: ['seo', 'sem', 'content strategy', 'social media', 'google analytics', 'copywriting', 'email marketing', 'branding', 'campaigns'],
    design: ['figma', 'ui/ux', 'prototyping', 'wireframing', 'user research', 'design systems', 'adobe xd', 'photoshop', 'illustrator']
  };

  // Find best taxonomy match or use generic tech
  let matchedCategory = 'fullstack';
  for (const [category, _] of Object.entries(roleTaxonomies)) {
    if (roleLower.includes(category)) {
      matchedCategory = category;
      break;
    }
  }

  const targetSkills = roleTaxonomies[matchedCategory] || roleTaxonomies.fullstack;

  // Extract matched and missing skills
  const matchedSkills = [];
  const missingSkills = [];

  targetSkills.forEach(skill => {
    if (textLower.includes(skill)) {
      matchedSkills.push(skill.toUpperCase());
    } else {
      missingSkills.push(skill.toUpperCase());
    }
  });

  // Calculate scores
  const skillRatio = matchedSkills.length / (targetSkills.length || 1);
  const skillsScore = Math.min(100, Math.round(skillRatio * 100 * 1.1 + 15));

  // Experience heuristic
  let experienceScore = 70;
  const expMatch = textLower.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  if (expMatch) {
    const years = parseInt(expMatch[1]);
    if (years >= 5) experienceScore = 95;
    else if (years >= 3) experienceScore = 85;
    else if (years >= 1) experienceScore = 75;
  } else if (textLower.includes('senior') || textLower.includes('lead')) {
    experienceScore = 90;
  }

  // Tools score
  const toolsScore = Math.min(100, Math.round((matchedSkills.length / 5) * 80 + 20));

  // Education score
  let educationScore = 75;
  if (textLower.includes('bachelor') || textLower.includes('b.tech') || textLower.includes('b.e') || textLower.includes('master') || textLower.includes('m.tech') || textLower.includes('degree') || textLower.includes('university') || textLower.includes('college')) {
    educationScore = 90;
  }

  // Overall Match Score
  const matchScore = Math.round((skillsScore * 0.4) + (experienceScore * 0.3) + (toolsScore * 0.2) + (educationScore * 0.1));

  // Verdict
  let fitVerdict = 'Potential Fit';
  if (matchScore >= 80) fitVerdict = 'Strong Fit';
  else if (matchScore >= 65) fitVerdict = 'Moderate Fit';
  else if (matchScore < 50) fitVerdict = 'Not a Fit';

  // Recommendations
  const recommendations = [];
  if (missingSkills.length > 0) {
    recommendations.push(`Strengthen profile by acquiring and listing projects in: ${missingSkills.slice(0, 3).join(', ')}.`);
  }
  recommendations.push('Include measurable impact metrics (e.g., % efficiency improved, revenue gained) for each past experience.');
  recommendations.push('Ensure technical tool stack and certifications are prominently highlighted in the top third of the resume.');

  const summary = `Candidate demonstrates a ${fitVerdict.toLowerCase()} for the ${targetRole} role with an overall match score of ${matchScore}%. Highlighted strengths include proficiency in ${matchedSkills.slice(0, 4).join(', ') || 'core fundamentals'}. Key enhancement areas include ${missingSkills.slice(0, 3).join(', ') || 'deep-dive domain competencies'}.`;

  return {
    candidateName: extractCandidateInfoFromText(resumeText).name,
    targetRole: targetRole || 'Software Professional',
    matchScore,
    scoreBreakdown: {
      skills: skillsScore,
      experience: experienceScore,
      tools: toolsScore,
      education: educationScore
    },
    fitVerdict,
    summary,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 6),
    recommendations
  };
}

module.exports = {
  extractTextFromDocument,
  extractCandidateInfoFromText,
  generateOtp,
  generateReferralCode,
  safeJsonParse,
  evaluateResumeRuleBased
};
