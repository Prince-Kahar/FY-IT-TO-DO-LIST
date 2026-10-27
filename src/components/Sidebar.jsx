import React, { useRef, useEffect, useState } from 'react';
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
import { dataService } from '../lib/dataService';

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

  const [counts, setCounts] = useState(() => {
    if (isAdmin || isSuperAdmin) {
      const t = dataService.getCachedTasks();
      const s = dataService.getCachedSubmissions();
      const sb = dataService.getCachedSubjects();
      const st = dataService.getCachedStudents();
      const a = dataService.getCachedAnnouncements();

      const isAllSubjects =
        !profile?.assigned_subjects ||
        profile.assigned_subjects.includes('ALL') ||
        profile.assigned_subjects.length === 0;

      const visibleAdminTasks = isAllSubjects
        ? t
        : (t || []).filter((task) => {
            const subName = task.subjects?.name;
            return (
              profile.assigned_subjects.includes(task.subject_id) ||
              (subName && profile.assigned_subjects.includes(subName))
            );
          });

      return {
        adminTasks: visibleAdminTasks?.length || 0,
        pendingSubmissions: s?.filter((sub) => ['Submitted', 'Under Review'].includes(sub.status))?.length || 0,
        subjects: sb?.length || 0,
        students: st?.length || 0,
        announcements: a?.length || 0,
      };
    } else {
      const td = dataService.getCachedTodos(user?.id);
      const asg = dataService.getCachedStudentAssignments(user?.id);
      const sb = dataService.getCachedSubjects();
      const notifs = dataService.getCachedAnnouncements();
      return {
        todos: td?.filter((item) => item.status !== 'Completed')?.length || 0,
        tasks: asg?.length || 0,
        subjects: sb?.length || 0,
        submissions: asg?.filter((item) => ['Submitted', 'Approved', 'Needs Revision'].includes(item.status))?.length || 0,
        notifications: notifs?.length || 0,
      };
    }
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        if (isAdmin || isSuperAdmin) {
          const [tasksRes, subsRes, subjectsRes, studentsRes, notifsRes] = await Promise.allSettled([
            dataService.getTasks(),
            dataService.getSubmissions(),
            dataService.getSubjects(),
            dataService.getStudents(),
            dataService.getAnnouncements(),
          ]);

          const tasks = tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value) ? tasksRes.value : dataService.getCachedTasks();
          const submissions = subsRes.status === 'fulfilled' && Array.isArray(subsRes.value) ? subsRes.value : dataService.getCachedSubmissions();
          const subjects = subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value) ? subjectsRes.value : dataService.getCachedSubjects();
          const students = studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value) ? studentsRes.value : dataService.getCachedStudents();
          const announcements = notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value) ? notifsRes.value : dataService.getCachedAnnouncements();

          const isAllSubjects =
            !profile?.assigned_subjects ||
            profile.assigned_subjects.includes('ALL') ||
            profile.assigned_subjects.length === 0;

          const visibleAdminTasks = isAllSubjects
            ? tasks
            : (tasks || []).filter((task) => {
                const subName = task.subjects?.name;
                return (
                  profile.assigned_subjects.includes(task.subject_id) ||
                  (subName && profile.assigned_subjects.includes(subName))
                );
              });

          setCounts({
            adminTasks: visibleAdminTasks?.length || 0,
            pendingSubmissions: submissions?.filter((s) => ['Submitted', 'Under Review'].includes(s?.status))?.length || 0,
            subjects: subjects?.length || 0,
            students: students?.length || 0,
            announcements: announcements?.length || 0,
          });
        } else if (user) {
          const [todosRes, asgsRes, subjectsRes, notifsRes] = await Promise.allSettled([
            dataService.getTodos(user.id),
            dataService.getStudentAssignments(user.id),
            dataService.getSubjects(),
            dataService.getNotifications(user.id),
          ]);

          const todos = todosRes.status === 'fulfilled' && Array.isArray(todosRes.value) ? todosRes.value : dataService.getCachedTodos(user.id);
          const assignments = asgsRes.status === 'fulfilled' && Array.isArray(asgsRes.value) ? asgsRes.value : dataService.getCachedStudentAssignments(user.id);
          const subjects = subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value) ? subjectsRes.value : dataService.getCachedSubjects();
          const notifs = notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value) ? notifsRes.value : [];

          const unreadNotifs = notifs?.filter((n) => !n.is_read)?.length;
          setCounts({
            todos: todos?.filter((t) => t.status !== 'Completed')?.length || 0,
            tasks: assignments?.length || 0,
            subjects: subjects?.length || 0,
            submissions: assignments?.filter((a) => ['Submitted', 'Approved', 'Needs Revision'].includes(a.status))?.length || 0,
            notifications: (unreadNotifs != null && unreadNotifs > 0) ? unreadNotifs : (notifs?.length || 0),
          });
        }
      } catch (e) {}
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 1000);
    const unsub = dataService.subscribeRealtime(fetchCounts);

    const handleSync = () => fetchCounts();
    window.addEventListener('fy_data_change', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      clearInterval(interval);
      if (unsub) unsub();
      window.removeEventListener('fy_data_change', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [user, isAdmin, isSuperAdmin, location.pathname]);

  const studentLinks = [
    { to: '/dashboard', label: 'Student Dashboard', icon: LayoutDashboard },
    {
      to: '/todos',
      label: 'Daily To-Do List 🔥',
      icon: ListTodo,
      badge: counts.todos,
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309',
      badgeBorder: '#FDE68A',
    },
    {
      to: '/tasks',
      label: 'My Academic Tasks',
      icon: CheckSquare,
      badge: counts.tasks,
      badgeBg: '#EEF2FF',
      badgeColor: 'var(--primary-700)',
      badgeBorder: '#C7D2FE',
    },
    {
      to: '/subjects',
      label: 'Subjects & Topics',
      icon: BookOpen,
      badge: counts.subjects,
      badgeBg: '#F1F5F9',
      badgeColor: '#475569',
      badgeBorder: '#E2E8F0',
    },
    {
      to: '/submissions',
      label: 'Submission History',
      icon: FileCheck,
      badge: counts.submissions,
      badgeBg: '#DCFCE7',
      badgeColor: '#166534',
      badgeBorder: '#BBF7D0',
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: counts.notifications,
      badgeBg: '#FEE2E2',
      badgeColor: '#DC2626',
      badgeBorder: '#FECACA',
    },
    { to: '/profile', label: 'Student Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
    {
      to: '/admin/tasks',
      label: 'Manage Tasks',
      icon: CheckSquare,
      badge: counts.adminTasks,
      badgeBg: '#EEF2FF',
      badgeColor: 'var(--primary-700)',
      badgeBorder: '#C7D2FE',
    },
    {
      to: '/admin/submissions',
      label: 'Review Submissions',
      icon: FileCheck,
      badge: counts.pendingSubmissions,
      badgeBg: counts.pendingSubmissions > 0 ? '#FEF3C7' : '#DCFCE7',
      badgeColor: counts.pendingSubmissions > 0 ? '#B45309' : '#166534',
      badgeBorder: counts.pendingSubmissions > 0 ? '#FDE68A' : '#BBF7D0',
    },
    {
      to: '/admin/subjects',
      label: 'Subjects & Topics',
      icon: BookOpen,
      badge: counts.subjects,
      badgeBg: '#F1F5F9',
      badgeColor: '#475569',
      badgeBorder: '#E2E8F0',
    },
    {
      to: '/admin/students',
      label: 'Manage Students',
      icon: Users,
      badge: counts.students,
      badgeBg: '#F0FDF4',
      badgeColor: '#15803D',
      badgeBorder: '#BBF7D0',
    },
    { to: '/admin/reports', label: 'Progress Reports', icon: BarChart3 },
    {
      to: '/admin/announcements',
      label: 'Announcements',
      icon: Megaphone,
      badge: counts.announcements,
      badgeBg: '#F0FDFA',
      badgeColor: '#0F766E',
      badgeBorder: '#99F6E4',
    },
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
                <span style={{ pointerEvents: 'none', flex: 1 }}>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: isActive ? 'rgba(255, 255, 255, 0.25)' : item.badgeBg,
                      color: isActive ? '#FFFFFF' : item.badgeColor,
                      border: isActive
                        ? '1px solid rgba(255, 255, 255, 0.35)'
                        : `1px solid ${item.badgeBorder}`,
                      minWidth: '20px',
                      textAlign: 'center',
                      lineHeight: '1.2',
                      flexShrink: 0,
                      pointerEvents: 'none',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
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
