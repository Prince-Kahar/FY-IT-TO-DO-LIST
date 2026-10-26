import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  FileCheck,
  Bell,
  User,
  Shield,
  Users,
  BarChart3,
  Megaphone,
  LogOut,
  GraduationCap,
  Layers,
  ListTodo,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, profile, isAdmin, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out successfully.', 'info');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const studentLinks = [
    { to: '/dashboard', label: 'Student Dashboard', icon: LayoutDashboard },
    { to: '/todos', label: 'Daily To-Do List 🔥', icon: ListTodo },
    { to: '/tasks', label: 'My Academic Tasks', icon: CheckSquare },
    { to: '/subjects', label: 'Subjects & Topics', icon: BookOpen },
    { to: '/submissions', label: 'Submission History', icon: FileCheck },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Student Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/admin/tasks', label: 'Manage Tasks', icon: CheckSquare },
    { to: '/admin/submissions', label: 'Review Submissions', icon: FileCheck },
    { to: '/admin/subjects', label: 'Subjects & Topics', icon: BookOpen },
    { to: '/admin/students', label: 'Manage Students', icon: Users },
    { to: '/admin/reports', label: 'Progress Reports', icon: BarChart3 },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <GraduationCap size={20} />
          </div>
          <div className="brand-title">
            <span>FY IT Portal</span>
            <span className="brand-subtitle">
              {isAdmin ? 'Class Head / Admin' : 'FY B.Sc. IT Student'}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {isAdmin ? 'Academic Administration' : 'Student Learning Hub'}
          </div>

          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Profile snippet */}
        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-meta">
              <div className="user-name">{profile?.full_name || 'User'}</div>
              <div className="user-subtext">
                {isAdmin ? 'Admin / Coordinator' : `${profile?.roll_number || 'FYIT'} • Div ${profile?.division || 'A'}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
