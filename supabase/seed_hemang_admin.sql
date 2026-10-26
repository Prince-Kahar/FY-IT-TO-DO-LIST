-- ==============================================================================
-- Quick Seed Script: Admin Hemang + FY IT Curriculum
-- Paste into Supabase Dashboard -> SQL Editor and click RUN.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    admin_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Create / Update Admin: hemang@college.edu / Hemang@135
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hemang@college.edu') THEN
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            admin_id, '00000000-0000-0000-0000-000000000000', 'hemang@college.edu',
            crypt('Hemang@135', gen_salt('bf')), NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Prof. Hemang (Class Head / Admin)","roll_number":"ADMIN-HEMANG","class_name":"FY B.Sc. IT & BCA","division":"All","username":"hemang"}',
            NOW(), NOW(), 'authenticated', 'authenticated'
        );

        INSERT INTO public.profiles (
            id, full_name, roll_number, email, role, class_name, division, is_active
        ) VALUES (
            admin_id, 'Prof. Hemang (Class Head / Admin)', 'ADMIN-HEMANG', 'hemang@college.edu', 'admin', 'FY B.Sc. IT & BCA', 'All', true
        )
        ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Prof. Hemang (Class Head / Admin)', email = 'hemang@college.edu';
    ELSE
        UPDATE auth.users SET encrypted_password = crypt('Hemang@135', gen_salt('bf')), email_confirmed_at = NOW() WHERE email = 'hemang@college.edu';
        UPDATE public.profiles SET role = 'admin', full_name = 'Prof. Hemang (Class Head / Admin)', email = 'hemang@college.edu' WHERE email = 'hemang@college.edu';
    END IF;
END $$;

-- 2. Seed Subjects
INSERT INTO public.subjects (id, name, subject_code, description, teacher_name, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'C Programming', 'IT101', 'Imperative Programming with C language, pointers, and memory management', 'Prof. Sharma', true),
    ('a0000000-0000-0000-0000-000000000002', 'Database Management Systems', 'IT102', 'Relational database design, SQL querying, normalization and transactions', 'Dr. Mehta', true),
    ('a0000000-0000-0000-0000-000000000003', 'Data Structures', 'IT103', 'Linear and non-linear data structures, searching, and sorting algorithms', 'Prof. Kulkarni', true),
    ('a0000000-0000-0000-0000-000000000004', 'Discrete Mathematics', 'MAT104', 'Set theory, propositional logic, relations, and recurrence relations', 'Dr. Roy', true),
    ('a0000000-0000-0000-0000-000000000005', 'Technical Communication Skills', 'ENG105', 'Business correspondence, report writing, presentation and documentation', 'Prof. Fernandes', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Topics
INSERT INTO public.topics (subject_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Variables, Constants & Data Types', 'Primitive types, format specifiers, and typecasting'),
    ('a0000000-0000-0000-0000-000000000001', 'Loops & Iterations', 'while, do-while, and for loops'),
    ('a0000000-0000-0000-0000-000000000001', 'Pointers & Dynamic Memory', 'malloc, calloc, free, pointer arithmetic'),
    ('a0000000-0000-0000-0000-000000000002', 'ER Model & ER Diagrams', 'Entities, attributes, cardinality, and keys'),
    ('a0000000-0000-0000-0000-000000000002', 'SQL Queries (DDL, DML, DQL)', 'SELECT, JOINs, and subqueries'),
    ('a0000000-0000-0000-0000-000000000003', 'Linked Lists', 'Singly and doubly linked lists'),
    ('a0000000-0000-0000-0000-000000000003', 'Stacks & Queues', 'LIFO & FIFO applications and array implementation')
ON CONFLICT DO NOTHING;

-- 4. Seed Announcement
INSERT INTO public.announcements (title, message, published_at)
VALUES (
    'Welcome to FY B.Sc. IT & BCA Academic Portal!',
    'Class Head Prof. Hemang welcomes all students. Please record your daily practicals and handwritten assignments here.',
    NOW()
)
ON CONFLICT DO NOTHING;
