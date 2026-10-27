import React, { useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, profile, isAdmin, isSuperAdmin, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  // Auto-close drawer on location change
  useEffect(() => {
    if (isOpen && onClose) {
      onClose();
    }
  }, [location.pathname]);

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleNavClick = (to, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigate(to);
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 100);
  };

  const handleTouchEnd = (to, e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const diffY = Math.abs(touch.clientY - touchStartY.current);
      const diffX = Math.abs(touch.clientX - touchStartX.current);
      // Clean tap detection (< 10px movement)
      if (diffY < 10 && diffX < 10) {
        e.preventDefault();
        e.stopPropagation();
        handleNavClick(to);
      }
    }
  };

  const handleLogout = async () => {
    try {
      const currentRole = isSuperAdmin ? 'superadmin' : isAdmin ? 'admin' : 'student';
      await logout(currentRole);
      addToast('Logged out successfully.', 'info');
      if (currentRole === 'superadmin') {
        navigate('/superadmin/login');
      } else if (currentRole === 'admin') {
        navigate('/admin/login');
      } else {
        navigate('/login');
      }
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

  const superAdminLinks = [
    { to: '/superadmin', label: '⚡ Super Admin Console', icon: Shield },
  ];

  const links = isSuperAdmin ? superAdminLinks : isAdmin ? adminLinks : studentLinks;

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (onClose) onClose();
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <img
            src="/college-logo.png"
            alt="STERS College Logo"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              objectFit: 'contain',
              background: '#FFFFFF',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          />
          <div className="brand-title" style={{ flex: 1 }}>
            <span>STERS Portal</span>
            <span className="brand-subtitle">
              {isSuperAdmin
                ? 'Super Administrator'
                : isAdmin
                ? (profile?.full_name ? `${profile.full_name} (Admin)` : 'Faculty Administrator')
                : 'FY B.Sc. IT & BCA'}
            </span>
          </div>

          {/* Close button visible on mobile screens */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (onClose) onClose();
            }}
            aria-label="Close sidebar navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {isSuperAdmin
              ? 'Master Administration'
              : isAdmin
              ? 'Academic Administration'
              : 'Student Learning Hub'}
          </div>

          {links.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/admin' &&
                item.to !== '/dashboard' &&
                item.to !== '/superadmin' &&
                location.pathname.startsWith(item.to));

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={(e) => handleNavClick(item.to, e)}
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(item.to, e)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: isActive ? 'var(--primary-600)' : 'transparent',
                  font: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.925rem',
                  textDecoration: 'none',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  boxSizing: 'border-box',
                }}
              >
                <Icon
                  size={18}
                  color={isActive ? '#FFFFFF' : 'currentColor'}
                  style={{ pointerEvents: 'none', flexShrink: 0 }}
                />
                <span style={{ pointerEvents: 'none' }}>{item.label}</span>
              </Link>
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
                {isSuperAdmin
                  ? 'Master System Root'
                  : isAdmin
                  ? 'Admin / Coordinator'
                  : `${profile?.roll_number || 'FYIT'} • Div ${profile?.division || 'A'}`}
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
