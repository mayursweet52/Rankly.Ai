-- =============================================================================
-- Migration: 001_create_applications_and_audit_logs.sql
-- Description: Create applications and audit_logs tables in Supabase/PostgreSQL
--              with strict status lifecycle constraints, automated triggers,
--              foreign keys, and Row-Level Security (RLS) policies.
-- =============================================================================

-- Enable pgcrypto / uuid-ossp extension for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Applications Table (Strict Status Lifecycle)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id INTEGER NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) DEFAULT 'Rankly.ai',
    resume_url TEXT,
    match_score NUMERIC(5,2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_screening',
    screening_verdict VARCHAR(100),
    screening_notes TEXT,
    matched_skills JSONB DEFAULT '[]'::jsonb,
    missing_skills JSONB DEFAULT '[]'::jsonb,
    hr_reviewer_id INTEGER REFERENCES public.employees(employee_id) ON DELETE SET NULL,
    hr_feedback TEXT,
    rejection_reason TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Strict Lifecycle Status Constraint
    CONSTRAINT chk_application_status CHECK (
        status IN (
            'pending_screening',
            'ai_shortlisted',
            'hr_review_pending',
            'hr_shortlisted',
            'rejected'
        )
    )
);

-- Indexes for performant filtering & querying
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_hr_reviewer ON public.applications(hr_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications(applied_at DESC);

-- -----------------------------------------------------------------------------
-- 2. Audit Logs Table (Immutable Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'system', -- 'system_ai', 'hr_admin', 'candidate'
    actor_id VARCHAR(100),
    actor_email VARCHAR(255),
    change_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes on audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_application_id ON public.audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Automated Trigger Functions
-- -----------------------------------------------------------------------------

-- Timestamp Auto-Updater Function
CREATE OR REPLACE FUNCTION public.fn_update_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_application_timestamp ON public.applications;
CREATE TRIGGER trg_update_application_timestamp
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_application_timestamp();

-- Status Change Audit Trigger Function
CREATE OR REPLACE FUNCTION public.fn_log_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when status actually changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.audit_logs (
            application_id,
            action,
            previous_status,
            new_status,
            actor_type,
            actor_id,
            actor_email,
            change_reason,
            metadata
        ) VALUES (
            NEW.id,
            'STATUS_CHANGE',
            OLD.status,
            NEW.status,
            COALESCE(current_setting('rankly.current_actor_type', true), 'system'),
            COALESCE(current_setting('rankly.current_actor_id', true), NULL),
            COALESCE(current_setting('rankly.current_actor_email', true), NULL),
            COALESCE(current_setting('rankly.status_change_reason', true), 'Automated lifecycle status transition'),
            jsonb_build_object(
                'updated_at', now(),
                'hr_feedback', NEW.hr_feedback,
                'rejection_reason', NEW.rejection_reason,
                'hr_reviewer_id', NEW.hr_reviewer_id,
                'match_score', NEW.match_score
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_application_status_change ON public.applications;
CREATE TRIGGER trg_log_application_status_change
    AFTER UPDATE OF status ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_log_application_status_change();

-- Initial Creation Audit Trigger Function
CREATE OR REPLACE FUNCTION public.fn_log_application_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        application_id,
        action,
        previous_status,
        new_status,
        actor_type,
        actor_id,
        actor_email,
        change_reason,
        metadata
    ) VALUES (
        NEW.id,
        'APPLICATION_CREATED',
        NULL,
        NEW.status,
        COALESCE(current_setting('rankly.current_actor_type', true), 'candidate'),
        COALESCE(current_setting('rankly.current_actor_id', true), NULL),
        COALESCE(current_setting('rankly.current_actor_email', true), NULL),
        'Application submitted into screening pipeline',
        jsonb_build_object(
            'candidate_id', NEW.candidate_id,
            'job_title', NEW.job_title,
            'initial_status', NEW.status
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_application_creation ON public.applications;
CREATE TRIGGER trg_log_application_creation
    AFTER INSERT ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_log_application_creation();

-- -----------------------------------------------------------------------------
-- 4. Row-Level Security (RLS) Policies
-- -----------------------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Applications Policies:
-- Allow service_role & authenticated full control
DROP POLICY IF EXISTS applications_service_role_all ON public.applications;
CREATE POLICY applications_service_role_all ON public.applications
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Audit Logs Policies:
-- Audit logs are append-only. Allow SELECT and INSERT for all authenticated services.
DROP POLICY IF EXISTS audit_logs_service_role_select ON public.audit_logs;
CREATE POLICY audit_logs_service_role_select ON public.audit_logs
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS audit_logs_service_role_insert ON public.audit_logs;
CREATE POLICY audit_logs_service_role_insert ON public.audit_logs
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Disallow UPDATE and DELETE on audit logs to guarantee immutable compliance
DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs;
CREATE POLICY audit_logs_no_update ON public.audit_logs
    FOR UPDATE
    TO public
    USING (false);

DROP POLICY IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE POLICY audit_logs_no_delete ON public.audit_logs
    FOR DELETE
    TO public
    USING (false);
