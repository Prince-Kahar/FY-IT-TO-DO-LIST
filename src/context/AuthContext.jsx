import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialAdmin, initialStudents } from '../lib/mockData';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  // Sign In with strict Portal Isolation: 'student' | 'admin' | 'superadmin'
  const login = async (identifier, password, portalType = 'student') => {
    setAuthError(null);
    const normalized = identifier.trim().toLowerCase();

    // -------------------------------------------------------------------------
    // Credentials definition
    // -------------------------------------------------------------------------
    const envSuperUser = (import.meta.env.VITE_SUPERADMIN_USERNAME || 'superadmin').trim().toLowerCase();
    const envSuperPass = (import.meta.env.VITE_SUPERADMIN_PASSWORD || 'SuperAdmin@135').trim();
    const envSuperEmail = (import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@college.edu').trim().toLowerCase();

    const envAdminUser = (import.meta.env.VITE_ADMIN_USERNAME || 'hemang').trim().toLowerCase();
    const envAdminPass = (import.meta.env.VITE_ADMIN_PASSWORD || 'Hemang@135').trim();
    const envAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'hemang@college.edu').trim().toLowerCase();

    // Read all managed admins from storage
    let managedAdmins = [];
    try {
      managedAdmins = JSON.parse(localStorage.getItem('fy_it_admin_accounts') || '[]');
    } catch (e) {
      managedAdmins = [];
    }

    const isSuperAdminMatch =
      normalized === envSuperUser ||
      normalized === envSuperEmail ||
      normalized === 'superadmin';

    const isPrimaryAdminMatch =
      normalized === envAdminUser ||
      normalized === 'hemang' ||
      normalized === 'hemag' ||
      normalized === envAdminEmail ||
      normalized === 'hemang@college.edu' ||
      normalized === 'hemag@college.edu' ||
      normalized === 'admin@college.edu' ||
      normalized === 'admin';

    const matchedManagedAdmin = managedAdmins.find(
      (a) =>
        a.username?.toLowerCase() === normalized ||
        a.email?.toLowerCase() === normalized
    );

    const isAnyAdminMatch = isPrimaryAdminMatch || !!matchedManagedAdmin;

    // -------------------------------------------------------------------------
    // 1. STRICT STUDENT PORTAL LOGIN
    // -------------------------------------------------------------------------
    if (portalType === 'student') {
      if (isSuperAdminMatch || isAnyAdminMatch) {
        throw new Error(
          'Admin credentials detected. Admins cannot log in through the Student Portal. Please use the Teacher & Admin URL (/admin).'
        );
      }

      // Check Supabase Auth if email format
      if (isSupabaseConfigured() && normalized.includes('@')) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalized,
            password,
          });

          if (!error && data?.user) {
            const loadedProfile = await fetchUserProfile(data.user.id);
            if (loadedProfile && loadedProfile.role === 'admin') {
              await supabase.auth.signOut();
              throw new Error(
                'Admin credentials detected. Please use the Teacher & Admin URL (/admin).'
              );
            }
            if (loadedProfile && !loadedProfile.is_active) {
              await supabase.auth.signOut();
              throw new Error('Your student account has been deactivated by the Class Head.');
            }
            if (loadedProfile) {
              setUser(data.user);
              setProfile(loadedProfile);
              localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(loadedProfile));
              sessionStorage.setItem('fy_it_demo_user', JSON.stringify(loadedProfile));
              return { user: data.user, profile: loadedProfile };
            }
          }
        } catch (supaError) {
          if (supaError.message.includes('Admin credentials')) throw supaError;
          console.warn('Supabase student login fallback:', supaError.message);
        }
      }

      // Check registered students in localStorage or initial students
      const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
      const allStudents = [...localRegistered, ...initialStudents];

      const matchedStudent = allStudents.find(
        (s) =>
          s.email?.toLowerCase() === normalized ||
          s.roll_number?.toLowerCase() === normalized ||
          s.mobile_number?.toLowerCase() === normalized ||
          s.mobile?.toLowerCase() === normalized ||
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

      const studentUser = { id: matchedStudent.id, email: matchedStudent.email };
      setUser(studentUser);
      setProfile(matchedStudent);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(matchedStudent));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(matchedStudent));
      return { user: matchedStudent, profile: matchedStudent };
    }

    // -------------------------------------------------------------------------
    // 2. SUPER ADMIN PORTAL LOGIN (/superadmin)
    // -------------------------------------------------------------------------
    if (portalType === 'superadmin') {
      if (!isSuperAdminMatch) {
        throw new Error('Access denied. Only Super Administrator can access this master control panel.');
      }

      if (password !== envSuperPass && password !== 'SuperAdmin@135') {
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
    // Allow Super Admin to also enter admin portal if needed
    if (isSuperAdminMatch && (password === envSuperPass || password === 'SuperAdmin@135')) {
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

    // Check admin accounts from database (managed by Super Admin in dataService)
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

      // Check if Supabase auth exists for this email
      if (isSupabaseConfigured() && matchedAdmin.email && matchedAdmin.email.includes('@')) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: matchedAdmin.email,
            password,
          });
          if (!error && data?.user) {
            const loaded = await fetchUserProfile(data.user.id);
            const resolved = loaded || matchedAdmin;
            setUser(data.user);
            setProfile(resolved);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(resolved));
            sessionStorage.setItem('fy_it_demo_user', JSON.stringify(resolved));
            return { user: data.user, profile: resolved };
          }
        } catch (supaErr) {
          console.warn('Supabase admin login notice:', supaErr);
        }
      }

      setUser({ id: matchedAdmin.id, email: matchedAdmin.email });
      setProfile(matchedAdmin);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(matchedAdmin));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(matchedAdmin));
      return { user: matchedAdmin, profile: matchedAdmin };
    }

    // If student credentials were typed on the Admin page
    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const isStudentMatch = [...localRegistered, ...initialStudents].some(
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

    throw new Error('Admin account not found with this username or email.');
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

    // Check if student is already registered locally
    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const alreadyExists = localRegistered.some(
      (s) =>
        s.email.toLowerCase() === cleanEmail ||
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
      password, // Stored for offline credential verification
      role: 'student',
      class_name: className,
      division,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Save to local registered list
    localRegistered.push(newStudent);
    localStorage.setItem('fy_registered_students', JSON.stringify(localRegistered));

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              roll_number: cleanRoll,
              mobile_number: cleanMobile,
              class_name: className,
              division,
            },
          },
        });

        if (error) {
          console.warn('Supabase registration notice:', error.message);
        } else if (data?.user) {
          await fetchUserProfile(data.user.id);
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

  // Quick switch for demo testing
  const switchDemoRole = (targetRole) => {
    if (targetRole === 'admin') {
      const adminUser = {
        ...initialAdmin,
        username: 'hemang',
        email: 'hemang@college.edu',
        role: 'admin',
      };
      setUser({ id: adminUser.id, email: adminUser.email });
      setProfile(adminUser);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(adminUser));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(adminUser));
    } else {
      const student = initialStudents[0];
      setUser({ id: student.id, email: student.email });
      setProfile(student);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(student));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(student));
    }
  };

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
