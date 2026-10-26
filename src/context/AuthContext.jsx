import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { initialAdmin, initialStudents } from '../lib/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          const savedDemoUser = sessionStorage.getItem('fy_it_demo_user');
          if (savedDemoUser) {
            try {
              const parsed = JSON.parse(savedDemoUser);
              if (mounted) {
                setUser({ id: parsed.id, email: parsed.email });
                setProfile(parsed);
              }
            } catch (e) {
              sessionStorage.removeItem('fy_it_demo_user');
            }
          }
          if (mounted) setLoading(false);
          return;
        }

        // Live Supabase Auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          if (mounted) setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) setAuthError(err.message);
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
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });
      authListener = listener;
    }

    return () => {
      mounted = false;
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
    // Username: hemag / hemang, Password: Hemang@135
    const isAdminUser =
      normalized === 'hemag' ||
      normalized === 'hemang' ||
      normalized === 'hemag@college.edu' ||
      normalized === 'hemang@college.edu' ||
      normalized === 'admin@college.edu' ||
      normalized === 'admin';

    if (isAdminUser) {
      if (password !== 'Hemang@135' && password !== 'hemang@135') {
        throw new Error('Incorrect password for Admin. Please enter your valid credentials.');
      }

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'hemag@college.edu',
            password,
          });
          if (!error && data?.user) {
            const loaded = await fetchUserProfile(data.user.id);
            return { user: data.user, profile: loaded || initialAdmin };
          }
        } catch (supaErr) {
          console.warn('Supabase admin login fallback:', supaErr);
        }
      }

      // Successful Admin Login
      setUser({ id: initialAdmin.id, email: initialAdmin.email });
      setProfile(initialAdmin);
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(initialAdmin));
      return { user: initialAdmin, profile: initialAdmin };
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
    sessionStorage.setItem('fy_it_demo_user', JSON.stringify(newStudent));
    return { user: newStudent, profile: newStudent };
  };

  // Sign Out
  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
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
      return data;
    }

    const updated = { ...profile, ...updates };
    setProfile(updated);
    sessionStorage.setItem('fy_it_demo_user', JSON.stringify(updated));
    return updated;
  };

  // Quick switch for demo testing
  const switchDemoRole = (targetRole) => {
    if (targetRole === 'admin') {
      setUser({ id: initialAdmin.id, email: initialAdmin.email });
      setProfile(initialAdmin);
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(initialAdmin));
    } else {
      const student = initialStudents[0];
      setUser({ id: student.id, email: student.email });
      setProfile(student);
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
