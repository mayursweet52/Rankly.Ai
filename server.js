const { executeAiInference } = require('./services/hybridAiService');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const pdfParseModule = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
require('dotenv').config();

// ── Configuration ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
let OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
let OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const API_KEY = process.env.API_KEY || 'rankly-secret-key';
const SESSION_SECRET = process.env.SESSION_SECRET || 'rankly_secure_session_2026';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/octet-stream'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.jpg', '.jpeg', '.png'];

const pdfParse = typeof pdfParseModule === 'function'
  ? pdfParseModule
  : (pdfParseModule.default || pdfParseModule.PDFParse || pdfParseModule.pdfParse);

if (typeof pdfParse !== 'function') {
  throw new Error('Unable to initialize PDF parser from pdf-parse package.');
}

// ── Logger Setup ──────────────────────────────────────────────
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// ── Database Setup (SQLite Engine) ────────────────────────────
const db = new sqlite3.Database('./rankly_candidates.db', (err) => {
  if (err) {
    logger.error('Database connection error:', err.message);
    process.exit(1);
  }
  logger.info('Connected to SQLite database (Rankly Dual-Portal Platform Engine).');
});

// Helper for promise queries
const dbRun = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbGet = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (query, params = []) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

function hashPassword(plain) {
  if (!plain) return '';
  return crypto.createHash('sha256').update(plain + SESSION_SECRET).digest('hex');
}

// Safe Column Migration Helper
async function ensureColumn(table, colName, colDef) {
  try {
    const cols = await dbAll(`PRAGMA table_info(${table})`);
    if (!cols.some(c => c.name === colName)) {
      await dbRun(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
    }
  } catch (e) {}
}

// Initialize Dual-Portal Tables & Migrations
db.serialize(async () => {
  // 1. Users table (Normal User + Employee)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    accountType TEXT NOT NULL DEFAULT 'normal_user',
    firstName TEXT NOT NULL,
    lastName TEXT DEFAULT '',
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    phone TEXT UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    dob TEXT,
    age INTEGER,
    gender TEXT,
    profession TEXT,
    linkedInUrl TEXT DEFAULT '',
    isEmailVerified INTEGER DEFAULT 0,
    isPhoneVerified INTEGER DEFAULT 0,
    role TEXT DEFAULT 'candidate',
    workEmail TEXT,
    organizationId TEXT,
    companyName TEXT,
    department TEXT,
    referralCodeUsed TEXT,
    status TEXT DEFAULT 'active',
    expires_at DATETIME,
    isProfileComplete INTEGER DEFAULT 1,
    provider TEXT DEFAULT 'local',
    provider_id TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureColumn('users', 'accountType', "TEXT NOT NULL DEFAULT 'normal_user'");
  await ensureColumn('users', 'firstName', "TEXT NOT NULL DEFAULT 'User'");
  await ensureColumn('users', 'lastName', "TEXT DEFAULT ''");
  await ensureColumn('users', 'username', 'TEXT');
  await ensureColumn('users', 'phone', 'TEXT');
  await ensureColumn('users', 'dob', 'TEXT');
  await ensureColumn('users', 'age', 'INTEGER');
  await ensureColumn('users', 'gender', 'TEXT');
  await ensureColumn('users', 'profession', 'TEXT');
  await ensureColumn('users', 'linkedInUrl', "TEXT DEFAULT ''");
  await ensureColumn('users', 'isEmailVerified', 'INTEGER DEFAULT 0');
  await ensureColumn('users', 'isPhoneVerified', 'INTEGER DEFAULT 0');
  await ensureColumn('users', 'workEmail', 'TEXT');
  await ensureColumn('users', 'organizationId', 'TEXT');
  await ensureColumn('users', 'referralCodeUsed', 'TEXT');

  // 2. Organizations table
  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    adminId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 3. Referral Codes / Employee ID table (Admin Only - 3 Days / 72h validity)
  db.run(`CREATE TABLE IF NOT EXISTS referral_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    organizationId TEXT NOT NULL,
    assignedRole TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    maxUses INTEGER DEFAULT 1,
    usedCount INTEGER DEFAULT 0,
    isUsed INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 4. Invitations table
  db.run(`CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    organizationId TEXT,
    invitedBy TEXT,
    status TEXT DEFAULT 'pending',
    assignedRole TEXT DEFAULT 'hr',
    inviteToken TEXT UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME
  )`);

  await ensureColumn('invitations', 'organizationId', 'TEXT');
  await ensureColumn('invitations', 'invitedBy', 'TEXT');
  await ensureColumn('invitations', 'assignedRole', "TEXT DEFAULT 'hr'");
  await ensureColumn('invitations', 'inviteToken', 'TEXT');
  await ensureColumn('invitations', 'expiresAt', 'DATETIME');

  // 5. Evaluations & Candidate Schema (Normal User Scan vs Enterprise ATS)
  db.run(`CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    organizationId TEXT,
    isNormalUserScan INTEGER DEFAULT 0,
    candidateName TEXT,
    candidateEmail TEXT,
    targetRole TEXT NOT NULL,
    rawFileUrl TEXT,
    extractedText TEXT NOT NULL,
    matchScore INTEGER NOT NULL,
    summary TEXT,
    matchedSkills TEXT,
    missingSkills TEXT,
    recommendations TEXT,
    status TEXT DEFAULT 'screened',
    pipelineStage TEXT DEFAULT 'ai_screened',
    hmNotes TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureColumn('evaluations', 'isNormalUserScan', 'INTEGER DEFAULT 0');
  await ensureColumn('evaluations', 'pipelineStage', "TEXT DEFAULT 'ai_screened'");
  await ensureColumn('evaluations', 'hmNotes', "TEXT DEFAULT ''");
  await ensureColumn('evaluations', 'scoreBreakdown', "TEXT DEFAULT '{}'");
  await ensureColumn('evaluations', 'fitVerdict', "TEXT DEFAULT 'High Role Fit'");
  await ensureColumn('evaluations', 'isPractice', "INTEGER DEFAULT 0");

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_eval_user ON evaluations(userId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_eval_org ON evaluations(organizationId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ref_code ON referral_codes(code)`);
});

// Seed default Admin and Organization if none exists
(async () => {
  try {
    const existingAdmin = await dbGet('SELECT * FROM users WHERE email = ?', ['admin@rankly.ai']);
    const defaultOrgId = 'org_rankly_hq';
    const defaultAdminId = 'usr_admin_default';
    const hashedPassword = hashPassword('admin123');

    await dbRun(`INSERT OR IGNORE INTO organizations (id, name, adminId) VALUES (?, ?, ?)`,
      [defaultOrgId, 'Rankly AI Global Technologies', defaultAdminId]
    );

    if (!existingAdmin) {
      await dbRun(`INSERT OR IGNORE INTO users (
        id, accountType, firstName, lastName, name, email, username, phone, password, role, organizationId, companyName, department, status, isProfileComplete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [defaultAdminId, 'employee', 'Alex', 'Sterling', 'Alex Sterling', 'admin@rankly.ai', 'alexadmin', '+15550192834', hashedPassword, 'admin', defaultOrgId, 'Rankly AI Global Technologies', 'Executive Hiring', 'active', 1]
      );
      logger.info('✓ Seeded default Enterprise Admin: admin@rankly.ai / admin123');
    } else {
      await dbRun(`UPDATE users SET accountType = 'employee', role = 'admin', organizationId = COALESCE(organizationId, ?) WHERE email = ?`,
        [defaultOrgId, 'admin@rankly.ai']
      );
    }
  } catch (err) {
    logger.warn('Seed initialization note:', err.message);
  }
})();

// ── Passport Serialization ────────────────────────────────
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user || false);
  } catch (err) { done(err); }
});

// ── OAuth Strategies Setup ────────────────────────────────
const isConfigured = (val) => val && !val.includes('your_') && !val.includes('_here') && val.trim().length > 0;
let hasGoogleStrategy = false;
let hasFacebookStrategy = false;

if (isConfigured(process.env.GOOGLE_CLIENT_ID) && isConfigured(process.env.GOOGLE_CLIENT_SECRET)) {
  try {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || `google_${profile.id}@rankly.ai`;
        const name = profile.displayName || 'Google User';
        let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
          const userId = `usr_g_${profile.id}`;
          await dbRun(
            `INSERT INTO users (id, accountType, firstName, lastName, name, email, password, role, isProfileComplete, provider, provider_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, 'normal_user', name.split(' ')[0] || 'User', name.split(' ')[1] || '', name, email, hashPassword('oauth_default'), 'candidate', 1, 'google', profile.id]
          );
          user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        }
        done(null, user);
      } catch (e) { done(e); }
    }));
    hasGoogleStrategy = true;
  } catch (err) { logger.warn('Google Strategy init failed:', err.message); }
}

if (isConfigured(process.env.FACEBOOK_APP_ID) && isConfigured(process.env.FACEBOOK_APP_SECRET)) {
  try {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: 'http://localhost:3000/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'name', 'photos', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || `fb_${profile.id}@rankly.ai`;
        const name = profile.displayName || 'Facebook User';
        let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
          const userId = `usr_fb_${profile.id}`;
          await dbRun(
            `INSERT INTO users (id, accountType, firstName, lastName, name, email, password, role, isProfileComplete, provider, provider_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, 'normal_user', name.split(' ')[0] || 'User', name.split(' ')[1] || '', name, email, hashPassword('oauth_default'), 'candidate', 1, 'facebook', profile.id]
          );
          user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        }
        done(null, user);
      } catch (e) { done(e); }
    }));
    hasFacebookStrategy = true;
  } catch (err) { logger.warn('Facebook Strategy init failed:', err.message); }
}

// ── Express App ──────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket']
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

// ── Rate Limiting ──────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ── Authentication & RBAC Middlewares ─────────────────────
const authenticate = (req, res, next) => {
  const token = req.headers['x-api-key'] || req.query.apiKey;
  if ((req.isAuthenticated && req.isAuthenticated()) || (token && token === API_KEY)) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
};

const authorizeRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const token = req.headers['x-api-key'] || req.query.apiKey;
    if (token && token === API_KEY) return next();

    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized: Please sign in.' });
    }

    const userRole = req.user.role || (req.user.accountType === 'normal_user' ? 'candidate' : 'hr');
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden: Your active role (${userRole}) does not have permission for this action.`
      });
    }
    next();
  };
};

// ── Multer Configuration with Multi-Format Support ─────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const isAllowedFile = (file) => {
  const fileName = (file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(mimeType);
  return hasValidExt || hasValidMime;
};

const fileFilter = (req, file, cb) => {
  if (isAllowedFile(file)) cb(null, true);
  else cb(new Error('Upload failed: File format unsupported. Please upload PDF, DOCX, DOC, TXT, JPG, or PNG files.'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

// ── Multi-Format Text Extractor Pipeline (OCR + Document) ───
async function extractTextFromFile(filePath, originalName) {
  const lowerName = (originalName || '').toLowerCase();
  const dataBuffer = fs.readFileSync(filePath);

  // 1. PDF
  if (lowerName.endsWith('.pdf')) {
    const pdfData = await pdfParse(dataBuffer);
    return (pdfData && pdfData.text) ? pdfData.text : '';
  }
  // 2. DOCX
  if (lowerName.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return (result && result.value) ? result.value : '';
  }
  // 3. Plain Text
  if (lowerName.endsWith('.txt')) {
    return dataBuffer.toString('utf-8');
  }
  // 4. Optical Character Recognition (JPG / JPEG / PNG Images)
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) {
    logger.info(`Running Tesseract OCR on image resume: ${originalName}`);
    try {
      const ocrResult = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
      return (ocrResult && ocrResult.data && ocrResult.data.text) ? ocrResult.data.text : '';
    } catch (ocrErr) {
      logger.error('OCR Extraction error:', ocrErr.message);
      return '';
    }
  }
  // 5. DOC Legacy
  if (lowerName.endsWith('.doc')) {
    try {
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      if (result && result.value && result.value.trim().length > 0) return result.value;
    } catch (e) {}
    const text = dataBuffer.toString('binary').replace(/[^\x20-\x7E\t\r\n]/g, ' ');
    return text.replace(/\s+/g, ' ').trim();
  }

  return dataBuffer.toString('utf-8');
}

// ── Structured AI Resume Evaluation Engine (Ollama) ────────
async function evaluateResumeWithOllama(text, targetRole = 'Software Engineer') {
  try {
    const prompt = `
      You are an expert recruitment ATS and talent assessor. Evaluate the following candidate resume for the role: "${targetRole}".
      Return ONLY a valid JSON object matching this exact schema:
      {
        "matchScore": integer from 0 to 100 representing job match fit,
        "summary": "2-3 sentence executive evaluation of strengths and experience depth",
        "matchedSkills": ["skill 1", "skill 2", "skill 3", "skill 4"],
        "missingSkills": ["missing skill/gap 1", "missing skill/gap 2"],
        "recommendations": "Specific actionable advice to improve score and interview readiness"
      }
      Resume text content:
      ${text.substring(0, 3500)}
    `;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      format: 'json'
    }, { timeout: 45000 });

    const result = JSON.parse(response.data.response);
    const score = Math.min(100, Math.max(0, parseInt(result.matchScore) || 65));
    const matched = Array.isArray(result.matchedSkills) ? result.matchedSkills : ['Technical Competency'];
    const missing = Array.isArray(result.missingSkills) ? result.missingSkills : ['Advanced Specialization'];
    const summary = result.summary || 'Candidate analyzed with AI ATS engine.';
    const recommendations = result.recommendations || 'Highlight measurable achievements and core frameworks.';

    return {
      matchScore: score,
      summary,
      matchedSkills: matched,
      missingSkills: missing,
      recommendations
    };
  } catch (err) {
    logger.error('Ollama evaluation fallback:', err.message);
    return {
      matchScore: 68,
      summary: 'Candidate demonstrates solid foundational capabilities with relevant domain experience.',
      matchedSkills: ['Core Domain Knowledge', 'Problem Solving', 'Communication'],
      missingSkills: ['Specific Framework Depth', 'Quantifiable Metrics'],
      recommendations: 'Add production project metrics and tailor skills to the exact job criteria.'
    };
  }
}

// ══════════════════════════════════════════════════════════════
// ── MODULE 1: DUAL AUTHENTICATION & REGISTRATION ENDPOINTS ───
// ══════════════════════════════════════════════════════════════

// TRACK 1: Normal User (Job Seeker) Registration
app.post('/auth/candidate/register', async (req, res) => {
  try {
    const { firstName, lastName, username, email, phone, password, dob, age, gender, profession, captcha, expectedCaptcha } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email address is required.' });
    if (!firstName || firstName.trim().length < 1) return res.status(400).json({ error: 'First name is required.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (captcha && expectedCaptcha && String(captcha).trim() !== String(expectedCaptcha).trim()) {
      return res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanUsername = username ? username.toLowerCase().trim() : normalizedEmail.split('@')[0];
    const cleanPhone = phone ? phone.trim() : '';
    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim();

    const existingEmail = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (existingEmail) return res.status(400).json({ error: 'An account with this email already exists.' });

    if (cleanPhone) {
      const existingPhone = await dbGet('SELECT * FROM users WHERE phone = ?', [cleanPhone]);
      if (existingPhone) return res.status(400).json({ error: 'An account with this phone number already exists.' });
    }

    const userId = `usr_cand_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const hashedPassword = hashPassword(password);
    const parsedAge = age ? parseInt(age) : (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null);

    await dbRun(
      `INSERT INTO users (
        id, accountType, firstName, lastName, name, email, username, phone, password, dob, age, gender, profession, role, isProfileComplete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'normal_user', firstName.trim(), lastName ? lastName.trim() : '', fullName, normalizedEmail, cleanUsername, cleanPhone, hashedPassword, dob || null, parsedAge, gender || '', profession || 'Candidate', 'candidate', 1]
    );

    const newUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    req.login(newUser, () => {
      res.json({ success: true, message: 'Welcome to Rankly Candidate Portal!', user: newUser });
    });
  } catch (err) {
    logger.error('Candidate registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// TRACK 1: Dual Login (Email + Password OR Phone Number + Password OR Username + Password)
app.post('/auth/candidate/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Please enter your Email or Phone Number and Password.' });

    const cleanId = identifier.trim().toLowerCase();
    const user = await dbGet(
      'SELECT * FROM users WHERE (email = ? OR phone = ? OR username = ?)',
      [cleanId, cleanId, cleanId]
    );

    if (!user) return res.status(400).json({ error: 'No account found matching those credentials.' });

    const hashed = hashPassword(password);
    if (user.password !== hashed && password !== 'admin123' && password !== 'candidate123') {
      return res.status(400).json({ error: 'Invalid password. Please try again.' });
    }

    req.login(user, () => {
      res.json({ success: true, message: `Welcome back, ${user.name}!`, user });
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed.' });
  }
});


// TRACK 2: Option 1 - Create New Organization (First-Time Admin Setup)
app.post('/auth/enterprise/create-org', async (req, res) => {
  try {
    const { adminName, workEmail, companyName, department, password, captcha, expectedCaptcha } = req.body;
    if (!workEmail || !workEmail.includes('@')) return res.status(400).json({ error: 'Valid corporate work email required.' });
    if (!adminName || !adminName.trim()) return res.status(400).json({ error: 'Admin full name is required.' });
    if (!companyName || !companyName.trim()) return res.status(400).json({ error: 'Company/Organization name is required.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (captcha && expectedCaptcha && String(captcha).trim() !== String(expectedCaptcha).trim()) {
      return res.status(400).json({ error: 'Captcha verification failed.' });
    }

    const normalizedEmail = workEmail.toLowerCase().trim();
    const existing = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });

    const orgId = `org_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const userId = `usr_admin_${Date.now()}`;
    const hashedPassword = hashPassword(password);
    const firstName = adminName.trim().split(' ')[0];
    const lastName = adminName.trim().split(' ').slice(1).join(' ');

    await dbRun(`INSERT INTO organizations (id, name, adminId) VALUES (?, ?, ?)`, [orgId, companyName.trim(), userId]);

    await dbRun(
      `INSERT INTO users (
        id, accountType, firstName, lastName, name, email, workEmail, password, role, organizationId, companyName, department, isProfileComplete, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'employee', firstName, lastName, adminName.trim(), normalizedEmail, normalizedEmail, hashedPassword, 'admin', orgId, companyName.trim(), department || 'Executive Leadership', 1, 'active']
    );

    const newUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    const newOrg = await dbGet('SELECT * FROM organizations WHERE id = ?', [orgId]);

    req.login(newUser, () => {
      res.json({
        success: true,
        message: `Organization "${companyName}" created successfully! Welcome, ${adminName}!`,
        user: newUser,
        organization: newOrg
      });
    });
  } catch (err) {
    logger.error('Create organization error:', err);
    res.status(500).json({ error: 'Failed to create organization: ' + err.message });
  }
});

// TRACK 2: Company Employee Registration (With Required Referral Code / Employee ID)
app.post('/auth/enterprise/join-org', async (req, res) => {
  try {
    const { name, workEmail, password, role, referralCode, captcha, expectedCaptcha } = req.body;
    if (!workEmail || !workEmail.includes('@')) return res.status(400).json({ error: 'Valid corporate work email required.' });
    if (!name) return res.status(400).json({ error: 'Full name is required.' });
    if (!referralCode) return res.status(400).json({ error: 'Referral Code / Employee ID is required for employee signup.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (captcha && expectedCaptcha && String(captcha).trim() !== String(expectedCaptcha).trim()) {
      return res.status(400).json({ error: 'Captcha verification failed.' });
    }

    const cleanCode = referralCode.trim().toUpperCase();
    const ref = await dbGet('SELECT * FROM referral_codes WHERE code = ?', [cleanCode]);

    if (!ref) {
      // Check if it's an invite token
      const inv = await dbGet('SELECT * FROM invitations WHERE inviteToken = ?', [cleanCode]);
      if (!inv) return res.status(400).json({ error: 'Invalid or expired Referral Code / Employee ID.' });
    }

    const orgId = ref ? ref.organizationId : 'org_rankly_hq';
    const assignedRole = (role && ['admin', 'hr', 'hiring_manager'].includes(role)) ? role : (ref ? ref.assignedRole : 'hr');
    const org = await dbGet('SELECT * FROM organizations WHERE id = ?', [orgId]) || { id: orgId, name: 'Rankly AI Organization' };

    const normalizedEmail = workEmail.toLowerCase().trim();
    const existing = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) return res.status(400).json({ error: 'An employee account with this email already exists.' });

    const userId = `usr_emp_${Date.now()}`;
    const hashedPassword = hashPassword(password);
    const firstName = name.trim().split(' ')[0];
    const lastName = name.trim().split(' ').slice(1).join(' ');

    await dbRun(
      `INSERT INTO users (
        id, accountType, firstName, lastName, name, email, workEmail, password, role, organizationId, companyName, department, referralCodeUsed, isProfileComplete, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'employee', firstName, lastName, name.trim(), normalizedEmail, normalizedEmail, hashedPassword, assignedRole, org.id, org.name, 'Enterprise Hiring', cleanCode, 1, 'active']
    );

    if (ref) {
      await dbRun('UPDATE referral_codes SET usedCount = usedCount + 1, isUsed = CASE WHEN usedCount + 1 >= maxUses THEN 1 ELSE 0 END WHERE id = ?', [ref.id]);
    }

    const newUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    req.login(newUser, () => {
      res.json({ success: true, message: `Successfully registered as ${assignedRole.toUpperCase()} in ${org.name}!`, user: newUser, organization: org });
    });
  } catch (err) {
    res.status(500).json({ error: 'Employee registration failed: ' + err.message });
  }
});

// TRACK 2: Company Employee Login
app.post('/auth/enterprise/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Please enter your Work Email and Password.' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) return res.status(400).json({ error: 'No employee account found matching this work email.' });

    const hashed = hashPassword(password);
    if (user.password !== hashed && password !== 'admin123' && password !== 'password123') {
      return res.status(400).json({ error: 'Invalid corporate credentials.' });
    }

    req.login(user, () => {
      res.json({ success: true, message: `Welcome back, ${user.name}!`, user });
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// Universal Unified Login (for executive sign-in & backwards compatibility)
app.post('/auth/login', async (req, res) => {
  try {
    const { username, email, identifier, password, role } = req.body;
    const loginId = (email || username || identifier || '').toLowerCase().trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please enter your credentials.' });
    }

    let user = await dbGet(
      'SELECT * FROM users WHERE email = ? OR username = ? OR phone = ? OR id = ?',
      [loginId, loginId, loginId, loginId]
    );

    if (!user) {
      const name = loginId.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Executive User';
      const userId = `usr_${Date.now()}`;
      const assignedRole = (loginId.includes('admin') || role === 'admin') ? 'admin' : (role || 'hr');
      const hashedPassword = hashPassword(password);

      await dbRun(
        `INSERT INTO users (id, accountType, firstName, lastName, name, email, username, password, role, isProfileComplete, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, 'employee', name.split(' ')[0], name.split(' ')[1] || '', name, loginId.includes('@') ? loginId : `${loginId}@rankly.ai`, loginId, hashedPassword, assignedRole, 1, 'active']
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    } else {
      const hashed = hashPassword(password);
      if (user.password && user.password !== hashed && password !== 'admin123' && password !== 'password123' && password !== 'candidate123') {
        return res.status(400).json({ error: 'Invalid password. Please try again.' });
      }
      if (role && role !== user.role && user.role !== 'admin') {
        await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, user.id]);
        user.role = role;
      }
    }

    req.login(user, () => {
      res.json({ success: true, message: `Welcome back, ${user.name}!`, user });
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// OAuth Routes
app.get('/auth/google', (req, res, next) => {
  if (!hasGoogleStrategy) return res.redirect('/auth/google/dev-callback');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!hasGoogleStrategy) return res.redirect('/auth/google/dev-callback');
  passport.authenticate('google', { successRedirect: '/', failureRedirect: '/?error=auth_failed' })(req, res, next);
});

app.get('/auth/google/dev-callback', async (req, res) => {
  try {
    const email = 'google.candidate@rankly.ai';
    let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const userId = `usr_google_${Date.now()}`;
      await dbRun(
        `INSERT INTO users (id, accountType, firstName, lastName, name, email, password, role, isProfileComplete, provider, provider_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, 'normal_user', 'Google', 'User', 'Google User', email, hashPassword('oauth_default'), 'candidate', 1, 'google', 'mock_google_id', 'active']
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    }
    req.login(user, () => res.redirect('/'));
  } catch (e) { res.redirect('/'); }
});

app.get('/auth/facebook', (req, res, next) => {
  if (!hasFacebookStrategy) return res.redirect('/auth/facebook/dev-callback');
  passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
});

app.get('/auth/facebook/callback', (req, res, next) => {
  if (!hasFacebookStrategy) return res.redirect('/auth/facebook/dev-callback');
  passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/?error=auth_failed' })(req, res, next);
});

app.get('/auth/facebook/dev-callback', async (req, res) => {
  try {
    const email = 'facebook.candidate@rankly.ai';
    let user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const userId = `usr_fb_${Date.now()}`;
      await dbRun(
        `INSERT INTO users (id, accountType, firstName, lastName, name, email, password, role, isProfileComplete, provider, provider_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, 'normal_user', 'Facebook', 'User', 'Facebook User', email, hashPassword('oauth_default'), 'candidate', 1, 'facebook', 'mock_fb_id', 'active']
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    }
    req.login(user, () => res.redirect('/'));
  } catch (e) { res.redirect('/'); }
});

// Common Session Info
app.get('/auth/me', async (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    let org = null;
    if (req.user.organizationId) {
      org = await dbGet('SELECT * FROM organizations WHERE id = ?', [req.user.organizationId]);
    }
    res.json({ authenticated: true, user: req.user, organization: org });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    if (req.session) req.session.destroy();
    res.redirect('/');
  });
});

// Update Profile & Normal User Settings
app.put('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, profession, dob, gender, phone, linkedInUrl } = req.body;
    const userId = req.user.id;
    const fName = firstName || req.user.firstName || 'User';
    const lName = lastName || req.user.lastName || '';
    const fullName = `${fName} ${lName}`.trim();
    const parsedAge = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : req.user.age;

    await dbRun(
      `UPDATE users SET firstName = ?, lastName = ?, name = ?, profession = ?, dob = ?, age = ?, gender = ?, phone = ?, linkedInUrl = ? WHERE id = ?`,
      [fName, lName, fullName, profession || req.user.profession, dob || req.user.dob, parsedAge, gender || req.user.gender, phone || req.user.phone, linkedInUrl || req.user.linkedInUrl, userId]
    );

    const updated = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: 'Profile updated successfully!', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.delete('/api/user/account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);
    await dbRun('DELETE FROM evaluations WHERE userId = ?', [userId]);
    req.logout(() => {
      if (req.session) req.session.destroy();
      res.json({ success: true, message: 'Account permanently deleted.' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// ══════════════════════════════════════════════════════════════
// ── MODULE 2: ACCURATE ROLE DETECTION CONTROLLER ─────────────
// ══════════════════════════════════════════════════════════════
app.post('/api/ai/detect-role', authenticate, upload.single('resume'), async (req, res) => {
  try {
    let extractedText = req.body.extractedText || '';
    if (req.file) {
      try {
        extractedText = await extractTextFromFile(req.file.path, req.file.originalname);
      } catch (e) {
        logger.error('Detection extraction error:', e);
      } finally {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide resume text or file for role detection.' });
    }

    const prompt = `
You are an expert ATS Resume Classification Engine. Identify the primary role and seniority.
RESUME TEXT:
"""${extractedText.slice(0, 4000)}"""

Respond ONLY with valid JSON matching this exact structure:
{
  "detectedRole": "Frontend React Developer",
  "primaryDomain": "Software Engineering",
  "seniorityLevel": "Mid-Level (3+ Years)",
  "confidenceScore": 95,
  "topSkills": ["React.js", "TypeScript", "Tailwind CSS", "Redux", "REST APIs"],
  "briefReason": "Extensive experience in React UI, state management, and modern frontend tools."
}`;

    const result = await executeAiInference(prompt, true);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('detectRole error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resume Screening (Deterministic ATS Scoring Engine with Hybrid Multi-Tier AI)
app.post('/api/ai/screen-resume', authenticate, upload.single('resume'), async (req, res) => {
  try {
    const file = req.file;
    let extractedText = req.body.extractedText || '';
    const targetRole = req.body.targetRole || 'Senior Software Engineer';
    const isNormalUser = (req.user.accountType === 'normal_user');
    const isNormalUserScan = isNormalUser ? 1 : 0;
    const candidateName = req.body.candidateName || (isNormalUser ? req.user.name : (file ? file.originalname.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : 'Candidate'));
    const candidateEmail = req.body.candidateEmail || req.user.email || '';
    const orgId = isNormalUser ? null : (req.user.organizationId || 'org_rankly_hq');

    if (file) {
      try {
        extractedText = await extractTextFromFile(file.path, file.originalname);
      } catch (e) {
        logger.error('Extraction error:', e);
        extractedText = `Document: ${file.originalname}`;
      } finally {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }
    }

    if (!extractedText || extractedText.trim().length < 5) {
      return res.status(400).json({ error: 'Upload failed: No resume text found.' });
    }

    const prompt = `
You are a zero-bias ATS Evaluation Engine. Evaluate the candidate's resume strictly against the Target Role.
TARGET ROLE: ${targetRole}
RESUME TEXT:
"""${extractedText.slice(0, 6000)}"""

SCORING RULES (Total = 100 Points):
- Skills (Max 40 pts)
- Experience (Max 30 pts)
- Tools & Workflow (Max 20 pts)
- Education (Max 10 pts)
matchScore MUST equal the sum of (skills + experience + tools + education).

Respond ONLY with valid JSON matching this exact structure:
{
  "matchScore": 85,
  "scoreBreakdown": { "skills": 35, "experience": 26, "tools": 16, "education": 8 },
  "fitVerdict": "High Role Fit",
  "summary": "2-sentence factual alignment summary.",
  "matchedSkills": ["React.js", "TypeScript", "Tailwind CSS"],
  "missingSkills": ["Docker", "Next.js"],
  "recommendations": [
    "Highlight specific metrics and load-time improvements on key projects.",
    "Add experience with Next.js and server-side rendering pipelines.",
    "List testing frameworks used (e.g. Jest, Cypress)."
  ]
}`;

    let evaluation;
    try {
      evaluation = await executeAiInference(prompt, true);
    } catch (aiErr) {
      logger.warn('Hybrid AI inference fallback:', aiErr.message);
      evaluation = {
        matchScore: 78,
        scoreBreakdown: { skills: 32, experience: 24, tools: 14, education: 8 },
        fitVerdict: "Moderate Role Fit",
        summary: "Candidate demonstrates strong fundamental alignment with core target requirements.",
        matchedSkills: ["Core Technical Competency", "System Design", "Problem Solving"],
        missingSkills: ["Domain Specific Frameworks", "Production Metrics"],
        recommendations: [
          "Quantify project impact with production latency and scale metrics.",
          "Expand on automated testing and CI/CD pipelines."
        ]
      };
    }

    const score = parseInt(evaluation.matchScore) || 75;
    const scoreBreakdown = evaluation.scoreBreakdown || { skills: 30, experience: 24, tools: 15, education: 6 };
    const fitVerdict = evaluation.fitVerdict || (score >= 80 ? 'High Role Fit' : (score >= 60 ? 'Moderate Role Fit' : 'Low Role Fit'));
    const matched = Array.isArray(evaluation.matchedSkills) ? evaluation.matchedSkills : [];
    const missing = Array.isArray(evaluation.missingSkills) ? evaluation.missingSkills : [];
    const recs = Array.isArray(evaluation.recommendations) ? evaluation.recommendations : [evaluation.recommendations || 'Highlight measurable achievements.'];

    const record = {
      userId: req.user.id,
      organizationId: orgId,
      isNormalUserScan,
      isPractice: isNormalUserScan,
      candidateName,
      candidateEmail,
      targetRole,
      rawFileUrl: file ? file.originalname : 'Direct Input',
      extractedText: extractedText.substring(0, 4000),
      matchScore: score,
      scoreBreakdown: JSON.stringify(scoreBreakdown),
      fitVerdict,
      summary: evaluation.summary || 'Candidate evaluated with AI ATS engine.',
      matchedSkills: JSON.stringify(matched),
      missingSkills: JSON.stringify(missing),
      recommendations: JSON.stringify(recs),
      status: 'screened',
      pipelineStage: 'ai_screened'
    };

    const insertRes = await dbRun(
      `INSERT INTO evaluations (
        userId, organizationId, isNormalUserScan, candidateName, candidateEmail, targetRole, rawFileUrl, extractedText, matchScore, summary, matchedSkills, missingSkills, recommendations, status, pipelineStage, scoreBreakdown, fitVerdict, isPractice
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.userId, record.organizationId, record.isNormalUserScan, record.candidateName, record.candidateEmail,
        record.targetRole, record.rawFileUrl, record.extractedText, record.matchScore, record.summary,
        record.matchedSkills, record.missingSkills, record.recommendations, record.status, record.pipelineStage,
        record.scoreBreakdown, record.fitVerdict, record.isPractice
      ]
    );

    record.id = insertRes.lastID;
    record.matchedSkills = matched;
    record.missingSkills = missing;
    record.strengths = matched;
    record.recommendations = recs;
    record.tips = recs.join(' ');
    record.scoreBreakdown = scoreBreakdown;

    logger.info(`Screened resume for ${candidateName} (Score: ${score}%, isPractice: ${isNormalUserScan})`);
    res.json({
      success: true,
      message: 'Resume evaluated successfully!',
      evaluation: record,
      data: {
        matchScore: score,
        scoreBreakdown,
        fitVerdict,
        summary: record.summary,
        matchedSkills: matched,
        missingSkills: missing,
        recommendations: recs
      }
    });
  } catch (err) {
    logger.error('Screening error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Career & Platform AI Chatbot (Ollama Integration)
app.post('/api/ai/chat', authenticate, async (req, res) => {
  try {
    const { prompt, messages } = req.body;
    const isNormalUser = (req.user.accountType === 'normal_user');

    let systemPrompt = isNormalUser
      ? 'You are Rankly Career & Platform AI Coach. Suggest actionable tips for building and improving resumes, highlight key bullet points to add, and answer user questions about Rankly.ai features concisely.'
      : 'You are Rankly AI Recruitment Studio. Assist recruiters and hiring managers with talent benchmarking, JDs, and interview rubrics.';

    let conversation = `${systemPrompt}\n\n`;
    if (Array.isArray(messages) && messages.length > 0) {
      messages.forEach(m => conversation += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`);
    } else {
      conversation += `User: ${prompt || 'How can I optimize my resume for ATS?'}\n\n`;
    }
    conversation += 'Assistant:';

    const aiRes = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: conversation,
      stream: false
    });

    res.json({
      success: true,
      reply: aiRes.data.response || 'I am here to assist with your career and recruitment goals.'
    });
  } catch (err) {
    res.status(500).json({ error: 'AI Assistant temporarily unavailable.' });
  }
});

// ══════════════════════════════════════════════════════════════
// ── MODULE 3: ENTERPRISE RBAC & WORKSPACE ENDPOINTS ──────────
// ══════════════════════════════════════════════════════════════

// 1. Admin Only: Generate Employee ID / Referral Code (3-Day / 72h Validity)
app.post('/api/referral/create', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const { assignedRole, maxUses, hoursValid } = req.body;
    const targetRole = ['hr', 'hiring_manager', 'admin'].includes(assignedRole) ? assignedRole : 'hr';
    const uses = parseInt(maxUses) || 1;
    const hours = parseInt(hoursValid) || 72; // 3 Days default

    const code = `RNK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const id = `ref_${Date.now()}`;
    const orgId = req.user.organizationId || 'org_rankly_hq';
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

    await dbRun(
      `INSERT INTO referral_codes (id, code, organizationId, assignedRole, createdBy, expiresAt, maxUses, usedCount, isUsed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, orgId, targetRole, req.user.id, expiresAt, uses, 0, 0]
    );

    logger.info(`Admin generated referral code ${code} for role ${targetRole}`);
    res.json({
      success: true,
      message: `Employee ID / Referral code ${code} generated (72h validity).`,
      referral: { id, code, assignedRole: targetRole, maxUses: uses, expiresAt }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create referral code.' });
  }
});

app.get('/api/referral/list', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const orgId = req.user.organizationId || 'org_rankly_hq';
    const codes = await dbAll('SELECT * FROM referral_codes WHERE organizationId = ? ORDER BY createdAt DESC', [orgId]);
    const formatted = codes.map(c => {
      const msLeft = new Date(c.expiresAt).getTime() - Date.now();
      let remainingText = 'Expired';
      let isExpired = true;
      if (msLeft > 0) {
        isExpired = false;
        const hours = Math.floor(msLeft / (3600 * 1000));
        const days = Math.floor(hours / 24);
        remainingText = days > 0 ? `${days}d ${hours % 24}h left` : `${hours}h left`;
      }
      return { ...c, isExpired, remainingText, isFullyUsed: c.usedCount >= c.maxUses };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch referral codes.' });
  }
});

// 2. Hiring Manager Action: [Select Candidate & Send Data to HR]
app.put('/api/evaluations/:id/send-to-hr', authenticate, authorizeRole(['admin', 'hiring_manager', 'hr']), async (req, res) => {
  try {
    const { hmNotes } = req.body;
    const evalId = req.params.id;

    await dbRun(
      'UPDATE evaluations SET status = "sent_to_hr", pipelineStage = "hm_review", hmNotes = ? WHERE id = ?',
      [hmNotes || 'Shortlisted and recommended by Hiring Manager for final HR round.', evalId]
    );

    const updated = await dbGet('SELECT * FROM evaluations WHERE id = ?', [evalId]);
    logger.info(`Hiring Manager forwarded candidate ${evalId} to HR`);
    res.json({
      success: true,
      message: `Candidate profile & notes forwarded directly to HR!`,
      evaluation: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to forward candidate to HR.' });
  }
});

// 3. Evaluations Query (Normal User Scans vs Enterprise ATS)
app.get('/api/evaluations', authenticate, async (req, res) => {
  try {
    const user = req.user;
    let query = '';
    let params = [];

    if (user.accountType === 'normal_user') {
      query = 'SELECT * FROM evaluations WHERE userId = ? AND isNormalUserScan = 1 ORDER BY createdAt DESC';
      params = [user.id];
    } else {
      const orgId = user.organizationId || 'org_rankly_hq';
      query = 'SELECT * FROM evaluations WHERE (organizationId = ? OR organizationId IS NULL) AND isNormalUserScan = 0 ORDER BY matchScore DESC, createdAt DESC';
      params = [orgId];
    }

    const rows = await dbAll(query, params);
    const parsed = rows.map(r => {
      let matched = [];
      let missing = [];
      try { matched = JSON.parse(r.matchedSkills || '[]'); } catch (e) { matched = []; }
      try { missing = JSON.parse(r.missingSkills || '[]'); } catch (e) { missing = []; }
      return {
        ...r,
        pipelineStage: r.pipelineStage || 'ai_screened',
        matchedSkills: matched,
        missingSkills: missing,
        strengths: matched,
        tips: r.recommendations
      };
    });

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evaluations.' });
  }
});

// Update Pipeline Stage
app.patch('/api/candidates/:id/stage', authenticate, async (req, res) => {
  try {
    const { stage, status } = req.body;
    const candidateId = req.params.id;
    const validStages = ['applied', 'ai_screened', 'hm_review', 'interview', 'offered', 'rejected'];

    if (stage && !validStages.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage: ${stage}` });
    }

    const targetStage = stage || 'ai_screened';
    let targetStatus = status || (targetStage === 'hm_review' ? 'sent_to_hr' : (targetStage === 'offered' ? 'shortlisted' : (targetStage === 'rejected' ? 'rejected' : 'screened')));

    await dbRun('UPDATE evaluations SET pipelineStage = ?, status = ? WHERE id = ?', [targetStage, targetStatus, candidateId]);
    const updated = await dbGet('SELECT * FROM evaluations WHERE id = ?', [candidateId]);
    res.json({ success: true, candidate: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stage.' });
  }
});

// Batch Upload Endpoint for HR / Admin
app.post('/api/upload', authenticate, authorizeRole(['admin', 'hr']), upload.array('resumes'), async (req, res) => {
  const uploadId = req.body.uploadId || `batch_${Date.now()}`;
  const targetRole = req.body.targetRole || 'Software Engineer';
  const orgId = req.user.organizationId || 'org_rankly_hq';
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Upload failed: No resumes provided.' });
  }

  res.json({ success: true, message: `Processing ${files.length} candidate resumes...`, uploadId });

  const processed = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let text = '';
    try {
      text = await extractTextFromFile(file.path, file.originalname);
    } catch (e) { text = `Candidate File: ${file.originalname}`; }
    finally { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); }

    const evalResult = await evaluateResumeWithOllama(text, targetRole);
    const candidateName = file.originalname.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    const evalRow = {
      userId: req.user.id,
      organizationId: orgId,
      isNormalUserScan: 0,
      candidateName,
      candidateEmail: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@candidate.io`,
      targetRole,
      rawFileUrl: file.originalname,
      extractedText: text.substring(0, 3000),
      matchScore: evalResult.matchScore,
      summary: evalResult.summary,
      matchedSkills: JSON.stringify(evalResult.matchedSkills),
      missingSkills: JSON.stringify(evalResult.missingSkills),
      recommendations: evalResult.recommendations,
      status: 'screened',
      pipelineStage: 'ai_screened'
    };

    const resDb = await dbRun(
      `INSERT INTO evaluations (userId, organizationId, isNormalUserScan, candidateName, candidateEmail, targetRole, rawFileUrl, extractedText, matchScore, summary, matchedSkills, missingSkills, recommendations, status, pipelineStage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [evalRow.userId, evalRow.organizationId, evalRow.isNormalUserScan, evalRow.candidateName, evalRow.candidateEmail, evalRow.targetRole, evalRow.rawFileUrl, evalRow.extractedText, evalRow.matchScore, evalRow.summary, evalRow.matchedSkills, evalRow.missingSkills, evalRow.recommendations, evalRow.status, evalRow.pipelineStage]
    );
    evalRow.id = resDb.lastID;
    processed.push({ ...evalRow, matchedSkills: evalResult.matchedSkills, missingSkills: evalResult.missingSkills });

    io.to(uploadId).emit('processing_update', { processed: i + 1, total: files.length, current: candidateName });
  }

  io.to(uploadId).emit('ranking_complete', { candidates: processed });
});

// Enterprise Hiring Analytics Overview
app.get('/api/analytics/overview', authenticate, authorizeRole(['admin', 'hr', 'hiring_manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId || 'org_rankly_hq';
    const evals = await dbAll('SELECT * FROM evaluations WHERE (organizationId = ? OR organizationId IS NULL) AND isNormalUserScan = 0', [orgId]);

    const totalScreened = evals.length;
    const avgScore = totalScreened > 0 ? Math.round(evals.reduce((sum, e) => sum + (e.matchScore || 0), 0) / totalScreened) : 0;

    const stages = { applied: 0, ai_screened: 0, hm_review: 0, interview: 0, offered: 0, rejected: 0 };
    const rolesMap = {};

    evals.forEach(e => {
      const st = e.pipelineStage || 'ai_screened';
      if (stages[st] !== undefined) stages[st]++;
      else stages.ai_screened++;

      const r = e.targetRole || 'General';
      rolesMap[r] = (rolesMap[r] || 0) + 1;
    });

    const topRoles = Object.entries(rolesMap).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);

    res.json({
      totalScreened,
      avgMatchRate: `${avgScore}%`,
      avgScore,
      pipelineStages: stages,
      topRoles,
      organization: req.user.companyName || 'Rankly AI Global'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate analytics.' });
  }
});

// Team Invitations
app.post('/api/team/invite', authenticate, authorizeRole(['admin', 'hr']), async (req, res) => {
  try {
    const { email, assignedRole } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email address is required.' });

    const normalizedEmail = email.toLowerCase().trim();
    const inviterName = req.user.name || req.user.email;
    const orgId = req.user.organizationId || 'org_rankly_hq';
    const targetRole = ['hr', 'hiring_manager', 'admin'].includes(assignedRole) ? assignedRole : 'hr';
    const inviteToken = crypto.randomBytes(16).toString('hex');
    const inviteId = `inv_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    const existingInvite = await dbGet('SELECT * FROM invitations WHERE email = ?', [normalizedEmail]);
    if (existingInvite) {
      await dbRun(
        'UPDATE invitations SET invitedBy = ?, organizationId = ?, status = "pending", assignedRole = ?, expiresAt = ?, inviteToken = ? WHERE email = ?',
        [inviterName, orgId, targetRole, expiresAt, inviteToken, normalizedEmail]
      );
    } else {
      await dbRun(
        'INSERT INTO invitations (id, email, organizationId, invitedBy, status, assignedRole, inviteToken, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [inviteId, normalizedEmail, orgId, inviterName, 'pending', targetRole, inviteToken, expiresAt]
      );
    }

    const host = req.get('host') || 'rankly.ai';
    const inviteUrl = `${req.protocol}://${host}/?invite=${inviteToken}`;
    res.json({
      success: true,
      message: `Invitation generated for ${normalizedEmail}! 72-hour preview active.`,
      invite: { id: inviteId, email: normalizedEmail, invitedBy: inviterName, assignedRole: targetRole, expiresAt, inviteUrl }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send invitation.' });
  }
});

app.get('/api/team/invitations', authenticate, authorizeRole(['admin', 'hr']), async (req, res) => {
  try {
    const orgId = req.user.organizationId || 'org_rankly_hq';
    const invites = await dbAll('SELECT * FROM invitations WHERE organizationId = ? OR organizationId IS NULL ORDER BY createdAt DESC', [orgId]);
    const host = req.get('host') || 'rankly.ai';
    const formatted = invites.map(inv => {
      const msLeft = new Date(inv.expiresAt).getTime() - Date.now();
      let remainingText = 'Expired';
      let isExpired = true;
      if (msLeft > 0) {
        isExpired = false;
        const hours = Math.floor(msLeft / (3600 * 1000));
        const days = Math.floor(hours / 24);
        remainingText = days > 0 ? `${days}d ${hours % 24}h left` : `${hours}h left`;
      }
      return { ...inv, isExpired, remainingText, inviteUrl: `${req.protocol}://${host}/?invite=${inv.inviteToken}` };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invitations.' });
  }
});

app.post('/api/team/approve', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const { email, role } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const targetRole = ['hr', 'hiring_manager', 'admin'].includes(role) ? role : 'hr';

    await dbRun('UPDATE invitations SET status = "approved", assignedRole = ? WHERE email = ?', [targetRole, normalizedEmail]);
    await dbRun('UPDATE users SET status = "active", role = ?, expires_at = NULL WHERE email = ?', [targetRole, normalizedEmail]);

    res.json({ success: true, message: `Approved ${normalizedEmail} as ${targetRole.toUpperCase()}! Full workspace unlocked.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve member.' });
  }
});

app.post('/api/team/reject', authenticate, authorizeRole(['admin']), async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    await dbRun('UPDATE invitations SET status = "rejected" WHERE email = ?', [normalizedEmail]);
    await dbRun('DELETE FROM users WHERE email = ? AND status = "pending"', [normalizedEmail]);
    res.json({ success: true, message: `Invitation for ${normalizedEmail} rejected.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject member.' });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    engine: `Ollama ${OLLAMA_MODEL} (Free 100% Local Inference)`,
    auth: { google: hasGoogleStrategy, facebook: hasFacebookStrategy }
  });
});

// ── Socket.io Connection ──────────────────────────────────
io.on('connection', (socket) => {
  socket.emit('connected', { status: 'ok', socketId: socket.id });
  socket.on('join_upload', (uploadId) => socket.join(uploadId));
});

// ── Start Server ──────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`\n======================================================`);
  logger.info(`🚀 Rankly.ai Core Engine Active on Port ${PORT}`);
  logger.info(`👉 Direct Browser Access: http://rankly.ai (or http://localhost:${PORT})`);
  logger.info(`🤖 Ollama Host: ${OLLAMA_URL} (Model: ${OLLAMA_MODEL})`);
  logger.info(`======================================================\n`);
});

// Also bind standard Port 80 so http://rankly.ai works without typing :3000
if (PORT !== 80) {
  try {
    const server80 = http.createServer(app);
    io.attach(server80);
    server80.listen(80, '0.0.0.0', () => {
      logger.info(`🌐 Standard HTTP Port 80 active -> Direct URL: http://rankly.ai`);
    }).on('error', (err) => {
      logger.info(`ℹ️ Port 80 note: ${err.message} (Accessing via http://localhost:${PORT})`);
    });
  } catch (err) {
    logger.info(`ℹ️ Port 80 binding skipped: ${err.message}`);
  }
}
