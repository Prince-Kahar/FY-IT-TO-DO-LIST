import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate whether real credentials are provided
export const isSupabaseConfigured = () => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project-ref') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
  );
};

// Official Supabase JavaScript Client instance
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Storage helper: Upload photo to private bucket
export const uploadSubmissionPhoto = async ({
  file,
  studentId,
  taskAssignmentId,
  submissionId,
}) => {
  if (!file) throw new Error('No file provided');

  // File size validation (Max 5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File ${file.name} exceeds 5 MB limit.`);
  }

  // File type validation (JPG, JPEG, PNG, WEBP)
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error(`File ${file.name} must be a JPG, PNG, or WEBP image.`);
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniquePrefix = Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const storagePath = `${studentId}/${taskAssignmentId}/${submissionId}/${uniquePrefix}_${cleanFileName}`;

  if (!isSupabaseConfigured()) {
    // Return a mock object URL for demo mode
    return {
      storagePath,
      signedUrl: URL.createObjectURL(file),
      originalName: file.name,
      fileSize: file.size,
      contentType: file.type,
    };
  }

  // Upload to Supabase Storage private bucket 'task-submissions'
  const { data, error } = await supabase.storage
    .from('task-submissions')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  // Generate a signed URL for secure viewing (valid for 2 hours = 7200s)
  const { data: signedData, error: signError } = await supabase.storage
    .from('task-submissions')
    .createSignedUrl(storagePath, 7200);

  return {
    storagePath: data.path,
    signedUrl: signedData?.signedUrl || '',
    originalName: file.name,
    fileSize: file.size,
    contentType: file.type,
  };
};

// Storage helper: Get signed URL for an existing file path
export const getSubmissionPhotoUrl = async (storagePath) => {
  if (!storagePath) return '';

  if (!isSupabaseConfigured()) {
    // If it's a blob or external url, return as is
    if (storagePath.startsWith('http') || storagePath.startsWith('blob:')) {
      return storagePath;
    }
    // Return placeholder academic image
    return `https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80`;
  }

  const { data, error } = await supabase.storage
    .from('task-submissions')
    .createSignedUrl(storagePath, 7200);

  if (error) {
    console.warn('Could not generate signed URL:', error.message);
    return '';
  }

  return data?.signedUrl || '';
};
