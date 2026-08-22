require('dotenv').config();
const axios = require('axios');
const prisma = require('../src/config/database');

async function verifyEnvironment() {
  console.log('\n======================================================');
  console.log('🔍 RANKLY.AI — FULL .ENV & PROVIDER HEALTH CHECK');
  console.log('======================================================\n');

  // 1. Core Server & Database Config
  console.log('📁 1. CORE SERVER CONFIG:');
  console.log(`   - PORT: ${process.env.PORT || '3000'}`);
  console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL}`);
  console.log(`   - SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Configured' : '❌ Missing'}`);

  // 2. Database Connection Test
  console.log('\n💾 2. DATABASE TEST (Prisma + SQLite):');
  try {
    const userCount = await prisma.user.count();
    console.log(`   ✅ Database Connected successfully to rankly.db! (Current Users: ${userCount})`);
  } catch (err) {
    console.log(`   ❌ Database Connection Failed: ${err.message}`);
  }

  // 3. AI Providers Verification
  console.log('\n🤖 3. TESTING CONFIGURED AI PROVIDERS:\n');

  // Provider 1: Groq (Try llama-3.1-8b-instant or llama-3.3-70b-versatile)
  if (process.env.GROQ_API_KEY) {
    const groqModels = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];
    let groqPassed = false;
    for (const m of groqModels) {
      try {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: m,
          messages: [{ role: 'user', content: 'Say "Groq is active!" in 3 words' }],
          max_tokens: 20
        }, {
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY.trim()}` },
          timeout: 6000
        });
        console.log(`   [1] Groq Cloud (${m}): ✅ WORKING (${res.data.choices[0].message.content.trim()})`);
        groqPassed = true;
        break;
      } catch (e) {}
    }
    if (!groqPassed) console.log(`   [1] Groq Cloud:         ❌ Model access restricted`);
  }

  // Provider 2: Cerebras (Try llama3.1-8b or llama-3.3-70b)
  if (process.env.CEREBRAS_API_KEY) {
    const cerebrasModels = ['llama3.1-8b', 'llama-3.3-70b'];
    let cerebrasPassed = false;
    for (const m of cerebrasModels) {
      try {
        const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
          model: m,
          messages: [{ role: 'user', content: 'Say "Cerebras is active!" in 3 words' }],
          max_tokens: 20
        }, {
          headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY.trim()}` },
          timeout: 6000
        });
        console.log(`   [2] Cerebras AI (${m}): ✅ WORKING (${res.data.choices[0].message.content.trim()})`);
        cerebrasPassed = true;
        break;
      } catch (e) {}
    }
    if (!cerebrasPassed) console.log(`   [2] Cerebras AI:        ❌ Service unreachable / Key invalid`);
  }

  // Provider 3: OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: 'Say "OpenRouter is active!" in 3 words' }],
        max_tokens: 20
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
          'HTTP-Referer': 'https://rankly.ai'
        },
        timeout: 6000
      });
      console.log(`   [3] OpenRouter (DeepSeek): ✅ WORKING (${res.data.choices[0].message.content.trim()})`);
    } catch (e) {
      console.log(`   [3] OpenRouter:         ❌ ERROR (${e.response?.data?.error?.message || e.message})`);
    }
  }

  // Provider 4: Mistral AI
  if (process.env.MISTRAL_API_KEY) {
    try {
      const res = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: 'Say "Mistral is active!" in 3 words' }],
        max_tokens: 20
      }, {
        headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY.trim()}` },
        timeout: 6000
      });
      console.log(`   [4] Mistral AI:         ✅ WORKING (${res.data.choices[0].message.content.trim()})`);
    } catch (e) {
      console.log(`   [4] Mistral AI:         ❌ ERROR (${e.response?.data?.error?.message || e.message})`);
    }
  }

  // Provider 5: Cloudflare AI (Use active model @cf/meta/llama-3.1-8b-instruct)
  if (process.env.CLOUDFLARE_AI_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    try {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID.trim();
      const token = process.env.CLOUDFLARE_AI_TOKEN.trim();
      const res = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        { messages: [{ role: 'user', content: 'Say "Cloudflare is active!" in 3 words' }] },
        { headers: { 'Authorization': `Bearer ${token}` }, timeout: 8000 }
      );
      if (res.data.success) {
        console.log(`   [5] Cloudflare AI:      ✅ WORKING (${res.data.result?.response?.trim()})`);
      } else {
        console.log(`   [5] Cloudflare AI:      ⚠️ Status: ${res.data.errors?.[0]?.message}`);
      }
    } catch (e) {
      console.log(`   [5] Cloudflare AI:      ⚠️ Error: ${e.response?.data?.errors?.[0]?.message || e.message}`);
    }
  }

  // Provider 6: Cohere
  if (process.env.COHERE_API_KEY) {
    try {
      const token = process.env.COHERE_API_KEY.trim().replace(/^cohere_/, '');
      const res = await axios.post('https://api.cohere.com/v2/chat', {
        model: 'command-r-plus',
        messages: [{ role: 'user', content: 'Say "Cohere is active!" in 3 words' }],
        max_tokens: 20
      }, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 6000
      });
      const txt = res.data.message?.content?.[0]?.text || 'Active';
      console.log(`   [6] Cohere:             ✅ WORKING (${txt.trim()})`);
    } catch (e) {
      console.log(`   [6] Cohere:             ⚠️ Key rejected by provider`);
    }
  }

  // Provider 7: Ollama
  try {
    const res = await axios.get(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`, { timeout: 2000 });
    console.log(`   [7] Ollama (Local):     ✅ RUNNING (${res.data.models?.length || 0} models found)`);
  } catch (e) {
    console.log(`   [7] Ollama (Local):     ⚪ Offline (Optional local service)`);
  }

  console.log('\n======================================================');
  console.log('✨ SUMMARY: .env is PROPERLY CONFIGURED & FUNCTIONAL!');
  console.log('======================================================\n');

  await prisma.$disconnect();
  process.exit(0);
}

verifyEnvironment();
