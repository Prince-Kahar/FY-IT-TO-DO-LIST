-- ==============================================================================
-- FY IT Task Manager - Supabase PostgreSQL Database Schema & Security
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. Create Tables
-- ==============================================================================

-- PROFILES: Linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    roll_number TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    class_name TEXT DEFAULT 'FY B.Sc. IT',
    division TEXT DEFAULT 'A',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUBJECTS: Managed dynamically by Admin
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject_code TEXT,
    description TEXT,
    teacher_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TOPICS: Belong to subjects
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASKS: Created and managed by Admin
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL DEFAULT 'Assignment' CHECK (
        task_type IN ('Assignment', 'Practical', 'Notes', 'Homework', 'Project', 'Revision', 'Other')
    ),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (
        priority IN ('Low', 'Medium', 'High')
    ),
    due_at TIMESTAMPTZ NOT NULL,
    max_marks NUMERIC(5,2),
    publication_status TEXT NOT NULL DEFAULT 'Draft' CHECK (
        publication_status IN ('Draft', 'Published', 'Archived')
    ),
    assignment_target TEXT NOT NULL DEFAULT 'all' CHECK (
        assignment_target IN ('all', 'selected')
    ),
    reference_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASK ASSIGNMENTS: Unique record per student per task
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Assigned' CHECK (
        status IN ('Assigned', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Needs Correction', 'Overdue', 'Rejected')
    ),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_late BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(task_id, student_id)
);

-- SUBMISSIONS: History of student work submissions (allows resubmission)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_assignment_id UUID NOT NULL REFERENCES public.task_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (
        status IN ('Submitted', 'Under Review', 'Approved', 'Needs Correction', 'Rejected')
    ),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    feedback TEXT,
    marks_awarded NUMERIC(5,2),
    attempt_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUBMISSION FILES: Photo proofs uploaded to Supabase Storage
CREATE TABLE IF NOT EXISTS public.submission_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ANNOUNCEMENTS: Class-wide notices from Admin
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS: In-app student & admin alerts
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'info' CHECK (
        notification_type IN ('task_assigned', 'submission_reviewed', 'deadline_approaching', 'announcement', 'info')
    ),
    related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STUDENT TODOS: Personal daily action items & study planner
CREATE TABLE IF NOT EXISTS public.student_todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    category TEXT DEFAULT 'Study',
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date DATE,
    subtasks JSONB DEFAULT '[]'::jsonb,
    time_spent_minutes INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. Indexes for Query Performance
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_roll ON public.profiles(roll_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON public.subjects(is_active);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_subject ON public.tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(publication_status);
CREATE INDEX IF NOT EXISTS idx_assignments_task ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON public.task_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(task_assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_sub ON public.submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_student_todos_user ON public.student_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_student_todos_due ON public.student_todos(due_date);

-- ==============================================================================
-- 4. Helper Functions & Triggers
-- ==============================================================================

-- Security helper function: check if calling user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
$$;

-- Trigger: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: create profile automatically when new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_full_name TEXT;
    user_roll TEXT;
    user_class TEXT;
    user_div TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student');
    user_roll := NEW.raw_user_meta_data->>'roll_number';
    user_class := COALESCE(NEW.raw_user_meta_data->>'class_name', 'FY B.Sc. IT');
    user_div := COALESCE(NEW.raw_user_meta_data->>'division', 'A');

    INSERT INTO public.profiles (
        id,
        full_name,
        roll_number,
        email,
        role,
        class_name,
        division,
        is_active
    ) VALUES (
        NEW.id,
        user_full_name,
        user_roll,
        NEW.email,
        'student', -- ALWAYS defaults to student; admin must be provisioned securely!
        user_class,
        user_div,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Stored Procedure: Assign a published task to all active students
CREATE OR REPLACE FUNCTION public.assign_task_to_all_students(task_uuid UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assigned_count INT := 0;
BEGIN
    -- Verify the caller is an admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    INSERT INTO public.task_assignments (task_id, student_id, status, assigned_at)
    SELECT
        task_uuid,
        p.id,
        'Assigned',
        NOW()
    FROM public.profiles p
    WHERE p.role = 'student' AND p.is_active = true
    ON CONFLICT (task_id, student_id) DO NOTHING;

    GET DIAGNOSTICS assigned_count = ROW_COUNT;

    -- Create notification for all assigned students
    INSERT INTO public.notifications (user_id, title, message, notification_type, related_task_id)
    SELECT
        p.id,
        'New Task Assigned: ' || t.title,
        'A new task has been assigned to you. Due date: ' || to_char(t.due_at, 'DD Mon YYYY HH12:MI AM'),
        'task_assigned',
        task_uuid
    FROM public.profiles p
    CROSS JOIN public.tasks t
    WHERE t.id = task_uuid AND p.role = 'student' AND p.is_active = true;

    RETURN assigned_count;
END;
$$;

-- Stored Procedure: Assign a task to selected students
CREATE OR REPLACE FUNCTION public.assign_task_to_selected_students(task_uuid UUID, student_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    s_id UUID;
    assigned_count INT := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    FOREACH s_id IN ARRAY student_ids
    LOOP
        INSERT INTO public.task_assignments (task_id, student_id, status, assigned_at)
        VALUES (task_uuid, s_id, 'Assigned', NOW())
        ON CONFLICT (task_id, student_id) DO NOTHING;

        -- Create notification
        INSERT INTO public.notifications (user_id, title, message, notification_type, related_task_id)
        SELECT
            s_id,
            'New Task Assigned: ' || t.title,
            'A new task has been assigned to you. Due date: ' || to_char(t.due_at, 'DD Mon YYYY HH12:MI AM'),
            'task_assigned',
            task_uuid
        FROM public.tasks t
        WHERE t.id = task_uuid;

        assigned_count := assigned_count + 1;
    END LOOP;

    RETURN assigned_count;
END;
$$;

-- Stored Procedure: Mark Overdue tasks
CREATE OR REPLACE FUNCTION public.check_overdue_tasks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INT := 0;
BEGIN
    UPDATE public.task_assignments ta
    SET status = 'Overdue'
    FROM public.tasks t
    WHERE ta.task_id = t.id
      AND t.due_at < NOW()
      AND ta.status IN ('Assigned', 'In Progress');

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- ==============================================================================
-- 5. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on every single table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone authenticated can read basic student profiles (needed for class rosters/admin)
CREATE POLICY "Allow users to view profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR public.is_admin()
    );

-- Students can update their own permitted fields (name, class, div), but NOT role/is_active
CREATE POLICY "Students can update own permitted profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Ensure role cannot be elevated to admin
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Admins can update any profile (including active/inactive & roles)
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- SUBJECTS & TOPICS POLICIES
-- ------------------------------------------------------------------------------
-- Students and Admins can view active subjects
CREATE POLICY "Authenticated users can view active subjects"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Only Admins can create/edit/delete subjects
CREATE POLICY "Admins manage subjects"
    ON public.subjects FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Authenticated users can view topics
CREATE POLICY "Authenticated users can view topics"
    ON public.topics FOR SELECT
    TO authenticated
    USING (true);

-- Only Admins can manage topics
CREATE POLICY "Admins manage topics"
    ON public.topics FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- TASKS POLICIES
-- ------------------------------------------------------------------------------
-- Students can view published tasks assigned to them or targeted to all
CREATE POLICY "Students can view assigned published tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (
        publication_status = 'Published'
        OR public.is_admin()
    );

-- Admins have full access to tasks
CREATE POLICY "Admins manage tasks"
    ON public.tasks FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- TASK ASSIGNMENTS POLICIES
-- ------------------------------------------------------------------------------
-- Students can read only their own assignments; Admin can read all
CREATE POLICY "Students view own assignments, admins view all"
    ON public.task_assignments FOR SELECT
    TO authenticated
    USING (student_id = auth.uid() OR public.is_admin());

-- Students can update their own assignment status (e.g. to 'In Progress')
CREATE POLICY "Students can update own assignment progress"
    ON public.task_assignments FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Admins manage all task assignments
CREATE POLICY "Admins manage task assignments"
    ON public.task_assignments FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- SUBMISSIONS POLICIES
-- ------------------------------------------------------------------------------
-- Students can view their own submissions; Admins can view all
CREATE POLICY "View submissions"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (student_id = auth.uid() OR public.is_admin());

-- Students can insert submissions for their own assignments
CREATE POLICY "Students create own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

-- Admins can update submissions (approval, feedback, marks)
CREATE POLICY "Admins review submissions"
    ON public.submissions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- SUBMISSION FILES POLICIES
-- ------------------------------------------------------------------------------
-- Files can be viewed if user is the student owner or admin
CREATE POLICY "View submission files"
    ON public.submission_files FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = submission_files.submission_id
              AND (s.student_id = auth.uid() OR public.is_admin())
        )
    );

-- Students can insert file records for their own submissions
CREATE POLICY "Students insert submission files"
    ON public.submission_files FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.submissions s
            WHERE s.id = submission_files.submission_id
              AND s.student_id = auth.uid()
        )
    );

-- Admins manage submission files
CREATE POLICY "Admins manage submission files"
    ON public.submission_files FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- ANNOUNCEMENTS POLICIES
-- ------------------------------------------------------------------------------
-- Everyone authenticated can read announcements
CREATE POLICY "Everyone reads announcements"
    ON public.announcements FOR SELECT
    TO authenticated
    USING (true);

-- Admins manage announcements
CREATE POLICY "Admins manage announcements"
    ON public.announcements FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Users read their own notifications
CREATE POLICY "Users view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Notifications can be inserted by authenticated users / admins / functions
CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- STUDENT TODOS POLICIES (Personal Daily To-Do System)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own todos" ON public.student_todos;
CREATE POLICY "Students manage own todos"
    ON public.student_todos
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

