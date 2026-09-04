const axios = require('axios');
const { evaluateResumeRuleBased, safeJsonParse } = require('../utils/helpers');
const { getCircuitBreaker } = require('../utils/circuitBreaker');

// Prompt 03 Optimization: Circuit breakers for external AI services
const groqBreaker = getCircuitBreaker('groq_ai', { failureThreshold: 2, timeout: 6000, resetTimeout: 20000 });
const openRouterBreaker = getCircuitBreaker('openrouter_ai', { failureThreshold: 2, timeout: 8000, resetTimeout: 20000 });

/**
 * Universal Multi-Provider AI Inference Engine
 * Tested & Active Providers: OpenRouter (DeepSeek), Mistral AI, Cloudflare AI, Groq, Gemini, Ollama
 */
async function executeAiInference(prompt, isJson = true, systemPrompt = 'You are an expert AI Executive Recruiter & ATS Career Counselor for Rankly.ai.') {
  const errors = [];

  // =========================================================================
  // 1. Tier 1: Groq Cloud (Ultra-Low Latency Qwen 3.8 / GPT-OSS) with Circuit Breaker
  // =========================================================================
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().startsWith('gsk_')) {
    const groqModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];
    for (const model of groqModels) {
      try {
        const content = await groqBreaker.execute(async () => {
          const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            response_format: isJson ? { type: 'json_object' } : undefined
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}`,
              'Content-Type': 'application/json'
            },
            timeout: 6000
          });
          return res.data.choices[0].message.content;
        });

        if (content) {
          return isJson ? safeJsonParse(content) : content;
        }
      } catch (err) {
        errors.push(`Groq (${model}): ${err.response?.data?.error?.message || err.message}`);
        // If circuit breaker is open, immediately stop trying other Groq models and cascade to Tier 2
        if (groqBreaker.state === 'OPEN') break;
      }
    }
  }

  // =========================================================================
  // 2. Tier 2: OpenRouter (DeepSeek / Qwen / Llama) - [VERIFIED ACTIVE]
  // =========================================================================
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().startsWith('sk-or-')) {
    try {
      const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: isJson ? { type: 'json_object' } : undefined
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
          'HTTP-Referer': 'https://rankly.ai',
          'X-Title': 'Rankly.ai ATS',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const content = res.data.choices[0].message.content;
      return isJson ? safeJsonParse(content) : content;
    } catch (err) {
      errors.push(`OpenRouter: ${err.response?.data?.error?.message || err.message}`);
    }
  }

  // =========================================================================
  // 2. Tier 2: Mistral AI - [VERIFIED ACTIVE]
  // =========================================================================
  if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY.trim().length > 5) {
    try {
      const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: isJson ? { type: 'json_object' } : undefined
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY.trim()}`,
          'Content-Type': 'application/json'
        },
        timeout: 12000
      });

      const content = res.data.choices[0].message.content;
      return isJson ? safeJsonParse(content) : content;
    } catch (err) {
      errors.push(`Mistral: ${err.response?.data?.error?.message || err.message}`);
    }
  }

  // =========================================================================
  // 3. Tier 3: Cloudflare Workers AI - [VERIFIED ACTIVE]
  // =========================================================================
  if (process.env.CLOUDFLARE_AI_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID.trim();
      const token = process.env.CLOUDFLARE_AI_TOKEN.trim();
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;

      const res = await axios.post(url, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const text = res.data.result?.response;
      if (text) {
        return isJson ? safeJsonParse(text) : text;
      }
    } catch (err) {
      errors.push(`Cloudflare AI: ${err.response?.data?.errors?.[0]?.message || err.message}`);
    }
  }

  // =========================================================================
  // 4. Tier 4: Groq Cloud
  // =========================================================================
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().startsWith('gsk_')) {
    const groqModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'];
    for (const model of groqModels) {
      try {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: isJson ? { type: 'json_object' } : undefined
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}`,
            'Content-Type': 'application/json'
          },
          timeout: 12000
        });

        const content = res.data.choices[0].message.content;
        return isJson ? safeJsonParse(content) : content;
      } catch (err) {
        errors.push(`Groq (${model}): ${err.response?.data?.error?.message || err.message}`);
      }
    }
  }

  // =========================================================================
  // 5. Tier 5: Local Ollama (Offline fallback)
  // =========================================================================
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  try {
    const res = await axios.post(`${ollamaUrl}/api/generate`, {
      model: ollamaModel,
      prompt: `${systemPrompt}\n\n${prompt}`,
      format: isJson ? 'json' : undefined,
      stream: false,
      options: { temperature: 0.1, seed: 42 }
    }, { timeout: 30000 });

    const text = res.data.response;
    if (!isJson) return text;
    return safeJsonParse(text);
  } catch (ollamaErr) {
    errors.push(`Ollama (${ollamaModel}): ${ollamaErr.message}`);
  }

  // =========================================================================
  // 6. Tier 6: Intelligent Rule-Based ATS Engine Fallback
  // =========================================================================
  console.log('ℹ️ Operating in Heuristic Fallback mode.');
  return null;
}

/**
 * Screen Resume Against Target Role & Job Requirements
 */
async function screenResume(resumeText, targetRole, jobDescription = '', filename = '') {
  const prompt = `
You are an expert ATS (Applicant Tracking System) Evaluation Engine.
Analyze the candidate's resume text against the target benchmark role "${targetRole}".
Job Context: "${jobDescription || 'Standard industry production requirements for ' + targetRole}".

CRITICAL INSTRUCTIONS:
1. Extract the candidate's REAL first and last name from the resume or filename. Do NOT extract section headers (like "Availability", "Open Source", "Experience").
2. Calculate a REALISTIC, DYNAMIC match percentage (0 to 100) based on actual technical skill coverage, years of experience, and project metrics. Do not output a fixed or flat score.
3. Classify fitVerdict as "Strong Fit" (>=82%), "Potential Fit" (68-81%), or "Moderate Fit" (<68%).

Return a valid JSON object ONLY with the following schema:
{
  "candidateName": "First Last",
  "targetRole": "${targetRole}",
  "matchScore": 76,
  "scoreBreakdown": {
    "skills": 78,
    "experience": 72,
    "tools": 80,
    "education": 75
  },
  "fitVerdict": "Potential Fit",
  "summary": "Concise executive evaluation summary highlighting key competencies and gaps.",
  "matchedSkills": ["Skill1", "Skill2", "Skill3"],
  "missingSkills": ["MissingSkill1", "MissingSkill2"],
  "recommendations": [
    "Actionable improvement tip 1",
    "Actionable improvement tip 2",
    "Actionable improvement tip 3"
  ]
}

Resume Text:
"""
${resumeText.slice(0, 7000)}
"""
`;

  try {
    const aiResult = await executeAiInference(prompt, true);
    if (aiResult && typeof aiResult === 'object' && aiResult.matchScore !== undefined) {
      // Ensure candidate name is realistic
      if (!aiResult.candidateName || aiResult.candidateName.toLowerCase().includes('extracted') || aiResult.candidateName.length < 2) {
        aiResult.candidateName = extractCandidateInfoFromText(resumeText, filename).name;
      }
      return aiResult;
    }
  } catch (error) {
    console.warn('AI Screening fallback triggered:', error.message);
  }

  return evaluateResumeRuleBased(resumeText, targetRole, filename);
}

/**
 * Automatically detect best target job role based on resume content
 */
async function detectRole(resumeText) {
  const prompt = `
Analyze the following resume text and identify the single best matching professional job role/title (e.g., "Full Stack Developer", "Data Scientist", "DevOps Engineer", "Product Manager", "UI/UX Designer", "Sales Executive").

Return a valid JSON object ONLY:
{
  "detectedRole": "Full Stack Developer",
  "confidenceScore": 92,
  "keyIdentifiedSkills": ["Node.js", "React", "Prisma", "PostgreSQL"],
  "reasoning": "Candidate exhibits extensive background in..."
}

Resume Content:
"""
${resumeText.slice(0, 5000)}
"""
`;

  try {
    const aiResult = await executeAiInference(prompt, true);
    if (aiResult && aiResult.detectedRole) {
      return aiResult;
    }
  } catch (e) {}

  const lower = resumeText.toLowerCase();
  let detectedRole = 'Software Engineer';
  if (lower.includes('react') || lower.includes('frontend') || lower.includes('css')) detectedRole = 'Frontend Engineer';
  else if (lower.includes('node') || lower.includes('backend') || lower.includes('django') || lower.includes('spring')) detectedRole = 'Backend Developer';
  else if (lower.includes('python') && (lower.includes('machine learning') || lower.includes('data'))) detectedRole = 'Data Scientist';
  else if (lower.includes('docker') || lower.includes('kubernetes') || lower.includes('aws') || lower.includes('ci/cd')) detectedRole = 'DevOps Engineer';
  else if (lower.includes('figma') || lower.includes('ui/ux') || lower.includes('wireframe')) detectedRole = 'UI/UX Designer';

  return {
    detectedRole,
    confidenceScore: 85,
    keyIdentifiedSkills: ['Software Development', 'Problem Solving', 'Engineering Fundamentals'],
    reasoning: `Identified prominent keywords matching ${detectedRole} profile.`
  };
}

/**
 * AI Career Counselor & Intelligence Chat
 */
async function chatCareerCounselor(userMessage, chatHistory = [], context = {}) {
  const systemPrompt = `You are "Rankly AI" — the premier Executive Career Advisor & Talent Intelligence Consultant built directly into the Rankly.ai platform.

Tone, Persona & Behavioral Guidelines:
1. Executive & Sharp Tone: Communicate with high intelligence, clarity, professionalism, and actionable conviction. Never use conversational filler, boilerplate apologies, or verbose fluff.
2. Strict Relevance & Focus: Answer ONLY what the user asks directly. Adhere strictly to the requested constraints (e.g. ATS optimization, technical skills, resume tailoring, interview strategies, salary negotiation).
3. Markdown Formatting Standards:
   - Always structure your responses with crisp visual hierarchy using markdown.
   - Use bold highlights (**Key Term**) for crucial concepts and tools.
   - Use clean bullet points (- point) and numbered steps (1. step) for actionable advice.
   - Use short, digestible paragraphs (maximum 2-3 sentences each).
   - If providing code or technical commands, enclose them in proper markdown code blocks (\`\`\`).
4. High-Impact Delivery: Deliver immediate, tangible value in every reply.`;

  const formattedHistory = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Candidate' : 'Rankly AI'}: ${m.content}`).join('\n');
  const contextPrompt = context && context.targetRole ? `Context: Candidate is targeting "${context.targetRole}" (Current Match Score: ${context.matchScore || 'N/A'}%).` : '';

  const prompt = `
${contextPrompt}

Conversation History:
${formattedHistory}

Candidate: ${userMessage}
Rankly AI:`;

  try {
    const aiResponse = await executeAiInference(prompt, false, systemPrompt);
    if (aiResponse && typeof aiResponse === 'string' && aiResponse.trim().length > 0) {
      return aiResponse.trim();
    }
  } catch (e) {}

  return `### 🎯 Strategic Insights from Rankly AI

Here is the targeted roadmap for your query:

- **ATS Keyword Precision**: Embed exact domain terminologies from target job descriptions into your work experience sections.
- **Quantifiable Impact**: Reframe bullet points using the standard formula (*"Accomplished [X], measured by [Y], by implementing [Z]"*).
- **Core Technology Stack**: Highlight modern cloud infrastructure, architectural design patterns, and automated CI/CD practices.

Feel free to attach your resume or ask role-specific interview preparation questions for deeper analysis!`;
}

module.exports = {
  executeAiInference,
  screenResume,
  detectRole,
  chatCareerCounselor
};
