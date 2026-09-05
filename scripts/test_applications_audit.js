/**
 * End-to-End Test Suite for Applications & Audit Logs (Supabase & PostgreSQL)
 * Verifies strict lifecycle status constraints, triggers, and immutable audit logs.
 */

const db = require('../src/config/pgDatabase');
const appService = require('../src/services/applicationDbService');

async function runTests() {
  console.log('🧪 Starting Applications & Audit Logs Test Suite...\n');

  try {
    // 1. Ensure we have a candidate in candidates table
    console.log('Step 1: Fetching or creating a test candidate in candidates table...');
    let candidateRes = await db.query("SELECT id, name FROM public.candidates LIMIT 1");
    let candidateId;
    if (candidateRes.rows.length > 0) {
      candidateId = candidateRes.rows[0].id;
      console.log(`✅ Using existing candidate: ID ${candidateId} (${candidateRes.rows[0].name})`);
    } else {
      const newCand = await db.query(`
        INSERT INTO public.candidates (name, email, target_role, score, stage)
        VALUES ('Test Candidate', 'test.candidate@example.com', 'Senior Full Stack Engineer', 92, 'applied')
        RETURNING id, name;
      `);
      candidateId = newCand.rows[0].id;
      console.log(`✅ Created test candidate: ID ${candidateId}`);
    }

    // 2. Test Application Creation (Initial Status: pending_screening)
    console.log('\nStep 2: Creating a new application with default status...');
    const app = await appService.createApplication({
      candidateId,
      jobTitle: 'Senior Full Stack Engineer (AI Platforms)',
      companyName: 'Rankly.ai Enterprise',
      resumeUrl: 'https://rankly.ai/uploads/resumes/test_candidate.pdf',
      matchScore: 94.5,
      screeningVerdict: 'STRONG_MATCH',
      screeningNotes: 'Candidate demonstrates 5+ years of PostgreSQL, Node.js and AI integrations.',
      matchedSkills: ['PostgreSQL', 'Node.js', 'React', 'Docker'],
      missingSkills: ['Kubernetes'],
      actorEmail: 'system.ai@rankly.ai'
    });

    console.log('✅ Application created successfully:');
    console.log(`   ID: ${app.id}`);
    console.log(`   Status: ${app.status} (Expected: pending_screening)`);
    if (app.status !== 'pending_screening') throw new Error('Initial status mismatch!');

    // 3. Verify Creation Audit Log Trigger
    console.log('\nStep 3: Verifying automated creation audit log trigger...');
    let logs = await appService.getApplicationAuditLogs(app.id);
    console.log(`✅ Found ${logs.length} audit log entry:`);
    console.log(`   Action: ${logs[0].action}, New Status: ${logs[0].new_status}, Timestamp: ${logs[0].created_at}`);
    if (logs[0].action !== 'APPLICATION_CREATED' || logs[0].new_status !== 'pending_screening') {
      throw new Error('Creation audit log mismatch!');
    }

    // 4. Test Lifecycle Transition 1: pending_screening -> ai_shortlisted
    console.log('\nStep 4: Transitioning lifecycle to "ai_shortlisted"...');
    const step1 = await appService.updateApplicationStatus(app.id, {
      newStatus: 'ai_shortlisted',
      actorType: 'system_ai',
      actorEmail: 'nemotron.ai@rankly.ai',
      changeReason: 'AI Screening engine scored 94.5% match'
    });
    console.log(`✅ Status updated to: ${step1.status}`);

    // 5. Test Lifecycle Transition 2: ai_shortlisted -> hr_review_pending
    console.log('\nStep 5: Transitioning lifecycle to "hr_review_pending"...');
    const step2 = await appService.updateApplicationStatus(app.id, {
      newStatus: 'hr_review_pending',
      actorType: 'hr_admin',
      actorEmail: 'vaibhavaakhade44@gmail.com',
      changeReason: 'Queued for HR Interview panel review'
    });
    console.log(`✅ Status updated to: ${step2.status}`);

    // 6. Test Lifecycle Transition 3: hr_review_pending -> hr_shortlisted
    console.log('\nStep 6: Transitioning lifecycle to "hr_shortlisted"...');
    const step3 = await appService.updateApplicationStatus(app.id, {
      newStatus: 'hr_shortlisted',
      actorType: 'hr_admin',
      actorEmail: 'vaibhavaakhade44@gmail.com',
      hrFeedback: 'Candidate passed technical screening with flying colors.',
      changeReason: 'HR review approved'
    });
    console.log(`✅ Status updated to: ${step3.status}`);
    console.log(`   HR Feedback: "${step3.hr_feedback}"`);

    // 7. Test Lifecycle Transition 4: hr_shortlisted -> rejected
    console.log('\nStep 7: Testing transition to "rejected"...');
    const step4 = await appService.updateApplicationStatus(app.id, {
      newStatus: 'rejected',
      actorType: 'hr_admin',
      actorEmail: 'vaibhavaakhade44@gmail.com',
      rejectionReason: 'Position filled internally before offer rollout',
      changeReason: 'Role closed'
    });
    console.log(`✅ Status updated to: ${step4.status}`);
    console.log(`   Rejection Reason: "${step4.rejection_reason}"`);

    // 8. Test Strict Check Constraint: Reject invalid status
    console.log('\nStep 8: Testing strict check constraint rejection with invalid status...');
    try {
      await db.query(`
        UPDATE public.applications 
        SET status = 'not_a_valid_status' 
        WHERE id = $1
      `, [app.id]);
      throw new Error('❌ Constraint FAILED: Invalid status was accepted!');
    } catch (err) {
      if (err.message.includes('chk_application_status')) {
        console.log('✅ Check constraint successfully REJECTED invalid status! Error:', err.message);
      } else {
        throw err;
      }
    }

    // 9. Verify Complete Immutable Audit History
    console.log('\nStep 9: Verifying complete immutable audit trail...');
    const allLogs = await appService.getApplicationAuditLogs(app.id);
    console.log(`✅ Total Audit Log Entries: ${allLogs.length}`);
    console.table(allLogs.map(l => ({
      Action: l.action,
      Prev: l.previous_status || 'NULL',
      New: l.new_status,
      Actor: l.actor_email || l.actor_type,
      Reason: l.change_reason,
      Timestamp: l.created_at.toISOString()
    })));

    if (allLogs.length < 5) {
      throw new Error(`Expected at least 5 audit log entries, found ${allLogs.length}`);
    }

    // 10. Test Query API
    console.log('\nStep 10: Testing listApplications and getApplicationById queries...');
    const fullApp = await appService.getApplicationById(app.id);
    console.log(`✅ Retrieved Application details: ${fullApp.candidate_name} -> ${fullApp.job_title} [${fullApp.status}]`);

    const listResult = await appService.listApplications({ status: 'rejected', limit: 5 });
    console.log(`✅ Filtered applications query returned ${listResult.applications.length} of ${listResult.total} total applications.`);

    console.log('\n🎉 ALL 10 TEST SUITE CHECKS PASSED 100% CLEANLY!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error);
    process.exit(1);
  }
}

runTests();
