import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { dataService } from '../lib/dataService';

const AuthContext = createContext(null);
const LOCAL_SESSION_KEY = 'fy_it_user_session';

const getInitialSession = () => {
  try {
    const stored = localStorage.getItem(LOCAL_SESSION_KEY) || sessionStorage.getItem('fy_it_demo_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id) return parsed;
    }
  } catch (e) {
    console.warn('Error reading saved session:', e);
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const initialSession = getInitialSession();
  const [user, setUser] = useState(() => (initialSession ? { id: initialSession.id, email: initialSession.email } : null));
  const [profile, setProfile] = useState(() => initialSession);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Initialize auth state with localStorage fallback for multi-tab preservation
  useEffect(() => {
    let mounted = true;

    // 1. Cross-tab session sync: when logging in or out in another tab, sync automatically
    const handleStorageChange = (e) => {
      if (e.key === LOCAL_SESSION_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
          } catch (err) {}
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (mounted) setLoading(false);
          return;
        }

        // Live Supabase Auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          if (mounted) setUser(session.user);
          const loadedProfile = await fetchUserProfile(session.user.id);
          if (loadedProfile && mounted) {
            setProfile(loadedProfile);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(loadedProfile));
          }
        } else {
          // If no live Supabase session, preserve existing active local session
          if (initialSession) {
            if (mounted) {
              setUser({ id: initialSession.id, email: initialSession.email });
              setProfile(initialSession);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (initialSession && mounted) {
          setUser({ id: initialSession.id, email: initialSession.email });
          setProfile(initialSession);
        } else if (mounted) {
          setAuthError(err.message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener if Supabase is active
    let authListener = null;
    if (isSupabaseConfigured()) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchUserProfile(session.user.id);
          if (p) {
            setProfile(p);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(p));
          }
        } else if (event === 'SIGNED_OUT') {
          // If local session exists, do NOT wipe it out on Supabase startup event
          const current = localStorage.getItem(LOCAL_SESSION_KEY);
          if (current) {
            return;
          }
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });
      authListener = listener;
    }

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageChange);
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      if (!isSupabaseConfigured()) return null;

      // 1. Check separate students table
      const { data: stData } = await supabase
        .from('students')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (stData) {
        setProfile(stData);
        return stData;
      }

      // 2. Check separate admins table
      const { data: admData } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (admData) {
        setProfile(admData);
        return admData;
      }

      // 3. Fallback check profiles table
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profData) {
        setProfile(profData);
        return profData;
      }

      return null;
    } catch (err) {
      console.warn('Error fetching profile:', err);
      return null;
    }
  };

  // Sign In with strict Portal Isolation: 'student' | 'admin' | 'superadmin'
  const login = async (identifier, password, portalType = 'student') => {
    setAuthError(null);
    const normalized = identifier.trim().toLowerCase();

    // -------------------------------------------------------------------------
    // Super Admin Credentials directly from .env (Master Root Access)
    // -------------------------------------------------------------------------
    const envSuperUser = (import.meta.env.VITE_SUPERADMIN_USERNAME || '').trim().toLowerCase();
    const envSuperPass = (import.meta.env.VITE_SUPERADMIN_PASSWORD || '').trim();
    const envSuperEmail = (import.meta.env.VITE_SUPERADMIN_EMAIL || '').trim().toLowerCase();

    const isSuperAdminMatch =
      Boolean(envSuperUser && normalized === envSuperUser) ||
      Boolean(envSuperEmail && normalized === envSuperEmail);

    // -------------------------------------------------------------------------
    // 1. STRICT STUDENT PORTAL LOGIN (/login)
    // -------------------------------------------------------------------------
    if (portalType === 'student') {
      if (isSuperAdminMatch) {
        throw new Error(
          'Super Admin credentials detected. Please use the Super Admin Master Console (/superadmin).'
        );
      }

      // 1. Query live public.students table from Supabase
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .or(`email.ilike.${normalized},roll_number.ilike.${normalized},mobile_number.eq.${normalized}`);

          if (!error && Array.isArray(data) && data.length > 0) {
            const matchedSupa = data[0];
            if (matchedSupa.password && matchedSupa.password !== password) {
              throw new Error('Incorrect password for this student account. Please verify and try again.');
            }
            if (!matchedSupa.is_active) {
              throw new Error('Your student account has been deactivated by the Class Head.');
            }

            const studentProfile = {
              ...matchedSupa,
              role: 'student',
            };
            setUser({ id: matchedSupa.id, email: matchedSupa.email });
            setProfile(studentProfile);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(studentProfile));
            sessionStorage.setItem('fy_it_demo_user', JSON.stringify(studentProfile));
            return { user: studentProfile, profile: studentProfile };
          }
        } catch (supaError) {
          if (supaError.message?.includes('Incorrect password') || supaError.message?.includes('deactivated')) {
            throw supaError;
          }
          console.warn('Supabase student table lookup notice:', supaError.message);
        }
      }

      // 2. Offline fallback: check registered students in localStorage (only real registered students)
      const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
      const matchedStudent = localRegistered.find(
        (s) =>
          s.email?.toLowerCase() === normalized ||
          s.roll_number?.toLowerCase() === normalized ||
          s.mobile_number?.toLowerCase() === normalized ||
          s.phone?.toLowerCase() === normalized
      );

      if (!matchedStudent) {
        throw new Error(
          'Student account not found with this Roll Number, Mobile, or Email. Please register your account first.'
        );
      }

      if (matchedStudent.password && matchedStudent.password !== password) {
        throw new Error('Incorrect password for this student account. Please verify and try again.');
      }

      if (!matchedStudent.is_active) {
        throw new Error('Your student account has been deactivated by the Class Head.');
      }

      const studentUser = { id: matchedStudent.id, email: matchedStudent.email, role: 'student' };
      setUser(studentUser);
      setProfile({ ...matchedStudent, role: 'student' });
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ ...matchedStudent, role: 'student' }));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify({ ...matchedStudent, role: 'student' }));
      return { user: studentUser, profile: { ...matchedStudent, role: 'student' } };
    }

    // -------------------------------------------------------------------------
    // 2. SUPER ADMIN PORTAL LOGIN (/superadmin)
    // -------------------------------------------------------------------------
    if (portalType === 'superadmin') {
      if (!isSuperAdminMatch) {
        throw new Error('Access denied. Only Super Administrator can access this master control panel.');
      }

      if (!envSuperPass || password !== envSuperPass) {
        throw new Error('Incorrect Master Password for Super Admin.');
      }

      const superUser = {
        id: 'superadmin-001',
        full_name: 'Principal / Super Administrator',
        username: envSuperUser,
        email: envSuperEmail,
        role: 'superadmin',
        department: 'Academic Council & Board',
        is_active: true,
      };

      setUser({ id: superUser.id, email: superUser.email });
      setProfile(superUser);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(superUser));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(superUser));
      return { user: superUser, profile: superUser };
    }

    // -------------------------------------------------------------------------
    // 3. ADMIN PORTAL LOGIN (/admin)
    // -------------------------------------------------------------------------
    // Check Supabase public.admins table directly
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .or(`username.ilike.${normalized},email.ilike.${normalized}`);

        if (!error && Array.isArray(data) && data.length > 0) {
          const matchedAdminRecord = data[0];
          if (matchedAdminRecord.password !== password) {
            throw new Error('Incorrect password for this Admin account. Please verify and try again.');
          }
          if (!matchedAdminRecord.is_active) {
            throw new Error('This Admin account has been deactivated by the Super Administrator.');
          }

          const adminProfile = {
            ...matchedAdminRecord,
            role: 'admin',
          };
          setUser({ id: matchedAdminRecord.id, email: matchedAdminRecord.email });
          setProfile(adminProfile);
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(adminProfile));
          sessionStorage.setItem('fy_it_demo_user', JSON.stringify(adminProfile));
          return { user: adminProfile, profile: adminProfile };
        }
      } catch (adminSupaErr) {
        if (adminSupaErr.message?.includes('Incorrect password') || adminSupaErr.message?.includes('deactivated')) {
          throw adminSupaErr;
        }
        console.warn('Supabase admins lookup notice:', adminSupaErr.message);
      }
    }

    // Check managed admins from dataService (saved by Super Admin in fy_it_admin_accounts)
    const adminAccounts = dataService.getAdmins();
    const matchedAdmin = adminAccounts.find(
      (a) =>
        a.username?.toLowerCase() === normalized ||
        a.email?.toLowerCase() === normalized
    );

    if (matchedAdmin) {
      if (matchedAdmin.password !== password) {
        throw new Error('Incorrect password for this Admin account. Please verify and try again.');
      }
      if (!matchedAdmin.is_active) {
        throw new Error('This Admin account has been deactivated by the Super Administrator.');
      }

      const adminProfile = {
        ...matchedAdmin,
        role: 'admin',
      };
      setUser({ id: matchedAdmin.id, email: matchedAdmin.email });
      setProfile(adminProfile);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(adminProfile));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(adminProfile));
      return { user: adminProfile, profile: adminProfile };
    }

    // If student credentials were typed on the Admin page
    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const isStudentMatch = localRegistered.some(
      (s) =>
        s.email?.toLowerCase() === normalized ||
        s.roll_number?.toLowerCase() === normalized ||
        s.mobile_number?.toLowerCase() === normalized
    );

    if (isStudentMatch) {
      throw new Error(
        'Access denied. Student accounts cannot log into the Admin Portal. Please use the Student Portal (/login).'
      );
    }

    throw new Error('Admin account not found in database with this username or email.');
  };

  // Student Registration (Students register their own accounts)
  const register = async ({
    fullName,
    rollNumber,
    mobileNumber = '',
    email,
    password,
    className = 'FY B.Sc. IT',
    division = 'A',
  }) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanMobile = mobileNumber.trim();

    // Check if student already exists in Supabase public.students table
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, roll_number, email, mobile_number')
          .or(`email.ilike.${cleanEmail},roll_number.ilike.${cleanRoll}${cleanMobile ? `,mobile_number.eq.${cleanMobile}` : ''}`);

        if (!error && Array.isArray(data) && data.length > 0) {
          throw new Error('A student with this Roll Number, Email, or Mobile Number is already registered. Please login.');
        }
      } catch (supaCheckErr) {
        if (supaCheckErr.message?.includes('already registered')) throw supaCheckErr;
        console.warn('Supabase existence check notice:', supaCheckErr);
      }
    }

    // Check if student is already registered locally
    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const alreadyExists = localRegistered.some(
      (s) =>
        s.email?.toLowerCase() === cleanEmail ||
        s.roll_number === cleanRoll ||
        (cleanMobile && s.mobile_number === cleanMobile)
    );

    if (alreadyExists) {
      throw new Error('A student with this Email, Roll Number, or Mobile Number is already registered. Please login.');
    }

    const newStudent = {
      id: 'student-' + Date.now(),
      full_name: fullName.trim(),
      roll_number: cleanRoll,
      mobile_number: cleanMobile,
      email: cleanEmail,
      password, // Stored for credential verification and admin oversight
      role: 'student',
      class_name: className,
      division,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save to local registered list
    localRegistered.push(newStudent);
    localStorage.setItem('fy_registered_students', JSON.stringify(localRegistered));

    // Save directly to dedicated public.students table in Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('students').insert([{
          id: newStudent.id,
          full_name: newStudent.full_name,
          roll_number: newStudent.roll_number,
          mobile_number: newStudent.mobile_number,
          email: newStudent.email,
          class_name: newStudent.class_name,
          division: newStudent.division,
          password: newStudent.password,
          is_active: true,
          created_at: newStudent.created_at,
        }]).select();

        if (error) {
          console.warn('Supabase students table insert notice:', error.message);
        } else {
          console.log('Student successfully saved to Supabase students table:', data);
        }
      } catch (supaErr) {
        console.warn('Supabase register error:', supaErr);
      }
    }

    setUser({ id: newStudent.id, email: newStudent.email });
    setProfile(newStudent);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(newStudent));
    sessionStorage.setItem('fy_it_demo_user', JSON.stringify(newStudent));
    return { user: newStudent, profile: newStudent };
  };

  // Sign Out
  const logout = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    localStorage.removeItem(LOCAL_SESSION_KEY);
    sessionStorage.removeItem('fy_it_demo_user');
    setUser(null);
    setProfile(null);
  };

  // Password Reset
  const resetPassword = async (email) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      return true;
    }
    // Demo mode: simulate success
    return true;
  };

  // Update profile details
  const updateProfile = async (updates) => {
    if (!profile) return;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(data));
      return data;
    }

    const updated = { ...profile, ...updates };
    setProfile(updated);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
    sessionStorage.setItem('fy_it_demo_user', JSON.stringify(updated));
    return updated;
  };

  const switchDemoRole = () => {};

  const isSuperAdmin = profile?.role === 'superadmin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isStudent = profile?.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || 'student',
        isAdmin,
        isSuperAdmin,
        isStudent,
        loading,
        authError,
        login,
        register,
        logout,
        resetPassword,
        updateProfile,
        switchDemoRole,
        isConfigured: isSupabaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
