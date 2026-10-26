-- ==============================================================================
-- STERS FY IT & BCA: Separate Tables for Students & Admins
-- Run this in Supabase SQL Editor (1-Click Run)
-- ==============================================================================

-- 1. Create STUDENTS Table (Dedicated for student registrations & logins)
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

-- 2. Create ADMINS Table (Dedicated for faculty & administrators managed by Super Admin)
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

-- 3. Enable Row Level Security (RLS) & Add Public Access Policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow anonymous client to SELECT, INSERT, UPDATE, DELETE on students table
DROP POLICY IF EXISTS "Public full access on students" ON public.students;
CREATE POLICY "Public full access on students" ON public.students
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Allow anonymous client to SELECT, INSERT, UPDATE, DELETE on admins table
DROP POLICY IF EXISTS "Public full access on admins" ON public.admins;
CREATE POLICY "Public full access on admins" ON public.admins
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Grant table permissions to public roles
GRANT ALL ON public.students TO anon, authenticated, service_role;
GRANT ALL ON public.admins TO anon, authenticated, service_role;
