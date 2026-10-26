-- ==============================================================================
-- FY IT Task Manager - Complete All-in-One Master Setup Script
-- Paste this entire script into your Supabase Dashboard -> SQL Editor and click RUN.
-- Sets up: Extensions, Tables, Triggers, RLS, Storage Bucket, Default Admin & Student Accounts
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Create Tables
-- ==============================================================================

-- PROFILES
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

-- SUBJECTS
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

-- TOPICS
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASKS
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

-- TASK ASSIGNMENTS
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

-- SUBMISSIONS
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

-- SUBMISSION FILES
CREATE TABLE IF NOT EXISTS public.submission_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
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
-- 3. Indexes
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_roll ON public.profiles(roll_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON public.subjects(is_active);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_subject ON public.tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON public.task_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_todos_user ON public.student_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_student_todos_due ON public.student_todos(due_date);

-- ==============================================================================
-- 4. Helper Functions & Triggers
-- ==============================================================================

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
        'student',
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

CREATE OR REPLACE FUNCTION public.assign_task_to_all_students(task_uuid UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assigned_count INT := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;

    INSERT INTO public.task_assignments (task_id, student_id, status, assigned_at)
    SELECT task_uuid, p.id, 'Assigned', NOW()
    FROM public.profiles p
    WHERE p.role = 'student' AND p.is_active = true
    ON CONFLICT (task_id, student_id) DO NOTHING;

    GET DIAGNOSTICS assigned_count = ROW_COUNT;

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
-- 5. Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow users to view profiles" ON public.profiles;
CREATE POLICY "Allow users to view profiles" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Students can update own permitted profile" ON public.profiles;
CREATE POLICY "Students can update own permitted profile" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can view active subjects" ON public.subjects;
CREATE POLICY "Authenticated users can view active subjects" ON public.subjects FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage subjects" ON public.subjects;
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can view topics" ON public.topics;
CREATE POLICY "Authenticated users can view topics" ON public.topics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage topics" ON public.topics;
CREATE POLICY "Admins manage topics" ON public.topics FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Students can view assigned published tasks" ON public.tasks;
CREATE POLICY "Students can view assigned published tasks" ON public.tasks FOR SELECT TO authenticated
USING (publication_status = 'Published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage tasks" ON public.tasks;
CREATE POLICY "Admins manage tasks" ON public.tasks FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Students view own assignments, admins view all" ON public.task_assignments;
CREATE POLICY "Students view own assignments, admins view all" ON public.task_assignments FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Students can update own assignment progress" ON public.task_assignments;
CREATE POLICY "Students can update own assignment progress" ON public.task_assignments FOR UPDATE TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage task assignments" ON public.task_assignments;
CREATE POLICY "Admins manage task assignments" ON public.task_assignments FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "View submissions" ON public.submissions;
CREATE POLICY "View submissions" ON public.submissions FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Students create own submissions" ON public.submissions;
CREATE POLICY "Students create own submissions" ON public.submissions FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins review submissions" ON public.submissions;
CREATE POLICY "Admins review submissions" ON public.submissions FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "View submission files" ON public.submission_files;
CREATE POLICY "View submission files" ON public.submission_files FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_files.submission_id AND (s.student_id = auth.uid() OR public.is_admin())));

DROP POLICY IF EXISTS "Students insert submission files" ON public.submission_files;
CREATE POLICY "Students insert submission files" ON public.submission_files FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = submission_files.submission_id AND s.student_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage submission files" ON public.submission_files;
CREATE POLICY "Admins manage submission files" ON public.submission_files FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Everyone reads announcements" ON public.announcements;
CREATE POLICY "Everyone reads announcements" ON public.announcements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- STUDENT TODOS POLICIES
ALTER TABLE public.student_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own todos" ON public.student_todos;
CREATE POLICY "Students manage own todos" ON public.student_todos FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 6. Storage Bucket Configuration
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task-submissions',
    'task-submissions',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Allow student or admin to view submission photos" ON storage.objects;
CREATE POLICY "Allow student or admin to view submission photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-submissions' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

DROP POLICY IF EXISTS "Allow student to upload submission photos" ON storage.objects;
CREATE POLICY "Allow student to upload submission photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ==============================================================================
-- 7. Provision Default Accounts (Passwords: admin123 and student123)
-- ==============================================================================

DO $$
DECLARE
    admin_id UUID := '00000000-0000-0000-0000-000000000001';
    student_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
    -- 1. Create Default Admin: admin@college.edu / admin123
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@college.edu') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            admin_id, '00000000-0000-0000-0000-000000000000', 'admin@college.edu',
            crypt('admin123', gen_salt('bf')), NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Prof. Rajesh Kulkarni (Class Head)","roll_number":"ADMIN-01","class_name":"FY B.Sc. IT","division":"All"}',
            NOW(), NOW(), 'authenticated', 'authenticated'
        );

        INSERT INTO public.profiles (
            id, full_name, roll_number, email, role, class_name, division, is_active
        ) VALUES (
            admin_id, 'Prof. Rajesh Kulkarni (Class Head)', 'ADMIN-01', 'admin@college.edu', 'admin', 'FY B.Sc. IT', 'All', true
        )
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
    ELSE
        UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@college.edu';
    END IF;

    -- 2. Create Default Student: student@college.edu / student123
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@college.edu') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            student_id, '00000000-0000-0000-0000-000000000000', 'student@college.edu',
            crypt('student123', gen_salt('bf')), NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Aarav Patel","roll_number":"FYIT-001","class_name":"FY B.Sc. IT","division":"A"}',
            NOW(), NOW(), 'authenticated', 'authenticated'
        );

        INSERT INTO public.profiles (
            id, full_name, roll_number, email, role, class_name, division, is_active
        ) VALUES (
            student_id, 'Aarav Patel', 'FYIT-001', 'student@college.edu', 'student', 'FY B.Sc. IT', 'A', true
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- ==============================================================================
-- 8. Seed Subjects and Topics
-- ==============================================================================

INSERT INTO public.subjects (id, name, subject_code, description, teacher_name, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'C Programming', 'IT101', 'Imperative Programming with C language, pointers, and memory management', 'Prof. Sharma', true),
    ('a0000000-0000-0000-0000-000000000002', 'Database Management Systems', 'IT102', 'Relational database design, SQL querying, normalization and transactions', 'Dr. Mehta', true),
    ('a0000000-0000-0000-0000-000000000003', 'Data Structures', 'IT103', 'Linear and non-linear data structures, searching, and sorting algorithms', 'Prof. Kulkarni', true),
    ('a0000000-0000-0000-0000-000000000004', 'Discrete Mathematics', 'MAT104', 'Set theory, propositional logic, relations, and recurrence relations', 'Dr. Roy', true),
    ('a0000000-0000-0000-0000-000000000005', 'Technical Communication Skills', 'ENG105', 'Business correspondence, report writing, presentation and documentation', 'Prof. Fernandes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.topics (subject_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Variables, Constants & Data Types', 'Primitive types, format specifiers, and typecasting'),
    ('a0000000-0000-0000-0000-000000000001', 'Loops & Iterations', 'while, do-while, and for loops'),
    ('a0000000-0000-0000-0000-000000000001', 'Pointers & Dynamic Memory', 'malloc, calloc, free, pointer arithmetic'),
    ('a0000000-0000-0000-0000-000000000002', 'ER Model & ER Diagrams', 'Entities, attributes, cardinality, and keys'),
    ('a0000000-0000-0000-0000-000000000002', 'SQL Queries (DDL, DML, DQL)', 'SELECT, JOINs, and subqueries'),
    ('a0000000-0000-0000-0000-000000000003', 'Linked Lists', 'Singly and doubly linked lists'),
    ('a0000000-0000-0000-0000-000000000003', 'Stacks & Queues', 'LIFO & FIFO applications and array implementation')
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, message, published_at)
VALUES (
    'Welcome to FY B.Sc. IT Academic Session!',
    'All First Year B.Sc. IT students must submit their daily handwritten lab practicals and assignments through this portal. Ensure your roll number and division are accurate in your profile.',
    NOW()
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 9. Enable Realtime Publications for Instant Live Notifications & Updates
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_todos;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if tables are already in publication
    NULL;
END $$;

