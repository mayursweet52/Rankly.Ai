const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Ensure audit_logs table exists
async function initAuditTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        actor_id TEXT,
        actor_email TEXT,
        actor_role TEXT,
        target_type TEXT DEFAULT 'candidate',
        target_id TEXT,
        target_name TEXT,
        previous_stage TEXT,
        new_stage TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn('[AuditLog] Table init warning:', err.message);
  }
}

initAuditTable();

/**
 * Record an audit log entry
 */
async function recordAuditLog({
  action,
  actorId = null,
  actorEmail = 'system@rankly.ai',
  actorRole = 'hr',
  targetType = 'candidate',
  targetId = null,
  targetName = null,
  previousStage = null,
  newStage = null,
  details = null
}) {
  try {
    await initAuditTable();
    const id = crypto.randomUUID();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || '');

    // SQLite uses '?' or raw values
    const safeSql = `
      INSERT INTO audit_logs (
        id, action, actor_id, actor_email, actor_role, target_type,
        target_id, target_name, previous_stage, new_stage, details, created_at
      ) VALUES (
        '${id}',
        '${(action || '').replace(/'/g, "''")}',
        ${actorId ? `'${actorId.replace(/'/g, "''")}'` : 'NULL'},
        '${(actorEmail || '').replace(/'/g, "''")}',
        '${(actorRole || 'hr').replace(/'/g, "''")}',
        '${(targetType || 'candidate').replace(/'/g, "''")}',
        ${targetId ? `'${targetId.replace(/'/g, "''")}'` : 'NULL'},
        ${targetName ? `'${targetName.replace(/'/g, "''")}'` : 'NULL'},
        ${previousStage ? `'${previousStage.replace(/'/g, "''")}'` : 'NULL'},
        ${newStage ? `'${newStage.replace(/'/g, "''")}'` : 'NULL'},
        '${detailsStr.replace(/'/g, "''")}',
        datetime('now')
      );
    `;

    await prisma.$executeRawUnsafe(safeSql);

    console.log(`[AuditLog] Recorded: ${action} on ${targetName || targetId} by ${actorEmail} (${previousStage || 'init'} -> ${newStage || 'done'})`);
    return { success: true, id };
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieve recent audit logs
 */
async function getRecentAuditLogs(limit = 50) {
  try {
    await initAuditTable();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT 
        id, action, actor_id as actorId, actor_email as actorEmail, actor_role as actorRole,
        target_type as targetType, target_id as targetId, target_name as targetName,
        previous_stage as previousStage, new_stage as newStage, details, created_at as createdAt
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit, 10) || 50};
    `);

    return (rows || []).map(row => {
      let parsedDetails = row.details;
      try {
        if (row.details && (row.details.startsWith('{') || row.details.startsWith('['))) {
          parsedDetails = JSON.parse(row.details);
        }
      } catch (_) {}
      return {
        ...row,
        details: parsedDetails
      };
    });
  } catch (err) {
    console.error('[AuditLog] Failed to get audit logs:', err.message);
    return [];
  }
}

module.exports = {
  recordAuditLog,
  getRecentAuditLogs
};
