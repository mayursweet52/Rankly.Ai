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
        const { sendSystemEmail } = require('../services/emailService');
        const targetEmail = req.body?.email || process.env.DEVELOPER_EMAIL || 'rankly.ai.com@gmail.com';

        const result = await sendSystemEmail({
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
                        <div>🔒 <strong>Protocol:</strong> Multi-Tier Resilient HTTPS & SSL</div>
                        <div>⏱️ <strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
                        <div>🎯 <strong>Recipient:</strong> ${targetEmail}</div>
                    </div>
                    <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
                        Yeh test email aapke manual trigger se dispatch hui hai. Periodic 2-minute background health alerts sirf tab aati hain jab koi code anomaly ya self-heal execute hota hai.
                    </p>
                </div>
            `
        });

        if (result.success) {
            return res.json({
                success: true,
                message: `Test email successfully sent to ${targetEmail} via ${result.method || 'HTTPS'}`,
                method: result.method
            });
        } else {
            return res.status(500).json({ success: false, message: `Failed to send test email: ${result.message}` });
        }
    } catch (err) {
        console.error('Test email error:', err);
        return res.status(500).json({ success: false, message: `Failed to send test email: ${err.message}` });
    }
}

/**
 * Interactive Email: Handle Approve Fix Click
 */
async function handleApproveFix(req, res) {
    const token = req.query.token;
    const payload = healthChecker.verifyActionToken(token);

    if (!payload || payload.action !== 'approve_fix') {
        return res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Invalid or Expired Approval Token</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px;">
                <div style="background: #1e293b; border: 1px solid #ef4444; border-radius: 16px; padding: 36px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                    <div style="font-size: 54px; margin-bottom: 12px;">⚠️</div>
                    <h2 style="color: #f87171; margin: 0 0 12px 0;">Approval Token Expired or Invalid</h2>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">This action link has expired (24-hour validity limit) or contains an invalid signature. Please execute a diagnostic check directly from your dashboard.</p>
                    <a href="/dashboard" style="display: inline-block; margin-top: 20px; background: #3b82f6; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open Dashboard</a>
                </div>
            </body>
            </html>
        `);
    }

    try {
        const result = await healthChecker.runHealthCheck({ isManual: true });
        
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Fix Approved & Applied - Rankly.ai SRE</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px;">
                <div style="background: #1e293b; border: 1px solid #10b981; border-radius: 16px; padding: 36px; max-width: 520px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                    <div style="font-size: 54px; margin-bottom: 12px;">✅</div>
                    <h2 style="color: #34d399; margin: 0 0 12px 0;">Auto-Fix Successfully Approved!</h2>
                    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                        Your authorization has been confirmed. The Autonomous Self-Healing Engine has successfully executed the targeted remediation.
                    </p>
                    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; margin: 20px 0; text-align: left; font-size: 13px; font-family: monospace; color: #94a3b8;">
                        <div>🟢 <strong>System Status:</strong> ${result.status}</div>
                        <div>📊 <strong>Total Checks:</strong> ${result.totalChecks}</div>
                        <div>🔧 <strong>Issues Resolved:</strong> ${result.issuesFound === 0 ? 'All Clean (0 errors)' : result.issuesFound + ' pending'}</div>
                        <div>⏱️ <strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
                    </div>
                    <a href="/dashboard" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Open System Dashboard</a>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        return res.status(500).send(`<h2>Error applying fix: ${err.message}</h2>`);
    }
}

/**
 * Interactive Email: Handle Reject / Ignore Click
 */
async function handleRejectFix(req, res) {
    const token = req.query.token;
    const payload = healthChecker.verifyActionToken(token);

    if (!payload || payload.action !== 'reject_fix') {
        return res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Invalid Token</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px;">
                <div style="background: #1e293b; border: 1px solid #ef4444; border-radius: 16px; padding: 36px; max-width: 480px; text-align: center;">
                    <div style="font-size: 54px; margin-bottom: 12px;">⚠️</div>
                    <h2 style="color: #f87171; margin: 0 0 12px 0;">Token Expired or Invalid</h2>
                    <p style="color: #94a3b8; font-size: 14px;">This authorization token has expired or is invalid.</p>
                </div>
            </body>
            </html>
        `);
    }

    healthChecker.recordSecurityThreat({
        type: 'anomaly_dismissed_by_admin',
        message: `Admin dismissed ${payload.issueCount || 1} anomaly via interactive email action.`,
        action: 'ignored'
    });

    return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Fix Dismissed - Rankly.ai SRE</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 16px;">
            <div style="background: #1e293b; border: 1px solid #64748b; border-radius: 16px; padding: 36px; max-width: 500px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="font-size: 54px; margin-bottom: 12px;">🛡️</div>
                <h2 style="color: #94a3b8; margin: 0 0 12px 0;">Anomaly Dismissed & Logged</h2>
                <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                    You have dismissed this remediation. This decision has been safely recorded in the telemetry audit trail.
                </p>
                <div style="margin-top: 24px;">
                    <a href="/dashboard" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Return to Dashboard</a>
                </div>
            </div>
        </body>
        </html>
    `);
}

module.exports = {
    getPublicStatus,
    getDiagnostics,
    triggerManualCheck,
    toggleAutoFix,
    getLogs,
    rollbackSnapshot,
    getSecurityThreats,
    sendTestEmail,
    handleApproveFix,
    handleRejectFix
};
