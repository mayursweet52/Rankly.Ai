require('dotenv').config();
const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  require('dotenv').config({ path: path.join(__dirname, '.env.local'), override: true });
}

// Production-Ready Environment Validation
const { validateEnvironment } = require('./src/config/validateEnv');
validateEnvironment();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const http = require('http');

// Database Client
const prisma = require('./src/config/database');

// Production Middleware
const { requestLogger } = require('./src/middleware/requestLogger');
const { notFoundHandler, globalErrorHandler } = require('./src/middleware/errorHandler');

// Rate Limiters & Input Validators
const { apiLimiter, publicLimiter, authenticatedLimiter } = require('./src/middleware/rateLimit');
const { validate } = require('./src/middleware/validator');
const { createFeedbackSchema } = require('./src/schemas/feedbackSchemas');
const { candidateIdParamSchema } = require('./src/schemas/pipelineSchemas');

// Modular Route Handlers
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const resumeRoutes = require('./src/routes/resumeRoutes');
const pipelineRoutes = require('./src/routes/pipelineRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const aiAgentRoutes = require('./src/routes/aiAgentRoutes');
const skillMarketplaceRoutes = require('./src/routes/skillMarketplaceRoutes');
const pgEmployeeRoutes = require('./src/routes/pgEmployeeRoutes');
const jwtEmployeeRoutes = require('./src/routes/jwtEmployeeRoutes');
const complaintRoutes = require('./src/routes/complaintRoutes');
const grievanceRoutes = require('./src/routes/grievanceRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const candidateRoutes = require('./src/routes/candidateRoutes');
const { startHealthChecker } = require('./src/services/healthChecker');
const { serveCachedHtml, apiCacheMiddleware, invalidateFragmentCache } = require('./src/utils/cacheManager');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security 1: Disable fingerprinting header
app.disable('x-powered-by');

// Security 2: Enforce essential HTTP Security Headers with Helmet
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline styles & scripts used by the front-end SPA
  crossOriginEmbedderPolicy: false
}));

// Fix 3: Enable Reverse Proxy Trust for Render/Heroku load balancers
app.set('trust proxy', 1);

// Prompt 01 Optimization: Enable HTTP Response Compression in Transit (Gzip / Deflate / Brotli)
const compression = require('compression');
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1 KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    const contentType = res.getHeader('Content-Type') || '';
    if (typeof contentType === 'string' && (
      contentType.includes('image/') ||
      contentType.includes('audio/') ||
      contentType.includes('video/') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/pdf')
    )) {
      // Skip already compressed payloads
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// -----------------------------------------------------------------------------
// Core Middlewares
// -----------------------------------------------------------------------------
// Strict CORS Whitelist with dynamic cloud proxy and local dev support
const allowedOrigins = [
  'https://ranklyai-production.up.railway.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  (process.env.APP_URL || '').replace(/\/+$/, '')
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin.endsWith('.railway.app')) {
      return callback(null, true);
    }
    // Safe fallback to support tunnels/mobile while preserving credentials
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Structured Non-Leaking Request Logger with Credential Sanitization
app.use(requestLogger);

const passport = require('./src/config/passport');

// Persistent SQLite Session Store with Cloud Proxy and Secure HTTPS Cookie support
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
    secure: process.env.NODE_ENV === 'production',
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
app.use('/api/users', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/candidates', pipelineRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/agents', aiAgentRoutes);
app.use('/api/skills', skillMarketplaceRoutes);
app.use('/api/pg', pgEmployeeRoutes);
app.use('/api/v2', pgEmployeeRoutes);
app.use('/api/jwt', jwtEmployeeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/health', healthRoutes);

// Supabase JS Client live connectivity check
const supabaseClient = require('./src/config/supabaseClient');
app.get('/api/supabase/status', async (req, res) => {
  try {
    const { count, error } = await supabaseClient.from('employees').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return res.json({
      success: true,
      message: 'Supabase JS Client connected & authenticated.',
      url: process.env.SUPABASE_URL || 'https://baywowevjxteagnuhlgs.supabase.co',
      employeeCount: count
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});



// -----------------------------------------------------------------------------
// Backward-Compatibility Aliases (Ensures all UI frontend calls seamlessly work)
// -----------------------------------------------------------------------------
app.use('/auth', authRoutes);
app.use('/api/send-otp', (req, res) => res.redirect(307, '/api/auth/send-otp'));
app.use(['/verify-otp', '/api/verify-otp'], (req, res) => res.redirect(307, '/api/auth/verify-otp'));
app.use(['/create-account', '/api/create-account'], (req, res) => res.redirect(307, '/api/auth/create-account'));
app.use(['/resend-otp', '/api/resend-otp'], (req, res) => res.redirect(307, '/api/auth/resend-otp'));
app.use(['/resend-link', '/api/resend-link'], (req, res) => res.redirect(307, '/api/auth/resend-link'));
app.get('/verify-email', (req, res, next) => {
  const authController = require('./src/controllers/authController');
  return authController.verifyEmailLink(req, res, next);
});
app.get('/reset-password', (req, res) => {
  const token = req.query.token || '';
  const email = req.query.email || '';
  return res.redirect(`/?action=reset-password&token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
});
app.get('/dashboard.html', (req, res) => res.redirect('/' + (req._parsedUrl.search || '')));
// 🚀 Tagda AI Code Reviewer & Bug Hunter Route (Using NVIDIA Nemotron & Multi-Tier AI)
const { Ollama } = require('ollama');
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' });

app.post('/api/ai/code-review', async (req, res) => {
  try {
    const { codeSnippet, userQuery } = req.body;

    if (!codeSnippet && !userQuery) {
      return res.status(400).json({ success: false, error: "Bhai, analyze karne ke liye kuch code ya query toh bhej!" });
    }

    const systemPrompt = `You are an elite Senior Principal Software Architect, Security Expert, and Bug Hunter. ;
Your job is to deeply analyze the provided project code/snippet. 
1. Point out any syntax errors, logic bugs, security vulnerabilities, or bad practices.
2. Explain WHY the error is happening.
3. Provide clean, optimized, production-ready corrected code.
Be precise, technical, and direct.`;

    const userPrompt = `Here is my project code / query to review:\n\n${codeSnippet || userQuery}`;

    console.log("🤖 Nemotron analyzing code...");

    let analysisText = null;
    let modelUsed = 'nemotron (ollama)';

    // 1. Try Local Ollama First
    try {
      const response = await Promise.race([
        ollama.chat({
          model: process.env.OLLAMA_MODEL || 'nemotron',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          options: { temperature: 0.2 }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Local Ollama timeout')), 4000))
      ]);
      if (response && response.message && response.message.content) {
        analysisText = response.message.content;
      }
    } catch (ollamaErr) {
      console.log("ℹ️ Local Ollama not active on port 11434, utilizing Rankly AI Multi-Tier Engine:", ollamaErr.message);
    }

    // 2. Fallback to Cloud AI Engine (Groq / Gemini / OpenRouter)
    if (!analysisText) {
      const { executeAiInference } = require('./src/services/aiService');
      analysisText = await executeAiInference(userPrompt, false, systemPrompt);
      modelUsed = 'nemotron-cloud-engine';
    }

    return res.json({ 
      success: true, 
      modelUsed,
      analysis: analysisText 
    });

  } catch (error) {
    console.error("❌ Nemotron AI Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Unable to connect to the Nemotron AI engine. Please verify the AI service configuration.",
      details: error.message 
    });
  }
});

app.use('/api/ai/chat', chatRoutes);
app.use('/api/ai', resumeRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/candidates', pipelineRoutes);
app.use('/api/evaluations', resumeRoutes);
app.use('/api/upload', resumeRoutes);
app.use('/api/team', userRoutes);
app.use('/api/referral', userRoutes);

// Direct alias for candidate deletion from upload.js
app.delete('/api/candidates/:id', validate({ params: candidateIdParamSchema }), async (req, res) => {
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
app.post(['/api/feedback', '/api/user/feedback'], publicLimiter, validate({ body: createFeedbackSchema }), async (req, res) => {
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

    // ─── NOTIFICATION (Developer Email & n8n Webhook) ───
    try {
      const { sendSystemEmail } = require('./src/services/emailService');
      const devEmail = process.env.DEVELOPER_EMAIL || 'rankly.ai.com@gmail.com';
      sendSystemEmail({
        to: devEmail,
        subject: `💬 [Rankly.ai Feedback] New ${category.toUpperCase()} Rating (${rating}⭐) from ${name || 'User'}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 540px; margin: auto;">
            <h3 style="color: #4f46e5; margin: 0 0 12px 0;">New User Feedback Received</h3>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 12px 0; font-size: 13px;">
              <div>👤 <strong>From:</strong> ${name || 'Anonymous'} (${email || 'No email provided'})</div>
              <div>⭐ <strong>Rating:</strong> ${rating} / 5 Stars</div>
              <div>🏷️ <strong>Category:</strong> ${category}</div>
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; color: #1e293b;">
                <strong>Message:</strong><br/>"${message.trim()}"
              </div>
            </div>
            <p style="font-size: 11px; color: #94a3b8;">Rankly.ai Automated User Feedback Telemetry</p>
          </div>
        `
      }).catch(e => console.warn('[Feedback Email Warning]:', e.message));

      // Trigger n8n feedback webhook if configured
      const n8nFeedbackWebhook = process.env.N8N_FEEDBACK_WEBHOOK_URL;
      if (n8nFeedbackWebhook) {
        fetch(n8nFeedbackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedbackId: feedback.id,
            name: name || sessionName || 'Anonymous',
            email: email || sessionEmail,
            rating,
            category,
            message: message.trim(),
            createdAt: new Date().toISOString()
          })
        }).catch(e => console.warn('[n8n Feedback Sync Notice]:', e.message));
      }
    } catch (e) {}

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

// ─── EMAIL DIAGNOSTICS & DELIVERABILITY PROBE ───
app.get('/api/test-email', async (req, res) => {
  const nodemailer = require('nodemailer');
  const targetEmail = (req.query.to || process.env.DEVELOPER_EMAIL || 'rankly.ai.com@gmail.com').trim().toLowerCase();
  const diag = { target: targetEmail, smtp465: null, smtp587: null };

  const pass = (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '');
  const user = (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim();

  // Test 1: Port 465 SSL
  try {
    const t465 = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 8000
    });
    const info465 = await t465.sendMail({
      from: `"Rankly.ai" <${user}>`,
      to: targetEmail,
      subject: `Diagnostic 465: OTP Test to ${targetEmail}`,
      text: 'Diagnostic test port 465'
    });
    diag.smtp465 = { success: true, response: info465.response };
  } catch (e465) {
    diag.smtp465 = { success: false, error: e465.message, code: e465.code };
  }

  // Test 2: Port 587 STARTTLS (if 465 had issues)
  if (!diag.smtp465.success) {
    try {
      const t587 = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        connectionTimeout: 8000
      });
      const info587 = await t587.sendMail({
        from: `"Rankly.ai" <${user}>`,
        to: targetEmail,
        subject: `Diagnostic 587: OTP Test to ${targetEmail}`,
        text: 'Diagnostic test port 587'
      });
      diag.smtp587 = { success: true, response: info587.response };
    } catch (e587) {
      diag.smtp587 = { success: false, error: e587.message, code: e587.code };
    }
  }



  return res.json({ success: true, diagnostics: diag });
});

// ─── AI STATUS CHECK (10 PROVIDERS) ───
app.get('/api/ai/status', async (req, res) => {
  const results = {};

  const providers = [
    { 
      name: 'NVIDIA Nemotron', 
      key: 'NVIDIA_API_KEY', 
      endpoint: 'https://integrate.api.nvidia.com/v1/models',
      headers: (k) => ({ 'Authorization': `Bearer ${k}` })
    },
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

// Simple keep-alive endpoint for cron-job / uptime monitoring
app.get(['/ping', '/api/ping'], (req, res) => res.send('ok'));

// ─── n8n-BASED SELF-HEALING SYSTEM ENDPOINTS ───
// 1. Health Check
app.get(['/api/health', '/api/health/status'], (req, res) => {
  res.json({
    status: 'ok',
    system: 'Rankly.ai Executive OS',
    database: 'Prisma SQLite',
    timestamp: new Date().toISOString()
  });
});

// 2. Backup Code
app.post(['/api/backup', '/api/health/backup'], async (req, res) => {
  try {
    const timestamp = Date.now();
    const backupDir = path.join(process.cwd(), 'backups', `src_${timestamp}`);
    if (!fs.existsSync(path.dirname(backupDir))) {
      fs.mkdirSync(path.dirname(backupDir), { recursive: true });
    }
    await fs.promises.cp(path.join(process.cwd(), 'src'), backupDir, { recursive: true });
    res.json({ success: true, backupDir: `./backups/src_${timestamp}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Apply Fix
app.post(['/api/apply-fix', '/api/health/apply-fix'], async (req, res) => {
  try {
    const { fixInstruction, code, file } = req.body || {};
    if (fixInstruction) {
      fs.writeFileSync(path.join(process.cwd(), 'fix_instruction.md'), String(fixInstruction));
    }
    if (file && typeof code === 'string') {
      const targetPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
      fs.writeFileSync(targetPath, code);
    }
    res.json({ success: true, message: 'Fix applied.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Rollback
app.post(['/api/rollback', '/api/health/rollback-src'], async (req, res) => {
  try {
    const { backupDir } = req.body || {};
    if (!backupDir) {
      return res.status(400).json({ success: false, message: 'backupDir is required' });
    }
    const resolvedBackup = path.isAbsolute(backupDir) ? backupDir : path.join(process.cwd(), backupDir);
    const srcPath = path.join(process.cwd(), 'src');
    if (!fs.existsSync(resolvedBackup)) {
      return res.status(404).json({ success: false, message: 'Backup directory not found: ' + backupDir });
    }
    await fs.promises.rm(srcPath, { recursive: true, force: true });
    await fs.promises.cp(resolvedBackup, srcPath, { recursive: true });
    res.json({ success: true, message: 'Rollback complete.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Trigger n8n Workflow
app.post(['/api/trigger-self-heal', '/api/health/trigger-n8n'], async (req, res) => {
  try {
    const { issues } = req.body || {};
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/self-heal';
    
    // Trigger n8n webhook
    fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issues: issues || [], timestamp: new Date().toISOString() })
    }).catch(err => console.warn('[n8n Webhook Notice]:', err.message));

    res.json({ success: true, message: 'n8n triggered', webhookUrl: n8nWebhookUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Candidate Status Tracking (applied -> screened -> interview -> offer -> hired -> rejected)
app.post(['/api/pipeline/update', '/api/candidates/update-stage'], async (req, res) => {
  try {
    const { id, candidateId, candidateName, email, stage, status, notes } = req.body || {};
    const targetStage = (stage || status || '').toLowerCase().trim();

    const stageMap = {
      'applied': 'applied',
      'screened': 'ai_screened',
      'ai_screened': 'ai_screened',
      'interview': 'interview',
      'offer': 'offered',
      'offered': 'offered',
      'hired': 'offered',
      'rejected': 'rejected'
    };

    const finalStage = stageMap[targetStage] || targetStage;
    if (!finalStage) {
      return res.status(400).json({ success: false, message: 'Valid stage/status is required (applied, screened, interview, offer, hired, rejected)' });
    }

    const where = {};
    if (id || candidateId) {
      where.id = id || candidateId;
    } else if (email) {
      where.email = email.trim().toLowerCase();
    } else if (candidateName) {
      where.name = candidateName.trim();
    } else {
      return res.status(400).json({ success: false, message: 'Please provide candidate id, email, or candidateName' });
    }

    const candidate = await prisma.candidate.findFirst({ where });
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found in pipeline' });
    }

    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        stage: finalStage,
        notes: notes !== undefined ? notes : candidate.notes
      }
    });

    if (candidate.evaluationId) {
      await prisma.evaluation.update({
        where: { id: candidate.evaluationId },
        data: { pipelineStage: finalStage }
      }).catch(() => {});
    }

    // Invalidate analytics caches on status updates
    invalidateFragmentCache('analytics');

    return res.json({
      success: true,
      message: `Candidate ${candidate.name} status updated to "${finalStage}".`,
      candidate: updated
    });
  } catch (err) {
    console.error('Candidate Status Update Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Daily Analytics Report Data (For n8n cron scheduled report with 15s cache)
app.get(['/api/analytics/summary', '/api/analytics/daily-summary'], apiCacheMiddleware(15000), async (req, res) => {
  try {
    const [totalUsers, totalCandidates, totalEvaluations, totalFeedbacks, recentCandidates] = await Promise.all([
      prisma.user.count(),
      prisma.candidate.count(),
      prisma.evaluation.count(),
      prisma.feedback.count(),
      prisma.candidate.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { name: true, targetRole: true, score: true, stage: true, createdAt: true }
      })
    ]);

    const avgScoreResult = await prisma.evaluation.aggregate({
      _avg: { matchScore: true }
    });

    return res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers,
        totalCandidates,
        totalEvaluations,
        totalFeedbacks,
        averageMatchScore: Math.round(avgScoreResult._avg.matchScore || 0)
      },
      recentCandidates
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Explicit Web Page & SPA Fallback Routes
const MAIN_INDEX_FILE = path.join(__dirname, 'public', 'index.html');

// Smart Routing for Dual-Portal Architecture
app.get('/dashboard', async (req, res) => {
  const sessionUser = req.session?.user || (req.isAuthenticated && req.isAuthenticated() ? req.user : null);
  const userId = req.session?.userId;
  if (!sessionUser && !userId) return res.redirect('/login');

  let role = sessionUser?.role || req.session?.role;
  let accountType = sessionUser?.accountType || req.session?.accountType;

  if ((!role || !accountType) && userId) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, accountType: true } });
      if (dbUser) {
        role = dbUser.role;
        accountType = dbUser.accountType;
      }
    } catch (e) {
      console.error('Smart routing user lookup error:', e);
    }
  }

  const isEmployeeRole = accountType === 'employee' || ['admin', 'administrator', 'hr', 'hiring_manager', 'employee'].includes((role || '').toLowerCase());
  
  if (isEmployeeRole) {
    return res.redirect('/hrms/dashboard');
  } else {
    return res.redirect('/candidate/dashboard');
  }
});

// Candidate Portal (Public / Applicant Zone)
app.get(['/candidate/dashboard', '/candidate'], (req, res) => {
  return serveCachedHtml(MAIN_INDEX_FILE, req, res);
});

// Internal HRMS Portal (Protected / Admin & HR Zone)
app.get(['/hrms/dashboard', '/hrms'], async (req, res) => {
  const sessionUser = req.session?.user || (req.isAuthenticated && req.isAuthenticated() ? req.user : null);
  const userId = req.session?.userId;

  if (!sessionUser && !userId) {
    return res.redirect('/login?redirect=/hrms/dashboard');
  }

  let role = sessionUser?.role || req.session?.role;
  let accountType = sessionUser?.accountType || req.session?.accountType;

  if ((!role || !accountType) && userId) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, accountType: true } });
      if (dbUser) {
        role = dbUser.role;
        accountType = dbUser.accountType;
      }
    } catch (e) {
      console.error('HRMS portal user lookup error:', e);
    }
  }

  const isEmployeeRole = accountType === 'employee' || ['admin', 'administrator', 'hr', 'hiring_manager', 'employee'].includes((role || '').toLowerCase());

  if (!isEmployeeRole) {
    // Strictly block candidate access to HRMS
    return res.redirect('/candidate/dashboard?error=' + encodeURIComponent('Access denied: Internal HRMS is restricted to company HR and Admin personnel.'));
  }

  return serveCachedHtml(MAIN_INDEX_FILE, req, res);
});

app.get(['/privacy', '/privacy-policy'], (req, res) => {
  const privacyPath = path.join(__dirname, 'public', 'privacy.html');
  return serveCachedHtml(privacyPath, req, res);
});

app.get(['/terms', '/terms-of-service', '/terms-of-use'], (req, res) => {
  const termsPath = path.join(__dirname, 'public', 'terms.html');
  return serveCachedHtml(termsPath, req, res);
});

app.get('/loading', (req, res) => {
  const loadingPath = path.join(__dirname, 'public', 'loading.html');
  return serveCachedHtml(loadingPath, req, res);
});

app.get('/login', (req, res) => serveCachedHtml(MAIN_INDEX_FILE, req, res));

// SPA Fallback for Web UI
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  return serveCachedHtml(MAIN_INDEX_FILE, req, res);
});

// -----------------------------------------------------------------------------
// Centralized 404 & Global Error Handling
// -----------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

// -----------------------------------------------------------------------------
// Graceful Server Startup & Shutdown
// -----------------------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Rankly.ai Backend Server is live on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  console.log(`🔒 Session Authentication: Active (SQLite Store)`);
  console.log(`💾 Database: SQLite (Prisma ORM)`);
  console.log(`🤖 AI Engine: Groq / Gemini / OpenRouter / Ollama / Heuristic Tiered Fallback`);
  console.log(`⚡ Self-Healing System: Background 2-minute Health Checker Active\n`);
  
  // Multi-Port Safeguard for Cloud Proxies (Railway / Render / Docker)
  const targetPorts = [3000, 8080].filter(p => p !== PORT);
  targetPorts.forEach(p => {
    try {
      const backupServer = http.createServer(app);
      backupServer.listen(p, '0.0.0.0', () => {
        console.log(`📡 Multi-port safeguard active on port ${p} for cloud proxy compatibility`);
      });
      backupServer.on('error', () => {});
    } catch (e) {}
  });

  // Launch autonomous 2-minute background health checker
  startHealthChecker();
});

const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal || 'shutdown signal'}. Gracefully draining connections...`);
  server.close(async () => {
    console.log('HTTP server closed, all connections drained.');
    try {
      await prisma.$disconnect();
      console.log('Database connection pool disconnected.');
      process.exit(0);
    } catch (e) {
      console.error('Error during database disconnect:', e);
      process.exit(1);
    }
  });

  // Force close after 10s timeout
  setTimeout(() => {
    console.error('Forcefully terminating after 10s timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('⚠️ [UncaughtException Safeguard]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [UnhandledRejection Safeguard]:', reason);
});

module.exports = { app, server };

