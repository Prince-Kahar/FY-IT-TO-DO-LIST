import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRole = null }) => {
  const { user, profile, loading, isAdmin, isStudent } = useAuth();
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

  // Check role authorization
  if (allowedRole === 'superadmin' && !profile?.role === 'superadmin' && profile?.role !== 'superadmin') {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  }

  if (allowedRole === 'admin' && !isAdmin) {
    // Student attempted to access admin route
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
