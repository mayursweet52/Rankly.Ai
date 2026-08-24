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

module.exports = {
    getPublicStatus,
    getDiagnostics,
    triggerManualCheck,
    toggleAutoFix,
    getLogs,
    rollbackSnapshot,
    getSecurityThreats
};
