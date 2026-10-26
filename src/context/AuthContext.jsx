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
  const login = async (email, password) => {
    setAuthError(null);

    if (!isSupabaseConfigured()) {
      const normalizedEmail = email.trim().toLowerCase();

      // Admin verification
      if (normalizedEmail === 'admin@college.edu' || normalizedEmail.includes('admin')) {
        const validAdminPasswords = ['admin123', 'Admin@123', 'admin'];
        if (!validAdminPasswords.includes(password)) {
          throw new Error('Incorrect password for Admin. Default password is: admin123');
        }
        setUser({ id: initialAdmin.id, email: initialAdmin.email });
        setProfile(initialAdmin);
        sessionStorage.setItem('fy_it_demo_user', JSON.stringify(initialAdmin));
        return { user: initialAdmin, profile: initialAdmin };
      }

      // Student verification
      const matchStudent = initialStudents.find(
        (s) =>
          s.email.toLowerCase() === normalizedEmail ||
          s.alt_email?.toLowerCase() === normalizedEmail
      );

      const validStudentPasswords = ['student123', 'Student@123', 'student'];
      if (!validStudentPasswords.includes(password)) {
        throw new Error('Incorrect password for Student. Default password is: student123');
      }

      const studentObj = matchStudent || {
        ...initialStudents[0],
        email: normalizedEmail,
      };

      if (!studentObj.is_active) {
        throw new Error('Your student account has been deactivated by the Class Head.');
      }

      setUser({ id: studentObj.id, email: studentObj.email });
      setProfile(studentObj);
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(studentObj));
      return { user: studentObj, profile: studentObj };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    const loadedProfile = await fetchUserProfile(data.user.id);
    if (loadedProfile && !loadedProfile.is_active) {
      await supabase.auth.signOut();
      throw new Error('Your student account has been deactivated by the Class Head. Please contact the administrator.');
    }

    return { user: data.user, profile: loadedProfile };
  };

  // Student Registration
  const register = async ({
    fullName,
    rollNumber,
    email,
    password,
    className = 'FY B.Sc. IT',
    division = 'A',
  }) => {
    setAuthError(null);

    if (!isSupabaseConfigured()) {
      const newStudent = {
        id: 'student-' + Date.now(),
        full_name: fullName,
        roll_number: rollNumber,
        email: email.trim(),
        role: 'student',
        class_name: className,
        division,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setUser({ id: newStudent.id, email: newStudent.email });
      setProfile(newStudent);
      sessionStorage.setItem('fy_it_demo_user', JSON.stringify(newStudent));
      return { user: newStudent, profile: newStudent };
    }

    // Live Supabase signup with user metadata
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          roll_number: rollNumber,
          class_name: className,
          division,
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    if (data.user) {
      // Profile trigger creates the profile row automatically
      await fetchUserProfile(data.user.id);
    }

    return data;
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
