const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const prisma = require('../config/database');

// ─── CONFIGURATION ───
const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
const MAX_AUTO_FIX_ATTEMPTS = 3;
const SNAPSHOT_DIR = path.join(process.cwd(), 'backups', 'health_snapshots');
const LOG_FILE = path.join(process.cwd(), 'health_logs.json');
const THREAT_LOG_FILE = path.join(process.cwd(), 'security_threats.json');

// In-memory circular buffer for fast real-time API queries
const recentLogs = [];
const securityThreats = [];
let isAutoFixEnabled = process.env.AUTO_FIX_ENABLED !== 'false'; // Default enabled
let lastEmailAlertTime = 0;
const EMAIL_ALERT_COOLDOWN = 15 * 60 * 1000; // 15 minutes throttle

// Ensure snapshot directory exists
if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// ─── SECURITY THREAT TELEMETRY LOGGER ───
function recordSecurityThreat(threat) {
    const entry = {
        id: 'threat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        ...threat
    };
    securityThreats.unshift(entry);
    if (securityThreats.length > 200) securityThreats.pop();

    try {
        let existing = [];
        if (fs.existsSync(THREAT_LOG_FILE)) {
            existing = JSON.parse(fs.readFileSync(THREAT_LOG_FILE, 'utf-8'));
        }
        existing.unshift(entry);
        if (existing.length > 500) existing = existing.slice(0, 500);
        fs.writeFileSync(THREAT_LOG_FILE, JSON.stringify(existing, null, 2));
    } catch (e) {}
}

// ─── MICRO-LEVEL CHECKS ───
const checks = {
    // 1. Node.js Syntax Verification
    syntax: async (filePath) => {
        return new Promise((resolve) => {
            if (!fs.existsSync(filePath)) {
                return resolve({ error: false, message: null });
            }
            exec(`node --check "${filePath}"`, (error, stdout, stderr) => {
                if (error) {
                    return resolve({ error: true, message: stderr || error.message });
                }
                resolve({ error: false, message: null });
            });
        });
    },

    // 2. Database Connectivity & Query Latency Check
    database: async () => {
        const start = Date.now();
        try {
            await prisma.user.findFirst({ select: { id: true } });
            const latencyMs = Date.now() - start;
            if (latencyMs > 2500) {
                return { error: true, message: `High database latency: ${latencyMs}ms (Threshold: 2500ms)` };
            }
            return { error: false, message: null, latencyMs };
        } catch (err) {
            return { error: true, message: `Database query failed: ${err.message}` };
        }
    },

    // 3. Memory & Heap Exhaustion Check
    memory: async () => {
        const mem = process.memoryUsage();
        const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);

        if (rssMB > 950) {
            return { error: true, message: `Critical Memory Alert: RSS is ${rssMB}MB (Threshold: 950MB)` };
        }
        if (heapUsedMB > 450 && heapTotalMB > 0 && (mem.heapUsed / mem.heapTotal) > 0.90) {
            return { error: true, message: `High Heap Exhaustion: ${heapUsedMB}MB / ${heapTotalMB}MB (>90%)` };
        }
        return { error: false, message: null, heapUsedMB, rssMB };
    },

    // 4. Missing Semicolons & Dangerous Patterns in Target Code
    semicolons: async (filePath) => {
        if (!fs.existsSync(filePath)) return { error: false, message: null };
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const issues = [];
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (
                    trimmed &&
                    !trimmed.startsWith('//') &&
                    !trimmed.startsWith('/*') &&
                    !trimmed.startsWith('*') &&
                    !trimmed.endsWith(';') &&
                    !trimmed.endsWith('{') &&
                    !trimmed.endsWith('}') &&
                    !trimmed.endsWith(',') &&
                    !trimmed.endsWith('(') &&
                    !trimmed.endsWith('=>') &&
                    !trimmed.endsWith(':') &&
                    !trimmed.endsWith('[') &&
                    !trimmed.endsWith(']') &&
                    !trimmed.endsWith('`') &&
                    !trimmed.startsWith('case ') &&
                    !trimmed.startsWith('default:') &&
                    (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ') || trimmed.startsWith('return ') || trimmed.startsWith('throw '))
                ) {
                    issues.push(`Line ${index + 1}: Missing semicolon -> "${trimmed.slice(0, 60)}"`);
                }
            });
            if (issues.length > 0) {
                return { error: true, message: issues.slice(0, 5).join('\n') };
            }
            return { error: false, message: null };
        } catch (e) {
            return { error: false, message: null };
        }
    },

    // 5. Express Route Integrity Check
    apiEndpoints: async () => {
        try {
            const serverPath = path.join(process.cwd(), 'server.js');
            if (!fs.existsSync(serverPath)) return { error: false, message: null };
            const serverContent = fs.readFileSync(serverPath, 'utf-8');
            
            // Validate required core routes are mounted
            const requiredMounts = ['/api/auth', '/api/user', '/api/resumes', '/api/chat', '/api/analytics'];
            const missing = [];
            for (const mount of requiredMounts) {
                if (!serverContent.includes(`'${mount}'`) && !serverContent.includes(`"${mount}"`)) {
                    missing.push(mount);
                }
            }
            if (missing.length > 0) {
                return { error: true, message: `Missing critical route mounts: ${missing.join(', ')}` };
            }
            return { error: false, message: null };
        } catch (err) {
            return { error: true, message: `Route check error: ${err.message}` };
        }
    },

    // 6. Hacker Anomaly & Brute Force Attack Check
    securityAnomalies: async () => {
        // Inspect recent threat logs
        const recentThreatCount = securityThreats.filter(t => Date.now() - new Date(t.timestamp).getTime() < 10 * 60 * 1000).length;
        if (recentThreatCount >= 20) {
            return { error: true, message: `Security Alert: ${recentThreatCount} suspicious requests detected in last 10 minutes!` };
        }
        return { error: false, message: null, recentThreatCount };
    },

    // 7. Duplicate Code Detection
    duplicateCode: async (filePath) => {
        if (!fs.existsSync(filePath)) return { error: false, message: null };
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const seen = new Map();
            const duplicates = [];
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed && trimmed.length > 30 && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('return res.')) {
                    if (seen.has(trimmed)) {
                        duplicates.push(`Line ${index + 1} duplicates line ${seen.get(trimmed)}`);
                    } else {
                        seen.set(trimmed, index + 1);
                    }
                }
            });
            if (duplicates.length > 25) {
                return { error: true, message: `High duplication: ${duplicates.length} repetitive lines` };
            }
            return { error: false, message: null };
        } catch (e) {
            return { error: false, message: null };
        }
    }
};

// ─── BACKUP CODE (SNAPSHOT) ───
async function backupCode(files) {
    const timestamp = Date.now();
    const backupFolder = path.join(SNAPSHOT_DIR, `snapshot_${timestamp}`);
    fs.mkdirSync(backupFolder, { recursive: true });

    const backedUpFiles = [];
    const filesToBackup = files && files.length ? files : ['server.js', 'src/controllers/authController.js', 'src/controllers/resumeController.js', 'src/config/passport.js'];

    for (const relFile of filesToBackup) {
        const fullPath = path.isAbsolute(relFile) ? relFile : path.join(process.cwd(), relFile);
        if (fs.existsSync(fullPath)) {
            const targetDest = path.join(backupFolder, path.basename(relFile));
            fs.copyFileSync(fullPath, targetDest);
            backedUpFiles.push({ original: fullPath, backup: targetDest });
        }
    }

    const manifestPath = path.join(backupFolder, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ timestamp, files: backedUpFiles }, null, 2));

    return { backupFolder, timestamp, files: backedUpFiles };
}

// ─── ROLLBACK CODE ───
async function rollbackCode(backupInfo) {
    if (!backupInfo || !backupInfo.files || !backupInfo.files.length) {
        console.error('❌ Cannot rollback: Invalid backup info.');
        return false;
    }

    try {
        console.log(`🔄 Rolling back code to snapshot ${backupInfo.timestamp}...`);
        for (const item of backupInfo.files) {
            if (fs.existsSync(item.backup)) {
                fs.copyFileSync(item.backup, item.original);
                console.log(`↩️ Restored: ${item.original}`);
            }
        }
        return true;
    } catch (err) {
        console.error(`❌ Rollback error: ${err.message}`);
        return false;
    }
}

// ─── AUTO-FIX ENGINE ───
async function autoFixIssue(issue) {
    console.log(`🔧 [Self-Healing] Attempting auto-fix for ${issue.check} on ${issue.file}`);
    const backup = await backupCode([issue.file]);

    try {
        if (issue.check === 'semicolons') {
            const content = fs.readFileSync(issue.file, 'utf-8');
            const lines = content.split('\n');
            const fixedLines = lines.map(line => {
                const trimmed = line.trim();
                if (
                    trimmed &&
                    !trimmed.startsWith('//') &&
                    !trimmed.startsWith('/*') &&
                    !trimmed.startsWith('*') &&
                    !trimmed.endsWith(';') &&
                    !trimmed.endsWith('{') &&
                    !trimmed.endsWith('}') &&
                    !trimmed.endsWith(',') &&
                    !trimmed.endsWith('(') &&
                    !trimmed.endsWith('=>') &&
                    !trimmed.endsWith(':') &&
                    !trimmed.endsWith('[') &&
                    !trimmed.endsWith(']') &&
                    !trimmed.endsWith('`') &&
                    !trimmed.startsWith('case ') &&
                    !trimmed.startsWith('default:') &&
                    (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ') || trimmed.startsWith('return ') || trimmed.startsWith('throw '))
                ) {
                    return line + ';';
                }
                return line;
            });

            fs.writeFileSync(issue.file, fixedLines.join('\n'));
        }

        // Test before applying
        const recheck = await checks.syntax(issue.file);
        if (!recheck.error) {
            console.log(`✅ [Self-Healing] Fix verified successfully for ${issue.check} on ${issue.file}`);
            return { success: true, file: issue.file, check: issue.check };
        } else {
            console.log(`❌ [Self-Healing] Fix failed syntax verification. Rolling back immediately...`);
            await rollbackCode(backup);
            return { success: false, file: issue.file, check: issue.check, error: recheck.message };
        }
    } catch (err) {
        console.error(`❌ [Self-Healing] Auto-fix exception: ${err.message}. Rolling back...`);
        await rollbackCode(backup);
        return { success: false, file: issue.file, check: issue.check, error: err.message };
    }
}

// ─── SEND HEALTH ALERT EMAIL ───
async function sendHealthAlert(issues, healActions = []) {
    const now = Date.now();
    if (now - lastEmailAlertTime < EMAIL_ALERT_COOLDOWN) {
        console.log('⏳ Health email alert throttled to avoid inbox spam.');
        return;
    }
    lastEmailAlertTime = now;

    try {
        const { sendSystemEmail } = require('./emailService');
        const issuesHtml = issues.map(i => `
            <li style="margin-bottom: 8px; font-family: monospace; font-size: 13px;">
                <strong style="color: #e11d48;">[${i.check.toUpperCase()}]</strong> 
                <span style="color: #334155;">${i.file || 'System'}:</span> 
                <span style="color: #64748b;">${i.error}</span>
            </li>
        `).join('');

        const healHtml = healActions.length ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; margin: 16px 0;">
                <h4 style="color: #166534; margin: 0 0 8px 0;">🔧 Autonomous Self-Healing Actions Taken:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    ${healActions.map(a => `<li style="font-size: 12px; color: #15803d;">${a.success ? '✅ Fixed' : '❌ Rolled back'}: ${a.check} on ${a.file}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        const targetEmail = process.env.DEVELOPER_EMAIL || 'mayursweet52@gmail.com';
        const res = await sendSystemEmail({
            to: targetEmail,
            subject: `⚠️ [Rankly.ai Health Alert] ${issues.length} System Issue(s) Detected & Managed`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background: #0f172a; padding: 20px; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 20px;">🛡️ Rankly.ai Autonomous Health Telemetry</h2>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Continuous Background Mistake Detection & Self-Healing</p>
                    </div>
                    <div style="padding: 24px;">
                        <p style="font-size: 14px; color: #1e293b; margin-top: 0;">
                            The 2-minute background health checker detected <strong>${issues.length}</strong> operational anomaly(ies) on <strong>${new Date().toLocaleString()}</strong>.
                        </p>
                        
                        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 14px; border-radius: 8px; margin: 16px 0;">
                            <h4 style="color: #991b1b; margin: 0 0 10px 0;">Detected Issues:</h4>
                            <ul style="margin: 0; padding-left: 18px;">
                                ${issuesHtml}
                            </ul>
                        </div>

                        ${healHtml}

                        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
                            Auto-Fix Engine: <strong>${isAutoFixEnabled ? 'ENABLED' : 'DISABLED'}</strong> | Check Interval: <strong>2 Minutes</strong>
                        </p>
                    </div>
                    <div style="background: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                        Rankly.ai Autonomous SRE & Self-Healing Agent • Environment: ${process.env.NODE_ENV || 'production'}
                    </div>
                </div>
            `
        });

        if (res.success) {
            console.log(`📧 Health alert email dispatched to ${targetEmail} via ${res.method}`);
        } else {
            console.warn(`⚠️ Health alert email delivery warning: ${res.message}`);
        }
    } catch (err) {
        console.error('⚠️ Could not send health email alert:', err.message);
    }
}

// ─── MAIN HEALTH AUDIT FUNCTION ───
async function runHealthCheck(options = {}) {
    const isManual = options.isManual || false;
    console.log(`🔍 [HealthChecker] Running ${isManual ? 'manual' : 'scheduled'} health check...`);

    const results = [];
    const filesToCheck = [
        'server.js',
        'src/controllers/authController.js',
        'src/controllers/resumeController.js',
        'src/controllers/userController.js',
        'src/controllers/pipelineController.js',
        'src/controllers/analyticsController.js',
        'src/controllers/chatController.js',
        'src/routes/authRoutes.js',
        'src/routes/resumeRoutes.js',
        'src/routes/userRoutes.js',
        'src/routes/chatRoutes.js',
        'src/services/aiService.js',
        'src/services/emailService.js',
        'src/config/passport.js',
        'src/config/database.js',
        'src/utils/helpers.js'
    ];

    // 1. Check syntax on all target files
    for (const relFile of filesToCheck) {
        const fullPath = path.join(process.cwd(), relFile);
        if (!fs.existsSync(fullPath)) continue;

        try {
            const syntaxResult = await checks.syntax(fullPath);
            if (syntaxResult.error) {
                results.push({
                    file: relFile,
                    check: 'syntax',
                    error: syntaxResult.message,
                    timestamp: new Date().toISOString()
                });
            }

            // Check semicolons & formatting on core files
            if (relFile === 'server.js' || relFile.startsWith('src/controllers/')) {
                const semiResult = await checks.semicolons(fullPath);
                if (semiResult.error) {
                    results.push({
                        file: relFile,
                        check: 'semicolons',
                        error: semiResult.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.error(`Error checking file ${relFile}:`, err.message);
        }
    }

    // 2. Check Database connectivity
    const dbResult = await checks.database();
    if (dbResult.error) {
        results.push({
            file: 'Prisma SQLite Database',
            check: 'database',
            error: dbResult.message,
            timestamp: new Date().toISOString()
        });
    }

    // 3. Check Memory & Heap
    const memResult = await checks.memory();
    if (memResult.error) {
        results.push({
            file: 'Node.js Process',
            check: 'memory',
            error: memResult.message,
            timestamp: new Date().toISOString()
        });
    }

    // 4. Check Express Route Mounts
    const routeResult = await checks.apiEndpoints();
    if (routeResult.error) {
        results.push({
            file: 'server.js',
            check: 'routes',
            error: routeResult.message,
            timestamp: new Date().toISOString()
        });
    }

    // 5. Check Security Threat buffer
    const secResult = await checks.securityAnomalies();
    if (secResult.error) {
        results.push({
            file: 'Security Telemetry',
            check: 'security',
            error: secResult.message,
            timestamp: new Date().toISOString()
        });
    }

    // Process findings
    const healActions = [];
    if (results.length > 0) {
        console.log(`⚠️ [HealthChecker] Detected ${results.length} issue(s).`);

        // Auto-fix eligible issues if enabled
        if (isAutoFixEnabled) {
            for (const issue of results) {
                if (issue.check === 'semicolons' && issue.file) {
                    const fullPath = path.join(process.cwd(), issue.file);
                    const action = await autoFixIssue({ ...issue, file: fullPath });
                    healActions.push(action);
                }
            }
        }

        // Send alert if there are serious issues
        await sendHealthAlert(results, healActions);
    } else {
        console.log('✅ [HealthChecker] All micro-level health checks passed 100% cleanly.');
    }

    // Record audit log
    const logEntry = {
        id: 'audit_' + Date.now(),
        timestamp: new Date().toISOString(),
        status: results.length === 0 ? 'HEALTHY' : (results.some(r => r.check === 'syntax' || r.check === 'database') ? 'CRITICAL' : 'WARNING'),
        totalChecks: filesToCheck.length + 4,
        issuesFound: results.length,
        issues: results,
        healActions,
        metrics: {
            memory: memResult,
            dbLatency: dbResult.latencyMs || null,
            autoFixEnabled: isAutoFixEnabled,
            uptimeSeconds: Math.floor(process.uptime())
        }
    };

    recentLogs.unshift(logEntry);
    if (recentLogs.length > 100) recentLogs.pop();

    try {
        let fileLogs = [];
        if (fs.existsSync(LOG_FILE)) {
            fileLogs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
        }
        fileLogs.unshift(logEntry);
        if (fileLogs.length > 200) fileLogs = fileLogs.slice(0, 200);
        fs.writeFileSync(LOG_FILE, JSON.stringify(fileLogs, null, 2));
    } catch (e) {}

    return logEntry;
}

// ─── START BACKGROUND CRON ───
let healthIntervalHandle = null;

function startHealthChecker() {
    if (healthIntervalHandle) {
        clearInterval(healthIntervalHandle);
    }

    console.log(`🚀 [HealthChecker] Continuous 2-minute self-healing background worker initialized.`);
    
    // Initial run on startup (after 5s delay to let DB connect)
    setTimeout(() => {
        runHealthCheck().catch(err => console.error('Startup health check error:', err));
    }, 5000);

    // Periodic 2-minute execution
    healthIntervalHandle = setInterval(() => {
        runHealthCheck().catch(err => console.error('Periodic health check error:', err));
    }, CHECK_INTERVAL);
}

// ─── SNAPSHOT MANAGEMENT ───
function listSnapshots() {
    try {
        if (!fs.existsSync(SNAPSHOT_DIR)) return [];
        const entries = fs.readdirSync(SNAPSHOT_DIR);
        return entries
            .filter(e => e.startsWith('snapshot_'))
            .map(e => {
                const manifest = path.join(SNAPSHOT_DIR, e, 'manifest.json');
                let info = {};
                if (fs.existsSync(manifest)) {
                    info = JSON.parse(fs.readFileSync(manifest, 'utf-8'));
                }
                return {
                    id: e,
                    folder: path.join(SNAPSHOT_DIR, e),
                    timestamp: info.timestamp || parseInt(e.replace('snapshot_', ''), 10) || Date.now(),
                    files: info.files || []
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
        return [];
    }
}

function toggleAutoFix(enable) {
    isAutoFixEnabled = typeof enable === 'boolean' ? enable : !isAutoFixEnabled;
    return isAutoFixEnabled;
}

module.exports = {
    startHealthChecker,
    runHealthCheck,
    recordSecurityThreat,
    backupCode,
    rollbackCode,
    listSnapshots,
    toggleAutoFix,
    getAutoFixStatus: () => isAutoFixEnabled,
    getRecentLogs: () => recentLogs,
    getSecurityThreats: () => securityThreats
};
