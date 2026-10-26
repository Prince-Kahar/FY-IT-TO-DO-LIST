import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialAdmin, initialStudents } from '../lib/mockData';

const AuthContext = createContext(null);
const LOCAL_SESSION_KEY = 'fy_it_user_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize auth state with localStorage fallback for multi-tab preservation
  useEffect(() => {
    let mounted = true;

    // 1. First, immediately check localStorage / sessionStorage to avoid any auth flicker or white screen
    const restoreLocalSession = () => {
      try {
        const stored = localStorage.getItem(LOCAL_SESSION_KEY) || sessionStorage.getItem('fy_it_demo_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) {
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading saved local session:', e);
      }
      return null;
    };

    const initialLocal = restoreLocalSession();

    // 2. Cross-tab session sync: when logging in or out in another tab, sync automatically
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
          // If no live Supabase session, check if we have a valid admin or local session
          if (initialLocal) {
            if (mounted) {
              setUser({ id: initialLocal.id, email: initialLocal.email });
              setProfile(initialLocal);
            }
          } else {
            if (mounted) {
              setUser(null);
              setProfile(null);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (initialLocal && mounted) {
          setUser({ id: initialLocal.id, email: initialLocal.email });
          setProfile(initialLocal);
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
          // Only clear if explicitly signed out
          const current = localStorage.getItem(LOCAL_SESSION_KEY);
          if (current) {
            try {
              const parsed = JSON.parse(current);
              if (parsed.role === 'admin') {
                // Keep local admin session active unless user explicitly clicks logout in UI
                return;
              }
            } catch (e) {}
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

  // Sign In
  const login = async (identifier, password) => {
    setAuthError(null);
    const normalized = identifier.trim().toLowerCase();

    // 1. ADMIN AUTHENTICATION
    // Primary Username: hemang (also accepts alias hemag), Password: Hemang@135
    const isAdminUser =
      normalized === 'hemang' ||
      normalized === 'hemag' ||
      normalized === 'hemang@college.edu' ||
      normalized === 'hemag@college.edu' ||
      normalized === 'admin@college.edu' ||
      normalized === 'admin';

    if (isAdminUser) {
      if (password !== 'Hemang@135' && password !== 'hemang@135') {
        throw new Error('Incorrect password for Admin. Please enter your valid credentials.');
      }

      const adminUser = {
        ...initialAdmin,
        username: 'hemang',
        email: 'hemang@college.edu',
        full_name: 'Prof. Hemang (Class Head / Admin)',
        role: 'admin',
      };

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'hemang@college.edu',
            password,
          });
          if (!error && data?.user) {
            const loaded = await fetchUserProfile(data.user.id);
            const resolved = loaded || adminUser;
            setUser(data.user);
            setProfile(resolved);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(resolved));
            sessionStorage.setItem('fy_it_demo_user', JSON.stringify(resolved));
            return { user: data.user, profile: resolved };
          }
        } catch (supaErr) {
          console.warn('Supabase admin login fallback:', supaErr);
        }
      }

      // Successful Admin Login (Persisted in localStorage for multi-tab and reload preservation)
      setUser({ id: adminUser.id, email: adminUser.email });
      setProfile(adminUser);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(adminUser));
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(adminUser));
      return { user: adminUser, profile: adminUser };
    }

    // 2. STUDENT AUTHENTICATION (Dynamic student login via Email or Roll Number)
    if (isSupabaseConfigured() && normalized.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });

        if (error) throw error;

        const loadedProfile = await fetchUserProfile(data.user.id);
        if (loadedProfile && !loadedProfile.is_active) {
          await supabase.auth.signOut();
          throw new Error('Your student account has been deactivated by the Class Head.');
        }

        return { user: data.user, profile: loadedProfile };
      } catch (supaError) {
        // Fall back to local registered student store if Supabase fails or credentials aren't in Supabase yet
        console.warn('Supabase student login fallback:', supaError.message);
      }
    }

    // Check registered students in localStorage or initial students
    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const allStudents = [...localRegistered, ...initialStudents];

    const matchedStudent = allStudents.find(
      (s) =>
        s.email?.toLowerCase() === normalized ||
        s.roll_number?.toLowerCase() === normalized
    );

    if (!matchedStudent) {
      throw new Error(
        'Student account not found with this Email or Roll Number. Please register your account first.'
      );
    }

    // Verify password if student was registered with one
    if (matchedStudent.password && matchedStudent.password !== password) {
      throw new Error('Incorrect password for this student account. Please try again.');
    }

    if (!matchedStudent.is_active) {
      throw new Error('Your student account has been deactivated by the Class Head.');
    }

    // Set active student session
    const studentUser = { id: matchedStudent.id, email: matchedStudent.email };
    setUser(studentUser);
    setProfile(matchedStudent);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(matchedStudent));
    sessionStorage.setItem('fy_it_demo_user', JSON.stringify(matchedStudent));
    return { user: matchedStudent, profile: matchedStudent };
  };

  // Student Registration (Students register their own accounts)
  const register = async ({
    fullName,
    rollNumber,
    email,
    password,
    className = 'FY B.Sc. IT',
    division = 'A',
  }) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanRoll = rollNumber.trim().toUpperCase();

    // Check if student is already registered locally
    const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
    const alreadyExists = localRegistered.some(
      (s) => s.email.toLowerCase() === cleanEmail || s.roll_number === cleanRoll
    );

    if (alreadyExists) {
      throw new Error('A student with this Email or Roll Number is already registered. Please login.');
    }

    const newStudent = {
      id: 'student-' + Date.now(),
      full_name: fullName.trim(),
      roll_number: cleanRoll,
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

  const isAdmin = profile?.role === 'admin';
  const isStudent = profile?.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || 'student',
        isAdmin,
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
