require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Database Client
const prisma = require('./src/config/database');

// Rate Limiters
const { apiLimiter } = require('./src/middleware/rateLimit');

// Modular Route Handlers
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const resumeRoutes = require('./src/routes/resumeRoutes');
const pipelineRoutes = require('./src/routes/pipelineRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const chatRoutes = require('./src/routes/chatRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// -----------------------------------------------------------------------------
// Core Middlewares
// -----------------------------------------------------------------------------
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const passport = require('./src/config/passport');

// Session-based Authentication Setup (express-session, no JWT)
app.use(session({
  secret: process.env.SESSION_SECRET || 'rankly_secure_session_key_2026_super_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
  }
}));

// Initialize Passport Session Middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve Static Assets & Uploads
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// General API Rate Limiting
app.use('/api', apiLimiter);

// -----------------------------------------------------------------------------
// API Route Registration
// -----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);

// -----------------------------------------------------------------------------
// Backward-Compatibility Aliases (Ensures all UI frontend calls seamlessly work)
// -----------------------------------------------------------------------------
app.use('/auth', authRoutes);
app.use('/api/ai/chat', chatRoutes);
app.use('/api/ai', resumeRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/candidates', pipelineRoutes);
app.use('/api/evaluations', resumeRoutes);
app.use('/api/upload', resumeRoutes);
app.use('/api/team', userRoutes);
app.use('/api/referral', userRoutes);

// Direct alias for candidate deletion from upload.js
app.delete('/api/candidates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.candidate.deleteMany({ where: { id } });
    await prisma.evaluation.deleteMany({ where: { id } });
    return res.json({ success: true, message: 'Candidate removed.' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ─── AI STATUS CHECK (10 PROVIDERS) ───
app.get('/api/ai/status', async (req, res) => {
  const results = {};

  const providers = [
    { 
      name: 'Groq', 
      key: 'GROQ_API_KEY', 
      endpoint: 'https://api.groq.com/openai/v1/models',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Gemini', 
      key: 'GEMINI_API_KEY', 
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY || ''}`,
      headers: (k) => ({ 'x-goog-api-key': k })
    },
    { 
      name: 'OpenRouter', 
      key: 'OPENROUTER_API_KEY', 
      endpoint: 'https://openrouter.ai/api/v1/auth/key',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Cerebras', 
      key: 'CEREBRAS_API_KEY', 
      endpoint: 'https://api.cerebras.ai/v1/models',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Cloudflare AI', 
      key: 'CLOUDFLARE_AI_TOKEN', 
      endpoint: 'https://api.cloudflare.com/client/v4/user/tokens/verify',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Mistral', 
      key: 'MISTRAL_API_KEY', 
      endpoint: 'https://api.mistral.ai/v1/models',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Hugging Face', 
      key: 'HF_API_KEY', 
      endpoint: 'https://huggingface.co/api/whoami-v2',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Cohere', 
      key: 'COHERE_API_KEY', 
      endpoint: 'https://api.cohere.com/v1/models',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Together AI', 
      key: 'TOGETHER_API_KEY', 
      endpoint: 'https://api.together.xyz/v1/models',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
    { 
      name: 'Ollama (Local)', 
      key: 'OLLAMA_URL', 
      endpoint: `${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`,
      headers: () => ({ 'Content-Type': 'application/json' }),
      isLocal: true
    }
  ];

  for (const provider of providers) {
    const key = process.env[provider.key];
    if (!key && !provider.isLocal) {
      results[provider.name] = '❌ NOT CONFIGURED (missing API key)';
      continue;
    }

    try {
      const reqHeaders = provider.headers ? provider.headers(key) : { 'Authorization': `Bearer ${key}` };
      const response = await fetch(provider.endpoint, {
        headers: reqHeaders,
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        results[provider.name] = '✅ WORKING';
      } else {
        results[provider.name] = `⚠️ FAILED (Status: ${response.status})`;
      }
    } catch (error) {
      results[provider.name] = `❌ ERROR: ${error.message}`;
    }
  }

  const working = Object.entries(results).filter(([_, status]) => status.includes('✅'));
  const notWorking = Object.entries(results).filter(([_, status]) => !status.includes('✅'));

  return res.json({
    status: 'AI Provider Status Check',
    timestamp: new Date().toISOString(),
    providers: results,
    summary: {
      total: providers.length,
      working: working.length,
      notWorking: notWorking.length,
      workingList: working.map(([name]) => name),
      notWorkingList: notWorking.map(([name]) => name)
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Rankly.ai Executive OS',
    database: 'Prisma SQLite',
    auth: 'Session-Based',
    timestamp: new Date().toISOString()
  });
});

// SPA Fallback for Web UI
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.send('<h1>Rankly.ai Backend API Running</h1><p>Frontend assets not found in /public directory.</p>');
});

// -----------------------------------------------------------------------------
// Global Error Handler
// -----------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// -----------------------------------------------------------------------------
// Graceful Server Startup & Shutdown
// -----------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`\n🚀 Rankly.ai Backend Server is live on http://localhost:${PORT}`);
  console.log(`🔒 Session Authentication: Active (No JWT)`);
  console.log(`💾 Database: SQLite (Prisma ORM)`);
  console.log(`🤖 AI Engine: Groq / Gemini / OpenRouter / Ollama / Heuristic Tiered Fallback\n`);
});

const gracefulShutdown = async () => {
  console.log('\nGracefully shutting down Rankly.ai backend...');
  try {
    await prisma.$disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = { app, server };
