-- ==============================================================================
-- FY IT & BCA TASK MANAGER - COMPLETE UPDATED SUPABASE MASTER SCHEMA
-- 100% Dynamic, Zero Hardcoded Mock Data, Separate Tables for Students & Admins
-- Run this entire script in Supabase Dashboard -> SQL Editor (Click 'Run')
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. DEDICATED AUTH & PROFILE TABLES (Separated for Students & Admins)
-- ==============================================================================

-- Table: public.students (Student self-registrations & student logins)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    roll_number TEXT UNIQUE NOT NULL,
    mobile_number TEXT NOT NULL,
    email TEXT,
    class_name TEXT DEFAULT 'FY B.Sc. IT',
    division TEXT DEFAULT 'A',
    password TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.admins (Faculty administrators managed by Super Admin)
CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    department TEXT DEFAULT 'Information Technology',
    assigned_subjects JSONB DEFAULT '["ALL"]'::jsonb,
    role TEXT NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legacy profiles table (kept compatible for foreign keys if needed)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    roll_number TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    class_name TEXT DEFAULT 'FY B.Sc. IT',
    division TEXT DEFAULT 'A',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. ACADEMIC CURRICULUM TABLES (Subjects, Topics, Tasks, Assignments)
-- ==============================================================================

-- Table: public.subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject_code TEXT,
    description TEXT,
    teacher_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.topics
CREATE TABLE IF NOT EXISTS public.topics (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
    topic_id TEXT REFERENCES public.topics(id) ON DELETE SET NULL,
    task_type TEXT NOT NULL DEFAULT 'Assignment',
    priority TEXT NOT NULL DEFAULT 'Medium',
    due_at TIMESTAMPTZ NOT NULL,
    max_marks NUMERIC(5,2),
    publication_status TEXT NOT NULL DEFAULT 'Published',
    assignment_target TEXT NOT NULL DEFAULT 'all',
    reference_url TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.task_assignments
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Assigned',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_late BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(task_id, student_id)
);

-- ==============================================================================
-- 4. SUBMISSIONS & PROOF FILES
-- ==============================================================================

-- Table: public.submissions
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY,
    task_assignment_id TEXT REFERENCES public.task_assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    task_id TEXT,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    feedback TEXT,
    marks_awarded NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.submission_files
CREATE TABLE IF NOT EXISTS public.submission_files (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    content_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. ANNOUNCEMENTS, NOTIFICATIONS & STUDENT TO-DOS
-- ==============================================================================

-- Table: public.announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    content TEXT,
    author_id TEXT,
    author_name TEXT DEFAULT 'Faculty',
    priority TEXT NOT NULL DEFAULT 'Medium',
    target_audience TEXT NOT NULL DEFAULT 'All',
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure backwards-compatibility columns exist
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.announcements ALTER COLUMN content DROP NOT NULL;

-- Table: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'general',
    related_task_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: public.student_todos (Daily Planner & Pomodoro tasks)
CREATE TABLE IF NOT EXISTS public.student_todos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject_id TEXT,
    category TEXT DEFAULT 'Study',
    priority TEXT DEFAULT 'Medium',
    due_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    time_spent_minutes INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_todos ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. CLEAN & PERMISSIVE CLIENT POLICIES (Full client read/write without 403 errors)
-- ==============================================================================

-- Policy for students
DROP POLICY IF EXISTS "Public full access on students" ON public.students;
CREATE POLICY "Public full access on students" ON public.students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for admins
DROP POLICY IF EXISTS "Public full access on admins" ON public.admins;
CREATE POLICY "Public full access on admins" ON public.admins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for profiles
DROP POLICY IF EXISTS "Public full access on profiles" ON public.profiles;
CREATE POLICY "Public full access on profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for subjects
DROP POLICY IF EXISTS "Public full access on subjects" ON public.subjects;
CREATE POLICY "Public full access on subjects" ON public.subjects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for topics
DROP POLICY IF EXISTS "Public full access on topics" ON public.topics;
CREATE POLICY "Public full access on topics" ON public.topics FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for tasks
DROP POLICY IF EXISTS "Public full access on tasks" ON public.tasks;
CREATE POLICY "Public full access on tasks" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for task_assignments
DROP POLICY IF EXISTS "Public full access on task_assignments" ON public.task_assignments;
CREATE POLICY "Public full access on task_assignments" ON public.task_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for submissions
DROP POLICY IF EXISTS "Public full access on submissions" ON public.submissions;
CREATE POLICY "Public full access on submissions" ON public.submissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for submission_files
DROP POLICY IF EXISTS "Public full access on submission_files" ON public.submission_files;
CREATE POLICY "Public full access on submission_files" ON public.submission_files FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for announcements
DROP POLICY IF EXISTS "Public full access on announcements" ON public.announcements;
CREATE POLICY "Public full access on announcements" ON public.announcements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for notifications
DROP POLICY IF EXISTS "Public full access on notifications" ON public.notifications;
CREATE POLICY "Public full access on notifications" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policy for student_todos
DROP POLICY IF EXISTS "Public full access on student_todos" ON public.student_todos;
CREATE POLICY "Public full access on student_todos" ON public.student_todos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 8. GRANT FULL PERMISSIONS TO CLIENT ROLES
-- ==============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- 9. STORAGE BUCKET FOR STUDENT SUBMISSIONS (Camera Photos & Documents)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads to submissions bucket" ON storage.objects;
CREATE POLICY "Allow public uploads to submissions bucket" ON storage.objects
    FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow public reads from submissions bucket" ON storage.objects;
CREATE POLICY "Allow public reads from submissions bucket" ON storage.objects
    FOR SELECT TO anon, authenticated USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow public updates to submissions bucket" ON storage.objects;
CREATE POLICY "Allow public updates to submissions bucket" ON storage.objects
    FOR UPDATE TO anon, authenticated USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow public deletes from submissions bucket" ON storage.objects;
CREATE POLICY "Allow public deletes from submissions bucket" ON storage.objects
    FOR DELETE TO anon, authenticated USING (bucket_id = 'submissions');
