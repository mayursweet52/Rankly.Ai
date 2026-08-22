const axios = require('axios');

async function executeAiInference(prompt, isJson = true) {
  // Normalize isJson flag
  const isJsonFlag = typeof isJson === 'boolean' ? isJson : (typeof isJson === 'object' && isJson !== null ? !!isJson.isJson : (typeof isJson === 'string' ? false : true));
  const errors = [];

  // 1. Try Groq (If API key exists)
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5 && !process.env.GROQ_API_KEY.includes('your_')) {
    try {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        response_format: isJsonFlag ? { type: 'json_object' } : undefined
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 12000
      });
      const content = res.data.choices[0].message.content;
      return isJsonFlag ? JSON.parse(content) : content;
    } catch (err) {
      errors.push(`Groq: ${err.message}`);
    }
  }

  // 2. Try Google Gemini (If API key exists)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5 && !process.env.GEMINI_API_KEY.includes('your_')) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,
            responseMimeType: isJsonFlag ? 'application/json' : 'text/plain'
          }
        },
        { timeout: 12000 }
      );
      const raw = res.data.candidates[0].content.parts[0].text;
      return isJsonFlag ? JSON.parse(raw) : raw;
    } catch (err) {
      errors.push(`Gemini: ${err.message}`);
    }
  }

  // 3. Offline Fallback: Local Ollama (No API Key required)
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const candidateModels = [process.env.OLLAMA_MODEL, 'llama3.2:3b', 'qwen2.5:7b', 'llama3.2', 'llama3'].filter(Boolean);

  for (const model of candidateModels) {
    try {
      const res = await axios.post(`${ollamaUrl}/api/generate`, {
        model: model,
        prompt: prompt,
        format: isJsonFlag ? 'json' : undefined,
        stream: false,
        options: {
          temperature: 0.0,
          seed: 42,
          num_ctx: 8192,
          top_p: 0.1
        }
      }, { timeout: 45000 });

      const text = res.data.response;
      if (!isJsonFlag) return text;
      
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        errors.push(`Ollama (${model}): Invalid JSON response`);
        continue;
      }
    } catch (ollamaErr) {
      errors.push(`Ollama (${model}): ${ollamaErr.message}`);
    }
  }

  // ⚠️ STRICT ERROR POLICY: No dummy data. Throw full diagnostic error.
  throw new Error(
    `[AI_STRICT_ERROR] All AI inference tiers failed. No fallback data provided.\n\n` +
    `Diagnostic Summary:\n` +
    `- Groq: ${errors.find(e => e.includes('Groq')) ? 'FAILED' : 'Not configured / Skipped'}\n` +
    `- Gemini: ${errors.find(e => e.includes('Gemini')) ? 'FAILED' : 'Not configured / Skipped'}\n` +
    `- Ollama: ${errors.find(e => e.includes('Ollama')) ? 'FAILED' : 'Not found / Skipped'}\n\n` +
    `Full Error Details:\n${errors.map((e, i) => `  ${i+1}. ${e}`).join('\n')}\n\n` +
    `Troubleshooting:\n` +
    `1. If using Groq/Gemini, check your API keys in .env\n` +
    `2. If using Ollama, run "ollama serve" in a separate terminal\n` +
    `3. Pull the required model: "ollama pull llama3.2:3b"`
  );
}

module.exports = { executeAiInference };
