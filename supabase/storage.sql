-- ==============================================================================
-- Supabase Storage Configuration for FY IT Task Manager
-- Bucket: task-submissions (Private bucket for student photo proofs)
-- Path format: <student_id>/<task_assignment_id>/<submission_id>/<filename>
-- ==============================================================================

-- 1. Create the private bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task-submissions',
    'task-submissions',
    false, -- MUST BE PRIVATE! Signed URLs used for viewing
    5242880, -- 5 MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage RLS Policies for task-submissions bucket

-- Policy 1: Viewing/Downloading photo proofs
-- Students can only view their own photos (first path segment == auth.uid())
-- Admins can view photos from any student
DROP POLICY IF EXISTS "Allow student or admin to view submission photos" ON storage.objects;
CREATE POLICY "Allow student or admin to view submission photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'task-submissions'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
    )
);

-- Policy 2: Uploading photo proofs
-- Students can only upload into a top-level directory matching their own auth.uid()
DROP POLICY IF EXISTS "Allow student to upload submission photos" ON storage.objects;
CREATE POLICY "Allow student to upload submission photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'task-submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Updating/Replacing photo proofs
DROP POLICY IF EXISTS "Allow student or admin to update submission photos" ON storage.objects;
CREATE POLICY "Allow student or admin to update submission photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'task-submissions'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
    )
);

-- Policy 4: Deleting photo proofs
DROP POLICY IF EXISTS "Allow student or admin to delete submission photos" ON storage.objects;
CREATE POLICY "Allow student or admin to delete submission photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'task-submissions'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
    )
);
