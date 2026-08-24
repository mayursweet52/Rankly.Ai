require('dotenv').config();

// Ensure DATABASE_URL fallback for cloud hosts (Render/Railway/Vercel)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./rankly.db';
}

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
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

// Fix 3: Enable Reverse Proxy Trust for Render/Heroku load balancers
app.set('trust proxy', 1);

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

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const passport = require('./src/config/passport');

// Fix 1 & 2: Persistent SQLite Session Store with Cloud Proxy support
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './',
    table: 'sessions',
    concurrentDB: true
  }),
  secret: process.env.SESSION_SECRET || 'rankly_secure_session_key_2026_super_secret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
  }
}));

// Initialize Passport Session Middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve Static Assets & Uploads with instant cache invalidation
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

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

// -----------------------------------------------------------------------------
// Feedback API (Collect user thoughts, bug reports, feature requests)
// -----------------------------------------------------------------------------
app.post(['/api/feedback', '/api/user/feedback'], async (req, res) => {
  try {
    const { message, category = 'general', rating = 5, email, name } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Feedback message is required.' });
    }

    const userId = req.session && req.session.userId ? req.session.userId : null;
    const sessionEmail = req.session && req.session.user ? req.session.user.email : null;
    const sessionName = req.session && req.session.user ? `${req.session.user.fname || ''} ${req.session.user.lname || ''}`.trim() : null;

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        name: name || sessionName || 'Anonymous',
        email: email || sessionEmail || null,
        category: String(category).toLowerCase(),
        rating: Number(rating) || 5,
        message: message.trim()
      }
    });

    return res.json({
      success: true,
      message: 'Thank you for your feedback! It helps us make Rankly.ai better.',
      feedbackId: feedback.id
    });
  } catch (err) {
    console.error('Feedback Submission Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record feedback: ' + err.message });
  }
});

app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json({ success: true, count: feedbacks.length, feedbacks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

// Simple keep-alive endpoint for cron-job
app.get('/ping', (req, res) => {
  res.send('ok');
});
app.get('/api/ping', (req, res) => {
  res.send('ok');
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

// Explicit Web Page Routes
app.get('/dashboard', (req, res) => {
  const user = req.session?.user || (req.isAuthenticated && req.isAuthenticated() ? req.user : null);
  if (!user) {
    return res.redirect('/login');
  }
  const cleanIndexPath = path.join(__dirname, 'public', 'index-3.html');
  if (fs.existsSync(cleanIndexPath)) {
    return res.sendFile(cleanIndexPath);
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  const cleanIndexPath = path.join(__dirname, 'public', 'index-3.html');
  if (fs.existsSync(cleanIndexPath)) {
    return res.sendFile(cleanIndexPath);
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA Fallback for Web UI
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(__dirname, 'public', 'index-3.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  const defaultIndexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(defaultIndexPath)) {
    return res.sendFile(defaultIndexPath);
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Rankly.ai Backend Server is live on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  console.log(`🔒 Session Authentication: Active (SQLite Store)`);
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
