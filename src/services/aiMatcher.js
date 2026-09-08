/**
 * AI Matcher Engine for Rankly.ai
 * Dedicated Candidate Scoring & Semantic Skill Gap Analysis
 * Powered exclusively by NVIDIA Nemotron (550B/30B Reasoning) & Local Ollama (llama3.2)
 * Zero external token consumption (No Gemini, No GPT)
 */

const { executeAiInference } = require('./aiService');
const { evaluateResumeRuleBased, safeJsonParse } = require('../utils/helpers');

/**
 * Evaluate Candidate Resume against Job Description using Deep Reasoning
 * @param {string} resumeText - Extracted text of candidate resume
 * @param {string} jobDescription - Target role requirements and JD context
 * @param {string} targetRole - Job title or role benchmark
 * @param {string} filename - Original resume filename for fallback identification
 * @returns {Promise<Object>} Full ATS evaluation matrix
 */
async function evaluateCandidateWithNemotron(resumeText, jobDescription = '', targetRole = 'Software Engineer', filename = '') {
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 20) {
    return evaluateResumeRuleBased(resumeText || '', targetRole, filename);
  }

  const prompt = `
You are an expert AI Executive Recruiter & Chief Talent Officer for Rankly.ai.
Evaluate the candidate's resume strictly against the target role "${targetRole}" and the provided Job Description.

Job Description & Requirements:
"""
${(jobDescription || 'Standard industry production competencies for ' + targetRole).slice(0, 3000)}
"""

Candidate Resume:
"""
${resumeText.slice(0, 6000)}
"""

CRITICAL SCORING RULES:
1. Candidate Name: Extract the candidate's actual first and last name.
2. Match Score: Calculate a realistic, calibrated score between 0 and 100 based on technical competencies, years of relevant hands-on experience, and architectural depth.
3. Fit Verdict: Classify strictly as "Strong Fit" (>= 82), "Potential Fit" (68-81), or "Moderate Fit" (< 68).
4. Interview Questions: Provide 3 high-yield, specific technical probe questions to test candidate's potential weak areas during the technical interview.

Return ONLY a valid JSON object matching this schema:
{
  "candidateName": "First Last",
  "targetRole": "${targetRole}",
  "matchScore": 84,
  "fitVerdict": "Strong Fit",
  "scoreBreakdown": {
    "skills": 88,
    "experience": 82,
    "tools": 85,
    "education": 80
  },
  "summary": "Concise executive assessment outlining candidate's strongest competencies and core growth areas.",
  "matchedSkills": ["Skill1", "Skill2", "Skill3"],
  "missingSkills": ["MissingSkill1", "MissingSkill2"],
  "interviewQuestions": [
    "Technical question targeting gap 1...",
    "System design question targeting gap 2...",
    "Operational/scale question targeting gap 3..."
  ],
  "recommendations": [
    "Actionable tip 1",
    "Actionable tip 2"
  ]
}
`;

  try {
    const result = await executeAiInference(prompt, true, 'You are an expert ATS Evaluation AI Engine for Rankly.ai.');
    if (result && typeof result === 'object' && result.matchScore !== undefined) {
      // Clamping score between 0 and 100
      result.matchScore = Math.max(0, Math.min(100, Math.round(Number(result.matchScore) || 75)));
      
      // Ensure score breakdown is normalized
      if (!result.scoreBreakdown) {
        result.scoreBreakdown = {
          skills: result.matchScore,
          experience: Math.max(50, result.matchScore - 5),
          tools: result.matchScore,
          education: 75
        };
      }

      return result;
    }
  } catch (err) {
    console.warn('⚠️ [AI Matcher] Nemotron/Ollama inference error:', err.message);
  }

  // Fallback to deterministic heuristic engine
  return evaluateResumeRuleBased(resumeText, targetRole, filename);
}

/**
 * Extract semantic skills and tools from raw profile text
 */
async function extractSemanticSkills(text) {
  if (!text) return { technicalSkills: [], frameworks: [], tools: [] };

  const prompt = `
Extract and categorize technical competencies from this text:
"""
${text.slice(0, 4000)}
"""

Return ONLY a JSON object:
{
  "technicalSkills": ["skill1", "skill2"],
  "frameworks": ["framework1", "framework2"],
  "tools": ["tool1", "tool2"],
  "domainKnowledge": ["domain1"]
}
`;

  try {
    const result = await executeAiInference(prompt, true, 'You are a precise technical taxonomy parser.');
    if (result && typeof result === 'object') {
      return result;
    }
  } catch (e) {}

  return { technicalSkills: [], frameworks: [], tools: [] };
}

module.exports = {
  evaluateCandidateWithNemotron,
  extractSemanticSkills
};
