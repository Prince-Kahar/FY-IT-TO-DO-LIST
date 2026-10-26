-- ==============================================================================
-- FY IT Task Manager - Secure Admin Provisioning
-- ==============================================================================
-- NOTE: Never grant Admin role directly in client-side code!
--
-- METHOD 1 (Recommended): Promote an existing registered student or email to Admin:
-- 1. Sign up a new user via the application registration page with the Admin's email,
--    e.g. "admin@college.edu".
-- 2. Open your Supabase Dashboard -> SQL Editor.
-- 3. Execute the SQL snippet below replacing the email:

UPDATE public.profiles
SET role = 'admin',
    full_name = 'Class Coordinator / Admin'
WHERE email = 'admin@college.edu';

-- Verify the promotion:
SELECT id, email, full_name, role, is_active FROM public.profiles WHERE role = 'admin';

-- ==============================================================================
-- METHOD 2: Direct SQL creation for a fresh installation
-- If you want to create an admin user directly inside Supabase SQL Editor:
-- (Requires Supabase pgcrypto extension enabled by default)
-- ==============================================================================

DO $$
DECLARE
    admin_uid UUID := gen_random_uuid();
    admin_email TEXT := 'admin@college.edu';
    admin_password TEXT := 'Admin@2025Secured!'; -- Change this password immediately
BEGIN
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
        -- Insert into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            admin_uid,
            '00000000-0000-0000-0000-000000000000',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Class Coordinator","roll_number":"ADMIN-01","class_name":"FY B.Sc. IT","division":"A"}',
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        );

        -- Insert or update into public.profiles as admin
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
            admin_uid,
            'Class Coordinator',
            'ADMIN-01',
            admin_email,
            'admin',
            'FY B.Sc. IT',
            'A',
            true
        )
        ON CONFLICT (id) DO UPDATE SET role = 'admin';

        RAISE NOTICE 'Admin user created successfully with email: %', admin_email;
    ELSE
        UPDATE public.profiles
        SET role = 'admin'
        WHERE email = admin_email;

        RAISE NOTICE 'Existing user updated to Admin role for email: %', admin_email;
    END IF;
END $$;
