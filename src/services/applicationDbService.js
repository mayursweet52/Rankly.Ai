/**
 * Anti-Gravity Application & Audit Trail Database Service
 * Manages applications table and audit_logs in Supabase / PostgreSQL
 * Enforces strict lifecycle states and immutable audit logging.
 */

const db = require('../config/pgDatabase');

const VALID_STATUSES = [
  'pending_screening',
  'ai_shortlisted',
  'hr_review_pending',
  'hr_shortlisted',
  'rejected'
];

// Permitted lifecycle state transitions
const ALLOWED_TRANSITIONS = {
  'pending_screening': ['ai_shortlisted', 'rejected'],
  'ai_shortlisted': ['hr_review_pending', 'rejected'],
  'hr_review_pending': ['hr_shortlisted', 'rejected'],
  'hr_shortlisted': ['rejected'],
  'rejected': [] // terminal state
};

/**
 * Validate status value against strict check constraint
 */
function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

/**
 * Validate lifecycle transition
 */
function isValidTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Create a new application
 */
async function createApplication({
  candidateId,
  jobTitle,
  companyName = 'Rankly.ai',
  resumeUrl = null,
  matchScore = 0,
  screeningVerdict = null,
  screeningNotes = null,
  matchedSkills = [],
  missingSkills = [],
  actorEmail = null,
  actorId = null
}) {
  if (!candidateId) throw new Error('candidateId is required.');
  if (!jobTitle) throw new Error('jobTitle is required.');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Set actor context for trigger
    if (actorEmail) await client.query(`SET LOCAL rankly.current_actor_email = '${actorEmail.replace(/'/g, "''")}'`);
    if (actorId) await client.query(`SET LOCAL rankly.current_actor_id = '${String(actorId).replace(/'/g, "''")}'`);
    await client.query(`SET LOCAL rankly.current_actor_type = 'candidate'`);

    const insertQuery = `
      INSERT INTO public.applications (
        candidate_id,
        job_title,
        company_name,
        resume_url,
        match_score,
        status,
        screening_verdict,
        screening_notes,
        matched_skills,
        missing_skills
      ) VALUES ($1, $2, $3, $4, $5, 'pending_screening', $6, $7, $8, $9)
      RETURNING *;
    `;

    const res = await client.query(insertQuery, [
      candidateId,
      jobTitle,
      companyName,
      resumeUrl,
      matchScore,
      screeningVerdict,
      screeningNotes,
      JSON.stringify(matchedSkills || []),
      JSON.stringify(missingSkills || [])
    ]);

    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update application status through strict lifecycle
 */
async function updateApplicationStatus(id, {
  newStatus,
  actorType = 'hr_admin', // 'system_ai', 'hr_admin'
  actorId = null,
  actorEmail = null,
  changeReason = null,
  hrFeedback = null,
  rejectionReason = null,
  hrReviewerId = null,
  bypassLifecycleValidation = false
}) {
  if (!id) throw new Error('Application id is required.');
  if (!isValidStatus(newStatus)) {
    throw new Error(`Invalid status "${newStatus}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve current status
    const currentRes = await client.query('SELECT * FROM public.applications WHERE id = $1 FOR UPDATE', [id]);
    if (currentRes.rows.length === 0) {
      throw new Error(`Application with ID "${id}" not found.`);
    }

    const currentApp = currentRes.rows[0];
    const currentStatus = currentApp.status;

    if (!bypassLifecycleValidation && !isValidTransition(currentStatus, newStatus)) {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
      throw new Error(`Invalid lifecycle transition from "${currentStatus}" to "${newStatus}". Allowed next states: [${allowed.join(', ')}]`);
    }

    // Set actor context for status change trigger
    if (actorType) await client.query(`SET LOCAL rankly.current_actor_type = '${actorType.replace(/'/g, "''")}'`);
    if (actorId) await client.query(`SET LOCAL rankly.current_actor_id = '${String(actorId).replace(/'/g, "''")}'`);
    if (actorEmail) await client.query(`SET LOCAL rankly.current_actor_email = '${actorEmail.replace(/'/g, "''")}'`);
    if (changeReason) await client.query(`SET LOCAL rankly.status_change_reason = '${changeReason.replace(/'/g, "''")}'`);

    const updateQuery = `
      UPDATE public.applications
      SET 
        status = $1,
        hr_feedback = COALESCE($2, hr_feedback),
        rejection_reason = COALESCE($3, rejection_reason),
        hr_reviewer_id = COALESCE($4, hr_reviewer_id)
      WHERE id = $5
      RETURNING *;
    `;

    const updatedRes = await client.query(updateQuery, [
      newStatus,
      hrFeedback,
      rejectionReason,
      hrReviewerId,
      id
    ]);

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieve single application with candidate & reviewer details
 */
async function getApplicationById(id) {
  const query = `
    SELECT 
      a.*,
      c.name AS candidate_name,
      c.email AS candidate_email,
      c.phone AS candidate_phone,
      c.target_role AS candidate_target_role,
      e.full_name AS hr_reviewer_name,
      e.email AS hr_reviewer_email
    FROM public.applications a
    LEFT JOIN public.candidates c ON a.candidate_id = c.id
    LEFT JOIN public.employees e ON a.hr_reviewer_id = e.employee_id
    WHERE a.id = $1;
  `;
  const res = await db.query(query, [id]);
  return res.rows[0] || null;
}

/**
 * List applications with optional filtering & pagination
 */
async function listApplications({ status, candidateId, hrReviewerId, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }
  if (candidateId) {
    params.push(candidateId);
    conditions.push(`a.candidate_id = $${params.length}`);
  }
  if (hrReviewerId) {
    params.push(hrReviewerId);
    conditions.push(`a.hr_reviewer_id = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(Math.min(limit, 100));
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const query = `
    SELECT 
      a.*,
      c.name AS candidate_name,
      c.email AS candidate_email,
      e.full_name AS hr_reviewer_name
    FROM public.applications a
    LEFT JOIN public.candidates c ON a.candidate_id = c.id
    LEFT JOIN public.employees e ON a.hr_reviewer_id = e.employee_id
    ${whereClause}
    ORDER BY a.applied_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM public.applications a
    ${whereClause};
  `;

  const [dataRes, countRes] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, params.slice(0, conditions.length))
  ]);

  return {
    total: parseInt(countRes.rows[0].total, 10),
    applications: dataRes.rows
  };
}

/**
 * Get immutable audit history for an application
 */
async function getApplicationAuditLogs(applicationId) {
  const query = `
    SELECT *
    FROM public.audit_logs
    WHERE application_id = $1
    ORDER BY created_at ASC;
  `;
  const res = await db.query(query, [applicationId]);
  return res.rows;
}

/**
 * Get all recent audit logs across the system
 */
async function listAuditLogs({ limit = 50, offset = 0 } = {}) {
  const query = `
    SELECT 
      l.*,
      a.job_title,
      c.name AS candidate_name
    FROM public.audit_logs l
    LEFT JOIN public.applications a ON l.application_id = a.id
    LEFT JOIN public.candidates c ON a.candidate_id = c.id
    ORDER BY l.created_at DESC
    LIMIT $1 OFFSET $2;
  `;
  const res = await db.query(query, [Math.min(limit, 100), offset]);
  return res.rows;
}

module.exports = {
  VALID_STATUSES,
  ALLOWED_TRANSITIONS,
  isValidStatus,
  isValidTransition,
  createApplication,
  updateApplicationStatus,
  getApplicationById,
  listApplications,
  getApplicationAuditLogs,
  listAuditLogs
};
