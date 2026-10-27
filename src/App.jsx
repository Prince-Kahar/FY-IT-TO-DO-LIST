import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getTabTargetRole, getRoleStorageKey } from './context/AuthContext';
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
  const role = getTabTargetRole();
  const key = getRoleStorageKey(role);
  const session = sessionStorage.getItem(key) || localStorage.getItem(key);
  if (session) {
    if (role === 'superadmin') return <Navigate to="/superadmin" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
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

            {/* Direct Admin & SuperAdmin Login Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/Admin/login" element={<AdminLogin />} />
            <Route path="/ADMIN/login" element={<AdminLogin />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superAdmin/login" element={<SuperAdminLogin />} />
            <Route path="/SuperAdmin/login" element={<SuperAdminLogin />} />
            <Route path="/Superadmin/login" element={<SuperAdminLogin />} />

            {/* Smart Root */}
            <Route path="/" element={<RootRedirector />} />

            {/* Student Protected Portal */}
            <Route
              element={
                <ProtectedRoute allowedRole="student">
                  <ErrorBoundary>
                    <Layout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/todos" element={<StudentTodoList />} />
              <Route path="/tasks" element={<StudentTasks />} />
              <Route path="/subjects" element={<StudentSubjects />} />
              <Route path="/submissions" element={<StudentSubmissions />} />
              <Route path="/notifications" element={<StudentNotifications />} />
              <Route path="/profile" element={<StudentProfile />} />
            </Route>

            {/* Admin Protected Portal */}
            <Route
              element={
                <ProtectedRoute allowedRole="admin">
                  <ErrorBoundary>
                    <Layout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/Admin" element={<AdminDashboard />} />
              <Route path="/ADMIN" element={<AdminDashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/tasks" element={<AdminTasks />} />
              <Route path="/admin/submissions" element={<AdminSubmissions />} />
              <Route path="/admin/subjects" element={<AdminSubjects />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            </Route>

            {/* Super Admin Protected Portal */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRole="superadmin">
                  <ErrorBoundary>
                    <SuperAdminDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superAdmin"
              element={
                <ProtectedRoute allowedRole="superadmin">
                  <ErrorBoundary>
                    <SuperAdminDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/SuperAdmin"
              element={
                <ProtectedRoute allowedRole="superadmin">
                  <ErrorBoundary>
                    <SuperAdminDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/Superadmin"
              element={
                <ProtectedRoute allowedRole="superadmin">
                  <ErrorBoundary>
                    <SuperAdminDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/dashboard"
              element={
                <ProtectedRoute allowedRole="superadmin">
                  <ErrorBoundary>
                    <SuperAdminDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
