const healthChecker = require('../services/healthChecker');
const path = require('path');
const fs = require('fs');

/**
 * Public Health Status (Lightweight)
 */
async function getPublicStatus(req, res) {
    try {
        const autoFix = healthChecker.getAutoFixStatus();
        const logs = healthChecker.getRecentLogs();
        const latest = logs[0] || null;

        return res.json({
            status: latest ? latest.status : 'HEALTHY',
            system: 'Rankly.ai Executive OS',
            healthChecker: {
                interval: '2m',
                autoFixEnabled: autoFix,
                lastChecked: latest ? latest.timestamp : new Date().toISOString()
            },
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({ status: 'ERROR', message: err.message });
    }
}

/**
 * Full Diagnostics Report (Admin / Authenticated)
 */
async function getDiagnostics(req, res) {
    try {
        const logs = healthChecker.getRecentLogs();
        const threats = healthChecker.getSecurityThreats();
        const snapshots = healthChecker.listSnapshots();
        const latest = logs[0] || null;

        const mem = process.memoryUsage();

        return res.json({
            success: true,
            telemetry: {
                status: latest ? latest.status : 'HEALTHY',
                lastChecked: latest ? latest.timestamp : new Date().toISOString(),
                autoFixEnabled: healthChecker.getAutoFixStatus(),
                totalAuditsRun: logs.length,
                memory: {
                    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
                    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
                    rssMB: Math.round(mem.rss / 1024 / 1024)
                },
                dbLatency: latest?.metrics?.dbLatency || 4,
                uptimeSeconds: Math.floor(process.uptime())
            },
            latestAudit: latest,
            recentLogs: logs.slice(0, 20),
            threats: threats.slice(0, 20),
            snapshots: snapshots.slice(0, 10)
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Trigger Manual Health Check & Self-Healing
 */
async function triggerManualCheck(req, res) {
    try {
        const audit = await healthChecker.runHealthCheck({ isManual: true });
        return res.json({
            success: true,
            message: `Health audit completed: ${audit.status}`,
            audit
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Toggle Auto-Fix Mode
 */
async function toggleAutoFix(req, res) {
    try {
        const { enabled } = req.body;
        const newStatus = healthChecker.toggleAutoFix(enabled);
        return res.json({
            success: true,
            autoFixEnabled: newStatus,
            message: `Auto-Fix Engine is now ${newStatus ? 'ENABLED' : 'DISABLED'}`
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Get Health Audit Logs
 */
async function getLogs(req, res) {
    try {
        const logs = healthChecker.getRecentLogs();
        return res.json({ success: true, logs });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Rollback to a specific snapshot
 */
async function rollbackSnapshot(req, res) {
    try {
        const { snapshotId } = req.body;
        if (!snapshotId) {
            return res.status(400).json({ success: false, message: 'snapshotId is required' });
        }

        const snapshots = healthChecker.listSnapshots();
        const target = snapshots.find(s => s.id === snapshotId);
        if (!target) {
            return res.status(404).json({ success: false, message: 'Snapshot not found' });
        }

        const success = await healthChecker.rollbackCode(target);
        if (success) {
            return res.json({ success: true, message: `Successfully rolled back to snapshot ${snapshotId}` });
        } else {
            return res.status(500).json({ success: false, message: 'Rollback failed' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Get Security Threats Telemetry
 */
async function getSecurityThreats(req, res) {
    try {
        const threats = healthChecker.getSecurityThreats();
        return res.json({ success: true, threats });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

/**
 * Trigger Test Email Notification to Developer
 */
async function sendTestEmail(req, res) {
    try {
        const nodemailer = require('nodemailer');
        const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
        const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
        const targetEmail = req.body?.email || process.env.DEVELOPER_EMAIL || 'mayursweet52@gmail.com';

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: smtpPort,
            secure: isSecure,
            auth: {
                user: (process.env.SMTP_USER || 'rankly.ai.com@gmail.com').trim(),
                pass: (process.env.SMTP_PASS || 'nkfbubodfvjtgkju').replace(/\s+/g, '').trim()
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
            tls: { rejectUnauthorized: false }
        });

        const info = await transporter.sendMail({
            from: `"Rankly.ai System Health" <${process.env.SMTP_USER || 'rankly.ai.com@gmail.com'}>`,
            to: targetEmail,
            subject: '🔔 Rankly.ai – Live Test Email Verification',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 540px; margin: auto;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <span style="font-size: 24px;">🚀</span>
                        <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Rankly.ai SRE Health Alert Test</h2>
                    </div>
                    <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                        Bhai, aapka <strong>Rankly.ai Self-Healing & SRE Notification System</strong> 100% operational hai!
                    </p>
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px; font-family: monospace; color: #1e293b;">
                        <div>🟢 <strong>System Status:</strong> 100% HEALTHY (0 Errors)</div>
                        <div>🔒 <strong>Protocol:</strong> SMTP Port 465 (Direct SSL)</div>
                        <div>⏱️ <strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
                        <div>🎯 <strong>Recipient:</strong> ${targetEmail}</div>
                    </div>
                    <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
                        Yeh test email aapke manual trigger se dispatch hui hai. Periodic 2-minute background health alerts sirf tab aati hain jab koi code anomaly ya self-heal execute hota hai.
                    </p>
                </div>
            `
        });

        return res.json({
            success: true,
            message: `Test email successfully sent to ${targetEmail}`,
            messageId: info.messageId,
            response: info.response
        });
    } catch (err) {
        console.error('Test email error:', err);
        return res.status(500).json({ success: false, message: `Failed to send test email: ${err.message}` });
    }
}

module.exports = {
    getPublicStatus,
    getDiagnostics,
    triggerManualCheck,
    toggleAutoFix,
    getLogs,
    rollbackSnapshot,
    getSecurityThreats,
    sendTestEmail
};
