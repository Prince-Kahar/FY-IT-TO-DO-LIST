import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ADMIN_SESSION_KEY, SUPERADMIN_SESSION_KEY, STUDENT_SESSION_KEY } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRole = null }) => {
  const { user, profile, loading, switchPortalSession } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <Loader2 size={36} className="spin" color="var(--primary-600)" />
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          Verifying FY IT Portal Credentials...
        </span>
      </div>
    );
  }

  // 1. ADMIN ROUTE PROTECTION (/admin/*)
  if (allowedRole === 'admin') {
    if (profile?.role === 'admin' || profile?.role === 'superadmin') {
      return children;
    }
    const storedAdmin =
      sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
    if (storedAdmin) {
      try {
        const parsed = JSON.parse(storedAdmin);
        if (parsed?.id) {
          switchPortalSession('admin');
          return children;
        }
      } catch (e) {}
    }
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 2. SUPER ADMIN ROUTE PROTECTION (/superadmin/*)
  if (allowedRole === 'superadmin') {
    if (profile?.role === 'superadmin') {
      return children;
    }
    const storedSuper =
      sessionStorage.getItem(SUPERADMIN_SESSION_KEY) || localStorage.getItem(SUPERADMIN_SESSION_KEY);
    if (storedSuper) {
      try {
        const parsed = JSON.parse(storedSuper);
        if (parsed?.id) {
          switchPortalSession('superadmin');
          return children;
        }
      } catch (e) {}
    }
    return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
  }

  // 3. STUDENT ROUTE PROTECTION (/dashboard, /todos, /tasks, /subjects, etc.)
  if (allowedRole === 'student' || !allowedRole) {
    if (profile?.role === 'student') {
      return children;
    }
    const storedStudent =
      sessionStorage.getItem(STUDENT_SESSION_KEY) || localStorage.getItem(STUDENT_SESSION_KEY);
    if (storedStudent) {
      try {
        const parsed = JSON.parse(storedStudent);
        if (parsed?.id) {
          switchPortalSession('student');
          return children;
        }
      } catch (e) {}
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
