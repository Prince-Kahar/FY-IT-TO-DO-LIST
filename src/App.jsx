import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

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

// Common
import { NotFound } from './pages/NotFound';

// Smart Home Redirector based on user role
const RootRedirector = () => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Root smart redirect */}
            <Route path="/" element={<RootRedirector />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
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
                path="/admin"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminDashboard />
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
