import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRole = null }) => {
  const { user, profile, loading, isAdmin, isSuperAdmin, switchPortalSession } = useAuth();
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

  // If not logged in, redirect to respective login page with return path
  if (!user) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin" state={{ from: location }} replace />;
    }
    if (location.pathname.toLowerCase().startsWith('/superadmin')) {
      return <Navigate to="/superadmin" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization for Super Admin
  if (allowedRole === 'superadmin' && profile?.role !== 'superadmin') {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  }

  // Check role authorization for Admin
  if (allowedRole === 'admin' && !isAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // If student route (allowedRole is null), but active profile is an admin or superadmin:
  if (!allowedRole && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
    const studentSession = sessionStorage.getItem('fy_it_student_session') || localStorage.getItem('fy_it_student_session');
    if (studentSession) {
      switchPortalSession('student');
    } else {
      return <Navigate to={isAdmin ? '/admin' : '/superadmin'} replace />;
    }
  }

  return children;
};
