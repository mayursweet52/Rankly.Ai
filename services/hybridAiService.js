const axios = require('axios');

/**
 * Multi-Tier Hybrid AI Service Layer
 * Tier 1: Groq Cloud AI (llama-3.3-70b-versatile) or Gemini 1.5 Flash (if API keys exist)
 * Tier 2: Local Offline Ollama (qwen2.5:7b or llama3.2:3b) with temperature 0.0 & seed 42
 */
async function executeAiInference(prompt, isJson = true) {
  // 1. Try Groq Cloud AI (If API key exists)
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5 && !process.env.GROQ_API_KEY.includes('your_')) {
    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        response_format: isJson ? { type: 'json_object' } : undefined
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 12000
      });
      const content = res.data.choices[0].message.content;
      return isJson ? JSON.parse(content) : content;
    } catch (err) {
      console.warn('⚠️ Groq Cloud AI unavailable, falling back to Gemini / Ollama:', err.message);
    }
  }

  // 2. Try Google Gemini Cloud AI (If API key exists)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5 && !process.env.GEMINI_API_KEY.includes('your_')) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: isJson ? 'application/json' : 'text/plain'
          }
        },
        { timeout: 12000 }
      );
      const raw = res.data.candidates[0].content.parts[0].text;
      return isJson ? JSON.parse(raw) : raw;
    } catch (err) {
      console.warn('⚠️ Gemini Cloud AI unavailable, falling back to Local Ollama:', err.message);
    }
  }

  // 3. Offline Failsafe: Local Ollama (Zero Key Required)
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const candidateModels = [process.env.OLLAMA_MODEL, 'llama3.2:3b', 'qwen2.5:7b', 'llama3.2', 'llama3'].filter(Boolean);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const res = await axios.post(`${ollamaUrl}/api/generate`, {
        model: model,
        prompt: prompt,
        format: isJson ? 'json' : undefined,
        stream: false,
        options: {
          temperature: 0.0,
          seed: 42,
          num_ctx: 8192,
          top_p: 0.1
        }
      }, { timeout: 45000 });

      const text = res.data.response;
      if (!isJson) return text;
      
      // Clean JSON output if needed
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw parseErr;
      }
    } catch (ollamaErr) {
      lastError = ollamaErr;
    }
  }

  throw new Error(`AI Service Error: Local Ollama inference failed. Ensure Ollama is running (${lastError ? lastError.message : 'connection refused'}).`);
}

module.exports = { executeAiInference };
