import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { AdminLogin } from './pages/auth/AdminLogin';
import { SuperAdminLogin } from './pages/auth/SuperAdminLogin';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentTodoList } from './pages/student/StudentTodoList';
import { StudentTasks } from './pages/student/StudentTasks';
import { StudentSubjects } from './pages/student/StudentSubjects';
import { StudentSubmissions } from './pages/student/StudentSubmissions';
import { StudentNotifications } from './pages/student/StudentNotifications';
import { StudentProfile } from './pages/student/StudentProfile';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminTasks } from './pages/admin/AdminTasks';
import { AdminSubmissions } from './pages/admin/AdminSubmissions';
import { AdminSubjects } from './pages/admin/AdminSubjects';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements';

// Super Admin Pages
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';

// Common
import { NotFound } from './pages/NotFound';

// Smart Home Redirector based on user role
const RootRedirector = () => {
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/superadmin" replace />;
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

// Smart Admin Gateway: /admin
// If not authenticated as admin, renders AdminLogin directly; if authenticated, renders AdminDashboard inside Layout.
const AdminPortalGate = () => {
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user || (!isAdmin && !isSuperAdmin)) {
    return <AdminLogin />;
  }
  return (
    <ProtectedRoute allowedRole="admin">
      <ErrorBoundary>
        <Layout>
          <AdminDashboard />
        </Layout>
      </ErrorBoundary>
    </ProtectedRoute>
  );
};

// Smart Super Admin Gateway: /superadmin and /superAdmin
// If not authenticated as superadmin, renders SuperAdminLogin directly; if authenticated, renders SuperAdminDashboard inside Layout.
const SuperAdminPortalGate = () => {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user || !isSuperAdmin) {
    return <SuperAdminLogin />;
  }
  return (
    <ProtectedRoute allowedRole="superadmin">
      <ErrorBoundary>
        <Layout>
          <SuperAdminDashboard />
        </Layout>
      </ErrorBoundary>
    </ProtectedRoute>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Student Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Direct Login Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superAdmin/login" element={<SuperAdminLogin />} />

            {/* Smart Root & Portal Gates */}
            <Route path="/" element={<RootRedirector />} />
            <Route path="/admin" element={<AdminPortalGate />} />
            <Route path="/superadmin" element={<SuperAdminPortalGate />} />
            <Route path="/superAdmin" element={<SuperAdminPortalGate />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <Layout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              {/* Student Routes */}
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/todos" element={<StudentTodoList />} />
              <Route path="/tasks" element={<StudentTasks />} />
              <Route path="/subjects" element={<StudentSubjects />} />
              <Route path="/submissions" element={<StudentSubmissions />} />
              <Route path="/notifications" element={<StudentNotifications />} />
              <Route path="/profile" element={<StudentProfile />} />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/dashboard"
                element={
                  <ProtectedRoute allowedRole="superadmin">
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tasks"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminTasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/submissions"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminSubmissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/subjects"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminSubjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminStudents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminAnnouncements />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
